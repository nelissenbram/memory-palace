"use client";

import { useEffect } from "react";
import { initDeepLinkListener } from "@/lib/native/deep-links";
import { initPushNotifications } from "@/lib/native/push-notifications";

/**
 * Initializes native-only features (deep links, push notifications, etc).
 * Renders nothing — just runs setup logic on mount.
 */
export default function NativeInit() {
  useEffect(() => {
    initDeepLinkListener();
    initPushNotifications();
  }, []);

  return null;
}
