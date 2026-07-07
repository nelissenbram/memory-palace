/**
 * Native platform detection utility for Capacitor.
 * Use `isNative()` to conditionally hide/show features in the native app.
 */

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/** Returns true when running inside Capacitor (Android/iOS), false on web. */
export function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/** Returns the current platform: "android", "ios", or "web". */
export function getPlatform(): string {
  try { return Capacitor.getPlatform(); } catch { return "web"; }
}

/** Returns true when running inside the Android native app. */
export function isAndroid(): boolean {
  try { return Capacitor.getPlatform() === "android"; } catch { return false; }
}

/** Returns true when running inside the iOS native app. */
export function isIOS(): boolean {
  try { return Capacitor.getPlatform() === "ios"; } catch { return false; }
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

/**
 * Navigate to an internal app route. Inside the native app we must stay in the
 * WKWebView/WebView (opening a new tab dumps the user out to Safari/Chrome,
 * which Apple flags under Guideline 4.2). On web we preserve new-tab behavior.
 */
export function navigateInApp(path: string): void {
  if (isNative()) {
    window.location.href = path;
  } else {
    window.open(path, "_blank", "noopener");
  }
}

/**
 * Hard-navigate the WKWebView to `url`, but FIRST tear down any native view that
 * owns the iOS first-responder / touch-gesture chain (the software keyboard) and
 * let it fully settle.
 *
 * Root cause of Apple 2.1a "unresponsive after login": on iOS, if the app fires a
 * full-document window.location navigation while a native responder-owner (the
 * on-screen keyboard focused on the email/password field, or a just-dismissed
 * SFSafariViewController) is mid-teardown, the underlying WKContentView loses its
 * touch gesture recognizers. The freshly loaded page paints but receives ZERO taps
 * until the app is force-quit (which recreates the WKWebView). Blurring the input,
 * dismissing the keyboard, and waiting for the dismissal to complete lets the
 * WebView reclaim first responder BEFORE the navigation, so the wedge never forms.
 *
 * No-op delay on web — there it just navigates immediately.
 */
export async function nativeHardNav(url: string, settleMs = 400): Promise<void> {
  if (isNative()) {
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      await Keyboard.hide();
    } catch {}
    // Let the keyboard dismissal animation finish and the WKWebView reclaim
    // first responder before we tear the document down.
    await new Promise<void>((resolve) => setTimeout(resolve, settleMs));
  }
  window.location.href = url;
}
