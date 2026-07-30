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
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { locales, type Locale } from "@/i18n/config";
// en.json (~295KB) is type-only here and dynamically imported at runtime — it
// must never ship in the landing first-paint chunk.
type EnMessages = typeof import("@/messages/en.json");
import PalaceLogo from "@/components/landing/PalaceLogo";
import WhyPalaceVisual from "@/components/landing/WhyPalaceVisual";
import TourPlayer from "@/components/landing/TourPlayer";
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

type V2 = EnMessages["landingV2"];
type FaqSlice = EnMessages["landing"]["faq"];
type FooterSlice = EnMessages["landing"]["footer"];
type Compare8 = EnMessages["landing"]["comparison"];

const L = T.land;
const M = T.motion;
const FONT_DISPLAY = "var(--font-display, Georgia, serif)";
const FONT_BODY = "var(--font-body, sans-serif)";

/* ── Local landing scrim/shadow tokens ──────────────────────────
   Well-named local consts so the remaining warm-umber washes, dark-band
   toggle scrims and ceremonial-gold CTA glows stop being hand-typed rgba at
   call sites. Kept local (not promoted into theme.ts) to avoid touching the
   shared token file. Umber = warm-ink CTA feedback; scrim = translucent
   warm-ink over dark bands; gold glows are ceremonial (final CTA / tour door). */
const LSHADOW = {
  // Warm-umber CTA hover / active feedback.
  ctaHover: "0 6px 18px rgba(107,51,24,0.35)",
  ctaActive: "0 2px 8px rgba(107,51,24,0.25)",
} as const;
const LSCRIM = {
  // Translucent warm-ink chip background used by the video toggle buttons over
  // the dark hero band; hairline is the matching cream border.
  toggleBg: "rgba(36,28,21,0.55)",
  toggleBorder: "1px solid rgba(252,250,245,0.5)",
} as const;
const LGLOW = {
  // Ceremonial gold glow ramp for the final CTA (static + breathing keyframes)
  // and the tour doorway ring.
  ctaFinalRest: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.35), 0 0 44px rgba(212,175,55,0.22)",
  ctaBreathLow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.35), 0 0 34px rgba(212,175,55,0.16)",
  ctaBreathHigh: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.5), 0 0 54px rgba(212,175,55,0.3)",
  tourHover: "0 0 0 0.75rem rgba(212,175,55,0.2), 0 16px 48px rgba(0,0,0,0.55)",
  tourBreathLow: "0 0 0 0.5rem rgba(212,175,55,0.10), 0 16px 48px rgba(0,0,0,0.55)",
  tourBreathHigh: "0 0 0 0.9rem rgba(212,175,55,0.22), 0 16px 48px rgba(0,0,0,0.55)",
} as const;

/* ───────────────────────── helpers ───────────────────────── */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function connectionIsConstrained(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  // iOS Safari + WKWebView expose no Network Information API, so `conn` is
  // always absent there. Rather than assume unconstrained (which eagerly pulls
  // the full hero MP4 over cellular on every iPhone), treat small/touch
  // viewports as constrained when the API is unavailable — poster-only unless a
  // desktop-class screen is present. Desktop autoplay is unaffected.
  if (!conn) return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
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
          boxShadow: L.shadow.cta,
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

function HeroMedia({
  pauseLabel,
  playLabel,
  alt,
  tapToPlayLabel,
}: {
  pauseLabel: string;
  playLabel: string;
  alt: string;
  tapToPlayLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLive, setVideoLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [wantVideo, setWantVideo] = useState(false);
  // When we default to poster-only on a constrained/mobile connection (NOT
  // reduced-motion, which we always honour), surface a tap-to-play affordance so
  // the visitor can opt into the loop instead of being stuck with a still. The
  // MP4 is still never fetched until they ask for it.
  const [offerTapToPlay, setOfferTapToPlay] = useState(false);

  useEffect(() => {
    // Reduced motion is a hard opt-out — no video, no affordance.
    if (prefersReducedMotion()) return;
    // Constrained/mobile: keep poster-only by default, but offer opt-in.
    if (connectionIsConstrained()) {
      setOfferTapToPlay(true);
      return;
    }
    setWantVideo(true);
  }, []);

  // Opt in from the poster-only state: mount the <video> (which begins the lazy
  // fetch) and dismiss the affordance. The autoplay effect below takes it from
  // here once `wantVideo` flips true.
  const optInToVideo = useCallback(() => {
    setOfferTapToPlay(false);
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
    // No eager v.load(): preload="metadata" + the play() attempt below drive the
    // fetch lazily, so we don't force-pull the whole MP4 at hydration and
    // contend with the priority LCP poster.
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
          preload="metadata"
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
          background: L.scrim.hero,
        }}
      />
      {offerTapToPlay ? (
        <button
          type="button"
          onClick={optInToVideo}
          aria-label={tapToPlayLabel}
          className="lv2-video-toggle"
          style={{
            position: "absolute",
            right: "1rem",
            bottom: "1rem",
            minHeight: T.touch,
            padding: "0 1rem",
            borderRadius: "1.5rem",
            border: LSCRIM.toggleBorder,
            background: LSCRIM.toggleBg,
            color: T.color.cream,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: FONT_BODY,
            fontSize: "0.875rem",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 2l10 6-10 6V2z" fill="currentColor" />
          </svg>
          {tapToPlayLabel}
        </button>
      ) : null}
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
            border: LSCRIM.toggleBorder,
            background: LSCRIM.toggleBg,
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
  const stripRef = useRef<HTMLDivElement>(null);

  /* Layout breakpoints via canon hooks (no @media for layout). The full nav row
     (logo + 6 links + language select + CTA) runs to ~900px in DE/FR, so it
     collapses to a burger across the whole compact band (≤1024px, which also
     covers iPad portrait). The USP chapter-rail and the 3-up steps grid follow
     the same compact/mobile split the old @media rules used. */
  const isCompact = useIsCompact(); // ≤1024px
  const isMobile = useIsMobile();   // ≤767px (or short landscape)


  const { v2, faq, footer, compare8 } = slices;

  useEffect(() => setMounted(true), []);

  /* Load a locale's landing slices in place (separate chunk, never in the main
     bundle) and swap them into state — shared by the localStorage-restore effect
     and the language <select>. Applies the iOS seal (client-side twin of
     page.tsx sealForIos()) since native iOS skips the locale cookie. */
  const applyLocale = useCallback(async (next: Locale) => {
    type Mod = { default: EnMessages };
    let mod: Mod | null = null;
    switch (next) {
      case "nl": mod = await import("@/messages/nl.json") as unknown as Mod; break;
      case "de": mod = await import("@/messages/de.json") as unknown as Mod; break;
      case "es": mod = await import("@/messages/es.json") as unknown as Mod; break;
      case "fr": mod = await import("@/messages/fr.json") as unknown as Mod; break;
      default: mod = await import("@/messages/en.json") as unknown as Mod;
    }
    if (!mod?.default?.landingV2) return;
    let v2n = mod.default.landingV2;
    let faqN = mod.default.landing.faq;
    let footerN = mod.default.landing.footer;
    if (isIosApp) {
      // Seal the raw locale JSON on iOS too (Apple 3.1.1): no price/free/CC copy.
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
    setLocaleState(next);
    setSlices({ v2: v2n, faq: faqN, footer: footerN, compare8: mod.default.landing.comparison });
    document.documentElement.lang = next;
  }, [isIosApp]);

  /* If the visitor previously chose a locale that the server couldn't see
     (no cookie — native app or rejected consent), restore it in place. Also
     re-write the cookie so downstream server-rendered routes inherit it (native
     iOS excepted — it must stay cookie-free per Apple 5.1.2i). */
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("mp_locale")) as Locale | null;
    if (!stored || stored === initialLocale || !locales.includes(stored)) return;
    void applyLocale(stored).then(() => {
      if (!isIosApp) {
        document.cookie = `mp_locale=${stored};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      }
    });
  }, [initialLocale, isIosApp, applyLocale]);

  /* Change language in place — swap the locale chunk, keep in-page state
     (open FAQ items, scroll position, how-it-works toggle). No full reload. */
  const switchLocale = useCallback((next: Locale) => {
    localStorage.setItem("mp_locale", next);
    document.cookie = `mp_locale=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    document.documentElement.lang = next;
    void applyLocale(next);
  }, [applyLocale]);

  /* Mobile menu: lock body scroll while open, focus the first item, and close on
     Escape. Link/anchor items already call setMenuOpen(false) on activation. */
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a, button, [href]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  const heroSub = isIosApp ? v2.hero.sub_ios : v2.hero.sub;
  const heroMicro = isIosApp ? v2.hero.ctaMicro_ios : v2.hero.ctaMicro;

  /* Localized aria labels (merged into landingV2.a11y across all 5 locales).
     Accessed via a Record cast so this stays TS-valid before the keys land in
     en.json; the ?? fallbacks keep the accessible names sensible either way. */
  const a11y = v2.a11y as unknown as Record<string, string>;
  const a11yMenu = a11y.menu ?? "Menu";
  const a11yMainNav = a11y.mainNav ?? "Main";
  const a11yLanguage = a11y.language ?? "Language";

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

  // Pause the USP vignettes' (and logo medallions') infinite CSS loops while
  // they are off-screen: ~26+ perpetual composited animations otherwise run the
  // whole time the tab is open, draining battery and hurting INP. Toggling a
  // `usp-live` class flips animation-play-state (see globals.css). Reduced-motion
  // users already get `animation: none`, so this is purely a perf gate.
  //
  // The observer lives in a ref and each element is observed the moment its ref
  // callback fires (unobserved when it unmounts / the ref is cleared), so the
  // gate is robust to the card list growing or reordering — no mount-time
  // snapshot to go stale. The scroll-active effect above is untouched: it only
  // ever reads `uspRefs.current`, never this observer.
  const uspLiveIoRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("usp-live", e.isIntersecting);
      },
      { rootMargin: "200px 0px 200px 0px" }
    );
    uspLiveIoRef.current = io;
    // Observe any refs already assigned before this effect ran (SSR → hydration
    // order means the ref callbacks may have fired first).
    for (const el of uspRefs.current) if (el) io.observe(el);
    return () => {
      io.disconnect();
      uspLiveIoRef.current = null;
    };
  }, []);

  // Ref setter for each USP block: keep the flat-index slot in sync AND wire the
  // element into the perf observer as it mounts/unmounts.
  const setUspRef = useCallback((flatIdx: number, el: HTMLDivElement | null) => {
    const prev = uspRefs.current[flatIdx];
    if (prev && prev !== el) uspLiveIoRef.current?.unobserve(prev);
    uspRefs.current[flatIdx] = el;
    if (el) uspLiveIoRef.current?.observe(el);
  }, []);

  const MOCK = v2.mock as Record<string, string>;
  const USP_GROUPS: Array<{ label: string; items: Array<{ name: string; t: string; b: string; media: React.ReactNode }> }> = [
    {
      label: v2.usps.groupCapture,
      items: [
        { name: v2.mock.uploadsName, t: v2.usps.u2t, b: v2.usps.u2b, media: <UploadsCard m={MOCK} /> },
        { name: v2.mock.cloudName, t: v2.usps.u3t, b: v2.usps.u3b, media: <CloudImportCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { name: v2.mock.kepName, t: v2.usps.u1t, b: v2.usps.u1b, media: <KepCard m={MOCK} aiLabel={v2.mock.ai} /> },
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

  // Stable numeric id per USP (assigned once in flat order) so the scroll-active
  // rail keys off `idx`, never a translated title string — title collisions
  // across locales would otherwise light up the wrong rail entry.
  const uspIdxByGroup: number[][] = [];
  {
    let c = 0;
    for (const g of USP_GROUPS) {
      uspIdxByGroup.push(g.items.map(() => c++));
    }
  }

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
    <div style={{ background: L.canvas, color: T.color.charcoal, fontFamily: FONT_BODY, overflowX: "clip" }}>
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
        .lv2-cta:hover { transform: translateY(-1px); filter: brightness(1.06); box-shadow: ${LSHADOW.ctaHover}; }
        .lv2-cta:active { transform: translateY(0); box-shadow: ${LSHADOW.ctaActive}; }
        .lv2-cta:focus-visible, .lv2-video-toggle:focus-visible, .lv2-faq-q:focus-visible, .lv2-navlink:focus-visible, .lv2-chip:focus-visible {
          outline: 2px solid ${T.color.gold}; outline-offset: 3px;
        }
        .lv2-navlink { color: inherit; text-decoration: none; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 0.5rem; min-height: ${T.touch}; display: inline-flex; align-items: center; transition: background ${M.fast} ${M.ease}; }
        .lv2-navlink:hover { background: rgba(154, 79, 42, 0.08); }
        section[id] { scroll-margin-top: 5rem; }
        @media (prefers-reduced-motion: reduce) {
          .lv2-pre { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
        .lv2-table-wrap { overflow-x: auto; }
        .lv2-chap { display: grid; column-gap: clamp(2.5rem, 5vw, 4.5rem); align-items: start; }
        /* Native horizontal screenshot strip — proximity snap, never traps vertical scroll */
        .lv2-strip {
          display: flex; gap: 1.25rem; overflow-x: auto; padding: 0.5rem 0.25rem 1rem;
          scroll-snap-type: x proximity; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch;
        }
        .lv2-strip:focus-visible { outline: 2px solid rgba(252,250,245,0.45); outline-offset: 4px; border-radius: 0.5rem; }
        /* Inviting tour doorway */
        .lv2-tour-ring { transition: transform ${M.base} ${M.ease}, box-shadow ${M.base} ${M.ease}; animation: lv2TourBreath 4.5s ease-in-out infinite; }
        .lv2-tour-door:hover .lv2-tour-ring { transform: scale(1.06); box-shadow: ${LGLOW.tourHover}; }
        @keyframes lv2TourBreath {
          0%, 100% { box-shadow: ${LGLOW.tourBreathLow}; }
          50% { box-shadow: ${LGLOW.tourBreathHigh}; }
        }
        @media (prefers-reduced-motion: reduce) { .lv2-tour-ring { animation: none !important; } }
        /* Final CTA glow breath */
        .lv2-cta-final { animation: lv2CtaBreath 5s ease-in-out infinite; }
        @keyframes lv2CtaBreath {
          0%, 100% { box-shadow: ${LGLOW.ctaBreathLow}; }
          50% { box-shadow: ${LGLOW.ctaBreathHigh}; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lv2-cta-final { animation: none !important; }
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
          // -webkit- prefix required for the frosted glass to render on iOS
          // Safari / WKWebView (unprefixed backdrop-filter is ignored there).
          WebkitBackdropFilter: navSolid ? "blur(12px)" : "none",
          backdropFilter: navSolid ? "blur(12px)" : "none",
          borderBottom: navSolid ? `1px solid ${L.hairline}` : "1px solid transparent",
          transition: `background ${M.base} ${M.ease}, border-color ${M.base} ${M.ease}`,
          // Keep the fixed chrome clear of the notch / Dynamic Island (portrait)
          // and the landscape side insets under viewport-fit=cover.
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <nav
          aria-label={a11yMainNav}
          style={{
            maxWidth: L.space.wide,
            margin: "0 auto",
            paddingLeft: "max(clamp(1.25rem, 5vw, 2.5rem), env(safe-area-inset-left, 0px))",
            paddingRight: "max(clamp(1.25rem, 5vw, 2.5rem), env(safe-area-inset-right, 0px))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "4rem",
          }}
        >
          <Link href="/" aria-label="The Memory Palace" style={{ textDecoration: "none", display: "flex" }}>
            <PalaceLogo variant="full" color={navSolid ? "dark" : "light"} size="sm" />
          </Link>
          <div style={{ display: isCompact ? "none" : "flex", alignItems: "center", gap: "0.25rem", color: navSolid ? T.color.charcoal : T.color.cream, fontFamily: FONT_BODY, fontSize: L.type.bodyS }}>
            <a className="lv2-navlink" href="#tour">{v2.nav.tour}</a>
            <a className="lv2-navlink" href="#features">{v2.nav.features}</a>
            <a className="lv2-navlink" href="#how-it-works">{v2.nav.how}</a>
            <a className="lv2-navlink" href="#faq">{v2.nav.faq}</a>
            {!isIosApp && (
              <Link className="lv2-navlink" href="/pricing">{v2.nav.pricing}</Link>
            )}
            <Link className="lv2-navlink" href="/login">{v2.nav.signIn}</Link>
            <select
              aria-label={a11yLanguage}
              value={locale}
              onChange={(e) => switchLocale(e.target.value as Locale)}
              style={{
                marginLeft: "0.5rem",
                minHeight: T.touch,
                borderRadius: "0.5rem",
                border: `1px solid ${navSolid ? L.hairline : "rgba(252,250,245,0.4)"}`,
                background: "transparent",
                color: "inherit",
                fontFamily: FONT_BODY,
                // 16px (1rem) is the WebKit no-zoom threshold; below it, focusing
                // this live control jerk-zooms the viewport on iPad/desktop-width
                // WebViews and never zooms back.
                fontSize: L.type.bodyS,
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
            aria-label={menuOpen ? v2.a11y.close : a11yMenu}
            aria-expanded={menuOpen}
            aria-controls="lv2-mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: isCompact ? "inline-flex" : "none",
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
            id="lv2-mobile-menu"
            ref={menuRef}
            style={{
              background: L.canvas,
              borderBottom: `1px solid ${L.hairline}`,
              paddingTop: "0.75rem",
              paddingBottom: "1.25rem",
              paddingLeft: "max(clamp(1.25rem, 5vw, 2.5rem), env(safe-area-inset-left, 0px))",
              paddingRight: "max(clamp(1.25rem, 5vw, 2.5rem), env(safe-area-inset-right, 0px))",
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
                    minWidth: T.touch,
                    minHeight: T.touch,
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
          <HeroMedia
            pauseLabel={v2.a11y.pause}
            playLabel={v2.a11y.play}
            alt={v2.a11y.heroVideo}
            tapToPlayLabel={a11y.tapToPlay ?? "Play video"}
          />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 1.5rem", maxWidth: "60rem" }}>
            {v2.hero.eyebrow ? <Eyebrow onDark>{v2.hero.eyebrow}</Eyebrow> : null}
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
                    maxWidth: "100%",
                    padding: "0 clamp(1.25rem, 6vw, 2.5rem)",
                    borderRadius: "0.75rem",
                    background: L.ctaGrad,
                    color: "#FFF",
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: L.type.body,
                    textDecoration: "none",
                    boxShadow: L.shadow.ctaHero,
                  }}
                >
                  {v2.hero.cta}
                </Link>
                <a
                  href="#tour"
                  className="lv2-navlink"
                  style={{ color: T.color.cream, fontSize: L.type.body, textDecoration: "underline", textUnderlineOffset: "0.25em" }}
                >
                  <span aria-hidden="true">▶ </span>{v2.hero.secondary}
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
                      minHeight: T.touch,
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

        {/* ── 2. Why a palace — moving image banner + clear ink-on-cream text ── */}
        <WhyPalaceVisual w={v2.why as unknown as Record<string, string>} />

        {/* ── 3. Showcase: the guided walk — full-bleed tour with timed captions ── */}
        <section
          id="tour"
          aria-labelledby="lv2-tour-h"
          style={{ position: "relative", background: L.dark, padding: "clamp(4rem, 8vw, 6rem) 0 clamp(2rem, 4vw, 3rem)", overflow: "hidden" }}
        >
          <div style={{ ...wide, position: "relative" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
                <Eyebrow onDark>{v2.showcase.eyebrow}</Eyebrow>
                <H2 id="lv2-tour-h" onDark>{v2.showcase.h2}</H2>
                <p style={{ ...prose, fontFamily: FONT_BODY, fontSize: L.type.lead, lineHeight: 1.5, color: L.inkMutedDark, margin: "0 auto", textWrap: "pretty" }}>
                  {v2.showcase.sub}
                </p>
              </div>
            </Reveal>
            <Reveal>
              <TourPlayer
                videoSrc="/video/walkthrough-tour.mp4"
                posterSrc="/video/walkthrough-poster-v2.jpg"
                ctaLabel={v2.showcase.capCloseCta}
                ctaHref="/register"
                doorwayLabel={v2.hero.secondary}
                tourNote={v2.showcase.tourNote}
                watchAgain={v2.hero.secondary}
                labels={{ pause: v2.a11y.pause, play: v2.a11y.play, close: v2.a11y.close, dialog: v2.a11y.tourDialog, playTour: v2.hero.secondary }}
                scenes={[
                  { key: "ext", side: "left", start: 0.0, end: 0.192, eyebrow: v2.showcase.capExteriorEyebrow, line: v2.showcase.capExterior },
                  { key: "doors", side: "right", start: 0.192, end: 0.415, eyebrow: v2.showcase.capDoorsEyebrow, line: v2.showcase.capDoors },
                  { key: "corr", side: "left", start: 0.415, end: 0.671, eyebrow: v2.showcase.capCorridorEyebrow, line: v2.showcase.capCorridor },
                  { key: "room", side: "right", start: 0.671, end: 0.879, eyebrow: v2.showcase.capRoomEyebrow, line: v2.showcase.capRoom },
                  { key: "close", side: "center", start: 0.879, end: 1.0, line: v2.showcase.capClose },
                ]}
              />
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
            {/* Three chapters, each with its own menu rail that alternates side */}
            {USP_GROUPS.map((group, gi) => {
              const railLeft = gi % 2 === 0; // Capture left, Bring-to-life right, Share left
              return (
                <div
                  key={group.label}
                  className="lv2-chap"
                  style={{
                    // Rail collapses on the compact band (≤1024px, iPad portrait
                    // incl.): single column, rail hidden — was the 1023px @media.
                    gridTemplateColumns: isCompact ? "1fr" : railLeft ? "16rem 1fr" : "1fr 16rem",
                    marginTop: gi === 0 ? 0 : "clamp(3.5rem, 7vw, 6rem)",
                  }}
                >
                  {/* Chapter menu rail */}
                  <nav
                    aria-label={group.label}
                    style={{ display: isCompact ? "none" : "block", order: railLeft ? 0 : 1, alignSelf: "stretch" }}
                  >
                    <div style={{ position: "sticky", top: "6rem" }}>
                      <p style={{ fontFamily: FONT_BODY, fontSize: L.type.micro, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: L.accentLight, margin: "0 0 0.75rem" }}>
                        {group.label}
                      </p>
                      {group.items.map((item, ii) => {
                        const flatIdx = uspIdxByGroup[gi][ii];
                        const isActive = activeUsp === flatIdx;
                        const isPast = activeUsp > flatIdx;
                        return (
                          <button
                            key={item.t}
                            type="button"
                            className="lv2-navlink"
                            aria-current={isActive ? "true" : undefined}
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
                  </nav>

                  {/* Chapter cards */}
                  <div style={{ order: railLeft ? 1 : 0, display: "flex", flexDirection: "column", gap: "clamp(4rem, 8vw, 6.5rem)" }}>
                    {group.items.map((item, ii) => {
                      const flatIdx = uspIdxByGroup[gi][ii];
                      return (
                        <div key={item.t} ref={(el) => setUspRef(flatIdx, el)} data-usp-idx={flatIdx} style={{ scrollMarginTop: "6rem" }}>
                          <Reveal>
                            <p style={{ fontFamily: FONT_BODY, fontSize: L.type.micro, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: L.accentLight, margin: "0 0 0.625rem" }}>
                              {String(flatIdx + 1).padStart(2, "0")} · {group.label}
                            </p>
                            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.type.h3, lineHeight: 1.15, color: T.color.charcoal, margin: "0 0 0.875rem", textWrap: "balance" }}>
                              {item.t}
                            </h3>
                            <p style={{ fontFamily: FONT_BODY, fontSize: L.type.body, lineHeight: 1.6, color: L.inkBody, maxWidth: "34em", margin: "0 0 1.75rem", textWrap: "pretty" }}>
                              {item.b}
                            </p>
                            <div style={{ maxWidth: "36rem" }}>{item.media}</div>
                          </Reveal>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 5. How it works (tight band) ── */}
        <section id="how-it-works" aria-labelledby="lv2-how-h" style={{ background: L.surface, padding: "clamp(3rem, 5vw, 4rem) 0" }}>
          <div style={wide}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
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
                        id={`lv2-how-tab-${mode}`}
                        aria-selected={howMode === mode}
                        aria-controls="lv2-how-panel"
                        onClick={() => setHowMode(mode)}
                        className="lv2-chip"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: T.touch,
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
              <div
                style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "2rem" }}
                {...(!isIosApp ? { id: "lv2-how-panel", role: "tabpanel", "aria-labelledby": `lv2-how-tab-${howMode}` } : {})}
              >
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
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
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
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const note = [v2.notes.n1, v2.notes.n2, v2.notes.n3, v2.notes.n4, v2.notes.n5, v2.notes.n7, v2.notes.n8][n - 1];
                  const noteOnTop = n % 2 === 1;
                  return (
                    <div key={n} style={{ position: "relative", flexShrink: 0, scrollSnapAlign: "center", marginTop: noteOnTop ? 0 : "1.5rem", transform: `rotate(${n % 2 === 1 ? -1.1 : 1.2}deg)`, padding: `${noteOnTop ? "3.25rem" : "0.5rem"} 0.25rem ${noteOnTop ? "0.5rem" : "3.25rem"}` }}>
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
                            fontFamily: "var(--font-display, Georgia, serif)",
                            fontStyle: "italic",
                            fontWeight: 500,
                            fontSize: "1.375rem",
                            lineHeight: 1.15,
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
                        src={`/landing/shots/shot-${n}.webp`}
                        alt={`${v2.mock.shotAlt} ${n}/7`}
                        width={820}
                        height={1446}
                        sizes="(max-width: 768px) 70vw, 16rem"
                        style={{
                          width: "16rem",
                          height: "auto",
                          borderRadius: "0.875rem",
                          boxShadow: "0 22px 56px rgba(0,0,0,0.55)",
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
                          {concession ? <span aria-hidden="true" style={{ color: T.color.success }}>✓ </span> : null}{left}
                        </td>
                        <td style={{ padding: "0.875rem 0.75rem", color: L.inkBody, borderBottom: `1px solid ${L.hairline}`, background: L.surface, verticalAlign: "top", lineHeight: 1.5, fontWeight: concession ? 400 : 500 }}>
                          {concession ? null : <span aria-hidden="true" style={{ color: T.color.success }}>✓ </span>}{right}
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
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: L.scrim.final }} />
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
                  boxShadow: LGLOW.ctaFinalRest,
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
              fontSize: L.type.bodyS,
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
