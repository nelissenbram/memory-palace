"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { INK, MUTED, HAIRLINE, SHADOW } from "@/lib/libraryTokens";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

const STORAGE_PREFIX = "mp_ctx_tooltip_";

type TooltipId =
  | "corridor_click_door"
  | "room_click_furniture";

interface TooltipConfig {
  id: TooltipId;
  messageKey: string;
  position: "bottom-center" | "center";
}

const TOOLTIP_DEFS: Record<string, TooltipConfig> = {
  corridor_click_door: {
    id: "corridor_click_door",
    messageKey: "doorHint",
    position: "bottom-center",
  },
  room_click_furniture: {
    id: "room_click_furniture",
    messageKey: "furnitureHint",
    position: "bottom-center",
  },
  // room_empty_upload retired (PALACE_TUTORIAL_SPEC §4.1) — its copy described
  // the pre-Steward's-Ledger empty-room flow.
};

function hasBeenShown(id: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === "true";
  } catch {
    return false;
  }
}

function markShown(id: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, "true");
  } catch {}
}

interface ContextualTooltipProps {
  /** Which tooltip to potentially show */
  tooltipId: TooltipId;
  /** Whether the conditions for showing this tooltip are met */
  show: boolean;
  /** Delay before showing in ms (default 1200) */
  delay?: number;
}

export default function ContextualTooltip({
  tooltipId,
  show,
  delay = 1200,
}: ContextualTooltipProps) {
  const { t } = useTranslation("contextualTooltip");
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!show || dismissed) {
      setVisible(false);
      return;
    }
    if (hasBeenShown(tooltipId)) {
      return;
    }

    const timer = setTimeout(() => {
      if (!hasBeenShown(tooltipId)) {
        setVisible(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [tooltipId, show, delay, dismissed]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleDismiss = () => {
    markShown(tooltipId);
    setDismissed(true);
    setVisible(false);
  };

  if (!visible) return null;

  const config = TOOLTIP_DEFS[tooltipId];
  if (!config) return null;

  const isCenter = config.position === "center";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleDismiss}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleDismiss(); } }}
      className="mp-ctx-tooltip-anim"
      style={{
        position: "absolute",
        zIndex: 75,
        pointerEvents: "auto",
        cursor: "pointer",
        ...(isCenter
          ? {
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }
          : {
              bottom: isMobile ? "calc(5.625rem + env(safe-area-inset-bottom, 0px))" : "3.75rem",
              left: "50%",
              transform: "translateX(-50%)",
            }),
        animation: "fadeUp .5s ease",
      }}
    >
      <style>{`@media (prefers-reduced-motion: reduce) { .mp-ctx-tooltip-anim, .mp-ctx-tooltip-anim * { animation: none !important; } }`}</style>
      {/* Canon card: translucent cream + blur (floats over the live 3D scene) */}
      <div
        style={{
          background: "rgba(252,250,245,0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "0.875rem",
          padding: isMobile ? "0.875rem 1.375rem" : "1rem 1.75rem",
          border: `1px solid ${HAIRLINE}`,
          boxShadow: SHADOW[2],
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          maxWidth: isMobile ? "calc(100vw - 2.5rem)" : "25rem",
        }}
      >
        {/* Glowing dot \u2014 canon GOLD #D4AF37 */}
        <div
          style={{
            width: "0.625rem",
            height: "0.625rem",
            borderRadius: "0.3125rem",
            background:
              "radial-gradient(circle, #FFE4A0 0%, #D4AF37 60%, transparent 100%)",
            boxShadow: "0 0 10px rgba(212,175,55,0.6)",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? "0.9375rem" : "1rem",
            color: INK,
            lineHeight: 1.4,
          }}
        >
          {t(config.messageKey)}
        </span>

        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: MUTED,
            flexShrink: 0,
            marginLeft: "0.25rem",
          }}
        >
          {"\u2715"}
        </span>
      </div>
    </div>
  );
}
