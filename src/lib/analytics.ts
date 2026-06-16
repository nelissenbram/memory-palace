import posthog from "posthog-js";
import { isNative } from "@/lib/native/platform";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  // On native iOS/Android: use localStorage only (no cookies) to avoid
  // Apple's App Tracking Transparency requirement (Guideline 5.1.2i).
  const persistence = isNative() ? "localStorage" as const : "localStorage+cookie" as const;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    persistence,
    autocapture: false,
    loaded: () => { initialized = true; },
  });
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function reset() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

export { posthog };
