import { isNative } from "@/lib/native/platform";

// posthog-js (~184KB) is loaded ONLY after consent, via dynamic import — it must
// never ship in the first-paint layout chunk (most sessions never consent). The
// type is erased at build time, so this costs nothing at runtime.
type PostHogClient = (typeof import("posthog-js"))["default"];
let ph: PostHogClient | null = null;
let initialized = false;

/**
 * Analytics run only after explicit consent (GDPR ePrivacy / Apple 5.1.2). Default
 * opted-out: a missing decision means NO analytics. Reads the per-category settings
 * toggle first, then the consent-banner decision.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const analytics = localStorage.getItem("mp-cookie-analytics");
    if (analytics === "1") return true;
    if (analytics === "0") return false;
    return localStorage.getItem("mp_cookie_consent") === "accepted";
  } catch {
    return false;
  }
}

/** Stop tracking and clear any stored analytics identity (consent withdrawn). */
export function optOutAnalytics() {
  if (typeof window === "undefined" || isNative()) return;
  try { ph?.opt_out_capturing(); ph?.reset(); } catch { /* not initialized */ }
}

export async function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  // Do not load any analytics inside the native apps. Apple flags cookies/tracking
  // (Guideline 5.1.2i) and we don't use App Tracking Transparency. Keeping PostHog
  // out of the native shell entirely means no tracking network calls or cookies there.
  if (isNative()) return;
  // Web: never initialize (nor download the SDK) without explicit consent.
  if (!hasAnalyticsConsent()) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const mod = await import("posthog-js");
  ph = mod.default;
  ph.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    loaded: () => { initialized = true; },
  });
}

export function identify(
  userId: string,
  properties?: Record<string, unknown>,
  setOnceProperties?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || isNative() || !hasAnalyticsConsent()) return;
  ph?.identify(userId, properties, setOnceProperties);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || isNative() || !hasAnalyticsConsent()) return;
  ph?.capture(event, properties);
}

export function reset() {
  if (typeof window === "undefined" || isNative()) return;
  ph?.reset();
}
