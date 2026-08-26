// ── Room footprint collision (w3_interior "The Enfilade" T-shape) ──
// The salon shell is a T: a full-width back HALL (z < widenZ) plus a NARROW
// entry STEM at the door (widenZ < z < rL/2, |x| ≤ stemHalfW). The areas
// beside the stem are CUT AWAY — there is no wall at ±rW/2 in that z-range,
// only the stem side walls at ±stemHalfW. The legacy walker clamp knew only
// the outer rectangle, so stepping left/right just inside the door walked
// straight through the stem side walls into the void (owner-reported prod
// bug). This module is pure so the clamp maths is unit-checkable headlessly.

export interface StemGeom {
  stemHalfW: number; // narrow entry-stem half-width
  stemLen: number;   // entry stem depth
  widenZ: number;    // z where the stem opens into the hall
}

/** Single source of truth for the T-stem dimensions (shell + collision share it). */
export function stemForRoom(rW: number, rL: number): StemGeom {
  const stemHalfW = Math.max(2.4, rW / 2 - 3.4);
  const stemLen = Math.min(Math.max(3.5, rL * 0.28), 7);
  const widenZ = rL / 2 - stemLen;
  return { stemHalfW, stemLen, widenZ };
}

export const WALL_MARGIN = 1;    // clearance from side/back/stem/shoulder walls (eye ≥1 m)
export const FRONT_MARGIN = 1.5; // clearance from the front (door) wall

export interface FootprintSpec {
  rW: number;
  rL: number;
  /** T-shape shell active (w3_interior). false → plain rectangle (legacy). */
  tShape: boolean;
  stemHalfW: number;
  widenZ: number;
}

/**
 * Clamp a walker's XZ to the room footprint. Mutates and returns `p`.
 * Rectangle clamp first (identical to the legacy behaviour), then — under the
 * T-shape — the cut-away notches beside the stem are resolved by LEAST
 * PENETRATION so the result is continuous per-frame: sideways drift inside
 * the stem pins x to the stem wall (never through it, incl. the door reveal);
 * walking forward in the hall beside the stem stops at the shoulder wall.
 */
export function clampToFootprint<P extends { x: number; z: number }>(p: P, f: FootprintSpec): P {
  p.x = Math.max(-f.rW / 2 + WALL_MARGIN, Math.min(f.rW / 2 - WALL_MARGIN, p.x));
  p.z = Math.max(-f.rL / 2 + WALL_MARGIN, Math.min(f.rL / 2 - FRONT_MARGIN, p.z));
  if (f.tShape) {
    const stemX = f.stemHalfW - WALL_MARGIN;   // max |x| while inside the stem
    const shoulderZ = f.widenZ - WALL_MARGIN;  // max z while beside the stem
    const dx = Math.abs(p.x) - stemX;          // penetration past the stem wall plane
    const dz = p.z - shoulderZ;                // penetration past the shoulder wall plane
    if (dx > 0 && dz > 0) {
      if (dx <= dz) p.x = (p.x >= 0 ? 1 : -1) * stemX; // in the stem, drifted sideways → pin to stem wall
      else p.z = shoulderZ;                            // in the hall beside the stem → stop at the shoulder
    }
  }
  return p;
}
