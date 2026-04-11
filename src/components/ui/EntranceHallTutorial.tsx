"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_entrance_tour_seen_v1";

interface EntranceTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const useEntranceTourStore = create<EntranceTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

interface Props {
  open: boolean;
  onClose: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Help layer for the mobile Entrance Hall view.
 * Single step — spotlights the MobileJoystick as the secondary
 * manual-navigation affordance (primary being the top menu bar).
 */
export default function EntranceHallTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("entranceHallTour");
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); return; }
    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-mp-joystick]");
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
  }, [open]);

  if (!mounted || !open) return null;

  const cardBg = "rgba(42,34,24,0.94)";
  const cardBorder = "rgba(212,175,55,0.28)";
  const cardShadow = "0 1rem 3rem rgba(0,0,0,0.45)";
  const goldLight = (T.color as Record<string, string>).goldLight || "#E8C870";

  const pad = 8;
  const r = 14;
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const tipWidth = Math.min(vw - 32, isMobile ? 320 : 360);

  // Place tip above the joystick (joystick is bottom-left)
  let tipTop = 80;
  let tipLeft = 16;
  if (targetBox) {
    tipTop = Math.max(16, t_ - 180);
    tipLeft = Math.max(16, Math.min(vw - tipWidth - 16, l_ + w_ / 2 - tipWidth / 2));
    if (tipTop + 160 > vh - 16) tipTop = Math.max(16, vh - 180);
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("stepTitle")}
      style={{ position: "fixed", inset: 0, zIndex: 2147483000 }}
    >
      <style>{`
        @keyframes mpEhTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpEhPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.45);} 50% { box-shadow:0 0 0 0.625rem rgba(212,175,55,0);} }
      `}</style>

      {targetBox && (
        <>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
            <defs>
              <mask id="mp-entrance-cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect x={l_} y={t_} width={w_} height={h_} rx={r} fill="black" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#mp-entrance-cutout)"
              onClick={onClose}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${r}px`,
              border: `0.125rem solid ${goldLight}aa`,
              animation: "mpEhPulse 2s ease-in-out infinite",
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
          animation: "mpEhTipIn .3s ease both",
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
            {t("stepTitle")}
          </div>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: "rgba(250,250,247,0.88)",
              lineHeight: 1.5,
            }}
          >
            {t("stepBody")}
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
                <div
                  style={{
                    width: "1rem",
                    height: "0.3125rem",
                    borderRadius: "0.1875rem",
                    background: `linear-gradient(90deg, ${T.color.gold}, ${goldLight})`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  color: "#FFF",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  border: "none", borderRadius: "0.5rem",
                  padding: "0.4375rem 1.125rem",
                  cursor: "pointer", letterSpacing: "0.02em",
                }}
              >
                {t("done")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export function useEntranceHallTutorial(shouldShow: boolean): [boolean, (v: boolean) => void] {
  const open = useEntranceTourStore((s) => s.open);
  const setOpen = useEntranceTourStore((s) => s.setOpen);
  useEffect(() => {
    if (!shouldShow) return;
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("entranceTour") === "1") {
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
