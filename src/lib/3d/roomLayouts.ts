// ── Room Layout Variants ──
// Every layout includes ALL memory furniture (bookshelf, low table, desk,
// painting wall, screen, vinyl player, vitrine, orbs) so every memory type
// is always reachable. Variation is in room size, decorative style, and
// optional extra furniture.

export interface RoomLayout {
  id: string;
  name: string;
  nameKey: string;
  rW: number; rL: number; rH: number;
  // optional extras (on top of mandatory furniture)
  piano: boolean;        // grand piano near front-right
  readingChair: boolean; // wingback chair by fireplace
  globe: boolean;        // decorative globe near desk
  // decorative tweaks
  rugStyle: "persian" | "round";
  windowCount: 1 | 2;
  plantCorners: number[];  // 0=back-left, 1=back-right, 2=front-left, 3=front-right
  extraSconces: boolean;
  // Exhibition hall — grand museum room with 20 painting slots + 1 video screen
  isExhibition?: boolean;
  paintingSlots?: number;   // number of wall paintings (default 1)
  // "The Enfilade" scalable rooms (w3_interior): a room grows by adding depth
  // BAYS as more photos hang. rW/rH stay frozen (they carry the proportions);
  // only rL lengthens, snapped to a tier. These are filled in by sizeForRoom().
  tier?: RoomTier;
  bays?: number;            // 0..MAX_BAYS depth bays added on top of the base rL
}

// ── The Enfilade — media-driven depth growth (w3_interior) ──
// Rooms lengthen along their depth axis (rL only) in snapped tiers as the
// number of displayed WALL photos grows. Width/height are sacred. Deterministic
// and pure so a room is stable across revisits; snapped tiers keep draw calls
// bounded and avoid a rebuild on every single add.
export const BAY_DEPTH = 4;   // metres of rL added per depth bay
export const MAX_BAYS = 3;    // iOS-safe ceiling on added bays
export const MAX_RL = 26;     // hard depth clamp (~ old peristylium footprint)

export type RoomTier = "Intimate" | "Hall" | "Gallery" | "Grand Enfilade";

/** Map a displayed-wall-photo count to a tier + bay count (owner thresholds: 6/16/32). */
export function tierForCount(count: number): { tier: RoomTier; bays: number } {
  if (count <= 6) return { tier: "Intimate", bays: 0 };
  if (count <= 16) return { tier: "Hall", bays: 1 };
  if (count <= 32) return { tier: "Gallery", bays: 2 };
  return { tier: "Grand Enfilade", bays: 3 };
}

/**
 * Grow ONLY the depth (rL) of a base layout by the media tier — the added wall
 * becomes salon-hang display space. rW/rH and every style field pass through
 * frozen (they carry the room's intimacy). The depth is PROPORTION-CLAMPED to
 * rW*1.6 so a deep room can never read as a corridor/hall (owner 2026-08-17).
 */
export function sizeForRoom(base: RoomLayout, count: number): RoomLayout {
  const { tier, bays } = tierForCount(count);
  const b = Math.min(bays, MAX_BAYS);
  const rL = Math.min(base.rL + b * BAY_DEPTH, base.rW * 1.6, MAX_RL);
  if (process.env.NODE_ENV !== "production" && rL / base.rW > 1.8) {
    console.warn(`[rooms] aspect rL/rW=${(rL / base.rW).toFixed(2)} > 1.8 — room risks reading as a hall`);
  }
  return { ...base, rL, tier, bays: b };
}

export const ROOM_LAYOUTS: RoomLayout[] = [
  {
    // 0: Den — the original cosy room, medium size
    id: "den", name: "Den", nameKey: "roomLayouts.den",
    rW: 12, rL: 10, rH: 4.5,
    piano: false, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 1, plantCorners: [0, 1, 2], extraSconces: false,
  },
  {
    // 1: Study — square room with globe, reading chair, 2 windows
    id: "study", name: "Study", nameKey: "roomLayouts.study",
    rW: 11, rL: 11, rH: 4,
    piano: false, readingChair: true, globe: true,
    rugStyle: "round", windowCount: 2, plantCorners: [0, 3], extraSconces: true,
  },
  {
    // 2: Parlour — wide + tall, 2 windows, extra sconces
    id: "parlour", name: "Parlour", nameKey: "roomLayouts.parlour",
    rW: 14, rL: 9, rH: 5,
    piano: false, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 2, plantCorners: [0, 1, 2, 3], extraSconces: true,
  },
  {
    // 3: Salon — deeper + taller, grand piano, elegant
    id: "salon", name: "Salon", nameKey: "roomLayouts.salon",
    rW: 12, rL: 13, rH: 4.8,
    piano: true, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 1, plantCorners: [0, 1], extraSconces: false,
  },
  {
    // 4: Nook — small cosy room, reading chair, round rug
    id: "nook", name: "Nook", nameKey: "roomLayouts.nook",
    rW: 10, rL: 9, rH: 3.8,
    piano: false, readingChair: true, globe: false,
    rugStyle: "round", windowCount: 1, plantCorners: [2], extraSconces: false,
  },
  {
    // 5: Peristylium — open-air Roman courtyard garden with colonnades
    // 30×25 open courtyard. Height 6 (open sky, columns frame the space).
    id: "peristylium", name: "Peristylium", nameKey: "roomLayouts.peristylium",
    rW: 30, rL: 25, rH: 6,
    piano: false, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 2, plantCorners: [0, 1, 2, 3], extraSconces: true,
    isExhibition: true, paintingSlots: 20,
  },
];

// Layouts eligible for automatic (hash-based) assignment.
// Exhibition Hall is excluded — it must be chosen explicitly via layoutOverride.
const AUTO_LAYOUTS = ROOM_LAYOUTS.filter(l => !l.isExhibition);

function pickBaseLayout(roomId: string, layoutOverride?: string): RoomLayout {
  if (layoutOverride) {
    const found = ROOM_LAYOUTS.find(l => l.id === layoutOverride);
    if (found) return found;
  }
  let h = 0;
  for (const c of roomId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AUTO_LAYOUTS[h % AUTO_LAYOUTS.length];
}

/**
 * Pick a room's STYLE variant by id-hash (or explicit override), then — when a
 * displayed-wall-photo `count` is supplied (w3_interior ON) — grow only its
 * depth (rL) to the media tier via sizeForRoom. `count` omitted → the legacy
 * fixed-size layout, byte-identical to before (flag-off path). Exhibition rooms
 * keep their fixed footprint (no tiered growth).
 */
export function layoutForRoom(roomId: string, layoutOverride?: string, count?: number): RoomLayout {
  let base = pickBaseLayout(roomId, layoutOverride);
  if (count === undefined) return base; // legacy fixed size (w3_interior OFF), incl. exhibition
  // W3 "Enfilade": the Peristylium is retired — a room pinned to it becomes a
  // scalable Salon; its wall assignments re-home as ordinary salon-hang art and
  // the count naturally lands it in the Gallery / Grand-Enfilade tier.
  if (base.isExhibition) base = ROOM_LAYOUTS.find(l => l.id === "salon") || base;
  return sizeForRoom(base, count);
}
