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
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(20px, 5vw, 60px)",
          height: 64,
          background: headerOpaque ? "rgba(250,250,247,0.92)" : "transparent",
          backdropFilter: headerOpaque ? "blur(12px)" : "none",
          borderBottom: headerOpaque ? `1px solid ${C.sandstone}40` : "none",
          transition: "all 0.3s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            {landing.title}
          </span>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center" }}>
          {!isSmall && <Link href="/pricing" style={navLink}>
            {landing.nav.pricing}
          </Link>}
          {!isSmall && <Link href="/login" style={navLink}>
            {landing.nav.signIn}
          </Link>}
          <Link href="/register" style={{...navCta, padding: isMobile ? "10px 18px" : "8px 20px"}}>
            {landing.nav.getStarted}
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: isMobile ? "80px 20px 50px" : "100px clamp(20px, 5vw, 60px) 60px",
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
            fontSize: 13,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            color: C.terracotta,
            fontWeight: 600,
            marginBottom: 20,
            animation: "fadeUp 0.8s ease both",
          }}
        >
          {landing.hero.headline}
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 300,
            lineHeight: 1.1,
            maxWidth: 850,
            margin: "0 auto 24px",
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
            fontSize: "clamp(17px, 2.2vw, 21px)",
            color: C.walnut,
            maxWidth: 600,
            lineHeight: 1.7,
            marginBottom: 40,
            animation: "fadeUp 0.8s ease 0.2s both",
          }}
        >
          {landing.hero.description}
        </p>
        <div
          style={{
            display: "flex",
            gap: isMobile ? 10 : 14,
            flexWrap: "wrap",
            flexDirection: isSmall ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            animation: "fadeUp 0.8s ease 0.3s both",
            width: isSmall ? "100%" : undefined,
          }}
        >
          <Link href="/register" style={{...heroCta, width: isSmall ? "100%" : undefined, textAlign: "center" as const, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center"}}>
            {landing.hero.cta}
          </Link>
          <a href="#how-it-works" style={{...heroSecondary, width: isSmall ? "100%" : undefined, textAlign: "center" as const, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center"}}>
            {landing.hero.secondaryCta}
          </a>
        </div>

        <Link
          href="/security"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 20,
            fontSize: 14,
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
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            opacity: scrollY > 50 ? 0 : 0.5,
            transition: "opacity 0.3s",
          }}
        >
          <span style={{ fontSize: 11, color: C.muted, letterSpacing: 1 }}>
            {landing.scroll}
          </span>
          <div
            style={{
              width: 1,
              height: 28,
              background: `linear-gradient(to bottom, ${C.muted}, transparent)`,
            }}
          />
        </div>
      </section>

      {/* ─── Features ─── */}
      <section
        id="features"
        style={{
          padding: "100px clamp(20px, 5vw, 60px)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <p style={sectionLabel}>{landing.features.title}</p>
        <h2 style={sectionTitle}>{landing.features.subtitle}</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
            gap: isMobile ? 20 : 32,
            marginTop: isMobile ? 36 : 56,
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} style={featureCard}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 14 }}>
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
          padding: "100px clamp(20px, 5vw, 60px)",
          background: C.warmStone,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={sectionLabel}>{landing.howItWorks.title}</p>
          <h2 style={sectionTitle}>{landing.howItWorks.subtitle}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 40,
              marginTop: 56,
            }}
          >
            {STEPS.map((s) => (
              <div key={s.num} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: 48,
                    fontWeight: 300,
                    color: C.terracotta,
                    opacity: 0.4,
                    marginBottom: 12,
                  }}
                >
                  {s.num}
                </div>
                <h3
                  style={{
                    fontFamily: F.display,
                    fontSize: 22,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: C.charcoal,
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
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
          padding: isMobile ? "60px 20px 80px" : "80px clamp(20px, 5vw, 60px) 100px",
          background: C.linen,
          textAlign: "center",
        }}
      >
        <p style={sectionLabel}>{landing.preview.title}</p>
        <h2 style={sectionTitle}>{landing.preview.subtitle}</h2>
        <p
          style={{
            fontSize: 16,
            color: C.walnut,
            maxWidth: 520,
            margin: "16px auto 40px",
            lineHeight: 1.6,
          }}
        >
          {landing.preview.description}
        </p>

        {/* Video or static preview */}
        {process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ? (
          <div
            style={{
              maxWidth: 800,
              margin: "0 auto 48px",
              borderRadius: 20,
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
              maxWidth: 900,
              margin: "0 auto 48px",
              display: "grid",
              gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
              gap: isMobile ? 16 : 20,
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
                  borderRadius: 16,
                  padding: isMobile ? "36px 20px" : "48px 28px",
                  border: `1px solid ${C.sandstone}40`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: isMobile ? 140 : 180,
                }}
              >
                <span
                  style={{
                    fontSize: 40,
                    display: "block",
                    marginBottom: 14,
                  }}
                >
                  {card.icon}
                </span>
                <p
                  style={{
                    fontFamily: F.display,
                    fontSize: 20,
                    fontWeight: 500,
                    color: C.charcoal,
                    marginBottom: 6,
                  }}
                >
                  {card.label}
                </p>
                <p
                  style={{
                    fontSize: 14,
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
            maxWidth: 800,
            margin: "0 auto",
            borderRadius: 20,
            overflow: "hidden",
            background: `linear-gradient(160deg, ${C.warmStone}, ${C.sandstone}40)`,
            border: `1px solid ${C.sandstone}60`,
            padding: isMobile ? "32px 20px" : "48px 40px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmall ? "1fr" : "repeat(3, 1fr)",
              gap: isMobile ? 16 : 24,
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
                  borderRadius: 14,
                  padding: isMobile ? "24px 16px" : "28px 20px",
                  border: `1px solid ${C.sandstone}40`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ fontSize: 36, display: "block", marginBottom: 10 }}>
                  {room.icon}
                </span>
                <p
                  style={{
                    fontFamily: F.display,
                    fontSize: 18,
                    fontWeight: 500,
                    color: C.charcoal,
                    marginBottom: 4,
                  }}
                >
                  {room.label}
                </p>
                <p style={{ fontSize: 13, color: C.muted }}>{room.count}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: isMobile ? 20 : 28,
              display: "flex",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {[0.3, 0.5, 0.8, 1, 0.8, 0.5, 0.3].map((o, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.terracotta,
                  opacity: o,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
            {landing.preview.interactiveWalkthrough}
          </p>
        </div>
      </section>

      {/* ─── Target Audiences ─── */}
      <section
        style={{
          padding: "100px clamp(20px, 5vw, 60px)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <p style={sectionLabel}>{landing.audience.title}</p>
        <h2 style={sectionTitle}>{landing.audience.subtitle}</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
            marginTop: 56,
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
                borderRadius: 16,
                padding: "36px 28px",
                border: `1px solid ${C.sandstone}60`,
                borderTop: `3px solid ${a.accent}`,
              }}
            >
              <span style={{ fontSize: 36, display: "block", marginBottom: 16 }}>
                {a.icon}
              </span>
              <h3
                style={{
                  fontFamily: F.display,
                  fontSize: 22,
                  fontWeight: 500,
                  color: C.charcoal,
                  marginBottom: 10,
                }}
              >
                {a.title}
              </h3>
              <p style={{ fontSize: 15, color: C.walnut, lineHeight: 1.6 }}>
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section
        style={{
          padding: "100px clamp(20px, 5vw, 60px)",
          background: `linear-gradient(135deg, ${C.charcoal}, #3D3D3A)`,
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
              gap: 24,
              marginTop: 56,
            }}
          >
            {TESTIMONIALS.map((tm) => (
              <div
                key={tm.name}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: isMobile ? "28px 24px" : "32px 28px",
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
                      fontSize: 48,
                      color: C.terracotta,
                      opacity: 0.5,
                      lineHeight: 1,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    &ldquo;
                  </span>
                  <p
                    style={{
                      fontSize: 16,
                      color: C.cream,
                      lineHeight: 1.7,
                      marginBottom: 24,
                    }}
                  >
                    {tm.quote}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar placeholder */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.terracotta}40, ${C.sage}30)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {tm.name.charAt(0)}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.linen,
                        marginBottom: 2,
                      }}
                    >
                      {tm.name}
                    </p>
                    <p style={{ fontSize: 12, color: C.terracotta }}>{tm.role}</p>
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
          padding: "100px clamp(20px, 5vw, 60px)",
          textAlign: "center",
          background: C.linen,
        }}
      >
        <h2
          style={{
            fontFamily: F.display,
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 300,
            color: C.charcoal,
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          {landing.cta.title}
        </h2>
        <p
          style={{
            fontSize: 17,
            color: C.walnut,
            maxWidth: 480,
            margin: "0 auto 36px",
            lineHeight: 1.6,
          }}
        >
          {landing.cta.description}
        </p>
        <Link href="/register" style={heroCta}>
          {landing.cta.button}
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          padding: isMobile ? "40px 20px 28px" : "56px clamp(20px, 5vw, 60px) 36px",
          borderTop: `1px solid ${C.sandstone}40`,
          background: C.charcoal,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "2fr 1fr 1fr",
            gap: isSmall ? 32 : 48,
            marginBottom: 40,
          }}
        >
          {/* About */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>🏛️</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 18,
                  color: C.linen,
                  fontWeight: 500,
                }}
              >
                {landing.title}
              </span>
            </div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 340 }}>
              {landing.footer.about}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p style={{ fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", color: C.sandstone, fontWeight: 600, marginBottom: 16 }}>
              {landing.footer.quickLinks}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#features" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                {landing.footer.features}
              </a>
              <a href="#how-it-works" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                {landing.footer.howItWorks}
              </a>
              <Link href="/pricing" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                {landing.footer.pricing}
              </Link>
              <Link href="/login" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                {landing.footer.signIn}
              </Link>
              <Link href="/register" style={{ fontSize: 14, color: C.terracotta, textDecoration: "none" }}>
                {landing.footer.getStartedFree}
              </Link>
            </div>
          </div>

          {/* Contact / trust */}
          <div>
            <p style={{ fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", color: C.sandstone, fontWeight: 600, marginBottom: 16 }}>
              {landing.footer.trustSecurity}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                🔒 {landing.footer.euHosted}
              </p>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                🛡️ {landing.footer.encryption}
              </p>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                📋 {landing.footer.gdpr}
              </p>
              <Link href="/security" style={{ fontSize: 14, color: C.terracotta, textDecoration: "none", marginTop: 4 }}>
                {landing.footer.learnSecurity} →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `1px solid rgba(255,255,255,0.08)`,
            paddingTop: 20,
            display: "flex",
            justifyContent: isSmall ? "center" : "space-between",
            alignItems: "center",
            flexDirection: isSmall ? "column" : "row",
            gap: 10,
          }}
        >
          <p style={{ fontSize: 12, color: C.muted }}>
            &copy; {new Date().getFullYear()} {landing.footer.copyright}
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/privacy" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
              {landing.footer.privacyPolicy}
            </Link>
            <Link href="/terms" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
              {landing.footer.termsOfService}
            </Link>
            <Link href="/login" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
              {landing.footer.signIn}
            </Link>
            <Link href="/register" style={{ fontSize: 12, color: C.terracotta, textDecoration: "none" }}>
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
  fontSize: 14,
  color: C.walnut,
  textDecoration: "none",
  padding: "8px 16px",
  borderRadius: 8,
  transition: "color 0.2s",
};

const navCta: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 14,
  fontWeight: 600,
  color: C.white,
  textDecoration: "none",
  padding: "8px 20px",
  borderRadius: 10,
  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
};

const heroCta: React.CSSProperties = {
  display: "inline-block",
  fontFamily: F.body,
  fontSize: 16,
  fontWeight: 600,
  color: C.white,
  textDecoration: "none",
  padding: "16px 36px",
  borderRadius: 14,
  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
  boxShadow: "0 4px 20px rgba(193,127,89,0.3)",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const heroSecondary: React.CSSProperties = {
  display: "inline-block",
  fontFamily: F.body,
  fontSize: 16,
  fontWeight: 500,
  color: C.walnut,
  textDecoration: "none",
  padding: "16px 36px",
  borderRadius: 14,
  border: `1.5px solid ${C.sandstone}`,
  transition: "border-color 0.2s",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 12,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: C.terracotta,
  fontWeight: 600,
  textAlign: "center",
  marginBottom: 12,
};

const sectionTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: "clamp(26px, 3.5vw, 40px)",
  fontWeight: 300,
  textAlign: "center",
  color: C.charcoal,
  lineHeight: 1.2,
};

const featureCard: React.CSSProperties = {
  background: C.white,
  borderRadius: 16,
  padding: "32px 28px",
  border: `1px solid ${C.sandstone}50`,
  transition: "box-shadow 0.2s",
};

const featureTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: 20,
  fontWeight: 500,
  color: C.charcoal,
  marginBottom: 8,
};

const featureDesc: React.CSSProperties = {
  fontSize: 14,
  color: C.walnut,
  lineHeight: 1.6,
};

function orbStyle(
  size: number,
  left: string,
  top: string,
  opacity: number
): React.CSSProperties {
  return {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${C.terracotta}30, transparent 70%)`,
    left,
    top,
    opacity,
    pointerEvents: "none",
  };
}
