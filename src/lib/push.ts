/**
 * Web Push notification helpers (server-side).
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   — base64url-encoded VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded VAPID private key
 *   VAPID_SUBJECT      — mailto: or https:// identifier
 *
 * Generate keys once via: npx web-push generate-vapid-keys
 */

import webpush from "web-push";

let vapidConfigured = false;
let vapidInitError: string | null = null;

function ensureVapid(): { ok: boolean; error?: string } {
  if (vapidConfigured) return { ok: true };
  if (vapidInitError) return { ok: false, error: vapidInitError };
  const pub = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = (process.env.VAPID_SUBJECT || "mailto:info@thememorypalace.ai").trim();
  if (!pub || !priv) {
    vapidInitError = `missing env (pub=${!!pub} priv=${!!priv})`;
    return { ok: false, error: vapidInitError };
  }
  // Expected sizes: public 65 bytes (base64url ~87 chars), private 32 bytes (~43 chars)
  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidConfigured = true;
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message || String(err);
    vapidInitError = `setVapidDetails: ${msg} (subject="${subject}" pub.len=${pub.length} priv.len=${priv.length})`;
    console.warn("[push]", vapidInitError);
    return { ok: false, error: vapidInitError };
  }
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false if the subscription is expired/invalid.
 */
export async function sendPush(
  subscription: PushSubscriptionJSON,
  payload: NotificationPayload
): Promise<boolean> {
  const result = await sendPushDetailed(subscription, payload);
  return result.ok;
}

export async function sendPushDetailed(
  subscription: PushSubscriptionJSON,
  payload: NotificationPayload
): Promise<{ ok: boolean; error?: string; statusCode?: number }> {
  const vapid = ensureVapid();
  if (!vapid.ok) {
    return { ok: false, error: vapid.error || "VAPID keys not configured" };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 } // 24h
    );
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    console.error("[push] Failed to send notification:", err);
    return {
      ok: false,
      statusCode: e.statusCode,
      error: `${e.statusCode ?? "?"}: ${e.body || e.message || "unknown"}`,
    };
  }
}
