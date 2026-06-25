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
  bottomSheet = true, background = T.color.linen, hideClose, contentStyle,
}: SheetProps) {
  const { containerRef, handleKeyDown } = useFocusTrap(open);
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();

  if (!open) return null;

  const asBottomSheet = isMobile && isPortrait && bottomSheet;

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
        justifyContent: "center",
        // Vertically center on desktop; pin to the bottom on a phone; top-align in landscape.
        alignItems: asBottomSheet ? "flex-end" : isPortrait ? "center" : "flex-start",
      }}
    >
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className="mp-scroll"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: asBottomSheet ? "100%" : "32rem",
          maxHeight: asBottomSheet ? "92dvh" : "100dvh",
          height: asBottomSheet ? undefined : isMobile ? "100dvh" : undefined,
          overflowY: "auto",
          background,
          borderRadius: asBottomSheet ? `${T.radius.xl} ${T.radius.xl} 0 0` : isMobile ? 0 : T.radius.lg,
          paddingTop: `max(${T.space.md}, ${T.safe.top})`,
          paddingBottom: `max(${T.space.lg}, ${T.safe.bottom})`,
          paddingLeft: `max(${T.space.md}, ${T.safe.left})`,
          paddingRight: `max(${T.space.md}, ${T.safe.right})`,
          boxSizing: "border-box",
          ...contentStyle,
        }}
      >
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
