/**
 * Greedy justified-row packer — the Google/Apple Photos algorithm.
 * Packs items of varying aspect ratio into flush, edge-to-edge rows of a
 * target height, so the wall has organic widths with no ragged right edge.
 * Pure + O(n); deterministic first paint via aspect-ratio fallbacks.
 */

export interface Packable {
  id: string;
  ar: number; // width / height
}
export interface PackedTile<T> { item: T; w: number; h: number; }
export interface PackedRow<T> { tiles: PackedTile<T>[]; height: number; last?: boolean; }

/** Deterministic aspect fallback by memory type (photos landscape, rest square). */
export function fallbackAspect(type: string | undefined): number {
  switch (type) {
    case "photo":
    case "painting":
    case "album":
    case "video":
      return 1.5; // 3:2
    default:
      return 1.0; // square for audio / story / document / interview / orb …
  }
}

/** Module-level cache of real aspect ratios once images decode (Phase 2 fills this). */
const AR_CACHE = new Map<string, number>();
export function setAspect(id: string, ar: number) {
  if (ar > 0.05 && ar < 20) AR_CACHE.set(id, ar);
}
export function getAspect(id: string, type?: string): number {
  return AR_CACHE.get(id) ?? fallbackAspect(type);
}

export function packJustifiedRows<T extends { id: string; ar: number }>(
  items: T[],
  containerWidth: number,
  targetRowHeight: number,
  gap: number,
): PackedRow<T>[] {
  const rows: PackedRow<T>[] = [];
  if (containerWidth <= 0 || items.length === 0) return rows;
  let cur: T[] = [];
  let sumAR = 0;
  for (const it of items) {
    cur.push(it);
    sumAR += it.ar;
    // natural row height if this row filled the width
    const h = (containerWidth - gap * (cur.length - 1)) / sumAR;
    if (h <= targetRowHeight) {
      const tiles = cur.map((item) => ({ item, w: item.ar * h, h }));
      rows.push({ tiles, height: h });
      cur = [];
      sumAR = 0;
    }
  }
  // trailing short row: left-align at target height, never stretch (Photos behaviour)
  if (cur.length) {
    const h = targetRowHeight;
    rows.push({ tiles: cur.map((item) => ({ item, w: item.ar * h, h })), height: h, last: true });
  }
  return rows;
}

/** Responsive target row height from measured container width — no breakpoints. */
export function targetRowHeight(containerWidth: number): number {
  if (containerWidth < 420) return 116;   // phone: 2-4 photos per row
  if (containerWidth < 700) return 150;
  if (containerWidth < 1100) return 176;
  return 200;                              // desktop
}
