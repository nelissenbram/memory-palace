"use client";

import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

/**
 * /legacy/verified
 *
 * Standalone thank-you page for verifiers who confirmed that the account
 * holder is still alive. Verifiers do not have accounts, so they cannot
 * be redirected into the app.
 */
export default function VerifiedPage() {
  const { t } = useTranslation("legacySettings");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.cream} 100%)`,
        fontFamily: T.font.body,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          width: "100%",
          background: T.color.white,
          borderRadius: "1rem",
          border: `1px solid ${T.color.cream}`,
          padding: "2.5rem 2rem",
          boxShadow: "0 4px 24px rgba(44,44,42,0.06)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
          🏛️
        </div>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 500,
            color: T.color.charcoal,
            margin: "0 0 0.75rem",
          }}
        >
          {t("verifierConfirmedTitle")}
        </h1>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            color: T.color.walnut,
            margin: "0 0 1.25rem",
          }}
        >
          {t("verifierConfirmedDesc")}
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: 0,
          }}
        >
          {t("verifierConfirmedClose")}
        </p>
      </div>
    </div>
  );
}
