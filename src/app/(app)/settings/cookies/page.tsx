"use client";

import React, { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

const F = T.font;
const C = T.color;

/* ─── Icons ─── */

function CookieIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill={C.walnut} opacity="0.1" stroke={C.walnut} strokeWidth="1.5" />
      <circle cx="12" cy="13" r="1.5" fill={C.walnut} />
      <circle cx="18" cy="11" r="1" fill={C.walnut} />
      <circle cx="14" cy="19" r="1.2" fill={C.walnut} />
      <circle cx="20" cy="17" r="1.5" fill={C.walnut} />
      <circle cx="10" cy="17" r="0.8" fill={C.walnut} />
    </svg>
  );
}

function EssentialIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 3L5 8v7c0 7.5 4.7 13.5 11 16 6.3-2.5 11-8.5 11-16V8L16 3z" fill={C.sage} opacity="0.12" stroke={C.sage} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 16l3.5 3.5L21.5 12" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function PreferencesIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill={C.terracotta} opacity="0.1" stroke={C.terracotta} strokeWidth="1.5" />
      <path d="M10 12h12M10 16h12M10 20h12" stroke={C.terracotta} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14" cy="12" r="1.5" fill={C.terracotta} />
      <circle cx="20" cy="16" r="1.5" fill={C.terracotta} />
      <circle cx="16" cy="20" r="1.5" fill={C.terracotta} />
    </svg>
  );
}

function AnalyticsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="22" height="22" rx="3" fill={C.walnut} opacity="0.08" stroke={C.walnut} strokeWidth="1.5" />
      <rect x="9" y="16" width="3" height="7" rx="0.75" fill={C.walnut} opacity="0.4" />
      <rect x="14.5" y="12" width="3" height="11" rx="0.75" fill={C.walnut} opacity="0.6" />
      <rect x="20" y="9" width="3" height="14" rx="0.75" fill={C.walnut} opacity="0.8" />
    </svg>
  );
}

/* ─── Toggle component ─── */

function Toggle({
  checked,
  disabled,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      aria-label={ariaLabel}
      aria-checked={checked}
      role="switch"
      disabled={disabled}
      style={{
        flexShrink: 0,
        width: "3rem",
        height: "1.625rem",
        borderRadius: "0.8125rem",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? C.sage : C.sandstone,
        position: "relative",
        transition: "background 0.2s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "50%",
        background: C.white,
        position: "absolute",
        top: "0.1875rem",
        left: checked ? "1.5625rem" : "0.1875rem",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  );
}

/* ─── Category card ─── */

type CookieCategory = {
  IconComponent: React.FC<{ size?: number }>;
  titleKey: string;
  descriptionKey: string;
  alwaysOn?: boolean;
  storageKey?: string;
};

const CATEGORIES: CookieCategory[] = [
  {
    IconComponent: EssentialIcon,
    titleKey: "essentialTitle",
    descriptionKey: "essentialDescription",
    alwaysOn: true,
  },
  {
    IconComponent: PreferencesIcon,
    titleKey: "preferencesTitle",
    descriptionKey: "preferencesDescription",
    storageKey: "mp-cookie-consent",
  },
  {
    IconComponent: AnalyticsIcon,
    titleKey: "analyticsTitle",
    descriptionKey: "analyticsDescription",
    storageKey: "mp-cookie-analytics",
  },
];

export default function CookieSettingsPage() {
  const { t } = useTranslation("cookieSettings");
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const state: Record<string, boolean> = {};
      for (const cat of CATEGORIES) {
        if (cat.storageKey) {
          state[cat.storageKey] = localStorage.getItem(cat.storageKey) === "1";
        }
      }
      setConsents(state);
    } catch {
      /* private browsing */
    }
    setLoaded(true);
  }, []);

  const handleToggle = (storageKey: string) => {
    const newValue = !consents[storageKey];
    setConsents((prev) => ({ ...prev, [storageKey]: newValue }));
    try {
      if (newValue) {
        localStorage.setItem(storageKey, "1");
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      /* private browsing */
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{
          fontFamily: F.display, fontSize: "1.75rem", fontWeight: 500,
          color: C.charcoal, margin: "0 0 0.5rem",
        }}>
          {t("pageTitle")}
        </h2>
        <p style={{
          fontFamily: F.body, fontSize: "0.9375rem", color: C.muted,
          margin: 0, lineHeight: 1.5, maxWidth: "37.5rem",
        }}>
          {t("pageDescription")}
        </p>
      </div>

      {/* Explanation card */}
      <div style={{
        background: C.white,
        borderRadius: "1rem",
        border: `1px solid ${C.cream}`,
        padding: "1.5rem 1.75rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1rem",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          marginBottom: "1rem",
        }}>
          <CookieIcon size={24} />
          <h3 style={{
            fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
            color: C.charcoal, margin: 0,
          }}>
            {t("whatAreCookiesTitle")}
          </h3>
        </div>
        <p style={{
          fontFamily: F.body, fontSize: "0.8125rem",
          color: C.walnut, lineHeight: 1.6, margin: 0,
        }}>
          {t("whatAreCookiesBody")}
        </p>
      </div>

      {/* Category cards */}
      {CATEGORIES.map((cat, i) => {
        const isOn = cat.alwaysOn || (cat.storageKey ? consents[cat.storageKey] ?? false : false);
        return (
          <div key={i} style={{
            background: C.white,
            borderRadius: "1rem",
            border: `1px solid ${C.cream}`,
            padding: "1.5rem 1.75rem",
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
            marginBottom: "1rem",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              marginBottom: "1rem",
            }}>
              <cat.IconComponent size={24} />
              <h3 style={{
                fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500,
                color: C.charcoal, margin: 0, flex: 1,
              }}>
                {t(cat.titleKey)}
              </h3>
              {loaded && (
                <Toggle
                  checked={isOn}
                  disabled={cat.alwaysOn}
                  onToggle={cat.storageKey ? () => handleToggle(cat.storageKey!) : undefined}
                  ariaLabel={cat.alwaysOn ? t("alwaysOnLabel") : t("toggleLabel", { category: t(cat.titleKey) })}
                />
              )}
            </div>
            <p style={{
              fontFamily: F.body, fontSize: "0.8125rem",
              color: C.walnut, lineHeight: 1.6, margin: 0,
              padding: "0.875rem 1rem",
              borderRadius: "0.625rem",
              background: C.linen,
              border: `1px solid ${C.cream}`,
            }}>
              {t(cat.descriptionKey)}
            </p>
            {cat.alwaysOn && (
              <p style={{
                fontFamily: F.body, fontSize: "0.75rem",
                color: C.muted, lineHeight: 1.5,
                margin: "0.75rem 0 0", fontStyle: "italic",
              }}>
                {t("alwaysOnNote")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
