"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import enMessages from "@/messages/en.json";
import nlMessages from "@/messages/nl.json";
import deMessages from "@/messages/de.json";
import esMessages from "@/messages/es.json";
import frMessages from "@/messages/fr.json";

const landingMessages: Record<string, typeof enMessages> = {
  en: enMessages, nl: nlMessages, de: deMessages, es: esMessages, fr: frMessages,
};
import PalaceLogo from "@/components/landing/PalaceLogo";
import {
  HeroIllustration,
  FeaturePalaceIcon,
  FeatureInterviewIcon,
  FeatureCloudIcon,
  FeatureTimeCapsuleIcon,
  FeatureSharingIcon,
  FeatureLegacyIcon,
  FeatureFamilyTreeIcon,
  FeatureMemoryTracksIcon,
  FeatureMemoryMapIcon,
  AudienceHeritageIcon,
  AudienceGuardianIcon,
  AudienceArchivistIcon,
  AudienceParentsIcon,
} from "@/components/landing/LandingIllustrations";

/* ───────── Error Boundary (P1 #8) ───────── */
class LandingErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ───────── useInView hook (P2 #2) ───────── */
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: "200px", threshold: 0, ...optionsRef.current },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

/* ───────── LazySection wrapper (P2 #2) ───────── */
function LazySection({ children, minHeight = "12rem", id }: { children: React.ReactNode; minHeight?: string; id?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} id={id}>
      {inView ? children : <div style={{ minHeight, background: "transparent" }} />}
    </div>
  );
}

/* ───────── ScrollFadeIn wrapper (P2 #6) ───────── */
function ScrollFadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ rootMargin: "0px", threshold: 0.1 });
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(1.5rem)",
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ───────── Screenshot + BrowserFrame helpers ───────── */
function Screenshot({ src, alt, sizes = "(max-width: 640px) 500px, (max-width: 1024px) 800px, 1200px" }: {
  src: string; alt: string; sizes?: string;
}) {
  const basePath = src.replace(/\.webp$/, "");
  return (
    <img
      src={`${basePath}-800w.webp`}
      srcSet={`${basePath}-500w.webp 500w, ${basePath}-800w.webp 800w, ${basePath}-1200w.webp 1200w`}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        borderRadius: "0 0 0.5rem 0.5rem",
        filter: "sepia(0.25) saturate(0.9) hue-rotate(-5deg) brightness(0.95)",
      }}
    />
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: "0.625rem",
      overflow: "hidden",
      background: "#1e1e1c",
      boxShadow: "0 0.5rem 2rem rgba(212,175,55,0.08), 0 0.25rem 1rem rgba(0,0,0,0.3)",
    }}>
      {/* Browser chrome bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.5rem 0.75rem",
        background: "#2a2a28",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#28c840" }} />
        <div style={{
          marginLeft: "0.5rem",
          flex: 1,
          height: "1.25rem",
          borderRadius: "0.25rem",
          background: "rgba(255,255,255,0.06)",
          maxWidth: "14rem",
        }} />
      </div>
      {/* Content */}
      <div style={{ aspectRatio: "16 / 10", position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/* ───────── Hero Background Video ───────── */
function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    // Programmatic play — handles browser autoplay policies
    const tryPlay = () => {
      v.play().catch(() => {
        // Some browsers need user interaction first; listen for any click
        const onClick = () => {
          v.play().catch(() => {});
          document.removeEventListener("click", onClick);
          document.removeEventListener("touchstart", onClick);
        };
        document.addEventListener("click", onClick, { once: true });
        document.addEventListener("touchstart", onClick, { once: true });
      });
    };
    if (v.readyState >= 3) {
      tryPlay();
    } else {
      v.addEventListener("canplay", tryPlay, { once: true });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: 0.3,
        filter: "saturate(0.6) brightness(0.85)",
        pointerEvents: "none",
      }}
    >
      <source src="/video/hero-bg.mp4" type="video/mp4" />
    </video>
  );
}

/* ───────── FAQ Accordion (P2 #7) ───────── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.scrollHeight);
  }, [answer]);
  return (
    <div
      style={{
        borderBottom: `1px solid ${C.sandstone}40`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: F.display,
          fontSize: "1.125rem",
          fontWeight: 500,
          color: C.charcoal,
          textAlign: "left",
        }}
      >
        {question}
        <span
          style={{
            transition: "transform 0.3s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginLeft: "1rem",
            fontSize: "0.75rem",
            color: C.walnut,
          }}
        >
          &#9660;
        </span>
      </button>
      <div
        ref={contentRef}
        style={{
          overflow: "hidden",
          maxHeight: open ? `${height}px` : "0",
          transition: "max-height 0.35s ease",
        }}
      >
        <p
          style={{
            fontSize: "0.9375rem",
            color: C.walnut,
            lineHeight: 1.7,
            paddingBottom: "1.25rem",
          }}
        >
          {answer}
        </p>
      </div>
    </div>
  );
}

/* ───────── Trust Badge SVG icons (P2 #3) ───────── */
function SslIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke={C.walnut} strokeWidth="1.2" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke={C.walnut} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="11" r="1" fill={C.walnut} />
    </svg>
  );
}

function GdprIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M8 2L3 4.5V8c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V4.5L8 2z" stroke={C.walnut} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 8.5l1.5 1.5L10.5 7" stroke={C.walnut} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EncryptedIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <rect x="2" y="6" width="12" height="9" rx="1.5" stroke={C.walnut} strokeWidth="1.2" />
      <circle cx="8" cy="10.5" r="1.5" stroke={C.walnut} strokeWidth="1" />
      <path d="M8 12v1.5" stroke={C.walnut} strokeWidth="1" strokeLinecap="round" />
      <path d="M5 6V4.5a3 3 0 016 0V6" stroke={C.walnut} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ───────── tiny helpers ───────── */
const F = T.font;
const C = T.color;
/* P2 #4: Accessible muted colors — WCAG AA 4.5:1 contrast */
const MUTED_ON_LIGHT = "#716A5E"; /* ~4.6:1 on #FAFAF7 */
const MUTED_ON_DARK = "#B5ADA3";  /* ~4.7:1 on #2C2C2A */

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
  return (
    <LandingErrorBoundary fallback={<LandingErrorFallback />}>
      <LandingPageContent />
    </LandingErrorBoundary>
  );
}

/* Error fallback (P1 #8) */
function LandingErrorFallback() {
  const { locale } = useTranslation("landing");
  const landing = (landingMessages[locale] || enMessages).landing;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lAny = landing as any;
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: C.linen,
        fontFamily: F.body,
        color: C.charcoal,
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontFamily: F.display,
          fontSize: "2rem",
          fontWeight: 300,
          marginBottom: "1rem",
          color: C.charcoal,
        }}
      >
        {lAny?.errorTitle}
      </h1>
      <p style={{ fontSize: "1rem", color: C.walnut, marginBottom: "2rem", maxWidth: "25rem", lineHeight: 1.6 }}>
        {lAny?.errorDescription}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          fontFamily: F.body,
          fontSize: "1rem",
          fontWeight: 600,
          color: C.white,
          padding: "0.875rem 2rem",
          borderRadius: "0.625rem",
          border: "none",
          background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
          cursor: "pointer",
        }}
      >
        {lAny?.errorRefresh}
      </button>
    </div>
  );
}

function LandingPageContent() {
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const [scrollY, setScrollY] = useState(0);
  const [ctaLoading, setCtaLoading] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const exitShownRef = useRef(false);
  const { locale, setLocale } = useTranslation("landing");
  const landing = (landingMessages[locale] || enMessages).landing;
  const router = useRouter();

  /* ─── CTA loading handler (P1 #4) ─── */
  const handleCtaClick = useCallback((id: string, href: string) => {
    setCtaLoading(id);
    router.push(href);
  }, [router]);

  /* ─── Data arrays ─── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuresAny = landing.features as any;
  const FEATURES = [
    { Icon: FeaturePalaceIcon, title: landing.features.palace3d, desc: landing.features.palace3dDesc },
    { Icon: FeatureInterviewIcon, title: landing.features.aiInterviews, desc: landing.features.aiInterviewsDesc },
    { Icon: FeatureFamilyTreeIcon, title: featuresAny?.familyTree ?? "Family Tree", desc: featuresAny?.familyTreeDesc ?? "" },
    { Icon: FeatureMemoryTracksIcon, title: featuresAny?.memoryTracks ?? "Guided Memory Journeys", desc: featuresAny?.memoryTracksDesc ?? "" },
    { Icon: FeatureMemoryMapIcon, title: featuresAny?.memoryMap ?? "Memory Map", desc: featuresAny?.memoryMapDesc ?? "" },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audienceAny = landing.audience as any;
  const AUDIENCES = [
    { Icon: AudienceHeritageIcon, title: landing.audience.keepersTitle, desc: landing.audience.keepersDesc, accent: C.sage },
    { Icon: AudienceGuardianIcon, title: landing.audience.guardiansTitle, desc: landing.audience.guardiansDesc, accent: C.terracotta },
    { Icon: AudienceArchivistIcon, title: landing.audience.archivistsTitle, desc: landing.audience.archivistsDesc, accent: C.walnut },
    { Icon: AudienceParentsIcon, title: audienceAny?.parentsTitle ?? "Parents Building for the Future", desc: audienceAny?.parentsDesc ?? "", accent: C.gold },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lAny = landing as any;
  const trust = lAny?.trust as Record<string, string> | undefined;
  const comparison = lAny?.comparison as Record<string, string> | undefined;

  const TRUST_STATS = [
    { stat: trust?.stat1 ?? "", label: trust?.label1 ?? "" },
    { stat: trust?.stat2 ?? "", label: trust?.label2 ?? "" },
    { stat: trust?.stat3 ?? "", label: trust?.label3 ?? "" },
    { stat: trust?.stat4 ?? "", label: trust?.label4 ?? "" },
  ];

  const COMPARISONS = [
    {
      category: comparison?.["row1Label"] ?? "",
      left: comparison?.["row1Left"] ?? "",
      right: comparison?.["row1Right"] ?? "",
    },
    {
      category: comparison?.["row2Label"] ?? "",
      left: comparison?.["row2Left"] ?? "",
      right: comparison?.["row2Right"] ?? "",
    },
    {
      category: comparison?.["row3Label"] ?? "",
      left: comparison?.["row3Left"] ?? "",
      right: comparison?.["row3Right"] ?? "",
    },
    {
      category: comparison?.["row4Label"] ?? "",
      left: comparison?.["row4Left"] ?? "",
      right: comparison?.["row4Right"] ?? "",
    },
    {
      category: comparison?.["row5Label"] ?? "",
      left: comparison?.["row5Left"] ?? "",
      right: comparison?.["row5Right"] ?? "",
    },
    {
      category: comparison?.["row6Label"] ?? "",
      left: comparison?.["row6Left"] ?? "",
      right: comparison?.["row6Right"] ?? "",
    },
    {
      category: comparison?.["row7Label"] ?? "",
      left: comparison?.["row7Left"] ?? "",
      right: comparison?.["row7Right"] ?? "",
    },
  ];

  /* ─── Set html lang attribute on locale change (P1 #5) ─── */
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  /* ─── Lock body scroll when mobile menu is open (P1 #7) ─── */
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  /* ─── Scroll tracking ─── */

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const headerOpaque = scrollY > 60;

  /* ─── Sticky bottom CTA visibility (mobile only, after hero) ─── */
  const showStickyBottomCta = isSmall && scrollY > (typeof window !== "undefined" ? window.innerHeight : 800);

  /* ─── Exit-intent modal (desktop only, once per session) ─── */
  useEffect(() => {
    if (isSmall || isMobile) return;
    const startTime = Date.now();
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 0) return; // only trigger when leaving from the top
      if (exitShownRef.current) return;
      if (Date.now() - startTime < 5000) return; // skip first 5 seconds
      exitShownRef.current = true;
      setShowExitModal(true);
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isSmall, isMobile]);

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
      {/* P2 #5: JSON-LD structured data */}
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
                description: locale === "nl"
                  ? "Een 3D virtueel herinneringspaleis om je levensverhaal te bewaren — foto's, video's en verhalen — voor generaties."
                  : "A 3D virtual memory palace to preserve your life story — photos, videos, and stories — for generations.",
              },
              {
                "@type": "Organization",
                name: "The Memory Palace",
                url: "https://thememorypalace.ai",
                logo: "https://thememorypalace.ai/logo.png",
                sameAs: [],
              },
              {
                "@type": "FAQPage",
                mainEntity: [1, 2, 3, 4, 5, 6, 7, 8]
                  .filter((n) => lAny?.faq?.[`q${n}`] && lAny?.faq?.[`a${n}`])
                  .map((n) => ({
                    "@type": "Question",
                    name: lAny.faq[`q${n}`],
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: lAny.faq[`a${n}`],
                    },
                  })),
              },
            ],
          }),
        }}
      />

      {/* Scoped hover / interaction styles */}
      <style>{`
        /* ── P1 #1: Mobile hero text overflow ── */
        @media (max-width: 480px) {
          .lp-hero-title {
            font-size: clamp(1.75rem, 8vw, 2.5rem) !important;
            max-width: 100% !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .lp-hero-subtitle {
            font-size: clamp(0.9375rem, 3.5vw, 1.0625rem) !important;
            max-width: 100% !important;
          }
        }
        /* ── P1 #2: Comparison table responsive — keep side-by-side on mobile ── */
        @media (max-width: 768px) {
          .lp-comparison-row > div {
            padding: 0.625rem 0.5rem !important;
          }
        }
        /* ── P1 #5: Testimonial stacked grid on mobile ── */
        @media (max-width: 640px) {
          .lp-testimonials-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .lp-testimonials-grid > .lp-testimonial-card .lp-testimonial-quote {
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }
        /* ── P1 #11: Mobile nav menu z-index ── */
        .lp-mobile-menu {
          z-index: 1000 !important;
        }
        .lp-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease !important;
        }
        .lp-card:hover {
          transform: translateY(-0.25rem) scale(1.02);
          box-shadow: 0 0.75rem 2.5rem rgba(44,44,42,0.10), 0 0.25rem 0.75rem rgba(44,44,42,0.06);
        }
        .lp-testimonial-card {
          transition: box-shadow 0.35s cubic-bezier(.25,.8,.25,1), transform 0.35s cubic-bezier(.25,.8,.25,1), border-color 0.35s !important;
        }
        .lp-testimonial-card:hover {
          transform: translateY(-0.1875rem);
          box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.15);
          border-color: rgba(255,255,255,0.15) !important;
        }
        .lp-nav-link {
          position: relative;
          transition: color 0.2s !important;
        }
        .lp-nav-link:hover {
          color: ${C.terracotta} !important;
        }
        .lp-nav-cta {
          transition: transform 0.2s, box-shadow 0.2s, filter 0.2s !important;
        }
        .lp-nav-cta:hover {
          transform: translateY(-0.0625rem);
          box-shadow: 0 0.25rem 1rem rgba(193,127,89,0.25);
          filter: brightness(1.05);
        }
        .lp-hero-cta {
          transition: transform 0.25s cubic-bezier(.25,.8,.25,1), box-shadow 0.25s, filter 0.25s !important;
        }
        .lp-hero-cta:hover {
          transform: translateY(-0.125rem) scale(1.02);
          box-shadow: 0 0.5rem 1.75rem rgba(193,127,89,0.35);
          filter: brightness(1.05);
        }
        .lp-hero-secondary {
          transition: border-color 0.25s, background 0.25s, color 0.25s !important;
        }
        .lp-hero-secondary:hover {
          border-color: ${C.terracotta} !important;
          color: ${C.terracotta} !important;
          background: ${C.terracotta}08;
        }
        .lp-footer-link {
          transition: color 0.2s !important;
        }
        .lp-footer-link:hover {
          color: ${C.cream} !important;
        }
        .lp-footer-accent:hover {
          color: ${C.gold} !important;
          text-decoration: underline !important;
        }
        /* ── Focus-visible indicators (a11y) ── */
        .lp-nav-link:focus-visible,
        .lp-nav-cta:focus-visible,
        .lp-hero-cta:focus-visible,
        .lp-hero-secondary:focus-visible,
        .lp-footer-link:focus-visible,
        .lp-footer-accent:focus-visible,
        .lp-card:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: 2px;
        }
        button:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: 2px;
        }
        a:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: 2px;
        }
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible {
          outline: 2px solid ${C.terracotta};
          outline-offset: 2px;
        }
        /* ── Skip-to-content link (a11y) ── */
        .lp-skip-link {
          position: absolute;
          left: -9999px;
          top: 0;
          z-index: 999;
          background: ${C.charcoal};
          color: ${C.white};
          padding: 0.75rem 1.5rem;
          font-family: ${F.body};
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 0 0 0.5rem 0;
        }
        .lp-skip-link:focus {
          left: 0;
        }
        /* Screenshot carousel scrollbar */
        .lp-screenshot-carousel {
          scrollbar-width: thin;
          scrollbar-color: rgba(193,127,89,0.4) transparent;
        }
        .lp-screenshot-carousel::-webkit-scrollbar {
          height: 0.375rem;
        }
        .lp-screenshot-carousel::-webkit-scrollbar-track {
          background: transparent;
        }
        .lp-screenshot-carousel::-webkit-scrollbar-thumb {
          background: rgba(193,127,89,0.4);
          border-radius: 0.25rem;
        }
      `}</style>
      {/* Skip-to-content link (a11y) */}
      <a href="#main-content" className="lp-skip-link">
        {lAny?.a11y?.skipToContent}
      </a>

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
          zIndex: 1000,
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
        <PalaceLogo variant="full" color={headerOpaque ? "dark" : "light"} size="md" />

        <div style={{ display: "flex", gap: isMobile ? "0.5rem" : "0.75rem", alignItems: "center" }}>
          {!isSmall && (
            <a href="#features" className="lp-nav-link" style={{ ...navLink, color: headerOpaque ? C.walnut : C.cream, textDecoration: "none" }}>
              {landing.nav.features}
            </a>
          )}
          {!isSmall && (
            <a href="#how-it-works" className="lp-nav-link" style={{ ...navLink, color: headerOpaque ? C.walnut : C.cream, textDecoration: "none" }}>
              {landing.nav.howItWorks}
            </a>
          )}
          {!isSmall && (
            <Link href="/pricing" className="lp-nav-link" style={{ ...navLink, color: headerOpaque ? C.walnut : C.cream }}>
              {landing.nav.pricing}
            </Link>
          )}
          {!isSmall && (
            <Link href="/login" className="lp-nav-link" style={{ ...navLink, color: headerOpaque ? C.walnut : C.cream }}>
              {landing.nav.signIn}
            </Link>
          )}
          {!isSmall && (
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              aria-label="Switch language"
              style={{
                background: "none",
                border: `1px solid ${headerOpaque ? `${C.sandstone}60` : `${C.sandstone}80`}`,
                borderRadius: "0.375rem",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                fontFamily: F.body,
                fontWeight: 600,
                color: headerOpaque ? C.walnut : C.cream,
                cursor: "pointer",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                transition: "border-color 0.2s, color 0.2s",
                appearance: "none",
                WebkitAppearance: "none",
                paddingRight: "1.25rem",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.375rem center",
              }}
            >
              {locales.map((l) => (
                <option key={l} value={l} style={{ color: "#333" }}>{l.toUpperCase()}</option>
              ))}
            </select>
          )}
          {!isSmall && (
            <button
              onClick={() => handleCtaClick("nav", "/register")}
              className="lp-nav-cta"
              aria-label={lAny?.a11y?.ctaNav}
              style={{
                ...navCta,
                padding: isMobile ? "0.625rem 1.125rem" : "0.5rem 1.25rem",
                opacity: ctaLoading === "nav" ? 0.7 : 1,
                cursor: ctaLoading === "nav" ? "wait" : "pointer",
                border: "none",
              }}
              disabled={ctaLoading === "nav"}
            >
              {ctaLoading === "nav" ? (lAny?.loading) : landing.nav.getStarted}
            </button>
          )}
          {/* P1 #11: Hamburger menu for small screens */}
          {isSmall && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? lAny?.a11y?.closeMenu : lAny?.a11y?.openMenu}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                zIndex: 1001,
              }}
            >
              <span style={{ width: "1.25rem", height: "0.125rem", background: headerOpaque ? C.charcoal : C.cream, borderRadius: "0.0625rem", transition: "transform 0.3s, opacity 0.3s, background 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(0.25rem, 0.25rem)" : "none" }} />
              <span style={{ width: "1.25rem", height: "0.125rem", background: headerOpaque ? C.charcoal : C.cream, borderRadius: "0.0625rem", transition: "opacity 0.3s, background 0.3s", opacity: mobileMenuOpen ? 0 : 1 }} />
              <span style={{ width: "1.25rem", height: "0.125rem", background: headerOpaque ? C.charcoal : C.cream, borderRadius: "0.0625rem", transition: "transform 0.3s, opacity 0.3s, background 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(0.25rem, -0.25rem)" : "none" }} />
            </button>
          )}
        </div>

        {/* P1 #11: Mobile dropdown menu */}
        {isSmall && mobileMenuOpen && (
          <>
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <div
            className="lp-mobile-menu"
            style={{
              position: "fixed",
              top: "4rem",
              left: 0,
              right: 0,
              background: "rgba(250,250,247,0.98)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: `1px solid ${C.sandstone}40`,
              padding: "1.5rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              animation: "fadeUp 0.2s ease both",
            }}
          >
            <a href="#features" className="lp-nav-link" style={{ ...navLink, padding: "0.75rem 0", textDecoration: "none" }} onClick={() => setMobileMenuOpen(false)}>
              {landing.nav.features}
            </a>
            <a href="#how-it-works" className="lp-nav-link" style={{ ...navLink, padding: "0.75rem 0", textDecoration: "none" }} onClick={() => setMobileMenuOpen(false)}>
              {landing.nav.howItWorks}
            </a>
            <Link href="/pricing" className="lp-nav-link" style={{ ...navLink, padding: "0.75rem 0" }} onClick={() => setMobileMenuOpen(false)}>
              {landing.nav.pricing}
            </Link>
            <Link href="/login" className="lp-nav-link" style={{ ...navLink, padding: "0.75rem 0" }} onClick={() => setMobileMenuOpen(false)}>
              {landing.nav.signIn}
            </Link>
            {/* Language selector in mobile menu */}
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              aria-label="Switch language"
              style={{
                background: "none",
                border: `1px solid ${C.sandstone}60`,
                borderRadius: "0.375rem",
                padding: "0.625rem 0.75rem",
                fontSize: "0.8125rem",
                fontFamily: F.body,
                fontWeight: 600,
                color: C.walnut,
                cursor: "pointer",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                appearance: "none",
                WebkitAppearance: "none",
                paddingRight: "1.75rem",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
              }}
            >
              {locales.map((l) => (
                <option key={l} value={l} style={{ color: "#333" }}>{l.toUpperCase()}</option>
              ))}
            </select>
            <button
              onClick={() => { setMobileMenuOpen(false); handleCtaClick("nav-mobile", "/register"); }}
              className="lp-nav-cta"
              style={{
                ...navCta,
                padding: "0.75rem 1.25rem",
                textAlign: "center" as const,
                border: "none",
                cursor: ctaLoading === "nav-mobile" ? "wait" : "pointer",
                opacity: ctaLoading === "nav-mobile" ? 0.7 : 1,
              }}
              disabled={ctaLoading === "nav-mobile"}
            >
              {ctaLoading === "nav-mobile" ? (lAny?.loading) : landing.nav.getStarted}
            </button>
          </div>
          </>
        )}
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
            background: C.charcoal,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background video */}
          <HeroVideo />
          {/* Gradient overlay for text readability */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(42,34,24,0.65) 0%, rgba(42,34,24,0.45) 40%, rgba(42,34,24,0.7) 100%)`,
              pointerEvents: "none",
            }}
          />
          {/* Label */}
          <p
            style={{
              fontFamily: F.body,
              fontSize: "0.8125rem",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: C.gold,
              fontWeight: 600,
              marginBottom: "1.5rem",
              animation: "fadeUp 0.7s ease both",
              position: "relative",
            }}
          >
            {lAny.hero?.label || landing.hero.headline}
          </p>

          {/* Main headline */}
          <h1
            className="lp-hero-title"
            style={{
              fontFamily: F.display,
              fontSize: "clamp(2.5rem, 6.5vw, 4.75rem)",
              fontWeight: 300,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: "53.125rem",
              margin: "0 auto 1.75rem",
              color: C.linen,
              animation: "fadeUp 0.7s ease 0.1s both",
              padding: isSmall ? "0 0.5rem" : undefined,
              position: "relative",
              textShadow: "0 0.125rem 0.5rem rgba(0,0,0,0.5), 0 0 1rem rgba(0,0,0,0.3)",
            }}
          >
            {landing.hero.storyDeserves}
            <br />
            <span style={{ fontStyle: "italic", color: C.gold }}>
              {landing.hero.moreThanFolder}
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="lp-hero-subtitle"
            style={{
              fontSize: "clamp(1.0625rem, 2.2vw, 1.3125rem)",
              color: C.cream,
              maxWidth: "37.5rem",
              lineHeight: 1.7,
              marginBottom: "2.75rem",
              animation: "fadeUp 0.7s ease 0.2s both",
              padding: isSmall ? "0 0.5rem" : undefined,
              position: "relative",
              textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,0.4), 0 0 0.75rem rgba(0,0,0,0.2)",
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
              animation: "fadeUp 0.7s ease 0.35s both",
              width: isSmall ? "100%" : undefined,
              position: "relative",
            }}
          >
            <button
              onClick={() => handleCtaClick("hero", "/register")}
              className="lp-hero-cta"
              aria-label={lAny?.a11y?.ctaHero}
              disabled={ctaLoading === "hero"}
              style={{
                ...heroCta,
                width: isSmall ? "100%" : undefined,
                textAlign: "center" as const,
                minHeight: "3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: ctaLoading === "hero" ? "wait" : "pointer",
                opacity: ctaLoading === "hero" ? 0.7 : 1,
              }}
            >
              {ctaLoading === "hero" ? (lAny?.loading) : landing.hero.cta}
            </button>
            <button
              onClick={() => {
                document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="lp-hero-secondary"
              style={{
                ...heroSecondary,
                width: isSmall ? "100%" : undefined,
                textAlign: "center" as const,
                minHeight: "3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "none",
              }}
            >
              {landing.hero.secondaryCta}
            </button>
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
              color: C.sandstone,
              textDecoration: "none",
              animation: "fadeUp 0.7s ease 0.45s both",
              transition: "color 0.2s",
              position: "relative",
            }}
          >
            <LockIcon size={14} color={C.sandstone} />
            {landing.hero.securityLink}
          </Link>

          {/* P2 #3: Trust badges */}
          <div
            style={{
              display: "flex",
              gap: isMobile ? "1rem" : "1.5rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "1rem",
              animation: "fadeUp 0.7s ease 0.5s both",
              position: "relative",
            }}
          >
            {[
              { Icon: SslIcon, label: lAny?.trustBadges?.ssl },
              { Icon: GdprIcon, label: lAny?.trustBadges?.gdpr },
              { Icon: EncryptedIcon, label: lAny?.trustBadges?.encrypted },
            ].map((badge) => (
              <div
                key={badge.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <badge.Icon size={14} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: C.sandstone,
                    fontFamily: F.body,
                    letterSpacing: "0.3px",
                  }}
                >
                  {badge.label}
                </span>
              </div>
            ))}
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
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: C.sandstone, letterSpacing: 1 }}>
              {landing.scroll}
            </span>
            <div
              style={{
                width: "0.0625rem",
                height: "1.75rem",
                background: `linear-gradient(to bottom, ${C.sandstone}, transparent)`,
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
            4. FEATURES SECTION (P2 #2: lazy-loaded)
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="30rem" id="features">
          <section
            style={{
              padding: isMobile
                ? "4.5rem 1.25rem"
                : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
              maxWidth: "68.75rem",
              margin: "0 auto",
            }}
          >
            <p style={sectionLabel}>{landing.features.title}</p>
            <h2 style={sectionTitle}>{featuresAny?.subtitle ?? landing.features.subtitle}</h2>

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
              {FEATURES.map((f, i) => (
                <ScrollFadeIn key={f.title} delay={0.05 + i * 0.07}>
                  <div
                    className="lp-card"
                    style={featureCard}
                  >
                    <div style={{ marginBottom: "1.125rem" }}>
                      <f.Icon size={48} />
                    </div>
                    <h3 style={featureTitle}>{f.title}</h3>
                    <p style={featureDesc}>{f.desc}</p>
                  </div>
                </ScrollFadeIn>
              ))}
            </div>
          </section>
        </LazySection>

        {/* ═══════════════════════════════════════════════════
            5. HOW IT WORKS (P2 #2: lazy-loaded)
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="20rem" id="how-it-works">
        <section
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
                      opacity: 0.35,
                      marginBottom: "0.75rem",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
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
        </LazySection>

        {/* ═══════════════════════════════════════════════════
            5b. MID-PAGE CTA
            ═══════════════════════════════════════════════════ */}
        <section
          style={{
            padding: isMobile ? "2.5rem 1.25rem" : "3.5rem clamp(1.25rem, 5vw, 3.75rem)",
            textAlign: "center",
            background: `linear-gradient(135deg, ${C.terracotta}08, ${C.gold}06)`,
            borderTop: `1px solid ${C.sandstone}20`,
            borderBottom: `1px solid ${C.sandstone}20`,
          }}
        >
          <p
            style={{
              fontSize: "1.125rem",
              color: C.charcoal,
              fontFamily: F.display,
              fontWeight: 400,
              marginBottom: "1.25rem",
            }}
          >
            {lAny?.midCta?.text ?? "Ready to start? Your first palace is free."}
          </p>
          <button
            onClick={() => handleCtaClick("mid", "/register")}
            className="lp-hero-cta"
            disabled={ctaLoading === "mid"}
            style={{
              ...heroCta,
              border: "none",
              cursor: ctaLoading === "mid" ? "wait" : "pointer",
              opacity: ctaLoading === "mid" ? 0.7 : 1,
              fontSize: "0.9375rem",
              padding: "0.875rem 2rem",
            }}
          >
            {ctaLoading === "mid" ? (lAny?.loading) : (lAny?.midCta?.button ?? "Start Building Now")}
          </button>
        </section>

        {/* ═══════════════════════════════════════════════════
            5c. PRODUCT SHOWCASE
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="30rem" id="showcase">
        <section
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            background: `linear-gradient(160deg, ${C.charcoal} 0%, #3D3D3A 50%, ${C.charcoal} 100%)`,
          }}
        >
          <div style={{ maxWidth: "68.75rem", margin: "0 auto" }}>
            <p style={{ ...sectionLabel, color: C.terracotta }}>
              {lAny?.showcase?.label ?? "SEE IT IN ACTION"}
            </p>
            <h2 style={{ ...sectionTitle, color: C.linen }}>
              {lAny?.showcase?.title ?? "Your palace, from the inside"}
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: MUTED_ON_DARK,
                textAlign: "center",
                maxWidth: "37.5rem",
                margin: "0 auto 3rem",
                lineHeight: 1.7,
              }}
            >
              {lAny?.showcase?.subtitle ?? ""}
            </p>

            {/* Video Player */}
            <ScrollFadeIn>
            <div
              style={{
                position: "relative",
                maxWidth: "56.25rem",
                margin: "0 auto 3.5rem",
                borderRadius: "1rem",
                overflow: "hidden",
                boxShadow: "0 1.5rem 4rem rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                aspectRatio: "16 / 9",
                background: "#1a1a18",
              }}
            >
              <video
                controls
                preload="metadata"
                playsInline
                poster=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              >
                <source src="/video/walkthrough.mp4" type="video/mp4" />
              </video>
            </div>
            </ScrollFadeIn>

          </div>
        </section>
        </LazySection>

        {/* ═══════════════════════════════════════════════════
            5b. SCREENSHOT SHOWCASE — "Inside Your Palace"
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="24rem">
        <section
          style={{
            padding: isMobile ? "4rem 0" : "6.25rem 0",
            background: `linear-gradient(180deg, #1a1a18 0%, ${C.charcoal} 100%)`,
            overflow: "hidden",
          }}
        >
          {/* Section header */}
          <div style={{ maxWidth: "68rem", margin: "0 auto", padding: "0 1.25rem" }}>
            <ScrollFadeIn>
              <p style={{ ...sectionLabel, color: C.gold }}>
                {(lAny?.screenshots as Record<string, string>)?.immersiveTitle ?? "This is not a photo album."}
              </p>
              <h2 style={{ ...sectionTitle, color: C.white, marginBottom: isMobile ? "2rem" : "3rem" }}>
                {(lAny?.screenshots as Record<string, string>)?.immersiveSubtitle ?? "This is a palace."}
              </h2>
            </ScrollFadeIn>
          </div>

          {/* Horizontal carousel */}
          <ScrollFadeIn delay={0.15}>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              paddingLeft: isMobile ? "1.25rem" : "clamp(1.25rem, 5vw, 3.75rem)",
              paddingRight: isMobile ? "1.25rem" : "clamp(1.25rem, 5vw, 3.75rem)",
              paddingBottom: "1.5rem",
              WebkitOverflowScrolling: "touch",
            }}
            className="lp-screenshot-carousel"
          >
            {[
              { src: "/screenshots/corridor-gallery.webp", caption: (lAny?.screenshots as Record<string, string>)?.carouselCorridor ?? "Walk through torch-lit corridors of memory" },
              { src: "/screenshots/interview-intro.webp", caption: (lAny?.screenshots as Record<string, string>)?.carouselInterview ?? "AI picks the perfect questions for your story" },
              { src: "/screenshots/family-tree-view.webp", caption: (lAny?.screenshots as Record<string, string>)?.carouselFamilyTree ?? "Visualize generations of your family" },
              { src: "/screenshots/library-nest.webp", caption: (lAny?.screenshots as Record<string, string>)?.carouselLibrary ?? "Your personal memory library" },
              { src: "/screenshots/achievements.webp", caption: (lAny?.screenshots as Record<string, string>)?.carouselAchievements ?? "Earn badges as you preserve your story" },
              { src: "/screenshots/quest-preserve.webp", caption: (lAny?.screenshots as Record<string, string>)?.carouselQuest ?? "Guided journeys to unlock memories" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  flex: "0 0 auto",
                  width: isMobile ? "85vw" : "22rem",
                  scrollSnapAlign: "start",
                }}
              >
                <BrowserFrame>
                  <Screenshot src={item.src} alt={item.caption} />
                </BrowserFrame>
                <p style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  color: MUTED_ON_DARK,
                  textAlign: "center",
                  marginTop: "0.75rem",
                  lineHeight: 1.4,
                }}>
                  {item.caption}
                </p>
              </div>
            ))}
          </div>
          </ScrollFadeIn>
        </section>
        </LazySection>

        {/* Section divider */}
        <div style={{ maxWidth: "6rem", margin: "0 auto", height: "0.0625rem", background: `linear-gradient(to right, transparent, ${C.sandstone}, transparent)` }} />

        {/* ═══════════════════════════════════════════════════
            6. COMPARISON SECTION (P2 #2 + #6: lazy + scroll animate)
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="20rem">
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
              {comparison?.title ?? ""}
            </p>
            <h2 style={sectionTitle}>
              {comparison?.subtitle ?? ""}
            </h2>

            {/* Comparison table */}
            <div
              role="table"
              aria-label={comparison?.title ?? "Comparison"}
              style={{
                marginTop: isMobile ? "2rem" : "3.5rem",
                borderRadius: "1rem",
                overflow: "hidden",
                border: `1px solid ${C.sandstone}40`,
                boxShadow: "0 0.125rem 0.75rem rgba(44,44,42,0.04)",
              }}
            >
              {/* Header row */}
              <div
                role="row"
                className="lp-comparison-header"
                style={{
                  display: "grid",
                  gridTemplateColumns: isSmall ? "1fr 1fr" : "1.2fr 1fr 1fr",
                  background: C.warmStone,
                  borderBottom: `1px solid ${C.sandstone}40`,
                }}
              >
                {!isSmall && <div role="columnheader" style={{ padding: "1rem 1.5rem" }} />}
                <div
                  role="columnheader"
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
                      color: MUTED_ON_LIGHT,
                      fontWeight: 600,
                    }}
                  >
                    {comparison?.columnLeft ?? ""}
                  </p>
                </div>
                <div
                  role="columnheader"
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
                    {comparison?.columnRight ?? ""}
                  </p>
                </div>
              </div>

              {/* Comparison rows — P2 #6: staggered scroll fade */}
              {COMPARISONS.map((row, i) => (
                <ScrollFadeIn key={i} delay={0.05 + i * 0.08}>
                <div
                  role="row"
                  className="lp-comparison-row"
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
                      role="cell"
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

                  {/* Left (old way) — P2 #4: improved contrast */}
                  <div
                    role="cell"
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
                            color: MUTED_ON_LIGHT,
                            marginBottom: "0.125rem",
                          }}
                        >
                          {row.category}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: isSmall ? "0.75rem" : "0.875rem",
                          color: MUTED_ON_LIGHT,
                          lineHeight: 1.4,
                        }}
                      >
                        {row.left}
                      </p>
                    </div>
                  </div>

                  {/* Right (Memory Palace) */}
                  <div
                    role="cell"
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
                </ScrollFadeIn>
              ))}
            </div>
          </div>
        </section>
        </LazySection>

        {/* Section divider */}
        <div style={{ maxWidth: "6rem", margin: "0 auto", height: "0.0625rem", background: `linear-gradient(to right, transparent, ${C.sandstone}, transparent)` }} />

        {/* ═══════════════════════════════════════════════════
            7. AUDIENCE SECTION (P2 #2: lazy-loaded)
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="20rem">
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
              gridTemplateColumns: isSmall ? "1fr" : isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: "1.75rem",
              marginTop: "3.5rem",
            }}
          >
            {AUDIENCES.map((a, i) => (
              <div
                key={a.title}
                className="lp-card"
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
                  animation: `fadeUp 0.6s ease ${0.1 + i * 0.1}s both`,
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
        </LazySection>

        {/* ═══════════════════════════════════════════════════
            8. TESTIMONIALS SECTION (P2 #2: lazy-loaded)
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="20rem">
        <section
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            background: `linear-gradient(160deg, ${C.charcoal} 0%, #3D3D3A 50%, ${C.charcoal} 100%)`,
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
              className="lp-testimonials-grid"
              style={{
                display: "grid",
                gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
                gap: "1.5rem",
                marginTop: "3.5rem",
              }}
            >
              {TESTIMONIALS.map((tm, i) => (
                <div
                  key={tm.name}
                  className="lp-testimonial-card"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "1rem",
                    padding: isMobile ? "1.75rem 1.5rem" : "2.25rem 2rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    animation: `fadeUp 0.6s ease ${0.15 + i * 0.1}s both`,
                  }}
                >
                  <div>
                    {/* Star rating */}
                    <div style={{ display: "flex", gap: "0.125rem", marginBottom: "0.75rem" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="1rem" height="1rem" aria-hidden="true">
                          <path d="M10 1l2.39 5.36L18 7.27l-4 4.15L15 18 10 15l-5 3 1-6.58-4-4.15 5.61-.91z" fill={C.gold} />
                        </svg>
                      ))}
                    </div>
                    <p
                      className="lp-testimonial-quote"
                      style={{
                        fontSize: "1.0625rem",
                        color: C.cream,
                        lineHeight: 1.75,
                        marginBottom: "1.75rem",
                        fontStyle: "italic",
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
        </LazySection>

        {/* ═══════════════════════════════════════════════════
            8b. FAQ SECTION (P2 #7)
            ═══════════════════════════════════════════════════ */}
        <LazySection minHeight="15rem">
        <section
          style={{
            padding: isMobile
              ? "4rem 1.25rem"
              : "6.25rem clamp(1.25rem, 5vw, 3.75rem)",
            background: C.linen,
          }}
        >
          <div style={{ maxWidth: "43.75rem", margin: "0 auto" }}>
            <h2 style={sectionTitle}>
              {lAny?.faq?.title}
            </h2>
            <div style={{ marginTop: "2.5rem" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                const q = lAny?.faq?.[`q${n}`];
                const a = lAny?.faq?.[`a${n}`];
                if (!q || !a) return null;
                return <FaqItem key={n} question={q} answer={a} />;
              })}
            </div>
          </div>
        </section>
        </LazySection>

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
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 300,
                color: C.charcoal,
                marginBottom: "1.25rem",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {landing.cta.title}
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: C.walnut,
                maxWidth: "30rem",
                margin: "0 auto 2.75rem",
                lineHeight: 1.7,
              }}
            >
              {landing.cta.description}
            </p>
            <button
              onClick={() => handleCtaClick("bottom", "/register")}
              className="lp-hero-cta"
              aria-label={lAny?.a11y?.ctaBottom}
              disabled={ctaLoading === "bottom"}
              style={{
                ...heroCta,
                border: "none",
                cursor: ctaLoading === "bottom" ? "wait" : "pointer",
                opacity: ctaLoading === "bottom" ? 0.7 : 1,
              }}
            >
              {ctaLoading === "bottom" ? (lAny?.loading) : landing.cta.button}
            </button>
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
                color: MUTED_ON_DARK,
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
                className="lp-footer-link"
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  textDecoration: "none",
                }}
              >
                {landing.footer.features}
              </a>
              <a
                href="#how-it-works"
                className="lp-footer-link"
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  textDecoration: "none",
                }}
              >
                {landing.footer.howItWorks}
              </a>
              <Link
                href="/pricing"
                className="lp-footer-link"
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  textDecoration: "none",
                }}
              >
                {landing.footer.pricing}
              </Link>
              <Link
                href="/blog"
                className="lp-footer-link"
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  textDecoration: "none",
                }}
              >
                Blog
              </Link>
              <Link
                href="/login"
                className="lp-footer-link"
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  textDecoration: "none",
                }}
              >
                {landing.footer.signIn}
              </Link>
              <Link
                href="/register"
                className="lp-footer-accent"
                aria-label={lAny?.a11y?.ctaFooter}
                style={{
                  fontSize: "0.875rem",
                  color: C.terracotta,
                  textDecoration: "none",
                  transition: "color 0.2s",
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
                  color: MUTED_ON_DARK,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <LockIcon size={14} color={MUTED_ON_DARK} />
                {landing.footer.euHosted}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ShieldIcon size={14} color={MUTED_ON_DARK} />
                {landing.footer.encryption}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: MUTED_ON_DARK,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ClipboardIcon size={14} color={MUTED_ON_DARK} />
                {landing.footer.gdpr}
              </p>
              <Link
                href="/security"
                className="lp-footer-accent"
                style={{
                  fontSize: "0.875rem",
                  color: C.terracotta,
                  textDecoration: "none",
                  marginTop: "0.25rem",
                  transition: "color 0.2s",
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
          <p style={{ fontSize: "0.75rem", color: MUTED_ON_DARK }}>
            &copy; {new Date().getFullYear()} {landing.footer.copyright}
          </p>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <Link
              href="/privacy"
              className="lp-footer-link"
              style={{
                fontSize: "0.75rem",
                color: MUTED_ON_DARK,
                textDecoration: "none",
              }}
            >
              {landing.footer.privacyPolicy}
            </Link>
            <Link
              href="/terms"
              className="lp-footer-link"
              style={{
                fontSize: "0.75rem",
                color: MUTED_ON_DARK,
                textDecoration: "none",
              }}
            >
              {landing.footer.termsOfService}
            </Link>
            <Link
              href="/login"
              className="lp-footer-link"
              style={{
                fontSize: "0.75rem",
                color: MUTED_ON_DARK,
                textDecoration: "none",
              }}
            >
              {landing.footer.signIn}
            </Link>
            <Link
              href="/register"
              className="lp-footer-accent"
              aria-label={lAny?.a11y?.ctaFooterBottom}
              style={{
                fontSize: "0.75rem",
                color: C.terracotta,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {landing.nav.getStarted}
            </Link>
          </div>
        </div>
      </footer>

      {/* ─── Sticky Bottom CTA (mobile only) ─── */}
      {isSmall && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 900,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "0.75rem 1rem",
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
            background: `linear-gradient(135deg, ${C.terracotta}ee, ${C.walnut}ee)`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: `1px solid ${C.sandstone}40`,
            opacity: showStickyBottomCta ? 1 : 0,
            pointerEvents: showStickyBottomCta ? "auto" : "none",
            transform: showStickyBottomCta ? "translateY(0)" : "translateY(100%)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          <button
            onClick={() => handleCtaClick("sticky-bottom", "/register")}
            style={{
              fontFamily: F.body,
              fontSize: "1rem",
              fontWeight: 600,
              color: C.white,
              background: "transparent",
              border: `1.5px solid ${C.white}60`,
              borderRadius: "0.625rem",
              padding: "0.75rem 2rem",
              width: "100%",
              maxWidth: "24rem",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            {landing.hero.cta}
          </button>
        </div>
      )}

      {/* ─── Exit-Intent Modal (desktop only) ─── */}
      {showExitModal && (
        <div
          onClick={() => setShowExitModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "26.25rem",
              width: "90%",
              background: `linear-gradient(145deg, ${C.linen}f0, ${C.sandstone}d0)`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "1.25rem",
              padding: "2.5rem 2rem 2rem",
              boxShadow: "0 1.5rem 4rem rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)",
              textAlign: "center",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowExitModal(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                background: "transparent",
                border: "none",
                fontSize: "1.25rem",
                color: C.charcoal,
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
                lineHeight: 1,
                opacity: 0.6,
              }}
            >
              &#x2715;
            </button>
            <h2
              style={{
                fontFamily: F.display,
                fontSize: "1.5rem",
                fontWeight: 700,
                color: C.charcoal,
                marginBottom: "0.75rem",
              }}
            >
              {lAny?.exitIntent?.title ?? "Before you go\u2026"}
            </h2>
            <p
              style={{
                fontFamily: F.body,
                fontSize: "1rem",
                color: C.walnut,
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              {lAny?.exitIntent?.body ?? "Your family\u2019s story deserves to be preserved. Create your Memory Palace in 2 minutes \u2014 free."}
            </p>
            <Link
              href="/register"
              onClick={() => { setShowExitModal(false); handleCtaClick("exit-intent", "/register"); }}
              style={{
                display: "inline-block",
                fontFamily: F.body,
                fontSize: "1rem",
                fontWeight: 600,
                color: C.white,
                textDecoration: "none",
                padding: "0.875rem 2rem",
                borderRadius: "0.75rem",
                background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                boxShadow: "0 0.25rem 1rem rgba(193,127,89,0.3)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              {lAny?.exitIntent?.cta ?? "Create Your Palace \u2014 Free"}
            </Link>
          </div>
        </div>
      )}

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
  boxShadow: "0 0.125rem 0.5rem rgba(193,127,89,0.2)",
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
  color: C.cream,
  textDecoration: "none",
  padding: "1rem 2.25rem",
  borderRadius: "0.875rem",
  border: `1.5px solid ${C.sandstone}80`,
  transition: "border-color 0.2s",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: "0.8125rem",
  letterSpacing: "2.5px",
  textTransform: "uppercase",
  color: C.terracotta,
  fontWeight: 600,
  textAlign: "center",
  marginBottom: "1rem",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
  fontWeight: 300,
  textAlign: "center",
  color: C.charcoal,
  lineHeight: 1.2,
  marginBottom: "0.5rem",
};

const featureCard: React.CSSProperties = {
  background: C.white,
  borderRadius: "1rem",
  padding: "2.25rem 1.75rem",
  border: `1px solid ${C.sandstone}40`,
  boxShadow: "0 0.0625rem 0.25rem rgba(44,44,42,0.03)",
};

const featureTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: "1.3125rem",
  fontWeight: 500,
  color: C.charcoal,
  marginBottom: "0.625rem",
};

const featureDesc: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: C.walnut,
  lineHeight: 1.65,
};
