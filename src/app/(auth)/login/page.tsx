"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>;
}

function LoginContent() {
  const { t } = useTranslation("auth");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (redirect) formData.set("redirect", redirect);
    const result = await signIn(formData);
    // If signIn succeeds it redirects, so we only get here on error
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏛️</div>
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
          {t("welcomeBack")}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: T.color.muted,
            marginTop: 6,
          }}
        >
          {t("signInSubtitle")}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#FDF2F2",
            border: "1px solid #FECACA",
            color: T.color.error,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <label style={labelStyle}>{t("email")}</label>
      <input
        name="email"
        type="email"
        required
        placeholder={t("emailPlaceholder")}
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 14 }}>{t("password")}</label>
      <input
        name="password"
        type="password"
        required
        placeholder={t("passwordPlaceholder")}
        style={inputStyle}
      />

      <div style={{ textAlign: "right", marginTop: 6 }}>
        <Link href="/forgot-password" style={linkStyle}>
          {t("forgotPassword")}
        </Link>
      </div>

      <button type="submit" disabled={loading} style={buttonStyle(loading)}>
        {loading ? t("signingIn") : t("signIn")}
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
        {t("noAccount")}{" "}
        <Link href="/register" style={{ ...linkStyle, fontWeight: 600 }}>
          {t("createOne")}
        </Link>
      </p>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: 11,
  color: T.color.muted,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
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
  transition: "border-color 0.2s",
};

const linkStyle: React.CSSProperties = {
  color: T.color.terracotta,
  textDecoration: "none",
  fontSize: 13,
};

const buttonStyle = (loading: boolean): React.CSSProperties => ({
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: loading
    ? `${T.color.sandstone}40`
    : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
  color: loading ? T.color.muted : T.color.white,
  fontFamily: T.font.body,
  fontSize: 15,
  fontWeight: 600,
  cursor: loading ? "default" : "pointer",
  marginTop: 20,
  transition: "all 0.2s",
});
