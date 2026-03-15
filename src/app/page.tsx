"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";

/* ───────── tiny helpers ───────── */
const F = T.font;
const C = T.color;

const FEATURES = [
  {
    icon: "🏛️",
    title: "Immersive 3D Palace",
    desc: "Walk through a stunning Tuscan villa with wings dedicated to Family, Travel, Childhood, Career, and Creativity.",
  },
  {
    icon: "🖼️",
    title: "Living Memories",
    desc: "Photos hang as framed paintings, videos play on cinema screens, audio fills vinyl sleeves — your memories come alive.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Curation",
    desc: "Import thousands of photos and let AI sort them into the right wings and rooms, with smart titles and descriptions.",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Co-Create with Family",
    desc: "Invite loved ones to contribute memories to shared rooms. Build your family legacy together.",
  },
  {
    icon: "⏳",
    title: "Time Capsules",
    desc: "Seal memories to be revealed on a future date. Leave surprises for your children, grandchildren, or your future self.",
  },
  {
    icon: "🔒",
    title: "Secure & Private",
    desc: "EU-hosted infrastructure with row-level security. Your memories belong to you — always.",
  },
];

const STEPS = [
  { num: "01", title: "Create Your Palace", desc: "Sign up and tell us what matters most to you." },
  { num: "02", title: "Fill Your Rooms", desc: "Upload photos, videos, and stories — or import in bulk with AI." },
  { num: "03", title: "Explore & Share", desc: "Walk through your 3D palace and invite loved ones to join." },
];

const TESTIMONIALS = [
  {
    quote: "I finally have a place where all my family photos feel like they belong — not just files on a hard drive.",
    name: "Margaret, 68",
    role: "Heritage Keeper",
  },
  {
    quote: "Being able to create time capsules for my kids to open on their 18th birthday is incredibly meaningful.",
    name: "David, 42",
    role: "Legacy Guardian",
  },
  {
    quote: "The AI import saved me weeks. It sorted 12,000 photos into the right rooms in minutes.",
    name: "Anika, 35",
    role: "Digital Archivist",
  },
];

export default function LandingPage() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const [scrollY, setScrollY] = useState(0);

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
            The Memory Palace
          </span>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center" }}>
          {!isSmall && <Link href="/login" style={navLink}>
            Sign In
          </Link>}
          <Link href="/register" style={{...navCta, padding: isMobile ? "10px 18px" : "8px 20px"}}>
            Get Started
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
          Embrace Eternity
        </p>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 300,
            lineHeight: 1.1,
            maxWidth: 800,
            margin: "0 auto 24px",
            color: C.charcoal,
            animation: "fadeUp 0.8s ease 0.1s both",
          }}
        >
          Your memories deserve
          <br />
          <span style={{ fontStyle: "italic", color: C.terracotta }}>
            a palace
          </span>
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: C.walnut,
            maxWidth: 560,
            lineHeight: 1.6,
            marginBottom: 40,
            animation: "fadeUp 0.8s ease 0.2s both",
          }}
        >
          A beautiful 3D sanctuary to preserve your photos, videos, and stories
          — in a place as unique as your life. Built for families, dreamers, and
          legacy builders.
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
            Start Building Your Palace
          </Link>
          <a href="#features" style={{...heroSecondary, width: isSmall ? "100%" : undefined, textAlign: "center" as const, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center"}}>
            See How It Works
          </a>
        </div>

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
            SCROLL
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
        <p style={sectionLabel}>What makes it special</p>
        <h2 style={sectionTitle}>More than storage. A living legacy.</h2>

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
        style={{
          padding: "100px clamp(20px, 5vw, 60px)",
          background: C.warmStone,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={sectionLabel}>Getting started</p>
          <h2 style={sectionTitle}>Three simple steps</h2>

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

      {/* ─── Target Audiences ─── */}
      <section
        style={{
          padding: "100px clamp(20px, 5vw, 60px)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <p style={sectionLabel}>Who it&apos;s for</p>
        <h2 style={sectionTitle}>Built for those who care about legacy</h2>

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
              title: "Heritage Keepers",
              desc: "Individuals 60+ who want to organize a lifetime of memories into a visualized legacy for future generations.",
              accent: C.sage,
            },
            {
              icon: "👨‍👩‍👧",
              title: "Legacy Guardians",
              desc: "Parents and grandparents who want to ensure their stories, messages, and memories live on — no matter what.",
              accent: C.terracotta,
            },
            {
              icon: "📸",
              title: "Digital Archivists",
              desc: "Anyone drowning in 50,000 photos across devices who wants AI-powered organization in a meaningful space.",
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
            What people say
          </p>
          <h2 style={{ ...sectionTitle, color: C.linen }}>
            Stories from our community
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 28,
              marginTop: 56,
            }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: "32px 28px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p
                  style={{
                    fontSize: 16,
                    color: C.cream,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    marginBottom: 20,
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.linen,
                      marginBottom: 2,
                    }}
                  >
                    {t.name}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted }}>{t.role}</p>
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
          Ready to preserve your legacy?
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
          Start for free. No credit card required. Your memories are waiting for
          a home.
        </p>
        <Link href="/register" style={heroCta}>
          Create Your Memory Palace
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          padding: isMobile ? "28px 20px" : "40px clamp(20px, 5vw, 60px)",
          borderTop: `1px solid ${C.sandstone}40`,
          display: "flex",
          justifyContent: isSmall ? "center" : "space-between",
          alignItems: "center",
          flexDirection: isSmall ? "column" : "row",
          flexWrap: "wrap",
          gap: 16,
          background: C.linen,
          textAlign: isSmall ? "center" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏛️</span>
          <span
            style={{
              fontFamily: F.display,
              fontSize: 15,
              color: C.walnut,
            }}
          >
            The Memory Palace
          </span>
        </div>
        <p style={{ fontSize: 12, color: C.muted }}>
          &copy; {new Date().getFullYear()} The Memory Palace. Embrace Eternity.
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/login" style={{ fontSize: 13, color: C.walnut, textDecoration: "none" }}>
            Sign In
          </Link>
          <Link href="/register" style={{ fontSize: 13, color: C.terracotta, textDecoration: "none" }}>
            Get Started
          </Link>
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
