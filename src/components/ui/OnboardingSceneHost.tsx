"use client";
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useUserStore } from "@/lib/stores/userStore";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import { INK, HAIRLINE } from "@/lib/libraryTokens";
import { T } from "@/lib/theme";

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

/* ── Reduced-motion + WebGL capability, resolved once ── */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function webglAvailable(): boolean {
  if (typeof document === "undefined") return true; // SSR: assume capable, re-checked on mount
  try {
    const c = document.createElement("canvas");
    const gl =
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

/* ── Static warm-cream canon fallback ──
 * Used when WebGL is unavailable OR the 3D scene throws. Onboarding always
 * completes: a calm gradient + the room name, never a black/broken canvas. */
function SceneFallback({ roomName }: { roomName?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
        // Warm-cream canon gradient — the same house, just still.
        background:
          "radial-gradient(ellipse at 50% 35%, #FFFFFF 0%, #FCFAF5 45%, #F6EBE3 100%)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "block",
          width: "3rem",
          height: "0.125rem",
          background: HAIRLINE,
          borderRadius: "0.0625rem",
          marginBottom: "0.25rem",
        }}
      />
      {roomName ? (
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: "1.75rem",
            fontWeight: 600,
            fontStyle: "italic",
            color: INK,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {roomName}
        </h2>
      ) : null}
    </div>
  );
}

/* ── Error boundary around the R3F/Three scenes ──
 * ExteriorScene builds its own WebGLRenderer and its retry can throw uncaught;
 * this catches any scene failure and swaps in the warm-cream fallback so the
 * user is never stranded on a broken canvas. */
class SceneErrorBoundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    try {
      this.props.onError?.();
    } catch {}
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
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

  const reduce = useMemo(prefersReducedMotion, []);
  // WebGL check must run on the client; assume capable during SSR, verify on mount.
  const [noWebGL, setNoWebGL] = useState(false);
  const [boundaryFailed, setBoundaryFailed] = useState(false);
  useEffect(() => {
    if (!webglAvailable()) setNoWebGL(true);
  }, []);

  const [activeScene, setActiveScene] = useState(scene);
  const [transitioning, setTransitioning] = useState(false);
  const prevSceneRef = useRef(scene);

  /* ── Change 17: gate the reveal on a real sceneReady signal, not a fixed
   * delay — with a max-wait fallback so a never-firing onReady still reveals. */
  const [sceneReady, setSceneReady] = useState(false);
  const readyFiredRef = useRef(false);
  const handleReady = useCallback(() => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    setSceneReady(true);
    try {
      onReady?.();
    } catch {}
  }, [onReady]);

  // Reset the ready gate whenever the scene changes, then arm the ceiling timeout.
  useEffect(() => {
    readyFiredRef.current = false;
    setSceneReady(false);
    // If the fallback is showing, there is no 3D "ready" — reveal immediately.
    if (noWebGL || boundaryFailed) {
      handleReady();
      return;
    }
    // Ceiling timeout: a stalled/never-firing onReady still surfaces the scene.
    const ceiling = setTimeout(() => handleReady(), 4000);
    return () => clearTimeout(ceiling);
  }, [activeScene, noWebGL, boundaryFailed, handleReady]);

  // Warm white flash crossfade — feels like a blink, not a cut.
  // Under reduced motion, swap instantly (no animated blink).
  useEffect(() => {
    if (scene !== prevSceneRef.current) {
      if (reduce) {
        setActiveScene(scene);
        prevSceneRef.current = scene;
        return;
      }
      setTransitioning(true);
      const t1 = setTimeout(() => {
        setActiveScene(scene);
      }, 250);
      const t2 = setTimeout(() => {
        setTransitioning(false);
        prevSceneRef.current = scene;
      }, 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [scene, reduce]);

  // WINGS is a module-level constant — stable identity, safe to pass straight through.
  const allWings: Wing[] = WINGS;
  const noop = () => {};

  // Demo corridor paintings for onboarding — only one painting (near first door).
  // Memoized on onboardingMode so scene props keep a stable identity across the
  // host's own state transitions (transitioning/sceneReady) and store churn.
  const demoPaintings = useMemo<Record<string, { url?: string; title?: string }>>(
    () =>
      (onboardingMode
        ? { ro1: { url: "/demo/between-two-hands.jpg", title: "Between Two Hands" } }
        : {}) as Record<string, { url?: string; title?: string }>,
    [onboardingMode],
  );

  // Demo room memories — non-photo types so the upload placeholder painting stays
  // visible. Memoized so InteriorScene's memories prop keeps a stable identity
  // (a fresh array each render defeats R3F memoization and can trigger scene-graph
  // rebuilds). The demo objects hold new Date().toISOString() timestamps, but those
  // are already frozen at first compute — behavior/output is unchanged, just stable.
  const demoRoomMemories = useMemo(
    () =>
      onboardingMode && memories.length === 0
        ? [
            { id: "demo-audio-1", title: "Song of Summer", type: "audio", displayUnit: "audio", dataUrl: "/demo/song-of-summer.mp3", createdAt: new Date().toISOString(), hue: 200, s: 50, l: 55 },
            { id: "demo-video-1", title: "Piano Recital", type: "video", displayUnit: "screen", dataUrl: "/demo/piano-recital.mp4", createdAt: new Date().toISOString(), hue: 30, s: 45, l: 50 },
            { id: "demo-frame-1", title: "A Quiet Morning", type: "photo", displayUnit: "frame", dataUrl: "/demo/quiet-morning.jpg", createdAt: new Date().toISOString(), hue: 18, s: 40, l: 60 },
          ]
        : memories,
    [onboardingMode, memories],
  );

  // Override room name for onboarding — "[User]'s Self Portraits". Memoized on the
  // real inputs (wingId/roomName) so the corridor rooms array keeps a stable
  // identity across unrelated re-renders.
  const corridorRooms: WingRoom[] = useMemo(
    () =>
      (WING_ROOMS[wingId] || []).map((r, i) => {
        if (i === 0 && roomName) return { ...r, name: roomName, nameKey: undefined };
        return r;
      }),
    [wingId, roomName],
  );

  // Static fallback path: WebGL unavailable — never mount the 3D canvas at all.
  if (noWebGL || boundaryFailed) {
    return (
      <div style={{ position: "absolute", inset: 0, touchAction: "none" }}>
        <SceneFallback roomName={roomName} />
      </div>
    );
  }

  const sceneNode = (
    <Suspense fallback={null}>
      {activeScene === "exterior" && (
        <ExteriorScene
          onRoomHover={noop}
          onRoomClick={onRoomClick || noop}
          hoveredRoom={null}
          wings={allWings}
          styleEra={styleEra}
          autoWalkTo={autoWalkTo}
          onReady={handleReady}
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
          onReady={handleReady}
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
          onReady={handleReady}
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
          onReady={handleReady}
          onboardingMode={onboardingMode}
          onOnboardingLookDone={onOnboardingLookDone}
          onCinematicStep={onCinematicStep}
          isMobile={isMobile}
          initialCameraZ={initialCameraZ}
        />
      )}
    </Suspense>
  );

  return (
    <div style={{ position: "absolute", inset: 0, touchAction: "none" }}>
      {/* Scene — revealed only once sceneReady fires (real signal, timeout-guarded).
          A calm warm-cream backdrop sits underneath so nothing is ever black. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 35%, #FFFFFF 0%, #FCFAF5 45%, #F6EBE3 100%)",
        }}
        aria-hidden
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: transitioning || !sceneReady ? 0 : 1,
          transition: reduce ? "none" : "opacity 0.35s ease",
        }}
      >
        <SceneErrorBoundary
          fallback={<SceneFallback roomName={roomName} />}
          onError={() => setBoundaryFailed(true)}
        >
          {sceneNode}
        </SceneErrorBoundary>
      </div>

      {/* Warm flash overlay during transition (skipped under reduced motion) */}
      {!reduce && (
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
      )}
    </div>
  );
}
