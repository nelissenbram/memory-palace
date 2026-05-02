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
const WING_INDEX: Record<string, number> = { roots: 0, nest: 1, craft: 2, travel: 3, passions: 4 };

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
        ? t("phase0Mobile", { name: userName || t("explorer") })
        : t("phase0", { name: userName || t("explorer") });
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
        @keyframes wtNarrationIn { from { opacity:0; transform:translateY(0.75rem); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Narration bubble */}
      <div key={phase} style={{
        position: "absolute",
        bottom: isMobile ? "calc(11rem + env(safe-area-inset-bottom, 0px))" : "5rem",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: isMobile ? "calc(100vw - 2.5rem)" : "35rem",
        zIndex: 80,
        background: `${T.color.charcoal}CC`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "1.5rem",
        padding: "1.125rem 1.75rem 0.875rem",
        textAlign: "center",
        animation: "wtNarrationIn 0.8s ease both",
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "1.0625rem" : "1.1875rem",
          fontWeight: 500,
          color: T.color.linen,
          lineHeight: 1.5,
          letterSpacing: "0.01em",
        }}>
          {narration}
        </div>
        <button onClick={skip} aria-label={t("skipIntroAriaLabel")} style={{
          marginTop: "0.625rem",
          background: "none",
          border: "none",
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: `${T.color.linen}80`,
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: "0.1875rem",
        }}>
          {t("skipIntro")}
        </button>
      </div>
    </>
  );
}
