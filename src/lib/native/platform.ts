/**
 * Native platform detection utility for Capacitor.
 * Use `isNative()` to conditionally hide/show features in the native app.
 */

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/** Returns true when running inside Capacitor (Android/iOS), false on web. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns the current platform: "android", "ios", or "web". */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

/** Returns true when running inside the Android native app. */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === "android";
}

/** Returns true when running inside the iOS native app. */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === "ios";
}

/**
 * Open a URL in the system browser (Safari/Chrome).
 * On iOS this is required for Stripe checkout (External Purchase Link).
 * On web, falls back to normal navigation.
 */
export async function openInExternalBrowser(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
}
