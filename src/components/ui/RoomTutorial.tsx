"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, SHADOW, RT } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTouchControls } from "@/lib/hooks/useIsMobile";

const STORAGE_KEY = "mp_room_tour_seen_v1";

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

/**
 * Single-card room tutorial — all info in one centered overlay.
 */
export default function RoomTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("roomTour");
  // Touch-based: the item list explains joystick vs WASD movement, so it must
  // match the joystick's render condition (never viewport width alone).
  const isMobile = useTouchControls();
  const [mounted, setMounted] = useState(false);
  const doneRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Escape-to-dismiss + move focus to the primary action while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    const focusId = setTimeout(() => doneRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(focusId);
      try { prev?.focus?.(); } catch {}
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const cardBg = CREAM;
  const cardBorder = HAIRLINE;
  const cardShadow = SHADOW[2];

  const items: string[] = isMobile
    ? [t("item1"), t("item2"), t("item3"), t("item4"), t("item5")]
    : [t("dItem1"), t("dItem2"), t("dItem3"), t("dItem4"), t("dItem5")];

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("overviewTitle")}
      style={{ position: "fixed", inset: 0, zIndex: 57 }}
    >
      <style>{`
        @keyframes mpRtCardIn { from { opacity:0; transform:translateY(0.75rem) scale(0.97);} to { opacity:1; transform:translateY(0) scale(1);} }
      `}</style>

      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(36,28,21,0.5)", pointerEvents: "auto" }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(22rem, calc(100vw - 2.5rem))",
          maxHeight: "calc(100dvh - 3rem)",
          overflowY: "auto",
          animation: "mpRtCardIn .3s ease both",
        }}
      >
        <div
          style={{
            background: cardBg,
            borderRadius: "1rem",
            padding: "1.25rem 1.25rem 1rem",
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {/* Title */}
          <div style={{
            fontFamily: T.font.display,
            fontSize: RT.titleS,
            fontWeight: 600,
            color: INK,
            letterSpacing: "0.02em",
          }}>
            {t("overviewTitle")}
          </div>

          {/* Bullet list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{
                  color: EMBER_GLYPH,
                  fontSize: "0.5rem",
                  lineHeight: "1.375rem",
                  flexShrink: 0,
                }}>{"\u25C6"}</span>
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: RT.meta,
                  color: INK,
                  lineHeight: 1.5,
                }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            fontFamily: T.font.body,
            fontSize: RT.overline,
            color: MUTED,
            fontStyle: "italic",
            lineHeight: 1.4,
            marginTop: "0.125rem",
          }}>
            {t("overviewFooter")}
          </div>

          {/* Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.125rem" }}>
            <button
              ref={doneRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                fontFamily: T.font.body,
                fontSize: RT.meta,
                fontWeight: 600,
                color: "#FFF",
                background: EMBER,
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.5rem",
                minHeight: T.touch,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {t("done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export function useRoomTutorial(shouldShow: boolean): [boolean, (v: boolean) => void] {
  const open = useRoomTourStore((s) => s.open);
  const setOpen = useRoomTourStore((s) => s.setOpen);
  useEffect(() => {
    if (!shouldShow) return;
    try {
      if (typeof window === "undefined") return;
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setTimeout(() => setOpen(true), 800);
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {}
  }, [shouldShow, setOpen]);
  return [open, setOpen];
}
