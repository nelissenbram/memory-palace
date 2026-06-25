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
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1024px) and (pointer: coarse)";
const COMPACT_QUERY = "(max-width: 1024px)";

/** True when the viewport is too narrow for a full desktop layout — phones AND tablets in
 *  portrait (iPad portrait is 768–1024px wide). Use for nav collapse / grid density on
 *  layouts that overflow on a tablet, where useIsMobile (max 767) wrongly reports desktop. */
export function useIsCompact(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(COMPACT_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}

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

/** Returns true on tablet-sized touch devices (768-1024px, coarse pointer).
 *  Use this to increase padding/touch targets on iPad without switching to mobile layout. */
export function useIsTablet(): boolean {
  return useSyncExternalStore(
    subscribeTablet,
    () => window.matchMedia(TABLET_QUERY).matches,
    () => false,
  );
}

function subscribeTablet(callback: () => void) {
  const mq = window.matchMedia(TABLET_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
