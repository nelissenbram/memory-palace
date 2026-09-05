"use client";

import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { CREAM, INK, MUTED, EMBER, GOLD } from "@/lib/libraryTokens";

/**
 * Explore error boundary — outages must never render as "be the first to
 * publish". Localized message + retry (Next.js reset re-renders the segment).
 */
export default function ExploreError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation("social");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: CREAM,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "24rem" }}>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "1.375rem",
            fontWeight: 600,
            color: INK,
            margin: "0 0 0.5rem",
          }}
        >
          {t("exploreErrorTitle")}
        </h1>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.9375rem",
            color: MUTED,
            lineHeight: 1.5,
            margin: "0 0 1.5rem",
          }}
        >
          {t("exploreErrorHint")}
        </p>
        <button
          onClick={reset}
          className="explore-error-retry"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "2.75rem",
            padding: "0 2rem",
            borderRadius: "2rem",
            border: "none",
            background: EMBER,
            color: CREAM,
            fontFamily: T.font.body,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.14)",
          }}
        >
          {t("exploreRetry")}
        </button>
        <style>{`
          .explore-error-retry:focus-visible { outline: 0.1875rem solid ${GOLD}; outline-offset: 0.1875rem; }
          .explore-error-retry:active { opacity: 0.8; }
        `}</style>
      </div>
    </div>
  );
}
