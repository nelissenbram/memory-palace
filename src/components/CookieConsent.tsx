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
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

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

  if (consent !== "undecided") return null;

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch { /* noop */ }
    setConsent("accepted");
  }

  function handleSavePreferences() {
    const value = analyticsEnabled ? "accepted" : "rejected";
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch { /* noop */ }
    setConsent(value);
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
        padding: "0 clamp(16px, 4vw, 40px)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: showManage ? "20px 0 24px" : "16px 0",
        }}
      >
        {!showManage ? (
          /* ─── Compact banner ─── */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: C.cream,
                lineHeight: 1.5,
                margin: 0,
                flex: "1 1 400px",
              }}
            >
              {t("message")}{" "}
              <Link
                href="/privacy"
                style={{
                  color: C.terracotta,
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                {t("privacyPolicy")}
              </Link>
            </p>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => setShowManage(true)}
                style={{
                  fontFamily: F.body,
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.cream,
                  background: "transparent",
                  border: `1px solid ${C.sandstone}60`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                {t("manage")}
              </button>
              <button
                onClick={handleAccept}
                style={{
                  fontFamily: F.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.white,
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
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
                fontSize: 18,
                fontWeight: 500,
                color: C.linen,
                marginBottom: 16,
              }}
            >
              {t("preferences")}
            </h3>

            {/* Essential */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: `1px solid ${C.sandstone}20`,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.cream,
                    margin: "0 0 2px",
                  }}
                >
                  {t("essentialCookies")}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  {t("essentialDescription")}
                </p>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontStyle: "italic",
                }}
              >
                {t("alwaysOn")}
              </span>
            </div>

            {/* Analytics */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.cream,
                    margin: "0 0 2px",
                  }}
                >
                  {t("analyticsCookies")}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  {t("analyticsDescription")}
                </p>
              </div>
              <button
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  background: analyticsEnabled ? C.sage : `${C.sandstone}60`,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
                aria-label={analyticsEnabled ? t("analyticsEnabled") : t("analyticsDisabled")}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: C.white,
                    position: "absolute",
                    top: 3,
                    left: analyticsEnabled ? 23 : 3,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setShowManage(false)}
                style={{
                  fontFamily: F.body,
                  fontSize: 13,
                  color: C.muted,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 12px",
                }}
              >
                {t("back")}
              </button>
              <button
                onClick={handleSavePreferences}
                style={{
                  fontFamily: F.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.white,
                  background: `linear-gradient(135deg, ${C.terracotta}, ${C.walnut})`,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  cursor: "pointer",
                }}
              >
                {t("savePreferences")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
