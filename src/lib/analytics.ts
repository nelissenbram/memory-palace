import posthog from "posthog-js";
import { isNative } from "@/lib/native/platform";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  // Do not load any analytics inside the native apps. Apple flags cookies/tracking
  // (Guideline 5.1.2i) and we don't use App Tracking Transparency. Keeping PostHog
  // out of the native shell entirely means no tracking network calls or cookies there.
  if (isNative()) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    loaded: () => { initialized = true; },
  });
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || isNative()) return;
  posthog.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || isNative()) return;
  posthog.capture(event, properties);
}

export function reset() {
  if (typeof window === "undefined" || isNative()) return;
  posthog.reset();
}

export { posthog };
