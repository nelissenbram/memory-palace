"use client";

/**
 * LEG-015: one-time age attestation for OAuth accounts (Google/Apple) created
 * without the registration checkbox. The auth callback redirects here when a
 * post-migration account has no profiles.age_confirmed_at; confirming stamps
 * the timestamp (confirmAge server action) and continues into the app.
 * Middleware keeps this route authenticated-only (it is not in PUBLIC_ROUTES).
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmAge } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useSignOut } from "@/lib/hooks/useSignOut";
import { T } from "@/lib/theme";
import { EMBER, HAIRLINE, MUTED } from "@/lib/libraryTokens";
import PalaceLogo from "@/components/landing/PalaceLogo";

export default function ConfirmAgePage() {
  return (
    <Suspense>
      <ConfirmAgeContent />
    </Suspense>
  );
}

function ConfirmAgeContent() {
  const { t } = useTranslation("register");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { handleSignOut, signingOut } = useSignOut();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ageConfirmed || loading) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("ageConfirmed", "true");
    const result = await confirmAge(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Only in-app invite deep-links are honored (mirrors the auth callback).
    const redirect = searchParams.get("redirect");
    const target = redirect && redirect.startsWith("/invite/") ? redirect : "/atrium";
    router.replace(target);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.color.cream,
        fontFamily: T.font.body,
        padding: "1.25rem",
        paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <PalaceLogo variant="mark" color="dark" size="md" />
        </div>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 300,
            color: T.color.charcoal,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {t("confirmAgeTitle")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: MUTED, marginTop: "0.5rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          {t("confirmAgeSubtitle")}
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.625rem 0.875rem",
              borderRadius: "0.625rem",
              background: "#FDF2F2",
              border: "1px solid #FECACA",
              color: T.color.error,
              fontSize: "0.8125rem",
              marginBottom: "1rem",
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        <label
          htmlFor="confirm-age-checkbox"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            minHeight: "2.75rem",
            padding: "0.5rem 0",
            fontSize: "0.8125rem",
            color: MUTED,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <input
            id="confirm-age-checkbox"
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0, accentColor: EMBER }}
          />
          {t("ageConfirm")}
        </label>

        <button
          type="submit"
          disabled={loading || !ageConfirmed}
          style={{
            width: "100%",
            minHeight: "2.75rem",
            marginTop: "0.75rem",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: loading || !ageConfirmed ? T.color.sandstone : EMBER,
            color: T.color.white,
            fontFamily: T.font.body,
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: loading || !ageConfirmed ? "default" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "…" : t("confirmAgeButton")}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            display: "inline-block",
            marginTop: "1rem",
            padding: "0.5rem 0.75rem",
            border: `1px solid ${HAIRLINE}`,
            borderRadius: "0.625rem",
            background: "none",
            color: MUTED,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: signingOut ? "default" : "pointer",
          }}
        >
          {t("confirmAgeSignOut")}
        </button>
      </form>
    </div>
  );
}
