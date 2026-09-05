"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTouchControls, useReducedMotion } from "@/lib/hooks/useIsMobile";
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

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Corridor tour — canon scene-tutorial grammar (PALACE_TUTORIAL_SPEC §1.1/§2.3/§6).
 * Mobile: 2 steps (joystick spotlight → Media-pill spotlight).
 * Desktop: 2 steps (centered gallery card → Media-pill spotlight).
 *
 * Dismissal semantics (§5.2): ONLY the Skip button mutes all scene tutorials;
 * "Got it" and Escape close without muting; the scrim is inert (no tap-to-close,
 * no tap-to-advance). Advancing is via Next / Got it only.
 */
export default function CorridorTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("corridorTour");
  // Graceful fallback: if a key is missing in every locale (mid-migration), fall
  // back to the spec's EN copy inline, including {param} interpolation.
  const tr = useCallback(
    (key: string, fallback: string, params?: Record<string, string>) => {
      let v = t(key, params);
      if (v === key) {
        v = fallback;
        if (params) for (const [k, p] of Object.entries(params)) v = v.split(`{${k}}`).join(p);
      }
      return v;
    },
    [t]
  );

  // Touch-based: the mobile step highlights the joystick, so this must match
  // the joystick's render condition (never viewport width alone).
  const isMobile = useTouchControls();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Skip = the ONLY action that mutes scene tutorials (until manual restart).
  const skip = () => { muteTutorials(); onClose(); };

  // Root font-size + viewport as state so spotlight geometry re-lays-out on
  // resize / rotation / text-scaling changes (SettingsTutorial remPx pattern).
  const [remPx, setRemPx] = useState(16);
  const [vp, setVp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const read = () => {
      setRemPx(parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
      setVp({ w: window.innerWidth, h: window.innerHeight });
    };
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Escape closes WITHOUT muting (§5.2); focus restore on close (§1.1 a11y).
  // onClose is held in a ref so the effect deps are [open] ONLY: MemoryPalace
  // passes an inline arrow that changes identity every parent render, and with
  // it in the deps this effect tore down/re-ran mid-tour — the cleanup yanked
  // focus back to the pre-tour element (defeating the trap) and re-captured
  // `prev` as the tour's own primary button, so real close restored focus to an
  // unmounted node. Capturing `prev` once per open-transition fixes both.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    const prev = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    return () => {
      window.removeEventListener("keydown", onKey);
      try { prev?.focus?.(); } catch {}
    };
  }, [open]);

  // Primary auto-focused per step (SettingsTutorial precedent).
  useEffect(() => {
    if (!open || !mounted) return;
    const id = requestAnimationFrame(() => primaryRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, mounted, step]);

  // Focus trap Skip ↔ primary, honouring the aria-modal contract.
  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const first = skipRef.current;
    const last = primaryRef.current;
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }, []);

  const totalSteps = 2;

  const lastBoxRef = useRef<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); lastBoxRef.current = null; return; }

    const computeBox = (): Rect | null => {
      let el: HTMLElement | null = null;
      if (isMobile) {
        if (step === 0) {
          el = document.querySelector<HTMLElement>("[data-mp-joystick]");
        } else {
          el = document.querySelector<HTMLElement>("[data-mp-corridor-media]");
        }
      } else {
        // Desktop: step 0 = centered card (no target), step 1 = Media pill.
        if (step === 0) return null;
        el = document.querySelector<HTMLElement>("[data-mp-corridor-media]");
      }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    };

    const sameRect = (a: Rect | null, b: Rect | null) =>
      a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

    const measure = () => {
      const next = computeBox();
      if (sameRect(next, lastBoxRef.current)) return;
      lastBoxRef.current = next;
      setTargetBox(next);
    };

    // rAF-coalesced handler so momentum scroll collapses into one read per frame.
    const onScrollOrResize = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };

    measure();
    // Retries before the anchor-not-found centered fallback kicks in (§6.1) —
    // the Media pill can be briefly hidden while its panel is open.
    const id = setTimeout(measure, 60);
    const id2 = setTimeout(measure, 350);
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { capture: true, passive: true });
    return () => {
      clearTimeout(id);
      clearTimeout(id2);
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, isMobile]);

  // Scroll-fade affordance (§6.1): show a bottom fade while the body can still
  // scroll further, so long DE/FR strings are visibly scrollable, never clipped.
  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) { setCanScrollMore(false); return; }
    setCanScrollMore(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }, []);
  useLayoutEffect(() => { updateFade(); }, [updateFade, open, step, targetBox, isMobile, vp]);

  if (!mounted || !open) return null;

  const rem = (n: number) => n * remPx;
  const vw = vp.w || (typeof window !== "undefined" ? window.innerWidth : 360);
  const vh = vp.h || (typeof window !== "undefined" ? window.innerHeight : 640);

  // Phone landscape (§6.1): every step renders as a centered card — the
  // bottom-band keep-clear geometry doesn't exist in landscape.
  const landscapeShort = vh < rem(26);

  let titleKey: string, bodyKey: string, titleFb: string, bodyFb: string;
  if (isMobile) {
    if (step === 0) {
      titleKey = "step1Title"; bodyKey = "step1Body";
      titleFb = "The wing's gallery";
      bodyFb = "Each frame holds a room's newest photo — tap a painting to view it full screen, or tap a door to step into that room. The joystick lets you wander.";
    } else {
      titleKey = "step2Title"; bodyKey = "step2Body";
      titleFb = "Curate the walls";
      bodyFb = "This pill chooses which memory hangs in each frame — tapping an empty frame opens it too.";
    }
  } else {
    if (step === 0) {
      titleKey = "dStep1Title"; bodyKey = "dStep1Body";
      titleFb = "The wing's gallery";
      bodyFb = "Each painting is a room's newest photo — click one to view it full screen. Click any door to enter its room; you'll walk over on your own. WASD to stroll, drag to look. The portal behind you leads back to the hall.";
    } else {
      titleKey = "dStep2Title"; bodyKey = "dStep2Body";
      titleFb = "Curate the walls";
      bodyFb = "This pill chooses which memory hangs in each frame — clicking an empty frame opens it too.";
    }
  }
  const title = tr(titleKey, titleFb);
  const body = tr(bodyKey, bodyFb);

  // Spotlight cutout geometry: 0.25rem padding around the target (§1.1).
  const pad = rem(0.25);
  const cutoutR = rem(0.75);
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  // Doesn't-fit fallback (§6.1): free band between keep-clears; under 10rem the
  // step renders as a centered card over full scrim instead.
  const gap = rem(0.75);
  const topClear = rem(3.75);    // compact breadcrumb bar + safe-area allowance
  const bottomClear = rem(4.5);  // bottom NavigationBar + safe-area allowance
  const targetCenterY = t_ + h_ / 2;
  const placeAbove = targetBox ? targetCenterY > vh / 2 : false;
  const band = targetBox
    ? (placeAbove ? t_ - gap - topClear : vh - (t_ + h_ + gap) - bottomClear)
    : 0;
  const bandFits = band >= rem(10);

  const wantsTarget = isMobile || step === 1;
  const spotlight = !!targetBox && wantsTarget && !landscapeShort && bandFits;

  // Spotlight tooltip: min(100vw - 2rem, 20rem) mobile / 17.5rem desktop (§6.1).
  const tipWidth = isMobile ? Math.min(vw - rem(2), rem(20)) : rem(17.5);
  const edge = rem(1);
  const tipLeft = spotlight
    ? Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2))
    : 0;
  // Bottom-band targets: the card sits ABOVE the cutout with ≥0.75rem gap, and
  // never below the per-target safe-area floor (joystick 14.5rem / pill 9.75rem).
  const floorRem = isMobile ? (step === 0 ? "14.5rem" : "9.75rem") : null;
  const bottomPx = vh - t_ + gap;
  const bottomCss = floorRem
    ? `max(${Math.round(bottomPx)}px, calc(${floorRem} + env(safe-area-inset-bottom, 0px)))`
    : `${Math.round(bottomPx)}px`;

  const advance = () => {
    if (step >= totalSteps - 1) onClose();
    else setStep(step + 1);
  };

  const fadeEl = (
    <div
      aria-hidden="true"
      className="mp-ct-anim"
      style={{
        position: "sticky",
        bottom: 0,
        height: "1.5rem",
        marginTop: "-1.5rem",
        background: `linear-gradient(to bottom, rgba(252,250,245,0), ${CREAM})`,
        pointerEvents: "none",
        opacity: canScrollMore ? 1 : 0,
        transition: "opacity .2s ease",
      }}
    />
  );

  const footer = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.125rem", flex: "0 0 auto" }}>
      <button
        ref={skipRef}
        type="button"
        className="mp-ct-skip"
        onClick={(e) => { e.stopPropagation(); skip(); }}
        style={{
          // 0.75rem = canon tutorial-button floor (NudgeTooltip); RT.overline
          // (0.6875rem) sits below the ramp every real tutorial button uses.
          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
          color: MUTED,
          background: "transparent", border: "none",
          padding: "0.4375rem 0.5rem",
          minHeight: T.touch,
          cursor: "pointer", letterSpacing: "0.02em",
        }}
      >
        {tr("skip", "Skip tutorial")}
      </button>
      <button
        ref={primaryRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); advance(); }}
        style={{
          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
          color: "#FFF",
          background: EMBER,
          border: "none", borderRadius: "0.5rem",
          padding: "0.4375rem 1.125rem",
          minHeight: T.touch,
          cursor: "pointer", letterSpacing: "0.02em",
        }}
      >
        {step >= totalSteps - 1 ? tr("done", "Got it") : tr("next", "Next")}
      </button>
    </div>
  );

  const cardInner = (centered: boolean) => (
    <>
      <div
        style={{
          fontFamily: T.font.display,
          fontSize: centered ? RT.titleS : RT.body,
          fontWeight: 600,
          color: INK,
          letterSpacing: "0.02em",
          flex: "0 0 auto",
        }}
      >
        {title}
      </div>
      <div
        ref={scrollRef}
        onScroll={updateFade}
        style={{ flex: "0 1 auto", minHeight: 0, overflowY: "auto" }}
      >
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: RT.meta,
            color: MUTED,
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>
        {fadeEl}
      </div>
      {footer}
      {/* Visually-hidden step announcement (§1.1 — deliberate a11y addition). */}
      <div aria-live="polite" style={srOnly}>
        {tr("stepXofY", "Step {x} of {y}", { x: String(step + 1), y: String(totalSteps) })}
      </div>
    </>
  );

  const overlay = (
    <div role="dialog" aria-modal="true" aria-label={title} onKeyDown={trapFocus}>
      <style>{`
        @keyframes mpCtTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpCtCenterIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.97);} to { opacity:1; transform:translate(-50%,-50%) scale(1);} }
        /* Pulse derives from canon GOLD #D4AF37 = rgba(212,175,55). Inline CSS
           keyframes cannot reference the JS GOLD const, so the numeric literal
           is the canonical focus color, not an ad-hoc gold. */
        @keyframes mpCtPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
        @media (prefers-reduced-motion: reduce) {
          .mp-ct-anim { animation: none !important; transition: none !important; }
        }
        .mp-ct-skip:hover { color: ${INK} !important; }
      `}</style>

      {spotlight ? (
        <>
          {/* Scrim z57 — pointer events intercepted, but INERT (§5.2): stray
              scrim grazes must never dismiss, and there is no tap-to-advance. */}
          <div style={{ position: "fixed", inset: 0, zIndex: 57, pointerEvents: "auto" }}>
            <svg width="100%" height="100%" style={{ display: "block" }}>
              <defs>
                <mask id="mp-corridor-cutout">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x={l_} y={t_} width={w_} height={h_} rx={cutoutR} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(64,59,54,0.45)" mask="url(#mp-corridor-cutout)" />
            </svg>
          </div>
          {/* GOLD ring z58 — static (non-pulsing) under reduced motion so the
              highlight never disappears (§6.2). */}
          <div
            className="mp-ct-anim"
            style={{
              position: "fixed",
              top: t_, left: l_, width: w_, height: h_,
              zIndex: 58,
              borderRadius: `${cutoutR}px`,
              border: `0.1875rem solid ${GOLD}`,
              animation: reduced ? "none" : "mpCtPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
          {/* Tooltip card z59 — above any concurrently mounted nudge card. */}
          <div
            className="mp-ct-anim"
            style={{
              position: "fixed",
              zIndex: 59,
              left: tipLeft,
              width: tipWidth,
              ...(placeAbove ? { bottom: bottomCss } : { top: t_ + h_ + gap }),
              maxHeight: Math.max(band, rem(10)),
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              background: CREAM,
              borderRadius: "0.875rem",
              padding: "0.875rem 1rem",
              border: `1px solid ${HAIRLINE}`,
              boxShadow: SHADOW[2],
              boxSizing: "border-box",
              animation: reduced ? "none" : "mpCtTipIn .3s ease both",
            }}
          >
            {cardInner(false)}
          </div>
        </>
      ) : (
        <>
          {/* Full scrim z57 (centered step / anchor-not-found / landscape) — inert. */}
          <div style={{ position: "fixed", inset: 0, zIndex: 57, background: "rgba(64,59,54,0.45)", pointerEvents: "auto" }} />
          <div
            className="mp-ct-anim"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 59,
              width: isMobile ? "calc(100vw - 2rem)" : "22rem",
              maxWidth: "24rem",
              maxHeight: landscapeShort ? "calc(100dvh - 3rem)" : "calc(100dvh - 4rem)",
              display: "flex",
              flexDirection: "column",
              // Canon centered-card anatomy (NudgeTooltip/SettingsTutorial +
              // sibling scene tours): 0.75rem gap, 1.25/1.25/1 padding.
              gap: "0.75rem",
              background: CREAM,
              borderRadius: "1rem",
              padding: "1.25rem 1.25rem 1rem",
              border: `1px solid ${HAIRLINE}`,
              boxShadow: SHADOW[2],
              boxSizing: "border-box",
              animation: reduced ? "none" : "mpCtCenterIn .3s ease both",
            }}
          >
            {cardInner(true)}
          </div>
        </>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
