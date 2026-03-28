"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import enMessages from "@/messages/en.json";
import nlMessages from "@/messages/nl.json";

/* ───────── tiny helpers ───────── */
const F = T.font;
const C = T.color;

export default function LandingPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const [scrollY, setScrollY] = useState(0);
  const { locale } = useTranslation("landing");
  const landing = (locale === "nl" ? nlMessages : enMessages).landing;

  const FEATURES = [
    { icon: "🏛️", title: landing.features.palace3d, desc: landing.features.palace3dDesc },
    { icon: "🎙️", title: landing.features.aiInterviews, desc: landing.features.aiInterviewsDesc },
    { icon: "☁️", title: landing.features.cloudImport, desc: landing.features.cloudImportDesc },
    { icon: "⏳", title: landing.features.timeCapsules, desc: landing.features.timeCapsuleDesc },
    { icon: "👨‍👩‍👧‍👦", title: landing.features.sharingTitle, desc: landing.features.sharingDesc },
    { icon: "🕊️", title: landing.features.legacyTitle, desc: landing.features.legacyDesc },
  ];

  const STEPS = [
    { num: "01", title: landing.howItWorks.step1Title, desc: landing.howItWorks.step1Desc },
    { num: "02", title: landing.howItWorks.step2Title, desc: landing.howItWorks.step2Desc },
    { num: "03", title: landing.howItWorks.step3Title, desc: landing.howItWorks.step3Desc },
  ];

  const TESTIMONIALS = [
    { quote: landing.testimonials.quote1, name: landing.testimonials.author1, role: landing.testimonials.role1 },
    { quote: landing.testimonials.quote2, name: landing.testimonials.author2, role: landing.testimonials.role2 },
    { quote: landing.testimonials.quote3, name: landing.testimonials.author3, role: landing.testimonials.role3 },
    { quote: landing.testimonials.quote4, name: landing.testimonials.author4, role: landing.testimonials.role4 },
  ];

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const headerOpaque = scrollY > 60;

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
      {/* ─── Sticky Nav ─── */}
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
          borderBottom: headerOpaque ? `1px solid ${C.sandstone}40` : "none",
          transition: "all 0.3s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontSize: "1.375rem" }}>🏛️</span>
          <span
            style={{
              fontFamily: F.display,
              fontSize: "1.25rem",
              fontWeight: 500,
              color: C.charcoal,
              letterSpacing: "-0.3px",
            }}
          >
            {landing.title}
          </span>
        </div>
        <div style={{ display: "flex", gap: isMobile ? "0.5rem" : "0.75rem", alignItems: "center" }}>
          {!isSmall && <Link href="/pricing" style={navLink}>
            {landing.nav.pricing}
          </Link>}
          {!isSmall && <Link href="/login" style={navLink}>
            {landing.nav.signIn}
          </Link>}
          <Link href="/register" style={{...navCta, padding: isMobile ? "0.625rem 1.125rem" : "0.5rem 1.25rem"}}>
            {landing.nav.getStarted}
          </Link>
        </div>
      </nav>

      <main id="main-content">
      {/* ─── Hero ─── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: isMobile ? "5rem 1.25rem 3.125rem" : "6.25rem clamp(1.25rem, 5vw, 3.75rem) 3.75rem",
          background: `radial-gradient(ellipse at 50% 30%, ${C.warmStone}, ${C.linen} 70%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative floating orbs */}
        <div style={orbStyle(80, "8%", "15%", 0.12)} />
        <div style={orbStyle(120, "85%", "20%", 0.08)} />
        <div style={orbStyle(50, "20%", "75%", 0.1)} />
        <div style={orbStyle(70, "75%", "70%", 0.06)} />

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
          {landing.hero.headline}
        </p>
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
          <Link href="/register" style={{...heroCta, width: isSmall ? "100%" : undefined, textAlign: "center" as const, minHeight: "3rem", display: "flex", alignItems: "center", justifyContent: "center"}}>
            {landing.hero.cta}
          </Link>
          <a href="#how-it-works" style={{...heroSecondary, width: isSmall ? "100%" : undefined, textAlign: "center" as const, minHeight: "3rem", display: "flex", alignItems: "center", justifyContent: "center"}}>
            {landing.hero.secondaryCta}
          </a>
        </div>

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
          🔒 {landing.hero.securityLink}
        </Link>

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

      {/* ─── Features ─── */}
      <section
        id="features"
        style={{
          padding: "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
          maxWidth: "68.75rem",
          margin: "0 auto",
        }}
      >
        <p style={sectionLabel}>{landing.features.title}</p>
        <h2 style={sectionTitle}>{landing.features.subtitle}</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
            gap: isMobile ? "1.25rem" : "2rem",
            marginTop: isMobile ? "2.25rem" : "3.5rem",
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} style={featureCard}>
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.875rem" }}>
                {f.icon}
              </span>
              <h3 style={featureTitle}>{f.title}</h3>
              <p style={featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        id="how-it-works"
        style={{
          padding: "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
          background: C.warmStone,
        }}
      >
        <div style={{ maxWidth: "56.25rem", margin: "0 auto" }}>
          <p style={sectionLabel}>{landing.howItWorks.title}</p>
          <h2 style={sectionTitle}>{landing.howItWorks.subtitle}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2.5rem",
              marginTop: "3.5rem",
            }}
          >
            {STEPS.map((s) => (
              <div key={s.num} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: "3rem",
                    fontWeight: 300,
                    color: C.terracotta,
                    opacity: 0.4,
                    marginBottom: "0.75rem",
                  }}
                >
                  {s.num}
                </div>
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
                    lineHeight: 1.5,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── See It In Action ─── */}
      <section
        id="see-it-in-action"
        style={{
          padding: isMobile ? "3.75rem 1.25rem 5rem" : "5rem clamp(1.25rem, 5vw, 3.75rem) 6.25rem",
          background: C.linen,
          textAlign: "center",
        }}
      >
        <p style={sectionLabel}>{landing.preview.title}</p>
        <h2 style={sectionTitle}>{landing.preview.subtitle}</h2>
        <p
          style={{
            fontSize: "1rem",
            color: C.walnut,
            maxWidth: "32.5rem",
            margin: "1rem auto 2.5rem",
            lineHeight: 1.6,
          }}
        >
          {landing.preview.description}
        </p>

        {/* Video or static preview */}
        {process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ? (
          <div
            style={{
              maxWidth: "50rem",
              margin: "0 auto 3rem",
              borderRadius: "1.25rem",
              overflow: "hidden",
              background: C.charcoal,
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              border: `1px solid ${C.sandstone}60`,
            }}
          >
            <iframe
              src={process.env.NEXT_PUBLIC_DEMO_VIDEO_URL}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={landing.preview.videoAlt}
            />
          </div>
        ) : (
          /* Static preview gallery — 4 mockup cards */
          <div
            style={{
              maxWidth: "56.25rem",
              margin: "0 auto 3rem",
              display: "grid",
              gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
              gap: isMobile ? "1rem" : "1.25rem",
            }}
          >
            {[
              {
                label: landing.preview.exterior,
                desc: landing.preview.exteriorDesc,
                gradient: `linear-gradient(135deg, ${C.sage}30, ${C.warmStone})`,
                icon: "🏛️",
              },
              {
                label: landing.preview.corridor,
                desc: landing.preview.corridorDesc,
                gradient: `linear-gradient(135deg, ${C.sandstone}60, ${C.cream})`,
                icon: "🚪",
              },
              {
                label: landing.preview.room,
                desc: landing.preview.roomDesc,
                gradient: `linear-gradient(135deg, ${C.terracotta}25, ${C.warmStone})`,
                icon: "🖼️",
              },
              {
                label: landing.preview.upload,
                desc: landing.preview.uploadDesc,
                gradient: `linear-gradient(135deg, ${C.walnut}20, ${C.cream})`,
                icon: "☁️",
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: card.gradient,
                  borderRadius: "1rem",
                  padding: isMobile ? "2.25rem 1.25rem" : "3rem 1.75rem",
                  border: `1px solid ${C.sandstone}40`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: isMobile ? "8.75rem" : "11.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2.5rem",
                    display: "block",
                    marginBottom: "0.875rem",
                  }}
                >
                  {card.icon}
                </span>
                <p
                  style={{
                    fontFamily: F.display,
                    fontSize: "1.25rem",
                    fontWeight: 500,
                    color: C.charcoal,
                    marginBottom: "0.375rem",
                  }}
                >
                  {card.label}
                </p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: C.walnut,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Palace wing cards beneath */}
        <div
          style={{
            maxWidth: "50rem",
            margin: "0 auto",
            borderRadius: "1.25rem",
            overflow: "hidden",
            background: `linear-gradient(160deg, ${C.warmStone}, ${C.sandstone}40)`,
            border: `1px solid ${C.sandstone}60`,
            padding: isMobile ? "2rem 1.25rem" : "3rem 2.5rem",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmall ? "1fr" : "repeat(3, 1fr)",
              gap: isMobile ? "1rem" : "1.5rem",
            }}
          >
            {[
              { label: landing.preview.familyWing, icon: "👨‍👩‍👧‍👦", count: landing.preview.familyMemories },
              { label: landing.preview.travelWing, icon: "✈️", count: landing.preview.travelMemories },
              { label: landing.preview.childhoodWing, icon: "🧒", count: landing.preview.childhoodMemories },
            ].map((room) => (
              <div
                key={room.label}
                style={{
                  background: C.white,
                  borderRadius: "0.875rem",
                  padding: isMobile ? "1.5rem 1rem" : "1.75rem 1.25rem",
                  border: `1px solid ${C.sandstone}40`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ fontSize: "2.25rem", display: "block", marginBottom: "0.625rem" }}>
                  {room.icon}
                </span>
                <p
                  style={{
                    fontFamily: F.display,
                    fontSize: "1.125rem",
                    fontWeight: 500,
                    color: C.charcoal,
                    marginBottom: "0.25rem",
                  }}
                >
                  {room.label}
                </p>
                <p style={{ fontSize: "0.8125rem", color: C.muted }}>{room.count}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: isMobile ? "1.25rem" : "1.75rem",
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {[0.3, 0.5, 0.8, 1, 0.8, 0.5, 0.3].map((o, i) => (
              <div
                key={i}
                style={{
                  width: "0.375rem",
                  height: "0.375rem",
                  borderRadius: "50%",
                  background: C.terracotta,
                  opacity: o,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: "0.625rem" }}>
            {landing.preview.interactiveWalkthrough}
          </p>
        </div>
      </section>

      {/* ─── Target Audiences ─── */}
      <section
        style={{
          padding: "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
          maxWidth: "68.75rem",
          margin: "0 auto",
        }}
      >
        <p style={sectionLabel}>{landing.audience.title}</p>
        <h2 style={sectionTitle}>{landing.audience.subtitle}</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.75rem",
            marginTop: "3.5rem",
          }}
        >
          {[
            {
              icon: "👵",
              title: landing.audience.keepersTitle,
              desc: landing.audience.keepersDesc,
              accent: C.sage,
            },
            {
              icon: "👨‍👩‍👧",
              title: landing.audience.guardiansTitle,
              desc: landing.audience.guardiansDesc,
              accent: C.terracotta,
            },
            {
              icon: "📸",
              title: landing.audience.archivistsTitle,
              desc: landing.audience.archivistsDesc,
              accent: C.walnut,
            },
          ].map((a) => (
            <div
              key={a.title}
              style={{
                background: C.white,
                borderRadius: "1rem",
                padding: "2.25rem 1.75rem",
                border: `1px solid ${C.sandstone}60`,
                borderTop: `3px solid ${a.accent}`,
              }}
            >
              <span style={{ fontSize: "2.25rem", display: "block", marginBottom: "1rem" }}>
                {a.icon}
              </span>
              <h3
                style={{
                  fontFamily: F.display,
                  fontSize: "1.375rem",
                  fontWeight: 500,
                  color: C.charcoal,
                  marginBottom: "0.625rem",
                }}
              >
                {a.title}
              </h3>
              <p style={{ fontSize: "0.9375rem", color: C.walnut, lineHeight: 1.6 }}>
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section
        style={{
          padding: "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
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
                {/* Quote mark */}
                <div>
                  <span
                    style={{
                      fontFamily: F.display,
                      fontSize: "3rem",
                      color: C.terracotta,
                      opacity: 0.5,
                      lineHeight: 1,
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    &ldquo;
                  </span>
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {/* Avatar placeholder */}
                  <div
                    style={{
                      width: "2.625rem",
                      height: "2.625rem",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.terracotta}40, ${C.sage}30)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.125rem",
                      flexShrink: 0,
                    }}
                  >
                    {tm.name.charAt(0)}
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
                    <p style={{ fontSize: "0.75rem", color: C.terracotta }}>{tm.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section
        style={{
          padding: "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
          textAlign: "center",
          background: C.linen,
        }}
      >
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
            margin: "0 auto 2.25rem",
            lineHeight: 1.6,
          }}
        >
          {landing.cta.description}
        </p>
        <Link href="/register" style={heroCta}>
          {landing.cta.button}
        </Link>
      </section>
      </main>

      {/* ─── Footer ─── */}
      <footer
        style={{
          padding: isMobile ? "2.5rem 1.25rem 1.75rem" : "3.5rem clamp(1.25rem, 5vw, 3.75rem) 2.25rem",
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🏛️</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: "1.125rem",
                  color: C.linen,
                  fontWeight: 500,
                }}
              >
                {landing.title}
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.7, maxWidth: "21.25rem" }}>
              {landing.footer.about}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p style={{ fontSize: "0.75rem", letterSpacing: "1.5px", textTransform: "uppercase", color: C.sandstone, fontWeight: 600, marginBottom: "1rem" }}>
              {landing.footer.quickLinks}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <a href="#features" style={{ fontSize: "0.875rem", color: C.muted, textDecoration: "none" }}>
                {landing.footer.features}
              </a>
              <a href="#how-it-works" style={{ fontSize: "0.875rem", color: C.muted, textDecoration: "none" }}>
                {landing.footer.howItWorks}
              </a>
              <Link href="/pricing" style={{ fontSize: "0.875rem", color: C.muted, textDecoration: "none" }}>
                {landing.footer.pricing}
              </Link>
              <Link href="/login" style={{ fontSize: "0.875rem", color: C.muted, textDecoration: "none" }}>
                {landing.footer.signIn}
              </Link>
              <Link href="/register" style={{ fontSize: "0.875rem", color: C.terracotta, textDecoration: "none" }}>
                {landing.footer.getStartedFree}
              </Link>
            </div>
          </div>

          {/* Contact / trust */}
          <div>
            <p style={{ fontSize: "0.75rem", letterSpacing: "1.5px", textTransform: "uppercase", color: C.sandstone, fontWeight: 600, marginBottom: "1rem" }}>
              {landing.footer.trustSecurity}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.5 }}>
                🔒 {landing.footer.euHosted}
              </p>
              <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.5 }}>
                🛡️ {landing.footer.encryption}
              </p>
              <p style={{ fontSize: "0.875rem", color: C.muted, lineHeight: 1.5 }}>
                📋 {landing.footer.gdpr}
              </p>
              <Link href="/security" style={{ fontSize: "0.875rem", color: C.terracotta, textDecoration: "none", marginTop: "0.25rem" }}>
                {landing.footer.learnSecurity} →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `1px solid rgba(255,255,255,0.08)`,
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
            <Link href="/privacy" style={{ fontSize: "0.75rem", color: C.muted, textDecoration: "none" }}>
              {landing.footer.privacyPolicy}
            </Link>
            <Link href="/terms" style={{ fontSize: "0.75rem", color: C.muted, textDecoration: "none" }}>
              {landing.footer.termsOfService}
            </Link>
            <Link href="/login" style={{ fontSize: "0.75rem", color: C.muted, textDecoration: "none" }}>
              {landing.footer.signIn}
            </Link>
            <Link href="/register" style={{ fontSize: "0.75rem", color: C.terracotta, textDecoration: "none" }}>
              {landing.nav.getStarted}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Style Constants ─── */

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
  transition: "box-shadow 0.2s",
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

function orbStyle(
  size: number,
  left: string,
  top: string,
  opacity: number
): React.CSSProperties {
  const rem = `${size / 16}rem`;
  return {
    position: "absolute",
    width: rem,
    height: rem,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${C.terracotta}30, transparent 70%)`,
    left,
    top,
    opacity,
    pointerEvents: "none",
  };
}
