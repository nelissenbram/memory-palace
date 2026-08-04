"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { PLANS, PLAN_ORDER, type PlanId, type BillingInterval } from "@/lib/constants/plans";
import { detectCurrency, convertPrice, formatPrice, type SupportedCurrency } from "@/lib/currency";
import { isAndroid, isIOS } from "@/lib/native/platform";
import { initIAP, getIAPProductId, getProduct, purchase, restorePurchases, waitForProducts, manageSubscriptions, IAP_ENABLED } from "@/lib/native/iap";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, CREAM, TRAY, SAGE, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";
// EMBER_GLYPH (#9A4F2A) = rgb(154,79,42). The subscription surface tints this
// at-rest terracotta for its "current plan" / soft-accent chrome, so route
// those rgba() literals through named locals rather than re-typing the channel.
const EMBER_GLYPH_RGB = "154,79,42";
const EMBER_GLYPH_TINT = `rgba(${EMBER_GLYPH_RGB},0.07)`;   // soft fill (current-plan wash, near-limit prompt)
const EMBER_GLYPH_TINT_12 = `rgba(${EMBER_GLYPH_RGB},0.12)`; // chip fill
const EMBER_GLYPH_EDGE = `rgba(${EMBER_GLYPH_RGB},0.35)`;    // current-plan border
// Shared warm-ink card elevation (SHADOW[1] + top highlight) — the recurring
// two-part card boxShadow, named once so the strings never drift.
const CARD_SHADOW = `${SHADOW[1]}, ${TOP_HIGHLIGHT}`;
import Toast, { type ToastData } from "@/components/ui/Toast";
import CancelFlow from "@/components/ui/CancelFlow";
import ReferralSection from "@/components/ui/ReferralSection";
import { SettingsPageHeader, SectionOverline } from "../_SettingsChrome";

const F = T.font;

/* Shared ember CTA gradient (canon interactive). */
const EMBER_GRADIENT = `linear-gradient(135deg, ${EMBER}, ${EMBER_GLYPH})`;
const EMBER_DISABLED_BG = "#EEE9DF";

/* Idle ember CTA base — reused for every primary button so the gradient +
 * disabled ladder never drifts. A className drives the hover/active affordance. */
function emberCta(disabled: boolean): CSSProperties {
  return {
    minHeight: "2.75rem",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.75rem",
    border: "none",
    background: disabled ? EMBER_DISABLED_BG : EMBER_GRADIENT,
    fontFamily: F.body,
    fontSize: "0.875rem",
    fontWeight: 600,
    color: disabled ? MUTED : CREAM,
    cursor: disabled ? "wait" : "pointer",
    transition: "all .15s",
  };
}

interface SubscriptionData {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

interface UsageData {
  storageMb: number;
}

export default function SubscriptionPage() {
  const { t, locale } = useTranslation("subscription");
  const { t: tp } = useTranslation("plans");
  const { t: tPricing } = useTranslation("pricing");
  const isApple = isIOS();
  const nativeApp = isAndroid() || isApple;
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  const [iapReady, setIapReady] = useState(false);
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [effectiveStorageLimitMb, setEffectiveStorageLimitMb] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  // Initialize lazily so the first paint already shows the detected currency —
  // avoids a visible EUR→local price flip on mount.
  const [currency, setCurrency] = useState<SupportedCurrency>(() => detectCurrency());
  const [loadError, setLoadError] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // i18n fallback helper — new keys work before the locale files land.
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  // Same, for the shared pricing namespace.
  const tpf = (key: string, fallback: string) => {
    const v = tPricing(key);
    return v === key ? fallback : v;
  };

  const load = useCallback(async () => {
      try {
        setLoadError(false);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // No authenticated user (expired session / hydration race). Send to
          // login rather than stranding the user on the loading spinner.
          window.location.href = "/login";
          return;
        }

        // Fetch the subscription record. Storage usage is derived server-side
        // from /api/storage/limit below (SQL aggregate) — we deliberately do NOT
        // pull every memory row's file_size to the client just to sum one column.
        const subRes = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, stripe_customer_id")
          .eq("user_id", user.id)
          .single();

        let subData = subRes.data as SubscriptionData | null;

        // If DB says "free" but has a Stripe customer, sync with Stripe to detect missed webhooks.
        // Never run the Stripe sync on iOS (entitlement there comes from IAP, not Stripe).
        if (!isApple && subData?.stripe_customer_id && subData.plan === "free") {
          try {
            const syncRes = await fetch("/api/stripe/sync", { method: "POST" });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.synced && syncData.plan !== "free") {
                // Re-fetch the updated subscription record
                const { data: refreshed } = await supabase
                  .from("subscriptions")
                  .select("plan, status, current_period_end, stripe_customer_id")
                  .eq("user_id", user.id)
                  .single();
                if (refreshed) subData = refreshed as SubscriptionData;
              }
            }
          } catch {
            // non-critical — user still sees manage billing button as fallback
          }
        }

        // iOS is free-tier only (Apple Guideline 3.1.1): never surface a plan
        // purchased outside the app. This page reads the subscriptions table
        // directly (bypassing the server-side getUserPlan coercion), so force
        // the displayed plan to free here too — no paid status, billing date,
        // manage/cancel or restore UI can render.
        if (isApple) {
          setSub({ plan: "free", status: "active", current_period_end: null, stripe_customer_id: null });
        } else if (subData) {
          setSub(subData);
        } else {
          setSub({ plan: "free", status: "active", current_period_end: null, stripe_customer_id: null });
        }

        // Fetch effective storage limit AND used storage from one endpoint. The
        // route computes storageMb via a SQL aggregate (exact even past the
        // PostgREST row cap), so we no longer transfer every memory row to the
        // browser just to sum file_size. limitMb applies grandfathering for
        // legacy free users.
        try {
          const storageLimitRes = await fetch("/api/storage/limit");
          if (storageLimitRes.ok) {
            const slData = await storageLimitRes.json();
            setEffectiveStorageLimitMb(slData.limitMb ?? null);
            setUsage({ storageMb: slData.storageMb ?? 0 });
          } else {
            setUsage({ storageMb: 0 });
          }
        } catch {
          // non-critical — still show the usage card (at 0) rather than hiding it
          setUsage({ storageMb: 0 });
        }
        // Referral info is fetched by the shared <ReferralSection /> itself.
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
  }, []);

  // Shared post-purchase reconciliation for BOTH Stripe (webhook) and Apple IAP
  // (StoreKit → entitlement). Both settle asynchronously server-side, so poll a
  // few times with backoff instead of a single guessed delay.
  const reconcilePurchase = useCallback(async () => {
    const delays = [1500, 2500, 4000];
    for (const d of delays) {
      await new Promise((r) => setTimeout(r, d));
      await load();
    }
  }, [load]);

  // Check for success param — refetch data to pick up webhook-updated plan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      showToast(t("activated"), "success");
      window.history.replaceState({}, "", "/settings/subscription");
      reconcilePurchase();
    }
  }, [showToast, reconcilePurchase]);

  // Currency is auto-detected lazily in useState initializer (avoids price flip).

  useEffect(() => {
    load();
  }, [load]);

  // Initialize Apple IAP on iOS. Only flip iapReady once a product with a real
  // price has actually loaded from the App Store — store.initialize() succeeding
  // is NOT enough (products load async afterwards). Gating the Upgrade button on
  // this prevents showing a button that errors on tap when IAP isn't truly
  // available (Apple Guideline 2.1). No error toast on load: if products never
  // load, we simply keep the button hidden and the app stays cleanly free.
  useEffect(() => {
    if (isApple && IAP_ENABLED) {
      initIAP().then(async (ok) => {
        if (!ok) {
          setIapReady(false);
          return;
        }
        setIapReady(await waitForProducts());
      });
    }
  }, [isApple]);

  /** Handle IAP purchase on iOS */
  const handleIAPUpgrade = async (planId: PlanId) => {
    if (upgradeLoading || planId === "free") return;
    setUpgradeLoading(planId);
    try {
      const productId = getIAPProductId(
        planId as "keeper" | "guardian",
        interval
      );
      const success = await purchase(productId);
      if (success) {
        showToast(t("activated"), "success");
        reconcilePurchase();
      } else {
        showToast(t("checkoutError"), "error");
      }
    } catch {
      showToast(t("paymentConnectError"), "error");
    }
    setUpgradeLoading(null);
  };

  /** Restore previous IAP purchases */
  const handleRestore = async () => {
    setPortalLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        showToast(tf("restoreSuccess", "Purchases restored"), "success");
        reconcilePurchase();
      } else {
        showToast(tf("restoreFailed", "No purchases to restore"), "error");
      }
    } catch {
      showToast(tf("restoreFailed", "Restore failed"), "error");
    }
    setPortalLoading(false);
  };

  /** Open the iOS-managed subscription sheet; surface a hint if it can't open. */
  const handleManageSubscriptions = async () => {
    try {
      await manageSubscriptions();
    } catch {
      showToast(t("manageInSettings"), "error");
    }
  };

  const handleManageBilling = async () => {
    // iOS subscriptions are managed by Apple, never the Stripe portal (Guideline 3.1.1).
    if (isApple) {
      showToast(t("manageInSettings"), "success");
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        // Web only — handleManageBilling already returns early on iOS (Apple-managed).
        window.location.href = data.url;
      } else if (res.status === 400) {
        // No billing account — redirect to checkout instead
        showToast(t("noBillingAccount"), "error");
      } else {
        showToast(data.error || t("billingError"), "error");
      }
    } catch {
      showToast(t("billingConnectError"), "error");
    }
    setPortalLoading(false);
  };

  const handleUpgrade = async (planId: PlanId) => {
    // On iOS, purchases must go through Apple IAP only — never fall back to
    // web checkout / external browser (Apple Guideline 3.1.1).
    if (isApple) {
      if (iapReady) return handleIAPUpgrade(planId);
      showToast(t("iapUnavailable"), "error");
      return;
    }
    if (upgradeLoading) return;
    setUpgradeLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
        redirect: "manual",
      });
      if (res.type === "opaqueredirect" || res.status === 0 || res.status === 307 || res.status === 308) {
        window.location.href = "/login";
        return;
      }
      let data;
      try { data = await res.json(); } catch {
        showToast(`${t("checkoutError")} (${res.status})`, "error");
        setUpgradeLoading(null);
        return;
      }
      if (data.url) {
        // Web only — handleUpgrade already returns early on iOS (IAP path).
        window.location.href = data.url;
      } else {
        console.error("[Subscription] Checkout error:", data);
        showToast(data.error || t("checkoutError"), "error");
        setUpgradeLoading(null);
      }
    } catch (err) {
      console.error("[Subscription] Checkout exception:", err);
      showToast(t("paymentConnectError"), "error");
      setUpgradeLoading(null);
    }
  };

  if (loading) {
    const skeletonCard: CSSProperties = {
      background: CREAM,
      borderRadius: "1rem",
      border: `0.0625rem solid ${HAIRLINE}`,
      padding: "1.75rem 2rem",
      boxShadow: CARD_SHADOW,
      marginBottom: "1.5rem",
    };
    const bar = (w: string, h: string): CSSProperties => ({
      width: w,
      height: h,
      borderRadius: "0.375rem",
      background: `linear-gradient(90deg, ${TRAY} 25%, ${HAIRLINE} 50%, ${TRAY} 75%)`,
      backgroundSize: "200% 100%",
      animation: "mpSubShimmer 1.4s ease-in-out infinite",
    });
    return (
      <div className="mp-sub-page" aria-busy="true" aria-label={t("loading")}>
        <div style={skeletonCard}>
          <div style={{ ...bar("40%", "1.5rem"), marginBottom: "0.75rem" }} />
          <div style={{ ...bar("60%", "0.875rem"), marginBottom: "1.25rem" }} />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={bar("8rem", "2.75rem")} />
            <div style={bar("8rem", "2.75rem")} />
          </div>
        </div>
        <div style={skeletonCard}>
          <div style={{ ...bar("30%", "1.25rem"), marginBottom: "1.25rem" }} />
          <div style={{ ...bar("100%", "0.375rem") }} />
        </div>
        <style>{`@keyframes mpSubShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @media (prefers-reduced-motion: reduce) { .mp-sub-page [style*="mpSubShimmer"] { animation: none !important; } }`}</style>
      </div>
    );
  }

  const translateFeatureKey = (featureKey: string) => tp(featureKey);

  const currentPlan = sub ? PLANS[sub.plan] : PLANS.free;
  const limits = effectiveStorageLimitMb != null
    ? { ...currentPlan.limits, storageMb: effectiveStorageLimitMb }
    : currentPlan.limits;
  const isFree = sub?.plan === "free";
  const isPaid = sub?.plan === "keeper" || sub?.plan === "guardian";
  const hasStripeAccount = !!sub?.stripe_customer_id;

  const statusLabel: Record<string, { text: string; color: string }> = {
    active: { text: t("statusActive"), color: SAGE },
    trialing: { text: t("statusTrialing"), color: EMBER },
    past_due: { text: t("statusPastDue"), color: T.color.error },
    canceled: { text: t("statusCanceled"), color: MUTED },
  };

  const currentStatus = statusLabel[sub?.status || "active"] || statusLabel.active;

  // The 3-up plan-comparison grid needs real width to breathe. Collapse it to a
  // single column not only on phones (isMobile) but also in any portrait
  // viewport — this covers the iPad split-view / narrow-landscape edge where
  // isMobile is false yet three columns still crush (canon: prefer portrait
  // over a raw width breakpoint, no @media).
  const stackComparison = isMobile || isPortrait;

  return (
    <div className="mp-sub-page">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {showCancelFlow && (
        <CancelFlow
          onClose={() => setShowCancelFlow(false)}
          onProceedToPortal={() => {
            setShowCancelFlow(false);
            handleManageBilling();
          }}
          planName={tp(currentPlan.nameKey)}
        />
      )}

      {/* Header — desktop only */}
      <SettingsPageHeader
        hidden={isMobile}
        icon="subscription"
        title={t("title")}
        subtitle={t("description")}
      />

      {/* Persistent inline notice when core data failed to load (toasts are
          transient — this stays until a retry succeeds). */}
      {loadError && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          background: CREAM,
          border: `0.0625rem solid ${HAIRLINE}`,
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
        }}>
          <span style={{ fontFamily: F.body, fontSize: "0.875rem", color: MUTED }}>
            {tf("loadError", "We couldn't load your subscription. Please try again.")}
          </span>
          <button
            onClick={() => load()}
            className="mp-sub-secondary"
            style={{
              minHeight: "2.75rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              background: "transparent",
              fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 600,
              color: EMBER,
              cursor: "pointer",
            }}
          >
            {tf("retry", "Retry")}
          </button>
        </div>
      )}

      {/* Section overline — Your plan */}
      <SectionOverline label={tf("sectionYourPlan", "Your plan")} />

      {/* Current Plan Card */}
      <div style={{
        background: CREAM,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        padding: "1.75rem 2rem",
        boxShadow: CARD_SHADOW,
        marginBottom: "1.5rem",
      }}>
        <div style={{
          display: "flex",
          // In narrow/portrait the plan title + price wrap instead of squeezing.
          alignItems: isPortrait ? "flex-start" : "center",
          flexDirection: isPortrait ? "column" : "row",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
              <h3 style={{
                fontFamily: F.display, fontSize: "1.5rem", fontWeight: 500,
                color: INK, margin: 0,
              }}>
                {t("plan", { name: tp(currentPlan.nameKey) })}
              </h3>
              <span style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "0.5rem",
                background: `${currentStatus.color}18`,
                color: currentStatus.color,
                fontFamily: F.body,
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}>
                {currentStatus.text}
              </span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: "0.875rem", color: MUTED, margin: 0 }}>
              {sub?.plan === "free" ? t("taglineFree") : sub?.plan === "keeper" ? t("taglineKeeper") : t("taglineGuardian")}
            </p>
          </div>
          <div style={{ textAlign: isPortrait ? "left" : "right" }}>
            {currentPlan.price > 0 ? (
              <>
                <div style={{ fontFamily: F.display, fontSize: "1.75rem", fontWeight: 500, color: INK }}>
                  {formatPrice(convertPrice(interval === "monthly" ? currentPlan.monthlyPrice : currentPlan.price, currency), currency)}
                </div>
                <div style={{ fontSize: "0.8125rem", color: MUTED }}>{t("perMonth")}</div>
              </>
            ) : (
              <div style={{ fontFamily: F.display, fontSize: "1.75rem", fontWeight: 500, color: INK }}>
                {t("free")}
              </div>
            )}
          </div>
        </div>

        {/* Period end */}
        {sub?.current_period_end && (
          <p style={{ fontFamily: F.body, fontSize: "0.8125rem", color: MUTED, marginBottom: "1rem" }}>
            {sub.status === "trialing" ? t("trialEnds") : t("nextBilling")}:{" "}
            <strong style={{ color: INK }}>
              {new Date(sub.current_period_end).toLocaleDateString(localeDateCodes[locale as Locale], {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
        )}

        {/* Actions — hidden on Android (Google Play: no external payment links) */}
        {/* On iOS: show IAP buttons. On web: show Stripe buttons. */}
        {!isAndroid() && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* iOS monthly/annual toggle. The web plan-comparison toggle never
                renders in native apps, so without this the IAP flow is locked to
                the default annual product. Only shown when a purchase is actually
                reachable (StoreKit ready + a paid CTA will render). */}
            {isApple && iapReady && (isFree || sub?.plan === "keeper") && (
              <div
                role="radiogroup"
                aria-label={tpf("billingInterval", "Billing interval")}
                style={{
                  flexBasis: "100%",
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  borderRadius: "0.75rem",
                  background: TRAY,
                  padding: "0.25rem",
                }}
              >
                {(["monthly", "annual"] as BillingInterval[]).map((iv) => (
                  <button
                    key={iv}
                    role="radio"
                    aria-checked={interval === iv}
                    onClick={() => setInterval(iv)}
                    style={{
                      minHeight: "2.75rem",
                      padding: "0.5rem 1.25rem",
                      borderRadius: "0.625rem",
                      border: "none",
                      background: interval === iv ? EMBER_GRADIENT : "transparent",
                      color: interval === iv ? CREAM : MUTED,
                      fontFamily: F.body,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {iv === "monthly" ? tpf("monthly", "Monthly") : tpf("annual", "Annual")}
                  </button>
                ))}
              </div>
            )}
            {isPaid && !isApple && (
              <>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="mp-sub-secondary"
                  style={{
                    minHeight: "2.75rem",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: `0.0625rem solid ${HAIRLINE}`,
                    background: "transparent",
                    fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                    color: MUTED,
                    cursor: portalLoading ? "wait" : "pointer",
                    transition: "all .15s",
                  }}
                >
                  {portalLoading ? t("opening") : t("manageBilling")}
                </button>
                <button
                  onClick={() => setShowCancelFlow(true)}
                  className="mp-sub-secondary"
                  style={{
                    minHeight: "2.75rem",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: `0.0625rem solid ${HAIRLINE}`,
                    background: "none",
                    fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 500,
                    color: MUTED,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {t("cancelPlan")}
                </button>
              </>
            )}
            {isPaid && isApple && (
              <>
                <p style={{ fontFamily: F.body, fontSize: "0.875rem", color: MUTED, margin: 0 }}>
                  {t("manageInSettings")}
                </p>
                <button
                  onClick={handleManageSubscriptions}
                  className="mp-sub-primary"
                  style={emberCta(false)}
                >
                  {t("manageOrCancel")}
                </button>
                <button
                  onClick={handleRestore}
                  disabled={portalLoading}
                  className="mp-sub-secondary"
                  style={{
                    minHeight: "2.75rem",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: `0.0625rem solid ${HAIRLINE}`,
                    background: "transparent",
                    fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 500,
                    color: MUTED,
                    cursor: portalLoading ? "wait" : "pointer",
                    transition: "all .15s",
                  }}
                >
                  {portalLoading ? t("opening") : tf("restorePurchases", "Restore Purchases")}
                </button>
              </>
            )}
            {isFree && (
              <>
                {/* Paid CTA hidden on iOS until StoreKit/IAP is active (Apple 3.1.1);
                    auto-returns when iapReady becomes true. */}
                {(!isApple || iapReady) && (
                <button
                  onClick={() => handleUpgrade("keeper")}
                  disabled={!!upgradeLoading}
                  className="mp-sub-primary"
                  style={emberCta(!!upgradeLoading)}
                >
                  {upgradeLoading === "keeper" ? t("upgrading") : t("upgradePlan")}
                  {isApple && iapReady && (() => {
                    const p = getProduct(getIAPProductId("keeper", interval));
                    return p ? ` (${p.price})` : "";
                  })()}
                </button>
                )}
                {!isApple && hasStripeAccount && (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="mp-sub-secondary"
                    style={{
                      minHeight: "2.75rem",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${HAIRLINE}`,
                      background: "transparent",
                      fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 500,
                      color: MUTED,
                      cursor: portalLoading ? "wait" : "pointer",
                      transition: "all .15s",
                    }}
                  >
                    {portalLoading ? t("opening") : t("manageBilling")}
                  </button>
                )}
                {isApple && iapReady && (
                  <button
                    onClick={handleRestore}
                    disabled={portalLoading}
                    className="mp-sub-secondary"
                    style={{
                      minHeight: "2.75rem",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.75rem",
                      border: `0.0625rem solid ${HAIRLINE}`,
                      background: "transparent",
                      fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 500,
                      color: MUTED,
                      cursor: portalLoading ? "wait" : "pointer",
                      transition: "all .15s",
                    }}
                  >
                    {portalLoading ? t("opening") : tf("restorePurchases", "Restore Purchases")}
                  </button>
                )}
              </>
            )}
            {/* Paid CTA hidden on iOS until StoreKit/IAP is active (Apple 3.1.1);
                auto-returns when iapReady becomes true. */}
            {sub?.plan === "keeper" && (!isApple || iapReady) && (
              <button
                onClick={() => handleUpgrade("guardian")}
                disabled={!!upgradeLoading}
                className="mp-sub-primary"
                style={emberCta(!!upgradeLoading)}
              >
                {upgradeLoading === "guardian" ? t("upgrading") : t("upgradeToGuardian")}
                {isApple && iapReady && (() => {
                  const p = getProduct(getIAPProductId("guardian", interval));
                  return p ? ` (${p.price})` : "";
                })()}
              </button>
            )}
          </div>
        )}

        {/* On iOS the app is free-tier only — state it plainly so the free
            state reads as intentional (Apple Guideline 3.1.1). */}
        {isApple && (
          <p style={{ fontFamily: F.body, fontSize: isMobile ? "0.875rem" : "0.8125rem", color: MUTED, lineHeight: 1.6, margin: "0.5rem 0 0" }}>
            {tf("iosFreeNote", "The Memory Palace is free to use on iPhone and iPad, with all core features included.")}
          </p>
        )}

        {/* Subscription disclosures. On iOS we no longer sell subscriptions, so
            the auto-renew notice (an IAP-only requirement) is omitted; the
            terms/privacy links stay. */}
        {(isFree || sub?.plan === "keeper") && (
          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: `0.0625rem solid ${HAIRLINE}` }}>
            {isApple && IAP_ENABLED && (
              <p style={{ fontFamily: F.body, fontSize: isMobile ? "0.8125rem" : "0.75rem", color: MUTED, lineHeight: 1.6, margin: "0 0 0.5rem" }}>
                {t("autoRenewNotice")}
              </p>
            )}
            <p style={{ fontFamily: F.body, fontSize: isMobile ? "0.8125rem" : "0.75rem", color: MUTED, margin: 0 }}>
              <a href="/terms" style={{ color: EMBER, textDecoration: "none" }}>{t("disclosureTerms")}</a>
              {"  ·  "}
              <a href="/privacy" style={{ color: EMBER, textDecoration: "none" }}>{t("disclosurePrivacy")}</a>
            </p>
          </div>
        )}
      </div>

      {/* Section overline — Usage */}
      <SectionOverline label={tf("sectionUsage", "Usage")} />

      {/* Usage Stats */}
      <div style={{
        background: CREAM,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        padding: "1.75rem 2rem",
        boxShadow: CARD_SHADOW,
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
          color: INK, margin: "0 0 1.25rem",
        }}>
          {t("yourUsage")}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Storage usage bar */}
          {usage && (
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: "0.375rem",
              }}>
                <span style={{ fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500, color: INK }}>
                  {t("storageUsed")}
                </span>
                <span style={{
                  fontFamily: F.body, fontSize: "0.8125rem",
                  color: !limits.storageMb || limits.storageMb === -1 ? MUTED : (usage.storageMb / limits.storageMb > 0.8 ? EMBER : MUTED),
                  fontWeight: !limits.storageMb || limits.storageMb === -1 ? 500 : (usage.storageMb / limits.storageMb > 0.8 ? 600 : 500),
                }}>
                  {usage.storageMb >= 1024
                    ? `${(usage.storageMb / 1024).toFixed(1)} ${t("storageGb")}`
                    : `${usage.storageMb} ${t("storageMb")}`}
                  {" "}{t("storageOf")}{" "}
                  {limits.storageMb === -1
                    ? "\u221E"
                    : limits.storageMb >= 1024
                      ? `${(limits.storageMb / 1024).toFixed(0)} ${t("storageGb")}`
                      : `${limits.storageMb} ${t("storageMb")}`}
                </span>
              </div>
              {(() => {
                const unlimited = limits.storageMb === -1;
                const currentText = usage.storageMb >= 1024 ? `${(usage.storageMb / 1024).toFixed(1)} ${t("storageGb")}` : `${usage.storageMb} ${t("storageMb")}`;
                const maxText = unlimited ? "\u221E" : limits.storageMb >= 1024 ? `${(limits.storageMb / 1024).toFixed(0)} ${t("storageGb")}` : `${limits.storageMb} ${t("storageMb")}`;
                return (
              <div
                role="progressbar"
                // When unlimited, there is no measurable maximum \u2014 omit
                // valuenow/valuemax and describe it via aria-valuetext instead.
                aria-valuenow={unlimited ? undefined : usage.storageMb}
                aria-valuemin={unlimited ? undefined : 0}
                aria-valuemax={unlimited ? undefined : limits.storageMb}
                aria-valuetext={unlimited ? `${currentText} ${t("storageOf")} ${maxText}` : undefined}
                aria-label={t("storageProgress", { current: currentText, max: maxText })}
                style={{
                  height: "0.375rem",
                  borderRadius: "0.1875rem",
                  background: TRAY,
                  overflow: "hidden",
                }}
              >
                <div className="mp-sub-progress" style={{
                  height: "100%",
                  borderRadius: "0.1875rem",
                  width: unlimited ? "0%" : `${Math.min(100, limits.storageMb > 0 ? (usage.storageMb / limits.storageMb) * 100 : 0)}%`,
                  background: !unlimited && usage.storageMb / limits.storageMb > 0.8
                    ? `linear-gradient(90deg, ${EMBER}, ${T.color.error})`
                    : `linear-gradient(90deg, ${SAGE}, rgba(86,104,60,0.8))`,
                  transition: "width 0.5s ease",
                }} />
              </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Near-limit upgrade prompt — hidden on Android, and on iOS until
            StoreKit/IAP is active (Apple 3.1.1). Auto-returns when iapReady. */}
        {!isAndroid() && (!isApple || iapReady) && isFree && usage && limits.storageMb > 0 && (usage.storageMb / limits.storageMb) >= 0.8 && (
          <div style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            background: EMBER_GLYPH_TINT,
            border: `0.0625rem solid ${EMBER_GLYPH_TINT_12}`,
          }}>
            <p style={{
              fontFamily: F.body, fontSize: "0.875rem", color: INK,
              margin: 0, lineHeight: 1.5,
            }}>
              {t("nearLimitWarning")}{" "}
              <button onClick={() => handleUpgrade("keeper")} disabled={!!upgradeLoading} style={{
                background: "none", border: "none", padding: 0,
                color: upgradeLoading ? MUTED : EMBER, fontWeight: 600, textDecoration: "underline",
                fontFamily: F.body, fontSize: "0.875rem", cursor: upgradeLoading ? "wait" : "pointer",
              }}>
                {upgradeLoading === "keeper" ? t("upgrading") : t("upgradeToKeeper")}
              </button>{" "}
              {t("forMoreSpace")}
            </p>
          </div>
        )}
      </div>

      {/* Plan Comparison — hidden in native apps. No in-app purchase path is
          available this round (iOS IAP disabled via IAP_ENABLED; Android has no
          in-app billing), so rendering selectable-looking plan tiers with no
          tap action is dead UI that Apple flags under Guideline 2.1(a). When
          iOS IAP is re-enabled, revisit to show plans with working IAP buttons. */}
      {!nativeApp && (
      <>
      <SectionOverline label={tf("sectionAllPlans", "All plans")} />
      <div style={{
        background: CREAM,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        padding: "1.75rem 2rem",
        boxShadow: CARD_SHADOW,
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
          color: INK, margin: "0 0 0.375rem",
        }}>
          {t("allPlans")}
        </h3>
        <p style={{
          fontFamily: F.body, fontSize: "0.875rem", color: MUTED,
          margin: "0 0 1.25rem", lineHeight: 1.5,
        }}>
          {t("comparePlans")}
        </p>

        {/* Billing interval toggle + Currency selector */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}>
          <div
            role="radiogroup"
            aria-label={tpf("billingInterval", "Billing interval")}
            style={{
              display: "inline-flex",
              borderRadius: "0.75rem",
              background: TRAY,
              padding: "0.25rem",
              gap: 0,
            }}
          >
            <button
              role="radio"
              aria-checked={interval === "monthly"}
              onClick={() => setInterval("monthly")}
              style={{
                minHeight: "2.75rem",
                padding: "0.625rem 1.5rem",
                borderRadius: "0.625rem",
                border: "none",
                background: interval === "monthly"
                  ? EMBER_GRADIENT
                  : "transparent",
                color: interval === "monthly" ? CREAM : MUTED,
                fontFamily: F.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tpf("monthly", "Monthly")}
            </button>
            <button
              role="radio"
              aria-checked={interval === "annual"}
              onClick={() => setInterval("annual")}
              style={{
                minHeight: "2.75rem",
                padding: "0.625rem 1.5rem",
                borderRadius: "0.625rem",
                border: "none",
                background: interval === "annual"
                  ? EMBER_GRADIENT
                  : "transparent",
                color: interval === "annual" ? CREAM : MUTED,
                fontFamily: F.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {tpf("annual", "Annual")}
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  padding: "0.125rem 0.5rem",
                  borderRadius: "0.5rem",
                  background: interval === "annual"
                    ? "rgba(255,255,255,0.25)"
                    : EMBER_GLYPH_TINT_12,
                  color: interval === "annual" ? CREAM : EMBER,
                  whiteSpace: "nowrap",
                }}
              >
                {tpf("saveUpToPercent", "Save up to 23%")}
              </span>
            </button>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
            aria-label={tPricing("currency")}
            style={{
              background: "none",
              border: `0.0625rem solid ${HAIRLINE}`,
              borderRadius: "0.5rem",
              minHeight: "2.75rem",
              // 1rem prevents iOS Safari zoom-on-focus (canon input rule).
              padding: "0.5rem 1.75rem 0.5rem 0.625rem",
              fontSize: "1rem",
              fontFamily: F.body,
              fontWeight: 600,
              color: MUTED,
              cursor: "pointer",
              letterSpacing: "0.03em",
              transition: "border-color 0.2s, color 0.2s",
              appearance: "none",
              WebkitAppearance: "none" as const,
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {(["free", "keeper", "guardian"] as PlanId[]).map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = planId === sub?.plan;
            const planRank: Record<string, number> = { free: 0, keeper: 1, guardian: 2 };
            const isUpgrade = !isCurrent && planRank[planId] > planRank[sub?.plan || "free"];
            return (
              <div
                key={planId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderRadius: "0.75rem",
                  background: isCurrent ? EMBER_GLYPH_TINT : CREAM,
                  border: isCurrent ? `0.09375rem solid ${EMBER_GLYPH_EDGE}` : `0.0625rem solid ${HAIRLINE}`,
                }}
              >
                <div>
                  <div style={{
                    fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 600,
                    color: INK, display: "flex", alignItems: "center", gap: "0.5rem",
                  }}>
                    {tp(plan.nameKey)}
                    {isCurrent && (
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: 600,
                        padding: "2px 0.5rem", borderRadius: "0.375rem",
                        background: EMBER_GLYPH_TINT_12, color: EMBER,
                      }}>
                        {t("current")}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: MUTED, marginTop: "0.25rem" }}>
                    {plan.featureKeys.slice(0, 3).map(translateFeatureKey).join(" \u2022 ")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, marginLeft: "1rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: F.display, fontSize: "1.125rem", fontWeight: 500, color: INK }}>
                      {plan.price === 0 ? t("free") : `${formatPrice(convertPrice(interval === "monthly" ? plan.monthlyPrice : plan.price, currency), currency)}/${t("perMonthShort")}`}
                    </div>
                  </div>
                  {!nativeApp && isUpgrade && (
                    <button
                      onClick={() => handleUpgrade(planId)}
                      disabled={!!upgradeLoading}
                      className="mp-sub-primary"
                      style={{
                        ...emberCta(!!upgradeLoading),
                        // Compact-row variant: tighter tap area than the base CTA.
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        fontSize: "0.8125rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {upgradeLoading === planId ? t("upgrading") : t("upgradePlanShort")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!nativeApp && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => setShowFullComparison(prev => !prev)}
                style={{
                  background: "none", border: "none", padding: 0,
                  minHeight: "2.75rem",
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                  color: EMBER, cursor: "pointer",
                }}
              >
                {showFullComparison ? t("hideFullComparison") : t("viewFullComparison")} {showFullComparison ? "\u2191" : "\u2192"}
              </button>
            </div>

            {showFullComparison && (
              <div style={{
                marginTop: "1.25rem",
                display: "grid",
                /* Single column on phones AND any portrait viewport (iPad
                   split-view / narrow landscape); 3-up only when there is real
                   landscape width to spread across. */
                gridTemplateColumns: stackComparison ? "1fr" : "repeat(3, 1fr)",
                gap: stackComparison ? "1rem" : "1.25rem",
                alignItems: "start",
              }}>
                {PLAN_ORDER.map((planId) => {
                  const plan = PLANS[planId];
                  const isHighlighted = plan.highlighted;
                  const isCurrent = planId === sub?.plan;
                  const planRank: Record<string, number> = { free: 0, keeper: 1, guardian: 2 };
                  const isUpgrade = !isCurrent && planRank[planId] > planRank[sub?.plan || "free"];
                  const isFreeCard = planId === "free";

                  return (
                    <div
                      key={planId}
                      style={{
                        background: CREAM,
                        borderRadius: "1rem",
                        border: isHighlighted
                          ? `0.125rem solid ${EMBER}`
                          : isCurrent
                            ? `0.09375rem solid ${EMBER_GLYPH_EDGE}`
                            : `0.0625rem solid ${HAIRLINE}`,
                        padding: stackComparison ? "1.5rem 1.25rem" : "1.75rem 1.5rem",
                        position: "relative",
                        boxShadow: isHighlighted ? SHADOW[2] : CARD_SHADOW,
                        // Only lift the highlighted card when it sits in the 3-up
                        // row — a scaled card in a single stacked column overflows.
                        transform: isHighlighted && !stackComparison ? "scale(1.03)" : undefined,
                      }}
                    >
                      {/* Most Popular badge */}
                      {isHighlighted && (
                        <div style={{
                          position: "absolute",
                          top: "-0.8125rem",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: EMBER_GRADIENT,
                          color: CREAM,
                          fontFamily: F.body,
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          padding: "0.3125rem 0.875rem",
                          borderRadius: "1rem",
                          letterSpacing: "0.03em",
                          whiteSpace: "nowrap",
                        }}>
                          {t("mostPopular")}
                        </div>
                      )}

                      {/* Plan name */}
                      <h4 style={{
                        fontFamily: F.display,
                        fontSize: "1.25rem",
                        fontWeight: 500,
                        color: INK,
                        margin: 0,
                        marginTop: isHighlighted ? "0.375rem" : 0,
                        marginBottom: "0.1875rem",
                      }}>
                        {tp(plan.nameKey)}
                      </h4>
                      <p style={{
                        fontSize: "0.8125rem",
                        color: MUTED,
                        margin: "0 0 1rem",
                        lineHeight: 1.5,
                      }}>
                        {tp(plan.taglineKey)}
                      </p>

                      {/* Price */}
                      <div style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.25rem",
                        marginBottom: "1.25rem",
                      }}>
                        {isFreeCard ? (
                          <span style={{
                            fontFamily: F.display,
                            fontSize: "2rem",
                            fontWeight: 500,
                            color: INK,
                          }}>
                            {t("free")}
                          </span>
                        ) : (
                          <>
                            <span style={{
                              fontFamily: F.display,
                              fontSize: "2rem",
                              fontWeight: 500,
                              color: INK,
                            }}>
                              {formatPrice(convertPrice(interval === "monthly" ? plan.monthlyPrice : plan.price, currency), currency)}
                            </span>
                            <span style={{
                              fontSize: "0.8125rem",
                              color: MUTED,
                            }}>
                              /{t("perMonthShort")}
                            </span>
                          </>
                        )}
                      </div>

                      {/* CTA / Current badge */}
                      {isCurrent ? (
                        <div style={{
                          width: "100%",
                          padding: "0.6875rem 1rem",
                          borderRadius: "0.75rem",
                          border: `0.09375rem solid ${EMBER_GLYPH_EDGE}`,
                          background: EMBER_GLYPH_TINT,
                          textAlign: "center",
                          fontFamily: F.body,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: EMBER,
                          marginBottom: "1.25rem",
                        }}>
                          {t("currentPlanBadge")}
                        </div>
                      ) : isUpgrade ? (
                        <button
                          onClick={() => handleUpgrade(planId)}
                          disabled={!!upgradeLoading}
                          className="mp-sub-primary"
                          style={{
                            ...emberCta(!!upgradeLoading),
                            // Full-comparison card variant: full-width block CTA.
                            width: "100%",
                            padding: "0.6875rem 1rem",
                            marginBottom: "1.25rem",
                          }}
                        >
                          {upgradeLoading === planId ? t("upgrading") : t("upgradePlanShort")}
                        </button>
                      ) : (
                        <div style={{ marginBottom: "1.25rem" }} />
                      )}

                      {/* Features */}
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.625rem",
                      }}>
                        {plan.featureKeys.map((featureKey) => (
                          <div
                            key={featureKey}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              fontSize: "0.8125rem",
                              color: INK,
                              lineHeight: 1.4,
                            }}
                          >
                            <span style={{
                              width: "1.125rem",
                              height: "1.125rem",
                              borderRadius: "50%",
                              background: isHighlighted
                                ? EMBER_GLYPH_TINT_12
                                : "rgba(86,104,60,0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.625rem",
                              color: isHighlighted ? EMBER : SAGE,
                              flexShrink: 0,
                            }}>
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
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* Refer a Friend — shared card (also rendered on settings/sharing).
          Carries its own overline, data fetch and iOS 3.1.1 gate. */}
      <ReferralSection />

      {/* Canon hover / focus / reduced-motion states (style-only) */}
      <style>{`
        @media (hover: hover) {
          .mp-sub-secondary:hover { background: ${EMBER_GLYPH_TINT} !important; }
          .mp-sub-primary:not(:disabled):hover { filter: brightness(1.06); }
        }
        .mp-sub-secondary:active { background: ${EMBER_GLYPH_TINT_12} !important; }
        .mp-sub-primary:not(:disabled):active { filter: brightness(0.96); }
        .mp-sub-page a:focus-visible,
        .mp-sub-page button:focus-visible,
        .mp-sub-page select:focus-visible {
          outline: 0.1875rem solid #D4AF37;
          outline-offset: 0.125rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-sub-page *, .mp-sub-progress { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
