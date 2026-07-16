"use client";

/**
 * Landing v2 — "bright, honest, product-first".
 * Blueprint: docs/overhaul/landing-v2/research/00-MASTER-BRIEF.md (409-agent research fleet).
 *
 * Structural laws (do not regress):
 * - The DOCUMENT scrolls. No 100dvh inner scroller, no wheel listeners, no scroll-snap
 *   mandatory, no exit-intent. Keyboard (End/PageDown/Space) traverses hero → footer.
 * - Every section is SSR-visible; the reveal animation only ever runs after hydration
 *   and starts from a class added in an effect (no JS → everything visible).
 * - CTAs are real <a href> links that work pre-hydration. One label: t hero.cta.
 * - Apple 3.1.1 seal: `initialIosApp` is seeded server-side (page.tsx). On iOS the
 *   pricing strip is omitted entirely, all copy uses *_ios variants, and no string
 *   may mention price, "free", or credit cards.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { T } from "@/lib/theme";
import { locales, type Locale } from "@/i18n/config";
import enMessages from "@/messages/en.json";
import PalaceLogo from "@/components/landing/PalaceLogo";

type V2 = typeof enMessages.landingV2;
type FaqSlice = typeof enMessages.landing.faq;
type FooterSlice = typeof enMessages.landing.footer;

const L = T.land;
const M = T.motion;
const FONT_DISPLAY = "var(--font-display, Georgia, serif)";
const FONT_BODY = "var(--font-body, sans-serif)";

/* ───────────────────────── helpers ───────────────────────── */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function connectionIsConstrained(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || /(^|\b)(slow-2g|2g|3g)\b/.test(conn.effectiveType ?? "");
}

/** SSR-visible scroll reveal: content renders opaque; after hydration (and only
 *  without reduced-motion) it gets a pre-class and fades in ahead of the viewport. */
function Reveal({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    // Already on screen at hydration → never hide it.
    if (rect.top < window.innerHeight) return;
    el.classList.add("lv2-pre");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("lv2-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 250px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="lv2-reveal" style={style}>
      {children}
    </div>
  );
}

function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      style={{
        fontFamily: FONT_BODY,
        fontSize: L.type.micro,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: onDark ? L.accentDark : L.accentLight,
        margin: "0 0 0.75rem",
      }}
    >
      {children}
    </p>
  );
}

function H2({ children, onDark = false, id }: { children: React.ReactNode; onDark?: boolean; id?: string }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        fontSize: L.type.h2,
        lineHeight: 1.15,
        color: onDark ? T.color.cream : T.color.charcoal,
        margin: "0 0 1rem",
        textWrap: "balance",
      }}
    >
      {children}
    </h2>
  );
}

/** The one primary CTA — a real link, price-free label by construction. */
function CtaLink({
  href,
  label,
  micro,
  id,
  large = false,
}: {
  href: string;
  label: string;
  micro?: string;
  id?: string;
  large?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem" }}>
      <Link
        href={href}
        id={id}
        className="lv2-cta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: T.touch,
          padding: large ? "1.125rem 2.75rem" : "0.9375rem 2.25rem",
          borderRadius: "0.75rem",
          background: L.ctaGrad,
          color: "#FFFFFF",
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: large ? L.type.lead : L.type.body,
          textDecoration: "none",
          boxShadow: "0 2px 12px rgba(107, 51, 24, 0.28)",
        }}
      >
        {label}
      </Link>
      {micro ? (
        <span style={{ fontFamily: FONT_BODY, fontSize: "0.875rem", color: L.inkMutedLight }}>{micro}</span>
      ) : null}
    </div>
  );
}

/* ───────────────────────── hero video ───────────────────────── */

function HeroMedia({ pauseLabel, playLabel, alt }: { pauseLabel: string; playLabel: string; alt: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLive, setVideoLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [wantVideo, setWantVideo] = useState(false);

  useEffect(() => {
    // Poster-only on reduced motion or constrained connections — never download the loop.
    if (prefersReducedMotion() || connectionIsConstrained()) return;
    setWantVideo(true);
  }, []);

  useEffect(() => {
    if (!wantVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => {
      v.play()
        .then(() => setVideoLive(true))
        .catch(() => {
          /* autoplay refused → poster stays; the toggle can still start it */
        });
    };
    v.addEventListener("canplay", onCanPlay);
    v.load();
    return () => v.removeEventListener("canplay", onCanPlay);
  }, [wantVideo]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => { setPaused(false); setVideoLive(true); }).catch(() => {});
    } else {
      v.pause();
      setPaused(true);
    }
  }, []);

  return (
    <div aria-hidden="false" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Poster is the LCP element: plain, preloaded, painted at t=0. */}
      <Image
        src="/video/hero-poster.jpg"
        alt={alt}
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />
      {wantVideo ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="auto"
          poster="/video/hero-poster.jpg"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: videoLive ? 1 : 0,
            transition: `opacity ${M.slow} linear`,
          }}
        >
          <source src="/video/hero-v2.mp4" type="video/mp4" />
        </video>
      ) : null}
      {/* One scrim, behind the text block only (bottom-weighted gradient). */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(36,28,21,0.30) 0%, rgba(36,28,21,0.55) 55%, rgba(36,28,21,0.78) 100%)",
        }}
      />
      {wantVideo ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? playLabel : pauseLabel}
          className="lv2-video-toggle"
          style={{
            position: "absolute",
            right: "1rem",
            bottom: "1rem",
            width: T.touch,
            height: T.touch,
            borderRadius: "50%",
            border: "1px solid rgba(252,250,245,0.5)",
            background: "rgba(36,28,21,0.55)",
            color: T.color.cream,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          {paused ? (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2l10 6-10 6V2z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      ) : null}
    </div>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${L.hairline}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="lv2-faq-q"
        style={{
          width: "100%",
          minHeight: T.touch,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "1.125rem 0.25rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: L.type.body,
          color: T.color.charcoal,
        }}
      >
        <span>{question}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: `transform ${M.base} ${M.ease}`,
          }}
        >
          <path d="M2 4.5l5 5 5-5" fill="none" stroke={L.accentLight} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: `grid-template-rows ${M.slow} ${M.ease}`,
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <p
            style={{
              margin: "0 0 1.125rem",
              padding: "0 0.25rem",
              fontFamily: FONT_BODY,
              fontSize: L.type.body,
              lineHeight: 1.6,
              color: L.inkBody,
              maxWidth: "34em",
            }}
          >
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── main component ───────────────────────── */

export default function LandingV2Client({
  initialIosApp = false,
  initialLocale = "en",
  v2: v2Prop,
  faq: faqProp,
  footer: footerProp,
}: {
  initialIosApp?: boolean;
  initialLocale?: Locale;
  v2: V2;
  faq: FaqSlice;
  footer: FooterSlice;
}) {
  const [isIosApp] = useState(initialIosApp);
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [slices, setSlices] = useState({ v2: v2Prop, faq: faqProp, footer: footerProp });
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSolid, setNavSolid] = useState(false);
  const [howMode, setHowMode] = useState<"self" | "gift">("self");
  const [tourPlaying, setTourPlaying] = useState(false);
  const tourVideoRef = useRef<HTMLVideoElement>(null);

  const { v2, faq, footer } = slices;

  useEffect(() => setMounted(true), []);

  /* If the visitor previously chose a locale that the server couldn't see
     (no cookie — native app or rejected consent), load that locale's slice
     via dynamic import (separate chunk, not in the main bundle). */
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("mp_locale")) as Locale | null;
    if (!stored || stored === initialLocale || !locales.includes(stored)) return;
    const load = async () => {
      let mod: { default: typeof enMessages } | null = null;
      switch (stored) {
        case "nl": mod = await import("@/messages/nl.json") as never; break;
        case "de": mod = await import("@/messages/de.json") as never; break;
        case "es": mod = await import("@/messages/es.json") as never; break;
        case "fr": mod = await import("@/messages/fr.json") as never; break;
        default: mod = { default: enMessages };
      }
      if (mod?.default?.landingV2) {
        setLocaleState(stored);
        setSlices({ v2: mod.default.landingV2, faq: mod.default.landing.faq, footer: mod.default.landing.footer });
        document.documentElement.lang = stored;
      }
    };
    void load();
  }, [initialLocale]);

  const switchLocale = useCallback((next: Locale) => {
    localStorage.setItem("mp_locale", next);
    document.cookie = `mp_locale=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    document.documentElement.lang = next;
    window.location.reload();
  }, []);

  /* Nav gets a solid background once the page scrolls — a threshold boolean
     via IO sentinel, never a per-frame scroll listener. */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNavSolid(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const startTour = useCallback(() => {
    setTourPlaying(true);
    // Defer so the <video> with controls is mounted before play() is called.
    requestAnimationFrame(() => {
      tourVideoRef.current?.play().catch(() => {});
    });
  }, []);

  const heroSub = isIosApp ? v2.hero.sub_ios : v2.hero.sub;
  const heroMicro = isIosApp ? v2.hero.ctaMicro_ios : v2.hero.ctaMicro;
  const midCta = isIosApp ? v2.how.midCta_ios : v2.how.midCta;

  const BANDS: Array<{
    key: string;
    eyebrow: string;
    h2: string;
    body: string;
    footnote?: string;
    pull?: string;
    media: React.ReactNode;
  }> = [
    {
      key: "whatsapp",
      eyebrow: v2.bands.whatsappEyebrow,
      h2: v2.bands.whatsappH2,
      body: v2.bands.whatsappBody,
      media: (
        /* HTML vignette (localizable, crisp at any DPI): chat bubble → framed photo */
        <div
          role="img"
          aria-label={v2.a11y.bandWhatsapp}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            padding: "2.5rem 2rem",
            background: L.surface,
            border: `1px solid ${L.hairline}`,
            borderRadius: "1rem",
            alignItems: "center",
          }}
        >
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "16rem",
              background: "#E7FFDB",
              borderRadius: "0.875rem 0.875rem 0.875rem 0.25rem",
              padding: "0.625rem 0.75rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            <Image
              src="/landing/demo-hands.jpg"
              alt=""
              width={480}
              height={319}
              style={{ width: "100%", height: "auto", borderRadius: "0.5rem", display: "block" }}
            />
            <span style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: "#3B4A3F", display: "block", marginTop: "0.375rem", textAlign: "right" }}>
              12:04 ✓✓
            </span>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ opacity: 0.6 }}>
            <path d="M12 4v14m0 0l-5-5m5 5l5-5" fill="none" stroke={L.accentLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div
            style={{
              alignSelf: "flex-end",
              background: "#FFFFFF",
              border: `6px solid #B98A4B`,
              borderRadius: "0.25rem",
              padding: "0.375rem",
              boxShadow: "0 8px 20px rgba(36,28,21,0.18)",
              maxWidth: "15rem",
            }}
          >
            <Image
              src="/landing/demo-hands.jpg"
              alt=""
              width={480}
              height={319}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "palace",
      eyebrow: v2.bands.palaceEyebrow,
      h2: v2.bands.palaceH2,
      body: v2.bands.palaceBody,
      pull: v2.bands.palacePull,
      media: (
        <figure style={{ margin: 0 }}>
          <Image
            src="/landing/band-entrance.jpg"
            alt={v2.a11y.bandPalace}
            width={1600}
            height={633}
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "1rem",
              border: `1px solid ${L.hairline}`,
              display: "block",
            }}
          />
        </figure>
      ),
    },
    {
      key: "ai",
      eyebrow: v2.bands.aiEyebrow,
      h2: v2.bands.aiH2,
      body: v2.bands.aiBody,
      footnote: v2.bands.aiFootnote,
      media: (
        /* Vignette: three real photos flowing into named rooms */
        <div
          role="img"
          aria-label={v2.a11y.bandAi}
          style={{
            padding: "2.5rem 2rem",
            background: L.surface,
            border: `1px solid ${L.hairline}`,
            borderRadius: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            {["/landing/demo-hands.jpg", "/landing/demo-graduation.jpg", "/landing/demo-morning.jpg"].map((src, i) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={480}
                height={319}
                style={{
                  width: "30%",
                  height: "auto",
                  borderRadius: "0.5rem",
                  display: "block",
                  transform: `rotate(${(i - 1) * 3}deg)`,
                  boxShadow: "0 4px 12px rgba(36,28,21,0.15)",
                }}
              />
            ))}
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ alignSelf: "center", opacity: 0.6 }}>
            <path d="M12 4v14m0 0l-5-5m5 5l5-5" fill="none" stroke={L.accentLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", justifyContent: "center" }}>
            {[v2.more.map.split(" — ")[0], v2.more.tree.split(" — ")[0], v2.more.journeys.split(" — ")[0]].map((room) => (
              <span
                key={room}
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: L.accentLight,
                  background: L.canvas,
                  border: `1px solid ${L.hairline}`,
                  borderRadius: "2rem",
                  padding: "0.375rem 0.875rem",
                }}
              >
                {room}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "together",
      eyebrow: v2.bands.togetherEyebrow,
      h2: v2.bands.togetherH2,
      body: v2.bands.togetherBody,
      media: (
        <figure style={{ margin: 0 }}>
          <Image
            src="/landing/band-together.jpg"
            alt={v2.a11y.bandTogether}
            width={1600}
            height={900}
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "1rem",
              border: `1px solid ${L.hairline}`,
              display: "block",
            }}
          />
        </figure>
      ),
    },
  ];

  const steps =
    howMode === "gift" && !isIosApp
      ? [
          { t: v2.how.g1t, d: v2.how.g1d },
          { t: v2.how.g2t, d: v2.how.g2d },
          { t: v2.how.g3t, d: v2.how.g3d },
        ]
      : [
          { t: v2.how.s1t, d: v2.how.s1d },
          { t: v2.how.s2t, d: v2.how.s2d },
          { t: v2.how.s3t, d: v2.how.s3d },
        ];

  const faqAny = faq as Record<string, string>;
  const faqItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .filter((n) => faqAny[`q${n}`] && faqAny[`a${n}`])
    .map((n) => ({
      q: faqAny[`q${n}`],
      a: isIosApp && faqAny[`a${n}_ios`] ? faqAny[`a${n}_ios`] : faqAny[`a${n}`],
    }));

  const wide: React.CSSProperties = { maxWidth: L.space.wide, margin: "0 auto", padding: "0 clamp(1.25rem, 5vw, 2.5rem)" };
  const prose: React.CSSProperties = { maxWidth: L.space.prose, margin: "0 auto" };

  return (
    <div style={{ background: L.canvas, color: T.color.charcoal, fontFamily: FONT_BODY }}>
      {/* JSON-LD — keeps the FAQ (with iOS variants) + video + org data indexable. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "The Memory Palace",
                url: "https://thememorypalace.ai",
                description: heroSub,
              },
              {
                "@type": "Organization",
                name: "The Memory Palace",
                url: "https://thememorypalace.ai",
                logo: "https://thememorypalace.ai/brand/alt-social-512.png",
              },
              {
                "@type": "FAQPage",
                mainEntity: faqItems.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              },
              {
                "@type": "VideoObject",
                name: v2.showcase.h2,
                description: v2.showcase.sub,
                thumbnailUrl: "https://thememorypalace.ai/video/walkthrough-poster.jpg",
                contentUrl: "https://thememorypalace.ai/video/walkthrough.mp4",
                uploadDate: "2026-05-06",
              },
            ],
          }),
        }}
      />

      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
        .lv2-reveal { will-change: auto; }
        .lv2-pre { opacity: 0.001; transform: translateY(12px); transition: opacity ${M.reveal} ${M.ease}, transform ${M.reveal} ${M.ease}; }
        .lv2-pre.lv2-in { opacity: 1; transform: none; }
        .lv2-cta { transition: transform ${M.fast} ${M.ease}, box-shadow ${M.fast} ${M.ease}, filter ${M.fast} ${M.ease}; }
        .lv2-cta:hover { transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 6px 18px rgba(107,51,24,0.35); }
        .lv2-cta:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(107,51,24,0.25); }
        .lv2-cta:focus-visible, .lv2-video-toggle:focus-visible, .lv2-faq-q:focus-visible, .lv2-navlink:focus-visible, .lv2-chip:focus-visible {
          outline: 2px solid ${T.color.terracotta}; outline-offset: 3px;
        }
        .lv2-navlink { color: inherit; text-decoration: none; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 0.5rem; min-height: ${T.touch}; display: inline-flex; align-items: center; transition: background ${M.fast} ${M.ease}; }
        .lv2-navlink:hover { background: rgba(154, 79, 42, 0.08); }
        section[id] { scroll-margin-top: 5rem; }
        @media (prefers-reduced-motion: reduce) {
          .lv2-pre { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
        .lv2-band-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 5vw, 4rem); align-items: center; }
        .lv2-steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .lv2-chips { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }
        .lv2-proof-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .lv2-table-wrap { overflow-x: auto; }
        @media (max-width: 768px) {
          .lv2-band-grid { grid-template-columns: 1fr; }
          .lv2-steps-grid { grid-template-columns: 1fr; }
          .lv2-proof-grid { grid-template-columns: repeat(2, 1fr); }
          .lv2-nav-links { display: none !important; }
          .lv2-nav-burger { display: inline-flex !important; }
        }
        @media (min-width: 769px) {
          .lv2-nav-burger { display: none !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: navSolid ? "rgba(252,250,245,0.92)" : "transparent",
          backdropFilter: navSolid ? "blur(12px)" : "none",
          borderBottom: navSolid ? `1px solid ${L.hairline}` : "1px solid transparent",
          transition: `background ${M.base} ${M.ease}, border-color ${M.base} ${M.ease}`,
        }}
      >
        <nav
          aria-label="Main"
          style={{ ...wide, display: "flex", alignItems: "center", justifyContent: "space-between", height: "4rem" }}
        >
          <Link href="/" aria-label="The Memory Palace" style={{ textDecoration: "none", display: "flex" }}>
            <PalaceLogo variant="full" color={navSolid ? "dark" : "light"} size="sm" />
          </Link>
          <div className="lv2-nav-links" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: navSolid ? T.color.charcoal : T.color.cream, fontFamily: FONT_BODY, fontSize: L.type.bodyS }}>
            <a className="lv2-navlink" href="#tour">{v2.nav.tour}</a>
            <a className="lv2-navlink" href="#features">{v2.nav.features}</a>
            <a className="lv2-navlink" href="#how-it-works">{v2.nav.how}</a>
            <a className="lv2-navlink" href="#faq">{v2.nav.faq}</a>
            {!isIosApp && (
              <Link className="lv2-navlink" href="/pricing">{v2.nav.pricing}</Link>
            )}
            <Link className="lv2-navlink" href="/login">{v2.nav.signIn}</Link>
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => switchLocale(e.target.value as Locale)}
              style={{
                marginLeft: "0.5rem",
                minHeight: "2.25rem",
                borderRadius: "0.5rem",
                border: `1px solid ${navSolid ? L.hairline : "rgba(252,250,245,0.4)"}`,
                background: "transparent",
                color: "inherit",
                fontFamily: FONT_BODY,
                fontSize: "0.875rem",
                padding: "0 0.375rem",
              }}
            >
              {locales.map((loc) => (
                <option key={loc} value={loc} style={{ color: T.color.charcoal }}>
                  {loc.toUpperCase()}
                </option>
              ))}
            </select>
            <Link
              href="/register"
              className="lv2-cta"
              style={{
                marginLeft: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                minHeight: "2.75rem",
                padding: "0 1.375rem",
                borderRadius: "0.625rem",
                background: L.ctaGrad,
                color: "#FFF",
                fontWeight: 600,
                fontSize: L.type.bodyS,
                textDecoration: "none",
              }}
            >
              {v2.nav.cta}
            </Link>
          </div>
          {/* Mobile burger */}
          <button
            type="button"
            className="lv2-nav-burger"
            aria-label={menuOpen ? v2.a11y.close : "Menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none",
              width: T.touch,
              height: T.touch,
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: navSolid || menuOpen ? T.color.charcoal : T.color.cream,
              cursor: "pointer",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              {menuOpen ? (
                <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </nav>
        {menuOpen ? (
          <div
            style={{
              background: L.canvas,
              borderBottom: `1px solid ${L.hairline}`,
              padding: "0.75rem clamp(1.25rem, 5vw, 2.5rem) 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              fontSize: L.type.body,
            }}
          >
            {[
              ["#tour", v2.nav.tour],
              ["#features", v2.nav.features],
              ["#how-it-works", v2.nav.how],
              ["#faq", v2.nav.faq],
            ].map(([href, label]) => (
              <a key={href} className="lv2-navlink" href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            {!isIosApp && (
              <Link className="lv2-navlink" href="/pricing" onClick={() => setMenuOpen(false)}>{v2.nav.pricing}</Link>
            )}
            <Link className="lv2-navlink" href="/login" onClick={() => setMenuOpen(false)}>{v2.nav.signIn}</Link>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
              {locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => switchLocale(loc)}
                  style={{
                    minWidth: "2.75rem",
                    minHeight: "2.25rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${loc === locale ? L.accentLight : L.hairline}`,
                    background: loc === locale ? "rgba(154,79,42,0.08)" : "transparent",
                    color: T.color.charcoal,
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
            <Link
              href="/register"
              className="lv2-cta"
              onClick={() => setMenuOpen(false)}
              style={{
                marginTop: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: T.touch,
                borderRadius: "0.625rem",
                background: L.ctaGrad,
                color: "#FFF",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {v2.nav.cta}
            </Link>
          </div>
        ) : null}
      </header>

      <main>
        {/* ── 1. Hero ── */}
        <section
          aria-labelledby="lv2-h1"
          style={{
            position: "relative",
            minHeight: "92vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: L.dark,
            padding: "6rem 0 4rem",
          }}
        >
          <HeroMedia pauseLabel={v2.a11y.pause} playLabel={v2.a11y.play} alt={v2.a11y.heroVideo} />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 1.5rem", maxWidth: "60rem" }}>
            <Eyebrow onDark>{v2.hero.eyebrow}</Eyebrow>
            <h1
              id="lv2-h1"
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: L.type.h1,
                lineHeight: 1.08,
                color: T.color.cream,
                margin: "0 0 1.25rem",
                textWrap: "balance",
                textShadow: "0 2px 24px rgba(36,28,21,0.45)",
              }}
            >
              {v2.hero.h1}
            </h1>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: L.type.lead,
                lineHeight: 1.5,
                color: "rgba(252,250,245,0.92)",
                margin: "0 auto 2rem",
                maxWidth: "34em",
                textWrap: "pretty",
              }}
            >
              {heroSub}
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center", alignItems: "center" }}>
                <Link
                  href="/register"
                  className="lv2-cta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "3.25rem",
                    padding: "0 2.5rem",
                    borderRadius: "0.75rem",
                    background: L.ctaGrad,
                    color: "#FFF",
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: L.type.body,
                    textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
                  }}
                >
                  {v2.hero.cta}
                </Link>
                <a
                  href="#tour"
                  className="lv2-navlink"
                  style={{ color: T.color.cream, fontSize: L.type.body, textDecoration: "underline", textUnderlineOffset: "0.25em" }}
                >
                  ▶ {v2.hero.secondary}
                </a>
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: "0.875rem", color: "rgba(252,250,245,0.75)" }}>
                {heroMicro}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", justifyContent: "center", marginTop: "1.25rem" }}>
                {[v2.hero.chipGdpr, v2.hero.chipEncrypted, v2.hero.chipEu].map((chip) => (
                  <Link
                    key={chip}
                    href="/security"
                    className="lv2-navlink"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      color: "rgba(252,250,245,0.85)",
                      fontSize: "0.875rem",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
                      <path d="M6.5 1l4.5 2v3c0 2.8-1.9 5-4.5 6C3.9 11 2 8.8 2 6V3l4.5-2z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    {chip}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
        {/* Sentinel: nav turns solid when this leaves the viewport */}
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />

        {/* ── 2. Proof strip ── */}
        <section aria-label="Facts" style={{ background: L.canvas, borderBottom: `1px solid ${L.hairline}` }}>
          <div style={{ ...wide, padding: "2.5rem clamp(1.25rem, 5vw, 2.5rem)" }}>
            <div className="lv2-proof-grid" style={{ textAlign: "center" }}>
              {[
                [isIosApp ? v2.proof.p1_ios : v2.proof.p1, isIosApp ? v2.proof.p1Label_ios : v2.proof.p1Label],
                [v2.proof.p2, v2.proof.p2Label],
                [v2.proof.p3, v2.proof.p3Label],
                [v2.proof.p4, v2.proof.p4Label],
              ].map(([stat, label]) => (
                <div key={label}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.type.h3, color: L.accentLight }}>{stat}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: L.type.bodyS, color: L.inkMutedLight, marginTop: "0.25rem" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Showcase: step inside a real palace ── */}
        <section id="tour" aria-labelledby="lv2-tour-h" style={{ background: L.surface, padding: `${L.space.sectionY} 0` }}>
          <div style={wide}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <Eyebrow>{v2.showcase.eyebrow}</Eyebrow>
                <H2 id="lv2-tour-h">{v2.showcase.h2}</H2>
                <p style={{ ...prose, fontFamily: FONT_BODY, fontSize: L.type.lead, lineHeight: 1.5, color: L.inkBody, margin: "0 auto", textWrap: "pretty" }}>
                  {v2.showcase.sub}
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
                {tourPlaying ? (
                  <video
                    ref={tourVideoRef}
                    controls
                    playsInline
                    poster="/video/walkthrough-poster.jpg"
                    aria-label={v2.a11y.tourDialog}
                    style={{ width: "100%", borderRadius: "1rem", display: "block", background: L.dark }}
                  >
                    <source src="/video/walkthrough.mp4" type="video/mp4" />
                  </video>
                ) : (
                  <button
                    type="button"
                    onClick={startTour}
                    aria-label={v2.hero.secondary}
                    className="lv2-cta"
                    style={{
                      position: "relative",
                      width: "100%",
                      padding: 0,
                      border: "none",
                      borderRadius: "1rem",
                      overflow: "hidden",
                      cursor: "pointer",
                      display: "block",
                      background: L.dark,
                    }}
                  >
                    <Image
                      src="/video/walkthrough-poster.jpg"
                      alt=""
                      width={1600}
                      height={900}
                      sizes="(max-width: 920px) 100vw, 56rem"
                      style={{ width: "100%", height: "auto", display: "block", opacity: 0.92 }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          width: "5rem",
                          height: "5rem",
                          borderRadius: "50%",
                          background: "rgba(252,250,245,0.92)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 8px 32px rgba(36,28,21,0.4)",
                        }}
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" style={{ marginLeft: "3px" }}>
                          <path d="M6 3l14 9-14 9V3z" fill={L.accentLight} />
                        </svg>
                      </span>
                    </span>
                  </button>
                )}
                <p style={{ fontFamily: FONT_BODY, fontSize: L.type.bodyS, color: L.inkMutedLight, textAlign: "center", margin: "1rem 0 0" }}>
                  {v2.showcase.attribution}
                </p>
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <Link
                    href="/explore"
                    className="lv2-navlink"
                    style={{ color: L.accentLight, fontWeight: 600, fontSize: L.type.body, textDecoration: "underline", textUnderlineOffset: "0.25em" }}
                  >
                    {v2.showcase.exploreCta} → <span style={{ fontWeight: 400, color: L.inkMutedLight }}>({v2.showcase.noAccount})</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 4. Flagship feature bands ── */}
        <section id="features" aria-label={v2.nav.features}>
          {BANDS.map((band, i) => (
            <div key={band.key} style={{ background: i % 2 === 0 ? L.canvas : L.surface, padding: `${L.space.sectionY} 0` }}>
              <div style={wide}>
                <Reveal>
                  <div className="lv2-band-grid" style={{ direction: i % 2 === 1 ? "rtl" : "ltr" }}>
                    <div style={{ direction: "ltr" }}>{band.media}</div>
                    <div style={{ direction: "ltr" }}>
                      <Eyebrow>{band.eyebrow}</Eyebrow>
                      <H2>{band.h2}</H2>
                      <p style={{ fontFamily: FONT_BODY, fontSize: L.type.body, lineHeight: 1.6, color: L.inkBody, maxWidth: "34em", margin: 0, textWrap: "pretty" }}>
                        {band.body}
                      </p>
                      {band.pull ? (
                        <p style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontWeight: 500, fontSize: L.type.h4, color: L.accentLight, margin: "1.25rem 0 0", maxWidth: "26em" }}>
                          {band.pull}
                        </p>
                      ) : null}
                      {band.footnote ? (
                        <p style={{ fontFamily: FONT_BODY, fontSize: "0.875rem", color: L.inkMutedLight, margin: "1rem 0 0" }}>
                          {band.footnote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          ))}
          {/* Tier-2 chip strip */}
          <div style={{ background: L.canvas, padding: `0 0 ${L.space.sectionY}` }}>
            <div style={wide}>
              <Reveal>
                <p style={{ textAlign: "center", fontFamily: FONT_BODY, fontWeight: 600, fontSize: L.type.body, color: L.inkMutedLight, margin: "0 0 1.25rem" }}>
                  {v2.more.title}
                </p>
                <div className="lv2-chips">
                  {[v2.more.map, v2.more.tree, v2.more.journeys, v2.more.interviews, v2.more.sharing, v2.more.uploads].map((chip) => (
                    <span
                      key={chip}
                      className="lv2-chip"
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: L.type.bodyS,
                        color: L.inkBody,
                        background: L.surface,
                        border: `1px solid ${L.hairline}`,
                        borderRadius: "2rem",
                        padding: "0.625rem 1.125rem",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── 5. How it works ── */}
        <section id="how-it-works" aria-labelledby="lv2-how-h" style={{ background: L.surface, padding: `${L.space.sectionY} 0` }}>
          <div style={wide}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                <Eyebrow>{v2.how.eyebrow}</Eyebrow>
                <H2 id="lv2-how-h">{v2.how.h2}</H2>
                {!isIosApp && (
                  <div
                    role="tablist"
                    aria-label={`${v2.how.toggleSelf} / ${v2.how.toggleGift}`}
                    style={{
                      display: "inline-flex",
                      gap: "0.25rem",
                      background: L.canvas,
                      border: `1px solid ${L.hairline}`,
                      borderRadius: "2rem",
                      padding: "0.25rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    {(["self", "gift"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={howMode === mode}
                        onClick={() => setHowMode(mode)}
                        className="lv2-chip"
                        style={{
                          minHeight: "2.5rem",
                          padding: "0 1.25rem",
                          borderRadius: "2rem",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: FONT_BODY,
                          fontWeight: 600,
                          fontSize: L.type.bodyS,
                          background: howMode === mode ? L.ctaGrad : "transparent",
                          color: howMode === mode ? "#FFF" : L.inkBody,
                          transition: `background ${M.base} ${M.ease}`,
                        }}
                      >
                        {mode === "self" ? v2.how.toggleSelf : v2.how.toggleGift}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
            <Reveal>
              <div className="lv2-steps-grid">
                {steps.map((step, i) => (
                  <div key={step.t} style={{ textAlign: "center", padding: "0 0.5rem" }}>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: L.type.h3,
                        fontWeight: 500,
                        color: L.accentLight,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: L.type.h4, color: T.color.charcoal, margin: "0 0 0.625rem" }}>
                      {step.t}
                    </h3>
                    <p style={{ fontFamily: FONT_BODY, fontSize: L.type.body, lineHeight: 1.6, color: L.inkBody, margin: "0 auto", maxWidth: "30em", textWrap: "pretty" }}>
                      {step.d}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal>
              <div style={{ textAlign: "center", marginTop: "3rem" }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: L.type.body, color: L.inkBody, margin: "0 0 1.25rem", textWrap: "pretty" }}>
                  {midCta}
                </p>
                <CtaLink href="/register" label={v2.hero.cta} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 6. Why a palace ── */}
        <section aria-labelledby="lv2-why-h" style={{ background: L.mid, padding: `${L.space.sectionY} 0` }}>
          <div style={{ ...wide, textAlign: "center" }}>
            <Reveal>
              <Eyebrow>{v2.why.eyebrow}</Eyebrow>
              <H2 id="lv2-why-h">{v2.why.h2}</H2>
              <p style={{ ...prose, fontFamily: FONT_BODY, fontSize: L.type.lead, lineHeight: 1.6, color: L.inkBody, margin: "0 auto 1.25rem", textWrap: "pretty" }}>
                {v2.why.body}
              </p>
              <Link
                href="/blog"
                className="lv2-navlink"
                style={{ color: L.accentLight, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "0.25em" }}
              >
                {v2.why.link} →
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── 7. Dark showcase: this is a palace ── */}
        <section aria-labelledby="lv2-palace-h" style={{ position: "relative", background: L.dark, padding: `${L.space.sectionY} 0`, overflow: "hidden" }}>
          <Image
            src="/landing/showcase-frame.jpg"
            alt={v2.a11y.showcaseFrame}
            fill
            sizes="100vw"
            style={{ objectFit: "cover", opacity: 0.45 }}
          />
          <div
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(36,28,21,0.25) 0%, rgba(36,28,21,0.85) 100%)" }}
          />
          <div style={{ ...wide, position: "relative", textAlign: "center", padding: "4rem clamp(1.25rem, 5vw, 2.5rem)" }}>
            <Eyebrow onDark>{v2.notAlbum.eyebrow}</Eyebrow>
            <h2
              id="lv2-palace-h"
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: L.type.h1,
                lineHeight: 1.08,
                color: T.color.cream,
                margin: "0 0 1rem",
                textWrap: "balance",
              }}
            >
              {v2.notAlbum.h2}
            </h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: L.type.lead, color: L.inkMutedDark, margin: "0 auto", maxWidth: "34em", textWrap: "pretty" }}>
              {v2.notAlbum.line}
            </p>
          </div>
        </section>

        {/* ── 8. Comparison ── */}
        <section aria-labelledby="lv2-compare-h" style={{ background: L.canvas, padding: `${L.space.sectionY} 0` }}>
          <div style={wide}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                <H2 id="lv2-compare-h">{v2.compare.h2}</H2>
                <p style={{ fontFamily: FONT_BODY, fontSize: L.type.lead, color: L.inkMutedLight, margin: 0, textWrap: "pretty" }}>
                  {v2.compare.sub}
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="lv2-table-wrap" style={{ maxWidth: "56rem", margin: "0 auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: L.type.bodyS }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ padding: "0.875rem 0.75rem", textAlign: "left", color: L.inkMutedLight, fontWeight: 600, borderBottom: `2px solid ${L.hairline}`, width: "22%" }} />
                      <th scope="col" style={{ padding: "0.875rem 0.75rem", textAlign: "left", color: L.inkMutedLight, fontWeight: 600, borderBottom: `2px solid ${L.hairline}` }}>
                        {v2.compare.colLeft}
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: "0.875rem 0.75rem",
                          textAlign: "left",
                          color: L.accentLight,
                          fontWeight: 700,
                          borderBottom: `2px solid ${L.accentLight}`,
                          background: L.surface,
                        }}
                      >
                        {v2.compare.colRight}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [v2.compare.r1l, v2.compare.r1a, v2.compare.r1b, false],
                      [v2.compare.r2l, v2.compare.r2a, v2.compare.r2b, false],
                      [v2.compare.r3l, v2.compare.r3a, v2.compare.r3b, false],
                      [v2.compare.r4l, v2.compare.r4a, v2.compare.r4b, false],
                      [v2.compare.r5l, v2.compare.r5a, v2.compare.r5b, true],
                    ].map(([label, left, right, concession]) => (
                      <tr key={label as string}>
                        <th scope="row" style={{ padding: "0.875rem 0.75rem", textAlign: "left", color: T.color.charcoal, fontWeight: 600, borderBottom: `1px solid ${L.hairline}`, verticalAlign: "top" }}>
                          {label}
                        </th>
                        <td style={{ padding: "0.875rem 0.75rem", color: concession ? T.color.charcoal : L.inkMutedLight, fontWeight: concession ? 600 : 400, borderBottom: `1px solid ${L.hairline}`, verticalAlign: "top", lineHeight: 1.5 }}>
                          {concession ? "✓ " : ""}{left}
                        </td>
                        <td style={{ padding: "0.875rem 0.75rem", color: L.inkBody, borderBottom: `1px solid ${L.hairline}`, background: L.surface, verticalAlign: "top", lineHeight: 1.5, fontWeight: concession ? 400 : 500 }}>
                          {concession ? "" : "✓ "}{right}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 9. Pricing strip (web only — Apple 3.1.1) ── */}
        {!isIosApp && (
          <section aria-labelledby="lv2-pricing-h" style={{ background: L.surface, padding: `${L.space.bandY} 0` }}>
            <div style={{ ...wide, textAlign: "center" }}>
              <h2 id="lv2-pricing-h" style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.type.h3, color: T.color.charcoal, margin: "0 0 0.75rem" }}>
                {v2.pricing.h2}
              </h2>
              <p style={{ ...prose, fontFamily: FONT_BODY, fontSize: L.type.body, lineHeight: 1.6, color: L.inkBody, margin: "0 auto 1rem", textWrap: "pretty" }}>
                {v2.pricing.line}
              </p>
              <Link
                href="/pricing"
                className="lv2-navlink"
                style={{ color: L.accentLight, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "0.25em" }}
              >
                {v2.pricing.cta} →
              </Link>
            </div>
          </section>
        )}

        {/* ── 10. Forever Promise + founder ── */}
        <section aria-labelledby="lv2-promise-h" style={{ background: L.canvas, padding: `${L.space.sectionY} 0` }}>
          <div style={{ ...wide }}>
            <Reveal>
              <div style={{ ...prose, textAlign: "center", margin: "0 auto" }}>
                <H2 id="lv2-promise-h">{v2.promise.h2}</H2>
                <p style={{ fontFamily: FONT_BODY, fontSize: L.type.lead, lineHeight: 1.6, color: L.inkBody, margin: "0 0 2.5rem", textWrap: "pretty" }}>
                  {v2.promise.body}
                </p>
                <div
                  style={{
                    background: L.surface,
                    border: `1px solid ${L.hairline}`,
                    borderRadius: "1rem",
                    padding: "2rem clamp(1.5rem, 4vw, 2.5rem)",
                    textAlign: "left",
                  }}
                >
                  <h3 style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: L.type.h4, color: T.color.charcoal, margin: "0 0 0.625rem" }}>
                    {v2.promise.founderTitle}
                  </h3>
                  <p style={{ fontFamily: FONT_BODY, fontSize: L.type.body, lineHeight: 1.6, color: L.inkBody, margin: 0, textWrap: "pretty" }}>
                    {v2.promise.founderBody}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 11. FAQ ── */}
        <section id="faq" aria-labelledby="lv2-faq-h" style={{ background: L.surface, padding: `${L.space.sectionY} 0` }}>
          <div style={{ ...wide }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <H2 id="lv2-faq-h">{faq.title}</H2>
              </div>
            </Reveal>
            <Reveal>
              <div style={{ maxWidth: "46rem", margin: "0 auto" }}>
                {faqItems.map((item) => (
                  <FaqItem key={item.q} question={item.q} answer={item.a} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 12. Final CTA — end on a peak ── */}
        <section aria-labelledby="lv2-final-h" style={{ position: "relative", background: L.dark, padding: "clamp(6rem, 12vw, 9rem) 0", overflow: "hidden" }}>
          <Image src="/video/hero-poster.jpg" alt="" fill sizes="100vw" style={{ objectFit: "cover", opacity: 0.5 }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(36,28,21,0.55), rgba(36,28,21,0.8))" }} />
          <div style={{ position: "relative", textAlign: "center", padding: "0 1.5rem" }}>
            <h2
              id="lv2-final-h"
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: L.type.h1,
                lineHeight: 1.1,
                color: T.color.cream,
                margin: "0 auto 2rem",
                maxWidth: "18em",
                textWrap: "balance",
              }}
            >
              {v2.final.h2}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <Link
                href="/register"
                className="lv2-cta"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "3.5rem",
                  padding: "0 3rem",
                  borderRadius: "0.75rem",
                  background: L.ctaGrad,
                  color: "#FFF",
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: L.type.lead,
                  textDecoration: "none",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                }}
              >
                {v2.final.cta}
              </Link>
              <span style={{ fontFamily: FONT_BODY, fontSize: "0.875rem", color: "rgba(252,250,245,0.75)" }}>{heroMicro}</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer (reuses existing translated landing.footer keys) ── */}
      <footer style={{ background: L.dark, color: L.inkMutedDark, padding: "3.5rem 0 2.5rem" }}>
        <div style={wide}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem", justifyContent: "space-between", marginBottom: "2.5rem" }}>
            <div style={{ maxWidth: "22rem" }}>
              <PalaceLogo variant="full" color="light" size="sm" />
              <p style={{ fontFamily: FONT_BODY, fontSize: L.type.bodyS, lineHeight: 1.6, margin: "1rem 0 0" }}>{footer.about}</p>
            </div>
            <nav aria-label={footer.quickLinks} style={{ display: "flex", flexDirection: "column", gap: "0.125rem", fontFamily: FONT_BODY, fontSize: L.type.bodyS }}>
              <span style={{ fontWeight: 700, color: T.color.cream, marginBottom: "0.5rem" }}>{footer.quickLinks}</span>
              <a className="lv2-navlink" href="#features" style={{ color: "inherit" }}>{footer.features}</a>
              <a className="lv2-navlink" href="#how-it-works" style={{ color: "inherit" }}>{footer.howItWorks}</a>
              {!isIosApp && <Link className="lv2-navlink" href="/pricing" style={{ color: "inherit" }}>{footer.pricing}</Link>}
              <Link className="lv2-navlink" href="/blog" style={{ color: "inherit" }}>{footer.blog}</Link>
              <Link className="lv2-navlink" href="/help" style={{ color: "inherit" }}>{footer.helpCenter}</Link>
              <Link className="lv2-navlink" href="/login" style={{ color: "inherit" }}>{footer.signIn}</Link>
            </nav>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", fontFamily: FONT_BODY, fontSize: L.type.bodyS }}>
              <span style={{ fontWeight: 700, color: T.color.cream, marginBottom: "0.5rem" }}>{footer.trustSecurity}</span>
              <span style={{ padding: "0.25rem 0.75rem" }}>{footer.euHosted}</span>
              <span style={{ padding: "0.25rem 0.75rem" }}>{footer.encryption}</span>
              <span style={{ padding: "0.25rem 0.75rem" }}>{footer.gdpr}</span>
              <Link className="lv2-navlink" href="/security" style={{ color: L.accentDark }}>
                {footer.learnSecurity} →
              </Link>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(181,173,163,0.25)",
              paddingTop: "1.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: FONT_BODY,
              fontSize: "0.875rem",
            }}
          >
            <span>© {mounted ? new Date().getFullYear() : 2026} {footer.copyright}</span>
            <span style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link className="lv2-navlink" href="/privacy" style={{ color: "inherit" }}>{footer.privacyPolicy}</Link>
              <Link className="lv2-navlink" href="/terms" style={{ color: "inherit" }}>{footer.termsOfService}</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
