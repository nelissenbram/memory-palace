/**
 * WS12-1 — the ONE prefers-reduced-motion singleton. Scenes read this instead
 * of constructing their own matchMedia; cinematics and autoWalk swap forced
 * pans for crossfades/stills when it reports true.
 */

let mq: MediaQueryList | null = null;

function query(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  if (!mq) mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mq;
}

export function prefersReducedMotion(): boolean {
  return !!query()?.matches;
}

export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  const q = query();
  if (!q) return () => {};
  const handler = () => cb(q.matches);
  q.addEventListener("change", handler);
  return () => q.removeEventListener("change", handler);
}
