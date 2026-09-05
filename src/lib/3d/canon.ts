/**
 * MUSEO VIVO — the 3D canon (single source of truth).
 *
 * One sun, one grade, one palette (master plan §2 dogma, WS1-3):
 * every hue and exposure value rendered by the four palace scenes traces
 * back to a token in this file. Any other hue in a 3D scene is a bug.
 */

// ════════════════════════════════════════════
// CANON PALETTE
// ════════════════════════════════════════════

/** Warm cream plaster — walls and headline surfaces. */
export const PLASTER = "#F2E9DA";
/** Honed travertine grout — floors. */
export const TRAVERTINE_GROUT = "#E3D6BC";
/** Ink — trim, plaques, type. */
export const INK = "#403B36";
/** Gold — frames and the tympanum ONLY. */
export const GOLD = "#D4AF37";
/** Ember — the interactive accent ONLY. */
export const EMBER = "#B85C38";

/**
 * Sun-bleached plaster value ramp for exterior wall faces (lit → shadow).
 * Same plaster hue at stepped values — honey comes from the sun, not albedo.
 */
export const PLASTER_RAMP = {
  light: "#F7F0E3",
  base: PLASTER,
  mid: "#ECE0CC",
  shade: "#E4D6BD",
  dark: "#D2C2A3",
} as const;

// ════════════════════════════════════════════
// ONE GRADE
// ════════════════════════════════════════════

/**
 * The single tone-mapping exposure for every scene. Tone mapping itself is
 * NeutralToneMapping applied ONCE, in the shared merged EffectPass
 * (postprocessing.ts) — renderers stay at NoToneMapping and this value feeds
 * the effect via the renderer's toneMappingExposure uniform.
 * Per-scene exposure multipliers are forbidden forever.
 */
export const EXPOSURE = 1.15;

// ════════════════════════════════════════════
// ONE SUN — THE GOLDEN HOUR
// ════════════════════════════════════════════

export const GOLDEN = {
  /** Low south-west sun. */
  sunColor: "#FFB870",
  /** Low SW sun position (long raking golden-hour shadows). */
  sunPosition: [-20, 18, -30] as [number, number, number],
  /** Warm hemisphere sky. */
  ambientColor: "#FFE8CC",
  /** Warm golden sky tone for procedural backgrounds / open-air surfaces. */
  skyColor: "#FFDCAE",
  /** Warm fill light. */
  fillColor: "#FFD8A8",
  /** Terracotta ground bounce for every hemisphere light. */
  groundBounceColor: "#A86B4C",
  /** Warm haze over the exterior landscape. */
  fogExterior: "#E8C99A",
  /** Warm cream corridor/interior haze. */
  fogInterior: "#EFE3CC",
} as const;

/**
 * Shared warm renderer clear color — matches the interior background family so
 * scene seams and first frames never flash black.
 */
export const CLEAR_COLOR = GOLDEN.fogInterior;

// ════════════════════════════════════════════
// BRIGHTNESS DOGMA — memories are always the brightest pixels
// ════════════════════════════════════════════

export const BRIGHTNESS_RATIOS = {
  photo: 1.0,
  frame: 0.8,
  plaque: 0.6,
  wallMin: 0.5,
} as const;

/** WCAG relative luminance of a "#rrggbb" hex (0..1). */
export function relLuminance(hex: string): number {
  const v = parseInt(hex.replace("#", ""), 16);
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * chan((v >> 16) & 0xff) +
    0.7152 * chan((v >> 8) & 0xff) +
    0.0722 * chan(v & 0xff)
  );
}
