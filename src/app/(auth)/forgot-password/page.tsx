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
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: 24,
            fontWeight: 400,
            color: T.color.charcoal,
            margin: "0 0 12px",
          }}
        >
          {t("checkEmail")}
        </h2>
        <p style={{ fontSize: 14, color: T.color.muted, lineHeight: 1.6 }}>
          {t("resetLinkSent")}
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 20,
            color: T.color.terracotta,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: 28,
            fontWeight: 300,
            color: T.color.charcoal,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: 14, color: T.color.muted, marginTop: 6 }}>
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#FDF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <label
        style={{
          fontFamily: T.font.body,
          fontSize: 11,
          color: T.color.muted,
          letterSpacing: ".5px",
          textTransform: "uppercase",
          display: "block",
          marginBottom: 6,
        }}
      >
        {t("email")}
      </label>
      <input
        name="email"
        type="email"
        required
        placeholder={t("emailPlaceholder")}
        style={{
          width: "100%",
          padding: "13px 16px",
          borderRadius: 10,
          border: `1.5px solid ${T.color.sandstone}`,
          background: T.color.white,
          fontFamily: T.font.body,
          fontSize: 14,
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
          padding: 14,
          borderRadius: 12,
          border: "none",
          background: loading
            ? `${T.color.sandstone}40`
            : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
          color: loading ? T.color.muted : "#FFFFFF",
          fontFamily: T.font.body,
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
          marginTop: 20,
          transition: "all 0.2s",
        }}
      >
        {loading ? t("sending") : t("sendResetLink")}
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: T.color.muted,
          marginTop: 20,
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
