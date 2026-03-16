"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/constants/plans";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { isNative } from "@/lib/native/platform";

const F = T.font;
const C = T.color;

export default function PricingPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const router = useRouter();

  // Redirect away from pricing page in native app — Google Play forbids
  // directing users to external payment flows
  useEffect(() => {
    if (isNative()) {
      router.replace("/palace");
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
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        // Not logged in, redirect to register
        window.location.href = "/register";
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Could not connect to payment service. Please try again.");
    }
    setLoading(null);
  };

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
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 22 }}>🏛️</span>
          <span
            style={{
              fontFamily: F.display,
              fontSize: 20,
              fontWeight: 500,
              color: C.charcoal,
              letterSpacing: "-0.3px",
            }}
          >
            The Memory Palace
          </span>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
              Sign In
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
            Get Started
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
          Simple, Honest Pricing
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
          Choose your{" "}
          <span style={{ fontStyle: "italic", color: C.terracotta }}>
            legacy plan
          </span>
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
          Start free. Upgrade when you need more space for your memories. All
          paid plans include a 14-day free trial.
        </p>
      </section>

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
                    ? `0 8px 32px rgba(193,127,89,0.15)`
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
                    Most Popular
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
                  {plan.name}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: C.muted,
                    marginBottom: 20,
                    lineHeight: 1.5,
                  }}
                >
                  {plan.tagline}
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
                        fontWeight: 400,
                        color: C.charcoal,
                      }}
                    >
                      Free
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          fontFamily: F.display,
                          fontSize: 42,
                          fontWeight: 400,
                          color: C.charcoal,
                        }}
                      >
                        {"\u20AC"}{plan.price.toFixed(2).replace(".", ",")}
                      </span>
                      <span
                        style={{
                          fontSize: 15,
                          color: C.muted,
                        }}
                      >
                        /month
                      </span>
                    </>
                  )}
                </div>

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
                    ? "Redirecting..."
                    : isFree
                      ? "Get Started"
                      : "Start Free Trial"}
                </button>

                {/* Features */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
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
                      {feature}
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
          Questions? We have answers.
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
          {[
            {
              q: "Can I cancel anytime?",
              a: "Absolutely. No lock-in, no penalties. Cancel from your account settings and keep access until the end of your billing period.",
            },
            {
              q: "What happens to my memories if I downgrade?",
              a: "Your memories are never deleted. You will just not be able to add new ones until you are within the free plan limits.",
            },
            {
              q: "Is my data safe?",
              a: "Yes. All data is stored on EU-hosted infrastructure with encryption at rest and in transit. We are fully GDPR compliant.",
            },
            {
              q: "Do you offer family plans?",
              a: "The Guardian plan includes family sharing, allowing up to 5 family members to contribute to your palace.",
            },
          ].map((item) => (
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
          &copy; {new Date().getFullYear()} The Memory Palace. Preserve your
          memories for eternity.
        </p>
      </footer>
    </div>
  );
}
