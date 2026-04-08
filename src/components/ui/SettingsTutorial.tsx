"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_settings_tour_seen_v2";

interface SettingsTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const useSettingsTourStore = create<SettingsTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

const FEATURE_KEYS = [
  { titleKey: "feat_profile_title", descKey: "feat_profile_desc" },
  { titleKey: "feat_family_title", descKey: "feat_family_desc" },
  { titleKey: "feat_subscription_title", descKey: "feat_subscription_desc" },
  { titleKey: "feat_connections_title", descKey: "feat_connections_desc" },
  { titleKey: "feat_notifications_title", descKey: "feat_notifications_desc" },
  { titleKey: "feat_legacy_title", descKey: "feat_legacy_desc" },
  { titleKey: "feat_security_title", descKey: "feat_security_desc" },
  { titleKey: "feat_cookies_title", descKey: "feat_cookies_desc" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("settingsTour");
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<DOMRect | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Measure the tab bar for step 0
  useLayoutEffect(() => {
    if (!open || step !== 0) { setTargetBox(null); return; }
    const measure = () => {
      const el = document.querySelector("[data-mp-settings-tabs]") as HTMLElement | null;
      if (el) setTargetBox(el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  if (!mounted || !open) return null;

  const totalSteps = 2;
  const cardBg = "rgba(42,34,24,0.94)";
  const cardBorder = "rgba(212,175,55,0.25)";
  const cardShadow = "0 1rem 3rem rgba(0,0,0,0.4)";
  const goldLight = (T.color as Record<string, string>).goldLight || "#E8C870";

  // ── Step 0: highlight top tab bar with small dark tooltip ──
  if (step === 0) {
    const pad = 6;
    const r = 12;
    const t_ = targetBox ? targetBox.top - pad : 0;
    const l_ = targetBox ? targetBox.left - pad : 0;
    const w_ = targetBox ? targetBox.width + pad * 2 : 0;
    const h_ = targetBox ? targetBox.height + pad * 2 : 0;

    // Tooltip position: below the highlighted bar
    const tipWidth = isMobile ? Math.min(window.innerWidth - 32, 320) : 280;
    const tipTop = targetBox ? t_ + h_ + 12 : 80;
    const tipLeft = targetBox
      ? Math.max(16, Math.min(window.innerWidth - tipWidth - 16, l_ + w_ / 2 - tipWidth / 2))
      : 16;

    const overlay = (
      <div role="dialog" aria-modal="true" aria-label={t("step1Title")} style={{ position: "fixed", inset: 0, zIndex: 2147483000 }}>
        <style>{`
          @keyframes mpTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
          @keyframes mpPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
        `}</style>
        {targetBox && (
          <>
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} onClick={onClose}>
              <defs>
                <mask id="mp-settings-cutout">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x={l_} y={t_} width={w_} height={h_} rx={r} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#mp-settings-cutout)" />
            </svg>
            <div style={{
              position: "absolute", top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${r}px`, border: `2px solid ${goldLight}70`,
              animation: "mpPulse 2s ease-in-out infinite", pointerEvents: "none",
            }} />
          </>
        )}
        <div style={{
          position: "absolute", top: tipTop, left: tipLeft, width: tipWidth,
          animation: "mpTipIn .3s ease both",
        }}>
          <div style={{
            background: cardBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: "0.875rem", padding: "0.875rem 1rem",
            border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
            display: "flex", flexDirection: "column", gap: "0.625rem",
          }}>
            <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: goldLight, letterSpacing: "0.02em" }}>
              {t("step1Title")}
            </div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "rgba(250,250,247,0.88)", lineHeight: 1.5 }}>
              {t("step1Body")}
            </div>
            <TourControls step={0} total={totalSteps} onSkip={onClose} onNext={() => setStep(1)} t={t} goldLight={goldLight} />
          </div>
        </div>
      </div>
    );
    return createPortal(overlay, document.body);
  }

  // ── Step 1: centered overview card with bullet list ──
  let items: { title: string; desc: string }[] = FEATURE_KEYS.map((f) => ({
    title: t(f.titleKey),
    desc: t(f.descKey),
  }));

  const overlay2 = (
    <div role="dialog" aria-modal="true" aria-label={t("step2Title")} style={{
      position: "fixed", inset: 0, zIndex: 2147483000,
      background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`
        @keyframes mpCardIn { from { opacity:0; transform:scale(0.95);} to { opacity:1; transform:scale(1);} }
      `}</style>
      <div style={{
        width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth: "24rem",
        maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
        animation: "mpCardIn .3s ease both",
      }}>
        <div style={{
          background: cardBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: "1rem", padding: "1.25rem 1.25rem 1rem",
          border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: goldLight, letterSpacing: "0.02em" }}>
            {t("step2Title")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4375rem" }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <div style={{
                  width: "0.375rem", height: "0.375rem", borderRadius: "50%",
                  flexShrink: 0, marginTop: "0.4375rem",
                  background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                }} />
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "rgba(250,250,247,0.88)", lineHeight: 1.5 }}>
                  <strong style={{ color: goldLight, fontWeight: 600 }}>{it.title}</strong> — {it.desc}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "rgba(250,250,247,0.5)", fontStyle: "italic", marginTop: "0.125rem" }}>
            {t("step2Body")}
          </div>
          <TourControls step={1} total={totalSteps} onSkip={onClose} onNext={onClose} t={t} lastStep goldLight={goldLight} />
        </div>
      </div>
    </div>
  );
  return createPortal(overlay2, document.body);
}

function TourControls({
  onNext, t, lastStep = false,
}: {
  step?: number; total?: number; onSkip?: () => void; onNext: () => void;
  t: (k: string) => string; lastStep?: boolean; goldLight?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: "0.125rem" }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onNext(); }} style={{
        fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: "#FFF",
        background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
        border: "none", borderRadius: "0.5rem", padding: "0.4375rem 1.125rem",
        cursor: "pointer", transition: "all .2s", letterSpacing: "0.02em",
      }}>
        {lastStep ? t("done") : t("next")}
      </button>
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
    } catch {}
  }, [setOpen]);
  return [open, setOpen];
}
