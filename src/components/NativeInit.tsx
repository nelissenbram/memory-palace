"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/native/platform";
import { initDeepLinkListener } from "@/lib/native/deep-links";
import { initPushNotifications } from "@/lib/native/push-notifications";

/**
 * Initializes native-only features (deep links, push notifications, splash screen, etc).
 * Renders nothing — just runs setup logic on mount.
 */
export default function NativeInit() {
  useEffect(() => {
    initDeepLinkListener();
    initPushNotifications();

    // Dismiss the server-rendered loading overlay now that React has mounted
    if (typeof window !== "undefined" && (window as any).__mpHideLoading) {
      (window as any).__mpHideLoading();
    }

    // Hide splash screen only after the page has rendered real content.
    // launchAutoHide is disabled so we control the timing here.
    if (isNative()) {
      const hide = () => {
        import("@capacitor/splash-screen").then(({ SplashScreen }) => {
          SplashScreen.hide().catch(() => {});
        }).catch(() => {});
      };
      // Wait for next animation frame (ensures React has flushed to DOM)
      // then an extra 300ms buffer so the content is painted
      requestAnimationFrame(() => {
        setTimeout(hide, 300);
      });

      // Safety net: force-hide splash after 5s even if React fails to mount properly.
      // Prevents the app from appearing stuck on a blank screen during review.
      setTimeout(hide, 5000);
    }
  }, []);

  return null;
}
