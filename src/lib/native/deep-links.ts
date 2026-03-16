/**
 * Deep link handler for Capacitor.
 * Listens for incoming URLs (e.g. OAuth callback redirects)
 * and routes them to the appropriate handler.
 */

import { App } from "@capacitor/app";
import { isNative } from "./platform";

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

      // Handle OAuth callback
      if (parsedUrl.pathname === "/auth/callback") {
        // Supabase appends tokens as hash fragments or query params
        // Navigate to the callback URL so the existing auth handler picks it up
        const params = parsedUrl.hash || parsedUrl.search;
        window.location.href = `/auth/callback${params}`;
        return;
      }

      // Handle other deep links — navigate to the path
      if (parsedUrl.hostname === "thememorypalace.ai") {
        window.location.href = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
      }
    } catch {
      // Invalid URL, ignore
    }
  });
}
