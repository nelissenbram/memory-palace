import { cookies, headers } from "next/headers";
import LandingV2Client from "./LandingV2Client";
import enMessages from "@/messages/en.json";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";

type Messages = typeof enMessages;

/** Server-side locale slice loading: only the active locale's landing copy is
 *  rendered/serialized — the client never bundles the other locale files. */
async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "nl": return (await import("@/messages/nl.json")).default as Messages;
    case "de": return (await import("@/messages/de.json")).default as Messages;
    case "es": return (await import("@/messages/es.json")).default as Messages;
    case "fr": return (await import("@/messages/fr.json")).default as Messages;
    default: return enMessages;
  }
}

/**
 * Server wrapper for the landing page. Detects the iOS app request the same way
 * as isIOSRequest() in plan-limits.ts (mp_platform=ios cookie set by NativeInit
 * + the MemoryPalace-iOS UA marker) and seeds it into the client so the raw SSR
 * HTML never carries paid CTAs / upgrade copy on iOS (Apple Guideline 3.1.1).
 * The cookies()/headers() calls also keep this route dynamic — never cache the
 * iOS variant for web visitors or vice versa.
 */
export default async function Page() {
  const cookieStore = await cookies();
  const h = await headers();
  const initialIosApp =
    cookieStore.get("mp_platform")?.value === "ios" ||
    (h.get("user-agent") || "").includes("MemoryPalace-iOS");

  const cookieLocale = cookieStore.get("mp_locale")?.value as Locale | undefined;
  const locale: Locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : "en";
  const messages = await loadMessages(locale);

  return (
    <LandingV2Client
      initialIosApp={initialIosApp}
      initialLocale={locale}
      v2={messages.landingV2}
      faq={messages.landing.faq}
      footer={messages.landing.footer}
    />
  );
}
