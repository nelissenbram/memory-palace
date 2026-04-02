"use client";

import React from "react";
import { T } from "@/lib/theme";

/* ─────────────────────────────────────────────
   Animation name constants
   ───────────────────────────────────────────── */

export const ANIM = {
  // ── AtriumStyles originals ──
  fadeSlideUp: "atriumFadeSlideUp",
  fadeSlideRight: "atriumFadeSlideRight",
  scaleIn: "atriumScaleIn",
  reveal: "atriumReveal",
  float: "atriumFloat",
  glow: "atriumGlow",
  shimmer: "atriumShimmer",
  particle: "atriumParticle",
  pulseRing: "atriumPulseRing",
  lift: "atriumLift",
  press: "atriumPress",
  borderGlow: "atriumBorderGlow",

  // ── AtriumHero ──
  fadeIn: "atriumFadeIn",
  fadeInUp: "atriumFadeInUp",
  goldShimmer: "atriumGoldShimmer",
  particleFloat: "atriumParticleFloat",
  arcDraw: "atriumArcDraw",
  pulseGlow: "atriumPulseGlow",
  shimmerBorder: "atriumShimmerBorder",

  // ── HomeView ──
  fadeSlideIn: "atriumFadeSlideIn",

  // ── AtriumActivity ──
  pageTurn: "atriumPageTurn",
  slideUp: "atriumSlideUp",
  soundWave: "atriumSoundWave",
  arrowSlide: "atriumArrowSlide",
  thumbEnter: "atriumThumbEnter",
  cardRise: "atriumCardRise",
  progressFill: "atriumProgressFill",
  storageFade: "atriumStorageFade",

  // ── LifeCompleteness ──
  lcRingDraw: "lc-ringDraw",
  lcFadeIn: "lc-fadeIn",
  lcFadeSlideUp: "lc-fadeSlideUp",
  lcPulse: "lc-pulse",
  lcMiniRingDraw: "lc-miniRingDraw",

  // ── LifeStoryWidget ──
  lswRingDraw: "lsw-ringDraw",
  lswFadeIn: "lsw-fadeIn",
  lswFadeSlideUp: "lsw-fadeSlideUp",
  lswPulse: "lsw-pulse",
  lswCtaGlow: "lsw-ctaGlow",

  // ── AtriumWidgets ──
  awFadeSlideUp: "aw-fadeSlideUp",
  awCountUp: "aw-countUp",
  awBarFill: "aw-barFill",
  awCardStagger: "aw-cardStagger",
  awFloat: "aw-float",
  awShimmer: "aw-shimmer",
  awArcDraw: "aw-arcDraw",
  awPulseGlow: "aw-pulseGlow",
  awGoldLine: "aw-goldLine",
  awFadeIn: "aw-fadeIn",
  awScaleIn: "aw-scaleIn",

  // ── TuscanCard unified ──
  tuscanFadeSlideUp: "tuscan-fadeSlideUp",
} as const;

/* ─────────────────────────────────────────────
   Easing constants
   ───────────────────────────────────────────── */

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/* ─────────────────────────────────────────────
   TuscanStyles — single <style> with ALL keyframes
   ───────────────────────────────────────────── */

export default function TuscanStyles() {
  return (
    <style>{`
      /* ══════════════════════════════════════
         CSS Custom Properties
         ══════════════════════════════════════ */

      :root {
        --atrium-gold: ${T.color.gold};
        --atrium-gold-light: ${T.color.goldLight};
        --atrium-gold-dark: ${T.color.goldDark};
        --atrium-charcoal: ${T.color.charcoal};
        --atrium-linen: ${T.color.linen};
        --atrium-ease: ${EASE};
      }

      /* ══════════════════════════════════════
         1. AtriumStyles — Entrance
         ══════════════════════════════════════ */

      @keyframes ${ANIM.fadeSlideUp} {
        from { opacity: 0; transform: translateY(1.25rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes ${ANIM.fadeSlideRight} {
        from { opacity: 0; transform: translateX(-1.25rem); }
        to   { opacity: 1; transform: translateX(0); }
      }

      @keyframes ${ANIM.scaleIn} {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }

      @keyframes ${ANIM.reveal} {
        from { clip-path: inset(0 100% 0 0); }
        to   { clip-path: inset(0 0% 0 0); }
      }

      /* ══════════════════════════════════════
         2. AtriumStyles — Ambient / Loop
         ══════════════════════════════════════ */

      @keyframes ${ANIM.float} {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-0.375rem); }
      }

      @keyframes ${ANIM.glow} {
        0%, 100% { opacity: 0.7; }
        50%      { opacity: 1; }
      }

      @keyframes ${ANIM.shimmer} {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      @keyframes ${ANIM.particle} {
        0%   { opacity: 0; transform: translateY(0) scale(1); }
        20%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-3rem) scale(0.4); }
      }

      @keyframes ${ANIM.pulseRing} {
        0%   { transform: scale(0.9); opacity: 0.8; }
        100% { transform: scale(1.6); opacity: 0; }
      }

      /* ══════════════════════════════════════
         3. AtriumStyles — Interaction
         ══════════════════════════════════════ */

      @keyframes ${ANIM.lift} {
        from { transform: translateY(0); box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,0.08); }
        to   { transform: translateY(-0.125rem); box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.15); }
      }

      @keyframes ${ANIM.press} {
        from { transform: scale(1); }
        to   { transform: scale(0.97); }
      }

      @keyframes ${ANIM.borderGlow} {
        0%, 100% { border-color: var(--atrium-gold-dark); box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        50%      { border-color: var(--atrium-gold-light); box-shadow: 0 0 0.75rem 0.125rem rgba(212, 175, 55, 0.25); }
      }

      /* ══════════════════════════════════════
         4. AtriumHero keyframes
         ══════════════════════════════════════ */

      @keyframes ${ANIM.fadeIn} {
        from { opacity: 0; transform: translateY(1.25rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes ${ANIM.fadeInUp} {
        from { opacity: 0; transform: translateY(1.5rem) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes ${ANIM.goldShimmer} {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      @keyframes ${ANIM.particleFloat} {
        0%   { transform: translateY(0) scale(1); opacity: 0; }
        15%  { opacity: 0.4; }
        50%  { transform: translateY(-3rem) scale(0.8); opacity: 0.25; }
        85%  { opacity: 0.1; }
        100% { transform: translateY(-5.5rem) scale(0.5); opacity: 0; }
      }

      @keyframes ${ANIM.arcDraw} {
        from { stroke-dashoffset: 400; }
        to   { stroke-dashoffset: 0; }
      }

      @keyframes ${ANIM.pulseGlow} {
        0%, 100% { opacity: 0.15; }
        50%      { opacity: 0.3; }
      }

      @keyframes ${ANIM.shimmerBorder} {
        0%   { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }

      /* ══════════════════════════════════════
         5. HomeView
         ══════════════════════════════════════ */

      @keyframes ${ANIM.fadeSlideIn} {
        from { opacity: 0; transform: translateY(1.25rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ══════════════════════════════════════
         6. AtriumActivity keyframes
         ══════════════════════════════════════ */

      @keyframes ${ANIM.pageTurn} {
        0%   { opacity: 0; transform: perspective(60rem) rotateY(-4deg) translateY(0.75rem); }
        60%  { opacity: 1; transform: perspective(60rem) rotateY(1deg) translateY(-0.125rem); }
        100% { opacity: 1; transform: perspective(60rem) rotateY(0deg) translateY(0); }
      }

      @keyframes ${ANIM.slideUp} {
        from { opacity: 0; transform: translateY(1rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes ${ANIM.soundWave} {
        0%, 100% { transform: scaleY(0.3); }
        50%      { transform: scaleY(1); }
      }

      @keyframes ${ANIM.arrowSlide} {
        0%, 100% { transform: translateX(0); }
        50%      { transform: translateX(0.25rem); }
      }

      @keyframes ${ANIM.thumbEnter} {
        from { opacity: 0; transform: translateX(0.5rem) scale(0.95); }
        to   { opacity: 1; transform: translateX(0) scale(1); }
      }

      @keyframes ${ANIM.cardRise} {
        from { opacity: 0; transform: translateY(0.5rem) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes ${ANIM.progressFill} {
        from { width: 0; }
      }

      @keyframes ${ANIM.storageFade} {
        from { opacity: 0; transform: scaleX(0.6); }
        to   { opacity: 1; transform: scaleX(1); }
      }

      /* ══════════════════════════════════════
         7. LifeCompleteness keyframes
         ══════════════════════════════════════ */

      @keyframes ${ANIM.lcRingDraw} {
        from { stroke-dashoffset: var(--lc-circumference); }
        to   { stroke-dashoffset: var(--lc-target-offset); }
      }

      @keyframes ${ANIM.lcFadeIn} {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      @keyframes ${ANIM.lcFadeSlideUp} {
        from { opacity: 0; transform: translateY(0.75rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes ${ANIM.lcPulse} {
        0%, 100% { opacity: 0.35; transform: scale(1); }
        50%      { opacity: 0.65; transform: scale(1.05); }
      }

      @keyframes ${ANIM.lcMiniRingDraw} {
        from { stroke-dashoffset: var(--lc-mini-circ); }
        to   { stroke-dashoffset: var(--lc-mini-offset); }
      }

      /* ══════════════════════════════════════
         8. LifeStoryWidget keyframes
         ══════════════════════════════════════ */

      @keyframes ${ANIM.lswRingDraw} {
        from { stroke-dashoffset: var(--lsw-circumference); }
        to   { stroke-dashoffset: var(--lsw-target-offset); }
      }

      @keyframes ${ANIM.lswFadeIn} {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      @keyframes ${ANIM.lswFadeSlideUp} {
        from { opacity: 0; transform: translateY(0.75rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes ${ANIM.lswPulse} {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50%      { opacity: 0.7; transform: scale(1.06); }
      }

      @keyframes ${ANIM.lswCtaGlow} {
        0%, 100% { box-shadow: 0 0 0.5rem rgba(212, 175, 55, 0.15); }
        50%      { box-shadow: 0 0 1rem rgba(212, 175, 55, 0.35); }
      }

      /* ══════════════════════════════════════
         9. AtriumWidgets keyframes
         ══════════════════════════════════════ */

      @keyframes ${ANIM.awFadeSlideUp} {
        from { opacity: 0; transform: translateY(1.25rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes ${ANIM.awCountUp} {
        from { opacity: 0; transform: scale(0.7) translateY(0.5rem); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      @keyframes ${ANIM.awBarFill} {
        from { width: 0; }
      }

      @keyframes ${ANIM.awCardStagger} {
        from { opacity: 0; transform: translateX(1.5rem); }
        to   { opacity: 1; transform: translateX(0); }
      }

      @keyframes ${ANIM.awFloat} {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-0.25rem); }
      }

      @keyframes ${ANIM.awShimmer} {
        0%   { background-position: -12.5rem 0; }
        100% { background-position: 12.5rem 0; }
      }

      @keyframes ${ANIM.awArcDraw} {
        from { stroke-dashoffset: var(--aw-arc-total); }
        to   { stroke-dashoffset: var(--aw-arc-offset); }
      }

      @keyframes ${ANIM.awPulseGlow} {
        0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.25); }
        50%      { box-shadow: 0 0 0.75rem 0.125rem rgba(212,175,55,0.18); }
      }

      @keyframes ${ANIM.awGoldLine} {
        from { width: 0; }
        to   { width: 100%; }
      }

      @keyframes ${ANIM.awFadeIn} {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      @keyframes ${ANIM.awScaleIn} {
        from { opacity: 0; transform: scale(0.5); }
        to   { opacity: 1; transform: scale(1); }
      }

      /* ══════════════════════════════════════
         10. TuscanCard — unified entrance
         ══════════════════════════════════════ */

      @keyframes ${ANIM.tuscanFadeSlideUp} {
        from { opacity: 0; transform: translateY(1rem); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ══════════════════════════════════════
         Utility Classes
         ══════════════════════════════════════ */

      .atrium-entrance {
        animation: ${ANIM.fadeSlideUp} 0.6s var(--atrium-ease) both;
      }

      .atrium-float {
        animation: ${ANIM.float} 3s ease-in-out infinite;
      }

      .atrium-glow {
        animation: ${ANIM.glow} 2.5s ease-in-out infinite;
      }

      .atrium-shimmer-text {
        background: linear-gradient(
          90deg,
          var(--atrium-gold-dark) 0%,
          var(--atrium-gold-light) 40%,
          var(--atrium-gold) 50%,
          var(--atrium-gold-light) 60%,
          var(--atrium-gold-dark) 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: ${ANIM.shimmer} 3s linear infinite;
      }

      .atrium-lift {
        transition: transform 0.3s var(--atrium-ease),
                    box-shadow 0.3s var(--atrium-ease);
      }
      .atrium-lift:hover {
        transform: translateY(-0.125rem);
        box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.15);
      }
      .atrium-lift:active {
        transform: scale(0.97);
      }

      .atrium-border-glow {
        animation: ${ANIM.borderGlow} 2s ease-in-out infinite;
      }

      .atrium-pulse-ring {
        animation: ${ANIM.pulseRing} 2s ease-out infinite;
      }

      /* ── AtriumWidgets utility classes ── */

      .aw-scroll-strip::-webkit-scrollbar { display: none; }

      .aw-viewall-arrow {
        display: inline-block;
        transition: transform 0.3s ${EASE_SPRING};
      }
      .aw-viewall:hover .aw-viewall-arrow {
        transform: translateX(0.375rem);
      }
    `}</style>
  );
}
