"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTouchControls } from "@/lib/hooks/useIsMobile";
import { muteTutorials } from "@/lib/tutorialMute";

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
  // Touch-based: the mobile step highlights the joystick, so this must match
  // the joystick's render condition (never viewport width alone).
  const isMobile = useTouchControls();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  // Explicit dismissal (skip / backdrop / Escape) mutes ALL scene tutorials'
  // auto-fire until a manual restart. Completing via "Done" does NOT mute.
  const dismiss = () => { muteTutorials(); onClose(); };

  // Cache the root font-size once (it never changes within a session) so remToPx
  // doesn't force a synchronous getComputedStyle reflow on every call/render.
  // Refreshed only on resize (covers browser zoom / responsive root sizing).
  const rootPxRef = useRef(16);
  useEffect(() => {
    const read = () => {
      rootPxRef.current = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Escape-to-dismiss + move focus to the primary action while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { muteTutorials(); onClose(); } };
    window.addEventListener("keydown", onKey);
    const prev = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    const focusId = setTimeout(() => nextRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(focusId);
      try { prev?.focus?.(); } catch {}
    };
  }, [open, onClose]);

  const totalSteps = 2;

  const lastBoxRef = useRef<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); lastBoxRef.current = null; return; }

    const computeBox = (): Rect | null => {
      let el: HTMLElement | null = null;
      if (isMobile) {
        if (step === 0) {
          // Corridor step 0 highlights the joystick; no exterior-only fallback.
          el = document.querySelector<HTMLElement>("[data-mp-joystick]");
        } else {
          el = document.querySelector<HTMLElement>("[data-mp-corridor-media]");
        }
      } else {
        // Desktop: step 0 = no target (centered navigation text), step 1 = media button
        if (step === 0) return null;
        el = document.querySelector<HTMLElement>("[data-mp-corridor-media]");
      }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    };

    const sameRect = (a: Rect | null, b: Rect | null) =>
      a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

    // Layout read + commit, but bail if the rect is unchanged so scroll/resize
    // ticks that don't move the target don't re-render the portal + SVG mask.
    const measure = () => {
      const next = computeBox();
      if (sameRect(next, lastBoxRef.current)) return;
      lastBoxRef.current = next;
      setTargetBox(next);
    };

    // rAF-coalesced handler: skip if a frame is already pending so momentum/
    // inertial scroll collapses many events into one layout read per frame.
    const onScrollOrResize = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };

    measure();
    const id = setTimeout(measure, 60);
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { capture: true, passive: true });
    return () => {
      clearTimeout(id);
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
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
    titleKey = step === 0 ? "step1Title" : "step2Title";
    bodyKey  = step === 0 ? "step1Body"  : "step2Body";
  } else {
    titleKey = step === 0 ? "dStep1Title" : "dStep2Title";
    bodyKey  = step === 0 ? "dStep1Body"  : "dStep2Body";
  }

  const remToPx = (rem: number) => rem * rootPxRef.current;
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
  // scaling and short landscape viewports (was hard-coded 80/180/200/16 px).
  const cardH = remToPx(11.25);       // ~180px at 16px root
  const edge = remToPx(1);            // viewport edge margin
  const gap = remToPx(1);

  let tipTop = remToPx(5);
  let tipLeft = edge;
  if (!targetBox) {
    tipTop = vh / 2 - cardH / 2;
    tipLeft = vw / 2 - tipWidth / 2;
  } else {
    const targetCenterY = t_ + h_ / 2;
    if (targetCenterY > vh / 2) {
      tipTop = Math.max(edge, t_ - cardH - gap);
    } else {
      tipTop = Math.min(vh - cardH - edge, t_ + h_ + gap);
    }
    tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
  }

  const advance = () => {
    if (step >= totalSteps - 1) onClose();
    else setStep(step + 1);
  };

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(titleKey)}
      style={{ position: "fixed", inset: 0, zIndex: 57 }}
    >
      <style>{`
        @keyframes mpCtTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        /* Pulse derives from canon GOLD #D4AF37 = rgba(212,175,55). Inline CSS
           keyframes cannot reference the JS GOLD const, so the numeric literal
           is the canonical focus color, not an ad-hoc gold. */
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
              fill="rgba(64,59,54,0.45)"
              mask="url(#mp-corridor-cutout)"
              onClick={dismiss}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${rRem}rem`,
              border: `0.1875rem solid ${GOLD}`,
              animation: "mpCtPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
          {/* Tapping the highlighted control advances the tour (feels interactive,
              rather than dismissing). We don't punch pointer-events through to the
              real control to avoid double-duty taps on the joystick mid-tour. */}
          <button
            type="button"
            aria-label={t("advanceHint")}
            onClick={(e) => { e.stopPropagation(); advance(); }}
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              minWidth: T.touch, minHeight: T.touch,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              borderRadius: `${rRem}rem`,
            }}
          />
        </>
      ) : (
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(64,59,54,0.45)", pointerEvents: "auto" }}
          onClick={dismiss}
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
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
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
                onClick={(e) => { e.stopPropagation(); advance(); }}
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
