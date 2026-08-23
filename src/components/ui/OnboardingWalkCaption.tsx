"use client";
import React, { useMemo } from "react";
import { T } from "@/lib/theme";
import { EMBER } from "@/lib/libraryTokens";

/* ── Walkthrough caption system (ONBOARDING WALKTHROUGH RESTORE) ──
 * Unifies the two legacy caption mechanisms of the 297c354 guided walk:
 *   1. WalkCinematicCaption — the bottom-center cinematic overlay (divider
 *      line+dot, small-caps kicker, display title, caption line, optional
 *      prompt children). Restyled to today's canon: EMBER accents (not
 *      terracotta), Fraunces display voice mirroring the landing hero title
 *      (flat cream, weight 500 — NO gold-sheen gradient; GOLD is licensed to
 *      the celebration threshold only), body-font small-caps overline (the
 *      landing Eyebrow grammar), rem + safe-area units, warm-ink text
 *      shadows (never cold black), reduced-motion = one static fade.
 *   2. WalkCaptionPill — the dark-glass tooltip pill used on the exterior
 *      leg. Restyled to warm-ink linen glass with an EMBER primary action.
 * Mirrors EntranceHallScene's in-scene cinematic overlay so all four legs
 * read as one hand. Keyframes are scoped here (onbw-*) — the wizard's onb-*
 * block does not leak into this component. */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const KEYFRAMES = `
@keyframes onbw-slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes onbw-titleReveal{0%{opacity:0;letter-spacing:0.6em;transform:scale(0.92)}60%{opacity:1;letter-spacing:0.12em}100%{opacity:1;letter-spacing:0.04em;transform:scale(1)}}
@keyframes onbw-fadeIn{from{opacity:0}to{opacity:1}}
.onbw-cta{transition:transform .16s ease, filter .16s ease}
.onbw-cta:hover{transform:translateY(-0.0625rem);filter:brightness(1.06)}
.onbw-cta:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
.onbw-skip:focus-visible{outline:0.1875rem solid #F2EDE7;outline-offset:0.125rem}
@media (prefers-reduced-motion: reduce){.onbw-cta{transition:none;transform:none}}
`;

/* Shared EMBER walk CTA — the one primary action grammar for prompt rows
 * (cinematicYes, corridorEnterRoom, walkAddMemory). Canon ctaGrad, ≥2.75rem. */
export function WalkCtaButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="onbw-cta"
      onClick={onClick}
      disabled={disabled}
      style={{
        // Canon CTA grammar (wizard primaryCtaStyle): BODY font, 600, ctaGrad.
        fontFamily: T.font.body,
        fontSize: "0.9375rem",
        fontWeight: 600,
        padding: "0 1.75rem",
        minHeight: "2.75rem",
        background: T.land.ctaGrad,
        color: "#FFFFFF",
        border: "none",
        borderRadius: "0.75rem",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.8 : 1,
        boxShadow: `0 0.25rem 1rem ${EMBER}40`,
        whiteSpace: "nowrap",
        pointerEvents: "auto",
      }}
    >
      {label}
    </button>
  );
}

interface WalkCinematicCaptionProps {
  /** Small-caps kicker above the title (e.g. "Welcome to"). */
  overline?: string;
  /** Gold-sheen display headline (palace / wing / room name). */
  title: string;
  /** Caption line under the title — announced politely to screen readers. */
  caption?: string;
  isMobile?: boolean;
  /** Extra beat content (prompt rows, CTAs). Receives pointer events. */
  children?: React.ReactNode;
}

/* Bottom-center cinematic overlay — inert to the pointer except children. */
export default function WalkCinematicCaption({
  overline,
  title,
  caption,
  isMobile = false,
  children,
}: WalkCinematicCaptionProps) {
  const reduce = useMemo(prefersReducedMotion, []);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {/* Bottom shadow gradient for text readability over the 3D scene */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60vh",
          background:
            "linear-gradient(transparent 0%, rgba(26,25,23,0.35) 35%, rgba(26,25,23,0.75) 70%, rgba(26,25,23,0.88) 100%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: isMobile
            ? "max(10vh, calc(2.5rem + env(safe-area-inset-bottom, 0px)))"
            : "calc(3rem + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          zIndex: 10,
          width: "90%",
          maxWidth: "36rem",
          pointerEvents: "none",
          // Reduced motion: ONE static fade for the whole stack, one paint.
          animation: reduce ? "onbw-fadeIn 0.2s linear both" : undefined,
        }}
      >
        {/* Decorative divider — EMBER line + dot (canon, not terracotta) */}
        <div
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
            animation: reduce
              ? undefined
              : "onbw-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
          }}
        >
          <span style={{ width: "3rem", height: "0.0625rem", background: `${EMBER}80` }} />
          <span
            style={{
              width: "0.3rem",
              height: "0.3rem",
              borderRadius: "50%",
              background: EMBER,
              opacity: 0.6,
            }}
          />
          <span style={{ width: "3rem", height: "0.0625rem", background: `${EMBER}80` }} />
        </div>

        {/* Small-caps kicker — canon Eyebrow grammar (landing/wizard cards):
            BODY font, 0.6875rem, 700, 0.14em tracking, EMBER accent */}
        {overline && (
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: EMBER,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              margin: "0 0 0.625rem",
              textShadow: "0 0.125rem 0.5rem rgba(26,25,23,0.7)",
              animation: reduce
                ? undefined
                : "onbw-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both",
            }}
          >
            {overline}
          </p>
        )}

        {/* Display title — mirrors the landing hero: Fraunces 500, flat cream,
            warm-ink shadow. NO gold-sheen gradient (landing doesn't; GOLD is
            the celebration's licensed moment). Reduced motion = no reveal. */}
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.75rem" : "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 500,
            color: "#FCFAF5",
            lineHeight: 1.08,
            margin: 0,
            letterSpacing: "0.04em",
            filter: "drop-shadow(0 0.125rem 0.5rem rgba(26,25,23,0.6))",
            ...(reduce
              ? {}
              : {
                  animation: "onbw-titleReveal 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s both",
                }),
          }}
        >
          {title}
        </h1>

        {/* Caption line — polite live region so leg changes are announced */}
        {caption && (
          <p
            role="status"
            aria-live="polite"
            style={{
              fontFamily: T.font.body,
              fontSize: isMobile ? "0.8125rem" : "0.9375rem",
              color: "#D4CBC0",
              margin: "0.75rem 0 0",
              lineHeight: 1.5,
              textShadow: "0 0.125rem 0.75rem rgba(26,25,23,0.9), 0 0.0625rem 0.1875rem rgba(26,25,23,0.7)",
              animation: reduce
                ? undefined
                : "onbw-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.5s both",
            }}
          >
            {caption}
          </p>
        )}

        {/* Prompt beat (buttons/rows) — the only pointer-interactive layer */}
        {children && (
          <div
            style={{
              marginTop: "1.25rem",
              pointerEvents: "auto",
              animation: reduce
                ? undefined
                : "onbw-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </>
  );
}

interface WalkCaptionPillProps {
  message: string;
  nextLabel?: string;
  onNext?: () => void;
  skipLabel?: string;
  onSkip?: () => void;
  isMobile?: boolean;
}

/* Warm-ink glass tooltip pill — the exterior-leg caption mechanism. */
export function WalkCaptionPill({
  message,
  nextLabel,
  onNext,
  skipLabel,
  onSkip,
  isMobile = false,
}: WalkCaptionPillProps) {
  const reduce = useMemo(prefersReducedMotion, []);
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: isMobile
          ? "calc(1.5rem + env(safe-area-inset-bottom, 0px))"
          : "2.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: isMobile ? "calc(100vw - 2rem)" : "28rem",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1.25rem 1.5rem",
        borderRadius: "1rem",
        background: "rgba(38,34,30,0.82)",
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        border: `0.0625rem solid rgba(242,237,231,0.14)`,
        boxShadow: "0 0.5rem 2rem rgba(0,0,0,0.4)",
        animation: reduce ? "onbw-fadeIn 0.2s linear both" : "onbw-slideUp .4s ease both",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? "0.9375rem" : "1rem",
          color: "#F2EDE7",
          lineHeight: 1.6,
          textAlign: "center",
          margin: 0,
        }}
      >
        {message}
      </p>

      {(onNext || onSkip) && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {onNext && nextLabel && <WalkCtaButton label={nextLabel} onClick={onNext} />}
          {onSkip && skipLabel && (
            <button
              className="onbw-skip"
              onClick={onSkip}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: "rgba(255,255,255,0.6)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "0.1875rem",
                padding: "0.5rem",
                minHeight: "2.75rem",
              }}
            >
              {skipLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
