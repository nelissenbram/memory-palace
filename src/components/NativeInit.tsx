"use client";

import { useEffect } from "react";
import { initDeepLinkListener } from "@/lib/native/deep-links";

/**
 * Initializes native-only features (deep links, etc).
 * Renders nothing — just runs setup logic on mount.
 */
export default function NativeInit() {
  useEffect(() => {
    initDeepLinkListener();
  }, []);

  return null;
}
