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
  contentStyle?: React.CSSProperties;
}

/**
 * Shared full-screen / bottom-sheet primitive. Handles the systemic portrait failures in one
 * place: top/bottom safe-area insets (no close-under-island / submit-under-home-indicator),
 * 100dvh, body scroll-lock + focus trap (via useFocusTrap), an internal momentum-scroll region,
 * a 44pt close button, and switching from vertical-center to top-aligned in landscape so
 * content never clips. (Swipe-to-dismiss + grab handle are a future v2.)
 */
export function Sheet({
  open, onClose, children, title,
  bottomSheet = true, side = "center", maxWidth, background = T.color.linen, hideClose, contentStyle,
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
          paddingTop: `max(${T.space.md}, ${T.safe.top})`,
          paddingBottom: `max(${T.space.lg}, ${T.safe.bottom})`,
          paddingLeft: `max(${T.space.md}, ${T.safe.left})`,
          paddingRight: `max(${T.space.md}, ${T.safe.right})`,
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: T.space.sm, marginBottom: T.space.md }}>
            <div style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.charcoal, minWidth: 0 }}>{title}</div>
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
