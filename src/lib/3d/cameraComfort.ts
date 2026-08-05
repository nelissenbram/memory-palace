/**
 * Shared camera-comfort caps (master plan dogma 5 — WS8-1..5, WS12-5): every
 * walkable scene's integrator reads THESE values; per-scene speed, yaw or eye
 * numbers are forbidden. Sprint is deleted — full joystick pull equals
 * MAX_WALK_SPEED, autoWalk/cinematic integrators clamp to the same caps.
 * Wave-3's createWalkController consolidates enforcement in one place; until
 * then scenes adopt these constants as their integrators are touched.
 */

/** Camera eye level in metres (the hall's established framing height). */
export const EYE_HEIGHT = 2.0;

/** Walking speed cap in m/s — calm museum pace; there is no sprint. */
export const MAX_WALK_SPEED = 2.2;

/** Yaw-rate cap in deg/s for autoWalk and cinematic camera integrators. */
export const MAX_YAW_DEG_S = 120;

/** The one easing for comfort-capped camera moves (cinematics, autoWalk arrivals). */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
