"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth/actions";
import { signInWithGoogle } from "@/lib/auth/social-login";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { track } from "@/lib/analytics";

export default function RegisterPage() {
  return <Suspense><RegisterContent /></Suspense>;
}

function RegisterContent() {
  const { t } = useTranslation("register");
  const { t: tc } = useTranslation("common");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const refCode = searchParams.get("ref");

  // Store referral code for post-registration application
  useEffect(() => {
    if (refCode) {
      localStorage.setItem("mp_referral_code", refCode);
    }
  }, [refCode]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      setLoading(false);
      return;
    }

    if (redirect) formData.set("redirect", redirect);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      track("signup_completed");

      // Apply referral code if stored
      try {
        const storedRef = localStorage.getItem("mp_referral_code");
        if (storedRef) {
          await fetch("/api/referral", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: storedRef }),
          });
          localStorage.removeItem("mp_referral_code");
        }
      } catch {
        // non-critical — referral application is best-effort
      }
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "4rem", height: "4rem", borderRadius: "2rem",
          background: `linear-gradient(135deg, ${T.color.terracotta}20, ${T.color.walnut}20)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1rem",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M22 4L12 13 2 4"/>
          </svg>
        </div>
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 500,
            color: T.color.charcoal,
            margin: "0 0 0.75rem",
          }}
        >
          {t("checkEmail")}
        </h2>
        <p style={{ fontSize: "0.875rem", color: T.color.muted, lineHeight: 1.6 }}>
          {t("confirmationSent")}
          {redirect && (
            <span style={{ display: "block", marginTop: "0.5rem", color: T.color.terracotta }}>
              {t("afterConfirming")}
            </span>
          )}
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
        <div style={{ marginBottom: "0.5rem" }}><PalaceLogo variant="mark" color="dark" size="lg" /></div>
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
          id="register-error"
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

      <label htmlFor="register-name" style={labelStyle}>{t("name")}</label>
      <input
        id="register-name"
        name="displayName"
        type="text"
        autoComplete="name"
        placeholder={t("namePlaceholder")}
        style={inputStyle}
      />

      <label htmlFor="register-email" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("email")}</label>
      <input
        id="register-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-describedby={error ? "register-error" : undefined}
        placeholder={t("emailPlaceholder")}
        style={inputStyle}
      />

      <label htmlFor="register-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("password")}</label>
      <input
        id="register-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        aria-describedby={error ? "register-error" : undefined}
        placeholder={t("passwordPlaceholder")}
        style={inputStyle}
      />

      <label htmlFor="register-confirm-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("confirmPassword")}</label>
      <input
        id="register-confirm-password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        aria-describedby={error ? "register-error" : undefined}
        placeholder={t("confirmPasswordPlaceholder")}
        style={inputStyle}
      />

      <label
        htmlFor="register-age"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "1rem",
          fontSize: "0.8125rem",
          color: T.color.muted,
          cursor: "pointer",
        }}
      >
        <input
          id="register-age"
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          style={{ width: "1rem", height: "1rem", accentColor: T.color.terracotta }}
        />
        {t("ageConfirm")}
      </label>

      <button type="submit" disabled={loading || !ageConfirmed} style={buttonStyle(loading || !ageConfirmed)}>
        {loading ? t("creating") : t("createAccount")}
      </button>

      <div style={dividerStyle}>
        <span style={dividerLineStyle} />
        <span style={dividerTextStyle}>{t("orSignUpWith")}</span>
        <span style={dividerLineStyle} />
      </div>

      <button
        type="button"
        onClick={() => {
          if (!ageConfirmed) {
            setError(t("ageRequiredForSocial"));
            return;
          }
          signInWithGoogle();
        }}
        style={{
          ...googleButtonStyle,
          ...(!ageConfirmed ? { opacity: 0.6 } : {}),
        }}
      >
        <GoogleIcon />
        {t("signUpWithGoogle")}
      </button>

      <button
        type="button"
        disabled
        style={{
          ...appleButtonStyle,
          opacity: 0.5,
          cursor: "not-allowed",
          pointerEvents: "none" as const,
        }}
        aria-disabled
      >
        <AppleIcon />
        {t("signUpWithApple")}
      </button>
      <span style={{ display: "block", textAlign: "center", fontSize: "0.75rem", fontStyle: "italic", color: T.color.muted, marginTop: "-0.25rem" }}>
        {t("comingSoon")}
      </span>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: T.color.muted,
          marginTop: "1.25rem",
          marginBottom: 0,
        }}
      >
        {t("alreadyHaveAccount")}{" "}
        <Link
          href="/login"
          style={{ color: T.color.terracotta, textDecoration: "none", fontWeight: 600 }}
        >
          {t("signIn")}
        </Link>
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.6875rem",
          color: T.color.muted,
          marginTop: "1rem",
          marginBottom: 0,
          lineHeight: 1.6,
        }}
      >
        {t("agreeTerms")}{" "}
        <Link href="/terms" style={{ color: T.color.terracotta, textDecoration: "none" }}>
          {tc("termsOfService")}
        </Link>{" "}
        {t("and")}{" "}
        <Link href="/privacy" style={{ color: T.color.terracotta, textDecoration: "none" }}>
          {tc("privacyPolicy")}
        </Link>
        .
      </p>
    </form>
  );
}

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

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  margin: "1.5rem 0 1.25rem",
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: T.color.sandstone,
};

const dividerTextStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.75rem",
  color: T.color.muted,
  whiteSpace: "nowrap",
};

const socialButtonBase: React.CSSProperties = {
  width: "100%",
  minHeight: "2.75rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.75rem",
  fontFamily: T.font.body,
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.625rem",
  transition: "all 0.2s",
};

const googleButtonStyle: React.CSSProperties = {
  ...socialButtonBase,
  background: T.color.white,
  color: "#3C4043",
  border: `1.5px solid ${T.color.sandstone}`,
  marginBottom: "0.625rem",
};

const appleButtonStyle: React.CSSProperties = {
  ...socialButtonBase,
  background: "#000000",
  color: "#FFFFFF",
  border: "1.5px solid #000000",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
    </svg>
  );
}
