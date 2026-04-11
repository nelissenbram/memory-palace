// ── Room Layout Variants ──
// Every layout includes ALL memory furniture (bookshelf, low table, desk,
// painting wall, screen, vinyl player, vitrine, orbs) so every memory type
// is always reachable. Variation is in room size, decorative style, and
// optional extra furniture.

export interface RoomLayout {
  id: string;
  name: string;
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
}

export const ROOM_LAYOUTS: RoomLayout[] = [
  {
    // 0: Den — the original cosy room, medium size
    id: "den", name: "Den",
    rW: 12, rL: 10, rH: 4.5,
    piano: false, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 1, plantCorners: [0, 1, 2], extraSconces: false,
  },
  {
    // 1: Study — square room with globe, reading chair, 2 windows
    id: "study", name: "Study",
    rW: 11, rL: 11, rH: 4,
    piano: false, readingChair: true, globe: true,
    rugStyle: "round", windowCount: 2, plantCorners: [0, 3], extraSconces: true,
  },
  {
    // 2: Parlour — wide + tall, 2 windows, extra sconces
    id: "parlour", name: "Parlour",
    rW: 14, rL: 9, rH: 5,
    piano: false, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 2, plantCorners: [0, 1, 2, 3], extraSconces: true,
  },
  {
    // 3: Salon — deeper + taller, grand piano, elegant
    id: "salon", name: "Salon",
    rW: 12, rL: 13, rH: 4.8,
    piano: true, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 1, plantCorners: [0, 1], extraSconces: false,
  },
  {
    // 4: Nook — small cosy room, reading chair, round rug
    id: "nook", name: "Nook",
    rW: 10, rL: 9, rH: 3.8,
    piano: false, readingChair: true, globe: false,
    rugStyle: "round", windowCount: 1, plantCorners: [2], extraSconces: false,
  },
  {
    // 5: Peristylium — open-air Roman courtyard garden with colonnades
    // 30×25 open courtyard. Height 6 (open sky, columns frame the space).
    id: "peristylium", name: "Peristylium",
    rW: 30, rL: 25, rH: 6,
    piano: false, readingChair: false, globe: false,
    rugStyle: "persian", windowCount: 2, plantCorners: [0, 1, 2, 3], extraSconces: true,
    isExhibition: true, paintingSlots: 20,
  },
];

// Layouts eligible for automatic (hash-based) assignment.
// Exhibition Hall is excluded — it must be chosen explicitly via layoutOverride.
const AUTO_LAYOUTS = ROOM_LAYOUTS.filter(l => !l.isExhibition);

export function layoutForRoom(roomId: string, layoutOverride?: string): RoomLayout {
  if (layoutOverride) {
    const found = ROOM_LAYOUTS.find(l => l.id === layoutOverride);
    if (found) return found;
  }
  let h = 0;
  for (const c of roomId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AUTO_LAYOUTS[h % AUTO_LAYOUTS.length];
}
