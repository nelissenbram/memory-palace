/**
 * Dynamic daylight/lighting system for the Memory Palace.
 * Returns time-of-day lighting presets that blend smoothly between
 * four periods: morning, midday, evening, night.
 */

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
}

/** Get current time of day as 0-24 float */
export function getTimeOfDay(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

// ── PRESETS ──
// Midday is the "warm, inviting" baseline matching existing hardcoded values.

const MORNING: LightingPreset = {
  ambientColor: "#FFE0B0",
  ambientIntensity: 0.35,
  sunColor: "#FFCC70",
  sunIntensity: 0.7,
  sunPosition: [20, 25, 40],
  fillColor: "#FFD0A0",
  fillIntensity: 0.25,
  fogColor: "#E8D8C0",
  fogDensity: 0.85,
  envWarmth: 0.85,
  envBrightness: 0.35,
  exposure: 0.9,
};

const MIDDAY: LightingPreset = {
  ambientColor: "#FFF2E0",
  ambientIntensity: 0.5,
  sunColor: "#FFE8C0",
  sunIntensity: 1.0,
  sunPosition: [40, 55, 25],
  fillColor: "#FFD8A8",
  fillIntensity: 0.35,
  fogColor: "#E8E2D8",
  fogDensity: 1.0,
  envWarmth: 0.7,
  envBrightness: 0.45,
  exposure: 1.0,
};

const EVENING: LightingPreset = {
  ambientColor: "#FFD8A0",
  ambientIntensity: 0.3,
  sunColor: "#FFB060",
  sunIntensity: 0.6,
  sunPosition: [-20, 18, -30],
  fillColor: "#FFC080",
  fillIntensity: 0.2,
  fogColor: "#E0C8A8",
  fogDensity: 0.9,
  envWarmth: 0.9,
  envBrightness: 0.35,
  exposure: 0.85,
};

const NIGHT: LightingPreset = {
  ambientColor: "#B0C0E0",
  ambientIntensity: 0.2,
  sunColor: "#8090C0",
  sunIntensity: 0.25,
  sunPosition: [-10, 30, 15],
  fillColor: "#90A0C8",
  fillIntensity: 0.12,
  fogColor: "#A0A8B8",
  fogDensity: 0.7,
  envWarmth: 0.3,
  envBrightness: 0.25,
  exposure: 0.7,
};

/** Linearly interpolate between two numbers */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linearly interpolate between two hex color strings */
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const r = Math.round(lerp((pa >> 16) & 0xff, (pb >> 16) & 0xff, t));
  const g = Math.round(lerp((pa >> 8) & 0xff, (pb >> 8) & 0xff, t));
  const bl = Math.round(lerp(pa & 0xff, pb & 0xff, t));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase();
}

function lerpPreset(a: LightingPreset, b: LightingPreset, t: number): LightingPreset {
  return {
    ambientColor: lerpColor(a.ambientColor, b.ambientColor, t),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, t),
    sunColor: lerpColor(a.sunColor, b.sunColor, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    sunPosition: [
      lerp(a.sunPosition[0], b.sunPosition[0], t),
      lerp(a.sunPosition[1], b.sunPosition[1], t),
      lerp(a.sunPosition[2], b.sunPosition[2], t),
    ],
    fillColor: lerpColor(a.fillColor, b.fillColor, t),
    fillIntensity: lerp(a.fillIntensity, b.fillIntensity, t),
    fogColor: lerpColor(a.fogColor, b.fogColor, t),
    fogDensity: lerp(a.fogDensity, b.fogDensity, t),
    envWarmth: lerp(a.envWarmth, b.envWarmth, t),
    envBrightness: lerp(a.envBrightness, b.envBrightness, t),
    exposure: lerp(a.exposure, b.exposure, t),
  };
}

/**
 * Get the blended lighting preset for the given hour (0-24).
 * Smoothly transitions between periods at boundary hours.
 *
 * Periods:
 *   Night  → Morning : 5-7   (2h blend)
 *   Morning→ Midday  : 9-11  (2h blend)
 *   Midday → Evening : 16-18 (2h blend)
 *   Evening→ Night   : 20-22 (2h blend)
 */
export function getLightingPreset(hour?: number): LightingPreset {
  const h = hour ?? getTimeOfDay();

  // Night (22-5)
  if (h >= 22 || h < 5) return NIGHT;
  // Morning (7-9)
  if (h >= 7 && h < 9) return MORNING;
  // Midday (11-16)
  if (h >= 11 && h < 16) return MIDDAY;
  // Evening (18-20)
  if (h >= 18 && h < 20) return EVENING;

  // Transition zones
  if (h >= 5 && h < 7) return lerpPreset(NIGHT, MORNING, (h - 5) / 2);
  if (h >= 9 && h < 11) return lerpPreset(MORNING, MIDDAY, (h - 9) / 2);
  if (h >= 16 && h < 18) return lerpPreset(MIDDAY, EVENING, (h - 16) / 2);
  // 20-22
  return lerpPreset(EVENING, NIGHT, (h - 20) / 2);
}
