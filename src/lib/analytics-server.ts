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

const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

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
