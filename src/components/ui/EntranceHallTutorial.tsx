"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, GOLD, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTouchControls, useIsMobile, useReducedMotion } from "@/lib/hooks/useIsMobile";
import { muteTutorials } from "@/lib/tutorialMute";

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

const VISUALLY_HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: "0.0625rem",
  height: "0.0625rem",
  padding: 0,
  margin: "-0.0625rem",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Entrance Hall scene tour — canon scene-tour grammar (PALACE_TUTORIAL_SPEC §1.1/§2.2).
 * Mobile/touch: 1 step (spotlight the joystick).
 * Desktop: 2 steps (centered welcome card → spotlight the breadcrumb bar).
 *
 * Dismissal semantics (§5.2): ONLY the Skip button mutes all scene tutorials.
 * "Got it" and Escape close WITHOUT muting. The scrim is inert (backdrop taps
 * do nothing) and there is NO tap-to-advance — Next/Got it are the only way
 * forward.
 */
export default function EntranceHallTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("entranceHallTour");
  // Input modality decides step structure + copy (joystick step must match the
  // joystick's render condition — never viewport width alone).
  const isTouch = useTouchControls();
  // Layout hook is only for card sizing (§1.1 platform branch).
  const isMobileLayout = useIsMobile();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() =>
    typeof window !== "undefined" ? { w: window.innerWidth, h: window.innerHeight } : { w: 360, h: 640 }
  );
  const [bodyOverflows, setBodyOverflows] = useState(false);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  // tr(): graceful fallback — new/renamed keys ship EN inline until the i18n
  // agent lands all 5 locale files (flat, per-section).
  const tr = (key: string, fallback: string, params?: Record<string, string>) => {
    let v = t(key, params);
    if (v === key) {
      v = fallback;
      if (params) for (const [k, val] of Object.entries(params)) v = v.split(`{${k}}`).join(val);
    }
    return v;
  };

  // Skip = the ONLY muting action (§5.2).
  const skip = () => { muteTutorials(); onClose(); };

  // Cache the root font-size (refreshed on resize — covers zoom / responsive
  // root sizing) so remToPx doesn't force getComputedStyle every render.
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

  // Escape closes WITHOUT muting (§5.2); focus the primary per step; restore
  // focus on close (§1.1 a11y — focus restore is a spec addition over canon).
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
  }, [open, step, onClose]);

  // Track viewport for landscape/doesn't-fit fallbacks (§6.1), rAF-coalesced.
  useEffect(() => {
    if (!open) return;
    let raf: number | null = null;
    const onResize = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        setViewport({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [open]);

  const totalSteps = isTouch ? 1 : 2;
  const remToPx = (rem: number) => rem * rootPxRef.current;

  // Phone landscape: the bottom-band geometry doesn't exist — every step
  // renders as a centered card over full scrim (§6.1 landscape rule).
  const landscapeCompact = viewport.h < remToPx(26);

  // Which anchor does the current step spotlight? (null = centered card)
  const anchorSelector = landscapeCompact
    ? null
    : isTouch
      ? "[data-mp-joystick]"
      : step === 1
        ? "[data-palace-subnav]"
        : null;

  const lastBoxRef = useRef<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchorSelector) { setTargetBox(null); lastBoxRef.current = null; return; }

    const computeBox = (): Rect | null => {
      const el = document.querySelector<HTMLElement>(anchorSelector);
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
  }, [open, step, anchorSelector]);

  // Scroll-fade affordance: show the bottom gradient only while the body can
  // actually scroll (long DE/FR strings must be visibly scrollable, §6.1).
  useLayoutEffect(() => {
    if (!open) return;
    const el = bodyScrollRef.current;
    if (!el) { setBodyOverflows(false); return; }
    setBodyOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [open, step, targetBox, viewport, isTouch]);

  if (!mounted || !open) return null;

  // ── Copy (spec §2.2 EN fallbacks inline; values live in src/messages) ──────
  let title: string;
  let body: string;
  if (isTouch) {
    title = tr("stepTitle", "The Entrance Hall");
    body = tr(
      "stepBody",
      "Tap any door — even across the hall — and you'll stroll over and step inside. Use this joystick whenever you'd rather wander yourself."
    );
  } else if (step === 0) {
    title = tr("dStep1Title", "The Entrance Hall");
    body = tr(
      "dStep1Body",
      "Every door carries a wing's name, its newest photo glowing above. Click any door, at any distance — you'll walk over and enter. WASD or arrow keys to stroll; hold and drag to look around."
    );
  } else {
    title = tr("dStep2Title", "Or skip the walk");
    body = tr(
      "dStep2Body",
      "This bar always knows where you are — use it to jump to any wing or room in a click."
    );
  }

  // ── Geometry (§6.1) ────────────────────────────────────────────────────────
  const vw = viewport.w;
  const vh = viewport.h;
  const pad = remToPx(0.25); // cutout padding around the target
  const rRem = 0.875;
  const r = remToPx(rRem);
  const t_ = targetBox ? targetBox.top - pad : 0;
  const l_ = targetBox ? targetBox.left - pad : 0;
  const w_ = targetBox ? targetBox.width + pad * 2 : 0;
  const h_ = targetBox ? targetBox.height + pad * 2 : 0;

  const edge = remToPx(1);
  const gap = remToPx(0.75);
  const tipWidth = isMobileLayout ? Math.min(vw - remToPx(2), remToPx(20)) : remToPx(17.5);

  // Doesn't-fit fallback: free band above a bottom-band target / below a top-bar
  // target; when < 10rem the step renders as a centered card instead (§6.1).
  let freeBand = Infinity;
  const targetInBottomBand = !!targetBox && targetBox.top > vh / 2;
  if (targetBox) {
    freeBand = targetInBottomBand
      ? t_ - gap - remToPx(3.75) // keep clear of the 2.75rem compact bar + margin
      : vh - (t_ + h_ + gap) - edge;
  }
  const useCentered = !targetBox || freeBand < remToPx(10);

  let tipTop: number | undefined;
  let tipBottom: string | undefined;
  let tipLeft = edge;
  if (!useCentered && targetBox) {
    tipLeft = Math.max(edge, Math.min(vw - tipWidth - edge, l_ + w_ / 2 - tipWidth / 2));
    if (targetInBottomBand) {
      // Joystick (bottom band): card bottom edge ≥ cutout top + 0.75rem →
      // ≥ 14.5rem + safe-area-inset-bottom for the joystick block (§6.1).
      tipBottom = "calc(14.5rem + env(safe-area-inset-bottom, 0px))";
    } else {
      // Top bar target: the card sits BELOW it.
      tipTop = t_ + h_ + gap;
    }
  }
  const tipMaxHeight = useCentered
    ? landscapeCompact
      ? "calc(100dvh - 3rem)"
      : "calc(100dvh - 4rem)"
    : `${Math.max(remToPx(8), freeBand)}px`;

  const advance = () => {
    if (step >= totalSteps - 1) onClose(); // completing never mutes (§5.2)
    else setStep(step + 1);
  };

  // Focus trap: Skip ↔ primary are the only tab stops (§1.1 a11y).
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    if (document.activeElement === skipRef.current) nextRef.current?.focus();
    else skipRef.current?.focus();
  };

  const spotlight = !useCentered && targetBox;

  const card = (
    <div
      key={step}
      className="mp-eh-card"
      style={{
        position: "fixed",
        zIndex: 59, // card above ring 58 / scrim 57 (§6.1 z map)
        ...(useCentered
          ? {
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: isMobileLayout ? "calc(100vw - 2rem)" : "22rem",
              maxWidth: "24rem",
            }
          : {
              ...(tipTop != null ? { top: tipTop } : {}),
              ...(tipBottom ? { bottom: tipBottom } : {}),
              left: tipLeft,
              width: tipWidth,
            }),
        maxHeight: tipMaxHeight,
        background: CREAM,
        borderRadius: useCentered ? "1rem" : "0.875rem",
        padding: useCentered ? "1.25rem 1.25rem 1rem" : "0.875rem 1rem",
        border: `1px solid ${HAIRLINE}`,
        boxShadow: SHADOW[2],
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        // Centered cards animate opacity only (their transform centers them);
        // tooltips add a small rise. Both killed under reduced motion.
        animation: reducedMotion ? "none" : `${useCentered ? "mpEhCardIn" : "mpEhTipIn"} .3s ease both`,
      }}
    >
      <div
        style={{
          fontFamily: T.font.display,
          fontSize: useCentered ? RT.titleS : RT.body,
          fontWeight: 600,
          color: INK,
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </div>

      <div style={{ position: "relative", minHeight: 0, display: "flex" }}>
        <div
          ref={bodyScrollRef}
          style={{
            fontFamily: T.font.body,
            fontSize: RT.meta,
            color: MUTED,
            lineHeight: 1.5,
            overflowY: "auto",
            minHeight: 0,
            flex: 1,
          }}
        >
          {body}
        </div>
        {bodyOverflows && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "1.5rem",
              background: `linear-gradient(to bottom, rgba(252,250,245,0), ${CREAM})`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.125rem" }}>
        <button
          ref={skipRef}
          type="button"
          className="mp-eh-skip"
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
          ref={nextRef}
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
    </div>
  );

  const overlay = (
    // Wrapper is NOT positioned (no stacking context of its own) so the scrim/
    // ring/card keep their global z57/58/59 slots relative to other overlays.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="mp-eh-tour"
      onKeyDown={trapTab}
    >
      {/* Step announcement — visually hidden, polite, in the STABLE wrapper so
          it survives the per-step card remount and actually announces (§1.1;
          multi-step tours only — the touch tour is a single step). */}
      {totalSteps > 1 && (
        <div aria-live="polite" style={VISUALLY_HIDDEN}>
          {tr("stepXofY", "Step {x} of {y}", {
            x: String(step + 1),
            y: String(totalSteps),
            current: String(step + 1),
            total: String(totalSteps),
          })}
        </div>
      )}
      <style>{`
        @keyframes mpEhTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpEhCardIn { from { opacity:0;} to { opacity:1;} }
        /* Pulse derives from canon GOLD #D4AF37 = rgba(212,175,55). */
        @keyframes mpEhPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4);} 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0);} }
        /* !important: the button's color is set inline (MUTED), which a plain
           class rule can never override — without it this hover is dead. */
        .mp-eh-skip:hover { color: ${INK} !important; }
        @media (prefers-reduced-motion: reduce) {
          .mp-eh-tour, .mp-eh-tour * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {spotlight ? (
        <>
          {/* Scrim z57 — intercepts every pointer event, fully inert (§1.1:
              no backdrop-dismiss, no tap-to-advance; cutout is NOT a button). */}
          <svg
            width="100%"
            height="100%"
            style={{ position: "fixed", inset: 0, zIndex: 57, pointerEvents: "auto" }}
            aria-hidden="true"
          >
            <defs>
              <mask id="mp-entrance-cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect x={l_} y={t_} width={w_} height={h_} rx={r} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(64,59,54,0.45)" mask="url(#mp-entrance-cutout)" />
          </svg>
          {/* GOLD spotlight ring z58 — static (non-pulsing) under reduced motion;
              the highlight must never disappear entirely (§6.2). */}
          <div
            style={{
              position: "fixed",
              top: t_, left: l_, width: w_, height: h_,
              zIndex: 58,
              borderRadius: `${rRem}rem`,
              border: `0.1875rem solid ${GOLD}`,
              animation: reducedMotion ? "none" : "mpEhPulse 2s ease-in-out infinite",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      ) : (
        // Full scrim for centered-card steps — same 0.45, equally inert.
        <div
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, zIndex: 57, background: "rgba(64,59,54,0.45)", pointerEvents: "auto" }}
        />
      )}

      {card}
    </div>
  );

  return createPortal(overlay, document.body);
}

// NOTE: the former `useEntranceHallTutorial(shouldShow)` auto-open hook was
// removed long ago (dead code). The live auto-open path is the MemoryPalace
// effect driving `useEntranceTourStore` — the store above stays the single
// source of truth.
