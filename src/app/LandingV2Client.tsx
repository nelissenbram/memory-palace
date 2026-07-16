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
import KepCard from "@/components/landing/usp/KepCard";
import UploadsCard from "@/components/landing/usp/UploadsCard";
import CloudImportCard from "@/components/landing/usp/CloudImportCard";
import ReceiveCard from "@/components/landing/usp/ReceiveCard";
import PalaceCard from "@/components/landing/usp/PalaceCard";
import InterviewsCard from "@/components/landing/usp/InterviewsCard";
import MapCard from "@/components/landing/usp/MapCard";
import TreeCard from "@/components/landing/usp/TreeCard";
import JourneysCard from "@/components/landing/usp/JourneysCard";
import CapsuleCard from "@/components/landing/usp/CapsuleCard";
import CocreateCard from "@/components/landing/usp/CocreateCard";
import SharingCard from "@/components/landing/usp/SharingCard";
import LegacyCard from "@/components/landing/usp/LegacyCard";

type V2 = typeof enMessages.landingV2;
type FaqSlice = typeof enMessages.landing.faq;
type FooterSlice = typeof enMessages.landing.footer;
type Compare8 = typeof enMessages.landing.comparison;

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
    // Fail-safe: if IO callbacks starve (heavy main-thread work elsewhere in the
    // app), never leave content hidden — reveal unconditionally after a beat.
    const failSafe = window.setTimeout(() => el.classList.add("lv2-in"), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(failSafe);
    };
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
    const attempt = () => {
      if (!v.paused) return;
      v.muted = true;
      v.play()
        .then(() => setVideoLive(true))
        .catch(() => {
          /* autoplay refused → poster stays; the toggle can still start it */
        });
    };
    const onCanPlay = () => attempt();
    v.addEventListener("canplay", onCanPlay);
    v.load();
    // Retry a few times: under heavy main-thread load the initial autoplay
    // kick can be dropped even though playback is allowed.
    const timers = [800, 2200, 4500].map((ms) => window.setTimeout(attempt, ms));
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      timers.forEach((t) => window.clearTimeout(t));
    };
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
  compare8: compare8Prop,
}: {
  initialIosApp?: boolean;
  initialLocale?: Locale;
  v2: V2;
  faq: FaqSlice;
  footer: FooterSlice;
  compare8: Compare8;
}) {
  const [isIosApp] = useState(initialIosApp);
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [slices, setSlices] = useState({ v2: v2Prop, faq: faqProp, footer: footerProp, compare8: compare8Prop });
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSolid, setNavSolid] = useState(false);
  const [howMode, setHowMode] = useState<"self" | "gift">("self");
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourAmbient, setTourAmbient] = useState(false);
  const tourVideoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  /* The walkthrough plays as a muted ambient snippet — but never on reduced
     motion or constrained connections (poster + play button instead). */
  useEffect(() => {
    if (prefersReducedMotion() || connectionIsConstrained()) return;
    setTourAmbient(true);
  }, []);

  /* Kick-start the ambient loop (with retries — the autoplay kick can be
     dropped under heavy main-thread load even when playback is allowed). */
  useEffect(() => {
    if (!tourAmbient || tourPlaying) return;
    const attempt = () => {
      const v = tourVideoRef.current;
      if (!v || !v.paused) return;
      v.muted = true;
      v.play().catch(() => {});
    };
    attempt();
    const timers = [800, 2200, 4500].map((ms) => window.setTimeout(attempt, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [tourAmbient, tourPlaying]);

  const { v2, faq, footer, compare8 } = slices;

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
        let v2n = mod.default.landingV2;
        let faqN = mod.default.landing.faq;
        let footerN = mod.default.landing.footer;
        if (isIosApp) {
          // Client-side twin of page.tsx sealForIos(): native iOS skips the
          // locale cookie (Apple 5.1.2i), so this path loads raw locale JSON —
          // it must be sealed here too (Apple 3.1.1).
          v2n = {
            ...v2n,
            hero: { ...v2n.hero, sub: v2n.hero.sub_ios, ctaMicro: v2n.hero.ctaMicro_ios },
            how: { ...v2n.how, midCta: v2n.how.midCta_ios, toggleGift: "", g1t: "", g1d: "", g2t: "", g2d: "", g3t: "", g3d: "" },
            nav: { ...v2n.nav, pricing: "" },
          };
          const f = { ...faqN } as Record<string, string>;
          for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
            const ios = f[`a${n}_ios`];
            if (ios) f[`a${n}`] = ios;
          }
          faqN = f as typeof faqN;
          footerN = { ...footerN, pricing: "", getStartedFree: footerN.signIn };
        }
        setLocaleState(stored);
        setSlices({ v2: v2n, faq: faqN, footer: footerN, compare8: mod.default.landing.comparison });
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
    // Restart from the top with sound; the click gesture grants audio.
    requestAnimationFrame(() => {
      const v = tourVideoRef.current;
      if (!v) return;
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(() => {});
    });
  }, []);

  const heroSub = isIosApp ? v2.hero.sub_ios : v2.hero.sub;
  const heroMicro = isIosApp ? v2.hero.ctaMicro_ios : v2.hero.ctaMicro;
  const midCta = isIosApp ? v2.how.midCta_ios : v2.how.midCta;

  /* ── USP scrollytelling (STEMMA pattern): sticky group rail + one block per
     USP. Active step is computed in a rAF-throttled passive scroll handler
     (IO callbacks can starve when other app code hogs the main thread). ── */
  const [activeUsp, setActiveUsp] = useState(0);
  const uspRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.4;
      const els = uspRefs.current;
      let best = 0;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) best = i;
        else break;
      }
      setActiveUsp(best);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const MOCK = v2.mock as Record<string, string>;
  const USP_GROUPS: Array<{ label: string; items: Array<{ name: string; t: string; b: string; media: React.ReactNode }> }> = [
    {
      label: v2.usps.groupCapture,
      items: [
        { name: v2.mock.kepName, t: v2.usps.u1t, b: v2.usps.u1b, media: <KepCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { name: v2.mock.uploadsName, t: v2.usps.u2t, b: v2.usps.u2b, media: <UploadsCard m={MOCK} /> },
        { name: v2.mock.cloudName, t: v2.usps.u3t, b: v2.usps.u3b, media: <CloudImportCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { name: v2.mock.receiveName, t: v2.usps.u4t, b: v2.usps.u4b, media: <ReceiveCard m={MOCK} /> },
      ],
    },
    {
      label: v2.usps.groupEnrich,
      items: [
        { name: v2.mock.palaceName, t: v2.usps.u5t, b: v2.usps.u5b, media: <PalaceCard m={MOCK} /> },
        { name: v2.mock.interviewName, t: v2.usps.u6t, b: v2.usps.u6b, media: <InterviewsCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { name: v2.mock.mapName, t: v2.usps.u7t, b: v2.usps.u7b, media: <MapCard m={MOCK} /> },
        { name: v2.mock.treeName, t: v2.usps.u8t, b: v2.usps.u8b, media: <TreeCard m={MOCK} /> },
        { name: v2.mock.journeyName, t: v2.usps.u9t, b: v2.usps.u9b, media: <JourneysCard m={MOCK} /> },
      ],
    },
    {
      label: v2.usps.groupShare,
      items: [
        { name: v2.mock.capsuleName, t: v2.usps.u10t, b: v2.usps.u10b, media: <CapsuleCard m={MOCK} /> },
        { name: v2.mock.cocreateName, t: v2.usps.u11t, b: v2.usps.u11b, media: <CocreateCard m={MOCK} /> },
        { name: v2.mock.sharingName, t: v2.usps.u12t, b: v2.usps.u12b, media: <SharingCard m={MOCK} /> },
        { name: v2.mock.legacyName, t: v2.usps.u13t, b: v2.usps.u13b, media: <LegacyCard m={MOCK} /> },
      ],
    },
  ];

  const USP_FLAT = USP_GROUPS.flatMap((g, gi) => g.items.map((item) => ({ ...item, group: g.label, gi })));

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
                thumbnailUrl: "https://thememorypalace.ai/video/walkthrough-poster-v2.jpg",
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
        .lv2-steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .lv2-table-wrap { overflow-x: auto; }
        .lv2-usp-grid { display: grid; grid-template-columns: 17rem 1fr; gap: clamp(2.5rem, 5vw, 5rem); }
        /* Native horizontal screenshot strip — proximity snap, never traps vertical scroll */
        .lv2-strip {
          display: flex; gap: 1.25rem; overflow-x: auto; padding: 0.5rem 0.25rem 1rem;
          scroll-snap-type: x proximity; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch;
        }
        .lv2-strip:focus-visible { outline: 2px solid ${T.color.terracotta}; outline-offset: 3px; }
        /* Method-of-loci scene: one facade, three alcoves, a golden visitor.
           12s cycle: hang the memory (01) → walk past (02) → rooms stay lit (03). */
        .lv2-loci { max-width: 52rem; margin: 0 auto; }
        .lv2-loci-scene { position: relative; }
        .lv2-loci-frame {
          position: absolute; top: 56%; transform: translate(-50%, -50%);
          border-radius: 0.3rem;
        }
        .lv2-loci-frame-one { animation: lv2LociHang 12s ${M.ease} infinite; }
        .lv2-loci-frame-two { animation: lv2LociAppearTwo 12s ${M.ease} infinite; }
        .lv2-loci-frame-three { animation: lv2LociAppearThree 12s ${M.ease} infinite; }
        .lv2-loci-glow {
          position: absolute; top: 62%; transform: translate(-50%, -50%);
          width: 6.5rem; height: 5rem; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(212,175,55,0.45) 0%, rgba(212,175,55,0) 70%);
          opacity: 0; pointer-events: none;
        }
        .lv2-loci-glow-one { animation: lv2LociLitOne 12s ease-in-out infinite; }
        .lv2-loci-glow-two { animation: lv2LociLitTwo 12s ease-in-out infinite; }
        .lv2-loci-glow-three { animation: lv2LociLitThree 12s ease-in-out infinite; }
        .lv2-loci-visitor {
          position: absolute; bottom: 4.5%; left: 0; width: 0.8rem; height: 0.8rem; border-radius: 50%;
          background: ${L.accentDark}; box-shadow: 0 0 12px rgba(212,175,55,0.8);
          animation: lv2LociVisit 12s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .lv2-loci-captions {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2rem;
        }
        @keyframes lv2LociHang {
          0% { opacity: 0; transform: translate(-50%, -90%); }
          6% { opacity: 1; transform: translate(-50%, -50%); }
          98% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes lv2LociAppearTwo {
          0%, 38% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          46% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          98% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes lv2LociAppearThree {
          0%, 60% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          68% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          98% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes lv2LociVisit {
          0%, 10% { left: 3%; opacity: 0; }
          16% { opacity: 1; }
          34% { left: 18.75%; }
          52% { left: 50%; }
          72% { left: 81.25%; }
          86% { left: 96%; opacity: 1; }
          92%, 100% { left: 96%; opacity: 0; }
        }
        @keyframes lv2LociLitOne {
          0%, 28% { opacity: 0; } 36%, 94% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes lv2LociLitTwo {
          0%, 46% { opacity: 0; } 54%, 94% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes lv2LociLitThree {
          0%, 66% { opacity: 0; } 74%, 94% { opacity: 1; } 100% { opacity: 0; }
        }
        /* Final CTA glow breath */
        .lv2-cta-final { animation: lv2CtaBreath 5s ease-in-out infinite; }
        @keyframes lv2CtaBreath {
          0%, 100% { box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.35), 0 0 34px rgba(212,175,55,0.16); }
          50% { box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.5), 0 0 54px rgba(212,175,55,0.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lv2-loci-frame, .lv2-loci-glow, .lv2-loci-visitor, .lv2-cta-final,
          .lv2-loci-frame-one, .lv2-loci-frame-two, .lv2-loci-frame-three,
          .lv2-loci-glow-one, .lv2-loci-glow-two, .lv2-loci-glow-three { animation: none !important; }
          .lv2-loci-frame, .lv2-loci-glow { opacity: 1; }
          .lv2-loci-visitor { opacity: 0; }
        }
        @media (max-width: 1023px) {
          .lv2-usp-grid { grid-template-columns: 1fr; }
          .lv2-usp-rail { display: none; }
        }
        @media (max-width: 768px) {
          .lv2-steps-grid { grid-template-columns: 1fr; }
          .lv2-nav-links { display: none !important; }
          .lv2-nav-burger { display: inline-flex !important; }
          .lv2-loci-captions { grid-template-columns: 1fr; gap: 1.75rem; }
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

        {/* ── 2. Why a palace — the method of loci as one living scene ── */}
        <section aria-labelledby="lv2-why-h" style={{ background: L.mid, padding: `${L.space.sectionY} 0` }}>
          <div style={{ ...wide, textAlign: "center" }}>
            <Reveal>
              <Eyebrow>{v2.why.eyebrow}</Eyebrow>
              <H2 id="lv2-why-h">{v2.why.h2}</H2>
              <p style={{ ...prose, fontFamily: FONT_BODY, fontSize: L.type.lead, lineHeight: 1.6, color: L.inkBody, margin: "0 auto 3.5rem", textWrap: "pretty" }}>
                {v2.why.body}
              </p>
            </Reveal>
            <Reveal>
              <div
                className="lv2-loci"
                role="img"
                aria-label={`${v2.why.step1t} — ${v2.why.step1b}. ${v2.why.step2t} — ${v2.why.step2b}. ${v2.why.step3t} — ${v2.why.step3b}.`}
              >
                {/* One palace cross-section: three alcoves under one pediment.
                    A memory is hung in the first; a golden visitor walks past;
                    every room they pass stays lit. */}
                <div className="lv2-loci-scene" aria-hidden="true">
                  <svg viewBox="0 0 640 210" style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="xMidYMid meet">
                    {/* facade fill */}
                    <path d="M28 74 L320 18 L612 74 V196 H28 Z" fill="rgba(252,250,245,0.65)" stroke="none" />
                    {/* pediment */}
                    <path d="M20 76 L320 14 L620 76" fill="none" stroke={L.accentLight} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M44 76 H596" stroke={L.accentLight} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
                    {/* alcove arches */}
                    {[120, 320, 520].map((cx) => (
                      <g key={cx}>
                        <path
                          d={`M${cx - 46} 196 V128 A46 46 0 0 1 ${cx + 46} 128 V196`}
                          fill="rgba(36,28,21,0.05)"
                          stroke={L.accentLight}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </g>
                    ))}
                    {/* columns */}
                    {[62, 220, 420, 578].map((x) => (
                      <g key={x} stroke={L.accentLight} strokeWidth="2" opacity="0.5">
                        <line x1={x} y1={86} x2={x} y2={192} />
                        <line x1={x - 7} y1={86} x2={x + 7} y2={86} />
                        <line x1={x - 8} y1={193} x2={x + 8} y2={193} />
                      </g>
                    ))}
                    {/* floor */}
                    <path d="M14 197 H626" stroke={L.accentLight} strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  {/* glow pools inside each alcove — lit as the visitor passes */}
                  {["one", "two", "three"].map((k, i) => (
                    <span key={k} className={`lv2-loci-glow lv2-loci-glow-${k}`} style={{ left: `${[18.75, 50, 81.25][i]}%` }} />
                  ))}
                  {/* the framed memories */}
                  {["/landing/demo-hands.jpg", "/landing/demo-graduation.jpg", "/landing/demo-morning.jpg"].map((src, i) => (
                    <span key={src} className={`lv2-loci-frame lv2-loci-frame-${["one", "two", "three"][i]}`} style={{ left: `${[18.75, 50, 81.25][i]}%` }}>
                      <Image
                        src={src}
                        alt=""
                        width={480}
                        height={319}
                        style={{
                          width: "clamp(3.25rem, 8vw, 4.5rem)",
                          height: "clamp(2.5rem, 6.2vw, 3.5rem)",
                          objectFit: "cover",
                          borderRadius: "0.2rem",
                          border: "0.2rem solid #FFF",
                          boxShadow: "0 6px 16px rgba(36,28,21,0.32)",
                          display: "block",
                        }}
                      />
                    </span>
                  ))}
                  {/* the visitor */}
                  <span className="lv2-loci-visitor" />
                </div>
                {/* numbered captions aligned to the three alcoves */}
                <div className="lv2-loci-captions">
                  {[
                    { n: "01", t: v2.why.step1t, b: v2.why.step1b },
                    { n: "02", t: v2.why.step2t, b: v2.why.step2b },
                    { n: "03", t: v2.why.step3t, b: v2.why.step3b },
                  ].map((step) => (
                    <div key={step.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.type.h4, color: L.accentLight }}>{step.n}</span>
                      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.type.h4, color: T.color.charcoal, margin: 0 }}>
                        {step.t}
                      </h3>
                      <p style={{ fontFamily: FONT_BODY, fontSize: L.type.bodyS, lineHeight: 1.5, color: L.inkMutedLight, margin: 0, maxWidth: "15em" }}>
                        {step.b}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 3. Showcase: step inside a real palace ── */}
        <section id="tour" aria-labelledby="lv2-tour-h" style={{ background: L.surface, padding: "4rem 0 5rem" }}>
          <div style={wide}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                <Eyebrow>{v2.showcase.eyebrow}</Eyebrow>
                <H2 id="lv2-tour-h">{v2.showcase.h2}</H2>
                <p style={{ ...prose, fontFamily: FONT_BODY, fontSize: L.type.lead, lineHeight: 1.5, color: L.inkBody, margin: "0 auto", textWrap: "pretty" }}>
                  {v2.showcase.sub}
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div style={{ maxWidth: "62rem", margin: "0 auto" }}>
                {/* Ambient tour: the walkthrough plays muted as a living snippet;
                    one click restarts it with sound + controls. Reduced-motion /
                    constrained connections get the poster + a play button. */}
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "16 / 9",
                    borderRadius: "1rem",
                    overflow: "hidden",
                    background: L.dark,
                    boxShadow: "0 24px 64px rgba(36,28,21,0.28)",
                  }}
                >
                  {tourAmbient || tourPlaying ? (
                    <video
                      ref={tourVideoRef}
                      autoPlay
                      muted={!tourPlaying}
                      loop={!tourPlaying}
                      controls={tourPlaying}
                      playsInline
                      poster="/video/walkthrough-poster-v2.jpg"
                      aria-label={v2.a11y.tourDialog}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    >
                      <source src="/video/walkthrough.mp4" type="video/mp4" />
                    </video>
                  ) : (
                    <Image
                      src="/video/walkthrough-poster-v2.jpg"
                      alt=""
                      fill
                      sizes="(max-width: 1020px) 100vw, 62rem"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                  {!tourPlaying ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        padding: "1.5rem",
                        background: "linear-gradient(180deg, transparent 55%, rgba(36,28,21,0.45) 100%)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={startTour}
                        className="lv2-cta"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.625rem",
                          minHeight: T.touch,
                          padding: "0 1.75rem",
                          borderRadius: "2rem",
                          border: "1px solid rgba(252,250,245,0.45)",
                          background: "rgba(36,28,21,0.62)",
                          backdropFilter: "blur(8px)",
                          color: T.color.cream,
                          fontFamily: FONT_BODY,
                          fontWeight: 600,
                          fontSize: L.type.body,
                          cursor: "pointer",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {v2.showcase.soundCta}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 3. What you can do — scroll-driven USP overview (STEMMA pattern) ── */}
        <section id="features" aria-label={v2.nav.features} style={{ background: L.canvas, padding: `${L.space.sectionY} 0` }}>
          <div style={wide}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                <Eyebrow>{v2.usps.eyebrow}</Eyebrow>
                <H2>{v2.usps.h2}</H2>
              </div>
            </Reveal>
            <div className="lv2-usp-grid">
              {/* Sticky group rail */}
              <nav aria-label={v2.usps.eyebrow} className="lv2-usp-rail">
                <div style={{ position: "sticky", top: "6rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {USP_GROUPS.map((group, gi) => (
                    <div key={group.label}>
                      <p
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: L.type.micro,
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: L.inkMutedLight,
                          margin: "0 0 0.5rem",
                        }}
                      >
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const flatIdx = USP_FLAT.findIndex((f) => f.t === item.t);
                        const isActive = activeUsp === flatIdx;
                        const isPast = activeUsp > flatIdx;
                        return (
                          <button
                            key={item.t}
                            type="button"
                            className="lv2-navlink"
                            onClick={() => uspRefs.current[flatIdx]?.scrollIntoView({ block: "center" })}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              width: "100%",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0.375rem 0.5rem",
                              minHeight: "2.25rem",
                              fontFamily: FONT_BODY,
                              fontSize: "0.9375rem",
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? L.accentLight : isPast ? T.color.charcoal : L.inkMutedLight,
                              transition: `color ${M.base} ${M.ease}`,
                            }}
                          >
                            <span aria-hidden="true" style={{ width: "1rem", flexShrink: 0, color: T.color.success }}>
                              {isPast ? "✓" : ""}
                            </span>
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </nav>
              {/* USP blocks */}
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(4rem, 8vw, 6.5rem)" }}>
                {USP_FLAT.map((usp, idx) => (
                  <div
                    key={usp.t}
                    ref={(el) => { uspRefs.current[idx] = el; }}
                    data-usp-idx={idx}
                    style={{ scrollMarginTop: "6rem" }}
                  >
                    <Reveal>
                      <p
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: L.type.micro,
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: L.accentLight,
                          margin: "0 0 0.625rem",
                        }}
                      >
                        {String(idx + 1).padStart(2, "0")} · {usp.group}
                      </p>
                      <h3
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 500,
                          fontSize: L.type.h3,
                          lineHeight: 1.15,
                          color: T.color.charcoal,
                          margin: "0 0 0.875rem",
                          textWrap: "balance",
                        }}
                      >
                        {usp.t}
                      </h3>
                      <p style={{ fontFamily: FONT_BODY, fontSize: L.type.body, lineHeight: 1.6, color: L.inkBody, maxWidth: "34em", margin: "0 0 1.75rem", textWrap: "pretty" }}>
                        {usp.b}
                      </p>
                      <div style={{ maxWidth: "36rem" }}>{usp.media}</div>
                    </Reveal>
                  </div>
                ))}
              </div>
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


        {/* ── 7. Dark showcase: this is a palace ── */}
        <section aria-labelledby="lv2-palace-h" style={{ position: "relative", background: `radial-gradient(ellipse at 50% 0%, #3A2E22 0%, ${L.dark} 62%)`, padding: `${L.space.sectionY} 0`, overflow: "hidden" }}>
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
            <p style={{ fontFamily: FONT_BODY, fontSize: L.type.lead, color: L.inkMutedDark, margin: "0 auto 3rem", maxWidth: "34em", textWrap: "pretty" }}>
              {v2.notAlbum.line}
            </p>
            <div style={{ position: "relative" }}>
              <div
                ref={stripRef}
                className="lv2-strip"
                role="region"
                aria-roledescription="carousel"
                aria-label={v2.a11y.phoneStrip}
                tabIndex={0}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                  const note = [v2.notes.n1, v2.notes.n2, v2.notes.n3, v2.notes.n4, v2.notes.n5, v2.notes.n6, v2.notes.n7, v2.notes.n8][n - 1];
                  const noteOnTop = n % 2 === 1;
                  return (
                    <div key={n} style={{ position: "relative", flexShrink: 0, scrollSnapAlign: "center", padding: `${noteOnTop ? "3.25rem" : "0.5rem"} 0.25rem ${noteOnTop ? "0.5rem" : "3.25rem"}` }}>
                      {/* margin note, as if scribbled next to the screen */}
                      <span
                        aria-hidden="true"
                        className="lv2-note"
                        style={{
                          position: "absolute",
                          [noteOnTop ? "top" : "bottom"]: "0",
                          left: n % 3 === 0 ? "0.25rem" : "1.75rem",
                          transform: `rotate(${noteOnTop ? -3.5 : 3}deg)`,
                          display: "inline-flex",
                          flexDirection: noteOnTop ? "column" : "column-reverse",
                          alignItems: "flex-start",
                          gap: "0.1rem",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-note, cursive)",
                            fontWeight: 600,
                            fontSize: "1.375rem",
                            lineHeight: 1.1,
                            color: L.accentDark,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {note}
                        </span>
                        <svg width="34" height="26" viewBox="0 0 34 26" style={{ marginLeft: "1.25rem", transform: noteOnTop ? "none" : "scaleY(-1)" }}>
                          <path d="M4 2 C 10 16, 20 20, 29 22 M23 20 l7 2 -4 -6" fill="none" stroke={L.accentDark} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                        </svg>
                      </span>
                      <Image
                        src={`/screenshots/store/screenshot-${n}-${["exterior", "entrance", "room", "family-tree", "interview", "explore", "library", "achievements"][n - 1]}.webp`}
                        alt={`${v2.mock.shotAlt} ${n}/8`}
                        width={1080}
                        height={1920}
                        sizes="(max-width: 768px) 70vw, 17rem"
                        style={{
                          width: "17rem",
                          height: "auto",
                          borderRadius: "1.25rem",
                          border: "1px solid rgba(252,250,245,0.22)",
                          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                          display: "block",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
                {[[-1, v2.a11y.prev, "M14 4l-6 7 6 7"], [1, v2.a11y.next, "M8 4l6 7-6 7"]].map(([dir, label, d]) => (
                  <button
                    key={label as string}
                    type="button"
                    aria-label={label as string}
                    className="lv2-video-toggle"
                    onClick={() => stripRef.current?.scrollBy({ left: (dir as number) * 320, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
                    style={{
                      width: T.touch,
                      height: T.touch,
                      borderRadius: "50%",
                      border: "1px solid rgba(252,250,245,0.4)",
                      background: "rgba(252,250,245,0.1)",
                      color: T.color.cream,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="18" height="22" viewBox="0 0 22 22" aria-hidden="true">
                      <path d={d as string} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
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
                      <th scope="col" style={{ padding: "0.875rem 0.75rem", textAlign: "left", color: L.inkMutedLight, fontWeight: 600, borderBottom: `2px solid ${L.hairline}`, width: "18%" }} />
                      <th scope="col" style={{ padding: "0.875rem 0.75rem", textAlign: "left", color: L.inkMutedLight, fontWeight: 600, borderBottom: `2px solid ${L.hairline}` }}>
                        {compare8.columnLeft}
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
                        {compare8.columnRight}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [compare8.row1Label, compare8.row1Left, compare8.row1Right, false],
                      [compare8.row2Label, compare8.row2Left, compare8.row2Right, false],
                      [compare8.row3Label, compare8.row3Left, compare8.row3Right, false],
                      [compare8.row4Label, compare8.row4Left, compare8.row4Right, false],
                      [compare8.row5Label, compare8.row5Left, compare8.row5Right, false],
                      [compare8.row6Label, compare8.row6Left, compare8.row6Right, false],
                      [compare8.row7Label, compare8.row7Left, compare8.row7Right, false],
                      [compare8.row8Label, compare8.row8Left, compare8.row8Right, false],
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

        {/* ── 9. FAQ ── */}
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

        {/* ── 10. Final CTA — end on a peak ── */}
        <section aria-labelledby="lv2-final-h" style={{ position: "relative", background: L.dark, padding: "clamp(7rem, 14vw, 11rem) 0", overflow: "hidden" }}>
          <Image src="/video/hero-poster.jpg" alt="" fill sizes="100vw" style={{ objectFit: "cover", opacity: 0.6 }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(36,28,21,0.30) 0%, rgba(36,28,21,0.82) 85%)" }} />
          <div style={{ position: "relative", textAlign: "center", padding: "0 1.5rem" }}>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: L.type.bodyS,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: L.accentDark,
                margin: "0 0 1.25rem",
              }}
            >
              {v2.final.kicker}
            </p>
            <h2
              id="lv2-final-h"
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: "clamp(3rem, 6.5vw, 5rem)",
                lineHeight: 1.06,
                color: T.color.cream,
                margin: "0 auto 2.5rem",
                maxWidth: "16em",
                textWrap: "balance",
                textShadow: "0 2px 30px rgba(36,28,21,0.5)",
              }}
            >
              {v2.final.h2}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <Link
                href="/register"
                className="lv2-cta lv2-cta-final"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "4.25rem",
                  padding: "0 3.75rem",
                  borderRadius: "1rem",
                  background: L.ctaGrad,
                  color: "#FFF",
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: L.type.h4,
                  textDecoration: "none",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.35), 0 0 44px rgba(212,175,55,0.22)",
                }}
              >
                {v2.final.cta}
              </Link>
              <span style={{ fontFamily: FONT_BODY, fontSize: L.type.bodyS, color: "rgba(252,250,245,0.85)" }}>{heroMicro}</span>
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
          {/* Forever Promise — footer subsection */}
          <div
            style={{
              borderTop: "1px solid rgba(181,173,163,0.25)",
              padding: "1.75rem 0",
              maxWidth: "44rem",
            }}
          >
            <h2 style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: L.type.bodyS, color: T.color.cream, margin: "0 0 0.5rem" }}>
              {v2.promise.h2}
            </h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: "0.9375rem", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              {v2.promise.body}
            </p>
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
