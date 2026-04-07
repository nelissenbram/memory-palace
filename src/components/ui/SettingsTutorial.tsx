"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_settings_tour_seen_v2";

// Global store so any component (e.g. NavigationBar help button) can trigger
// the settings tour without relying on event listener timing.
interface SettingsTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const useSettingsTourStore = create<SettingsTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

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
      return (<svg {...s} style={{ pointerEvents: "none" }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
    case "family":
      return (<svg {...s} style={{ pointerEvents: "none" }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>);
    case "subscription":
      return (<svg {...s} style={{ pointerEvents: "none" }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
    case "connections":
      return (<svg {...s} style={{ pointerEvents: "none" }}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>);
    case "notifications":
      return (<svg {...s} style={{ pointerEvents: "none" }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>);
    case "legacy":
      return (<svg {...s} style={{ pointerEvents: "none" }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);
    case "security":
      return (<svg {...s} style={{ pointerEvents: "none" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
    case "cookies":
      return (<svg {...s} style={{ pointerEvents: "none" }}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="8.5" r="0.75" fill="currentColor" stroke="none" /><circle cx="10.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" /></svg>);
    case "help":
      return (<svg {...s} style={{ pointerEvents: "none" }}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
    default:
      return null;
  }
}

export function SettingsHelpButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation("settingsTour");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("helpAria")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        height: "2.75rem",
        minHeight: "2.75rem",
        padding: "0 1rem",
        borderRadius: "1.375rem",
        border: `1px solid ${T.color.terracotta}40`,
        background: `${T.color.terracotta}10`,
        color: T.color.terracotta,
        cursor: "pointer",
        fontFamily: T.font.body,
        fontSize: "0.875rem",
        fontWeight: 600,
        boxShadow: "0 0.125rem 0.5rem rgba(193,127,89,.12)",
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <FeatIcon name="help" size={18} />
      <span>{t("help")}</span>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const totalSteps = 2;

  // Match the Atrium/Library nudge overview card style
  const cardBg = "rgba(42,34,24,0.94)";
  const cardBorder = "rgba(212,175,55,0.25)";
  const cardShadow = "0 1rem 3rem rgba(0,0,0,0.4)";
  const goldLight = (T.color as Record<string, string>).goldLight || "#E8C870";

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("step1Title")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes mpNudgeCardIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <div
        style={{
          width: isMobile ? "calc(100vw - 2rem)" : "22rem",
          maxWidth: "24rem",
          maxHeight: "calc(100dvh - 4rem)",
          overflowY: "auto",
          animation: "mpNudgeCardIn .3s ease both",
        }}
      >
        <div
          style={{
            background: cardBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "1rem",
            padding: "1.25rem 1.25rem 1rem",
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {step === 0 ? (
            <>
              <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: goldLight, letterSpacing: "0.02em" }}>
                {t("step1Title")}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "rgba(250,250,247,0.88)", lineHeight: 1.6 }}>
                {t("step1Body")}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: goldLight, letterSpacing: "0.02em" }}>
                {t("step2Title")}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "rgba(250,250,247,0.88)", lineHeight: 1.6 }}>
                {t("step2Body")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.125rem" }}>
                {FEATURES.map((f) => (
                  <div key={f.iconKey} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: "1.375rem",
                        height: "1.375rem",
                        borderRadius: "0.375rem",
                        background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                        color: "#1a1410",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "0.0625rem",
                      }}
                    >
                      <FeatIcon name={f.iconKey} size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: goldLight, lineHeight: 1.3 }}>
                        {t(f.titleKey)}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", lineHeight: 1.5, color: "rgba(250,250,247,0.75)" }}>
                        {t(f.descKey)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <TourControls
            step={step}
            total={totalSteps}
            onSkip={onClose}
            onNext={step === 0 ? () => setStep(1) : onClose}
            t={t}
            lastStep={step === totalSteps - 1}
            goldLight={goldLight}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function TourControls({
  step,
  total,
  onSkip,
  onNext,
  t,
  lastStep = false,
  goldLight,
}: {
  step: number;
  total: number;
  onSkip: () => void;
  onNext: () => void;
  t: (k: string) => string;
  lastStep?: boolean;
  goldLight: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.125rem", gap: "0.75rem" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSkip(); }}
        style={{
          fontFamily: T.font.body,
          fontSize: "0.625rem",
          fontWeight: 400,
          color: "rgba(250,250,247,0.45)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.125rem 0.25rem",
          letterSpacing: "0.03em",
        }}
      >
        {t("skip")}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? "1rem" : "0.375rem",
                height: "0.25rem",
                borderRadius: "0.125rem",
                background: i === step ? goldLight : "rgba(232,200,112,0.25)",
                transition: "all .2s",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#FFF",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.4375rem 1.125rem",
            cursor: "pointer",
            transition: "all .2s",
            letterSpacing: "0.02em",
          }}
        >
          {lastStep ? t("done") : t("next")}
        </button>
      </div>
    </div>
  );
}

/** Hook helper: returns [open, setOpen] and auto-opens on first visit
 *  or when the URL contains ?tour=1 (which also resets the "seen" flag).
 */
export function useSettingsTutorial(): [boolean, (v: boolean) => void] {
  const open = useSettingsTourStore((s) => s.open);
  const setOpen = useSettingsTourStore((s) => s.setOpen);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "1") {
        window.localStorage.removeItem(STORAGE_KEY);
        setOpen(true);
        window.localStorage.setItem(STORAGE_KEY, "1");
        return;
      }
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      /* ignore */
    }
  }, [setOpen]);
  return [open, setOpen];
}
