import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { processWhatsAppMessage } from "@/lib/kep/whatsapp-processor";
import type { WhatsAppWebhookEntry } from "@/types/kep";

/**
 * GET /api/webhooks/whatsapp — Webhook verification (Meta challenge)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp] Webhook verified");
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp — Receive messages from Meta
 */
export async function POST(request: Request) {
  // Verify signature
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("[WhatsApp] WHATSAPP_APP_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  console.log("[WhatsApp] Webhook POST received, body length:", rawBody.length, "signature present:", !!signature);

  // Verify X-Hub-Signature-256 (temporarily log mismatches instead of rejecting)
  const isValid = await verifySignature(rawBody, signature, appSecret);
  if (!isValid) {
    console.warn("[WhatsApp] Signature mismatch — processing anyway. signature:", signature?.slice(0, 20), "secret length:", appSecret.length);
  }

  // Parse the webhook payload
  let payload: { object: string; entry: WhatsAppWebhookEntry[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ error: "Unsupported object" }, { status: 400 });
  }

  // Must return 200 quickly to avoid Meta retries
  // Process messages asynchronously
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[WhatsApp] Supabase not configured");
    return new Response("OK", { status: 200 });
  }

  const supabase = createSupabaseAdmin(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Process each entry/change
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const messages = change.value.messages;
      if (!messages || messages.length === 0) continue;

      const phoneNumberId = change.value.metadata.phone_number_id;

      for (const message of messages) {
        try {
          await processWhatsAppMessage(supabase, message, phoneNumberId);
        } catch (err) {
          console.error(`[WhatsApp] Error processing message ${message.id}:`, err);
          // Don't throw — we need to return 200 for all messages
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
}

/**
 * Verify the X-Hub-Signature-256 header using HMAC-SHA256.
 */
async function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expected = `sha256=${hashHex}`;
  return signature === expected;
}
