"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

/* ── ONBOARDING_ELEVATION_PLAN §7 — `wing_orient` "One palace, five wings" ──
 *
 * Step 4/4 of the setup cards: a purely informational orientation beat between
 * `style_era` and `upload`. Renders on opaque CREAM (Library canon card), shows
 * the five wings as non-interactive chips (attic omitted), highlights Roots as
 * "selected", and points at the seeded first room ("Me, Over Time" = ro1 —
 * where the upload phase lands). No error/loading states; only Back / Continue
 * / skip are tabbable.
 *
 * Self-contained by design (integration agent mounts it as the full
 * `phase === "wing_orient"` return in OnboardingWizard):
 *   - brings its own page container per R8 (overflowY auto + flex-start +
 *     card margin:auto — visually centered when content fits, scrollable when
 *     it doesn't, e.g. 640px-tall portrait phones);
 *   - brings its own scoped keyframes + EMBER focus ring (R5) + RM guard, so
 *     it never depends on OnboardingWizard's inline canonStyle.
 */

interface OnboardingWingOrientStepProps {
  /** Back → setPhase("style_era") */
  onBack: () => void;
  /** Continue → setPhase("upload") */
  onContinue: () => void;
  /** Skip link → the wizard's unified handleSkip */
  onSkip: () => void;
}

/* Wing chip data — emoji mirror `WINGS` (src/lib/constants/wings.ts) verbatim;
 * names come from the NEW flat onboarding keys `orientWing*` whose locale
 * values are copied verbatim from the existing wing translations (§12). */
const ORIENT_WINGS: { id: string; icon: string; key: string; fallback: string }[] = [
  { id: "roots", icon: "\u{1F331}", key: "orientWingRoots", fallback: "Roots" },
  { id: "nest", icon: "\u{1FABA}", key: "orientWingNest", fallback: "Nest" },
  { id: "craft", icon: "\u{1F6E0}", key: "orientWingCraft", fallback: "Craft" },
  { id: "travel", icon: "\u{1F9ED}", key: "orientWingTravel", fallback: "Travel" },
  { id: "passions", icon: "\u{2728}", key: "orientWingPassions", fallback: "Passions" },
];

/* Canon stroked check (same hand as the wizard's CheckMark: round caps,
 * currentColor-free explicit stroke) — local copy, wizard's is not exported. */
function CheckMark({ size = "0.75rem", color = EMBER }: { size?: string; color?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block", flexShrink: 0 }}>
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Quiet canon step dots (AtriumRelay lane-dot grammar) — local copy of the
 * wizard's StepDots (not exported). Filled=EMBER_GLYPH, unfilled=HAIRLINE. */
function StepDots({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={label}
      style={{ position: "absolute", top: "calc(2rem + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", alignItems: "center" }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div key={i} aria-hidden style={{
          width: "0.6rem", height: "0.6rem", borderRadius: "50%",
          background: i + 1 <= current ? EMBER_GLYPH : HAIRLINE,
          transition: "background .4s ease",
        }} />
      ))}
    </div>
  );
}

export default function OnboardingWingOrientStep({ onBack, onContinue, onSkip }: OnboardingWingOrientStepProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("onboarding");

  // tr(key, fallback) guard — flat-lookup pattern (reference_i18n_flat_lookup):
  // useTranslation t() returns the bare key when a translation is missing.
  const tr = (key: string, fallback: string) => {
    const v = t(key as any);
    return v !== key ? v : fallback;
  };

  return (
    <div style={{
      // R8: universal margin-auto centering + scroll — identical visual centering
      // when content fits, scrollable when it doesn't (tall card on short phones).
      // height:100dvh ONLY (no 100vh minHeight floor): with mobile URL-bar
      // chrome expanded, 100vh > visible viewport, which pushed the card bottom
      // and safe-area padding behind the browser chrome.
      width: "100vw", height: "100dvh", position: "relative",
      overflowY: "auto", background: CREAM,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))",
      paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
    }}>
      {/* Scoped keyframes + EMBER focus ring (R5) + reduced-motion guard (§4) —
          local so this step never depends on the wizard's inline canonStyle. */}
      <style>{`
@keyframes onbwo-fadeUp{from{opacity:0;transform:translateY(1.5rem)}to{opacity:1;transform:translateY(0)}}
@keyframes onbwo-chipIn{from{opacity:0;transform:translateY(0.375rem)}to{opacity:1;transform:translateY(0)}}
.onbwo-cta{transition:transform .16s ease, filter .16s ease}
.onbwo-cta:hover{transform:translateY(-1px);filter:brightness(1.06)}
.onbwo-focusable:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
@media (prefers-reduced-motion: reduce){.onbwo-anim,.onbwo-cta,.onb-orient-in{animation:none!important;transition:none!important;transform:none!important}}
      `}</style>

      <StepDots current={4} total={4} label={t("stepOf", { current: "4", total: "4" })} />

      {/* Card frame — Library canon (§4): opaque CREAM, hairline, margin:auto (R8) */}
      <div className="onbwo-anim" style={{
        maxWidth: "30rem", width: "92%",
        padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
        background: CREAM,
        borderRadius: "1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
        animation: "onbwo-fadeUp .5s ease both",
        margin: "auto",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

          {/* Canon overline */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ width: "2rem", height: "1px", background: `${EMBER_GLYPH}40` }} />
            <span style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
              color: EMBER_GLYPH, letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              {t("appName")}
            </span>
            <span style={{ width: "2rem", height: "1px", background: `${EMBER_GLYPH}40` }} />
          </div>

          <h2 style={{
            fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
            fontWeight: 600, color: INK, lineHeight: 1.25, margin: 0,
          }}>
            {tr("orientTitle", "One palace, five wings")}
          </h2>

          <p style={{
            fontFamily: T.font.display, fontStyle: "italic", fontSize: "0.9375rem",
            color: MUTED, maxWidth: "24rem", lineHeight: 1.6, margin: 0,
          }}>
            {tr("orientAside", "Wings hold the themes of your life; rooms hold the moments. Every memory finds a room.")}
          </p>

          {/* Wing strip — five non-interactive chips, free-form wrap (no layout
              promise at any width, §7.5); Roots reads as "selected". */}
          <ul
            aria-label={tr("orientWingsAria", "The five wings of your palace")}
            style={{
              listStyle: "none", margin: 0, padding: 0,
              display: "flex", flexWrap: "wrap", justifyContent: "center",
              gap: "0.5rem", maxWidth: "24rem", width: "100%",
            }}
          >
            {ORIENT_WINGS.map((w, i) => {
              const selected = w.id === "roots";
              return (
                <li
                  key={w.id}
                  className="onb-orient-in"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.375rem 0.75rem", minHeight: "2rem",
                    borderRadius: "0.5rem",
                    border: selected ? `0.09375rem solid ${EMBER}` : `0.0625rem solid ${HAIRLINE}`,
                    background: "#FFF",
                    fontFamily: T.font.body, fontSize: "0.8125rem",
                    fontWeight: selected ? 600 : 400,
                    color: selected ? INK : MUTED,
                    animation: "onbwo-chipIn .4s ease both",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <span aria-hidden>{w.icon}</span>
                  {tr(w.key, w.fallback)}
                  {selected && <CheckMark size="0.75rem" color={EMBER} />}
                </li>
              );
            })}
          </ul>

          {/* First-room card — points at the seeded room the upload phase lands
              in (WING_ROOMS.roots[0] = ro1, "Me, Over Time"). No connector line:
              the relation is carried by copy (§7.6). */}
          <div style={{
            width: "100%", maxWidth: "20rem",
            padding: "0.875rem 1rem", borderRadius: "0.625rem",
            border: `0.09375rem solid ${EMBER}`, background: "#FFF",
            display: "flex", flexDirection: "column", gap: "0.25rem",
          }}>
            <span style={{
              fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
              color: INK, lineHeight: 1.3,
            }}>
              {tr("orientFirstRoom", "Me, Over Time")}
            </span>
            <span style={{
              fontFamily: T.font.body, fontSize: "0.75rem", color: MUTED, lineHeight: 1.5,
            }}>
              {tr("orientFirstRoomSub", "Your first room, in the Roots wing — we'll start here.")}
            </span>
          </div>

          {/* Reversibility line */}
          <p style={{
            fontFamily: T.font.body, fontSize: "0.8125rem",
            color: MUTED, maxWidth: "24rem", lineHeight: 1.5, margin: 0,
          }}>
            {tr("orientReversible", "You can rename, add or rearrange rooms anytime.")}
          </p>

          {/* Nav row — Back keeps the shipped chrome (R11); Continue is the one
              EMBER CTA on this card. */}
          <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
            <button
              className="onbwo-focusable"
              onClick={onBack}
              style={{
                fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                padding: "0 1.25rem", borderRadius: "0.75rem", minHeight: "3.25rem",
                border: `0.0625rem solid ${HAIRLINE}`, background: "#FFF",
                color: MUTED, cursor: "pointer",
              }}
            >
              {"←"} {t("backButton")}
            </button>
            <button
              className="onbwo-cta onbwo-focusable"
              onClick={onContinue}
              style={{
                fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
                padding: "0 1.25rem", borderRadius: "0.75rem", border: "none",
                background: T.land.ctaGrad, color: "#FFF", cursor: "pointer",
                minHeight: "3.25rem", flex: 1,
              }}
            >
              {t("continueButton")} {"→"}
            </button>
          </div>

          {/* Skip link — persistent underline (never hover-only on touch), wired
              to the wizard's unified skip path. */}
          <button className="onbwo-focusable" onClick={onSkip} style={{
            fontFamily: T.font.body, fontSize: "0.8125rem",
            color: MUTED, background: "none", border: "none",
            cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
            minHeight: "2.75rem", padding: "0.5rem",
          }}>
            {t("skipExploreOwn")}
          </button>
        </div>
      </div>
    </div>
  );
}
