"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { PLANS, PLAN_ORDER, type PlanId, type BillingInterval } from "@/lib/constants/plans";
import { detectCurrency, convertPrice, formatPrice, type SupportedCurrency } from "@/lib/currency";
import { isAndroid, isIOS, openInExternalBrowser } from "@/lib/native/platform";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import Toast, { type ToastData } from "@/components/ui/Toast";
import CancelFlow from "@/components/ui/CancelFlow";

const F = T.font;
const C = T.color;

interface SubscriptionData {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

interface UsageData {
  wings: number;
  rooms: number;
  memories: number;
  storageMb: number;
}

export default function SubscriptionPage() {
  const { t, locale } = useTranslation("subscription");
  const { t: tp } = useTranslation("plans");
  const { t: tPricing } = useTranslation("pricing");
  const nativeApp = isAndroid();
  const isMobile = useIsMobile();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [currency, setCurrency] = useState<SupportedCurrency>("EUR");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralRewards, setReferralRewards] = useState<{ promo_code: string; created_at: string; redeemed: boolean }[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // Check for success param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      showToast(t("activated"), "success");
      // Clean URL
      window.history.replaceState({}, "", "/settings/subscription");
    }
  }, [showToast]);

  // Auto-detect currency from timezone/locale
  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Parallelize all queries — subscription, usage counts, and storage
        const [subRes, wingsRes, roomsRes, memoriesRes, storageRes] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("plan, status, current_period_end, stripe_customer_id")
            .eq("user_id", user.id)
            .single(),
          supabase.from("wings").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("rooms").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("memories").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("memories").select("file_size").eq("user_id", user.id),
        ]);

        if (subRes.data) {
          setSub(subRes.data as SubscriptionData);
        } else {
          setSub({ plan: "free", status: "active", current_period_end: null, stripe_customer_id: null });
        }

        const storageData = storageRes.data;
        const totalStorageMb = storageData
          ? Math.round(storageData.reduce((sum: number, m: { file_size: number }) => sum + (m.file_size || 0), 0) / (1024 * 1024))
          : 0;

        setUsage({
          wings: wingsRes.count || 0,
          rooms: roomsRes.count || 0,
          memories: memoriesRes.count || 0,
          storageMb: totalStorageMb,
        });
        // Fetch referral info
        try {
          const refRes = await fetch("/api/referral");
          if (refRes.ok) {
            const refData = await refRes.json();
            setReferralCode(refData.referralCode);
            setReferralCount(refData.referralCount ?? 0);
            setReferralRewards(refData.rewards ?? []);
          }
        } catch {
          // non-critical
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        if (isIOS()) { await openInExternalBrowser(data.url); } else { window.location.href = data.url; }
      } else {
        showToast(data.error || t("billingError"), "error");
      }
    } catch {
      showToast(t("billingConnectError"), "error");
    }
    setPortalLoading(false);
  };

  const handleUpgrade = async (planId: PlanId) => {
    if (upgradeLoading) return;
    setUpgradeLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const data = await res.json();
      if (data.url) {
        if (isIOS()) { await openInExternalBrowser(data.url); } else { window.location.href = data.url; }
      } else {
        showToast(data.error || t("checkoutError"), "error");
        setUpgradeLoading(null);
      }
    } catch {
      showToast(t("paymentConnectError"), "error");
      setUpgradeLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: F.body, fontSize: "1rem", color: C.muted }}>
        {t("loading")}
      </div>
    );
  }

  const translateFeatureKey = (featureKey: string) => tp(featureKey);

  const currentPlan = sub ? PLANS[sub.plan] : PLANS.free;
  const limits = currentPlan.limits;
  const isFree = sub?.plan === "free";
  const isPaid = sub?.plan === "keeper" || sub?.plan === "guardian";

  const statusLabel: Record<string, { text: string; color: string }> = {
    active: { text: t("statusActive"), color: C.sage },
    trialing: { text: t("statusTrialing"), color: C.terracotta },
    past_due: { text: t("statusPastDue"), color: C.error },
    canceled: { text: t("statusCanceled"), color: C.muted },
  };

  const currentStatus = statusLabel[sub?.status || "active"] || statusLabel.active;

  return (
    <div>
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
      {!isMobile && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{
            fontFamily: F.display, fontSize: "1.75rem", fontWeight: 500,
            color: C.charcoal, margin: "0 0 0.5rem",
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: F.body, fontSize: "0.9375rem", color: C.muted,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("description")}
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      <div style={{
        background: C.white,
        borderRadius: "1rem",
        border: `1px solid ${C.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
              <h3 style={{
                fontFamily: F.display, fontSize: "1.5rem", fontWeight: 500,
                color: C.charcoal, margin: 0,
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
                letterSpacing: "0.3px",
              }}>
                {currentStatus.text}
              </span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: "0.875rem", color: C.muted, margin: 0 }}>
              {sub?.plan === "free" ? t("taglineFree") : sub?.plan === "keeper" ? t("taglineKeeper") : t("taglineGuardian")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            {currentPlan.price > 0 ? (
              <>
                <div style={{ fontFamily: F.display, fontSize: "1.75rem", fontWeight: 400, color: C.charcoal }}>
                  {formatPrice(convertPrice(interval === "monthly" ? currentPlan.monthlyPrice : currentPlan.price, currency), currency)}
                </div>
                <div style={{ fontSize: "0.8125rem", color: C.muted }}>{t("perMonth")}</div>
              </>
            ) : (
              <div style={{ fontFamily: F.display, fontSize: "1.75rem", fontWeight: 400, color: C.charcoal }}>
                {t("free")}
              </div>
            )}
          </div>
        </div>

        {/* Period end */}
        {sub?.current_period_end && (
          <p style={{ fontFamily: F.body, fontSize: "0.8125rem", color: C.muted, marginBottom: "1rem" }}>
            {sub.status === "trialing" ? t("trialEnds") : t("nextBilling")}:{" "}
            <strong style={{ color: C.charcoal }}>
              {new Date(sub.current_period_end).toLocaleDateString(localeDateCodes[locale as Locale], {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
        )}

        {/* Actions — hidden in native app (Google Play policy: no external payment links) */}
        {!nativeApp && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {isPaid && (
              <>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${C.cream}`,
                    background: C.white,
                    fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                    color: C.charcoal,
                    cursor: portalLoading ? "wait" : "pointer",
                    transition: "all .15s",
                  }}
                >
                  {portalLoading ? t("opening") : t("manageBilling")}
                </button>
                <button
                  onClick={() => setShowCancelFlow(true)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${C.cream}`,
                    background: "none",
                    fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 400,
                    color: C.muted,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {t("cancelPlan")}
                </button>
              </>
            )}
            {isFree && (
              <button
                onClick={() => handleUpgrade("keeper")}
                disabled={!!upgradeLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: upgradeLoading ? `${C.sandstone}60` : `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
                  color: upgradeLoading ? C.muted : C.white,
                  cursor: upgradeLoading ? "wait" : "pointer",
                  transition: "all .15s",
                }}
              >
                {upgradeLoading === "keeper" ? t("upgrading") : t("upgradePlan")}
              </button>
            )}
            {sub?.plan === "keeper" && (
              <button
                onClick={() => handleUpgrade("guardian")}
                disabled={!!upgradeLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: upgradeLoading ? `${C.sandstone}60` : `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
                  color: upgradeLoading ? C.muted : C.white,
                  cursor: upgradeLoading ? "wait" : "pointer",
                  transition: "all .15s",
                }}
              >
                {upgradeLoading === "guardian" ? t("upgrading") : t("upgradeToGuardian")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div style={{
        background: C.white,
        borderRadius: "1rem",
        border: `1px solid ${C.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
          color: C.charcoal, margin: "0 0 1.25rem",
        }}>
          {t("yourUsage")}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {([
            { label: t("wings"), current: usage?.wings || 0, limit: limits.wings },
            { label: t("rooms"), current: usage?.rooms || 0, limit: limits.rooms },
            { label: t("memories"), current: usage?.memories || 0, limit: limits.memories },
          ] as const).map((item) => {
            const isUnlimited = item.limit === -1;
            const percentage = isUnlimited ? 0 : Math.min((item.current / item.limit) * 100, 100);
            const isNearLimit = !isUnlimited && percentage >= 80;

            return (
              <div key={item.label}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: "0.375rem",
                }}>
                  <span style={{ fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500, color: C.charcoal }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontFamily: F.body, fontSize: "0.8125rem",
                    color: isNearLimit ? C.terracotta : C.muted,
                    fontWeight: isNearLimit ? 600 : 400,
                  }}>
                    {item.current} / {isUnlimited ? "\u221E" : item.limit}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={item.current}
                  aria-valuemin={0}
                  aria-valuemax={isUnlimited ? undefined : item.limit}
                  aria-label={t("usageProgress", { label: item.label, current: String(item.current), max: isUnlimited ? "\u221E" : String(item.limit) })}
                  style={{
                    height: "0.375rem",
                    borderRadius: 3,
                    background: `${C.sandstone}30`,
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    height: "100%",
                    borderRadius: 3,
                    width: isUnlimited ? "0%" : `${percentage}%`,
                    background: isNearLimit
                      ? `linear-gradient(90deg, ${C.terracotta}, ${C.error})`
                      : `linear-gradient(90deg, ${C.sage}, ${C.sage}cc)`,
                    transition: "width 0.5s ease",
                  }} />
                </div>
              </div>
            );
          })}

          {/* Storage usage bar */}
          {usage && (
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: "0.375rem",
              }}>
                <span style={{ fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500, color: C.charcoal }}>
                  {t("storageUsed")}
                </span>
                <span style={{
                  fontFamily: F.body, fontSize: "0.8125rem",
                  color: !limits.storageMb || limits.storageMb === -1 ? C.muted : (usage.storageMb / limits.storageMb > 0.8 ? C.terracotta : C.muted),
                  fontWeight: !limits.storageMb || limits.storageMb === -1 ? 400 : (usage.storageMb / limits.storageMb > 0.8 ? 600 : 400),
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
              <div
                role="progressbar"
                aria-valuenow={usage.storageMb}
                aria-valuemin={0}
                aria-valuemax={limits.storageMb === -1 ? undefined : limits.storageMb}
                aria-label={t("storageProgress", {
                  current: usage.storageMb >= 1024 ? `${(usage.storageMb / 1024).toFixed(1)} ${t("storageGb")}` : `${usage.storageMb} ${t("storageMb")}`,
                  max: limits.storageMb === -1 ? "\u221E" : limits.storageMb >= 1024 ? `${(limits.storageMb / 1024).toFixed(0)} ${t("storageGb")}` : `${limits.storageMb} ${t("storageMb")}`,
                })}
                style={{
                  height: "0.375rem",
                  borderRadius: 3,
                  background: `${C.sandstone}30`,
                  overflow: "hidden",
                }}
              >
                <div style={{
                  height: "100%",
                  borderRadius: 3,
                  width: limits.storageMb === -1 ? "0%" : `${Math.min(100, limits.storageMb > 0 ? (usage.storageMb / limits.storageMb) * 100 : 0)}%`,
                  background: limits.storageMb !== -1 && usage.storageMb / limits.storageMb > 0.8
                    ? `linear-gradient(90deg, ${C.terracotta}, ${C.error})`
                    : `linear-gradient(90deg, ${C.sage}, ${C.sage}cc)`,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Near-limit upgrade prompt — hidden in native app */}
        {!nativeApp && isFree && usage && (usage.wings >= 2 || usage.rooms >= 4 || usage.memories >= 80) && (
          <div style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            background: `${C.terracotta}08`,
            border: `1px solid ${C.terracotta}20`,
          }}>
            <p style={{
              fontFamily: F.body, fontSize: "0.875rem", color: C.charcoal,
              margin: 0, lineHeight: 1.5,
            }}>
              {t("nearLimitWarning")}{" "}
              <button onClick={() => handleUpgrade("keeper")} disabled={!!upgradeLoading} style={{
                background: "none", border: "none", padding: 0,
                color: upgradeLoading ? C.muted : C.terracotta, fontWeight: 600, textDecoration: "underline",
                fontFamily: F.body, fontSize: "0.875rem", cursor: upgradeLoading ? "wait" : "pointer",
              }}>
                {upgradeLoading === "keeper" ? t("upgrading") : t("upgradeToKeeper")}
              </button>{" "}
              {t("forMoreSpace")}
            </p>
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <div style={{
        background: C.white,
        borderRadius: "1rem",
        border: `1px solid ${C.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
          color: C.charcoal, margin: "0 0 0.375rem",
        }}>
          {t("allPlans")}
        </h3>
        <p style={{
          fontFamily: F.body, fontSize: "0.875rem", color: C.muted,
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
            style={{
              display: "inline-flex",
              borderRadius: 12,
              background: `${C.warmStone}`,
              padding: 4,
              gap: 0,
            }}
          >
            <button
              onClick={() => setInterval("monthly")}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: interval === "monthly"
                  ? `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`
                  : "transparent",
                color: interval === "monthly" ? C.white : C.walnut,
                fontFamily: F.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tPricing("monthly") !== "monthly" ? tPricing("monthly") : "Monthly"}
            </button>
            <button
              onClick={() => setInterval("annual")}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: interval === "annual"
                  ? `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`
                  : "transparent",
                color: interval === "annual" ? C.white : C.walnut,
                fontFamily: F.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {tPricing("annual") !== "annual" ? tPricing("annual") : "Annual"}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 8,
                  background: interval === "annual"
                    ? "rgba(255,255,255,0.25)"
                    : `${C.terracotta}18`,
                  color: interval === "annual" ? C.white : C.terracotta,
                  whiteSpace: "nowrap",
                }}
              >
                {tPricing("saveUpToPercent") !== "saveUpToPercent" ? tPricing("saveUpToPercent") : "Save up to 23%"}
              </span>
            </button>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
            aria-label={tPricing("currency")}
            style={{
              background: "none",
              border: `1px solid ${C.sandstone}60`,
              borderRadius: "0.5rem",
              padding: "0.5rem 1.75rem 0.5rem 0.625rem",
              fontSize: "0.8125rem",
              fontFamily: F.body,
              fontWeight: 600,
              color: C.walnut,
              cursor: "pointer",
              letterSpacing: "0.5px",
              transition: "border-color 0.2s, color 0.2s",
              appearance: "none",
              WebkitAppearance: "none" as const,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
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
                  background: isCurrent ? `${C.terracotta}08` : C.linen,
                  border: isCurrent ? `1.5px solid ${C.terracotta}30` : `1px solid ${C.cream}`,
                }}
              >
                <div>
                  <div style={{
                    fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 600,
                    color: C.charcoal, display: "flex", alignItems: "center", gap: "0.5rem",
                  }}>
                    {tp(plan.nameKey)}
                    {isCurrent && (
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: 600,
                        padding: "2px 0.5rem", borderRadius: "0.375rem",
                        background: `${C.terracotta}18`, color: C.terracotta,
                      }}>
                        {t("current")}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: "0.25rem" }}>
                    {plan.featureKeys.slice(0, 3).map(translateFeatureKey).join(" \u2022 ")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, marginLeft: "1rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: F.display, fontSize: "1.125rem", fontWeight: 500, color: C.charcoal }}>
                      {plan.price === 0 ? t("free") : `${formatPrice(convertPrice(interval === "monthly" ? plan.monthlyPrice : plan.price, currency), currency)}/${t("perMonthShort")}`}
                    </div>
                  </div>
                  {!nativeApp && isUpgrade && (
                    <button
                      onClick={() => handleUpgrade(planId)}
                      disabled={!!upgradeLoading}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: "none",
                        background: upgradeLoading ? `${C.sandstone}60` : `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                        fontFamily: F.body, fontSize: "0.8125rem", fontWeight: 600,
                        color: upgradeLoading ? C.muted : C.white,
                        cursor: upgradeLoading ? "wait" : "pointer",
                        transition: "all .15s",
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
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                  color: C.terracotta, cursor: "pointer",
                }}
              >
                {showFullComparison ? t("hideFullComparison") : t("viewFullComparison")} {showFullComparison ? "\u2191" : "\u2192"}
              </button>
            </div>

            {showFullComparison && (
              <div style={{
                marginTop: "1.25rem",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: isMobile ? "1rem" : "1.25rem",
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
                        background: C.white,
                        borderRadius: "1rem",
                        border: isHighlighted
                          ? `2px solid ${C.terracotta}`
                          : isCurrent
                            ? `1.5px solid ${C.terracotta}30`
                            : `1px solid ${C.sandstone}50`,
                        padding: isMobile ? "1.5rem 1.25rem" : "1.75rem 1.5rem",
                        position: "relative",
                        boxShadow: isHighlighted
                          ? "0 0.5rem 2rem rgba(193,127,89,0.15)"
                          : "0 0.125rem 0.75rem rgba(0,0,0,0.04)",
                        transform: isHighlighted && !isMobile ? "scale(1.03)" : undefined,
                      }}
                    >
                      {/* Most Popular badge */}
                      {isHighlighted && (
                        <div style={{
                          position: "absolute",
                          top: "-0.8125rem",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                          color: C.white,
                          fontFamily: F.body,
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          padding: "0.3125rem 0.875rem",
                          borderRadius: "1rem",
                          letterSpacing: "0.5px",
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
                        color: C.charcoal,
                        margin: 0,
                        marginTop: isHighlighted ? "0.375rem" : 0,
                        marginBottom: "0.1875rem",
                      }}>
                        {tp(plan.nameKey)}
                      </h4>
                      <p style={{
                        fontSize: "0.8125rem",
                        color: C.muted,
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
                            fontWeight: 400,
                            color: C.charcoal,
                          }}>
                            {t("free")}
                          </span>
                        ) : (
                          <>
                            <span style={{
                              fontFamily: F.display,
                              fontSize: "2rem",
                              fontWeight: 400,
                              color: C.charcoal,
                            }}>
                              {formatPrice(convertPrice(interval === "monthly" ? plan.monthlyPrice : plan.price, currency), currency)}
                            </span>
                            <span style={{
                              fontSize: "0.8125rem",
                              color: C.muted,
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
                          border: `1.5px solid ${C.terracotta}30`,
                          background: `${C.terracotta}08`,
                          textAlign: "center",
                          fontFamily: F.body,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: C.terracotta,
                          marginBottom: "1.25rem",
                        }}>
                          {t("currentPlanBadge")}
                        </div>
                      ) : isUpgrade ? (
                        <button
                          onClick={() => handleUpgrade(planId)}
                          disabled={!!upgradeLoading}
                          style={{
                            width: "100%",
                            padding: "0.6875rem 1rem",
                            borderRadius: "0.75rem",
                            border: "none",
                            background: upgradeLoading ? `${C.sandstone}60` : `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                            color: upgradeLoading ? C.muted : C.white,
                            fontFamily: F.body,
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            cursor: upgradeLoading ? "wait" : "pointer",
                            transition: "all 0.2s",
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
                              color: C.charcoal,
                              lineHeight: 1.4,
                            }}
                          >
                            <span style={{
                              width: "1.125rem",
                              height: "1.125rem",
                              borderRadius: "50%",
                              background: isHighlighted
                                ? `${C.terracotta}18`
                                : `${C.sage}15`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.625rem",
                              color: isHighlighted ? C.terracotta : C.sage,
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

      {/* Refer a Friend */}
      {referralCode && (
        <div style={{
          background: C.white,
          borderRadius: "1rem",
          border: `1px solid ${C.cream}`,
          padding: "1.75rem 2rem",
          boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          marginTop: "1.5rem",
        }}>
          <h3 style={{
            fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
            color: C.charcoal, margin: "0 0 0.375rem",
          }}>
            {t("referralTitle")}
          </h3>
          <p style={{
            fontFamily: F.body, fontSize: "0.875rem", color: C.muted,
            margin: "0 0 1.25rem", lineHeight: 1.5,
          }}>
            {t("referralDesc")}
          </p>

          {/* Referral code display */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            flexWrap: "wrap", marginBottom: "1rem",
          }}>
            <div>
              <div style={{
                fontFamily: F.body, fontSize: "0.6875rem", fontWeight: 600,
                color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px",
                marginBottom: "0.25rem",
              }}>
                {t("referralCode")}
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: "1.25rem", fontWeight: 700,
                color: C.charcoal, letterSpacing: "2px",
                padding: "0.5rem 1rem",
                background: C.linen,
                borderRadius: "0.5rem",
                border: `1px solid ${C.cream}`,
                userSelect: "all",
              }}>
                {referralCode}
              </div>
            </div>

            <div style={{
              fontFamily: F.body, fontSize: "0.875rem", color: C.muted,
              padding: "0.5rem 0.75rem",
              background: `${C.sage}12`,
              borderRadius: "0.5rem",
            }}>
              {t("referralCount", { count: String(referralCount) })}
            </div>
          </div>

          {/* Share actions */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                const link = `https://thememorypalace.ai/register?ref=${referralCode}`;
                navigator.clipboard.writeText(link).then(() => {
                  showToast(t("referralCopied"), "success");
                });
              }}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: `1px solid ${C.cream}`,
                background: C.white,
                fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                color: C.charcoal,
                cursor: "pointer",
                transition: "all .15s",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {t("referralCopied").replace("!", "")}
            </button>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={() => {
                  const link = `https://thememorypalace.ai/register?ref=${referralCode}`;
                  navigator.share({
                    title: "The Memory Palace",
                    text: t("referralDesc"),
                    url: link,
                  }).catch(() => {});
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
                  color: C.white,
                  cursor: "pointer",
                  transition: "all .15s",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                {t("referralShare")}
              </button>
            )}
          </div>

          {/* Earned Rewards */}
          {referralRewards.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <h4 style={{
                fontFamily: F.display, fontSize: "1rem", fontWeight: 500,
                color: C.charcoal, margin: "0 0 0.75rem",
              }}>
                {t("referralRewardsTitle")}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {referralRewards.map((reward) => (
                  <div
                    key={reward.promo_code}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.625rem",
                      background: reward.redeemed ? `${C.sandstone}15` : `${C.sage}10`,
                      border: `1px solid ${reward.redeemed ? C.sandstone : C.sage}30`,
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{
                        fontFamily: "monospace",
                        fontSize: "0.9375rem",
                        fontWeight: 700,
                        color: reward.redeemed ? C.muted : C.charcoal,
                        letterSpacing: "1px",
                        textDecoration: reward.redeemed ? "line-through" : "none",
                      }}>
                        {reward.promo_code}
                      </div>
                      <div style={{
                        fontFamily: F.body,
                        fontSize: "0.75rem",
                        color: C.muted,
                        marginTop: "0.125rem",
                      }}>
                        {t("referralRewardHint")}
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}>
                      <span style={{
                        fontFamily: F.body,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.375rem",
                        background: reward.redeemed ? `${C.muted}18` : `${C.sage}18`,
                        color: reward.redeemed ? C.muted : C.sage,
                      }}>
                        {reward.redeemed ? t("referralRewardRedeemed") : t("referralRewardStatus")}
                      </span>
                      {!reward.redeemed && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(reward.promo_code).then(() => {
                              showToast(t("referralCopied"), "success");
                            });
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: `1px solid ${C.cream}`,
                            background: C.white,
                            fontFamily: F.body,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: C.charcoal,
                            cursor: "pointer",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "middle", marginRight: "0.25rem" }}>
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
