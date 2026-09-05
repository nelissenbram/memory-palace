"use client";

import React from "react";
import { T } from "@/lib/theme";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { IconButton } from "@/components/ui/IconButton";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional title shown next to the close button. */
  title?: React.ReactNode;
  /** Bottom-anchored rounded sheet on phones (default). When false, full-screen takeover. */
  bottomSheet?: boolean;
  /** Desktop/tablet anchoring: "center" (default modal) or "right" (right-anchored,
   *  full-height side sheet that slides in from the edge). Phones keep the bottom-sheet. */
  side?: "center" | "right";
  /** Max width of the panel surface on desktop (side sheets can opt for a wider rail). */
  maxWidth?: string;
  /** Background of the panel surface. */
  background?: string;
  /** Hide the built-in close button (panel provides its own). */
  hideClose?: boolean;
  /** Content spans the full sheet width (edge-to-edge toolbars/borders): the sheet
   *  drops its own left/right/bottom padding while the header row keeps its insets.
   *  Panels are then responsible for their own horizontal and bottom padding. */
  fullBleed?: boolean;
  /** Glyph shown in a tinted medallion before the title — pass the SAME RelayIcons
   *  glyph as the Atrium tile that opens this sheet, so tile and sheet stay aligned. */
  icon?: React.ReactNode;
  /** Medallion tint, matching the Atrium lane the opening tile lives in. */
  iconTint?: "gold" | "sage" | "terracotta";
  contentStyle?: React.CSSProperties;
}

/* Medallion tints per Atrium lane (bg well / hairline ring / glyph ink) —
 * gold: Bring to Life + relay chips; sage: Share & Pass on; terracotta: Capture. */
const ICON_TINTS = {
  gold: { bg: "rgba(169,116,27,0.16)", ring: "#E9DCBE", fg: "#8A6410" },
  sage: { bg: "rgba(74,103,65,0.14)", ring: "#D9DFD2", fg: "#4A6741" },
  terracotta: { bg: "rgba(154,79,42,0.13)", ring: "#E9D2C2", fg: "#9A4F2A" },
} as const;

/**
 * Shared full-screen / bottom-sheet primitive. Handles the systemic portrait failures in one
 * place: top/bottom safe-area insets (no close-under-island / submit-under-home-indicator),
 * 100dvh, body scroll-lock + focus trap (via useFocusTrap), an internal momentum-scroll region,
 * a 44pt close button, and switching from vertical-center to top-aligned in landscape so
 * content never clips. (Swipe-to-dismiss + grab handle are a future v2.)
 */
export function Sheet({
  open, onClose, children, title,
  bottomSheet = true, side = "center", maxWidth, background = T.color.linen, hideClose, fullBleed, icon, iconTint = "gold", contentStyle,
}: SheetProps) {
  const { containerRef, handleKeyDown } = useFocusTrap(open);
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();

  if (!open) return null;

  const asBottomSheet = isMobile && isPortrait && bottomSheet;
  // Right-anchored side sheet on non-phone widths (phones keep the bottom-sheet).
  const asSideSheet = side === "right" && !asBottomSheet;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(20,16,12,0.55)",
        display: "flex",
        animation: "mp-sheet-scrim-in 0.2s ease",
        justifyContent: asSideSheet ? "flex-end" : "center",
        // Vertically center on desktop; pin to the bottom on a phone; stretch full-height as a side sheet.
        alignItems: asSideSheet ? "stretch" : asBottomSheet ? "flex-end" : isPortrait ? "center" : "flex-start",
      }}
    >
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className={asSideSheet ? "mp-scroll mp-sheet-right" : "mp-scroll"}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: asBottomSheet ? "100%" : maxWidth || (asSideSheet ? "30rem" : "32rem"),
          maxHeight: asBottomSheet ? "92dvh" : "100dvh",
          height: asBottomSheet ? undefined : (asSideSheet || isMobile) ? "100dvh" : undefined,
          overflowY: "auto",
          background,
          borderRadius: asBottomSheet ? `${T.radius.xl} ${T.radius.xl} 0 0` : (asSideSheet || isMobile) ? 0 : T.radius.lg,
          // Full-height side sheets get a roomier top inset so the title never
          // sits pressed against the screen edge.
          paddingTop: `max(${asSideSheet ? T.space.lg : T.space.md}, ${T.safe.top})`,
          paddingBottom: fullBleed ? 0 : `max(${T.space.lg}, ${T.safe.bottom})`,
          paddingLeft: fullBleed ? 0 : `max(${T.space.md}, ${T.safe.left})`,
          paddingRight: fullBleed ? 0 : `max(${T.space.md}, ${T.safe.right})`,
          boxSizing: "border-box",
          animation: asSideSheet ? "mp-sheet-slide-right 0.3s cubic-bezier(0.22,1,0.36,1)" : undefined,
          boxShadow: asSideSheet ? "-1.25rem 0 3rem rgba(20,16,12,0.28)" : undefined,
          ...contentStyle,
        }}
      >
        <style>{`
          @keyframes mp-sheet-scrim-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes mp-sheet-slide-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
          @media (prefers-reduced-motion: reduce) {
            .mp-sheet-right { animation: none !important; }
          }
        `}</style>
        {(title || !hideClose) && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: T.space.sm, marginBottom: T.space.md,
            paddingLeft: fullBleed ? `max(${T.space.lg}, ${T.safe.left})` : undefined,
            paddingRight: fullBleed ? `max(${T.space.lg}, ${T.safe.right})` : undefined,
          }}>
            {icon && (
              <span aria-hidden="true" style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", flexShrink: 0,
                background: ICON_TINTS[iconTint].bg,
                border: `0.0625rem solid ${ICON_TINTS[iconTint].ring}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.08)",
              }}>
                <span style={{ width: "1.5rem", height: "1.5rem", display: "inline-flex", color: ICON_TINTS[iconTint].fg }}>{icon}</span>
              </span>
            )}
            <div style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.charcoal, minWidth: 0, flex: 1 }}>{title}</div>
            {!hideClose && (
              <IconButton onClick={onClose} aria-label="Close" round style={{ color: T.color.walnut, fontSize: "1.25rem" }}>
                {"✕"}
              </IconButton>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
