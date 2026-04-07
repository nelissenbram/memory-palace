"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_settings_tour_seen_v1";

const FEATURES = [
  { iconKey: "profile", titleKey: "feat_profile_title", descKey: "feat_profile_desc" },
  { iconKey: "family", titleKey: "feat_family_title", descKey: "feat_family_desc" },
  { iconKey: "subscription", titleKey: "feat_subscription_title", descKey: "feat_subscription_desc" },
  { iconKey: "connections", titleKey: "feat_connections_title", descKey: "feat_connections_desc" },
  { iconKey: "notifications", titleKey: "feat_notifications_title", descKey: "feat_notifications_desc" },
  { iconKey: "legacy", titleKey: "feat_legacy_title", descKey: "feat_legacy_desc" },
  { iconKey: "security", titleKey: "feat_security_title", descKey: "feat_security_desc" },
  { iconKey: "cookies", titleKey: "feat_cookies_title", descKey: "feat_cookies_desc" },
] as const;

function FeatIcon({ name, size = 18 }: { name: string; size?: number }) {
  const s = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "profile":
      return (<svg {...s}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
    case "family":
      return (<svg {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>);
    case "subscription":
      return (<svg {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
    case "connections":
      return (<svg {...s}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>);
    case "notifications":
      return (<svg {...s}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>);
    case "legacy":
      return (<svg {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);
    case "security":
      return (<svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
    case "cookies":
      return (<svg {...s}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="8.5" r="0.75" fill="currentColor" stroke="none" /><circle cx="10.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" /></svg>);
    case "help":
      return (<svg {...s}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
    default:
      return null;
  }
}

export function SettingsHelpButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation("settingsTour");
  return (
    <button
      onClick={onClick}
      aria-label={t("helpAria")}
      title={t("help")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "2.75rem",
        height: "2.75rem",
        minWidth: "2.75rem",
        borderRadius: "1.375rem",
        border: `1px solid ${T.color.cream}`,
        background: T.color.white,
        color: T.color.walnut,
        cursor: "pointer",
        boxShadow: "0 0.125rem 0.5rem rgba(44,44,42,.06)",
        flexShrink: 0,
      }}
    >
      <FeatIcon name="help" size={18} />
    </button>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("settingsTour");
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const totalSteps = 2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("step1Title")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(20, 16, 10, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: step === 0 ? "flex-start" : "center",
        padding: "calc(1rem + env(safe-area-inset-top, 0px)) 1rem calc(1rem + env(safe-area-inset-bottom, 0px))",
        animation: "mpSettingsTourFade .25s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {step === 0 && (
        <>
          {/* Arrow pointing up to tab bar */}
          <div
            aria-hidden="true"
            style={{
              marginTop: isMobile ? "3.25rem" : "4.5rem",
              width: 0,
              height: 0,
              borderLeft: "0.75rem solid transparent",
              borderRight: "0.75rem solid transparent",
              borderBottom: `0.875rem solid ${T.color.white}`,
              filter: "drop-shadow(0 -2px 4px rgba(0,0,0,.15))",
            }}
          />
          <div
            style={{
              maxWidth: "26rem",
              width: "100%",
              background: T.color.white,
              borderRadius: "1.125rem",
              padding: "1.25rem 1.25rem 1rem",
              boxShadow: "0 1.25rem 3rem rgba(0,0,0,.2)",
              border: `1px solid ${T.color.cream}`,
            }}
          >
            <h3
              style={{
                fontFamily: T.font.display,
                fontSize: "1.25rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: "0 0 0.5rem",
              }}
            >
              {t("step1Title")}
            </h3>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                lineHeight: 1.55,
                color: T.color.muted,
                margin: "0 0 1rem",
              }}
            >
              {t("step1Body")}
            </p>
            <TourControls
              step={step}
              total={totalSteps}
              onSkip={onClose}
              onNext={() => setStep(1)}
              t={t}
            />
          </div>
        </>
      )}

      {step === 1 && (
        <div
          style={{
            maxWidth: "32rem",
            width: "100%",
            maxHeight: "85vh",
            overflowY: "auto",
            background: T.color.white,
            borderRadius: "1.25rem",
            padding: "1.5rem 1.25rem 1.25rem",
            boxShadow: "0 1.25rem 3rem rgba(0,0,0,.25)",
            border: `1px solid ${T.color.cream}`,
          }}
        >
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: "1.375rem",
              fontWeight: 600,
              color: T.color.charcoal,
              margin: "0 0 0.375rem",
            }}
          >
            {t("step2Title")}
          </h3>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              color: T.color.muted,
              margin: "0 0 1rem",
            }}
          >
            {t("step2Body")}
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            {FEATURES.map((f) => (
              <li
                key={f.iconKey}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 0.875rem",
                  borderRadius: "0.75rem",
                  background: `${T.color.warmStone}80`,
                  border: `1px solid ${T.color.cream}`,
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "0.5rem",
                    background: `${T.color.terracotta}15`,
                    color: T.color.terracotta,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FeatIcon name={f.iconKey} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      marginBottom: "0.125rem",
                    }}
                  >
                    {t(f.titleKey)}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      lineHeight: 1.45,
                      color: T.color.muted,
                    }}
                  >
                    {t(f.descKey)}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <TourControls
            step={step}
            total={totalSteps}
            onSkip={onClose}
            onNext={onClose}
            t={t}
            lastStep
          />
        </div>
      )}

      <style>{`@keyframes mpSettingsTourFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

function TourControls({
  step,
  total,
  onSkip,
  onNext,
  t,
  lastStep = false,
}: {
  step: number;
  total: number;
  onSkip: () => void;
  onNext: () => void;
  t: (k: string) => string;
  lastStep?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
      <button
        onClick={onSkip}
        style={{
          background: "transparent",
          border: "none",
          color: T.color.muted,
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          cursor: "pointer",
          minHeight: "2.75rem",
          padding: "0.5rem 0.75rem",
        }}
      >
        {t("skip")}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? "1.125rem" : "0.375rem",
                height: "0.375rem",
                borderRadius: "0.1875rem",
                background: i === step ? T.color.terracotta : `${T.color.terracotta}30`,
                transition: "all .2s",
              }}
            />
          ))}
        </div>
        <button
          onClick={onNext}
          style={{
            background: T.color.terracotta,
            color: T.color.white,
            border: "none",
            borderRadius: "0.625rem",
            padding: "0.625rem 1.125rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            minHeight: "2.75rem",
          }}
        >
          {lastStep ? t("done") : t("next")}
        </button>
      </div>
    </div>
  );
}

/** Hook helper: returns [open, setOpen] and auto-opens on first visit. */
export function useSettingsTutorial(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      /* ignore */
    }
  }, []);
  return [open, setOpen];
}
