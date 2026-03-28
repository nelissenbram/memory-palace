"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("forgotPassword");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📬</div>
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 400,
            color: T.color.charcoal,
            margin: "0 0 0.75rem",
          }}
        >
          {t("checkEmail")}
        </h2>
        <p style={{ fontSize: "0.875rem", color: T.color.muted, lineHeight: 1.6 }}>
          {t("resetLinkSent")}
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginTop: "1.25rem",
            color: T.color.terracotta,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <div style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>🔑</div>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "1.75rem",
            fontWeight: 300,
            color: T.color.charcoal,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: T.color.muted, marginTop: "0.375rem" }}>
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div
          id="forgot-password-error"
          role="alert"
          style={{
            padding: "0.625rem 0.875rem",
            borderRadius: "0.625rem",
            background: "#FDF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <label
        htmlFor="forgot-password-email"
        style={{
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          color: T.color.muted,
          letterSpacing: ".5px",
          textTransform: "uppercase",
          display: "block",
          marginBottom: "0.375rem",
        }}
      >
        {t("email")}
      </label>
      <input
        id="forgot-password-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-describedby={error ? "forgot-password-error" : undefined}
        placeholder={t("emailPlaceholder")}
        style={{
          width: "100%",
          padding: "0.8125rem 1rem",
          borderRadius: "0.625rem",
          border: `1.5px solid ${T.color.sandstone}`,
          background: T.color.white,
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          color: T.color.charcoal,
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.875rem",
          borderRadius: "0.75rem",
          border: "none",
          background: loading
            ? `${T.color.sandstone}40`
            : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
          color: loading ? T.color.muted : "#FFFFFF",
          fontFamily: T.font.body,
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
          marginTop: "1.25rem",
          transition: "all 0.2s",
        }}
      >
        {loading ? t("sending") : t("sendResetLink")}
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: T.color.muted,
          marginTop: "1.25rem",
          marginBottom: 0,
        }}
      >
        <Link
          href="/login"
          style={{ color: T.color.terracotta, textDecoration: "none", fontWeight: 600 }}
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
