// ─────────────────────────────────────────────────────────────────────────────
// Spot ordering — ONE canon for "which memory occupies which display anchor".
// The Steward's Ledger (lane order + spot labels + drag & drop) and
// InteriorScene (bucket → anchor mount order) both sort with byLaneOrder, so
// the card dropped on spot N in the Ledger is exactly the memory that renders
// at anchor N in the 3D room.
//   • memories.sort_order (int, default 0) carries the explicit order — 1-based.
//     0/null = "never placed" → sorts AFTER every placed item, by createdAt
//     (the historic chronological hang), so untouched rooms are byte-identical.
//   • displayed===true (explicit picks) outrank never-toggled items, mirroring
//     InteriorScene's pickDisplayed partition (explicit picks keep priority
//     when a station is over capacity). A Ledger drop writes displayed:true +
//     sort_order for the whole lane, making the lane uniform either way.
// ─────────────────────────────────────────────────────────────────────────────

interface SpotOrderable {
  sortOrder?: number | null;
  displayed?: boolean | null;
  createdAt?: string;
  revealDate?: string;
}

/** Explicit spot number (1-based). 0/null/undefined = "never placed" → last. */
export function spotOrderOf(m: SpotOrderable): number {
  const v = m.sortOrder;
  return typeof v === "number" && v > 0 ? v : Number.MAX_SAFE_INTEGER;
}

/** Explicit spot first, then chronological (the historic hang order). */
export function bySpotOrder(a: SpotOrderable, b: SpotOrderable): number {
  const d = spotOrderOf(a) - spotOrderOf(b);
  if (d) return d;
  return (
    new Date(a.createdAt || a.revealDate || 0).getTime() -
    new Date(b.createdAt || b.revealDate || 0).getTime()
  );
}

/** Lane canon: explicitly-displayed picks first (pickDisplayed parity), then bySpotOrder. */
export function byLaneOrder(a: SpotOrderable, b: SpotOrderable): number {
  const ra = a.displayed === true ? 0 : 1;
  const rb = b.displayed === true ? 0 : 1;
  if (ra !== rb) return ra - rb;
  return bySpotOrder(a, b);
}
