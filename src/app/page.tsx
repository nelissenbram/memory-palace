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
    title: "3D Memory Palace",
    desc: "Walk through a breathtaking virtual villa with wings for Family, Travel, Childhood, Career, and Creativity. Your memories displayed as art in an immersive 3D world.",
  },
  {
    icon: "🎙️",
    title: "AI-Powered Interviews",
    desc: "Our gentle AI interviewer guides you through your life story, asking the right questions to capture memories you might have forgotten. Like talking to a thoughtful friend.",
  },
  {
    icon: "☁️",
    title: "Cloud Import",
    desc: "Connect Google Photos, Dropbox, OneDrive, or Box and let AI sort thousands of photos into the right rooms — automatically organized with smart titles and dates.",
  },
  {
    icon: "⏳",
    title: "Time Capsules",
    desc: "Seal memories to be revealed on a future date. Leave a birthday message for your grandchild, or a letter to be opened in 2050. The future will thank you.",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Sharing & Co-Creation",
    desc: "Invite family members to contribute their own memories to shared rooms. Build your collective story together, across generations and continents.",
  },
  {
    icon: "🕊️",
    title: "Legacy Planning",
    desc: "Designate heirs for your palace. Record video messages, write letters, and ensure your story lives on — preserved with care, for those who matter most.",
  },
];

const STEPS = [
  { num: "01", title: "Create Your Palace", desc: "Sign up for free and choose your palace style. Tell us about the chapters of your life — we will create personalized wings and rooms." },
  { num: "02", title: "Fill Rooms with Memories", desc: "Upload photos and videos, record stories, or import directly from Google Photos or Dropbox. AI helps organize everything beautifully." },
  { num: "03", title: "Share with Loved Ones", desc: "Invite family to explore your palace, contribute their own memories, and experience your life story in immersive 3D." },
];

const TESTIMONIALS = [
  {
    quote: "After my husband passed, I thought those memories would fade. Now I walk through our palace together with my grandchildren, and it feels like he is still here with us.",
    name: "Margaret van den Berg, 72",
    role: "Heritage Keeper",
  },
  {
    quote: "I recorded messages for each of my children to receive on their wedding day. Knowing those words are safe, sealed, and waiting — that gives me real peace.",
    name: "Robert Hendriks, 65",
    role: "Heritage Keeper",
  },
  {
    quote: "My mother has dementia, but together we built her palace from old photo albums. On good days, walking through the rooms brings back stories I had never heard before.",
    name: "Elisabeth Janssen, 44",
    role: "Legacy Guardian",
  },
  {
    quote: "We imported 15,000 family photos from three decades. The AI sorted everything in under an hour. It would have taken me months.",
    name: "Karel de Vries, 58",
    role: "Legacy Guardian",
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
          {!isSmall && <Link href="/pricing" style={navLink}>
            Pricing
          </Link>}
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
          Preserve Your Memories for Eternity
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
          Your life story deserves
          <br />
          <span style={{ fontStyle: "italic", color: C.terracotta }}>
            more than a folder
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
          Build a beautiful 3D palace for your photos, videos, and stories.
          Walk through your memories in an immersive virtual space — and share
          them with the people who matter most.
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
            Get Started Free
          </Link>
          <a href="#how-it-works" style={{...heroSecondary, width: isSmall ? "100%" : undefined, textAlign: "center" as const, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center"}}>
            See How It Works
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
          🔒 Learn about our security
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
        id="how-it-works"
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

      {/* ─── See It In Action ─── */}
      <section
        id="see-it-in-action"
        style={{
          padding: isMobile ? "60px 20px 80px" : "80px clamp(20px, 5vw, 60px) 100px",
          background: C.linen,
          textAlign: "center",
        }}
      >
        <p style={sectionLabel}>See it in action</p>
        <h2 style={sectionTitle}>A glimpse inside your palace</h2>
        <p
          style={{
            fontSize: 16,
            color: C.walnut,
            maxWidth: 520,
            margin: "16px auto 40px",
            lineHeight: 1.6,
          }}
        >
          Imagine walking through elegant rooms where every photo, video, and
          story has its place — beautifully displayed in 3D.
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
              title="Memory Palace demo video"
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
                label: "Exterior View",
                desc: "Your palace, nestled in a serene landscape",
                gradient: `linear-gradient(135deg, ${C.sage}30, ${C.warmStone})`,
                icon: "🏛️",
              },
              {
                label: "Grand Corridor",
                desc: "Walk through themed wings of your life",
                gradient: `linear-gradient(135deg, ${C.sandstone}60, ${C.cream})`,
                icon: "🚪",
              },
              {
                label: "Room Interior",
                desc: "Memories displayed as art on the walls",
                gradient: `linear-gradient(135deg, ${C.terracotta}25, ${C.warmStone})`,
                icon: "🖼️",
              },
              {
                label: "Upload Panel",
                desc: "Drag, drop, or import from cloud services",
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
              { label: "Family Wing", icon: "👨‍👩‍👧‍👦", count: "243 memories" },
              { label: "Travel Wing", icon: "✈️", count: "186 memories" },
              { label: "Childhood Wing", icon: "🧒", count: "128 memories" },
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
            Interactive 3D walkthrough — explore every room
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
              gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
              gap: 24,
              marginTop: 56,
            }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
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
                    {t.quote}
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
                    {t.name.charAt(0)}
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
                      {t.name}
                    </p>
                    <p style={{ fontSize: 12, color: C.terracotta }}>{t.role}</p>
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
                The Memory Palace
              </span>
            </div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 340 }}>
              We believe every life story deserves to be preserved with beauty and
              dignity. The Memory Palace transforms your photos, videos, and stories
              into an immersive 3D experience that your family can treasure forever.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p style={{ fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", color: C.sandstone, fontWeight: 600, marginBottom: 16 }}>
              Quick Links
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#features" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                Features
              </a>
              <a href="#how-it-works" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                How It Works
              </a>
              <Link href="/pricing" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                Pricing
              </Link>
              <Link href="/login" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
                Sign In
              </Link>
              <Link href="/register" style={{ fontSize: 14, color: C.terracotta, textDecoration: "none" }}>
                Get Started Free
              </Link>
            </div>
          </div>

          {/* Contact / trust */}
          <div>
            <p style={{ fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", color: C.sandstone, fontWeight: 600, marginBottom: 16 }}>
              Trust & Security
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                🔒 EU-hosted infrastructure
              </p>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                🛡️ Bank-grade encryption
              </p>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                📋 GDPR compliant
              </p>
              <Link href="/security" style={{ fontSize: 14, color: C.terracotta, textDecoration: "none", marginTop: 4 }}>
                Learn more about security →
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
            &copy; {new Date().getFullYear()} The Memory Palace. Preserve your memories for eternity.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/privacy" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
              Terms of Service
            </Link>
            <Link href="/login" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
              Sign In
            </Link>
            <Link href="/register" style={{ fontSize: 12, color: C.terracotta, textDecoration: "none" }}>
              Get Started
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
