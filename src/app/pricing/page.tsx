"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import Toast, { type ToastData } from "@/components/ui/Toast";
import { PLANS, PLAN_ORDER, type PlanId, type BillingInterval } from "@/lib/constants/plans";
import { useIsMobile, useIsSmall, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { isAndroid, isIOS, isNative, openInExternalBrowser } from "@/lib/native/platform";
import { initIAP, getIAPProductId, getProduct, purchase, getIAPError, restorePurchases, isIAPReady, waitForProducts, IAP_ENABLED } from "@/lib/native/iap";
import { EMBER, HAIRLINE, focusRing } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { detectCurrency, convertPrice, formatPrice, type SupportedCurrency } from "@/lib/currency";
import { track } from "@/lib/analytics";

const F = T.font;
const C = T.color;

// Canon interactive/border/secondary tokens (libraryTokens). The page historically
// painted every CTA/toggle/badge/link with the off-canon terracotta #C66B3D and
// bordered with sandstone; repoint to EMBER / HAIRLINE / MUTED so /pricing matches
// the rest of the palace.
const EMBER_CTA = EMBER;        // #B85C38 interactive / active
const HAIRLINE_BORDER = HAIRLINE; // #E3D6BC canon 1px border
// Canon body/heading ink is INK #403B36 (theme.ts C.ink), not the cold legacy
// near-black C.charcoal (#1F1B1A). Paint all body/heading text with INK_TEXT so
// /pricing matches the warmer ink used across the landing siblings.
const INK_TEXT = C.ink;         // #403B36 canon body/heading ink
// Canon secondary text is MUTED #716A5E (C.muted). walnut (#8B7355) is a
// non-text ink; keep it only for the CTA gradient stop, never for copy.
const MUTED_TEXT = C.muted;     // #716A5E canon secondary text

export default function PricingPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const isCompact = useIsCompact();
  const isPortrait = useIsPortrait();
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [currency, setCurrency] = useState<SupportedCurrency>("EUR");
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [iapReady, setIapReady] = useState(false);
  const [iapError, setIapError] = useState<string | null>(null);
  const isApple = isIOS();
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation("pricing");

  // Honour the OS "reduce motion" preference for the hover/active scale and the
  // colour/transform transitions on the toggle, CTAs and highlighted card.
  // Inline-only (canon forbids @media in styles): read the media query in JS and
  // fall back to transition:'none' / no scale when the user asks for less motion.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Auto-detect currency from timezone/locale
  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  // Funnel: paywall impression. track() is a no-op in native + without consent,
  // so this only fires for consenting web viewers (the RC webhook covers native
  // purchases server-side). Fires once per page view.
  useEffect(() => {
    track("paywall_viewed", { source: "pricing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { t: ts } = useTranslation("subscription");
  const { t: tp } = useTranslation("plans");
  const { t: tc } = useTranslation("common");

  // Native-app gating for the pricing page. Android now uses web (Stripe)
  // checkout opened in an external browser, so the Android app can view this
  // page. On iOS with IAP disabled we keep the app cleanly free (Apple
  // Guideline 3.1.1) by routing native users into the app instead of showing
  // dead/"Preparing store" purchase buttons; with IAP enabled, iOS drives
  // purchases exclusively through initIAP()/purchase() below.
  useEffect(() => {
    // Android uses web (Stripe) checkout opened in an external browser, so the
    // native Android app may view this page. iOS shows the IAP paywall when IAP
    // is enabled; while disabled it stays free-tier (route away).
    // Purchases on iOS go exclusively through initIAP()/purchase() below — never Stripe.
    if (isIOS() && !IAP_ENABLED) {
      router.replace("/atrium");
    }
  }, [router]);

  // Initialize IAP on iOS. A successful initIAP() alone does NOT mean anything is
  // purchasable — cordova-plugin-purchase populates prices asynchronously after
  // initialize() resolves. Gate iapReady on waitForProducts() (the documented
  // contract in iap.ts) so the Upgrade button only enables once a real price has
  // loaded, never erroring on tap (Apple Guideline 2.1).
  useEffect(() => {
    if (!(isApple && IAP_ENABLED)) return;
    let isMounted = true;
    (async () => {
      const ok = await initIAP();
      if (!ok) {
        if (isMounted) setIapError(getIAPError());
        return;
      }
      const ready = await waitForProducts();
      if (!isMounted) return;
      setIapReady(ready);
      if (!ready) setIapError(getIAPError() || "Subscriptions are taking longer than usual to load. Please try again.");
    })();
    return () => { isMounted = false; };
  }, [isApple]);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "free") {
      window.location.href = "/register";
      return;
    }

    // Funnel: purchase intent (store dimension). No-op in native (iOS IAP purchases
    // are captured server-side via the RevenueCat webhook), meaningful on web.
    track("checkout_started", {
      plan: planId,
      interval,
      store: isApple ? "app_store" : isAndroid() ? "play_store" : "stripe",
      source: "pricing",
    });

    // Use IAP on iOS
    if (isApple && !iapReady) {
      setToast({ message: iapError || "Subscriptions are loading. Please try again in a moment.", type: "error" });
      return;
    }
    if (isApple && iapReady) {
      setLoading(planId);
      try {
        const productId = getIAPProductId(planId as "keeper" | "guardian", interval);
        const success = await purchase(productId);
        if (success) {
          setToast({ message: t("subscriptionActivated") !== "subscriptionActivated" ? t("subscriptionActivated") : "Subscription activated!", type: "success" });
          setTimeout(() => router.push("/settings/subscription"), 1500);
        } else {
          setToast({ message: t("somethingWentWrong"), type: "error" });
        }
      } catch {
        setToast({ message: t("couldNotConnect"), type: "error" });
      }
      setLoading(null);
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval, currency }),
        redirect: "manual",
      });
      // Middleware redirects unauthenticated users — detect redirect
      if (res.type === "opaqueredirect" || res.status === 0 || res.status === 307 || res.status === 308) {
        window.location.href = "/register";
        return;
      }
      // Auth middleware may answer with 401/403 (or a 302 redirect) for
      // unauthenticated users — route them to register rather than falling
      // through to the JSON error path.
      if (res.status === 401 || res.status === 403 || res.status === 302) {
        window.location.href = "/register";
        return;
      }

      let data;
      try {
        data = await res.json();
      } catch {
        setToast({ message: `${t("couldNotConnect")} (${res.status})`, type: "error" });
        return;
      }

      if (data.url) {
        // Web navigates to Stripe checkout directly; the native Android app
        // opens it in an external browser instead of the in-app webview.
        // iOS never reaches this branch — it uses IAP exclusively (opening
        // Stripe externally on iOS is an Apple 3.1.1/3.1.3 reject).
        if (isNative()) {
          await openInExternalBrowser(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        setToast({ message: data.error || t("somethingWentWrong"), type: "error" });
      }
    } catch (err) {
      setToast({ message: `${t("couldNotConnect")} ${err instanceof Error ? err.message : ""}`, type: "error" });
    }
    setLoading(null);
  };

  const faqs = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
  ];

  // When the user prefers reduced motion, drop every colour/scale transition to
  // "none" and skip the highlighted-card scale-up.
  const trans = (value: string) => (reduceMotion ? "none" : value);
  const highlightScale = reduceMotion ? undefined : "scale(1.03)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.linen,
        fontFamily: F.body,
        color: INK_TEXT,
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(1.25rem, 5vw, 3.75rem)",
          height: "4rem",
          background: `${C.linen}e8`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${HAIRLINE_BORDER}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/" aria-label={tc("a11yBackToHome")} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "2.75rem", height: "2.75rem", borderRadius: "0.5rem",
            border: `1px solid ${HAIRLINE_BORDER}`,
            background: "none", color: MUTED_TEXT, textDecoration: "none",
            transition: trans("border-color 0.2s"),
          }}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="sm" />
            <span
              style={{
                fontFamily: F.display,
                fontSize: "1.25rem",
                fontWeight: 500,
                color: INK_TEXT,
                letterSpacing: "-0.3px",
              }}
            >
              {t("title")}
            </span>
          </Link>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} aria-label={tc("a11ySwitchLanguage")}
            onFocus={(e) => { e.currentTarget.style.outline = focusRing.outline; e.currentTarget.style.outlineOffset = focusRing.outlineOffset; }}
            onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
            style={{
            background: "none", border: `1px solid ${HAIRLINE_BORDER}`, borderRadius: "0.375rem",
            padding: "0.5rem 0.625rem", minHeight: "2.75rem", fontSize: "1rem", fontFamily: F.body,
            fontWeight: 600, color: MUTED_TEXT, cursor: "pointer", letterSpacing: "0.5px",
            textTransform: "uppercase", transition: trans("border-color 0.2s, color 0.2s"),
            appearance: "none", WebkitAppearance: "none", paddingRight: "1.5rem",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23716A5E'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center",
          }}>
            {locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          {!isSmall && (
            <Link
              href="/login"
              style={{
                fontFamily: F.body,
                fontSize: "0.875rem",
                color: MUTED_TEXT,
                textDecoration: "none",
                padding: "0.5rem 1rem",
              }}
            >
              {t("signIn")}
            </Link>
          )}
          <Link
            href="/register"
            style={{
              fontFamily: F.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: C.white,
              textDecoration: "none",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.625rem",
              background: `linear-gradient(135deg, ${EMBER_CTA}, ${C.walnut})`,
            }}
          >
            {t("getStarted")}
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section
        style={{
          // Tighten the tall top padding on landscape phones (short viewport)
          // so the hero isn't pushed below the fold; keep the roomy portrait value.
          padding: isMobile ? (isPortrait ? "3.75rem 1.25rem 2.5rem" : "2rem 1.25rem 1.75rem") : "5rem 2.5rem 3.5rem",
          textAlign: "center",
          background: `radial-gradient(ellipse at 50% 30%, ${C.warmStone}, ${C.linen} 70%)`,
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            color: EMBER_CTA,
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          {t("headline")}
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 300,
            lineHeight: 1.15,
            color: INK_TEXT,
            marginBottom: "1rem",
          }}
        >
          {t("subheadline")}
        </h1>
        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.1875rem)",
            color: MUTED_TEXT,
            maxWidth: "32.5rem",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          {t("description")}
        </p>
      </section>

      {/* Billing Interval Toggle + Currency Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.75rem",
          padding: isMobile ? "0 1rem" : "0 2.5rem",
          marginTop: "-0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div
          role="radiogroup"
          aria-label={t("billingInterval") !== "billingInterval" ? t("billingInterval") : "Billing interval"}
          style={{
            display: "inline-flex",
            borderRadius: "0.75rem",
            background: `${C.warmStone}`,
            padding: "0.25rem",
            gap: 0,
          }}
        >
          <button
            role="radio"
            aria-checked={interval === "monthly"}
            onClick={() => setInterval("monthly")}
            style={{
              padding: "0.625rem 1.5rem",
              minHeight: "2.75rem",
              borderRadius: "0.625rem",
              border: "none",
              background: interval === "monthly"
                ? `linear-gradient(135deg, ${EMBER_CTA}, ${C.walnut})`
                : "transparent",
              color: interval === "monthly" ? C.white : MUTED_TEXT,
              fontFamily: F.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: trans("all 0.2s"),
            }}
          >
            {/* i18n: "monthly" */}
            {t("monthly") !== "monthly" ? t("monthly") : "Monthly"}
          </button>
          <button
            role="radio"
            aria-checked={interval === "annual"}
            onClick={() => setInterval("annual")}
            style={{
              padding: "0.625rem 1.5rem",
              minHeight: "2.75rem",
              borderRadius: "0.625rem",
              border: "none",
              background: interval === "annual"
                ? `linear-gradient(135deg, ${EMBER_CTA}, ${C.walnut})`
                : "transparent",
              color: interval === "annual" ? C.white : MUTED_TEXT,
              fontFamily: F.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: trans("all 0.2s"),
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {/* i18n: "annual" */}
            {t("annual") !== "annual" ? t("annual") : "Annual"}
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                padding: "0.125rem 0.5rem",
                borderRadius: "0.5rem",
                background: interval === "annual"
                  ? "rgba(255,255,255,0.25)"
                  : `${EMBER_CTA}18`,
                color: interval === "annual" ? C.white : EMBER_CTA,
                whiteSpace: "nowrap",
              }}
            >
              {t("saveUpToPercent")}
            </span>
          </button>
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
          aria-label={t("currency")}
          onFocus={(e) => { e.currentTarget.style.outline = focusRing.outline; e.currentTarget.style.outlineOffset = focusRing.outlineOffset; }}
          onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
          style={{
            background: "none",
            border: `1px solid ${HAIRLINE_BORDER}`,
            borderRadius: "0.5rem",
            padding: "0.5rem 1.75rem 0.5rem 0.625rem",
            minHeight: "2.75rem",
            fontSize: "1rem",
            fontFamily: F.body,
            fontWeight: 600,
            color: MUTED_TEXT,
            cursor: "pointer",
            letterSpacing: "0.5px",
            transition: trans("border-color 0.2s, color 0.2s"),
            appearance: "none",
            WebkitAppearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23716A5E'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.5rem center",
          }}
        >
          <option value="EUR">{"\u20AC"} EUR</option>
          <option value="USD">$ USD</option>
          <option value="GBP">{"\u00A3"} GBP</option>
        </select>
      </div>

      {/* Trust Badges */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
          padding: isMobile ? "1.25rem 1rem 0" : "1.5rem 2.5rem 0",
        }}
      >
        {[
          {
            label: t("trustSsl"),
            icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            label: t("trustGdpr"),
            icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M5.5 8.5l2 2 3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            label: t("trustGuarantee"),
            icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 8.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
        ].map((badge) => (
          <div
            key={badge.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.8125rem",
              color: MUTED_TEXT,
              fontFamily: F.body,
              fontWeight: 500,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", color: C.sage }}>
              {badge.icon}
            </span>
            {badge.label}
          </div>
        ))}
      </div>

      {/* IAP error banner for iOS */}
      {isApple && iapError && (
        <div style={{
          maxWidth: "37.5rem", margin: "1.5rem auto 0", padding: "1rem 1.25rem",
          background: `${EMBER_CTA}10`, border: `1px solid ${EMBER_CTA}30`,
          borderRadius: "0.75rem", textAlign: "center",
        }}>
          <p style={{ fontSize: "0.875rem", color: INK_TEXT, margin: 0, fontFamily: F.body }}>
            {iapError}
          </p>
          <button
            onClick={async () => {
              setIapError(null);
              const ok = await initIAP();
              if (!ok) { setIapError(getIAPError()); return; }
              const ready = await waitForProducts();
              setIapReady(ready);
              if (!ready) setIapError(getIAPError() || "Subscriptions are taking longer than usual to load. Please try again.");
            }}
            style={{
              marginTop: "0.5rem", padding: "0.5rem 1.25rem", borderRadius: "0.5rem",
              border: `1px solid ${EMBER_CTA}`, background: "transparent",
              color: EMBER_CTA, fontFamily: F.body, fontSize: "0.8125rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            {tc("retry") !== "retry" ? tc("retry") : "Try Again"}
          </button>
        </div>
      )}

      {/* Restore Purchases — required on iOS (Apple Guideline 3.1.2) */}
      {isApple && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            onClick={async () => {
              // Distinguish "store not ready yet" from a genuine empty restore,
              // so we never show "No purchases" when the store simply hasn't loaded.
              if (!isIAPReady()) {
                setToast({
                  message: tc("restoreLoading") !== "restoreLoading"
                    ? tc("restoreLoading")
                    : "Connecting to the App Store… please try again in a moment.",
                  type: "error",
                });
                return;
              }
              const ok = await restorePurchases();
              setToast({
                message: ok
                  ? (tc("restoreDone") !== "restoreDone" ? tc("restoreDone") : "Purchases restored.")
                  : (tc("restoreNone") !== "restoreNone" ? tc("restoreNone") : "No previous purchases found to restore."),
                type: ok ? "success" : "error",
              });
            }}
            style={{
              background: "none", border: "none", color: EMBER_CTA,
              fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 3, minHeight: "2.75rem",
            }}
          >
            {tc("restorePurchases") !== "restorePurchases" ? tc("restorePurchases") : "Restore Purchases"}
          </button>
        </div>
      )}

      {/* Plan Cards */}
      <section
        style={{
          padding: isMobile ? "2.5rem 1rem 5rem" : "3.5rem 2.5rem 6.25rem",
          maxWidth: "68.75rem",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: (isMobile || isCompact)
              ? "1fr"
              : "repeat(3, 1fr)",
            gap: (isMobile || isCompact) ? "1.25rem" : "1.75rem",
            alignItems: "start",
          }}
        >
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const isHighlighted = plan.highlighted;
            const isFree = planId === "free";

            return (
              <div
                key={planId}
                style={{
                  background: C.white,
                  borderRadius: "1.25rem",
                  border: isHighlighted
                    ? `2px solid ${EMBER_CTA}`
                    : `1px solid ${HAIRLINE_BORDER}`,
                  padding: isMobile ? "1.75rem 1.5rem" : "2.25rem 2rem",
                  position: "relative",
                  boxShadow: isHighlighted
                    ? "0 0.5rem 1.5rem rgba(64,59,54,0.14)"
                    : "0 0.25rem 1rem rgba(64,59,54,0.07)",
                  transform: isHighlighted && !isSmall && !isCompact ? highlightScale : undefined,
                }}
              >
                {/* Badge */}
                {isHighlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-0.875rem",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: `linear-gradient(135deg, ${EMBER_CTA}, ${C.walnut})`,
                      color: C.white,
                      fontFamily: F.body,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.375rem 1.125rem",
                      borderRadius: "1.25rem",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("mostPopular")}
                  </div>
                )}

                {/* Plan name */}
                <h3
                  style={{
                    fontFamily: F.display,
                    fontSize: "1.625rem",
                    fontWeight: 500,
                    color: INK_TEXT,
                    marginBottom: "0.25rem",
                    marginTop: isHighlighted ? "0.5rem" : 0,
                  }}
                >
                  {tp(plan.nameKey)}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: C.muted,
                    marginBottom: "1.25rem",
                    lineHeight: 1.5,
                  }}
                >
                  {tp(plan.taglineKey)}
                </p>

                {/* Price */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.25rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {isFree ? (
                    <span
                      style={{
                        fontFamily: F.display,
                        fontSize: "2.625rem",
                        fontWeight: 500,
                        color: INK_TEXT,
                      }}
                    >
                      {t("free")}
                    </span>
                  ) : (() => {
                    // On iOS show the real StoreKit price (Apple Guideline 3.1.2),
                    // not the converted web price. Annual IAP price is the yearly total.
                    const iapProduct = isApple && iapReady
                      ? getProduct(getIAPProductId(planId as "keeper" | "guardian", interval))
                      : null;
                    const priceLabel = iapProduct?.price
                      ?? formatPrice(convertPrice(interval === "monthly" ? plan.monthlyPrice : plan.price, currency), currency);
                    const showPerMonth = !iapProduct || interval === "monthly";
                    return (
                      <>
                        <span
                          style={{
                            fontFamily: F.display,
                            fontSize: "2.625rem",
                            fontWeight: 500,
                            color: INK_TEXT,
                          }}
                        >
                          {priceLabel}
                        </span>
                        {showPerMonth && (
                          <span
                            style={{
                              fontSize: "0.9375rem",
                              color: C.muted,
                            }}
                          >
                            {t("perMonth")}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {!isFree && interval === "annual" && (
                  <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: "-1rem", marginBottom: "0.5rem" }}>
                    {t("billedYearly")}
                  </p>
                )}
                {/* Web checkout charges in the Stripe price's base currency (EUR).
                    Non-EUR figures shown here are a client-side approximation, so we
                    label them as such to avoid a mismatch at checkout. iOS shows the
                    real StoreKit price (no conversion) and is excluded. */}
                {!isFree && !isApple && currency !== "EUR" && (
                  <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: "-0.25rem", marginBottom: "0.5rem", lineHeight: 1.5 }}>
                    {t("approxBilledEur")}
                  </p>
                )}

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={loading !== null || (isApple && !isFree && !iapReady)}
                  aria-busy={loading === planId}
                  onFocus={(e) => { e.currentTarget.style.outline = focusRing.outline; e.currentTarget.style.outlineOffset = focusRing.outlineOffset; }}
                  onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
                  style={{
                    width: "100%",
                    padding: "1rem 1.5rem",
                    minHeight: "2.75rem",
                    borderRadius: "0.875rem",
                    border: isFree
                      ? `1.5px solid ${HAIRLINE_BORDER}`
                      : "none",
                    background: isFree
                      ? "transparent"
                      : `linear-gradient(135deg, ${EMBER_CTA}, ${C.walnut})`,
                    color: isFree ? INK_TEXT : C.white,
                    fontFamily: F.body,
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: loading ? "wait" : (isApple && !isFree && !iapReady ? "default" : "pointer"),
                    transition: trans("all 0.2s"),
                    opacity: (loading && loading !== planId) || (isApple && !isFree && !iapReady) ? 0.6 : 1,
                    marginBottom: "1.75rem",
                  }}
                >
                  {loading === planId
                    ? t("redirecting")
                    : isFree
                      ? t("getStartedBtn")
                      : (isApple && !iapReady)
                        ? (t("preparingStore") !== "preparingStore" ? t("preparingStore") : "Preparing store…")
                        : plan.trial
                          ? (t("startFreeTrial") !== "startFreeTrial" ? t("startFreeTrial") : `Start ${plan.trial}-day free trial`)
                          : t("subscribe")}
                </button>
                {plan.trial && (
                  <p style={{
                    fontSize: "0.8125rem",
                    color: EMBER_CTA,
                    textAlign: "center" as const,
                    marginTop: "-1rem",
                    marginBottom: "1rem",
                    fontWeight: 500,
                  }}>
                    {t("trialNote") !== "trialNote" ? t("trialNote") : `${plan.trial}-day free trial, cancel anytime`}
                    {/* On iOS the Apple ID is always charged — never claim "no credit card" */}
                    {!isApple && (
                      <>
                        {" — "}
                        {t("noCardRequired") !== "noCardRequired" ? t("noCardRequired") : "no credit card required"}
                      </>
                    )}
                  </p>
                )}
                {/* Subscription disclosures (Apple Guideline 3.1.2) */}
                {!isFree && (
                  <div style={{ marginTop: "-0.5rem", marginBottom: "1.25rem" }}>
                    {isApple && (
                      <p style={{ fontSize: "0.6875rem", color: C.muted, lineHeight: 1.6, textAlign: "center" as const, margin: "0 0 0.375rem" }}>
                        {ts("autoRenewNotice")}
                      </p>
                    )}
                    <p style={{ fontSize: "0.6875rem", color: C.muted, textAlign: "center" as const, margin: 0 }}>
                      <a href="/terms" style={{ color: EMBER_CTA, textDecoration: "none" }}>{ts("disclosureTerms")}</a>
                      {"  ·  "}
                      <a href="/privacy" style={{ color: EMBER_CTA, textDecoration: "none" }}>{ts("disclosurePrivacy")}</a>
                    </p>
                  </div>
                )}

                {/* Features */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {plan.featureKeys.map((featureKey) => (
                    <div
                      key={featureKey}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        fontSize: "0.875rem",
                        color: INK_TEXT,
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          borderRadius: "0.625rem",
                          background: isHighlighted
                            ? `${EMBER_CTA}18`
                            : `${C.sage}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.6875rem",
                          color: isHighlighted ? EMBER_CTA : C.sage,
                          flexShrink: 0,
                        }}
                      >
                        {"\u2713"}
                      </span>
                      {tp(featureKey)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ-like trust section */}
      <section
        style={{
          padding: isMobile ? "3rem 1.25rem 4rem" : "4rem 2.5rem 5rem",
          background: C.warmStone,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: F.display,
            fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
            fontWeight: 300,
            color: INK_TEXT,
            marginBottom: "0.75rem",
          }}
        >
          {t("faqTitle")}
        </h2>
        <div
          style={{
            maxWidth: "42.5rem",
            margin: "2rem auto 0",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            textAlign: "left",
          }}
        >
          {faqs.map((item) => (
            <div
              key={item.q}
              style={{
                background: C.white,
                borderRadius: "0.875rem",
                padding: isMobile ? "1.25rem" : "1.375rem 1.75rem",
                border: `1px solid ${HAIRLINE_BORDER}`,
              }}
            >
              <h4
                style={{
                  fontFamily: F.body,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: INK_TEXT,
                  marginBottom: "0.5rem",
                }}
              >
                {item.q}
              </h4>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_TEXT,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "2rem clamp(1.25rem, 5vw, 3.75rem)",
          borderTop: `1px solid ${HAIRLINE_BORDER}`,
          background: C.charcoal,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.75rem", color: C.muted }}>
          &copy; {new Date().getFullYear()} {t("copyright")}
        </p>
      </footer>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
