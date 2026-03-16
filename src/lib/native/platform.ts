/**
 * Native platform detection utility for Capacitor.
 * Use `isNative()` to conditionally hide/show features in the native app.
 */

import { Capacitor } from "@capacitor/core";

/** Returns true when running inside Capacitor (Android/iOS), false on web. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns the current platform: "android", "ios", or "web". */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
