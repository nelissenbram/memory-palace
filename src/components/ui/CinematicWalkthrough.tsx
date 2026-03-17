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

  return (
    <>
      <style>{`
        @keyframes wtNarrationIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
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
    </>
  );
}
