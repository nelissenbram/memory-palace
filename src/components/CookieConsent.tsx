"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { initAnalytics, optOutAnalytics } from "@/lib/analytics";
import { identifyCurrentUser } from "@/components/PostHogProvider";

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
          bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
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
      localStorage.setItem("mp-cookie-analytics", "1");
    } catch { /* noop */ }
    setConsent("accepted");
    // Only now start analytics — never before this explicit opt-in. If the user
    // is already signed in, identify them right away (the app-shell identify in
    // PostHogProvider already ran as a no-op before consent existed).
    initAnalytics().then(() => { void identifyCurrentUser(); });
  }

  function handleReject() {
    try {
      localStorage.setItem(STORAGE_KEY, "rejected");
      localStorage.setItem("mp-cookie-analytics", "0");
    } catch { /* noop */ }
    setConsent("rejected");
    optOutAnalytics();
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
        left: "1rem",
        right: "1rem",
        zIndex: 9997,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: "46rem",
          background: C.cream,
          border: `1px solid ${C.sandstone}66`,
          borderRadius: "1rem",
          boxShadow: "0 0.75rem 2.5rem rgba(44,44,42,0.16), 0 0.125rem 0.5rem rgba(44,44,42,0.06)",
          padding: showManage ? "1.5rem 1.5rem 1.25rem" : "1rem 1.25rem",
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
                fontFamily: F.body,
                fontSize: "0.875rem",
                color: C.inkSoft,
                lineHeight: 1.5,
                margin: 0,
                flex: "1 1 20rem",
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
            <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowManage(true)}
                style={{
                  fontFamily: F.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: C.walnut,
                  background: "transparent",
                  border: "none",
                  borderRadius: "0.625rem",
                  padding: "0.5rem 0.75rem",
                  minHeight: "2.75rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "0.1875rem",
                  transition: "color 0.2s",
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
                  color: C.charcoal,
                  background: "transparent",
                  border: `1px solid ${C.sandstone}`,
                  borderRadius: "0.625rem",
                  padding: "0.5rem 1.25rem",
                  minHeight: "2.75rem",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
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
                  borderRadius: "0.625rem",
                  padding: "0.5rem 1.25rem",
                  minHeight: "2.75rem",
                  cursor: "pointer",
                  boxShadow: "0 0.125rem 0.5rem rgba(198,107,61,0.2)",
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
                fontSize: "1.25rem",
                fontWeight: 500,
                color: C.charcoal,
                margin: "0 0 1rem",
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
                borderBottom: `1px solid ${C.lineFaint}`,
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: F.body,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: C.charcoal,
                    margin: "0 0 0.125rem",
                  }}
                >
                  {t("essentialTitle")}
                </p>
                <p style={{ fontFamily: F.body, fontSize: "0.75rem", color: C.muted, margin: 0 }}>
                  {t("essentialDesc")}
                </p>
              </div>
              <span
                style={{
                  fontFamily: F.body,
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
                    fontFamily: F.body,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: C.charcoal,
                    margin: "0 0 0.125rem",
                  }}
                >
                  {t("preferenceTitle")}
                </p>
                <p style={{ fontFamily: F.body, fontSize: "0.75rem", color: C.muted, margin: 0 }}>
                  {t("preferenceDesc")}
                </p>
              </div>
              <span
                style={{
                  fontFamily: F.body,
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
                flexWrap: "wrap",
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
                  color: C.charcoal,
                  background: "transparent",
                  border: `1px solid ${C.sandstone}`,
                  borderRadius: "0.625rem",
                  padding: "0.5rem 1.25rem",
                  minHeight: "2.75rem",
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
                  borderRadius: "0.625rem",
                  padding: "0.5rem 1.25rem",
                  minHeight: "2.75rem",
                  cursor: "pointer",
                  boxShadow: "0 0.125rem 0.5rem rgba(198,107,61,0.2)",
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
