import * as THREE from "three";
import { EYE_HEIGHT, MAX_YAW_DEG_S, easeInOutCubic } from "./cameraComfort";
import { prefersReducedMotion } from "./reducedMotion";

/**
 * WS7-8 / WS6-7 / WS8-6 — dolly-to-frame focus mode ("DOLLY-TO-FRAME"
 * signature moment): tap an artwork from any distance and the camera glides to
 * museum viewing distance, the scene dims 15%, the plaque lifts; a second tap
 * opens the memory.
 *
 * PURE by design: zero scene imports — only THREE math, cameraComfort caps and
 * the reduced-motion singleton. Every scene (interior/corridor/entrance/
 * exterior) adopts the same controller through three thin callbacks, so dolly
 * and auto-walk share ONE camera authority per scene (the scene simply stops
 * feeding its own integrator while `update()` returns true).
 *
 * Comfort contract (dogma 5): ~1.2s glide, easeInOutCubic, view-direction turn
 * rate clamped to MAX_YAW_DEG_S, eye height = the shared EYE_HEIGHT constant
 * (2.0 through Wave 2 — no literals). prefers-reduced-motion → instant cut,
 * optionally wrapped in the scene's fade/veil callback instead of a glide.
 *
 * Input contract: ANY user input cancels — scenes call `cancel()` from their
 * joystick/keys/tap handlers, or route taps through `handleTap()` which
 * implements the full state machine (idle→glide→focused→open/exit).
 *
 * Dimming: the controller never touches materials. On arrival it calls
 * `setDimmed(true, target)` — the scene dims hemisphere/env by FOCUS_DIM (15%,
 * walls staying ≥0.5 luminance per dogma 1) and boosts that artwork's plaque/
 * picture-light. `setDimmed(false, …)` restores on cancel/exit.
 */

// ── Tuning constants (plan values — WS7-8) ──

/** Glide duration in seconds. */
export const FOCUS_GLIDE_S = 1.2;
/** Scene dim fraction on arrival (scenes apply it in setDimmed). */
export const FOCUS_DIM = 0.15;
/** Viewing distance = planeHeight · 1.4 (min 1.2m; widened for panoramic pieces). */
export const FOCUS_DISTANCE_FACTOR = 1.4;

// ── Public types ──

export interface FocusTarget {
  /** Artwork centre in WORLD space (the photo plane centre). */
  position: THREE.Vector3;
  /** Outward wall normal in world space (unit-ish; Y is flattened for the pose). */
  normal: THREE.Vector3;
  /** Photo plane height in metres — drives viewing distance. */
  planeHeight: number;
  /** Photo plane width — widens the viewing distance for panoramic pieces. */
  planeWidth?: number;
  /** Scene payload (the memory) — handed back in openMemory/onArrive; also the identity for "second tap". */
  data?: unknown;
}

export interface FocusPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

/**
 * The scene's camera adapter — maps onto each scene's existing posT/lookT (or
 * awTarget) refs so focus glides ride the scene's own smoothing/render path.
 */
export interface FocusRig {
  getPosition(): THREE.Vector3;
  getLookAt(): THREE.Vector3;
  setPose(position: THREE.Vector3, lookAt: THREE.Vector3): void;
}

export interface FocusModeOptions {
  rig: FocusRig;
  /**
   * Scene dims 15% (FOCUS_DIM) + lifts the target's plaque/picture-light when
   * true; restores when false. Called at most once per transition.
   */
  setDimmed(dimmed: boolean, target: FocusTarget | null): void;
  /** Second tap on the focused artwork → open the existing memory panel/modal. */
  openMemory(target: FocusTarget): void;
  /** Arrival hook (after setDimmed(true)) — e.g. analytics, plaque pulse. */
  onArrive?(target: FocusTarget): void;
  /**
   * Reduced-motion crossfade: the scene fades a veil, calls `applyCut()` at
   * the midpoint (which snaps the pose + dims), then fades back. Omitted →
   * plain instant cut.
   */
  fade?(applyCut: () => void): void;
  /** World y of the floor under the artworks (default 0); eye = floorY + EYE_HEIGHT. */
  floorY?: number;
  /** Override glide duration (tests only — scenes keep FOCUS_GLIDE_S). */
  glideSeconds?: number;
}

export type FocusState = "idle" | "gliding" | "focused";
export type FocusTapResult = "started" | "cancelled" | "opened" | "exited" | "ignored";

export interface FocusMode {
  state(): FocusState;
  current(): FocusTarget | null;
  /** Begin the dolly (or reduced-motion cut) toward a target. */
  start(target: FocusTarget): void;
  /**
   * Per-frame integrator — call from animate() with dt in SECONDS. Returns
   * true while focus mode owns the camera (the scene must not also integrate
   * walk/autoWalk that frame).
   */
  update(dt: number): boolean;
  /** Any user input cancels: aborts a glide mid-flight or exits focus (undims). */
  cancel(): void;
  /**
   * Route artwork taps here: idle+target → start; gliding → cancel; focused on
   * the SAME target → openMemory ("second tap"); focused on another target →
   * re-glide (stays dimmed); focused + null (tapped empty space) → exit.
   */
  handleTap(target: FocusTarget | null): FocusTapResult;
  dispose(): void;
}

// ── Pose math ──

const _n = new THREE.Vector3();

/**
 * The museum viewing pose for an artwork: distance planeHeight·1.4 out along
 * the (Y-flattened) wall normal, eye at floorY + EYE_HEIGHT, looking at the
 * piece's centre. Exported standalone so walk-to integrators (WS8-6) can route
 * an auto-walk to the same pose before handing over.
 */
export function computeFocusPose(target: FocusTarget, floorY = 0): FocusPose {
  let dist = Math.max(1.2, target.planeHeight * FOCUS_DISTANCE_FACTOR);
  if (target.planeWidth) dist = Math.max(dist, target.planeWidth * 0.85);
  _n.copy(target.normal);
  _n.y = 0;
  if (_n.lengthSq() < 1e-6) _n.set(0, 0, 1);
  _n.normalize();
  const position = target.position.clone().addScaledVector(_n, dist);
  position.y = floorY + EYE_HEIGHT;
  return { position, lookAt: target.position.clone() };
}

// ── Controller ──

const MAX_YAW_RAD_S = (MAX_YAW_DEG_S * Math.PI) / 180;

export function createFocusMode(opts: FocusModeOptions): FocusMode {
  const glideS = opts.glideSeconds ?? FOCUS_GLIDE_S;
  const floorY = opts.floorY ?? 0;

  let state: FocusState = "idle";
  let target: FocusTarget | null = null;
  let dimmed = false;
  let rmPending = false; // reduced-motion cut queued behind the scene's fade
  let t = 0;

  const startPos = new THREE.Vector3();
  const startLook = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  const endLook = new THREE.Vector3();
  const curDir = new THREE.Vector3();
  const _pos = new THREE.Vector3();
  const _lookPt = new THREE.Vector3();
  const _desired = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const _qFull = new THREE.Quaternion();
  const _qStep = new THREE.Quaternion();

  const sameTarget = (a: FocusTarget, b: FocusTarget) =>
    a === b || (a.data !== undefined && a.data === b.data);

  const arrive = () => {
    rmPending = false;
    state = "focused";
    if (!dimmed) {
      dimmed = true;
      opts.setDimmed(true, target);
    }
    if (target) opts.onArrive?.(target);
  };

  const start = (tg: FocusTarget) => {
    target = tg;
    const pose = computeFocusPose(tg, floorY);
    if (prefersReducedMotion()) {
      // Direct cut (optionally under the scene's crossfade) — no glide, per dogma 5.
      state = "gliding";
      rmPending = true;
      const applyCut = () => {
        if (target !== tg || !rmPending) return; // cancelled/superseded while fading
        opts.rig.setPose(pose.position, pose.lookAt);
        arrive();
      };
      if (opts.fade) opts.fade(applyCut);
      else applyCut();
      return;
    }
    startPos.copy(opts.rig.getPosition());
    startLook.copy(opts.rig.getLookAt());
    endPos.copy(pose.position);
    endLook.copy(pose.lookAt);
    curDir.copy(startLook).sub(startPos);
    if (curDir.lengthSq() < 1e-6) curDir.set(0, 0, 1);
    curDir.normalize();
    t = 0;
    rmPending = false;
    state = "gliding";
  };

  const cancel = () => {
    if (state === "idle") return;
    const tg = target;
    state = "idle";
    target = null;
    rmPending = false;
    if (dimmed) {
      dimmed = false;
      opts.setDimmed(false, tg);
    }
  };

  return {
    state: () => state,
    current: () => target,
    start,
    cancel,

    update(dt: number): boolean {
      if (state !== "gliding") return state === "focused";
      if (rmPending || !target) return true; // waiting on the reduced-motion fade
      t = Math.min(1, t + dt / glideS);
      const e = easeInOutCubic(t);
      _pos.lerpVectors(startPos, endPos, e);
      _lookPt.lerpVectors(startLook, endLook, e);
      _desired.copy(_lookPt).sub(_pos);
      if (_desired.lengthSq() < 1e-6) _desired.copy(curDir);
      _desired.normalize();
      // Comfort cap: rotate the view direction toward the eased ideal at
      // ≤ MAX_YAW_DEG_S — position may finish first; the turn catches up.
      const angle = curDir.angleTo(_desired);
      const maxStep = MAX_YAW_RAD_S * Math.max(dt, 0);
      if (angle > 1e-5) {
        _qFull.setFromUnitVectors(curDir, _desired);
        _qStep.identity().slerp(_qFull, Math.min(1, maxStep / angle));
        curDir.applyQuaternion(_qStep).normalize();
      }
      const lookDist = Math.max(0.5, _pos.distanceTo(_lookPt));
      opts.rig.setPose(_pos, _look.copy(_pos).addScaledVector(curDir, lookDist));
      if (t >= 1 && curDir.angleTo(_desired) < 0.01) {
        opts.rig.setPose(endPos, endLook);
        arrive();
      }
      return true;
    },

    handleTap(tg: FocusTarget | null): FocusTapResult {
      switch (state) {
        case "idle":
          if (tg) {
            start(tg);
            return "started";
          }
          return "ignored";
        case "gliding":
          cancel();
          return "cancelled";
        case "focused":
          if (tg && target && sameTarget(tg, target)) {
            opts.openMemory(target);
            return "opened"; // stays focused; scene's modal-close may call cancel()
          }
          if (tg) {
            start(tg); // re-glide to the new piece, dim stays on
            return "started";
          }
          cancel();
          return "exited";
      }
    },

    dispose() {
      cancel();
    },
  };
}
