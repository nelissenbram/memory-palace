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

type V2 = Messages["landingV2"];
type Faq = Messages["landing"]["faq"];
type Footer = Messages["landing"]["footer"];

/**
 * Server-side iOS seal (Apple 3.1.1): the client receives PROPS, and props are
 * serialized into the RSC payload — so on iOS we must not merely hide paid
 * surfaces, the web-only strings must never leave the server. This overwrites
 * every price/plan-bearing string with its *_ios variant (or empties it).
 */
function sealForIos(v2: V2, faq: Faq, footer: Footer): { v2: V2; faq: Faq; footer: Footer } {
  const sealedV2: V2 = {
    ...v2,
    hero: { ...v2.hero, sub: v2.hero.sub_ios, ctaMicro: v2.hero.ctaMicro_ios },
    proof: { ...v2.proof, p1: v2.proof.p1_ios, p1Label: v2.proof.p1Label_ios },
    how: {
      ...v2.how,
      midCta: v2.how.midCta_ios,
      // Gift path is web-only; keep the payload free of it.
      toggleGift: "",
      g1t: "", g1d: "", g2t: "", g2d: "", g3t: "", g3d: "",
    },
    nav: { ...v2.nav, pricing: "" },
    pricing: { h2: "", line: "", cta: "" },
  };
  const sealedFaq = { ...faq } as Record<string, string>;
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const ios = sealedFaq[`a${n}_ios`];
    if (ios) sealedFaq[`a${n}`] = ios;
  }
  const sealedFooter: Footer = { ...footer, pricing: "", getStartedFree: footer.signIn };
  return { v2: sealedV2, faq: sealedFaq as Faq, footer: sealedFooter };
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
  const slices = initialIosApp
    ? sealForIos(messages.landingV2, messages.landing.faq, messages.landing.footer)
    : { v2: messages.landingV2, faq: messages.landing.faq, footer: messages.landing.footer };

  return (
    <LandingV2Client
      initialIosApp={initialIosApp}
      initialLocale={locale}
      v2={slices.v2}
      faq={slices.faq}
      footer={slices.footer}
    />
  );
}
