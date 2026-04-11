"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_palace_tour_seen_v1";

interface PalaceTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const usePalaceTourStore = create<PalaceTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

interface Props {
  open: boolean;
  onClose: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Help layer for the mobile Palace exterior view.
 * Three steps, analogous to SettingsTutorial:
 *   0 — highlight the three top bars (Palace / Wings / Rooms pills) → select
 *   1 — highlight the Enter button → commit navigation
 *   2 — highlight the palace visual → drag / pinch / tap on wing or entrance
 */
export default function PalaceExteriorTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("palaceTour");
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Measure target(s) for each step
  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); return; }
    const measure = () => {
      if (step === 0) {
        // Union of the three bars
        const bars = Array.from(document.querySelectorAll<HTMLElement>("[data-mp-palace-bars]"));
        if (bars.length === 0) { setTargetBox(null); return; }
        let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
        bars.forEach((b) => {
          const r = b.getBoundingClientRect();
          top = Math.min(top, r.top);
          left = Math.min(left, r.left);
          right = Math.max(right, r.right);
          bottom = Math.max(bottom, r.bottom);
        });
        setTargetBox({ top, left, width: right - left, height: bottom - top });
      } else if (step === 1) {
        const el = document.querySelector<HTMLElement>("[data-mp-palace-enter]");
        if (!el) { setTargetBox(null); return; }
        const r = el.getBoundingClientRect();
        setTargetBox({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (step === 2) {
        // Palace visual = whole viewport minus top bars and bottom nav strip
        const bars = Array.from(document.querySelectorAll<HTMLElement>("[data-mp-palace-bars]"));
        let topY = 0;
        bars.forEach((b) => { topY = Math.max(topY, b.getBoundingClientRect().bottom); });
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const padTop = topY + 12;
        const padBottom = 96; // leave room for bottom navigation
        setTargetBox({ top: padTop, left: 12, width: vw - 24, height: vh - padTop - padBottom });
      }
    };
    measure();
    const id = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  if (!mounted || !open) return null;

  const totalSteps = 3;
  const cardBg = "rgba(42,34,24,0.94)";
  const cardBorder = "rgba(212,175,55,0.28)";
  const cardShadow = "0 1rem 3rem rgba(0,0,0,0.45)";
  const goldLight = (T.color as Record<string, string>).goldLight || "#E8C870";

  const titleKey = step === 0 ? "step1Title" : step === 1 ? "step2Title" : "step3Title";
  const bodyKey  = step === 0 ? "step1Body"  : step === 1 ? "step2Body"  : "step3Body";

  // ── Highlight rect geometry ──
  const pad = 6;
  const r = step === 2 ? 16 : 12;
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  // Tooltip placement:
  //   step 0 → below bars
  //   step 1 → to the left of the Enter button
  //   step 2 → centered over the highlighted area
  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const tipWidth = Math.min(vw - 32, isMobile ? 320 : 360);

  let tipTop = 80;
  let tipLeft = 16;
  if (targetBox) {
    if (step === 0) {
      tipTop = Math.min(vh - 200, t_ + h_ + 12);
      tipLeft = Math.max(16, Math.min(vw - tipWidth - 16, l_ + w_ / 2 - tipWidth / 2));
    } else if (step === 1) {
      tipTop = Math.min(vh - 200, t_ + h_ / 2 - 60);
      tipLeft = Math.max(16, l_ - tipWidth - 12);
    } else {
      tipTop = Math.min(vh - 220, t_ + h_ / 2 - 80);
      tipLeft = Math.max(16, Math.min(vw - tipWidth - 16, l_ + w_ / 2 - tipWidth / 2));
    }
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(titleKey)}
      style={{ position: "fixed", inset: 0, zIndex: 2147483000 }}
    >
      <style>{`
        @keyframes mpPtTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpPtPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.45);} 50% { box-shadow:0 0 0 0.625rem rgba(212,175,55,0);} }
      `}</style>

      {targetBox && (
        <>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
            <defs>
              <mask id="mp-palace-cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect x={l_} y={t_} width={w_} height={h_} rx={r} fill="black" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#mp-palace-cutout)"
              onClick={onClose}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${r}px`,
              border: `0.125rem solid ${goldLight}aa`,
              animation: "mpPtPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      )}

      <div
        style={{
          position: "absolute",
          top: tipTop, left: tipLeft, width: tipWidth,
          animation: "mpPtTipIn .3s ease both",
        }}
      >
        <div
          style={{
            background: cardBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "0.875rem",
            padding: "0.875rem 1rem",
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
          }}
        >
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: goldLight,
              letterSpacing: "0.02em",
            }}
          >
            {t(titleKey)}
          </div>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: "rgba(250,250,247,0.88)",
              lineHeight: 1.5,
            }}
          >
            {t(bodyKey)}
          </div>

          {/* Step dots + controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.125rem" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                color: "rgba(250,250,247,0.55)",
                background: "transparent", border: "none",
                padding: "0.4375rem 0.5rem",
                cursor: "pointer", letterSpacing: "0.02em",
              }}
            >
              {t("skip")}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === step ? "1rem" : "0.3125rem",
                      height: "0.3125rem",
                      borderRadius: "0.1875rem",
                      background: i === step
                        ? `linear-gradient(90deg, ${T.color.gold}, ${goldLight})`
                        : i < step
                          ? `${T.color.gold}80`
                          : "rgba(255,255,255,0.14)",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (step >= totalSteps - 1) onClose();
                  else setStep(step + 1);
                }}
                style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  color: "#FFF",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  border: "none", borderRadius: "0.5rem",
                  padding: "0.4375rem 1.125rem",
                  cursor: "pointer", letterSpacing: "0.02em",
                }}
              >
                {step >= totalSteps - 1 ? t("done") : t("next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

/**
 * Hook: auto-opens on first visit to the palace exterior, or when
 * the URL contains `?palaceTour=1` (which resets the seen flag).
 */
export function usePalaceExteriorTutorial(shouldShow: boolean): [boolean, (v: boolean) => void] {
  const open = usePalaceTourStore((s) => s.open);
  const setOpen = usePalaceTourStore((s) => s.setOpen);
  useEffect(() => {
    if (!shouldShow) return;
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("palaceTour") === "1") {
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
  }, [shouldShow, setOpen]);
  return [open, setOpen];
}
