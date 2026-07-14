import * as THREE from "three";
import { getQuality } from "./mobilePerf";

// Shared, self-healing canvas sizing for all raw-three.js scenes.
// Root cause of the "palace renders too small" bug: scenes measured their
// container clientWidth/clientHeight ONCE at mount (before the lazy-Suspense /
// 100dvh layout had settled -> 0 or interim), had no ResizeObserver, and the
// only correction was a window "resize" listener never fired at init. This
// helper guards the measurement and re-fits on ResizeObserver / resize /
// orientation / a rAF one-shot, so a stale first-mount size self-corrects.

export interface FitTarget {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer?: { setSize: (w: number, h: number) => void } | null;
}

/** Read the element's real box, falling back to the viewport so a 0/stale
 *  measurement can never bake a tiny canvas or a NaN aspect. */
export function measure(el: HTMLElement) {
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  return { w, h };
}

/** Apply size + DPR + aspect to renderer/camera/composer. Returns applied dims. */
export function applyFit(el: HTMLElement, t: FitTarget) {
  const { w, h } = measure(el);
  if (w < 2 || h < 2) return null; // ignore transient 0
  const dpr = Math.min(window.devicePixelRatio, getQuality().maxPixelRatio);
  t.camera.aspect = w / h;
  t.camera.updateProjectionMatrix();
  t.renderer.setPixelRatio(dpr);
  t.renderer.setSize(w, h);
  t.composer?.setSize(w, h);
  return { w, h };
}

/** Wire self-healing sizing: ResizeObserver (container box changes — the
 *  load-bearing fix), window resize/orientation, and a rAF one-shot so a
 *  stale first-mount measurement corrects on the next frame.
 *  Returns a disposer to call in cleanup. */
export function autoFit(el: HTMLElement, t: FitTarget) {
  const onRs = () => applyFit(el, t);
  window.addEventListener("resize", onRs);
  window.addEventListener("orientationchange", onRs);
  const ro = new ResizeObserver(onRs);
  ro.observe(el);
  const raf = requestAnimationFrame(onRs);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("resize", onRs);
    window.removeEventListener("orientationchange", onRs);
  };
}
