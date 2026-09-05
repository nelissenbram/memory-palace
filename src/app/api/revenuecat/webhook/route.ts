import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { captureServer } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";

/**
 * RevenueCat webhook (Phase 2 foundation — SHADOW/OFF by default).
 *
 * RevenueCat is the billing + analytics layer; this endpoint keeps the app's
 * existing `subscriptions` table (read by getUserPlan) in sync from RC's single
 * normalised event stream. See docs/REVENUECAT_INTEGRATION_PLAN.md.
 *
 * Safety posture:
 *  - Gated behind RC_WEBHOOK_ENABLED — until that is "true" this is a no-op 200
 *    (RC can be pointed at it while we validate events, without touching billing).
 *  - Authenticated via a shared secret in the Authorization header
 *    (REVENUECAT_WEBHOOK_AUTH), configured in the RC dashboard.
 *  - Ownership guard mirrors the Stripe webhook: RC only writes rows it owns
 *    (subscription_source null/'revenuecat'); it NEVER clobbers a live
 *    Apple/Stripe entitlement during migration.
 */

// RC store -> our `store` enum
function mapStore(store?: string): string | null {
  switch ((store || "").toUpperCase()) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "app_store";
    case "PLAY_STORE":
      return "play_store";
    case "STRIPE":
    case "RC_BILLING":
      return "stripe";
    case "PROMOTIONAL":
      return "promotional";
    default:
      return null;
  }
}

// entitlement_ids / product_id -> our plan tier
function mapPlan(entitlementIds?: string[], productId?: string): "keeper" | "guardian" | null {
  const ents = (entitlementIds || []).map((e) => e.toLowerCase());
  const pid = (productId || "").toLowerCase();
  if (ents.includes("guardian") || pid.includes("guardian")) return "guardian";
  if (ents.includes("keeper") || pid.includes("keeper")) return "keeper";
  return null;
}

const GRANTING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
]);

export async function POST(req: NextRequest) {
  // Shared-secret auth (configured as the Authorization header in RC dashboard).
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const event = payload?.event;
  if (!event?.type) return NextResponse.json({ ok: true, ignored: "no event" });

  // Shadow mode: accept + log, but do not mutate billing state until enabled.
  if (process.env.RC_WEBHOOK_ENABLED !== "true") {
    console.log("[rc-webhook] shadow (disabled):", event.type, event.app_user_id);
    return NextResponse.json({ ok: true, shadow: true });
  }

  const type: string = event.type;
  if (type === "TEST") return NextResponse.json({ ok: true, test: true });

  const uid: string | undefined = event.app_user_id;
  if (!uid) return NextResponse.json({ ok: true, ignored: "no app_user_id" });

  const admin = createAdminClient();

  // Ownership guard — never overwrite a live Apple/Stripe row while migrating.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("subscription_source, status")
    .eq("user_id", uid)
    .maybeSingle();
  const owned =
    !existing ||
    existing.subscription_source == null ||
    existing.subscription_source === "revenuecat";
  if (!owned) {
    console.log(`[rc-webhook] skip ${type} for ${uid}: owned by ${existing?.subscription_source}`);
    return NextResponse.json({ ok: true, skipped: "foreign-owned" });
  }

  const plan = mapPlan(event.entitlement_ids, event.product_id);
  const store = mapStore(event.store);
  const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  // Compute the target entitlement state from the event type.
  let row: Record<string, unknown> = {
    user_id: uid,
    rc_app_user_id: uid,
    subscription_source: "revenuecat",
    store,
    rc_product_id: event.product_id ?? null,
    rc_period_type: event.period_type ?? null,
    rc_entitlement: plan,
    updated_at: new Date().toISOString(),
  };

  if (GRANTING.has(type) && plan) {
    row.plan = plan;
    row.status = event.period_type === "TRIAL" || event.period_type === "trial" ? "trialing" : "active";
    row.current_period_end = periodEnd;
    row.will_renew = true;
  } else if (type === "CANCELLATION") {
    // Auto-renew off; access remains until expiration.
    row.will_renew = false;
    if (plan) row.plan = plan;
    row.current_period_end = periodEnd;
  } else if (type === "BILLING_ISSUE") {
    row.status = "past_due";
    row.will_renew = false;
  } else if (type === "EXPIRATION") {
    row.plan = "free";
    row.status = "canceled";
    row.will_renew = false;
  } else {
    // SUBSCRIBER_ALIAS / TRANSFER / others: no entitlement change in shadow-safe mode.
    console.log(`[rc-webhook] noted ${type} for ${uid} (no state change)`);
    return NextResponse.json({ ok: true, noted: type });
  }

  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("[rc-webhook] upsert failed:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // ── Money events (SUCCESS_PLAYBOOK 1.3) ──
  // Server-side PostHog, keyed to the Supabase uid so they merge with client
  // events. Fire-and-forget AFTER the upsert succeeded: an event must never
  // exist for a billing state we failed to persist, and captureServer never
  // throws into the webhook path.
  const money = { plan: plan ?? null, store, product: event.product_id ?? null };
  const isTrial = event.period_type === "TRIAL" || event.period_type === "trial";
  if (GRANTING.has(type) && plan) {
    if (type === "RENEWAL") {
      void captureServer(uid, "subscription_renewed", money);
    } else {
      void captureServer(uid, "checkout_completed", money);
      if (isTrial) void captureServer(uid, "trial_started", money);
    }
    // Prior row said trialing and this grant lands the user on active → converted.
    if (existing?.status === "trialing" && row.status === "active") {
      void captureServer(uid, "trial_converted", money);
    }
  } else if (type === "CANCELLATION") {
    void captureServer(uid, "subscription_cancelled", money);
  } else if (type === "EXPIRATION") {
    void captureServer(uid, "subscription_expired", money);
  }

  return NextResponse.json({ ok: true, applied: type, plan: row.plan ?? undefined });
}
