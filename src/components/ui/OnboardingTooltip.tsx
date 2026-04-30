"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

interface OnboardingTooltipProps {
  message: string;
  nextLabel?: string;
  skipLabel?: string;
  onNext?: () => void;
  onSkip?: () => void;
  showNext?: boolean;
  showSkip?: boolean;
}

export default function OnboardingTooltip({
  message,
  nextLabel = "Next",
  skipLabel = "Skip tour",
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
        gap: "0.75rem",
        padding: "1.25rem 1.5rem",
        borderRadius: "1rem",
        background: "rgba(30, 28, 26, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0.5rem 2rem rgba(0,0,0,0.4)",
        animation: "fadeUp .4s ease",
      }}
    >
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

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {showNext && onNext && (
          <button
            onClick={onNext}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              padding: "0.625rem 1.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: "#FFF",
              cursor: "pointer",
              transition: "all .2s",
              minHeight: "3rem",
              minWidth: "3rem",
            }}
          >
            {nextLabel}
          </button>
        )}
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.5)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "0.125rem",
              padding: "0.5rem",
              minHeight: "3rem",
            }}
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
