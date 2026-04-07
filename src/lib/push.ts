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

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@thememorypalace.ai";
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.warn("[push] Invalid VAPID keys:", err);
    return false;
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
  if (!ensureVapid()) {
    return { ok: false, error: "VAPID keys not configured" };
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
