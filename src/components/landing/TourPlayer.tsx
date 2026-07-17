"use client";

/**
 * The Guided Walk — the "See it in action" tour player (round-6 army decision).
 *
 * Idle: a dark umber band with the poster behind a vignette and one breathing
 * gold doorway. No autoplay, ever (preload="none"). On click the walkthrough
 * plays FULL-BLEED, muted, at 0.55x (~45s), with five one-at-a-time captions
 * (LEFT / RIGHT / LEFT / RIGHT / CENTER) anchored to currentTime fractions of
 * the film — captions are the narration (the file is silent). Custom pill
 * controls, keyboard, a thin gold progress hairline, an end-card CTA.
 *
 * Reduced-motion / constrained connections never download the video: the
 * poster stays and all five caption lines render as a static storyboard, with
 * one explicit "Play the tour" opt-in.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const CREAM = "#FCFAF5";
const UMBER = "#241C15";
const GOLD = "#D4AF37";
const MUTED_DARK = "#B5ADA3";
const FONT_DISPLAY = "var(--font-display, Georgia, serif)";
const FONT_BODY = "var(--font-body, sans-serif)";
const FONT_NOTE = "var(--font-note, cursive)";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* Scene boundaries as fractions of the trimmed tour (walkthrough-tour.mp4,
   ~24.9s, onboarding removed). Stored as fractions so a re-encode to a
   different length cannot desync the captions. */
type Side = "left" | "right" | "center";
type Scene = { key: string; side: Side; start: number; end: number; eyebrow?: string; line: string };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function connectionConstrained() {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (!!c.saveData || /(^|\b)(slow-2g|2g|3g)\b/.test(c.effectiveType ?? ""));
}

export default function TourPlayer({
  videoSrc,
  posterSrc,
  scenes,
  ctaLabel,
  ctaHref,
  doorwayLabel,
  tourNote,
  watchAgain,
  labels,
}: {
  videoSrc: string;
  posterSrc: string;
  scenes: Scene[];
  ctaLabel: string;
  ctaHref: string;
  doorwayLabel: string;
  tourNote: string;
  watchAgain: string;
  labels: { pause: string; play: string; close: string; dialog: string; playTour: string };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [mode, setMode] = useState<"idle" | "static" | "playing">("idle");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const start = useCallback(() => {
    if (prefersReducedMotion() || connectionConstrained()) {
      setMode("static");
      return;
    }
    setEnded(false);
    setPaused(false);
    setMode("playing");
  }, []);

  // Configure + play only AFTER the <video> has mounted (mode → playing).
  // Doing this in a click-time rAF races React's commit and leaves the element
  // unmuted → autoplay is blocked.
  useEffect(() => {
    if (mode !== "playing") return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playbackRate = 0.55;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [mode]);

  const close = useCallback(() => {
    const v = videoRef.current;
    if (v) { v.pause(); v.currentTime = 0; }
    setMode("idle");
    setEnded(false);
    setActive(0);
    setProgress(0);
  }, []);

  const togglePause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }, []);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  // currentTime → active scene (integer compare only), progress hairline.
  useEffect(() => {
    if (mode !== "playing") return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const dur = v.duration || 1;
      const p = v.currentTime / dur;
      setProgress(p);
      let idx = 0;
      for (let i = 0; i < scenes.length; i++) { if (p >= scenes[i].start) idx = i; }
      setActive((prev) => (prev === idx ? prev : idx));
    };
    const onEnd = () => { setEnded(true); setActive(scenes.length - 1); setControlsVisible(true); };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("ended", onEnd); };
  }, [mode, scenes]);

  // Keyboard while playing.
  useEffect(() => {
    if (mode !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === " " || e.code === "Space") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    bumpControls();
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, close, togglePause, bumpControls]);

  const current = scenes[active] ?? scenes[0];

  return (
    <div
      style={{ position: "relative", width: "100%", minHeight: "clamp(30rem, 56vw, 44rem)", borderRadius: mode === "playing" ? "1.25rem" : 0, overflow: "hidden" }}
      onPointerMove={mode === "playing" ? bumpControls : undefined}
    >
      <style>{`
        .lv2tp-cap { animation: lv2tp-cap-in 700ms ${EASE}; }
        @keyframes lv2tp-cap-in { from { opacity: 0; } to { opacity: 1; } }
        .lv2tp-cap-left { animation-name: lv2tp-cap-left; }
        .lv2tp-cap-right { animation-name: lv2tp-cap-right; }
        @keyframes lv2tp-cap-left { from { opacity: 0; transform: translateX(-0.75rem); } to { opacity: 1; transform: none; } }
        @keyframes lv2tp-cap-right { from { opacity: 0; transform: translateX(0.75rem); } to { opacity: 1; transform: none; } }
        .lv2tp-video { animation: lv2tp-settle 1.6s ease-out; }
        @keyframes lv2tp-settle { from { transform: scale(1.04); } to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .lv2tp-cap, .lv2tp-cap-left, .lv2tp-cap-right, .lv2tp-video { animation: none !important; }
        }
      `}</style>

      {/* Poster (idle + static fallback) */}
      {mode !== "playing" ? (
        <Image src={posterSrc} alt="" fill sizes="100vw" style={{ objectFit: "cover", opacity: 0.55 }} />
      ) : null}
      {mode !== "playing" ? (
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(36,28,21,0.05) 0%, rgba(36,28,21,0.62) 62%, rgba(36,28,21,0.97) 100%)" }} />
      ) : null}

      {/* ── PLAYING: full-bleed video + reading-lane + captions + controls ── */}
      {mode === "playing" ? (
        <>
          <video
            key="tour"
            ref={videoRef}
            className="lv2tp-video"
            playsInline
            preload="none"
            aria-label={labels.dialog}
            onClick={togglePause}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", cursor: "pointer", background: "#000" }}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>

          {/* reading-lane vignette + directional scrim for the active side */}
          <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 62% 78% at 50% 50%, rgba(36,28,21,0) 34%, rgba(36,28,21,0.55) 100%), linear-gradient(90deg, rgba(36,28,21,0.72) 0%, rgba(36,28,21,0) 26%, rgba(36,28,21,0) 74%, rgba(36,28,21,0.72) 100%)" }} />
          {current.side !== "center" ? (
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: current.side === "left" ? "linear-gradient(90deg, rgba(36,28,21,0.72) 0%, rgba(36,28,21,0.30) 55%, transparent 100%)" : "linear-gradient(270deg, rgba(36,28,21,0.72) 0%, rgba(36,28,21,0.30) 55%, transparent 100%)" }} />
          ) : null}

          {/* active caption (desktop side lane) */}
          <div
            key={`cap-${active}`}
            className={`lv2tp-cap lv2tp-cap-${current.side}`}
            style={{
              position: "absolute",
              zIndex: 4,
              top: current.side === "center" ? "58%" : "38%",
              left: current.side === "right" ? "auto" : current.side === "center" ? "50%" : "clamp(1.5rem, 6vw, 5rem)",
              right: current.side === "right" ? "clamp(1.5rem, 6vw, 5rem)" : "auto",
              transform: current.side === "center" ? "translateX(-50%)" : "none",
              maxWidth: "20rem",
              textAlign: current.side === "right" ? "right" : current.side === "center" ? "center" : "left",
            }}
          >
            {current.eyebrow ? (
              <span style={{ display: "block", fontFamily: FONT_NOTE, fontWeight: 600, fontSize: "1.15rem", letterSpacing: "0.06em", color: GOLD, marginBottom: "0.375rem" }}>
                {current.eyebrow}
              </span>
            ) : null}
            <span style={{ display: "block", fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(1.5rem, 3.2vw, 2.5rem)", lineHeight: 1.15, letterSpacing: "0.01em", color: CREAM, textWrap: "balance", textShadow: "0 1px 12px rgba(36,28,21,0.85)" }}>
              {current.line}
            </span>
            {ended && active === scenes.length - 1 ? (
              <span style={{ display: "inline-flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem", alignItems: current.side === "center" ? "center" : "flex-start" }}>
                <Link href={ctaHref} className="lv2-cta" style={{ display: "inline-flex", alignItems: "center", minHeight: "3rem", padding: "0 2rem", borderRadius: "0.75rem", background: "linear-gradient(135deg, #9A4F2A, #6B3318)", color: "#FFF", fontFamily: FONT_BODY, fontWeight: 600, textDecoration: "none" }}>
                  {ctaLabel} →
                </Link>
                <button type="button" onClick={() => { const v = videoRef.current; if (v) { v.currentTime = 0; v.play().catch(() => {}); } setEnded(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED_DARK, fontFamily: FONT_BODY, fontSize: "0.9375rem" }}>
                  ↺ {watchAgain}
                </button>
              </span>
            ) : null}
          </div>

          {/* aria-live caption for screen readers */}
          <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            {current.eyebrow ? current.eyebrow + ". " : ""}{current.line}
          </p>

          {/* controls pill */}
          <div
            style={{
              position: "absolute",
              zIndex: 5,
              bottom: "1.25rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              background: "rgba(36,28,21,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(212,175,55,0.4)",
              opacity: controlsVisible ? 1 : 0,
              transition: "opacity 250ms ease",
              pointerEvents: controlsVisible ? "auto" : "none",
            }}
          >
            <button type="button" onClick={togglePause} aria-label={paused ? labels.play : labels.pause} style={ctlBtn}>
              {paused ? (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6V2z" fill="currentColor" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor" /></svg>
              )}
            </button>
            <span aria-hidden="true" style={{ width: "6rem", height: "0.1875rem", borderRadius: "999px", background: "rgba(252,250,245,0.25)", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${Math.round(progress * 100)}%`, background: GOLD }} />
            </span>
            <button type="button" onClick={close} aria-label={labels.close} style={ctlBtn}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </>
      ) : null}

      {/* ── IDLE: the inviting doorway ── */}
      {mode === "idle" ? (
        <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center", padding: "clamp(3rem, 8vw, 5rem) 1.5rem" }}>
          <button
            type="button"
            onClick={start}
            className="lv2-cta lv2-tour-door"
            aria-label={doorwayLabel}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.125rem", background: "none", border: "none", cursor: "pointer", padding: "0.5rem 1rem" }}
          >
            <span className="lv2-tour-ring" style={{ width: "clamp(6.5rem, 12vw, 8.5rem)", height: "clamp(6.5rem, 12vw, 8.5rem)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(36,28,21,0.35)", backdropFilter: "blur(6px)", border: "1px solid rgba(212,175,55,0.75)", boxShadow: "0 0 0 0.5rem rgba(212,175,55,0.12), 0 16px 48px rgba(0,0,0,0.55)" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" style={{ marginLeft: "0.25rem" }}><path d="M6 3l14 9-14 9V3z" fill={CREAM} /></svg>
            </span>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: "1.125rem", color: CREAM }}>▶ {doorwayLabel}</span>
            <span style={{ fontFamily: FONT_NOTE, fontWeight: 600, fontSize: "1.25rem", color: GOLD }}>{tourNote}</span>
          </button>
        </div>
      ) : null}

      {/* ── STATIC (reduced-motion / saveData): poster + caption storyboard ── */}
      {mode === "static" ? (
        <div style={{ position: "relative", zIndex: 2, maxWidth: "44rem", margin: "0 auto", padding: "clamp(3rem, 8vw, 5rem) 1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {scenes.map((s) => (
            <div key={s.key} style={{ textAlign: "center" }}>
              {s.eyebrow ? <span style={{ display: "block", fontFamily: FONT_NOTE, fontWeight: 600, fontSize: "1.05rem", color: GOLD, marginBottom: "0.25rem" }}>{s.eyebrow}</span> : null}
              <span style={{ display: "block", fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(1.375rem, 3vw, 2rem)", lineHeight: 1.2, color: CREAM }}>{s.line}</span>
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => { setMode("playing"); requestAnimationFrame(() => { const v = videoRef.current; if (v) { v.muted = true; v.playbackRate = 0.55; v.play().catch(() => {}); } }); }} style={{ background: "none", border: "1px solid rgba(212,175,55,0.5)", borderRadius: "999px", color: CREAM, fontFamily: FONT_BODY, fontWeight: 600, fontSize: "1rem", padding: "0.625rem 1.5rem", cursor: "pointer" }}>
              ▶ {labels.playTour}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const ctlBtn: React.CSSProperties = {
  width: "2.75rem",
  height: "2.75rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  borderRadius: "50%",
  color: CREAM,
  cursor: "pointer",
};
