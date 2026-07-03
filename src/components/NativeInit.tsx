"use client";

import { useEffect } from "react";
import { isNative, isIOS } from "@/lib/native/platform";
import { initDeepLinkListener } from "@/lib/native/deep-links";
import { initPushNotifications } from "@/lib/native/push-notifications";
import { initExternalLinkHandler } from "@/lib/native/external-links";

/**
 * Initializes native-only features (deep links, push notifications, splash screen, etc).
 * Renders nothing — just runs setup logic on mount.
 */
export default function NativeInit() {
  useEffect(() => {
    initDeepLinkListener();
    initPushNotifications();
    initExternalLinkHandler();

    // Tag every request from the iOS app so the server enforces free-tier
    // entitlement on iOS (Apple Guideline 3.1.1 — the app never unlocks content
    // purchased outside the app on iOS). This cookie is sent automatically with
    // all fetches/server actions to the same origin and lives only in the iOS
    // WKWebView cookie jar (never a desktop browser). Belt-and-suspenders with
    // the `MemoryPalace-iOS` UA marker in capacitor.config.ts. iOS only —
    // Android keeps its existing entitlement behaviour.
    if (isIOS()) {
      try {
        document.cookie = "mp_platform=ios; path=/; max-age=31536000; SameSite=Lax; Secure";
      } catch { /* non-fatal */ }
    }

    // Dismiss the server-rendered loading overlay now that React has mounted
    if (typeof window !== "undefined" && (window as any).__mpHideLoading) {
      (window as any).__mpHideLoading();
    }

    // Hide splash screen after the page has rendered real content.
    // launchAutoHide is enabled (3s) as a backstop; this call hides it sooner.
    const hideSplash = () => {
      import("@capacitor/splash-screen").then(({ SplashScreen }) => {
        SplashScreen.hide().catch(() => {});
      }).catch(() => {});
    };

    if (isNative()) {
      // Wait for next animation frame (ensures React has flushed to DOM)
      // then an extra 300ms buffer so the content is painted
      requestAnimationFrame(() => {
        setTimeout(hideSplash, 300);
      });
    }

    // Universal safety net: force-hide splash after 2s regardless of isNative().
    // If the Capacitor bridge failed to inject, isNative() returns false but
    // the splash may still be visible. The import fails silently on web.
    // launchAutoHide is set to 3s as a backstop; this JS call hides it sooner.
    setTimeout(hideSplash, 2000);
  }, []);

  return null;
}
