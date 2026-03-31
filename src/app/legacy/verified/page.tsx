"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

/**
 * /legacy/verified
 *
 * Standalone thank-you page for verifiers who confirmed that the account
 * holder is still alive. Verifiers do not have accounts, so they cannot
 * be redirected into the app.
 *
 * Also handles ?status=expired and ?status=invalid from the verify route.
 */

function VerifiedContent() {
  const { t } = useTranslation("legacySettings");
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  // Determine which content to show based on status
  let icon = "\u{1F3DB}\uFE0F";
  let title = t("verifierConfirmedTitle");
  let description = t("verifierConfirmedDesc");
  let footer = t("verifierConfirmedClose");

  if (status === "expired") {
    icon = "\u23F3";
    title = t("verifierExpiredTitle");
    description = t("verifierExpiredDesc");
    footer = "";
  } else if (status === "too_late") {
    icon = "\u{1F570}\uFE0F";
    title = t("verifierTooLateTitle");
    description = t("verifierTooLateDesc");
    footer = "";
  } else if (status === "invalid") {
    icon = "\u26A0\uFE0F";
    title = t("verifierInvalidTitle");
    description = t("verifierInvalidDesc");
    footer = "";
  }

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
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }} aria-hidden="true">
          {icon}
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
          {title}
        </h1>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            color: T.color.walnut,
            margin: "0 0 1.25rem",
          }}
        >
          {description}
        </p>
        {footer && (
          <p
            style={{
              fontSize: "0.875rem",
              color: T.color.muted,
              margin: 0,
            }}
          >
            {footer}
          </p>
        )}
        <a
          href="https://thememorypalace.ai"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            fontSize: "0.8125rem",
            color: T.color.walnut,
            textDecoration: "underline",
            textUnderlineOffset: "0.1875rem",
          }}
        >
          {t("visitMemoryPalace")}
        </a>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense>
      <VerifiedContent />
    </Suspense>
  );
}
