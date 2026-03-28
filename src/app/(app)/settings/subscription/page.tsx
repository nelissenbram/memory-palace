"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/constants/plans";
import { isNative } from "@/lib/native/platform";
import { useTranslation } from "@/lib/hooks/useTranslation";

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
}

export default function SubscriptionPage() {
  const { t, locale } = useTranslation("subscription");
  const nativeApp = isNative();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Check for success param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      showToast(t("activated"), "success");
      // Clean URL
      window.history.replaceState({}, "", "/settings/subscription");
    }
  }, [showToast]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load subscription
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, stripe_customer_id")
          .eq("user_id", user.id)
          .single();

        if (subData) {
          setSub(subData as SubscriptionData);
        } else {
          setSub({ plan: "free", status: "active", current_period_end: null, stripe_customer_id: null });
        }

        // Load usage counts
        const [wingsRes, roomsRes, memoriesRes] = await Promise.all([
          supabase.from("wings").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("rooms").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("memories").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        setUsage({
          wings: wingsRes.count || 0,
          rooms: roomsRes.count || 0,
          memories: memoriesRes.count || 0,
        });
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
        window.location.href = data.url;
      } else {
        showToast(data.error || t("billingError"), "error");
      }
    } catch {
      showToast(t("billingConnectError"), "error");
    }
    setPortalLoading(false);
  };

  const handleUpgrade = async (planId: PlanId) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || t("checkoutError"), "error");
      }
    } catch {
      showToast(t("paymentConnectError"), "error");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: F.body, fontSize: "1rem", color: C.muted }}>
        {t("loading")}
      </div>
    );
  }

  const featureKeyMap: Record<string, string> = {
    "2 wings": "feature2wings",
    "5 rooms": "feature5rooms",
    "100 memories": "feature100memories",
    "1 GB storage": "feature1gbStorage",
    "Basic sharing": "featureBasicSharing",
    "3 wings": "feature3wings",
    "10 rooms": "feature10rooms",
    "500 memories": "feature500memories",
    "5 GB storage": "feature5gbStorage",
    "Public sharing": "featurePublicSharing",
    "AI features": "featureAI",
    "Unlimited wings": "featureUnlimitedWings",
    "Unlimited rooms": "featureUnlimitedRooms",
    "Unlimited memories": "featureUnlimitedMemories",
    "50 GB storage": "feature50gbStorage",
    "Legacy features": "featureLegacy",
    "Priority support": "featurePrioritySupport",
    "Family sharing": "featureFamilySharing",
  };

  const translateFeature = (feature: string) => {
    const key = featureKeyMap[feature];
    return key ? t(key) : feature;
  };

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
        <div role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? C.sage : C.error,
          color: "#FFF",
          fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label="Close" style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "1rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Header */}
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
                {t("plan", { name: currentPlan.name })}
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
                  {"\u20AC"}{currentPlan.price.toFixed(2).replace(".", ",")}
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
              {new Date(sub.current_period_end).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-GB", {
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
            )}
            {isFree && (
              <Link
                href="/pricing"
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
                  color: C.white,
                  textDecoration: "none",
                  transition: "all .15s",
                }}
              >
                {t("upgradePlan")}
              </Link>
            )}
            {sub?.plan === "keeper" && (
              <button
                onClick={() => handleUpgrade("guardian")}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
                  color: C.white,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {t("upgradeToGuardian")}
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
                <div style={{
                  height: "0.375rem",
                  borderRadius: 3,
                  background: `${C.sandstone}30`,
                  overflow: "hidden",
                }}>
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
              <Link href="/pricing" style={{
                color: C.terracotta, fontWeight: 600, textDecoration: "underline",
              }}>
                {t("upgradeToKeeper")}
              </Link>{" "}
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {(["free", "keeper", "guardian"] as PlanId[]).map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = planId === sub?.plan;
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
                    {plan.name}
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
                    {plan.features.slice(0, 3).map(translateFeature).join(" \u2022 ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem" }}>
                  <div style={{ fontFamily: F.display, fontSize: "1.125rem", fontWeight: 500, color: C.charcoal }}>
                    {plan.price === 0 ? t("free") : `\u20AC${plan.price.toFixed(2).replace(".", ",")}/${t("perMonthShort")}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!nativeApp && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link
              href="/pricing"
              style={{
                fontFamily: F.body, fontSize: "0.875rem", fontWeight: 500,
                color: C.terracotta, textDecoration: "none",
              }}
            >
              {t("viewFullComparison")} {"\u2192"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
