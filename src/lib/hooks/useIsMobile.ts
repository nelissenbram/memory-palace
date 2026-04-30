"use client";
import { useSyncExternalStore } from "react";

/** Returns true when the device is phone-sized — either viewport width < 768px
 *  (portrait phones / small tablets) OR viewport height < 500px (phones in
 *  landscape, where width exceeds 768 but the device is still a phone).
 *
 *  Uses useSyncExternalStore so the correct value is available before first
 *  browser paint (no flash of desktop layout on mobile). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false, // SSR fallback
  );
}

/** Returns true when viewport width < 480px */
export function useIsSmall(): boolean {
  return useSyncExternalStore(
    subscribeSmall,
    () => window.matchMedia(SMALL_QUERY).matches,
    () => false,
  );
}

const MOBILE_QUERY = "(max-width: 767px), (max-height: 500px)";
const SMALL_QUERY = "(max-width: 479px)";

function subscribeMobile(callback: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function subscribeSmall(callback: () => void) {
  const mq = window.matchMedia(SMALL_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
