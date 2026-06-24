"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/native/platform";
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
