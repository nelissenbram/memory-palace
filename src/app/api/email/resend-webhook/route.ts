import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

/**
 * POST /api/email/resend-webhook
 *
 * Resend delivery-event webhook (SUCCESS_PLAYBOOK 1.4). On `email.bounced` /
 * `email.complained` the recipient is upserted into `email_suppressions`, and
 * sendEmail() (src/lib/email/shared.ts) refuses future sends to that address —
 * repeatedly mailing bounced/complaining addresses is what tanks domain
 * reputation and inboxing.
 *
 * Security: Resend signs webhooks in the Svix format. We verify the signature
 * with RESEND_WEBHOOK_SECRET (HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{body}"
 * with the base64-decoded whsec_ secret). If the secret env is NOT configured we
 * return 503 — fail closed rather than accept unauthenticated suppression writes
 * (an attacker could otherwise unsubscribe-bomb arbitrary users).
 *
 * Route is on the middleware public fast-path via the existing /api/email/ prefix.
 */

/** Svix allows a 5-minute timestamp skew; beyond that we treat it as replay. */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

const SUPPRESSING_EVENTS: Record<string, string> = {
  "email.bounced": "bounce",
  "email.complained": "complaint",
};

function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  payload: string,
): boolean {
  const secretBytes = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret,
    "base64",
  );
  if (secretBytes.length === 0) return false;

  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(`${svixId}.${svixTimestamp}.${payload}`)
    .digest();

  // Header may carry several space-separated signatures ("v1,<base64> v1,<base64>").
  return svixSignature.split(" ").some((entry) => {
    const raw = entry.includes(",") ? entry.slice(entry.indexOf(",") + 1) : entry;
    try {
      const provided = Buffer.from(raw, "base64");
      return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    } catch {
      return false;
    }
  });
}

export async function POST(request: Request) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    // Fail closed: without a signing secret we cannot authenticate the caller.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  // Replay guard: reject timestamps outside the tolerance window.
  const ts = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 400 });
  }

  const payload = await request.text();
  if (!verifySvixSignature(secret, svixId, svixTimestamp, svixSignature, payload)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { to?: string | string[] } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = event.type ? SUPPRESSING_EVENTS[event.type] : undefined;
  if (!reason) {
    // Delivered/opened/clicked etc. — acknowledged, nothing to do.
    return NextResponse.json({ received: true });
  }

  const to = event.data?.to;
  const recipients = (Array.isArray(to) ? to : typeof to === "string" ? [to] : [])
    .filter((e): e is string => typeof e === "string" && e.includes("@"))
    .map((e) => e.trim().toLowerCase());

  if (recipients.length === 0) {
    return NextResponse.json({ received: true });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { error } = await admin
    .from("email_suppressions")
    .upsert(
      recipients.map((email) => ({ email, reason })),
      { onConflict: "email" },
    );

  if (error) {
    console.error("[ResendWebhook] suppression upsert failed:", error.message);
    // Non-2xx → Svix retries with backoff, so a transient DB hiccup self-heals.
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ received: true, suppressed: recipients.length });
}
