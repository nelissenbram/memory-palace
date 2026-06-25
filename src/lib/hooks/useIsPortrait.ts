"use client";
import { useSyncExternalStore } from "react";

/**
 * True when the device is in portrait orientation. Needed because useIsMobile() fires for
 * BOTH a portrait phone AND a landscape phone (max-height:500), so full-screen takeovers
 * that are vertically-centered for portrait clip in landscape now that the app auto-rotates.
 * SSR fallback true (portrait is the primary target).
 */
const PORTRAIT_QUERY = "(orientation: portrait)";

export function useIsPortrait(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PORTRAIT_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => true,
  );
}
