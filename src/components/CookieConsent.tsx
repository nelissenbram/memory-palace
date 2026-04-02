"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

const F = T.font;
const C = T.color;
const STORAGE_KEY = "mp_cookie_consent";

type ConsentState = "undecided" | "accepted" | "rejected";

export default function CookieConsent() {
  const { t } = useTranslation("cookieConsent");
  const [consent, setConsent] = useState<ConsentState>("accepted"); // default to hide flash
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setConsent("undecided");
      } else {
        setConsent(stored as ConsentState);
      }
    } catch {
      setConsent("undecided");
    }
  }, []);

  // Listen for custom event to reopen preferences
  useEffect(() => {
    function handleReopen() {
      setConsent("undecided");
      setShowManage(true);
    }
    window.addEventListener("reopen-cookie-consent", handleReopen);
    return () => window.removeEventListener("reopen-cookie-consent", handleReopen);
  }, []);

  if (consent !== "undecided") {
    // Show a small "Cookie Settings" button so users can change preferences
    return (
      <button
        onClick={() => {
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
          setConsent("undecided");
          setShowManage(true);
        }}
        aria-label={t("cookieSettings")}
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          zIndex: 9998,
          background: C.linen,
          border: `1px solid ${C.sandstone}`,
          borderRadius: "0.5rem",
          padding: "0.375rem 0.75rem",
          fontFamily: F.body,
          fontSize: "0.6875rem",
          color: C.muted,
          cursor: "pointer",
          opacity: 0.7,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.25rem" }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        {t("cookieSettings")}
      </button>
    );
  }

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch { /* noop */ }
    setConsent("accepted");
  }

  function handleReject() {
    try {
      localStorage.setItem(STORAGE_KEY, "rejected");
    } catch { /* noop */ }
    setConsent("rejected");
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: C.charcoal,
        borderTop: `1px solid ${C.sandstone}30`,
        padding: "0 clamp(1rem, 4vw, 2.5rem)",
        boxShadow: "0 -0.25rem 1.5rem rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          maxWidth: "68.75rem",
          margin: "0 auto",
          padding: showManage ? "1.25rem 0 1.5rem" : "1rem 0",
        }}
      >
        {!showManage ? (
          /* ─── Compact banner ─── */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: C.cream,
                lineHeight: 1.5,
                margin: 0,
                flex: "1 1 25rem",
              }}
            >
              {t("message")}{" "}
              <Link
                href="/privacy"
                style={{
                  color: C.terracotta,
                  textDecoration: "underline",
                  textUnderlineOffset: "0.125rem",
                }}
              >
                {t("privacyPolicy")}
              </Link>
            </p>
            <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0 }}>
              <button
                onClick={() => setShowManage(true)}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: C.cream,
                  background: "transparent",
                  border: `1px solid ${C.sandstone}60`,
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                {t("manage")}
              </button>
              <button
                onClick={handleReject}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: C.white,
                  background: "transparent",
                  border: `1px solid ${C.sandstone}80`,
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1.25rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                {t("reject")}
              </button>
              <button
                onClick={handleAccept}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: C.white,
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1.25rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                {t("accept")}
              </button>
            </div>
          </div>
        ) : (
          /* ─── Expanded manage view ─── */
          <div>
            <h3
              style={{
                fontFamily: F.display,
                fontSize: "1.125rem",
                fontWeight: 500,
                color: C.linen,
                marginBottom: "1rem",
              }}
            >
              {t("preferencesTitle")}
            </h3>

            {/* Essential cookies */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 0",
                borderBottom: `1px solid ${C.sandstone}20`,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: C.cream,
                    margin: "0 0 0.125rem",
                  }}
                >
                  {t("essentialTitle")}
                </p>
                <p style={{ fontSize: "0.75rem", color: C.muted, margin: 0 }}>
                  {t("essentialDesc")}
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: C.muted,
                  fontStyle: "italic",
                }}
              >
                {t("alwaysOn")}
              </span>
            </div>

            {/* Preference cookies (locale) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 0",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: C.cream,
                    margin: "0 0 0.125rem",
                  }}
                >
                  {t("preferenceTitle")}
                </p>
                <p style={{ fontSize: "0.75rem", color: C.muted, margin: 0 }}>
                  {t("preferenceDesc")}
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: C.muted,
                  fontStyle: "italic",
                }}
              >
                {t("optionalLabel")}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.625rem",
                marginTop: "1rem",
              }}
            >
              <button
                onClick={() => setShowManage(false)}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  color: C.muted,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem 0.75rem",
                }}
              >
                {t("back")}
              </button>
              <button
                onClick={handleReject}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: C.white,
                  background: "transparent",
                  border: `1px solid ${C.sandstone}80`,
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1.25rem",
                  cursor: "pointer",
                }}
              >
                {t("rejectAll")}
              </button>
              <button
                onClick={handleAccept}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: C.white,
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1.25rem",
                  cursor: "pointer",
                }}
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
