"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, RT } from "@/lib/libraryTokens";
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
 * Help layer for the Palace exterior view.
 * Mobile: 3 steps (bars → enter → explore).
 * Desktop: 2 steps (movement → entering doors).
 */
export default function PalaceExteriorTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("palaceTour");
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

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

  const totalSteps = isMobile ? 3 : 2;

  // Desktop step keys
  const desktopSteps = [
    { titleKey: "dStep1Title", bodyKey: "dStep1Body", target: null },
    { titleKey: "dStep2Title", bodyKey: "dStep2Body", target: "[data-palace-subnav]" },
  ];

  // Measure target(s) for each step.
  const lastBoxRef = useRef<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); lastBoxRef.current = null; return; }

    // Compute the target rect for the current step, or null if none/not found.
    const computeBox = (): Rect | null => {
      if (isMobile) {
        if (step === 0) {
          const bars = Array.from(document.querySelectorAll<HTMLElement>("[data-mp-palace-bars]"));
          if (bars.length === 0) return null;
          let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
          bars.forEach((b) => {
            const r = b.getBoundingClientRect();
            top = Math.min(top, r.top);
            left = Math.min(left, r.left);
            right = Math.max(right, r.right);
            bottom = Math.max(bottom, r.bottom);
          });
          return { top, left, width: right - left, height: bottom - top };
        } else if (step === 1) {
          const el = document.querySelector<HTMLElement>("[data-mp-palace-enter]");
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, left: r.left, width: r.width, height: r.height };
        } else if (step === 2) {
          const bars = Array.from(document.querySelectorAll<HTMLElement>("[data-mp-palace-bars]"));
          let topY = 0;
          bars.forEach((b) => { topY = Math.max(topY, b.getBoundingClientRect().bottom); });
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const padTop = topY + 12;
          const padBottom = 96;
          return { top: padTop, left: 12, width: vw - 24, height: vh - padTop - padBottom };
        }
        return null;
      } else {
        // Desktop
        const ds = desktopSteps[step];
        if (!ds || !ds.target) return null;
        const el = document.querySelector<HTMLElement>(ds.target);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      }
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
    titleKey = step === 0 ? "step1Title" : step === 1 ? "step2Title" : "step3Title";
    bodyKey  = step === 0 ? "step1Body"  : step === 1 ? "step2Body"  : "step3Body";
  } else {
    const ds = desktopSteps[step];
    titleKey = ds?.titleKey || "dStep1Title";
    bodyKey = ds?.bodyKey || "dStep1Body";
  }

  // ── Highlight rect geometry ──
  const pad = 6;
  const r = (!isMobile && step === 0) ? 0 : (isMobile && step === 2) ? 16 : 12;
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const remToPx = (rem: number) => rem * rootPxRef.current;
  const tipWidth = remToPx(isMobile ? 16.25 : 17.5);
  // Card height/margin allowances derived from rem so placement respects text
  // scaling (a11y, iOS Dynamic Type, large-font locales) and short landscape
  // viewports — was hard-coded 80/200/220/12/16/60 px.
  const cardH = remToPx(11.25);       // ~180px at 16px root
  const edge = remToPx(1);            // viewport edge margin
  const gap = remToPx(0.75);

  let tipTop = remToPx(5);
  let tipLeft = edge;
  if (!targetBox) {
    // Centered card (desktop step 0 — no target)
    tipTop = vh / 2 - cardH / 2;
    tipLeft = vw / 2 - tipWidth / 2;
  } else {
    if (isMobile) {
      if (step === 0) {
        tipTop = Math.min(vh - cardH - edge, t_ + h_ + gap);
        tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
      } else if (step === 1) {
        tipTop = Math.min(vh - cardH - edge, t_ + h_ / 2 - cardH / 2);
        tipLeft = Math.max(edge, l_ - tipWidth - gap);
      } else {
        tipTop = Math.min(vh - cardH - edge, t_ + h_ / 2 - cardH / 2);
        tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
      }
    } else {
      // Desktop: place below highlighted element
      tipTop = Math.min(vh - cardH - edge, t_ + h_ + gap);
      tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
    }
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(titleKey)}
      style={{ position: "fixed", inset: 0, zIndex: 57 }}
    >
      <style>{`
        @keyframes mpPtTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        /* Pulse derives from canon GOLD #D4AF37 = rgba(212,175,55). Inline CSS
           keyframes cannot reference the JS GOLD const, so the numeric literal
           is the canonical focus color, not an ad-hoc gold. */
        @keyframes mpPtPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
        @media (prefers-reduced-motion: reduce){ [role="dialog"] *{animation:none!important} }
      `}</style>

      {targetBox ? (
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
              fill="rgba(36,28,21,0.45)"
              mask="url(#mp-palace-cutout)"
              onClick={onClose}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: t_, left: l_, width: w_, height: h_,
              borderRadius: `${r}px`,
              border: `0.1875rem solid ${GOLD}`,
              animation: "mpPtPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      ) : (
        /* No target — semi-transparent overlay */
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(36,28,21,0.45)", pointerEvents: "auto" }}
          onClick={onClose}
        />
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

          {/* Step dots + controls */}
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
