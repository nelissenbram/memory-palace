"use client";
import { useEffect, useMemo, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

interface OnboardingCelebrationProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onContinue: () => void;
  /** When true, no dark background — the threshold floats over the live room scene */
  transparent?: boolean;
  /** Tutorial-handoff hint rendered above the CTA when non-empty
      (ONBOARDING_ELEVATION_PLAN §9). Backwards compatible: absent = no row. */
  hint?: string;
  /** Canvas confetti burst (walkthrough restore). Default true — the wizard's
      celebration fires it over the just-hung memory; reduced-motion = static
      (no confetti, the settled gold threshold stands on its own). */
  confetti?: boolean;
}

/* The ceremonial threshold. A dignified beat over the just-hung first
 * memory — a single gold divider tick (glyph accent only — TEXT stays canon
 * INK, owner: "mat brons, geen goud" / no gold letters) above the headline,
 * one EMBER call-to-action into the palace, crowned by ONE falling confetti
 * burst (terracotta/gold/green/cream) restored from the original walkthrough
 * celebration. Reduced motion keeps the frame fully static: no confetti, no
 * entrance animations. */

/* ── Canvas confetti (restored from 297c354) — 120 pieces in the house
 * palette, gravity + rotation, self-terminating rAF loop. Exported so the
 * wizard's landscape celebration fork can fire the same burst. ── */
export function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Honor Reduce Motion (Apple Guideline 4 accessibility) — skip the confetti.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Terracotta / gold / green / walnut / cream — the house palette.
    const colors = ["#C66B3D", "#D4AF37", "#4A6741", "#8B7355", "#F2EDE7", "#B85C38"];
    const pieces: { x: number; y: number; w: number; h: number; c: string; vx: number; vy: number; rot: number; vr: number }[] = [];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.5,
        w: 4 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        c: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.15,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.02; // gravity
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (pieces.some((p) => p.y < canvas.height + 20)) {
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}

// Ember → walnut CTA gradient — the canon theme token, not a hand-typed copy.
const ctaGrad = T.land.ctaGrad;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const KEYFRAMES = `
@keyframes onb-cel-rise{from{opacity:0;transform:translateY(1.25rem)}to{opacity:1;transform:translateY(0)}}
@keyframes onb-cel-tick{from{opacity:0;transform:scaleX(0.2)}to{opacity:0.7;transform:scaleX(1)}}
.onb-cel-cta:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
`;

export default function OnboardingCelebration({
  title,
  subtitle,
  buttonLabel,
  onContinue,
  transparent = false,
  hint,
  confetti = true,
}: OnboardingCelebrationProps) {
  const isMobile = useIsMobile();
  // Resolve once per mount — reduced-motion users get a static, already-settled frame.
  const reduce = useMemo(prefersReducedMotion, []);
  const enter = (delay: string) =>
    reduce ? undefined : `onb-cel-rise .7s cubic-bezier(0.4,0,0.2,1) ${delay} both`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: transparent ? "flex-end" : "center",
        ...(transparent
          ? { pointerEvents: "none" }
          : { background: CREAM }),
      }}
    >
      <style>{KEYFRAMES}</style>
      {/* Confetti layer UNDER the threshold copy (zIndex 0 vs content 1) —
          falls over the room scene showing the just-hung memory. */}
      {confetti && !reduce && <ConfettiBurst />}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1.25rem",
          // Safe-area floor (§9): the bottom-anchored threshold must clear the
          // iOS home indicator; the centered card variant keeps its symmetry.
          padding: transparent ? "1.5rem 1.75rem" : "2.5rem 2rem",
          // Item 6 (owner 2026-08-23): the old transparent variant washed the
          // whole lower half in a full-width cream gradient — a white haze over
          // the room. Replaced by a COMPACT linen-glass card hugging just the
          // copy+CTA: the room stays visible edge-to-edge around it, the card's
          // blur carries legibility (text-shadows dropped), confetti keeps
          // falling on the open scene either side.
          maxWidth: transparent ? "26rem" : "30rem",
          width: transparent ? "calc(100% - 2.5rem)" : "auto",
          margin: transparent ? "0 0 calc(1.75rem + env(safe-area-inset-bottom, 0px))" : 0,
          pointerEvents: transparent ? "none" : "auto",
          ...(transparent
            ? {
                // Linen glass (paywall-mirror grammar): warm cream at low
                // opacity + backdrop blur, hairline + house shadow.
                background: "rgba(252,250,245,0.8)",
                backdropFilter: "blur(0.75rem)",
                WebkitBackdropFilter: "blur(0.75rem)",
                border: `0.0625rem solid ${HAIRLINE}`,
                borderRadius: "1.25rem",
                boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
              }
            : {
                background: "#FFFFFF",
                border: `0.0625rem solid ${HAIRLINE}`,
                borderRadius: "1.25rem",
                boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
              }),
        }}
      >
        {/* No inlay polaroid (owner 2026-08-23): the payoff is the ACTUAL 3D
            mantelpiece behind this card — the uploaded photo is swapped into
            the mantel frame in place, and the walk's step-9 framing keeps the
            camera on it. */}

        {/* The single ceremonial gold flourish — a divider tick, not confetti. */}
        <span
          aria-hidden
          style={{
            display: "block",
            width: "3rem",
            height: "0.125rem",
            background: GOLD,
            borderRadius: "0.0625rem",
            opacity: 0.7,
            transformOrigin: "center",
            animation: reduce ? undefined : "onb-cel-tick .8s cubic-bezier(0.4,0,0.2,1) 0.1s both",
          }}
        />

        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.875rem" : "2.375rem",
            fontWeight: 500,
            color: INK,
            lineHeight: 1.15,
            margin: 0,
            // Canon display type on light (landing-hero grammar: Fraunces 500,
            // flat INK — no gold gradient, no italic; owner: no gold letters).
            // Legibility over the live scene comes from the linen-glass card.
            animation: enter("0.2s"),
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "1.0625rem",
            fontWeight: 400,
            color: transparent ? INK : MUTED,
            lineHeight: 1.55,
            margin: 0,
            maxWidth: "24rem",
            animation: enter("0.35s"),
          }}
        >
          {subtitle}
        </p>

        {/* Tutorial-handoff hint (§9, row [4]) — quiet italic pointer to the
            Atrium nudge tour that follows; EMBER glyph, never a CTA. */}
        {hint && (
          <p
            style={{
              fontFamily: T.font.body,
              fontStyle: "italic",
              fontSize: "0.9375rem",
              fontWeight: 400,
              color: MUTED,
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "22rem",
              textAlign: "center",
              animation: enter("0.5s"),
            }}
          >
            <span aria-hidden style={{ color: EMBER, opacity: 0.8, marginRight: "0.375rem" }}>
              ✦
            </span>
            {hint}
          </p>
        )}

        <button
          className="onb-cel-cta"
          onClick={onContinue}
          style={{
            fontFamily: T.font.body,
            fontSize: "1.0625rem",
            fontWeight: 600,
            padding: "0 2.75rem",
            minHeight: "3.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: ctaGrad,
            color: "#FFFFFF",
            cursor: "pointer",
            transition: reduce ? "none" : "filter .2s, transform .2s",
            boxShadow: SHADOW[1],
            marginTop: "0.5rem",
            pointerEvents: "auto",
            // CTA joins the rise cascade (§9): hint @.5s, CTA @.6s — it no
            // longer pops in ahead of the copy. RM = static settled frame.
            animation: enter("0.6s"),
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
