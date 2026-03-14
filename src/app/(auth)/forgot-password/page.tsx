"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth/actions";
import { T } from "@/lib/theme";

export default function ForgotPasswordPage() {
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
          Check your email
        </h2>
        <p style={{ fontSize: 14, color: T.color.muted, lineHeight: 1.6 }}>
          If an account exists with that email, we&apos;ve sent a password reset
          link.
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
          Reset Password
        </h1>
        <p style={{ fontSize: 14, color: T.color.muted, marginTop: 6 }}>
          Enter your email and we&apos;ll send a reset link
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
        Email
      </label>
      <input
        name="email"
        type="email"
        required
        placeholder="you@example.com"
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
        {loading ? "Sending..." : "Send Reset Link"}
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
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
