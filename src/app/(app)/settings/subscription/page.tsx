"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/constants/plans";
import { isNative } from "@/lib/native/platform";

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
      showToast("Subscription activated! Welcome aboard.", "success");
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
        showToast(data.error || "Could not open billing portal.", "error");
      }
    } catch {
      showToast("Could not connect to billing service.", "error");
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
        showToast(data.error || "Could not start checkout.", "error");
      }
    } catch {
      showToast("Could not connect to payment service.", "error");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: F.body, fontSize: 16, color: C.muted }}>
        Loading subscription...
      </div>
    );
  }

  const currentPlan = sub ? PLANS[sub.plan] : PLANS.free;
  const limits = currentPlan.limits;
  const isFree = sub?.plan === "free";
  const isPaid = sub?.plan === "keeper" || sub?.plan === "guardian";

  const statusLabel: Record<string, { text: string; color: string }> = {
    active: { text: "Active", color: C.sage },
    trialing: { text: "Trial", color: C.terracotta },
    past_due: { text: "Past Due", color: C.error },
    canceled: { text: "Canceled", color: C.muted },
  };

  const currentStatus = statusLabel[sub?.status || "active"] || statusLabel.active;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? C.sage : C.error,
          color: "#FFF",
          fontFamily: F.body, fontSize: 14, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: 16, cursor: "pointer", marginLeft: 8, opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: F.display, fontSize: 28, fontWeight: 500,
          color: C.charcoal, margin: "0 0 8px",
        }}>
          Subscription
        </h2>
        <p style={{
          fontFamily: F.body, fontSize: 15, color: C.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          Manage your plan and view your usage.
        </p>
      </div>

      {/* Current Plan Card */}
      <div style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid ${C.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h3 style={{
                fontFamily: F.display, fontSize: 24, fontWeight: 500,
                color: C.charcoal, margin: 0,
              }}>
                {currentPlan.name} Plan
              </h3>
              <span style={{
                padding: "4px 12px",
                borderRadius: 8,
                background: `${currentStatus.color}18`,
                color: currentStatus.color,
                fontFamily: F.body,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.3px",
              }}>
                {currentStatus.text}
              </span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.muted, margin: 0 }}>
              {currentPlan.tagline}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            {currentPlan.price > 0 ? (
              <>
                <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 400, color: C.charcoal }}>
                  {"\u20AC"}{currentPlan.price.toFixed(2).replace(".", ",")}
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>per month</div>
              </>
            ) : (
              <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 400, color: C.charcoal }}>
                Free
              </div>
            )}
          </div>
        </div>

        {/* Period end */}
        {sub?.current_period_end && (
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginBottom: 16 }}>
            {sub.status === "trialing" ? "Trial ends" : "Next billing date"}:{" "}
            <strong style={{ color: C.charcoal }}>
              {new Date(sub.current_period_end).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
        )}

        {/* Actions — hidden in native app (Google Play policy: no external payment links) */}
        {!nativeApp && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {isPaid && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: `1px solid ${C.cream}`,
                  background: C.white,
                  fontFamily: F.body, fontSize: 14, fontWeight: 500,
                  color: C.charcoal,
                  cursor: portalLoading ? "wait" : "pointer",
                  transition: "all .15s",
                }}
              >
                {portalLoading ? "Opening..." : "Manage Billing"}
              </button>
            )}
            {isFree && (
              <Link
                href="/pricing"
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: 14, fontWeight: 600,
                  color: C.white,
                  textDecoration: "none",
                  transition: "all .15s",
                }}
              >
                Upgrade Plan
              </Link>
            )}
            {sub?.plan === "keeper" && (
              <button
                onClick={() => handleUpgrade("guardian")}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  fontFamily: F.body, fontSize: 14, fontWeight: 600,
                  color: C.white,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                Upgrade to Guardian
              </button>
            )}
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid ${C.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: 20, fontWeight: 500,
          color: C.charcoal, margin: "0 0 20px",
        }}>
          Your Usage
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {([
            { label: "Wings", current: usage?.wings || 0, limit: limits.wings },
            { label: "Rooms", current: usage?.rooms || 0, limit: limits.rooms },
            { label: "Memories", current: usage?.memories || 0, limit: limits.memories },
          ] as const).map((item) => {
            const isUnlimited = item.limit === -1;
            const percentage = isUnlimited ? 0 : Math.min((item.current / item.limit) * 100, 100);
            const isNearLimit = !isUnlimited && percentage >= 80;

            return (
              <div key={item.label}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: 6,
                }}>
                  <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.charcoal }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontFamily: F.body, fontSize: 13,
                    color: isNearLimit ? C.terracotta : C.muted,
                    fontWeight: isNearLimit ? 600 : 400,
                  }}>
                    {item.current} / {isUnlimited ? "\u221E" : item.limit}
                  </span>
                </div>
                <div style={{
                  height: 6,
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
        {!nativeApp && isFree && usage && (usage.wings >= 1 || usage.rooms >= 2 || usage.memories >= 40) && (
          <div style={{
            marginTop: 20,
            padding: "16px 20px",
            borderRadius: 12,
            background: `${C.terracotta}08`,
            border: `1px solid ${C.terracotta}20`,
          }}>
            <p style={{
              fontFamily: F.body, fontSize: 14, color: C.charcoal,
              margin: 0, lineHeight: 1.5,
            }}>
              You are approaching your free plan limits. {" "}
              <Link href="/pricing" style={{
                color: C.terracotta, fontWeight: 600, textDecoration: "underline",
              }}>
                Upgrade to Keeper
              </Link>{" "}
              for more space and AI features.
            </p>
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <div style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid ${C.cream}`,
        padding: "28px 32px",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
      }}>
        <h3 style={{
          fontFamily: F.display, fontSize: 20, fontWeight: 500,
          color: C.charcoal, margin: "0 0 6px",
        }}>
          All Plans
        </h3>
        <p style={{
          fontFamily: F.body, fontSize: 14, color: C.muted,
          margin: "0 0 20px", lineHeight: 1.5,
        }}>
          Compare features across plans.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: isCurrent ? `${C.terracotta}08` : C.linen,
                  border: isCurrent ? `1.5px solid ${C.terracotta}30` : `1px solid ${C.cream}`,
                }}
              >
                <div>
                  <div style={{
                    fontFamily: F.body, fontSize: 15, fontWeight: 600,
                    color: C.charcoal, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {plan.name}
                    {isCurrent && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 6,
                        background: `${C.terracotta}18`, color: C.terracotta,
                      }}>
                        Current
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                    {plan.features.slice(0, 3).join(" \u2022 ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 500, color: C.charcoal }}>
                    {plan.price === 0 ? "Free" : `\u20AC${plan.price.toFixed(2).replace(".", ",")}/mo`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!nativeApp && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link
              href="/pricing"
              style={{
                fontFamily: F.body, fontSize: 14, fontWeight: 500,
                color: C.terracotta, textDecoration: "none",
              }}
            >
              View full plan comparison {"\u2192"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
