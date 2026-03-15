"use client";

import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth/actions";
import { signInWithGoogle, signInWithApple } from "@/lib/auth/social-login";
import { createMFAChallenge, verifyMFAChallenge } from "@/lib/auth/mfa-actions";
import { T } from "@/lib/theme";

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>;
}

function LoginContent() {
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

    // If signIn succeeds it redirects, so we only get here on error
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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
      setError("Please enter all 6 digits.");
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
      setError("Invalid code. Please try again.");
      setMfaCode(["", "", "", "", "", ""]);
      mfaInputRefs.current[0]?.focus();
      setMfaLoading(false);
      return;
    }

    // MFA verified — redirect
    if (mfaRedirect && mfaRedirect.startsWith("/invite/")) {
      window.location.href = mfaRedirect;
    } else {
      window.location.href = "/palace";
    }
  }

  // ── MFA Challenge Screen ──
  if (mfaStep) {
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32,
            background: `linear-gradient(135deg, ${T.color.terracotta}20, ${T.color.walnut}20)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 32,
          }}>
            <ShieldIcon />
          </div>
          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: 28,
              fontWeight: 400,
              color: T.color.charcoal,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Verification Required
          </h1>
          <p
            style={{
              fontSize: 16,
              color: T.color.muted,
              marginTop: 10,
              lineHeight: 1.6,
              fontFamily: T.font.body,
            }}
          >
            Open your authenticator app and enter<br />
            the 6-digit code to continue.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#FDF2F2",
              border: "1px solid #FECACA",
              color: T.color.error,
              fontSize: 15,
              marginBottom: 20,
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
            gap: 10,
            marginBottom: 28,
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
              style={{
                width: 52,
                height: 64,
                textAlign: "center",
                fontSize: 26,
                fontFamily: T.font.body,
                fontWeight: 600,
                color: T.color.charcoal,
                borderRadius: 12,
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
          {mfaLoading ? "Verifying..." : "Verify Code"}
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
            margin: "14px auto 0",
            padding: 12,
            background: "none",
            border: `1px solid ${T.color.cream}`,
            borderRadius: 12,
            color: T.color.muted,
            fontFamily: T.font.body,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Back to login
        </button>
      </div>
    );
  }

  // ── Normal Login Screen ──
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
          Welcome Back
        </h1>
        <p
          style={{
            fontSize: 14,
            color: T.color.muted,
            marginTop: 6,
          }}
        >
          Sign in to your Memory Palace
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

      <label style={labelStyle}>Email</label>
      <input
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 14 }}>Password</label>
      <input
        name="password"
        type="password"
        required
        placeholder="Your password"
        style={inputStyle}
      />

      <div style={{ textAlign: "right", marginTop: 6 }}>
        <Link href="/forgot-password" style={linkStyle}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={loading} style={buttonStyle(loading)}>
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div style={dividerStyle}>
        <span style={dividerLineStyle} />
        <span style={dividerTextStyle}>or continue with</span>
        <span style={dividerLineStyle} />
      </div>

      <button
        type="button"
        onClick={() => signInWithGoogle()}
        style={googleButtonStyle}
      >
        <GoogleIcon />
        Sign in with Google
      </button>

      <button
        type="button"
        onClick={() => signInWithApple()}
        style={appleButtonStyle}
      >
        <AppleIcon />
        Sign in with Apple
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
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ ...linkStyle, fontWeight: 600 }}>
          Create one
        </Link>
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: 11,
          color: T.color.muted,
          marginTop: 16,
          marginBottom: 0,
        }}
      >
        <Link href="/privacy" style={{ color: T.color.muted, textDecoration: "none" }}>
          Privacy Policy
        </Link>
        {" \u00B7 "}
        <Link href="/terms" style={{ color: T.color.muted, textDecoration: "none" }}>
          Terms of Service
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

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: disabled
    ? `${T.color.sandstone}40`
    : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
  color: disabled ? T.color.muted : T.color.white,
  fontFamily: T.font.body,
  fontSize: 15,
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  marginTop: 20,
  transition: "all 0.2s",
});

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "24px 0 20px",
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: T.color.sandstone,
};

const dividerTextStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: 12,
  color: T.color.muted,
  whiteSpace: "nowrap",
};

const socialButtonBase: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "12px 16px",
  borderRadius: 12,
  fontFamily: T.font.body,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  transition: "all 0.2s",
};

const googleButtonStyle: React.CSSProperties = {
  ...socialButtonBase,
  background: T.color.white,
  color: "#3C4043",
  border: `1.5px solid ${T.color.sandstone}`,
  marginBottom: 10,
};

const appleButtonStyle: React.CSSProperties = {
  ...socialButtonBase,
  background: "#000000",
  color: "#FFFFFF",
  border: "1.5px solid #000000",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
    </svg>
  );
}
