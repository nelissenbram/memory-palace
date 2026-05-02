"use client";

import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth/actions";
import { signInWithGoogle } from "@/lib/auth/social-login";
import { createMFAChallenge, verifyMFAChallenge } from "@/lib/auth/mfa-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>;
}

function LoginContent() {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  // MFA state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaRedirect, setMfaRedirect] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const mfaInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (redirect) formData.set("redirect", redirect);
    try {
      const result = await signIn(formData);

      if (result?.mfaRequired) {
        // Switch to MFA challenge screen
        setMfaFactorId(result.factorId);
        setMfaRedirect(result.redirect ?? null);
        setMfaStep(true);
        setLoading(false);
        setTimeout(() => mfaInputRefs.current[0]?.focus(), 100);
        return;
      }

      if (result?.success) {
        // Auth succeeded — navigate client-side so cookies are flushed first
        window.location.href = result.redirect || "/atrium";
        return;
      }

      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // Unexpected error — clear loading state
    }
    setLoading(false);
  }

  function handleMfaCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...mfaCode];
    newCode[index] = value.slice(-1);
    setMfaCode(newCode);

    if (value && index < 5) {
      mfaInputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((d) => d !== "")) {
      handleMfaVerify(newCode.join(""));
    }
  }

  function handleMfaKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !mfaCode[index] && index > 0) {
      mfaInputRefs.current[index - 1]?.focus();
    }
  }

  function handleMfaPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...mfaCode];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setMfaCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    mfaInputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) {
      handleMfaVerify(pasted);
    }
  }

  async function handleMfaVerify(code?: string) {
    const fullCode = code || mfaCode.join("");
    if (fullCode.length !== 6) {
      setError(t("mfaEnterAllDigits"));
      return;
    }

    setMfaLoading(true);
    setError("");

    const challengeResult = await createMFAChallenge(mfaFactorId);
    if (challengeResult.error) {
      setError(challengeResult.error);
      setMfaLoading(false);
      return;
    }

    const verifyResult = await verifyMFAChallenge(
      mfaFactorId,
      challengeResult.challengeId!,
      fullCode
    );

    if (verifyResult.error) {
      setError(t("mfaInvalidCode"));
      setMfaCode(["", "", "", "", "", ""]);
      mfaInputRefs.current[0]?.focus();
      setMfaLoading(false);
      return;
    }

    // MFA verified — redirect
    if (mfaRedirect && mfaRedirect.startsWith("/invite/")) {
      window.location.href = mfaRedirect;
    } else {
      window.location.href = "/atrium";
    }
  }

  // ── MFA Challenge Screen ──
  if (mfaStep) {
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "4rem", height: "4rem", borderRadius: "2rem",
            background: `linear-gradient(135deg, ${T.color.terracotta}20, ${T.color.walnut}20)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem", fontSize: "2rem",
          }}>
            <ShieldIcon />
          </div>
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: "1.75rem",
              fontWeight: 500,
              color: T.color.charcoal,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {t("mfaTitle")}
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: T.color.muted,
              marginTop: "0.625rem",
              lineHeight: 1.6,
              fontFamily: T.font.body,
            }}
          >
            {t("mfaDescription")}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.625rem",
              background: "#FDF2F2",
              border: "1px solid #FECACA",
              color: T.color.error,
              fontSize: "0.9375rem",
              marginBottom: "1.25rem",
              textAlign: "center",
              fontFamily: T.font.body,
            }}
          >
            {error}
          </div>
        )}

        {/* 6-digit code input */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.625rem",
            marginBottom: "1.75rem",
          }}
          onPaste={handleMfaPaste}
        >
          {mfaCode.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { mfaInputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleMfaCodeChange(i, e.target.value)}
              onKeyDown={(e) => handleMfaKeyDown(i, e)}
              autoFocus={i === 0}
              aria-label={tc("mfaDigit", { n: String(i + 1), total: "6" })}
              style={{
                width: "3.25rem",
                height: "4rem",
                textAlign: "center",
                fontSize: "1.625rem",
                fontFamily: T.font.body,
                fontWeight: 600,
                color: T.color.charcoal,
                borderRadius: "0.75rem",
                border: `2px solid ${digit ? T.color.terracotta : T.color.sandstone}`,
                background: T.color.white,
                outline: "none",
                transition: "border-color 0.2s",
                caretColor: T.color.terracotta,
              }}
            />
          ))}
        </div>

        <button
          onClick={() => handleMfaVerify()}
          disabled={mfaLoading || mfaCode.some((d) => !d)}
          style={buttonStyle(mfaLoading || mfaCode.some((d) => !d))}
        >
          {mfaLoading ? t("mfaVerifying") : t("mfaVerifyCode")}
        </button>

        <button
          type="button"
          onClick={() => {
            setMfaStep(false);
            setMfaCode(["", "", "", "", "", ""]);
            setError("");
          }}
          style={{
            display: "block",
            width: "100%",
            margin: "0.875rem auto 0",
            padding: "0.75rem",
            background: "none",
            border: `1px solid ${T.color.cream}`,
            borderRadius: "0.75rem",
            color: T.color.muted,
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {t("mfaBackToLogin")}
        </button>
      </div>
    );
  }

  // ── Normal Login Screen ──
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
          {t("welcomeBack")}
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: T.color.muted,
            marginTop: "0.375rem",
          }}
        >
          {t("signInSubtitle")}
        </p>
      </div>

      {error && (
        <div
          id="login-error"
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

      <label htmlFor="login-email" style={labelStyle}>{t("email")}</label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-describedby={error ? "login-error" : undefined}
        placeholder={t("emailPlaceholder")}
        style={inputStyle}
      />

      <label htmlFor="login-password" style={{ ...labelStyle, marginTop: "0.875rem" }}>{t("password")}</label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        aria-describedby={error ? "login-error" : undefined}
        placeholder={t("passwordPlaceholder")}
        style={inputStyle}
      />

      <div style={{ textAlign: "right", marginTop: "0.375rem" }}>
        <Link href="/forgot-password" style={linkStyle}>
          {t("forgotPassword")}
        </Link>
      </div>

      <button type="submit" disabled={loading} style={buttonStyle(loading)}>
        {loading ? t("signingIn") : t("signIn")}
      </button>

      <div style={dividerStyle}>
        <span style={dividerLineStyle} />
        <span style={dividerTextStyle}>{t("orContinueWith")}</span>
        <span style={dividerLineStyle} />
      </div>

      <button
        type="button"
        onClick={() => signInWithGoogle()}
        style={googleButtonStyle}
      >
        <GoogleIcon />
        {t("signInWithGoogle")}
      </button>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          disabled
          style={{
            ...appleButtonStyle,
            opacity: 0.5,
            cursor: "not-allowed",
            pointerEvents: "none" as const,
          }}
        >
          <AppleIcon />
          {t("signInWithApple")}
        </button>
        <span
          style={{
            display: "block",
            textAlign: "center",
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.muted,
            marginTop: "0.25rem",
            fontStyle: "italic",
          }}
        >
          {t("comingSoon")}
        </span>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: T.color.muted,
          marginTop: "1.25rem",
          marginBottom: 0,
        }}
      >
        {t("noAccount")}{" "}
        <Link href="/register" style={{ ...linkStyle, fontWeight: 600 }}>
          {t("createOne")}
        </Link>
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.6875rem",
          color: T.color.muted,
          marginTop: "1rem",
          marginBottom: 0,
        }}
      >
        <Link href="/privacy" style={{ color: T.color.muted, textDecoration: "none" }}>
          {tc("privacyPolicy")}
        </Link>
        {" \u00B7 "}
        <Link href="/terms" style={{ color: T.color.muted, textDecoration: "none" }}>
          {tc("termsOfService")}
        </Link>
      </p>
    </form>
  );
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
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

const linkStyle: React.CSSProperties = {
  color: T.color.terracotta,
  textDecoration: "none",
  fontSize: "0.8125rem",
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
