"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth/actions";
import { signInWithGoogle, signInWithApple } from "@/lib/auth/social-login";
import { T } from "@/lib/theme";

export default function RegisterPage() {
  return <Suspense><RegisterContent /></Suspense>;
}

function RegisterContent() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (redirect) formData.set("redirect", redirect);
    const result = await signUp(formData);
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: 24,
            fontWeight: 400,
            color: T.color.charcoal,
            margin: "0 0 12px",
          }}
        >
          Check your email
        </h2>
        <p style={{ fontSize: 14, color: T.color.muted, lineHeight: 1.6 }}>
          We&apos;ve sent a confirmation link to your email address. Click the
          link to activate your Memory Palace.
          {redirect && (
            <span style={{ display: "block", marginTop: 8, color: T.color.terracotta }}>
              After confirming, you&apos;ll be taken to the shared room.
            </span>
          )}
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
          Back to sign in
        </Link>
      </div>
    );
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
          Build Your Palace
        </h1>
        <p style={{ fontSize: 14, color: T.color.muted, marginTop: 6 }}>
          Create an account to start preserving memories
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

      <label style={labelStyle}>Name</label>
      <input
        name="displayName"
        type="text"
        placeholder="Your name"
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 14 }}>Email</label>
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
        placeholder="At least 6 characters"
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 14 }}>Confirm password</label>
      <input
        name="confirmPassword"
        type="password"
        required
        placeholder="Repeat your password"
        style={inputStyle}
      />

      <button type="submit" disabled={loading} style={buttonStyle(loading)}>
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <div style={dividerStyle}>
        <span style={dividerLineStyle} />
        <span style={dividerTextStyle}>or sign up with</span>
        <span style={dividerLineStyle} />
      </div>

      <button
        type="button"
        onClick={() => signInWithGoogle()}
        style={googleButtonStyle}
      >
        <GoogleIcon />
        Sign up with Google
      </button>

      <button
        type="button"
        onClick={() => signInWithApple()}
        style={appleButtonStyle}
      >
        <AppleIcon />
        Sign up with Apple
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
        Already have an account?{" "}
        <Link
          href="/login"
          style={{ color: T.color.terracotta, textDecoration: "none", fontWeight: 600 }}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  fontSize: 11,
  color: "#9A9183",
  letterSpacing: ".5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 10,
  border: "1.5px solid #D4C5B2",
  background: "#FFFFFF",
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  fontSize: 14,
  color: "#2C2C2A",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const buttonStyle = (loading: boolean): React.CSSProperties => ({
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: loading
    ? "#D4C5B240"
    : "linear-gradient(135deg, #C17F59, #8B7355)",
  color: loading ? "#9A9183" : "#FFFFFF",
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  fontSize: 15,
  fontWeight: 600,
  cursor: loading ? "default" : "pointer",
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
