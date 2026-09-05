"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsCompact, useReducedMotion } from "@/lib/hooks/useIsMobile";
import { muteTutorials } from "@/lib/tutorialMute";

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

interface StepDef {
  titleKey: string;
  titleEn: string;
  bodyKey: string;
  bodyEn: string;
  /** CSS selector to spotlight, or null for a centered card. */
  target: string | null;
}

// Copy per PALACE_TUTORIAL_SPEC §2.1 (EN fallbacks verbatim; locale values live
// in src/messages/*.json under the flat `palaceTour` section).
// NOTE: the step-set branch is layout-bound: PalaceSubNav renders the compact
// `[data-mp-palace-bars]` breadcrumb bar whenever its useMobileLayout =
// useIsMobile() || useIsCompact() is true (phones AND iPad portrait ≤1024px);
// the `[data-palace-subnav]` capsule only exists in the full desktop layout.
// So the SAME disjunction — not useTouchControls(), not useIsMobile() alone —
// picks the branch here. Exterior has no joystick/WASD copy divergence.
const MOBILE_STEPS: StepDef[] = [
  {
    titleKey: "step1Title",
    titleEn: "Your compass",
    bodyKey: "step1Body",
    bodyEn:
      "This bar shows where you are — Palace › Wing › Room. Tapping it opens the picker, for jumping to any wing or room.",
    target: "[data-mp-palace-bars]",
  },
  {
    titleKey: "step2Title",
    titleEn: "Two ways in",
    bodyKey: "step2Body",
    bodyEn:
      "Tap the palace and you'll ride up the road, straight inside. Up close, tap a wing door and the bar offers Enter — one more tap takes you in.",
    target: null,
  },
  {
    titleKey: "step3Title",
    titleEn: "Look around",
    bodyKey: "step3Body",
    bodyEn: "Drag with one finger to circle the palace; pinch to come closer or drift away.",
    target: null,
  },
];

const DESKTOP_STEPS: StepDef[] = [
  {
    titleKey: "dStep1Title",
    titleEn: "Your palace on the hill",
    bodyKey: "dStep1Body",
    bodyEn:
      "Drag to look around and scroll to draw closer. Click the palace — even from afar — and you'll ride up the road and step straight inside.",
    target: null,
  },
  {
    titleKey: "dStep2Title",
    titleEn: "Jump anywhere",
    bodyKey: "dStep2Body",
    bodyEn:
      "This bar shows where you are — Palace, Wing, Room. Use it to jump straight to any place, without the walk.",
    target: "[data-palace-subnav]",
  },
];

// Canon warm-ink scrim (NudgeTooltip / SettingsTutorial tour precedent).
const SCRIM = "rgba(64,59,54,0.45)";

const SR_ONLY: React.CSSProperties = {
  position: "absolute",
  width: "0.0625rem",
  height: "0.0625rem",
  padding: 0,
  margin: "-0.0625rem",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Guided tour for the Palace exterior view (canon scene-tour grammar,
 * PALACE_TUTORIAL_SPEC §1.1/§2.1/§6).
 *
 * Mobile: 3 steps — compact-bar spotlight, then two centered cards.
 * Desktop: 2 steps — centered card, then breadcrumb-capsule spotlight.
 *
 * Dismissal semantics (§5.2): Skip → muteTutorials() + close; Got it and
 * Escape → close WITHOUT muting; scrim is pointer-blocking but inert.
 */
export default function PalaceExteriorTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("palaceTour");
  const isMobile = useIsMobile();
  // Mirrors PalaceSubNav's useMobileLayout: iPad portrait (768–1024px) renders
  // the compact breadcrumb bars, not the desktop capsule — the step set must
  // follow the bar that actually exists on screen.
  const isCompact = useIsCompact();
  const compactLayout = isMobile || isCompact;
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);
  const [fade, setFade] = useState(false);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Graceful i18n: fall back to the spec's EN copy while a locale/key is
  // missing (t() echoes the key when neither locale nor EN has it).
  const tr = useCallback(
    (key: string, fallback: string, params?: Record<string, string>) => {
      const v = t(key, params);
      if (v !== key) return v;
      if (!params) return fallback;
      let out = fallback;
      for (const [k, val] of Object.entries(params)) out = out.split(`{${k}}`).join(val);
      return out;
    },
    [t]
  );

  // Cache the root font-size (refreshed on resize → covers zoom / text scaling)
  // so rem-derived geometry doesn't force getComputedStyle reflows per render.
  const rootPxRef = useRef(16);
  const [vp, setVp] = useState<{ w: number; h: number }>(() =>
    typeof window === "undefined"
      ? { w: 360, h: 640 }
      : { w: window.innerWidth, h: window.innerHeight }
  );
  useEffect(() => {
    const read = () => {
      rootPxRef.current =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Escape closes WITHOUT muting (§5.2) — window-level so it works even if
  // focus slipped out of the card.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus restore on close (§1.1 a11y build target).
  useEffect(() => {
    if (!open) return;
    const prev = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    return () => { try { prev?.focus?.(); } catch {} };
  }, [open]);

  // Primary auto-focused per step (SettingsTutorial precedent).
  useEffect(() => {
    if (!open || !mounted) return;
    const id = requestAnimationFrame(() => primaryRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, mounted, step]);

  // Focus trap Skip ↔ primary (aria-modal contract), Escape closes w/o mute.
  const trapFocus = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const first = skipRef.current;
      const last = primaryRef.current;
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    },
    [onClose]
  );

  const steps = compactLayout ? MOBILE_STEPS : DESKTOP_STEPS;
  const totalSteps = steps.length;
  const stepDef = steps[Math.min(step, totalSteps - 1)];

  // ── Measure the spotlight target (rAF-coalesced, bail on unchanged rect) ──
  const lastBoxRef = useRef<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!open) { setTargetBox(null); lastBoxRef.current = null; return; }

    const computeBox = (): Rect | null => {
      if (!stepDef.target) return null;
      // The compact mobile breadcrumb bar can render as multiple bar elements —
      // merge their rects into one cutout.
      const els = Array.from(document.querySelectorAll<HTMLElement>(stepDef.target));
      if (els.length === 0) return null;
      let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
      els.forEach((b) => {
        const r = b.getBoundingClientRect();
        top = Math.min(top, r.top);
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      });
      if (!isFinite(top)) return null;
      return { top, left, width: right - left, height: bottom - top };
    };

    const sameRect = (a: Rect | null, b: Rect | null) =>
      a === b ||
      (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

    const measure = () => {
      const next = computeBox();
      const w = window.innerWidth;
      const h = window.innerHeight;
      setVp((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      if (sameRect(next, lastBoxRef.current)) return;
      lastBoxRef.current = next;
      setTargetBox(next);
    };

    const onScrollOrResize = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };

    measure();
    // Retry once shortly after mount — bars can attach a frame late. If the
    // anchor is still missing, the render falls back to a centered card over
    // full scrim (NudgeTooltip safety-net pattern, §6.1).
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
  }, [open, step, compactLayout, stepDef.target]);

  // Scroll-fade affordance: show a bottom gradient while the body overflows
  // and isn't scrolled to its end (§6.1 doesn't-fit rule; long DE/FR copy).
  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) { setFade(false); return; }
    setFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(updateFade);
    return () => cancelAnimationFrame(id);
  }, [open, step, vp, compactLayout, updateFade]);

  if (!mounted || !open) return null;

  const remPx = rootPxRef.current;
  const rem = (n: number) => n * remPx;
  const vw = vp.w;
  const vh = vp.h;

  // Landscape rule (§6.1): short viewports render every step as a centered card.
  const shortLandscape = vh < rem(26);

  const title = tr(stepDef.titleKey, stepDef.titleEn);
  const body = tr(stepDef.bodyKey, stepDef.bodyEn);
  const isLast = step >= totalSteps - 1;
  const stepAnnouncement = tr(
    "stepXofY",
    `Step ${step + 1} of ${totalSteps}`,
    // Pass both placeholder vocabularies so either message shape interpolates.
    {
      x: String(step + 1),
      y: String(totalSteps),
      current: String(step + 1),
      total: String(totalSteps),
    }
  );

  // ── Cutout geometry (rem-derived, §1.1: 0.25rem pad, rounded) ──
  const pad = rem(0.25);
  const cutR = rem(0.75);
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  // ── Placement ──
  const gutter = rem(1);
  const tipWidth = isMobile ? Math.min(vw - rem(2), rem(20)) : rem(17.5);
  const tipGap = rem(0.75);
  // Bottom keep-clear below the tooltip: NavigationBar 3.5rem + 1rem margin.
  const bottomClear = rem(4.5);

  let spotlight = !!stepDef.target && !!targetBox && !shortLandscape;
  let tipTop = 0;
  let tipLeft = 0;
  let tipMaxH = 0;
  if (spotlight) {
    // Both exterior anchors are top bars → the card sits BELOW the cutout.
    tipTop = t_ + h_ + tipGap;
    tipLeft = Math.max(gutter, Math.min(vw - tipWidth - gutter, l_ + w_ / 2 - tipWidth / 2));
    tipMaxH = vh - tipTop - bottomClear;
    // Doesn't-fit fallback (§6.1): free band under the bar < 10rem → centered.
    if (tipMaxH < rem(10)) spotlight = false;
  }

  const anim = (name: string) => (reducedMotion ? "none" : name);

  const cardInner = (variant: "tooltip" | "centered") => (
    <div
      style={{
        background: CREAM,
        borderRadius: variant === "tooltip" ? "0.875rem" : "1rem",
        padding: variant === "tooltip" ? "0.875rem 1rem" : "1.25rem 1.25rem 1rem",
        border: `0.0625rem solid ${HAIRLINE}`,
        boxShadow: SHADOW[2],
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        minHeight: 0,
      }}
    >
      <div style={{ position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div
          ref={scrollRef}
          onScroll={updateFade}
          style={{ overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <div
            style={{
              fontFamily: T.font.display,
              // Canon centered-card anatomy upsizes the title to RT.titleS
              // (NudgeTooltip overview cards + sibling scene tours).
              fontSize: variant === "centered" ? RT.titleS : RT.body,
              fontWeight: 600,
              color: INK,
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </div>
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
        </div>
        {fade && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "1.5rem",
              background: `linear-gradient(rgba(252,250,245,0), ${CREAM})`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Visually-hidden step announcement (§1.1 — deliberate a11y addition). */}
      {totalSteps > 1 && (
        <div aria-live="polite" style={SR_ONLY}>
          {stepAnnouncement}
        </div>
      )}

      {/* Controls: Skip (ghost) left, Next / Got it (EMBER) right. No dots. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.125rem" }}>
        <button
          ref={skipRef}
          type="button"
          className="mp-pt-skip"
          onClick={(e) => { e.stopPropagation(); muteTutorials(); onClose(); }}
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
          onClick={(e) => {
            e.stopPropagation();
            if (isLast) onClose();
            else setStep(step + 1);
          }}
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
          {isLast ? tr("done", "Got it") : tr("next", "Next")}
        </button>
      </div>
    </div>
  );

  const overlay = (
    <>
      <style>{`
        @keyframes mpPtTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpPtCardIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95);} to { opacity:1; transform:translate(-50%,-50%) scale(1);} }
        /* Pulse derives from canon GOLD #D4AF37 = rgba(212,175,55). Inline CSS
           keyframes cannot reference the JS GOLD const, so the numeric literal
           is the canonical focus color, not an ad-hoc gold. */
        @keyframes mpPtPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
        /* Reduced motion: kill keyframes only — the GOLD ring border stays as a
           static highlight (it must never disappear entirely, §6.2). */
        @media (prefers-reduced-motion: reduce){
          .mp-pt-anim, .mp-pt-ring { animation: none !important; transition: none !important; }
        }
        /* !important: the button's color is set inline (MUTED), which a plain
           class rule can never override — without it this hover is dead. */
        .mp-pt-skip:hover { color: ${INK} !important; }
      `}</style>

      {/* Scrim — z57, pointer-blocking but INERT (no tap-to-dismiss, §5.2). */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 57, pointerEvents: "auto" }}
      >
        {spotlight ? (
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <defs>
              <mask id="mp-palace-cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect x={l_} y={t_} width={w_} height={h_} rx={cutR} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill={SCRIM} mask="url(#mp-palace-cutout)" />
          </svg>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: SCRIM }} />
        )}
      </div>

      {/* Pulsing GOLD ring — z58 (static under reduced motion). */}
      {spotlight && (
        <div
          aria-hidden="true"
          className="mp-pt-ring"
          style={{
            position: "fixed",
            top: t_, left: l_, width: w_, height: h_,
            zIndex: 58,
            borderRadius: `${cutR}px`,
            border: `0.1875rem solid ${GOLD}`,
            animation: anim("mpPtPulse 2s ease-in-out infinite"),
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Card — z59 (above nudge scrims; below help menu/toast 60). */}
      {spotlight ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onKeyDown={trapFocus}
          className="mp-pt-anim"
          style={{
            position: "fixed",
            top: tipTop, left: tipLeft, width: tipWidth,
            maxHeight: tipMaxH,
            zIndex: 59,
            display: "flex",
            flexDirection: "column",
            animation: anim("mpPtTipIn .3s ease both"),
          }}
        >
          {cardInner("tooltip")}
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onKeyDown={trapFocus}
          className="mp-pt-anim"
          style={{
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: isMobile ? "calc(100vw - 2rem)" : "22rem",
            maxWidth: "24rem",
            maxHeight: shortLandscape ? "calc(100dvh - 3rem)" : "calc(100dvh - 4rem)",
            zIndex: 59,
            display: "flex",
            flexDirection: "column",
            animation: anim("mpPtCardIn .3s ease both"),
          }}
        >
          {cardInner("centered")}
        </div>
      )}
    </>
  );

  return createPortal(overlay, document.body);
}
