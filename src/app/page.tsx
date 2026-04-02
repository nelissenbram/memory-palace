"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import enMessages from "@/messages/en.json";
import nlMessages from "@/messages/nl.json";
import PalaceLogo from "@/components/landing/PalaceLogo";
import {
  HeroIllustration,
  FeaturePalaceIcon,
  FeatureInterviewIcon,
  FeatureCloudIcon,
  FeatureTimeCapsuleIcon,
  FeatureSharingIcon,
  FeatureLegacyIcon,
  AudienceHeritagIcon,
  AudienceGuardianIcon,
  AudienceArchivistIcon,
} from "@/components/landing/LandingIllustrations";

/* ───────── tiny helpers ───────── */
const F = T.font;
const C = T.color;

/* ───────── inline SVG micro-icons ───────── */
function LockIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11" r="1" fill={color} />
    </svg>
  );
}

function ShieldIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M8 2L3 4.5V8c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V4.5L8 2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6 8.5l1.5 1.5L10.5 7" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3.5" y="3" width="9" height="11.5" rx="1.5" stroke={color} strokeWidth="1.3" />
      <rect x="5.5" y="1" width="5" height="3" rx="1" stroke={color} strokeWidth="1.1" />
      <line x1="6" y1="8" x2="10" y2="8" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="6" y1="10.5" x2="9" y2="10.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={C.sage} opacity="0.15" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={C.muted} opacity="0.1" />
      <path d="M7 7l6 6M13 7l-6 6" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const [scrollY, setScrollY] = useState(0);
  const { locale } = useTranslation("landing");
  const landing = (locale === "nl" ? nlMessages : enMessages).landing;

  /* ─── Data arrays ─── */

  const FEATURES = [
    { Icon: FeaturePalaceIcon, title: landing.features.palace3d, desc: landing.features.palace3dDesc },
    { Icon: FeatureInterviewIcon, title: landing.features.aiInterviews, desc: landing.features.aiInterviewsDesc },
    { Icon: FeatureCloudIcon, title: landing.features.cloudImport, desc: landing.features.cloudImportDesc },
    { Icon: FeatureTimeCapsuleIcon, title: landing.features.timeCapsules, desc: landing.features.timeCapsuleDesc },
    { Icon: FeatureSharingIcon, title: landing.features.sharingTitle, desc: landing.features.sharingDesc },
    { Icon: FeatureLegacyIcon, title: landing.features.legacyTitle, desc: landing.features.legacyDesc },
  ];

  const STEPS = [
    { num: "01", title: landing.howItWorks.step1Title, desc: landing.howItWorks.step1Desc },
    { num: "02", title: landing.howItWorks.step2Title, desc: landing.howItWorks.step2Desc },
    { num: "03", title: landing.howItWorks.step3Title, desc: landing.howItWorks.step3Desc },
  ];

  const TESTIMONIALS = [
    { quote: landing.testimonials.quote1, name: landing.testimonials.author1, role: landing.testimonials.role1, gradient: `linear-gradient(135deg, ${C.terracotta}50, ${C.sage}40)` },
    { quote: landing.testimonials.quote2, name: landing.testimonials.author2, role: landing.testimonials.role2, gradient: `linear-gradient(135deg, ${C.sage}50, ${C.walnut}40)` },
    { quote: landing.testimonials.quote3, name: landing.testimonials.author3, role: landing.testimonials.role3, gradient: `linear-gradient(135deg, ${C.walnut}50, ${C.terracotta}40)` },
    { quote: landing.testimonials.quote4, name: landing.testimonials.author4, role: landing.testimonials.role4, gradient: `linear-gradient(135deg, ${C.terracotta}40, ${C.gold}40)` },
  ];

  const AUDIENCES = [
    { Icon: AudienceHeritagIcon, title: landing.audience.keepersTitle, desc: landing.audience.keepersDesc, accent: C.sage },
    { Icon: AudienceGuardianIcon, title: landing.audience.guardiansTitle, desc: landing.audience.guardiansDesc, accent: C.terracotta },
    { Icon: AudienceArchivistIcon, title: landing.audience.archivistsTitle, desc: landing.audience.archivistsDesc, accent: C.walnut },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lAny = landing as any;
  const trust = lAny?.trust as Record<string, string> | undefined;
  const comparison = lAny?.comparison as Record<string, string> | undefined;

  const TRUST_STATS = [
    { stat: trust?.stat1 || "100,000+", label: trust?.label1 || "Memories Preserved" },
    { stat: trust?.stat2 || "5,000+", label: trust?.label2 || "Families" },
    { stat: trust?.stat3 || "30+", label: trust?.label3 || "Countries" },
    { stat: trust?.stat4 || "Free Forever", label: trust?.label4 || "Plan Available" },
  ];

  const COMPARISONS = [
    {
      category: comparison?.["row1Category"] || "Organization",
      left: comparison?.["row1Left"] || "Folders & albums",
      right: comparison?.["row1Right"] || "3D rooms by life chapter",
    },
    {
      category: comparison?.["row2Category"] || "Storytelling",
      left: comparison?.["row2Left"] || "No context",
      right: comparison?.["row2Right"] || "AI interviews capture the story behind every photo",
    },
    {
      category: comparison?.["row3Category"] || "Sharing",
      left: comparison?.["row3Left"] || "Link sharing",
      right: comparison?.["row3Right"] || "Co-created family rooms",
    },
    {
      category: comparison?.["row4Category"] || "Legacy",
      left: comparison?.["row4Left"] || "Account deletion risk",
      right: comparison?.["row4Right"] || "Legacy heirs & time capsules",
    },
    {
      category: comparison?.["row5Category"] || "Experience",
      left: comparison?.["row5Left"] || "Scrolling thumbnails",
      right: comparison?.["row5Right"] || "Immersive 3D walkthrough",
    },
    {
      category: comparison?.["row6Category"] || "AI",
      left: comparison?.["row6Left"] || "Basic search",
      right: comparison?.["row6Right"] || "Auto-organize, describe & tag 1000s of photos",
    },
  ];

  /* ─── Scroll tracking ─── */

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const headerOpaque = scrollY > 60;

  /* ─── Render ─── */

  return (
    <div
      id="landing-scroll"
      style={{
        width: "100vw",
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
      }}
    >
      {/* ═══════════════════════════════════════════════════
          1. STICKY NAVIGATION
          ═══════════════════════════════════════════════════ */}
      <nav
        aria-label="Main navigation"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(1.25rem, 5vw, 3.75rem)",
          height: "4rem",
          background: headerOpaque ? "rgba(250,250,247,0.92)" : "transparent",
          backdropFilter: headerOpaque ? "blur(12px)" : "none",
          WebkitBackdropFilter: headerOpaque ? "blur(12px)" : "none",
          borderBottom: headerOpaque ? `1px solid ${C.sandstone}40` : "none",
          transition: "all 0.3s",
        }}
      >
        <PalaceLogo variant="full" color="dark" size="md" />

        <div style={{ display: "flex", gap: isMobile ? "0.5rem" : "0.75rem", alignItems: "center" }}>
          {!isSmall && (
            <Link href="/pricing" style={navLink}>
              {landing.nav.pricing}
            </Link>
          )}
          {!isSmall && (
            <Link href="/login" style={navLink}>
              {landing.nav.signIn}
            </Link>
          )}
          <Link
            href="/register"
            style={{
              ...navCta,
              padding: isMobile ? "0.625rem 1.125rem" : "0.5rem 1.25rem",
            }}
          >
            {landing.nav.getStarted}
          </Link>
        </div>
      </nav>

      <main id="main-content">
        {/* ═══════════════════════════════════════════════════
            2. HERO SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: isMobile
              ? "5rem 1.25rem 3.125rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem) 3.75rem",
            background: `linear-gradient(180deg, ${C.warmStone} 0%, ${C.linen} 60%, ${C.linen} 100%)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Label */}
          <p
            style={{
              fontFamily: F.body,
              fontSize: "0.8125rem",
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              color: C.terracotta,
              fontWeight: 600,
              marginBottom: "1.25rem",
              animation: "fadeUp 0.8s ease both",
            }}
          >
            {lAny.hero?.label || landing.hero.headline}
          </p>

          {/* Main headline */}
          <h1
            style={{
              fontFamily: F.display,
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              maxWidth: "53.125rem",
              margin: "0 auto 1.5rem",
              color: C.charcoal,
              animation: "fadeUp 0.8s ease 0.1s both",
            }}
          >
            {landing.hero.storyDeserves}
            <br />
            <span style={{ fontStyle: "italic", color: C.terracotta }}>
              {landing.hero.moreThanFolder}
            </span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "clamp(1.0625rem, 2.2vw, 1.3125rem)",
              color: C.walnut,
              maxWidth: "37.5rem",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
              animation: "fadeUp 0.8s ease 0.2s both",
            }}
          >
            {landing.hero.description}
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              gap: isMobile ? "0.625rem" : "0.875rem",
              flexWrap: "wrap",
              flexDirection: isSmall ? "column" : "row",
              justifyContent: "center",
              alignItems: "center",
              animation: "fadeUp 0.8s ease 0.3s both",
              width: isSmall ? "100%" : undefined,
            }}
          >
            <Link
              href="/register"
              style={{
                ...heroCta,
                width: isSmall ? "100%" : undefined,
                textAlign: "center" as const,
                minHeight: "3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {landing.hero.cta}
            </Link>
            <a
              href="#how-it-works"
              style={{
                ...heroSecondary,
                width: isSmall ? "100%" : undefined,
                textAlign: "center" as const,
                minHeight: "3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {landing.hero.secondaryCta}
            </a>
          </div>

          {/* Security link */}
          <Link
            href="/security"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              marginTop: "1.25rem",
              fontSize: "0.875rem",
              color: C.muted,
              textDecoration: "none",
              animation: "fadeUp 0.8s ease 0.4s both",
              transition: "color 0.2s",
            }}
          >
            <LockIcon size={14} color={C.muted} />
            {landing.hero.securityLink}
          </Link>

          {/* Hero illustration with parallax */}
          <div
            style={{
              marginTop: isMobile ? "2rem" : "3rem",
              maxWidth: "50rem",
              width: "100%",
              animation: "fadeUp 0.8s ease 0.5s both",
              transform: `translateY(${scrollY * 0.08}px)`,
              transition: "transform 0.1s linear",
            }}
          >
            <HeroIllustration />
          </div>

          {/* Scroll hint */}
          <div
            style={{
              position: "absolute",
              bottom: "1.875rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.375rem",
              opacity: scrollY > 50 ? 0 : 0.5,
              transition: "opacity 0.3s",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: C.muted, letterSpacing: 1 }}>
              {landing.scroll}
            </span>
            <div
              style={{
                width: "0.0625rem",
                height: "1.75rem",
                background: `linear-gradient(to bottom, ${C.muted}, transparent)`,
              }}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            3. TRUST NUMBERS BAR
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            background: C.warmStone,
            padding: isMobile ? "2.5rem 1.25rem" : "3rem clamp(1.25rem, 5vw, 3.75rem)",
            borderTop: `1px solid ${C.sandstone}30`,
            borderBottom: `1px solid ${C.sandstone}30`,
          }}
        >
          <div
            style={{
              maxWidth: "62.5rem",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: isSmall ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: isMobile ? "1.5rem" : "2rem",
              textAlign: "center",
            }}
          >
            {TRUST_STATS.map((item, i) => (
              <div key={i}>
                <p
                  style={{
                    fontFamily: F.display,
                    fontSize: isMobile ? "1.75rem" : "2.25rem",
                    fontWeight: 300,
                    color: C.terracotta,
                    lineHeight: 1,
                    marginBottom: "0.375rem",
                  }}
                >
                  {item.stat}
                </p>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: C.walnut,
                    letterSpacing: "0.5px",
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            4. FEATURES SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          id="features"
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            maxWidth: "68.75rem",
            margin: "0 auto",
          }}
        >
          <p style={sectionLabel}>{landing.features.title}</p>
          <h2 style={sectionTitle}>{landing.features.subtitle}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmall
                ? "1fr"
                : isMobile
                ? "repeat(2, 1fr)"
                : "repeat(3, 1fr)",
              gap: isMobile ? "1.25rem" : "1.75rem",
              marginTop: isMobile ? "2.25rem" : "3.5rem",
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} style={featureCard}>
                <div style={{ marginBottom: "1rem" }}>
                  <f.Icon size={48} />
                </div>
                <h3 style={featureTitle}>{f.title}</h3>
                <p style={featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            5. HOW IT WORKS
            ═══════════════════════════════════════════════════ */}
        <section
          id="how-it-works"
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            background: C.warmStone,
          }}
        >
          <div style={{ maxWidth: "56.25rem", margin: "0 auto" }}>
            <p style={sectionLabel}>{landing.howItWorks.title}</p>
            <h2 style={sectionTitle}>{landing.howItWorks.subtitle}</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmall ? "1fr" : "repeat(3, 1fr)",
                gap: isMobile ? "2rem" : "2.5rem",
                marginTop: "3.5rem",
                position: "relative",
              }}
            >
              {/* Connecting line between steps (desktop only) */}
              {!isSmall && (
                <div
                  style={{
                    position: "absolute",
                    top: "2rem",
                    left: "20%",
                    right: "20%",
                    height: "1px",
                    background: `linear-gradient(to right, transparent, ${C.sandstone}, transparent)`,
                    pointerEvents: "none",
                  }}
                />
              )}

              {STEPS.map((s, i) => (
                <div key={s.num} style={{ textAlign: "center", position: "relative" }}>
                  {/* Step number */}
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: "3rem",
                      fontWeight: 300,
                      color: C.terracotta,
                      opacity: 0.5,
                      marginBottom: "0.75rem",
                      lineHeight: 1,
                    }}
                  >
                    {s.num}
                  </div>

                  {/* Dot on the connecting line (desktop only) */}
                  {!isSmall && (
                    <div
                      style={{
                        position: "absolute",
                        top: "2rem",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "50%",
                        background: C.terracotta,
                        opacity: 0.4,
                        zIndex: 1,
                      }}
                    />
                  )}

                  <h3
                    style={{
                      fontFamily: F.display,
                      fontSize: "1.375rem",
                      fontWeight: 500,
                      marginBottom: "0.5rem",
                      color: C.charcoal,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      color: C.walnut,
                      lineHeight: 1.6,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            6. COMPARISON SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            background: C.linen,
          }}
        >
          <div style={{ maxWidth: "56.25rem", margin: "0 auto" }}>
            <p style={sectionLabel}>
              {comparison?.title || "The difference"}
            </p>
            <h2 style={sectionTitle}>
              {comparison?.subtitle || "Why not just use Google Photos?"}
            </h2>

            {/* Comparison table */}
            <div
              style={{
                marginTop: isMobile ? "2rem" : "3.5rem",
                borderRadius: "1.25rem",
                overflow: "hidden",
                border: `1px solid ${C.sandstone}50`,
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isSmall ? "1fr 1fr" : "1.2fr 1fr 1fr",
                  background: C.warmStone,
                  borderBottom: `1px solid ${C.sandstone}40`,
                }}
              >
                {!isSmall && <div style={{ padding: "1rem 1.5rem" }} />}
                <div
                  style={{
                    padding: isSmall ? "0.875rem 1rem" : "1rem 1.5rem",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: C.muted,
                      fontWeight: 600,
                    }}
                  >
                    {comparison?.headerLeft || "Scattered Photos"}
                  </p>
                </div>
                <div
                  style={{
                    padding: isSmall ? "0.875rem 1rem" : "1rem 1.5rem",
                    textAlign: "center",
                    background: `linear-gradient(135deg, ${C.terracotta}08, ${C.gold}06)`,
                    borderLeft: `2px solid ${C.terracotta}30`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: C.terracotta,
                      fontWeight: 700,
                    }}
                  >
                    {comparison?.headerRight || "Memory Palace"}
                  </p>
                </div>
              </div>

              {/* Comparison rows */}
              {COMPARISONS.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isSmall ? "1fr 1fr" : "1.2fr 1fr 1fr",
                    borderBottom:
                      i < COMPARISONS.length - 1
                        ? `1px solid ${C.sandstone}25`
                        : "none",
                    background: i % 2 === 0 ? C.white : `${C.warmStone}60`,
                  }}
                >
                  {/* Category label (hidden on small, shown inline) */}
                  {!isSmall && (
                    <div
                      style={{
                        padding: "1rem 1.5rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: C.charcoal,
                        }}
                      >
                        {row.category}
                      </p>
                    </div>
                  )}

                  {/* Left (old way) */}
                  <div
                    style={{
                      padding: isSmall ? "0.875rem 0.75rem" : "1rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <CrossIcon size={isSmall ? 14 : 16} />
                    <div>
                      {isSmall && (
                        <p
                          style={{
                            fontSize: "0.625rem",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: C.muted,
                            marginBottom: "0.125rem",
                          }}
                        >
                          {row.category}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: isSmall ? "0.75rem" : "0.875rem",
                          color: C.muted,
                          lineHeight: 1.4,
                        }}
                      >
                        {row.left}
                      </p>
                    </div>
                  </div>

                  {/* Right (Memory Palace) */}
                  <div
                    style={{
                      padding: isSmall ? "0.875rem 0.75rem" : "1rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: `linear-gradient(135deg, ${C.terracotta}04, ${C.gold}03)`,
                      borderLeft: `2px solid ${C.terracotta}20`,
                    }}
                  >
                    <CheckIcon size={isSmall ? 14 : 16} />
                    <div>
                      {isSmall && (
                        <p
                          style={{
                            fontSize: "0.625rem",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: C.terracotta,
                            marginBottom: "0.125rem",
                            fontWeight: 600,
                          }}
                        >
                          {row.category}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: isSmall ? "0.75rem" : "0.875rem",
                          color: C.charcoal,
                          lineHeight: 1.4,
                          fontWeight: 500,
                        }}
                      >
                        {row.right}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            7. AUDIENCE SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            maxWidth: "68.75rem",
            margin: "0 auto",
          }}
        >
          <p style={sectionLabel}>{landing.audience.title}</p>
          <h2 style={sectionTitle}>{landing.audience.subtitle}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmall ? "1fr" : "repeat(3, 1fr)",
              gap: "1.75rem",
              marginTop: "3.5rem",
            }}
          >
            {AUDIENCES.map((a) => (
              <div
                key={a.title}
                style={{
                  background: C.white,
                  borderRadius: "1rem",
                  padding: isMobile ? "2rem 1.5rem" : "2.5rem 2rem",
                  border: `1px solid ${C.sandstone}60`,
                  borderTop: `3px solid ${a.accent}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "4.5rem",
                    height: "4.5rem",
                    borderRadius: "50%",
                    background: `${a.accent}10`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <a.Icon size={48} />
                </div>
                <h3
                  style={{
                    fontFamily: F.display,
                    fontSize: "1.375rem",
                    fontWeight: 500,
                    color: C.charcoal,
                    marginBottom: "0.75rem",
                  }}
                >
                  {a.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    color: C.walnut,
                    lineHeight: 1.6,
                  }}
                >
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            8. TESTIMONIALS SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            background: `linear-gradient(135deg, ${C.charcoal}, #3D3D3A)`,
          }}
        >
          <div style={{ maxWidth: "68.75rem", margin: "0 auto" }}>
            <p style={{ ...sectionLabel, color: C.terracotta }}>
              {landing.testimonials.title}
            </p>
            <h2 style={{ ...sectionTitle, color: C.linen }}>
              {landing.testimonials.subtitle}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
                gap: "1.5rem",
                marginTop: "3.5rem",
              }}
            >
              {TESTIMONIALS.map((tm) => (
                <div
                  key={tm.name}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "1rem",
                    padding: isMobile ? "1.75rem 1.5rem" : "2rem 1.75rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Decorative quote mark */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 32 24"
                      width="2rem"
                      height="1.5rem"
                      aria-hidden="true"
                      style={{ display: "block", marginBottom: "0.75rem" }}
                    >
                      <path
                        d="M0 18V12C0 5.4 4.2 1.2 12.6 0l1.2 2.4C9 4.2 7.2 7.2 6.6 12H12v12H0v-6zm18 0V12c0-6.6 4.2-10.8 12.6-12l1.2 2.4C27 4.2 25.2 7.2 24.6 12H30v12H18v-6z"
                        fill={C.terracotta}
                        opacity="0.35"
                      />
                    </svg>
                    <p
                      style={{
                        fontSize: "1rem",
                        color: C.cream,
                        lineHeight: 1.7,
                        marginBottom: "1.5rem",
                      }}
                    >
                      {tm.quote}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    {/* Avatar with gradient background */}
                    <div
                      style={{
                        width: "2.625rem",
                        height: "2.625rem",
                        borderRadius: "50%",
                        background: tm.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: F.display,
                          fontSize: "1.125rem",
                          fontWeight: 500,
                          color: C.linen,
                          lineHeight: 1,
                        }}
                      >
                        {tm.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: C.linen,
                          marginBottom: "0.125rem",
                        }}
                      >
                        {tm.name}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: C.terracotta }}>
                        {tm.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            9. FINAL CTA SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            padding: isMobile ? "5rem 1.25rem" : "7.5rem clamp(1.25rem, 5vw, 3.75rem)",
            textAlign: "center",
            background: C.linen,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle palace illustration accent */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "20rem",
              opacity: 0.04,
              pointerEvents: "none",
            }}
          >
            <HeroIllustration />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <h2
              style={{
                fontFamily: F.display,
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                fontWeight: 300,
                color: C.charcoal,
                marginBottom: "1rem",
                lineHeight: 1.2,
              }}
            >
              {landing.cta.title}
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: C.walnut,
                maxWidth: "30rem",
                margin: "0 auto 2.5rem",
                lineHeight: 1.6,
              }}
            >
              {landing.cta.description}
            </p>
            <Link href="/register" style={heroCta}>
              {landing.cta.button}
            </Link>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════
          10. FOOTER
          ═══════════════════════════════════════════════════ */}
      <footer
        style={{
          padding: isMobile
            ? "2.5rem 1.25rem 1.75rem"
            : "3.5rem clamp(1.25rem, 5vw, 3.75rem) 2.25rem",
          borderTop: `1px solid ${C.sandstone}40`,
          background: C.charcoal,
        }}
      >
        <div
          style={{
            maxWidth: "68.75rem",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "2fr 1fr 1fr",
            gap: isSmall ? "2rem" : "3rem",
            marginBottom: "2.5rem",
          }}
        >
          {/* About */}
          <div>
            <div style={{ marginBottom: "0.875rem" }}>
              <PalaceLogo variant="full" color="light" size="sm" />
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: C.muted,
                lineHeight: 1.7,
                maxWidth: "21.25rem",
              }}
            >
              {landing.footer.about}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: C.sandstone,
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              {landing.footer.quickLinks}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              <a
                href="#features"
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  textDecoration: "none",
                }}
              >
                {landing.footer.features}
              </a>
              <a
                href="#how-it-works"
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  textDecoration: "none",
                }}
              >
                {landing.footer.howItWorks}
              </a>
              <Link
                href="/pricing"
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  textDecoration: "none",
                }}
              >
                {landing.footer.pricing}
              </Link>
              <Link
                href="/login"
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  textDecoration: "none",
                }}
              >
                {landing.footer.signIn}
              </Link>
              <Link
                href="/register"
                style={{
                  fontSize: "0.875rem",
                  color: C.terracotta,
                  textDecoration: "none",
                }}
              >
                {landing.footer.getStartedFree}
              </Link>
            </div>
          </div>

          {/* Trust & security */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: C.sandstone,
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              {landing.footer.trustSecurity}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <LockIcon size={14} color={C.muted} />
                {landing.footer.euHosted}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ShieldIcon size={14} color={C.muted} />
                {landing.footer.encryption}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: C.muted,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ClipboardIcon size={14} color={C.muted} />
                {landing.footer.gdpr}
              </p>
              <Link
                href="/security"
                style={{
                  fontSize: "0.875rem",
                  color: C.terracotta,
                  textDecoration: "none",
                  marginTop: "0.25rem",
                }}
              >
                {landing.footer.learnSecurity} &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "1.25rem",
            display: "flex",
            justifyContent: isSmall ? "center" : "space-between",
            alignItems: "center",
            flexDirection: isSmall ? "column" : "row",
            gap: "0.625rem",
          }}
        >
          <p style={{ fontSize: "0.75rem", color: C.muted }}>
            &copy; {new Date().getFullYear()} {landing.footer.copyright}
          </p>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <Link
              href="/privacy"
              style={{
                fontSize: "0.75rem",
                color: C.muted,
                textDecoration: "none",
              }}
            >
              {landing.footer.privacyPolicy}
            </Link>
            <Link
              href="/terms"
              style={{
                fontSize: "0.75rem",
                color: C.muted,
                textDecoration: "none",
              }}
            >
              {landing.footer.termsOfService}
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: "0.75rem",
                color: C.muted,
                textDecoration: "none",
              }}
            >
              {landing.footer.signIn}
            </Link>
            <Link
              href="/register"
              style={{
                fontSize: "0.75rem",
                color: C.terracotta,
                textDecoration: "none",
              }}
            >
              {landing.nav.getStarted}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const navLink: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: "0.875rem",
  color: C.walnut,
  textDecoration: "none",
  padding: "0.5rem 1rem",
  borderRadius: "0.5rem",
  transition: "color 0.2s",
};

const navCta: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  color: C.white,
  textDecoration: "none",
  padding: "0.5rem 1.25rem",
  borderRadius: "0.625rem",
  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
};

const heroCta: React.CSSProperties = {
  display: "inline-block",
  fontFamily: F.body,
  fontSize: "1rem",
  fontWeight: 600,
  color: C.white,
  textDecoration: "none",
  padding: "1rem 2.25rem",
  borderRadius: "0.875rem",
  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
  boxShadow: "0 4px 20px rgba(193,127,89,0.3)",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const heroSecondary: React.CSSProperties = {
  display: "inline-block",
  fontFamily: F.body,
  fontSize: "1rem",
  fontWeight: 500,
  color: C.walnut,
  textDecoration: "none",
  padding: "1rem 2.25rem",
  borderRadius: "0.875rem",
  border: `1.5px solid ${C.sandstone}`,
  transition: "border-color 0.2s",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: "0.75rem",
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: C.terracotta,
  fontWeight: 600,
  textAlign: "center",
  marginBottom: "0.75rem",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: "clamp(1.625rem, 3.5vw, 2.5rem)",
  fontWeight: 300,
  textAlign: "center",
  color: C.charcoal,
  lineHeight: 1.2,
};

const featureCard: React.CSSProperties = {
  background: C.white,
  borderRadius: "1rem",
  padding: "2rem 1.75rem",
  border: `1px solid ${C.sandstone}50`,
  transition: "box-shadow 0.3s, transform 0.3s",
};

const featureTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: "1.25rem",
  fontWeight: 500,
  color: C.charcoal,
  marginBottom: "0.5rem",
};

const featureDesc: React.CSSProperties = {
  fontSize: "0.875rem",
  color: C.walnut,
  lineHeight: 1.6,
};
