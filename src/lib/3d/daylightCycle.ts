/**
 * Daylight system — collapsed to the single authored GOLDEN preset
 * (MUSEO VIVO WS1-2, owner-approved: the day/night cycle is dead).
 *
 * Every hour of the day renders the same Tuscan golden hour: low SW sun,
 * warm hemisphere, terracotta ground bounce. The API shape
 * (setDaylightHour / getDaylightHour / getTimeOfDay / getLightingPreset)
 * is kept so all call sites keep compiling — every path returns GOLDEN.
 */

import { EXPOSURE, GOLDEN } from "./canon";

export interface LightingPreset {
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  fillColor: string;
  fillIntensity: number;
  fogColor: string;
  fogDensity: number;
  envWarmth: number;
  envBrightness: number;
  exposure: number;
  /** Terracotta bounce for hemisphere-light ground colors. */
  groundBounceColor: string;
}

/** Global hour override — set by DaylightProvider, read by scenes.
 *  Kept for API compatibility; it no longer affects the lighting. */
let _globalHourOverride: number | undefined;

/** Set the global daylight hour override (called by DaylightProvider). */
export function setDaylightHour(hour: number | undefined) {
  _globalHourOverride = hour;
}

/** Get the current global daylight hour (for key-based scene remounting). */
export function getDaylightHour(): number | undefined {
  return _globalHourOverride;
}

/** Get current time of day as 0-24 float. */
export function getTimeOfDay(): number {
  if (_globalHourOverride !== undefined) return _globalHourOverride;
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

// ── THE ONE PRESET ──
// Intensity baselines match the old MIDDAY values the scenes' multipliers
// were authored against (ambient 0.5, sun 1.0, fill 0.35), so per-scene
// `x * intensity / baseline` factors stay ~1. Colors and sun position are
// the golden-hour family from canon.ts.

const GOLDEN_PRESET: LightingPreset = {
  ambientColor: GOLDEN.ambientColor,
  ambientIntensity: 0.5,
  sunColor: GOLDEN.sunColor,
  sunIntensity: 1.0,
  sunPosition: [...GOLDEN.sunPosition],
  fillColor: GOLDEN.fillColor,
  fillIntensity: 0.35,
  fogColor: GOLDEN.fogInterior,
  fogDensity: 1.0,
  envWarmth: 0.9,
  envBrightness: 0.45,
  exposure: EXPOSURE,
  groundBounceColor: GOLDEN.groundBounceColor,
};

/**
 * Get the lighting preset. The hour parameter is accepted for API
 * compatibility but ignored — every path returns the GOLDEN preset.
 */
export function getLightingPreset(_hour?: number): LightingPreset {
  return GOLDEN_PRESET;
}
