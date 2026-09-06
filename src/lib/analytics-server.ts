// Server-side product analytics → PostHog.
//
// The in-app (client) PostHog is intentionally disabled inside the native shell
// (Apple 5.1.2i — no device tracking / cookies / ATT). This helper captures key
// product milestones from the SERVER instead: first-party events keyed by the
// Supabase user id, with NO device data, cookies, IP fingerprinting, or PII. That
// gives one unified PostHog portal covering web AND native behaviour, and merges
// cleanly with client events (same distinct_id = uid) and RevenueCat revenue events.
//
// Fire-and-forget, never throws into the caller: analytics must never break a
// product action. Disabled when the key is absent or POSTHOG_SERVER_CAPTURE="0".

import { cookies, headers } from "next/headers";

const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Best-effort platform of the CURRENT request's originating device, for event
 * properties (OPS-010): "ios" | "android" | "web", or undefined outside a
 * request scope.
 *
 * Detection reuses the app's existing signals:
 *  - iOS: the `mp_platform=ios` cookie set by NativeInit and/or the
 *    `MemoryPalace-iOS` UA marker from capacitor.config.ts (same sources as
 *    isIOSRequest() in plan-limits.ts — the canonical iOS detection).
 *  - Android: the Capacitor app has no cookie/UA marker of its own, so we fall
 *    back to the Android System WebView UA fingerprint ("Android" + "; wv)"),
 *    which the remote-loading Capacitor WebView always carries. Mobile Chrome
 *    (no "wv") correctly stays "web".
 *
 * Only call this for requests that genuinely originate from a user's device —
 * for cron/webhook-triggered work the UA belongs to the calling server and the
 * result would be meaningless.
 */
export async function detectRequestPlatform(): Promise<"web" | "ios" | "android" | undefined> {
  let ua = "";
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("mp_platform")?.value === "ios") return "ios";
  } catch {
    /* outside a request scope — fall through to the headers attempt */
  }
  try {
    ua = (await headers()).get("user-agent") || "";
  } catch {
    return undefined; // no request scope at all
  }
  if (ua.includes("MemoryPalace-iOS")) return "ios";
  if (ua.includes("Android") && /;\s?wv\)/.test(ua)) return "android";
  return "web";
}

/**
 * Capture a server-side product milestone.
 * @param distinctId Supabase auth uid (so it merges with the client-side person)
 * @param event      snake_case event name, e.g. "memory_created"
 * @param properties small, non-PII property bag
 */
export async function captureServer(
  distinctId: string | null | undefined,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (!KEY || !distinctId || process.env.POSTHOG_SERVER_CAPTURE === "0") return;
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: distinctId,
        // Caller props WIN over the defaults: memory_created carries source
        // "manual"|"kep"|"import"|"concierge" — clobbering it with "server"
        // would flatten the capture-14d per-source breakdown.
        properties: { $lib: "mp-server", channel: "server", ...properties },
        timestamp: new Date().toISOString(),
      }),
      // never let analytics stall a request for long
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // swallow — analytics is best-effort and must not affect the product path
  }
}

/**
 * LEG-012: best-effort deletion of the PostHog person profile (including the
 * display-name person property, and the person's events) when a user deletes
 * their account. Uses PostHog's private API on eu.posthog.com with a personal
 * API key — NOT the public capture key above.
 *
 * Missing envs or an API failure must NEVER block account deletion: this
 * function only console.warns and returns. The GDPR erasure of the actual
 * account (Supabase) does not depend on it.
 */
export async function deletePersonServer(distinctId: string): Promise<void> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.warn(
      "PostHog person delete skipped: POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not configured",
    );
    return;
  }
  try {
    const res = await fetch(
      `https://eu.posthog.com/api/projects/${projectId}/persons/bulk_delete/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        // delete_events wipes the person's event history too (the events are
        // keyed by the same uid) — full erasure, not just the profile row.
        body: JSON.stringify({ distinct_ids: [distinctId], delete_events: true }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      console.warn(`PostHog person delete failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn("PostHog person delete failed:", err);
  }
}
