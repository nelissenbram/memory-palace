"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import Toast, { type ToastData } from "@/components/ui/Toast";
import { PLANS, PLAN_ORDER, type PlanId, type BillingInterval } from "@/lib/constants/plans";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { isAndroid, isIOS, openInExternalBrowser } from "@/lib/native/platform";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { detectCurrency, convertPrice, formatPrice, type SupportedCurrency } from "@/lib/currency";

const F = T.font;
const C = T.color;

export default function PricingPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [currency, setCurrency] = useState<SupportedCurrency>("EUR");
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation("pricing");

  // Auto-detect currency from timezone/locale
  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);
  const { t: ts } = useTranslation("subscription");
  const { t: tp } = useTranslation("plans");
  const { t: tc } = useTranslation("common");

  // Redirect away from pricing page on Android — Google Play forbids
  // directing users to external payment flows. iOS allowed via External Purchase Link entitlement.
  useEffect(() => {
    if (isAndroid()) {
      router.replace("/atrium");
    }
  }, [router]);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "free") {
      window.location.href = "/register";
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
        redirect: "manual",
      });
      // Middleware redirects unauthenticated users — detect redirect
      if (res.type === "opaqueredirect" || res.status === 0 || res.status === 307 || res.status === 308) {
        window.location.href = "/register";
        return;
      }
      if (res.status === 401) {
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
        if (isIOS()) {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(20px, 5vw, 60px)",
          height: 64,
          background: `${C.linen}e8`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.sandstone}40`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" aria-label={tc("a11yBackToHome")} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${C.sandstone}50`,
            background: "none", color: C.walnut, textDecoration: "none",
            transition: "border-color 0.2s",
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
              gap: 10,
              textDecoration: "none",
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="sm" />
            <span
              style={{
                fontFamily: F.display,
                fontSize: 20,
                fontWeight: 500,
                color: C.charcoal,
                letterSpacing: "-0.3px",
              }}
            >
              {t("title")}
            </span>
          </Link>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} aria-label={tc("a11ySwitchLanguage")} style={{
            background: "none", border: `1px solid ${C.sandstone}60`, borderRadius: "0.375rem",
            padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: F.body,
            fontWeight: 600, color: C.walnut, cursor: "pointer", letterSpacing: "0.5px",
            textTransform: "uppercase", transition: "border-color 0.2s, color 0.2s",
            appearance: "none", WebkitAppearance: "none", paddingRight: "1.25rem",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 0.375rem center",
          }}>
            {locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          {!isSmall && (
            <Link
              href="/login"
              style={{
                fontFamily: F.body,
                fontSize: 14,
                color: C.walnut,
                textDecoration: "none",
                padding: "8px 16px",
              }}
            >
              {t("signIn")}
            </Link>
          )}
          <Link
            href="/register"
            style={{
              fontFamily: F.body,
              fontSize: 14,
              fontWeight: 600,
              color: C.white,
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
            }}
          >
            {t("getStarted")}
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section
        style={{
          padding: isMobile ? "60px 20px 40px" : "80px 40px 56px",
          textAlign: "center",
          background: `radial-gradient(ellipse at 50% 30%, ${C.warmStone}, ${C.linen} 70%)`,
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            color: C.terracotta,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {t("headline")}
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 300,
            lineHeight: 1.15,
            color: C.charcoal,
            marginBottom: 16,
          }}
        >
          {t("subheadline")}
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2vw, 19px)",
            color: C.walnut,
            maxWidth: 520,
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
          gap: 12,
          padding: isMobile ? "0 16px" : "0 40px",
          marginTop: -8,
          flexWrap: "wrap",
        }}
      >
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
            {/* i18n: "monthly" */}
            {t("monthly") !== "monthly" ? t("monthly") : "Monthly"}
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
            {/* i18n: "annual" */}
            {t("annual") !== "annual" ? t("annual") : "Annual"}
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
              {t("saveUpToPercent")}
            </span>
          </button>
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
          aria-label={t("currency")}
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
            WebkitAppearance: "none",
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
              color: C.walnut,
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

      {/* Plan Cards */}
      <section
        style={{
          padding: isMobile ? "40px 16px 80px" : "56px 40px 100px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall
              ? "1fr"
              : "repeat(3, 1fr)",
            gap: isMobile ? 20 : 28,
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
                  borderRadius: 20,
                  border: isHighlighted
                    ? `2px solid ${C.terracotta}`
                    : `1px solid ${C.sandstone}50`,
                  padding: isMobile ? "28px 24px" : "36px 32px",
                  position: "relative",
                  boxShadow: isHighlighted
                    ? `0 8px 32px rgba(198,107,61,0.15)`
                    : "0 2px 12px rgba(0,0,0,0.04)",
                  transform: isHighlighted && !isSmall ? "scale(1.03)" : undefined,
                }}
              >
                {/* Badge */}
                {isHighlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                      color: C.white,
                      fontFamily: F.body,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 18px",
                      borderRadius: 20,
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
                    fontSize: 26,
                    fontWeight: 500,
                    color: C.charcoal,
                    marginBottom: 4,
                    marginTop: isHighlighted ? 8 : 0,
                  }}
                >
                  {tp(plan.nameKey)}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: C.muted,
                    marginBottom: 20,
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
                    gap: 4,
                    marginBottom: 24,
                  }}
                >
                  {isFree ? (
                    <span
                      style={{
                        fontFamily: F.display,
                        fontSize: 42,
                        fontWeight: 500,
                        color: C.charcoal,
                      }}
                    >
                      {t("free")}
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          fontFamily: F.display,
                          fontSize: 42,
                          fontWeight: 500,
                          color: C.charcoal,
                        }}
                      >
                        {formatPrice(convertPrice(interval === "monthly" ? plan.monthlyPrice : plan.price, currency), currency)}
                      </span>
                      <span
                        style={{
                          fontSize: 15,
                          color: C.muted,
                        }}
                      >
                        {t("perMonth")}
                      </span>
                    </>
                  )}
                </div>
                {!isFree && interval === "annual" && (
                  <p style={{ fontSize: 12, color: C.muted, marginTop: -16, marginBottom: 8 }}>
                    {t("billedYearly")}
                  </p>
                )}

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={loading !== null}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    borderRadius: 14,
                    border: isFree
                      ? `1.5px solid ${C.sandstone}`
                      : "none",
                    background: isFree
                      ? "transparent"
                      : `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                    color: isFree ? C.charcoal : C.white,
                    fontFamily: F.body,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: loading ? "wait" : "pointer",
                    transition: "all 0.2s",
                    opacity: loading && loading !== planId ? 0.5 : 1,
                    marginBottom: 28,
                  }}
                >
                  {loading === planId
                    ? t("redirecting")
                    : isFree
                      ? t("getStartedBtn")
                      : plan.trial
                        ? (t("startFreeTrial") !== "startFreeTrial" ? t("startFreeTrial") : `Start ${plan.trial}-day free trial`)
                        : t("subscribe")}
                </button>

                {/* Features */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {plan.featureKeys.map((featureKey) => (
                    <div
                      key={featureKey}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                        color: C.charcoal,
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          background: isHighlighted
                            ? `${C.terracotta}18`
                            : `${C.sage}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          color: isHighlighted ? C.terracotta : C.sage,
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

      {/* Testimonials */}
      <section
        style={{
          padding: isMobile ? "0 1rem 3rem" : "0 2.5rem 4rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? "1.25rem" : "1.75rem",
          }}
        >
          {[
            {
              quote: t("testimonial1Quote"),
              author: t("testimonial1Author"),
              role: t("testimonial1Role"),
            },
            {
              quote: t("testimonial2Quote"),
              author: t("testimonial2Author"),
              role: t("testimonial2Role"),
            },
          ].map((testimonial) => (
            <div
              key={testimonial.author}
              style={{
                background: C.white,
                borderRadius: "1rem",
                border: `1px solid ${C.sandstone}40`,
                padding: isMobile ? "1.5rem" : "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <p
                style={{
                  fontFamily: F.display,
                  fontSize: "1.0625rem",
                  fontStyle: "normal",
                  color: C.charcoal,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <span
                  style={{
                    fontFamily: F.body,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: C.charcoal,
                  }}
                >
                  {testimonial.author}
                </span>
                <span
                  style={{
                    fontFamily: F.body,
                    fontSize: "0.8125rem",
                    color: C.muted,
                    marginLeft: "0.5rem",
                  }}
                >
                  {testimonial.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ-like trust section */}
      <section
        style={{
          padding: isMobile ? "48px 20px 64px" : "64px 40px 80px",
          background: C.warmStone,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: F.display,
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 300,
            color: C.charcoal,
            marginBottom: 12,
          }}
        >
          {t("faqTitle")}
        </h2>
        <div
          style={{
            maxWidth: 680,
            margin: "32px auto 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            textAlign: "left",
          }}
        >
          {faqs.map((item) => (
            <div
              key={item.q}
              style={{
                background: C.white,
                borderRadius: 14,
                padding: isMobile ? "20px" : "22px 28px",
                border: `1px solid ${C.sandstone}40`,
              }}
            >
              <h4
                style={{
                  fontFamily: F.body,
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.charcoal,
                  marginBottom: 8,
                }}
              >
                {item.q}
              </h4>
              <p
                style={{
                  fontSize: 14,
                  color: C.walnut,
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
          padding: "32px clamp(20px, 5vw, 60px)",
          borderTop: `1px solid ${C.sandstone}40`,
          background: C.charcoal,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: C.muted }}>
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
