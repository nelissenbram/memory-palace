"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Wing, WingRoom } from "@/lib/constants/wings";

interface FirstMemoryPromptProps {
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onUpload: () => void;
}

export default function FirstMemoryPrompt({ wing, room, onUpload }: FirstMemoryPromptProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("firstMemoryPrompt");
  const accent = wing?.accent || T.color.terracotta;

  return (
    <div role="dialog" aria-modal="true" aria-label={t("title")} style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 35,
      textAlign: "center",
      animation: "fadeUp .6s ease .5s both",
      pointerEvents: "auto",
    }}>
      <div style={{
        background: `${T.color.white}f0`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "1.5rem",
        padding: isMobile ? "2rem 1.75rem" : "2.5rem 2.75rem",
        border: `0.09375rem solid ${T.color.cream}`,
        boxShadow: "0 1rem 4rem rgba(44,44,42,.18)",
        maxWidth: isMobile ? "20rem" : "23.75rem",
        width: isMobile ? "calc(100vw - 3rem)" : "auto",
      }}>
        {/* Room icon */}
        <div style={{ fontSize: "3rem", marginBottom: "1rem", lineHeight: 1 }}>
          {room?.icon || "\uD83D\uDCF7"}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "1.375rem" : "1.625rem",
          fontWeight: 500,
          color: T.color.charcoal,
          marginBottom: "0.625rem",
          lineHeight: 1.2,
        }}>
          {t("title")}
        </h3>

        {/* Description */}
        <p style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? "0.875rem" : "0.9375rem",
          color: T.color.muted,
          lineHeight: 1.6,
          marginBottom: "1.5rem",
          maxWidth: "18.75rem",
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          {t("description", { roomName: room?.name || t("thisRoom") })}
        </p>

        {/* Upload button */}
        <button
          onClick={onUpload}
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? "1.0625rem" : "1rem",
            fontWeight: 600,
            padding: isMobile ? "0.9375rem 2.25rem" : "0.8125rem 2.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${accent}, ${T.color.walnut})`,
            color: "#FFF",
            cursor: "pointer",
            boxShadow: `0 0.25rem 1rem ${accent}40`,
            transition: "transform 0.15s, box-shadow 0.15s",
            minHeight: "3rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "none";
          }}
        >
          {t("addFirstMemory")}
        </button>

        {/* Subtle hint */}
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: `${T.color.muted}88`,
          marginTop: "0.875rem",
          lineHeight: 1.4,
        }}>
          {t("hint")}
        </p>
      </div>
    </div>
  );
}
