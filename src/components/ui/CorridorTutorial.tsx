"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_corridor_tour_seen_v1";

interface CorridorTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const useCorridorTourStore = create<CorridorTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

interface Props {
  open: boolean;
  onClose: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Help layer for the Wing Corridor.
 * Mobile: 2 steps (joystick → media button).
 * Desktop: 2 steps (navigation explanation → corridor media button).
 */
export default function CorridorTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("corridorTour");
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  const totalSteps = 2;

  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); return; }
    const measure = () => {
      let el: HTMLElement | null = null;
      if (isMobile) {
        if (step === 0) {
          el = document.querySelector<HTMLElement>("[data-mp-joystick]")
            || document.querySelector<HTMLElement>("[data-mp-palace-bars]");
        } else {
          el = document.querySelector<HTMLElement>("[data-mp-corridor-media]");
        }
      } else {
        // Desktop: step 0 = no target (centered navigation text), step 1 = media button
        if (step === 0) { setTargetBox(null); return; }
        el = document.querySelector<HTMLElement>("[data-mp-corridor-media]");
      }
      if (!el) { setTargetBox(null); return; }
      const r = el.getBoundingClientRect();
      setTargetBox({ top: r.top, left: r.left, width: r.width, height: r.height });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, isMobile]);

  if (!mounted || !open) return null;

  const cardBg = "rgba(42,34,24,0.92)";
  const cardBorder = "rgba(212,175,55,0.2)";
  const cardShadow = "0 0.5rem 2rem rgba(0,0,0,0.3)";
  const goldLight = (T.color as Record<string, string>).goldLight || "#E8C870";

  let titleKey: string;
  let bodyKey: string;

  if (isMobile) {
    titleKey = step === 0 ? "step1Title" : "step2Title";
    bodyKey  = step === 0 ? "step1Body"  : "step2Body";
  } else {
    titleKey = step === 0 ? "dStep1Title" : "dStep2Title";
    bodyKey  = step === 0 ? "dStep1Body"  : "dStep2Body";
  }

  const pad = 8;
  const r = 14;
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const remToPx = (rem: number) => rem * parseFloat(typeof window !== "undefined" ? getComputedStyle(document.documentElement).fontSize || "16" : "16");
  const tipWidth = remToPx(isMobile ? 16.25 : 17.5);

  let tipTop = 80;
  let tipLeft = 16;
  if (!targetBox) {
    tipTop = vh / 2 - 80;
    tipLeft = vw / 2 - tipWidth / 2;
  } else {
    const targetCenterY = t_ + h_ / 2;
    if (targetCenterY > vh / 2) {
      tipTop = Math.max(16, t_ - 180);
    } else {
      tipTop = Math.min(vh - 200, t_ + h_ + 16);
    }
    tipLeft = Math.max(16, Math.min(vw - tipWidth - 16, l_ + w_ / 2 - tipWidth / 2));
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(titleKey)}
      style={{ position: "fixed", inset: 0, zIndex: 57 }}
    >
      <style>{`
        @keyframes mpCtTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpCtPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
      `}</style>

      {targetBox ? (
        <>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
            <defs>
              <mask id="mp-corridor-cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect x={l_} y={t_} width={w_} height={h_} rx={r} fill="black" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.45)"
              mask="url(#mp-corridor-cutout)"
              onClick={onClose}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${r}px`,
              border: `2px solid ${goldLight}70`,
              animation: "mpCtPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      ) : (
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", pointerEvents: "auto" }}
          onClick={onClose}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: tipTop, left: tipLeft, width: tipWidth,
          animation: "mpCtTipIn .3s ease both",
        }}
      >
        <div
          style={{
            background: cardBg,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "0.875rem",
            padding: "0.875rem 1rem",
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
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

export function useCorridorTutorial(shouldShow: boolean): [boolean, (v: boolean) => void] {
  const open = useCorridorTourStore((s) => s.open);
  const setOpen = useCorridorTourStore((s) => s.setOpen);
  useEffect(() => {
    if (!shouldShow) return;
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("corridorTour") === "1") {
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
