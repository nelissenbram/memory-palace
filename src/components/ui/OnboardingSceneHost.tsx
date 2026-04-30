"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/stores/userStore";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

const ExteriorScene = lazy(() => import("@/components/3d/ExteriorScene"));
const EntranceHallScene = lazy(() => import("@/components/3d/EntranceHallScene"));
const CorridorScene = lazy(() => import("@/components/3d/CorridorScene"));
const InteriorScene = lazy(() => import("@/components/3d/InteriorScene"));

export type OnboardingScene = "exterior" | "entrance" | "corridor" | "room";

interface OnboardingSceneHostProps {
  scene: OnboardingScene;
  autoWalkTo?: string | null;
  onboardingMode?: boolean;
  onRoomClick?: (id: string) => void;
  onDoorClick?: (id: string) => void;
  onReady?: () => void;
  onOnboardingLookDone?: () => void;
  onCinematicPause?: () => void;
  cinematicResumed?: boolean;
  onCinematicStep?: (step: number) => void;
  wingId?: string;
  roomId?: string;
  roomName?: string;
  memories?: any[];
  isMobile?: boolean;
  corridorEnterClicked?: boolean;
  initialCameraZ?: number;
}

export default function OnboardingSceneHost({
  scene,
  autoWalkTo,
  onboardingMode = false,
  onRoomClick,
  onDoorClick,
  onReady,
  onOnboardingLookDone,
  onCinematicPause,
  cinematicResumed,
  onCinematicStep,
  wingId = "roots",
  roomId = "ro1",
  roomName,
  memories = [],
  isMobile = false,
  corridorEnterClicked = false,
  initialCameraZ,
}: OnboardingSceneHostProps) {
  const styleEra = useUserStore((s) => s.styleEra) || "roman";
  const userName = useUserStore((s) => s.userName);
  const bustPedestals = useUserStore((s) => s.bustPedestals);
  const bustTextureUrl = useUserStore((s) => s.bustTextureUrl);
  const bustModelUrl = useUserStore((s) => s.bustModelUrl);
  const bustProportions = useUserStore((s) => s.bustProportions);
  const bustName = useUserStore((s) => s.bustName);
  const bustGender = useUserStore((s) => s.bustGender);

  const [activeScene, setActiveScene] = useState(scene);
  const [transitioning, setTransitioning] = useState(false);
  const prevSceneRef = useRef(scene);

  // Warm white flash crossfade — feels like a blink, not a cut
  useEffect(() => {
    if (scene !== prevSceneRef.current) {
      setTransitioning(true);
      const t1 = setTimeout(() => {
        setActiveScene(scene);
      }, 250);
      const t2 = setTimeout(() => {
        setTransitioning(false);
        prevSceneRef.current = scene;
      }, 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [scene]);

  const allWings: Wing[] = WINGS;
  const noop = () => {};

  // Demo corridor paintings for onboarding — only one painting (near first door)
  const demoPaintings: Record<string, { url?: string; title?: string }> = onboardingMode ? {
    ro1: { url: "/demo/between-two-hands.jpg", title: "Between Two Hands" },
  } : {};

  // Demo room memories — non-photo types so the upload placeholder painting stays visible
  const demoRoomMemories = onboardingMode && memories.length === 0 ? [
    { id: "demo-audio-1", title: "Song of Summer", type: "audio", displayUnit: "audio", dataUrl: "/demo/song-of-summer.mp3", createdAt: new Date().toISOString(), hue: 200, s: 50, l: 55 },
    { id: "demo-video-1", title: "Piano Recital", type: "video", displayUnit: "screen", dataUrl: "/demo/piano-recital.mp4", createdAt: new Date().toISOString(), hue: 30, s: 45, l: 50 },
    { id: "demo-frame-1", title: "A Quiet Morning", type: "photo", displayUnit: "frame", dataUrl: "/demo/quiet-morning.jpg", createdAt: new Date().toISOString(), hue: 18, s: 40, l: 60 },
  ] : memories;

  // Override room name for onboarding — "[User]'s Self Portraits"
  const corridorRooms: WingRoom[] = (WING_ROOMS[wingId] || []).map((r, i) => {
    if (i === 0 && roomName) return { ...r, name: roomName, nameKey: undefined };
    return r;
  });

  return (
    <div style={{ position: "absolute", inset: 0, touchAction: "none" }}>
      {/* Scene */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: transitioning ? 0 : 1,
          transition: "opacity 0.25s ease",
        }}
      >
        <Suspense fallback={null}>
          {activeScene === "exterior" && (
            <ExteriorScene
              onRoomHover={noop}
              onRoomClick={onRoomClick || noop}
              hoveredRoom={null}
              wings={allWings}
              styleEra={styleEra}
              autoWalkTo={autoWalkTo}
              onReady={onReady}
              onboardingMode={onboardingMode}
              onCinematicPause={onCinematicPause}
              cinematicResumed={cinematicResumed}
            />
          )}
          {activeScene === "entrance" && (
            <EntranceHallScene
              onDoorClick={onDoorClick || noop}
              wings={allWings}
              styleEra={styleEra}
              autoWalkTo={autoWalkTo}
              onboardingMode={onboardingMode}
              bustPedestals={bustPedestals}
              bustTextureUrl={bustTextureUrl}
              bustModelUrl={bustModelUrl}
              bustProportions={bustProportions}
              bustName={bustName || userName || null}
              bustGender={bustGender || null}
            />
          )}
          {activeScene === "corridor" && (
            <CorridorScene
              wingId={wingId}
              rooms={corridorRooms}
              onDoorHover={noop}
              onDoorClick={onDoorClick || noop}
              hoveredDoor={null}
              styleEra={styleEra}
              autoWalkTo={autoWalkTo}
              onboardingMode={onboardingMode}
              onCinematicStep={onCinematicStep}
              isMobile={isMobile}
              corridorEnterClicked={corridorEnterClicked}
              corridorPaintings={demoPaintings}
            />
          )}
          {activeScene === "room" && (
            <InteriorScene
              roomId={wingId}
              actualRoomId={roomId}
              memories={demoRoomMemories}
              onMemoryClick={onDoorClick || noop}
              styleEra={styleEra}
              onboardingMode={onboardingMode}
              onOnboardingLookDone={onOnboardingLookDone}
              onCinematicStep={onCinematicStep}
              isMobile={isMobile}
              initialCameraZ={initialCameraZ}
            />
          )}
        </Suspense>
      </div>

      {/* Warm flash overlay during transition */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(242,237,231,0.6), rgba(26,25,23,0.8))",
          opacity: transitioning ? 1 : 0,
          transition: transitioning ? "opacity 0.15s ease-in" : "opacity 0.35s ease-out",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </div>
  );
}
