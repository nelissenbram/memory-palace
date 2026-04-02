"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════
// useCinematicPath — scripted camera flythrough for any Three.js scene
// ═══════════════════════════════════════════════════════════════════

export interface CinematicKeyframe {
  time: number; // seconds from start
  position: [number, number, number]; // camera xyz
  lookAt: [number, number, number]; // look target xyz
  fov?: number; // optional FOV change
}

export interface CinematicPathOptions {
  keyframes: CinematicKeyframe[];
  enabled: boolean;
  onComplete?: () => void;
  easing?: "linear" | "easeInOut" | "easeIn" | "easeOut";
}

// ── Easing helpers ──────────────────────────────────────────────
function easeLinear(t: number) {
  return t;
}
function easeInCubic(t: number) {
  return t * t * t;
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getEasingFn(name: CinematicPathOptions["easing"]) {
  switch (name) {
    case "linear":
      return easeLinear;
    case "easeIn":
      return easeInCubic;
    case "easeOut":
      return easeOutCubic;
    case "easeInOut":
    default:
      return easeInOutCubic;
  }
}

// ── Hook ────────────────────────────────────────────────────────
export function useCinematicPath(
  cameraRef: React.RefObject<THREE.PerspectiveCamera>,
  options: CinematicPathOptions,
): {
  isPlaying: boolean;
  progress: number;
  reset: () => void;
} {
  const { keyframes, enabled, onComplete, easing } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Internal refs so the rAF loop reads stable values without re-renders
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Build CatmullRom curves from keyframes (memoised on keyframes identity)
  const curvesRef = useRef<{
    posCurve: THREE.CatmullRomCurve3;
    lookCurve: THREE.CatmullRomCurve3;
    fovs: number[];
    fovTimes: number[];
    totalDuration: number;
  } | null>(null);

  const keyframesRef = useRef(keyframes);

  // Rebuild curves when keyframes change
  if (keyframes !== keyframesRef.current || curvesRef.current === null) {
    keyframesRef.current = keyframes;
    if (keyframes.length >= 2) {
      const posPoints = keyframes.map(
        (kf) => new THREE.Vector3(...kf.position),
      );
      const lookPoints = keyframes.map(
        (kf) => new THREE.Vector3(...kf.lookAt),
      );

      // CatmullRomCurve3 for buttery smooth interpolation
      const posCurve = new THREE.CatmullRomCurve3(posPoints, false, "catmullrom", 0.5);
      const lookCurve = new THREE.CatmullRomCurve3(lookPoints, false, "catmullrom", 0.5);

      const fovs = keyframes.map((kf) => kf.fov ?? 60);
      const fovTimes = keyframes.map((kf) => kf.time);
      const totalDuration = keyframes[keyframes.length - 1].time;

      curvesRef.current = { posCurve, lookCurve, fovs, fovTimes, totalDuration };
    } else {
      curvesRef.current = null;
    }
  }

  // Interpolate FOV linearly between keyframes at a given global time
  const interpolateFov = useCallback((elapsed: number): number => {
    const c = curvesRef.current;
    if (!c) return 60;
    const { fovs, fovTimes } = c;

    if (elapsed <= fovTimes[0]) return fovs[0];
    if (elapsed >= fovTimes[fovTimes.length - 1]) return fovs[fovs.length - 1];

    // Find segment
    for (let i = 0; i < fovTimes.length - 1; i++) {
      if (elapsed >= fovTimes[i] && elapsed <= fovTimes[i + 1]) {
        const segT = (elapsed - fovTimes[i]) / (fovTimes[i + 1] - fovTimes[i]);
        return fovs[i] + (fovs[i + 1] - fovs[i]) * segT;
      }
    }
    return fovs[fovs.length - 1];
  }, []);

  // Map global elapsed time to a 0-1 curve parameter, applying per-segment easing
  const timeToCurveParam = useCallback(
    (elapsed: number, easingFn: (t: number) => number): number => {
      const c = curvesRef.current;
      if (!c) return 0;
      const { totalDuration } = c;
      const kfs = keyframesRef.current;
      if (totalDuration === 0) return 0;

      // Clamp
      const clamped = Math.max(0, Math.min(elapsed, totalDuration));

      // Find which segment we are in
      for (let i = 0; i < kfs.length - 1; i++) {
        const t0 = kfs[i].time;
        const t1 = kfs[i + 1].time;
        if (clamped >= t0 && clamped <= t1) {
          const segDuration = t1 - t0;
          const segLocal = segDuration > 0 ? (clamped - t0) / segDuration : 0;
          const easedLocal = easingFn(segLocal);

          // Convert segment index + local param to global 0-1
          const segCount = kfs.length - 1;
          return (i + easedLocal) / segCount;
        }
      }
      return 1;
    },
    [],
  );

  // Reset playback to beginning
  const reset = useCallback(() => {
    startTimeRef.current = null;
    completedRef.current = false;
    setProgress(0);
    if (enabled) {
      setIsPlaying(true);
    }
  }, [enabled]);

  // Main animation loop
  useEffect(() => {
    if (!enabled || !curvesRef.current) {
      // Stop any running animation
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    const curves = curvesRef.current;
    const easingFn = getEasingFn(easing);

    setIsPlaying(true);
    completedRef.current = false;

    const _pos = new THREE.Vector3();
    const _look = new THREE.Vector3();

    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = (now - startTimeRef.current) / 1000; // ms -> s

      const cam = cameraRef.current;
      if (!cam) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(elapsed / curves.totalDuration, 1);
      setProgress(t);

      // Map elapsed time through easing to curve parameter
      const param = timeToCurveParam(elapsed, easingFn);
      const clampedParam = Math.max(0, Math.min(param, 1));

      // Sample curves
      curves.posCurve.getPoint(clampedParam, _pos);
      curves.lookCurve.getPoint(clampedParam, _look);

      // Apply position and lookAt
      cam.position.copy(_pos);
      cam.lookAt(_look);

      // FOV
      const fov = interpolateFov(Math.min(elapsed, curves.totalDuration));
      if (cam.fov !== fov) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }

      // Check completion
      if (elapsed >= curves.totalDuration) {
        if (!completedRef.current) {
          completedRef.current = true;
          setIsPlaying(false);
          setProgress(1);
          onCompleteRef.current?.();
        }
        return; // stop rAF
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, easing, cameraRef, timeToCurveParam, interpolateFov]);

  return { isPlaying, progress, reset };
}

// ═══════════════════════════════════════════════════════════════════
// Predefined cinematic paths
// ═══════════════════════════════════════════════════════════════════

/** Wide establishing shot of the exterior, orbiting down to the entrance. */
export const EXTERIOR_PATH: CinematicKeyframe[] = [
  // Wide establishing shot, slowly orbiting
  { time: 0, position: [0, 30, 90], lookAt: [0, 8, 0] },
  { time: 3, position: [-40, 20, 60], lookAt: [0, 8, 0] },
  // Sweep down towards entrance
  { time: 6, position: [-15, 12, 25], lookAt: [0, 9, -5] },
  // Close on entrance
  { time: 8, position: [0, 10, 15], lookAt: [0, 9, 0] },
];

/** Enter the hall, gaze up at the dome, then pan to the doors. */
export const ENTRANCE_HALL_PATH: CinematicKeyframe[] = [
  // Enter and look up at dome
  { time: 0, position: [0, 1.7, 9], lookAt: [0, 12, 0], fov: 60 },
  { time: 2, position: [0, 1.7, 7], lookAt: [0, 20, 0], fov: 70 },
  // Pan down to doors
  { time: 4, position: [0, 1.7, 5], lookAt: [5, 3, -8], fov: 60 },
  // Walk towards a door
  { time: 6, position: [3, 1.7, -4], lookAt: [7, 3.5, -9], fov: 55 },
];

/** Travel the length of a corridor, glancing at a side door. */
export const CORRIDOR_PATH: CinematicKeyframe[] = [
  // Enter corridor, look down the length
  { time: 0, position: [0, 1.7, 15], lookAt: [0, 2, -20], fov: 55 },
  { time: 3, position: [0, 1.7, 5], lookAt: [-4, 3, 0], fov: 55 },
  // Approach a door
  { time: 5, position: [-2, 1.7, -2], lookAt: [-4.5, 3, -2], fov: 50 },
];

/** Explore a memory room, scanning the walls. */
export const ROOM_PATH: CinematicKeyframe[] = [
  // Enter room, look around
  { time: 0, position: [0, 1.7, 4], lookAt: [0, 2, -3], fov: 58 },
  { time: 2, position: [-1, 1.7, 1], lookAt: [-3, 2.5, -2], fov: 58 },
  // Look at memories on wall
  { time: 4, position: [0, 1.7, -1], lookAt: [3, 2, -4], fov: 50 },
  { time: 6, position: [1, 1.7, -3], lookAt: [0, 2, -5], fov: 55 },
];
