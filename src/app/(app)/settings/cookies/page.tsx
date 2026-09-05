"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Cookie settings moved into Privacy & Security (Explore/Me revision, change 16).
 * This route must keep redirecting — the cookie-consent banner deep-links here
 * (GDPR Art. 7: consent controls may move but never 404).
 */
export default function CookieSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/security#cookies");
  }, [router]);
  return null;
}
