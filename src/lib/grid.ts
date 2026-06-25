/**
 * Responsive grid-template-columns string. Phones get a compact multi-column layout that
 * NEVER collapses to a single tall column for icon+title card collections (the root cause
 * of "cards too long"). On mobile, columns auto-fill at `mobileMin` width; otherwise they
 * auto-fill at `min`. Uses the proven minmax(min(100%, …)) idiom so cells never overflow.
 *
 *   gridCols("16rem", isMobile)            -> auto-fill 16rem cells (desktop), 1 col phone fallback
 *   gridCols("16rem", isMobile, "9rem")    -> ~2-up on a 390px phone, roomy on desktop
 */
export function gridCols(min: string, isMobile: boolean, mobileMin?: string): string {
  const cell = isMobile && mobileMin ? mobileMin : min;
  return `repeat(auto-fill, minmax(min(100%, ${cell}), 1fr))`;
}

/** Fixed N columns on desktop, a compact 2-up (or `mobileCols`) on phones. */
export function gridColsFixed(desktopCols: number, isMobile: boolean, mobileCols = 2): string {
  return `repeat(${isMobile ? mobileCols : desktopCols}, minmax(0, 1fr))`;
}
