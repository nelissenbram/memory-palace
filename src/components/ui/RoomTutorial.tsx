"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTouchControls, useIsMobile, useReducedMotion } from "@/lib/hooks/useIsMobile";
import { muteTutorials } from "@/lib/tutorialMute";

interface RoomTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const useRoomTourStore = create<RoomTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

interface Props {
  open: boolean;
  onClose: () => void;
}

// EN fallback copy (PALACE_TUTORIAL_SPEC.md §2.4/§2.5) — shown verbatim until
// the i18n agent lands the section values in src/messages/*.json.
const EN_FALLBACK: Record<string, string> = {
  overviewTitle: "Welcome to this room",
  item1: "Wander — joystick to walk, drag to look around.",
  item2: "Tap any memory on the walls to view it full screen — browse the whole room from there, and edit right in the viewer.",
  item3: "Media — opens this room's ledger: bring memories in, write a note, feature one above the fireplace, choose what's shown or archived.",
  item4: "See a play button? This room keeps sound or film — tap it for the player.",
  item5: "The bar up top jumps you to any wing or room.",
  dItem1: "WASD or arrow keys to walk — hold Shift to hurry, drag to look around.",
  dItem2: "Click any memory to view it full screen — browse the whole room from there, and edit right in the viewer.",
  dItem3: "Media — opens this room's ledger: bring memories in, write a note, feature one above the fireplace, choose what's shown or archived.",
  dItem4: "See a play button? This room keeps sound or film — click it for the player.",
  dItem5: "The breadcrumb bar jumps you anywhere, without the walk.",
  overviewFooter: "Every memory finds its own place — photos along the hall, keepsakes in the vitrine, words in the library, sound at the gramophone, film on the screen.",
  skip: "Skip tutorial",
  done: "Got it",
  stepXofY: "Step {x} of {y}",
};

/**
 * Room tour — single centered overview card (spec §2.4), canon card grammar
 * (§1.1): CREAM card, HAIRLINE border, ◆ EMBER_GLYPH bullets, italic MUTED
 * footer, Skip-tutorial ghost button + solid EMBER "Got it".
 *
 * Dismissal semantics (§5.2, scene-tour model):
 *  - "Skip tutorial" → muteTutorials() (only muting action) + close.
 *  - "Got it" / Escape → close WITHOUT muting.
 *  - Scrim is pointer-inert: taps on it do nothing (no tap-to-advance).
 *
 * Auto-fire lives in MemoryPalace's room effect (seen-key mp_room_tour_seen_v2,
 * 3D-gated) — this file only renders. Z stack per §6.1: scrim z57, card z59
 * (separate fixed layers, NOT one flat z57 container, so a concurrent nudge
 * card at z59 can never bury the tour card).
 */
export default function RoomTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("roomTour");
  // Touch-based: the item list explains joystick vs WASD movement, so it must
  // match the joystick's render condition (never viewport width alone). §1.1.
  const isTouch = useTouchControls();
  // Layout hook drives card sizing only (§1.1 grammar: useTouchControls is for
  // copy/input modality; useIsMobile for sizes/positions).
  const isMobileLayout = useIsMobile();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const doneRef = useRef<HTMLButtonElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showFade, setShowFade] = useState(false);

  // Graceful i18n: t() echoes the key when a locale value is missing — fall
  // back to the spec's EN copy so the card never shows raw keys.
  const tr = useCallback(
    (key: string, params?: Record<string, string>): string => {
      const value = t(key, params);
      if (value !== key) return value;
      let fb = EN_FALLBACK[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) fb = fb.split(`{${k}}`).join(v);
      return fb;
    },
    [t]
  );

  useEffect(() => { setMounted(true); }, []);

  // Escape closes WITHOUT muting (§5.2) + focus management (§1.1 a11y):
  // primary auto-focused, focus trap Skip↔Got it, focus restored on close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key === "Tab") {
        const first = skipRef.current;
        const last = doneRef.current;
        if (!first || !last) return;
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || (active !== last)) { e.preventDefault(); (active === first ? last : first).focus(); }
        } else {
          if (active === last || (active !== first)) { e.preventDefault(); (active === last ? first : last).focus(); }
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    const prev = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    const focusId = setTimeout(() => doneRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      clearTimeout(focusId);
      try { prev?.focus?.(); } catch {}
    };
  }, [open, onClose]);

  // Scroll-fade affordance (§6.1): when long DE/FR copy overflows the card, a
  // bottom gradient signals scrollability; it hides at the scroll end.
  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflowing = el.scrollHeight - el.clientHeight > 4;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowFade(overflowing && !atEnd);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(updateFade, 0);
    window.addEventListener("resize", updateFade);
    return () => { clearTimeout(id); window.removeEventListener("resize", updateFade); };
  }, [open, updateFade, isTouch]);

  if (!mounted || !open) return null;

  const items: string[] = isTouch
    ? [tr("item1"), tr("item2"), tr("item3"), tr("item4"), tr("item5")]
    : [tr("dItem1"), tr("dItem2"), tr("dItem3"), tr("dItem4"), tr("dItem5")];

  const overlay = (
    <>
      <style>{`
        @keyframes mpRtCardIn { from { opacity:0; transform:translate(-50%,-50%) translateY(0.75rem) scale(0.97);} to { opacity:1; transform:translate(-50%,-50%) translateY(0) scale(1);} }
        .mp-room-tour-card {
          max-height: calc(100dvh - 4rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
        }
        /* Phone landscape (§6.1): tighter vertical gutter so the card stays readable. */
        @media (max-height: 26rem) {
          .mp-room-tour-card { max-height: calc(100dvh - 3rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-room-tour-wrap, .mp-room-tour-card { animation: none !important; transition: none !important; }
        }
        .mp-room-tour-sronly {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
      `}</style>

      {/* Scrim — z57, pointer-inert (§5.2: stray touch grazes must never act). */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 57,
          background: "rgba(64,59,54,0.45)",
          pointerEvents: "auto",
        }}
      />

      {/* Card — z59 (own fixed layer so nudge cards can't bury it, §6.1). */}
      <div
        className="mp-room-tour-wrap"
        role="dialog"
        aria-modal="true"
        aria-label={tr("overviewTitle")}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 59,
          width: isMobileLayout ? "calc(100vw - 2rem)" : "22rem",
          maxWidth: "min(24rem, calc(100vw - 2rem - env(safe-area-inset-left) - env(safe-area-inset-right)))",
          animation: reducedMotion ? "none" : "mpRtCardIn .3s ease both",
        }}
      >
        {/* aria-only step announcement (§1.1/§2.5 — deliberate a11y addition). */}
        <div className="mp-room-tour-sronly" aria-live="polite">
          {tr("stepXofY", { x: "1", y: "1" })}
        </div>

        <div
          className="mp-room-tour-card"
          style={{
            background: CREAM,
            borderRadius: "1rem",
            border: `1px solid ${HAIRLINE}`,
            boxShadow: SHADOW[2],
            padding: "1.25rem 1.25rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            minHeight: 0,
          }}
        >
          {/* Scrollable BODY only — the Skip/Got-it row is pinned below the
              scroll region (canon: controls never scroll away under long DE/FR
              copy, and the fade paints over the body, not the buttons). */}
          <div style={{ position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              ref={scrollRef}
              onScroll={updateFade}
              style={{
                overflowY: "auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {/* Title — Fraunces 600 INK (§1.1) */}
              <div style={{
                fontFamily: T.font.display,
                fontSize: RT.titleS,
                fontWeight: 600,
                color: INK,
                letterSpacing: "0.02em",
              }}>
                {tr("overviewTitle")}
              </div>

              {/* ◆ bullet list — canon overview anatomy (NudgeTooltip): INK item
                  text (MUTED is reserved for the italic footer), 1.375rem glyph
                  line, 0.625rem item gap, 0.4375rem list gap. */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4375rem" }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
                    <span style={{
                      color: EMBER_GLYPH,
                      fontSize: "0.5rem",
                      lineHeight: "1.375rem",
                      flexShrink: 0,
                    }}>{"◆"}</span>
                    <span style={{
                      fontFamily: T.font.body,
                      fontSize: RT.meta,
                      color: INK,
                      lineHeight: 1.5,
                    }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Footer note — 0.75rem MUTED italic (§1.1) */}
              <div style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: MUTED,
                fontStyle: "italic",
                lineHeight: 1.4,
                marginTop: "0.125rem",
              }}>
                {tr("overviewFooter")}
              </div>
            </div>

            {/* Scroll fade — over the body only, while more lies below (§6.1). */}
            {showFade && (
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

          {/* Buttons — Skip (ghost MUTED, mutes all scene tours) · Got it (EMBER).
              Pinned outside the scroll region; sibling-tour typography (500-weight
              ghost, 0.75rem canon floor labels, 0.4375/1.125 CTA padding). */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.125rem",
            flex: "0 0 auto",
          }}>
            <button
              ref={skipRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); muteTutorials(); onClose(); }}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                fontWeight: 500,
                color: MUTED,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.4375rem 0.5rem",
                minHeight: T.touch,
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = INK; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; }}
            >
              {tr("skip")}
            </button>
            <button
              ref={doneRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#FFF",
                background: EMBER,
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.4375rem 1.125rem",
                minHeight: T.touch,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {tr("done")}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}
