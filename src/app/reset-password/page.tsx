"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updatePassword } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const { t } = useTranslation("resetPassword");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);
    // If updatePassword succeeds it redirects, so we only get here on error
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  // Loading state while checking session
  if (hasSession === null) {
    return (
      <div style={wrapperStyle}>
        <main style={cardStyle}>
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={spinnerStyle} />
          </div>
        </main>
      </div>
    );
  }

  // No session — link expired or invalid
  if (!hasSession) {
    return (
      <div style={wrapperStyle}>
        <main style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={iconContainerStyle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 style={titleStyle}>{t("title")}</h1>
            <p style={{ fontSize: "0.875rem", color: T.color.muted, lineHeight: 1.6, marginTop: "0.75rem" }}>
              {t("noSession")}
            </p>
            <Link href="/forgot-password" style={primaryLinkStyle}>
              {t("requestNewLink")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <main style={cardStyle}>
        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={iconContainerStyle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1"/>
              </svg>
            </div>
            <h1 style={titleStyle}>{t("title")}</h1>
            <p style={{ fontSize: "0.875rem", color: T.color.muted, marginTop: "0.375rem" }}>
              {t("subtitle")}
            </p>
          </div>

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
              }}
            >
              {error}
            </div>
          )}

          <label htmlFor="reset-password" style={labelStyle}>{t("newPassword")}</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t("newPasswordPlaceholder")}
            style={inputStyle}
          />

          <label htmlFor="reset-confirm-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>
            {t("confirmPassword")}
          </label>
          <input
            id="reset-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t("confirmPasswordPlaceholder")}
            style={inputStyle}
          />

          <button type="submit" disabled={loading} style={buttonStyle(loading)}>
            {loading ? t("updating") : t("updatePassword")}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: T.color.muted, marginTop: "1.25rem", marginBottom: 0 }}>
            <Link href="/login" style={{ color: T.color.terracotta, textDecoration: "none", fontWeight: 600 }}>
              {t("requestNewLink")}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(165deg, #FAFAF7 0%, #F2EDE7 50%, #D4C5B2 100%)",
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  position: "relative",
  overflow: "hidden",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  padding: "40px 36px",
  background: "rgba(250,250,247,0.85)",
  backdropFilter: "blur(20px)",
  borderRadius: 20,
  border: "1px solid #EEEAE3",
  boxShadow: "0 8px 32px rgba(44,44,42,0.12)",
  position: "relative",
  zIndex: 1,
  margin: "20px",
};

const iconContainerStyle: React.CSSProperties = {
  width: "3.5rem",
  height: "3.5rem",
  borderRadius: "1.75rem",
  background: `linear-gradient(135deg, ${T.color.terracotta}20, ${T.color.walnut}20)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 0.5rem",
};

const titleStyle: React.CSSProperties = {
  fontFamily: T.font.display,
  fontSize: "1.75rem",
  fontWeight: 300,
  color: T.color.charcoal,
  margin: 0,
  lineHeight: 1.3,
};

const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.6875rem",
  color: T.color.muted,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "0.375rem",
};

const inputStyle: React.CSSProperties = {
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
  transition: "border-color 0.2s",
};

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  borderRadius: "0.75rem",
  border: "none",
  background: disabled
    ? `${T.color.sandstone}40`
    : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
  color: disabled ? T.color.muted : T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  marginTop: "1.25rem",
  transition: "all 0.2s",
});

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: "1.25rem",
  padding: "0.875rem 2rem",
  borderRadius: "0.75rem",
  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
  color: T.color.white,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.9375rem",
  fontFamily: T.font.body,
};

const spinnerStyle: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  border: `3px solid ${T.color.sandstone}`,
  borderTop: `3px solid ${T.color.terracotta}`,
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto",
};
