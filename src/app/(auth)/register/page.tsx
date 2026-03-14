"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { T } from "@/lib/theme";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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
