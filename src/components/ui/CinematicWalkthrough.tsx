"use client";
import { useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { WINGS } from "@/lib/constants/wings";
import { useRoomStore } from "@/lib/stores/roomStore";

// Wing index for directional indicator angle
const WING_INDEX: Record<string, number> = { family: 0, travel: 1, childhood: 2, career: 3, creativity: 4 };

export default function CinematicWalkthrough() {
  const isMobile = useIsMobile();
  const { t } = useTranslation("walkthrough");
  const { phase, isActive, targetWing, targetRoom, advancePhase, skip } = useWalkthroughStore();
  const view = usePalaceStore((s) => s.view);
  const userName = useUserStore((s) => s.userName);
  const { getWingRooms } = useRoomStore();
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase advances based on view changes
  useEffect(() => {
    if (!isActive) return;
    if (view === "entrance" && phase === 0) advancePhase(); // 0→1
    if (view === "corridor" && phase === 2) advancePhase(); // 2→3
    if (view === "room" && phase === 3) advancePhase();     // 3→4
  }, [view, phase, isActive, advancePhase]);

  // Auto-advance: Phase 1→2 after 3.5s, Phase 4→5 after 2.5s
  useEffect(() => {
    if (!isActive) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (phase === 1) {
      autoTimer.current = setTimeout(advancePhase, 3500);
    } else if (phase === 4) {
      autoTimer.current = setTimeout(advancePhase, 2500);
    }
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [phase, isActive, advancePhase]);

  if (!isActive || phase >= 5) return null;

  const wingData = targetWing ? WINGS.find((w) => w.id === targetWing) : null;
  const wingName = wingData?.name || "";
  const roomData = targetWing && targetRoom ? getWingRooms(targetWing).find((r) => r.id === targetRoom) : null;
  const roomName = roomData?.name || "";

  // Narration text per phase
  let narration = "";
  switch (phase) {
    case 0:
      narration = isMobile
        ? t("phase0Mobile", { name: userName || "explorer" })
        : t("phase0", { name: userName || "explorer" });
      break;
    case 1:
      narration = t("phase1");
      break;
    case 2:
      narration = isMobile
        ? t("phase2Mobile", { wingName })
        : t("phase2Desktop", { wingName });
      break;
    case 3:
      narration = t("phase3", { wingName, roomName });
      break;
    case 4:
      narration = t("phase4", { roomName });
      break;
  }

  // Directional indicator config
  const showArrow = phase === 0 || phase === 2 || phase === 3;
  let arrowStyle: React.CSSProperties = {};
  let arrowLabel = "";

  if (phase === 0) {
    // Point at entrance — center of screen
    arrowStyle = {
      position: "absolute", left: "50%", top: "45%",
      transform: "translate(-50%, -50%)",
    };
    arrowLabel = t("clickEntrance");
  } else if (phase === 2 && targetWing) {
    // Point toward wing door — calculate angle from hall center
    const idx = WING_INDEX[targetWing] ?? 0;
    let angle = (idx / 5) * Math.PI * 2 - Math.PI / 2;
    while (angle < 0) angle += Math.PI * 2;
    const radius = isMobile ? 28 : 32; // % from center
    const cx = 50 + Math.cos(angle) * radius;
    const cy = 50 + Math.sin(angle) * radius;
    arrowStyle = {
      position: "absolute", left: `${cx}%`, top: `${cy}%`,
      transform: "translate(-50%, -50%)",
    };
    arrowLabel = wingName;
  } else if (phase === 3) {
    // Point forward down corridor
    arrowStyle = {
      position: "absolute", left: "50%", top: "40%",
      transform: "translate(-50%, -50%)",
    };
    arrowLabel = roomName;
  }

  return (
    <>
      <style>{`
        @keyframes wtNarrationIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes wtPulse { 0%,100% { transform:translate(-50%,-50%) scale(1); opacity:.9; } 50% { transform:translate(-50%,-50%) scale(1.3); opacity:.5; } }
        @keyframes wtChevron { 0%,100% { transform:translate(-50%,-50%) translateY(0); } 50% { transform:translate(-50%,-50%) translateY(-6px); } }
      `}</style>

      {/* Narration bubble */}
      <div key={phase} style={{
        position: "absolute",
        bottom: isMobile ? 140 : 80,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: isMobile ? "calc(100vw - 40px)" : 560,
        zIndex: 80,
        background: "rgba(42,34,24,0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 24,
        padding: "18px 28px 14px",
        textAlign: "center",
        animation: "wtNarrationIn 0.8s ease both",
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? 17 : 19,
          fontWeight: 400,
          color: "#F5F0E8",
          lineHeight: 1.5,
          letterSpacing: "0.01em",
        }}>
          {narration}
        </div>
        <button onClick={skip} style={{
          marginTop: 10,
          background: "none",
          border: "none",
          fontFamily: T.font.body,
          fontSize: 12,
          color: "rgba(245,240,232,0.5)",
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}>
          {t("skipIntro")}
        </button>
      </div>

      {/* Directional indicator */}
      {showArrow && (
        <div style={{ ...arrowStyle, zIndex: 79, pointerEvents: "none" }}>
          {/* Pulsing golden ring */}
          <div style={{
            width: 96, height: 96, borderRadius: 48,
            border: `3px solid ${T.color.gold}`,
            background: `${T.color.gold}22`,
            animation: "wtPulse 1.5s ease-in-out infinite",
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
          }} />
          {/* Chevron */}
          <div style={{
            position: "absolute", left: "50%", top: -24,
            transform: "translate(-50%, -50%)",
            animation: "wtChevron 1.2s ease-in-out infinite",
            fontSize: 22,
            color: T.color.gold,
            textShadow: "0 2px 8px rgba(212,175,55,.5)",
          }}>
            ▼
          </div>
          {/* Label */}
          {arrowLabel && (
            <div style={{
              position: "absolute", left: "50%", top: 60,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              fontFamily: T.font.body,
              fontSize: 13,
              fontWeight: 600,
              color: T.color.gold,
              textShadow: "0 1px 6px rgba(0,0,0,.5)",
              letterSpacing: "0.03em",
            }}>
              {arrowLabel}
            </div>
          )}
        </div>
      )}
    </>
  );
}
