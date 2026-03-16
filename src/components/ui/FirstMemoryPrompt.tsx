"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { Wing, WingRoom } from "@/lib/constants/wings";

interface FirstMemoryPromptProps {
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onUpload: () => void;
}

export default function FirstMemoryPrompt({ wing, room, onUpload }: FirstMemoryPromptProps) {
  const isMobile = useIsMobile();
  const accent = wing?.accent || T.color.terracotta;

  return (
    <div style={{
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
        borderRadius: 24,
        padding: isMobile ? "32px 28px" : "40px 44px",
        border: `1.5px solid ${T.color.cream}`,
        boxShadow: "0 16px 64px rgba(44,44,42,.18)",
        maxWidth: isMobile ? 320 : 380,
        width: isMobile ? "calc(100vw - 48px)" : "auto",
      }}>
        {/* Room icon */}
        <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>
          {room?.icon || "\uD83D\uDCF7"}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? 22 : 26,
          fontWeight: 500,
          color: T.color.charcoal,
          marginBottom: 10,
          lineHeight: 1.2,
        }}>
          This room is waiting for you
        </h3>

        {/* Description */}
        <p style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? 14 : 15,
          color: T.color.muted,
          lineHeight: 1.6,
          marginBottom: 24,
          maxWidth: 300,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          Add your first photo, video, or story to bring <strong style={{ color: T.color.walnut }}>{room?.name || "this room"}</strong> to life.
        </p>

        {/* Upload button */}
        <button
          onClick={onUpload}
          style={{
            fontFamily: T.font.body,
            fontSize: isMobile ? 17 : 16,
            fontWeight: 600,
            padding: isMobile ? "15px 36px" : "13px 36px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${accent}, ${T.color.walnut})`,
            color: "#FFF",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${accent}40`,
            transition: "transform 0.15s, box-shadow 0.15s",
            minHeight: 48,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "none";
          }}
        >
          + Add First Memory
        </button>

        {/* Subtle hint */}
        <p style={{
          fontFamily: T.font.body,
          fontSize: 12,
          color: `${T.color.muted}88`,
          marginTop: 14,
          lineHeight: 1.4,
        }}>
          Photos, videos, documents, or voice notes
        </p>
      </div>
    </div>
  );
}
