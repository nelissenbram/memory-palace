"use client";
/**
 * ONBOARDING ELEVATION §11 (SPEC I) — CinematicPromptOverlay.
 *
 * Pure-UI prompt card + skip chip for the /flythrough onboarding viewer
 * (scene 4). NO camera/choreography code lives here — the exterior
 * WP1-pause/flyover contract is consumed by the viewer via
 * OnboardingSceneHost; this file only draws the Tuscan-canon overlay.
 *
 * Sole consumer: FlythroughClient (viewer). The DEEP 7 wizard wiring is
 * descoped — no wizard mount point exists (plan §1). Never writes any
 * onboarding localStorage key (pure render + callbacks).
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { prefersReducedMotion } from "@/lib/3d/reducedMotion";
import { T } from "@/lib/theme";

const EMBER = T.color.ember;      // #B85C38
const INK = T.color.ink;          // #403B36
const MUTED = T.color.inkMuted;   // #716A5E
const HAIRLINE = T.color.hairline; // #E3D6BC

/** Scoped keyframes + focus styles — unique `cpo-` names (never reuse
 *  OnboardingWizard's `onb-*`, which live in a different <style> scope). */
const CPO_STYLE = `
@keyframes cpo-cardIn{from{opacity:0;transform:translateY(0.5rem)}to{opacity:1;transform:translateY(0)}}
@keyframes cpo-cardOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(0.5rem)}}
@keyframes cpo-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes cpo-fadeOut{from{opacity:1}to{opacity:0}}
.cpo-cta:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
.cpo-skip:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
.cpo-chip:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
`;

export interface CinematicPromptOverlayProps {
  /** Show/hide — exit animation plays on the falling edge, then unmounts. */
  visible: boolean;
  onBegin: () => void;
  onSkip: () => void;
  /** Host's existing isMobile verdict (plan R: breakpoint = the prop, never a
   *  new media query — tablets-portrait follow the host). */
  isMobile: boolean;
  /** Optional copy overrides (viewer may pass `flythrough`-section strings);
   *  defaults are the `onboarding`-section keys per plan §11/§12. */
  title?: string;
  body?: string;
  ctaLabel?: string;
  skipLabel?: string;
}

/**
 * The WP1 pause-prompt card. Tuscan canon: linen glass + 0.75rem blur,
 * HAIRLINE border, Fraunces prompt, one EMBER CTA, persistent-underline
 * text skip. No GOLD. All rem; targets ≥ 2.75rem.
 */
export default function CinematicPromptOverlay({
  visible,
  onBegin,
  onSkip,
  isMobile,
  title,
  body,
  ctaLabel,
  skipLabel,
}: CinematicPromptOverlayProps) {
  const { t } = useTranslation("onboarding");
  // tr(): graceful fallback — new/revised keys ship EN inline until the i18n
  // agent lands all 5 locale files (flat, per-section — reference_i18n_flat_lookup).
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const [reduceMotionUi] = useState(() => prefersReducedMotion());

  // Mount/exit choreography: keep rendering for the exit animation
  // (300ms in / 250ms out; RM = fade-only 200ms), then unmount fully.
  const [rendered, setRendered] = useState(visible);
  const exitMs = reduceMotionUi ? 200 : 250;
  useEffect(() => {
    if (visible) { setRendered(true); return; }
    const id = window.setTimeout(() => setRendered(false), exitMs);
    return () => window.clearTimeout(id);
  }, [visible, exitMs]);

  // Enter = Begin, Esc = Skip (plan §11) — active only while visible.
  const onBeginRef = useRef(onBegin); onBeginRef.current = onBegin;
  const onSkipRef = useRef(onSkip); onSkipRef.current = onSkip;
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onSkipRef.current(); }
      else if (e.key === "Enter") {
        // Let a focused skip button/chip keep its native Enter activation.
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.classList.contains("cpo-skip") || el.classList.contains("cpo-chip"))) return;
        e.preventDefault();
        onBeginRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!rendered) return null;

  const enterAnim = reduceMotionUi
    ? "cpo-fadeIn 200ms linear both"
    : "cpo-cardIn 300ms ease-out both";
  const exitAnim = reduceMotionUi
    ? "cpo-fadeOut 200ms linear both"
    : "cpo-cardOut 250ms ease-out both";

  return (
    <div
      aria-hidden={!visible || undefined}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        alignItems: isMobile ? "flex-end" : "center",
        padding: isMobile
          ? "0 1.5rem calc(2.5rem + env(safe-area-inset-bottom, 0px))"
          : 0,
        pointerEvents: "none",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CPO_STYLE }} />
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="cpo-prompt-body"
        style={{
          pointerEvents: visible ? "auto" : "none",
          background: "rgba(252,250,245,0.88)",
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          border: `1px solid ${HAIRLINE}`,
          borderRadius: "1rem",
          boxShadow: "0 1rem 3rem rgba(64,59,54,0.18)",
          padding: "1.75rem 2rem",
          width: "100%",
          maxWidth: isMobile ? "24rem" : "26rem",
          textAlign: "center",
          transform: isMobile || reduceMotionUi ? undefined : "translateY(20vh)",
          animation: visible ? enterAnim : exitAnim,
        }}
      >
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: MUTED,
            margin: "0 0 0.75rem",
          }}
        >
          {title ?? tr("cinematicPromptTitle", "Your palace awaits")}
        </p>
        <p
          id="cpo-prompt-body"
          style={{
            fontFamily: T.font.display,
            fontWeight: 600,
            fontSize: isMobile ? "1.1875rem" : "1.375rem",
            lineHeight: 1.35,
            color: INK,
            margin: "0 0 1.5rem",
          }}
        >
          {body ?? tr("cinematicPrompt", "This is your Memory Palace. Shall we walk up to the entrance?")}
        </p>
        <button
          type="button"
          className="cpo-cta"
          autoFocus={!isMobile}
          onClick={onBegin}
          style={{
            display: "block",
            width: "100%",
            minHeight: "2.75rem",
            border: "none",
            borderRadius: "2rem",
            background: T.land.ctaGrad,
            color: "#FFFFFF",
            fontFamily: T.font.body,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: T.land.shadow.cta,
            padding: "0.75rem 1.5rem",
          }}
        >
          {ctaLabel ?? tr("cinematicYes", "Begin the walk")}
        </button>
        <button
          type="button"
          className="cpo-skip"
          onClick={onSkip}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "2.75rem",
            minWidth: "2.75rem",
            marginTop: "0.25rem",
            border: "none",
            background: "transparent",
            color: MUTED,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            textDecoration: "underline",
            textUnderlineOffset: "0.1875rem",
            cursor: "pointer",
            padding: "0.5rem 1rem",
          }}
        >
          {skipLabel ?? tr("cinematicSkip", "Skip intro")}
        </button>
      </div>
    </div>
  );
}

export interface CinematicSkipChipProps {
  onSkip: () => void;
  /** Viewer passes its own label (e.g. flythrough `onbSkip`); defaults to the
   *  onboarding `cinematicSkip` value. */
  label?: string;
}

/**
 * Persistent skip chip for the viewer (visible across obPhase hold→hall —
 * visibility is driven by the CONSUMER off obPhase, never by timers here).
 * Top-right, safe-area aware, linen glass, INK 0.8125rem, ≥2.75rem target.
 */
export function CinematicSkipChip({ onSkip, label }: CinematicSkipChipProps) {
  const { t } = useTranslation("onboarding");
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  return (
    <button
      type="button"
      className="cpo-chip"
      onClick={onSkip}
      style={{
        position: "absolute",
        top: "calc(1rem + env(safe-area-inset-top, 0px))",
        right: "calc(1rem + env(safe-area-inset-right, 0px))",
        zIndex: 31,
        minHeight: "2.75rem",
        minWidth: "2.75rem",
        background: "rgba(252,250,245,0.82)",
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: "0.375rem",
        color: INK,
        fontFamily: T.font.body,
        fontSize: "0.8125rem",
        fontWeight: 600,
        padding: "0.5rem 0.875rem",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      {label ?? tr("cinematicSkip", "Skip intro")}
    </button>
  );
}
