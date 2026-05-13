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

    // Manually hide splash screen after app renders — safety net in case auto-hide fails
    if (isNative()) {
      import("@capacitor/splash-screen").then(({ SplashScreen }) => {
        SplashScreen.hide().catch(() => {});
      }).catch(() => {});
    }
  }, []);

  return null;
}
