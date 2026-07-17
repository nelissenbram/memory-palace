"use client";

/**
 * Atrium hero — "The Grand Threshold" (round-10, ambition x100).
 *
 * A single living establishing shot of the palace as the centrepiece: an
 * SSR poster (zero CLS, LCP) with a muted cinematic video loop layered over it
 * on capable devices, graded to the user's REAL local hour (dawn / day / dusk /
 * night), a soft top-vignette that melts the footage into the cream page so it
 * reads as a window not a game viewport, and a bottom charcoal scrim carrying a
 * floating film-title lockup: the palace mark, a Fraunces greeting whose
 * time-word tracks the same hour, one museum-wall-label metadata line built
 * from the real memory / room / wing counts, and ONE luminous "enter your
 * palace" action with a slow gold sheen. Reduced-motion / Save-Data get the
 * graded poster only. (Phase 4 will swap the video for the user's OWN live 3D
 * palace + a match-cut entry.)
 */

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";

interface AtriumHeroProps {
  userName: string | null;
  totalMemories: number;
  totalWings: number;
  totalRooms: number;
  onNavigateLibrary: () => void;
  onNavigatePalace: () => void;
  isMobile: boolean;
}

function getGreetingKey(hour: number): string {
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

/** Real-hour grade: an overlay gradient + media filter, no new image assets. */
function hourGrade(hour: number): { overlay: string; filter: string } {
  if (hour >= 5 && hour < 8) {
    // dawn — rose + low gold
    return {
      overlay: "linear-gradient(180deg, rgba(255,196,150,0.16) 0%, rgba(120,80,90,0.10) 55%, rgba(36,28,21,0.0) 100%)",
      filter: "saturate(1.05) brightness(1.02)",
    };
  }
  if (hour >= 8 && hour < 17) {
    // day — clear warm
    return {
      overlay: "linear-gradient(180deg, rgba(255,241,214,0.10) 0%, rgba(36,28,21,0.0) 60%)",
      filter: "saturate(1.06) brightness(1.05)",
    };
  }
  if (hour >= 17 && hour < 20) {
    // dusk — golden amber
    return {
      overlay: "linear-gradient(180deg, rgba(255,178,102,0.20) 0%, rgba(154,79,42,0.12) 55%, rgba(36,28,21,0.0) 100%)",
      filter: "saturate(1.12) brightness(1.0) contrast(1.03)",
    };
  }
  // night — deep indigo, warm windows kept
  return {
    overlay: "linear-gradient(180deg, rgba(30,42,80,0.34) 0%, rgba(20,26,52,0.20) 55%, rgba(36,28,21,0.0) 100%)",
    filter: "saturate(0.98) brightness(0.9)",
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function saveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return !!c && !!c.saveData;
}

export default function AtriumHero({
  userName,
  totalMemories,
  totalWings,
  totalRooms,
  onNavigateLibrary,
  onNavigatePalace,
  isMobile,
}: AtriumHeroProps) {
  const { t, locale } = useTranslation("atrium");
  const videoRef = useRef<HTMLVideoElement>(null);

  const [hour, setHour] = useState(10);
  const [mounted, setMounted] = useState(false);
  const [wantVideo, setWantVideo] = useState(false);
  const [videoLive, setVideoLive] = useState(false);

  useEffect(() => {
    setHour(new Date().getHours());
    const id = requestAnimationFrame(() => setMounted(true));
    if (!prefersReducedMotion() && !saveData()) setWantVideo(true);
    // keep the grade honest across a long session (top of each hour)
    const tick = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => { cancelAnimationFrame(id); window.clearInterval(tick); };
  }, []);

  useEffect(() => {
    if (!wantVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const attempt = () => { if (v.paused) { v.muted = true; v.play().then(() => setVideoLive(true)).catch(() => {}); } };
    v.addEventListener("canplay", attempt);
    const timers = [500, 1600, 3200].map((ms) => window.setTimeout(attempt, ms));
    return () => { v.removeEventListener("canplay", attempt); timers.forEach((x) => window.clearTimeout(x)); };
  }, [wantVideo]);

  const grade = hourGrade(hour);
  const greeting = userName ? t(getGreetingKey(hour)) : t("welcomeToYourPalace");
  const isFirstRun = totalMemories <= 0;

  const metaLine = isFirstRun
    ? t("firstMemoryPrompt")
    : [
        `${totalMemories} ${t("memories")}`,
        `${totalRooms} ${t("rooms")}`,
        `${totalWings} ${t("wings")}`,
      ].join("  ·  ");

  return (
    <section
      aria-label={t("heroSection")}
      style={{
        position: "relative",
        width: "100%",
        height: isMobile ? "min(60vh, 30rem)" : "min(56vh, 34rem)",
        minHeight: isMobile ? "22rem" : "24rem",
        borderRadius: isMobile ? "1.25rem" : "1.5rem",
        overflow: "hidden",
        border: `0.0625rem solid ${T.color.terracotta}44`,
        boxShadow: "0 1.5rem 3.5rem rgba(36,28,21,0.22), inset 0 0.0625rem 0 rgba(255,255,255,0.10)",
        background: T.color.charcoal,
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.8s ease",
      }}
    >
      {/* Poster — SSR/LCP, always painted, zero CLS */}
      <Image
        src="/video/hero-poster.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 48rem) 100vw, 72rem"
        style={{ objectFit: "cover", filter: grade.filter, transition: "filter 1.2s ease" }}
      />

      {/* Cinematic loop, layered over the poster on capable devices */}
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
            filter: grade.filter,
            opacity: videoLive ? 1 : 0,
            transition: "opacity 1.4s ease, filter 1.2s ease",
          }}
        >
          <source src="/video/hero-bg.mp4" type="video/mp4" />
        </video>
      ) : null}

      {/* Real-hour grade overlay (top) + reading scrim (bottom) */}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: grade.overlay, transition: "background 1.2s ease" }} />
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg, rgba(36,28,21,0) 42%, rgba(36,28,21,0.5) 74%, rgba(36,28,21,0.82) 100%)" }} />
      {/* soft top vignette melting footage into the page */}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 2.5rem 4rem rgba(36,28,21,0.35)" }} />

      {/* Title lockup — floats bottom-left over the scrim, no glass card */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: isMobile ? "1.25rem 1.25rem 1.5rem" : "2rem 2.5rem 2.25rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.5rem",
        }}
      >
        <div style={{ transform: mounted ? "none" : "translateY(0.75rem)", opacity: mounted ? 1 : 0, transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s" }}>
          <PalaceLogo variant="mark" color="light" size="sm" />
        </div>

        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.875rem" : "2.75rem",
            fontWeight: 600,
            letterSpacing: "-0.005em",
            lineHeight: 1.1,
            margin: 0,
            color: T.color.linen,
            textShadow: "0 0.125rem 1.5rem rgba(36,28,21,0.6)",
            textWrap: "balance",
            transform: mounted ? "none" : "translateY(0.75rem)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.7s ease 0.22s, transform 0.7s ease 0.22s",
          }}
        >
          {greeting}
          {userName ? <>, <span style={{ color: T.color.goldLight ?? "#E8C87A" }}>{userName}</span></> : null}
        </h1>

        <p
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? "0.9375rem" : "1.0625rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: "rgba(250,247,240,0.86)",
            margin: 0,
            textShadow: "0 0.0625rem 0.75rem rgba(36,28,21,0.7)",
            fontVariantNumeric: "tabular-nums",
            transform: mounted ? "none" : "translateY(0.75rem)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
          }}
        >
          {metaLine}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginTop: "0.875rem", transform: mounted ? "none" : "translateY(0.75rem)", opacity: mounted ? 1 : 0, transition: "opacity 0.7s ease 0.38s, transform 0.7s ease 0.38s" }}>
          <button
            type="button"
            onClick={onNavigatePalace}
            className="atrium-door"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: "3.25rem",
              padding: "0 2rem",
              borderRadius: "0.875rem",
              border: "none",
              cursor: "pointer",
              overflow: "hidden",
              fontFamily: T.font.body,
              fontSize: "1.0625rem",
              fontWeight: 600,
              color: T.color.linen,
              background: `linear-gradient(135deg, ${T.color.terracotta}, #A24B28)`,
              boxShadow: `0 0.75rem 1.75rem rgba(154,79,42,0.45)`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
            }}
            aria-label={t("enterPalace")}
          >
            <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              {t("enterPalace")}
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span aria-hidden="true" className="atrium-door-sheen" />
          </button>

          <button
            type="button"
            onClick={onNavigateLibrary}
            className="atrium-ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "3.25rem",
              padding: "0 1.375rem",
              borderRadius: "0.875rem",
              border: "0.0625rem solid rgba(250,247,240,0.5)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "1rem",
              fontWeight: 600,
              color: T.color.linen,
              background: "rgba(250,247,240,0.06)",
              transition: "background 0.2s ease, border-color 0.2s ease",
            }}
            aria-label={t("openLibrary")}
          >
            {t("yourLibrary")}
          </button>
        </div>
      </div>

      <style>{`
        .atrium-door-sheen {
          position: absolute; top: 0; bottom: 0; left: -40%; width: 40%;
          background: linear-gradient(105deg, transparent, rgba(255,240,200,0.55), transparent);
          transform: skewX(-18deg);
          animation: atrium-door-sheen 6s ease-in-out infinite;
        }
        @keyframes atrium-door-sheen {
          0%, 12% { left: -45%; }
          55%, 100% { left: 130%; }
        }
        .atrium-door:hover { filter: brightness(1.06); transform: translateY(-0.0625rem); box-shadow: 0 1rem 2.25rem rgba(154,79,42,0.55); }
        .atrium-door:active { transform: translateY(0); }
        .atrium-ghost:hover { background: rgba(250,247,240,0.14); border-color: rgba(250,247,240,0.8); }
        .atrium-door:focus-visible, .atrium-ghost:focus-visible { outline: 0.1875rem solid ${T.color.goldLight ?? "#E8C87A"}; outline-offset: 0.1875rem; }
        @media (prefers-reduced-motion: reduce) {
          .atrium-door-sheen { animation: none !important; display: none; }
          .atrium-door, .atrium-ghost { transition: none !important; }
          .atrium-door:hover, .atrium-door:active { transform: none !important; }
        }
      `}</style>
    </section>
  );
}
