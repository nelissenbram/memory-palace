"use client";
import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/theme";
import { INK, MUTED, CREAM, HAIRLINE, EMBER, SAGE, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
// Store-only imports (same pattern as MemoryPalace.tsx:100-106) — §5.4: the
// touch hint must never render while a scene tour is open.
import { usePalaceTourStore } from "@/components/ui/PalaceExteriorTutorial";
import { useEntranceTourStore } from "@/components/ui/EntranceHallTutorial";
import { useCorridorTourStore } from "@/components/ui/CorridorTutorial";
import { useRoomTourStore } from "@/components/ui/RoomTutorial";

// Per-context keys so the room diagram is guaranteed to show on first room
// entry even after the corridor/entrance hint has already been dismissed.
const LS_KEY_CORRIDOR = "mp_touch_tutorial_seen_corridor";
const LS_KEY_ROOM = "mp_touch_tutorial_seen_room";

interface TouchControlsOverlayProps {
  view: string;
}

export default function TouchControlsOverlay({ view }: TouchControlsOverlayProps) {
  const { t } = useTranslation("touchControls");
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Pause the auto-dismiss timer while the overlay (or a child, e.g. the
  // "Got it" button) has focus, so keyboard / assistive-tech users aren't
  // raced off the hint mid-read (cognitive pacing).
  const [paused, setPaused] = useState(false);
  // Accumulated non-paused time already spent showing the hint (ms).
  const elapsedRef = useRef(0);

  // Scene-tour suppression (PALACE_TUTORIAL_SPEC §5.4): the touch hint must
  // never render on top of an open scene tour. It may appear after dismissal —
  // its own timer/LS keys are unchanged; while suppressed the timer is held
  // (like focus-pause) so remaining reading time carries over.
  // Each hook is called unconditionally (no short-circuit chain — that would
  // skip hooks and break the rules of hooks once one store reports open).
  const palaceTourOpen = usePalaceTourStore((s) => s.open);
  const entranceTourOpen = useEntranceTourStore((s) => s.open);
  const corridorTourOpen = useCorridorTourStore((s) => s.open);
  const roomTourOpen = useRoomTourStore((s) => s.open);
  const anySceneTourOpen = palaceTourOpen || entranceTourOpen || corridorTourOpen || roomTourOpen;

  // corridor + entrance share the LS key, but the copy is split (§2.6): the
  // hall has no tappable paintings, so it gets its own `entranceHint`; only
  // the room view renders the move/look diagram.
  const isHallOrCorridor = view === "corridor" || view === "entrance";
  const lsKey = isHallOrCorridor ? LS_KEY_CORRIDOR : LS_KEY_ROOM;

  // Graceful fallback for the NEW entranceHint key until all 5 locale files
  // carry it (flat, per-section).
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  useEffect(() => {
    if (view !== "corridor" && view !== "room" && view !== "entrance") return;
    if (localStorage.getItem(lsKey)) return;
    setVisible(true);
    elapsedRef.current = 0;
    setPaused(false);
  }, [view, lsKey]);

  useEffect(() => {
    if (!visible) return;
    // While focused OR while a scene tour is up, hold the timer: don't
    // schedule an auto-hide (§5.4 — the hint may appear after tour dismissal
    // with its remaining time intact).
    if (paused || anySceneTourOpen) return;
    // Auto-hide, but only PERSIST on explicit dismissal. Under reduced-motion
    // give more reading time (cognitive pacing). Time already spent (before a
    // focus-pause) is carried over so blur/re-focus doesn't reset the clock.
    const full = reducedMotion ? 12000 : 6000;
    const remaining = Math.max(0, full - elapsedRef.current);
    const startedAt = Date.now();
    const timer = setTimeout(() => setVisible(false), remaining);
    return () => {
      clearTimeout(timer);
      // Bank the time this run actually spent counting down (only meaningful
      // when we were unpaused, i.e. this branch).
      elapsedRef.current += Date.now() - startedAt;
    };
  }, [visible, paused, reducedMotion, anySceneTourOpen]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(lsKey, "1");
  };

  if (!visible || anySceneTourOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        // Only resume once focus leaves the overlay entirely.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "absolute",
        bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
        left: "1rem",
        right: "1rem",
        zIndex: 46,
        animation: reducedMotion ? "none" : "fadeUp .4s ease",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "rgba(252, 250, 245, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "1rem",
          padding: "1rem 1.25rem",
          border: `1px solid ${HAIRLINE}`,
          boxShadow: SHADOW[2],
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Instruction text */}
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: INK,
            textAlign: "center",
            lineHeight: 1.5,
            letterSpacing: "0.0125rem",
          }}
        >
          {view === "entrance"
            ? tr("entranceHint", "Drag to look around · Tap a door to walk there")
            : view === "corridor"
              ? t("corridorHint")
              : t("roomHint")}
        </div>

        {/* Diagram for room view */}
        {!isHallOrCorridor && (
          <div
            style={{
              display: "flex",
              gap: "0.125rem",
              width: "100%",
              maxWidth: "13.75rem",
              height: "3rem",
              borderRadius: "0.625rem",
              overflow: "hidden",
              border: `1px solid ${HAIRLINE}`,
            }}
          >
            {/* Left half — movement (SAGE) */}
            <div
              style={{
                flex: 1,
                background: "rgba(86, 104, 60, 0.14)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.125rem",
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                style={{ width: "1.25rem", height: "1.25rem" }}
              >
                <circle cx="10" cy="10" r="8" stroke={SAGE} strokeWidth="1.5" fill="none" />
                <circle cx="10" cy="10" r="3" fill={SAGE} />
                <path d="M10 4L10 7M10 13L10 16M4 10L7 10M13 10L16 10" stroke={SAGE} strokeWidth="1" />
              </svg>
              <span style={{ fontFamily: T.font.body, fontSize: RT.overline, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t("move")}</span>
            </div>
            {/* Right half — camera (EMBER) */}
            <div
              style={{
                flex: 1,
                background: "rgba(184, 92, 56, 0.14)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.125rem",
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                style={{ width: "1.25rem", height: "1.25rem" }}
              >
                <circle cx="10" cy="10" r="7" stroke={EMBER} strokeWidth="1.5" fill="none" />
                <path d="M10 5L10 10L14 8" stroke={EMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: T.font.body, fontSize: RT.overline, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t("look")}</span>
            </div>
          </div>
        )}

        {/* Got it button — EMBER CTA */}
        <button
          onClick={dismiss}
          aria-label={t("gotIt")}
          style={{
            background: EMBER,
            border: `1px solid ${EMBER}`,
            borderRadius: "1.375rem",
            minHeight: "2.75rem",
            minWidth: "6rem",
            padding: "0.5rem 1.5rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: CREAM,
            cursor: "pointer",
            letterSpacing: "0.03125rem",
          }}
        >
          {t("gotIt")}
        </button>
      </div>
    </div>
  );
}
