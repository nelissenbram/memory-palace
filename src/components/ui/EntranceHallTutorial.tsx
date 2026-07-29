"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTouchControls } from "@/lib/hooks/useIsMobile";

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
 * Help layer for the Entrance Hall view.
 * Mobile: 1 step (joystick).
 * Desktop: 2 steps (navigation explanation → breadcrumb bar).
 */
export default function EntranceHallTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("entranceHallTour");
  // Touch-based: the mobile step highlights the joystick, so this must match
  // the joystick's render condition (never viewport width alone).
  const isMobile = useTouchControls();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Escape-to-dismiss + move focus to the primary action while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    const focusId = setTimeout(() => nextRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(focusId);
      try { prev?.focus?.(); } catch {}
    };
  }, [open, onClose]);

  const totalSteps = isMobile ? 1 : 2;

  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); return; }
    const measure = () => {
      if (isMobile) {
        const el = document.querySelector<HTMLElement>("[data-mp-joystick]");
        if (!el) { setTargetBox(null); return; }
        const r = el.getBoundingClientRect();
        setTargetBox({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        // Desktop step 0: no target (centered). Step 1: breadcrumb bar.
        if (step === 0) { setTargetBox(null); return; }
        const el = document.querySelector<HTMLElement>("[data-palace-subnav]");
        if (!el) { setTargetBox(null); return; }
        const r = el.getBoundingClientRect();
        setTargetBox({ top: r.top, left: r.left, width: r.width, height: r.height });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, isMobile]);

  if (!mounted || !open) return null;

  const cardBg = CREAM;
  const cardBorder = HAIRLINE;
  const cardShadow = SHADOW[2];

  let titleKey: string;
  let bodyKey: string;

  if (isMobile) {
    titleKey = "stepTitle";
    bodyKey = "stepBody";
  } else {
    titleKey = step === 0 ? "dStep1Title" : "dStep2Title";
    bodyKey = step === 0 ? "dStep1Body" : "dStep2Body";
  }

  const remToPx = (rem: number) => rem * parseFloat(typeof window !== "undefined" ? getComputedStyle(document.documentElement).fontSize || "16" : "16");
  const pad = 8;
  const rRem = 0.875;
  const r = remToPx(rRem);
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const tipWidth = remToPx(isMobile ? 16.25 : 17.5);
  // Card height/margin allowances derived from rem so placement respects text
  // scaling and short landscape viewports (was hard-coded 180/160 px).
  const cardH = remToPx(11.25);       // ~180px at 16px root
  const edge = remToPx(1);            // viewport edge margin
  const gap = remToPx(0.75);

  let tipTop = remToPx(5);
  let tipLeft = edge;
  if (!targetBox) {
    tipTop = vh / 2 - cardH / 2;
    tipLeft = vw / 2 - tipWidth / 2;
  } else if (isMobile) {
    tipTop = Math.max(edge, t_ - cardH - gap);
    tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
    if (tipTop + cardH > vh - edge) tipTop = Math.max(edge, vh - cardH - gap);
  } else {
    tipTop = Math.min(vh - cardH - gap, t_ + h_ + gap);
    tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(titleKey)}
      style={{ position: "fixed", inset: 0, zIndex: 57 }}
    >
      <style>{`
        @keyframes mpEhTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpEhPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
      `}</style>

      {targetBox ? (
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
              fill="rgba(36,28,21,0.45)"
              mask="url(#mp-entrance-cutout)"
              onClick={onClose}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${rRem}rem`,
              border: `0.1875rem solid ${GOLD}`,
              animation: "mpEhPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      ) : (
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(36,28,21,0.45)", pointerEvents: "auto" }}
          onClick={onClose}
        />
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
              fontSize: RT.body,
              fontWeight: 600,
              color: INK,
              letterSpacing: "0.02em",
            }}
          >
            {t(titleKey)}
          </div>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: RT.meta,
              color: MUTED,
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
                fontFamily: T.font.body, fontSize: RT.overline, fontWeight: 500,
                color: MUTED,
                background: "transparent", border: "none",
                padding: "0.4375rem 0.5rem",
                minHeight: T.touch,
                cursor: "pointer", letterSpacing: "0.02em",
              }}
            >
              {t("skip")}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                role="group"
                aria-label={t("stepXofY", { current: String(step + 1), total: String(totalSteps) })}
                style={{ display: "flex", gap: "0.25rem" }}
              >
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === step ? "1rem" : "0.3125rem",
                      height: "0.3125rem",
                      borderRadius: "0.1875rem",
                      background: i <= step ? EMBER : HAIRLINE,
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
              <button
                ref={nextRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (step >= totalSteps - 1) onClose();
                  else setStep(step + 1);
                }}
                style={{
                  fontFamily: T.font.body, fontSize: RT.overline, fontWeight: 600,
                  color: "#FFF",
                  background: EMBER,
                  border: "none", borderRadius: "0.5rem",
                  padding: "0.4375rem 1.125rem",
                  minHeight: T.touch,
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
