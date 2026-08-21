"use client";
import { useMemo } from "react";
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
}

/* The one licensed gold moment in the whole app: the ceremonial threshold.
 * A calm, dignified beat — not a party. No confetti; a single gold divider
 * tick above an ink/gold headline, one EMBER call-to-action into the palace. */

// Ember → walnut CTA gradient — the canon theme token, not a hand-typed copy.
const ctaGrad = T.land.ctaGrad;
// The Atrium steward gold-sage italic name gradient.
const NAME_GRAD = "linear-gradient(100deg,#3E5230,#56683C,#E8C255,#56683C,#3E5230)";

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
          padding: transparent
            ? "2rem 1.75rem calc(2.75rem + env(safe-area-inset-bottom, 0px))"
            : "2.5rem 2rem",
          maxWidth: transparent ? "100%" : "30rem",
          width: transparent ? "100%" : "auto",
          pointerEvents: transparent ? "none" : "auto",
          ...(transparent
            ? {
                // A subtle warm scrim so ink + gold stay readable over the room.
                background:
                  "linear-gradient(transparent 0%, rgba(252,250,245,0.55) 42%, rgba(252,250,245,0.9) 100%)",
              }
            : {
                background: "#FFFFFF",
                border: `0.0625rem solid ${HAIRLINE}`,
                borderRadius: "1.25rem",
                boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
              }),
        }}
      >
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
            fontWeight: 600,
            color: INK,
            lineHeight: 1.15,
            margin: 0,
            // Gold-sage italic steward gradient on the personalized headline;
            // readable over the live scene via the warm scrim + shadow.
            backgroundImage: NAME_GRAD,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontStyle: "italic",
            textShadow: transparent ? "0 0.0625rem 0.125rem rgba(252,250,245,0.6)" : "none",
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
            textShadow: transparent ? "0 0.0625rem 0.125rem rgba(252,250,245,0.7)" : "none",
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
              textShadow: transparent ? "0 0.0625rem 0.125rem rgba(252,250,245,0.7)" : "none",
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
