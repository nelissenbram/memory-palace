"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

const STORAGE_PREFIX = "mp_ctx_tooltip_";

type TooltipId =
  | "corridor_click_door"
  | "room_click_furniture"
  | "room_empty_upload";

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
  room_empty_upload: {
    id: "room_empty_upload",
    messageKey: "emptyRoomHint",
    position: "center",
  },
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
      onClick={handleDismiss}
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
              bottom: isMobile ? "5.625rem" : "3.75rem",
              left: "50%",
              transform: "translateX(-50%)",
            }),
        animation: "fadeUp .5s ease",
      }}
    >
      <div
        style={{
          background: "rgba(42, 34, 24, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "1rem",
          padding: isMobile ? "0.875rem 1.375rem" : "1rem 1.75rem",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          maxWidth: isMobile ? "calc(100vw - 2.5rem)" : "25rem",
        }}
      >
        {/* Glowing dot */}
        <div
          style={{
            width: "0.625rem",
            height: "0.625rem",
            borderRadius: "0.3125rem",
            background:
              "radial-gradient(circle, #FFEEBB 0%, #FFD080 60%, transparent 100%)",
            boxShadow: "0 0 12px rgba(255, 224, 160, 0.5)",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? "0.9375rem" : "1rem",
            color: "rgba(250, 250, 247, 0.92)",
            lineHeight: 1.4,
          }}
        >
          {t(config.messageKey)}
        </span>

        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: "rgba(250, 250, 247, 0.35)",
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
