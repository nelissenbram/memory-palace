/**
 * Deep link handler for Capacitor.
 * Listens for incoming URLs (e.g. OAuth callback redirects)
 * and routes them to the appropriate handler.
 */

import { App } from "@capacitor/app";
import { isNative, nativeHardNav } from "./platform";

let initialized = false;

/**
 * Initialize deep link listener. Call once at app startup.
 * Handles OAuth callback URLs by extracting tokens and
 * completing the auth flow.
 */
export function initDeepLinkListener() {
  if (!isNative() || initialized) return;
  initialized = true;

  App.addListener("appUrlOpen", ({ url }) => {
    try {
      const parsedUrl = new URL(url);

      // Handle OAuth callback. It arrives either as our custom-scheme URL
      // (ai.thememorypalace.app://auth/callback?…) — which iOS hands back to the
      // app reliably — or, as a fallback, an https Universal Link (/auth/callback).
      // For the custom scheme, the host is "auth" and the path is "/callback".
      const isOAuthCallback =
        parsedUrl.pathname === "/auth/callback" ||
        (parsedUrl.host === "auth" && parsedUrl.pathname === "/callback");
      if (isOAuthCallback) {
        // Supabase appends tokens as hash fragments or the auth code as a query
        // param. Replay them into the WebView so the existing /auth/callback
        // handler completes the session.
        const params = parsedUrl.hash || parsedUrl.search;
        const go = () => { void nativeHardNav(`/auth/callback${params}`); };
        // CRITICAL (Apple 2.1a — "all buttons dead after first login, fixed by
        // force-quit"): fully dismiss the SFSafariViewController BEFORE navigating
        // the WebView. Navigating while the auth sheet is still dismissing leaves
        // the underlying WKWebView without first-responder on iPad — the page
        // renders but every tap is swallowed until the app is force-quit. Await
        // the close, then nativeHardNav dismisses any keyboard and lets the
        // native responder chain settle before navigating so touch input survives.
        import("@capacitor/browser")
          .then(async ({ Browser }) => {
            try { await Browser.close(); } catch {}
            go();
          })
          .catch(go);
        return;
      }

      // Handle other deep links — navigate to the path.
      // Accept both the apex and www host (Universal Links + the live-load run on www).
      const host = parsedUrl.hostname.replace(/^www\./, "");
      if (host === "thememorypalace.ai") {
        window.location.href = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
      }
    } catch {
      // Invalid URL, ignore
    }
  });
}
