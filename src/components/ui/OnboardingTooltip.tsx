"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { CREAM, INK, MUTED, HAIRLINE, GOLD, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

/* One clean seeded-memory hint. All copy is caller-supplied and i18n'd —
 * NO hardcoded English defaults can ever leak: nextLabel/skipLabel default to
 * '' and their buttons are guarded so an empty label never renders. */

interface OnboardingTooltipProps {
  message: string;
  /** Required, i18n'd label — defaults to '' with a render guard so no raw English leaks. */
  nextLabel?: string;
  /** Required, i18n'd label — defaults to '' with a render guard so no raw English leaks. */
  skipLabel?: string;
  onNext?: () => void;
  onSkip?: () => void;
  showNext?: boolean;
  showSkip?: boolean;
}

const ctaGrad = "linear-gradient(135deg, #9A4F2A, #6B3318)";

export default function OnboardingTooltip({
  message,
  nextLabel = "",
  skipLabel = "",
  onNext,
  onSkip,
  showNext = true,
  showSkip = true,
}: OnboardingTooltipProps) {
  const isMobile = useIsMobile();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: isMobile ? "calc(1.5rem + env(safe-area-inset-bottom, 0px))" : "2.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: isMobile ? "calc(100vw - 2rem)" : "28rem",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.875rem",
        padding: "1.25rem 1.5rem",
        borderRadius: "1rem",
        background: CREAM,
        border: `0.0625rem solid ${HAIRLINE}`,
        boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
        animation: "onb-tt-rise .4s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <style>{`
@keyframes onb-tt-rise{from{opacity:0;transform:translate(-50%,0.75rem)}to{opacity:1;transform:translate(-50%,0)}}
@media (prefers-reduced-motion: reduce){[role="status"]{animation:none!important}}
.onb-tt-btn:focus-visible{outline:0.1875rem solid ${GOLD};outline-offset:0.1875rem}
`}</style>
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? "1rem" : "1.0625rem",
          color: INK,
          lineHeight: 1.55,
          textAlign: "center",
          margin: 0,
        }}
      >
        {message}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {showNext && onNext && nextLabel && (
          <button
            className="onb-tt-btn"
            onClick={onNext}
            style={{
              fontFamily: T.font.body,
              fontSize: "1rem",
              fontWeight: 600,
              padding: "0 1.75rem",
              minHeight: "2.75rem",
              minWidth: "2.75rem",
              borderRadius: "0.625rem",
              border: "none",
              background: ctaGrad,
              color: "#FFFFFF",
              cursor: "pointer",
              transition: "filter .2s",
            }}
          >
            {nextLabel}
          </button>
        )}
        {showSkip && onSkip && skipLabel && (
          <button
            className="onb-tt-btn"
            onClick={onSkip}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: MUTED,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "0.125rem",
              padding: "0.5rem 0.75rem",
              minHeight: "2.75rem",
            }}
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
