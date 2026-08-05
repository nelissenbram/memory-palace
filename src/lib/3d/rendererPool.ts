import * as THREE from "three";
import { getQuality } from "./mobilePerf";
import { CLEAR_COLOR, EXPOSURE } from "./canon";

/**
 * WebGL Renderer Pool — reuses a single renderer across scene transitions.
 *
 * Creating a new WebGLRenderer + compiling shaders costs 50-200ms per scene.
 * This pool keeps one renderer alive and lets scenes borrow/return it.
 *
 * Usage in scenes:
 *   const ren = borrowRenderer(width, height);
 *   el.appendChild(ren.domElement);
 *   // ... configure per-scene settings (toneMappingExposure, shadowMap, etc.) ...
 *   // On cleanup:
 *   el.removeChild(ren.domElement);
 *   returnRenderer(ren);
 */

let _pool: THREE.WebGLRenderer | null = null;
let _inUse = false;

/** Borrow a renderer from the pool, or create one if none available. */
export function borrowRenderer(w: number, h: number): THREE.WebGLRenderer {
  const Q = getQuality();

  if (_pool && !_inUse) {
    _inUse = true;
    _pool.setSize(w, h);
    _pool.setPixelRatio(Math.min(window.devicePixelRatio, Q.maxPixelRatio));
    // Reset state that scenes may have changed — grade continuity (MUSEO VIVO
    // WS9-5): a renderer leaving the pool for ANY scene carries the identical
    // canon grade. Tone mapping lives in the composer's ToneMappingEffect, so
    // the renderer stays at NoToneMapping; exposure feeds the effect uniform.
    _pool.shadowMap.enabled = Q.shadowsEnabled;
    _pool.toneMapping = THREE.NoToneMapping;
    _pool.toneMappingExposure = EXPOSURE;
    _pool.setClearColor(CLEAR_COLOR, 1);
    _pool.outputColorSpace = THREE.SRGBColorSpace;
    _pool.localClippingEnabled = false;
    _pool.clear();
    return _pool;
  }

  // Create fresh renderer — wrap in try-catch for WKWebView compatibility
  try {
    const ren = new THREE.WebGLRenderer({
      antialias: Q.antialias,
      powerPreference: "high-performance",
    });
    ren.setSize(w, h);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, Q.maxPixelRatio));
    ren.outputColorSpace = THREE.SRGBColorSpace;
    // Canon grade from birth — identical to the borrow-path reset above.
    ren.toneMapping = THREE.NoToneMapping;
    ren.toneMappingExposure = EXPOSURE;
    ren.setClearColor(CLEAR_COLOR, 1);
    _pool = ren;
    _inUse = true;
    return ren;
  } catch (e) {
    // Retry with default power preference (iPad WKWebView fallback)
    const ren = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "default",
    });
    ren.setSize(w, h);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    ren.outputColorSpace = THREE.SRGBColorSpace;
    ren.toneMapping = THREE.NoToneMapping;
    ren.toneMappingExposure = EXPOSURE;
    ren.setClearColor(CLEAR_COLOR, 1);
    _pool = ren;
    _inUse = true;
    return ren;
  }
}

/** Return a renderer to the pool for reuse by the next scene. */
export function returnRenderer(ren: THREE.WebGLRenderer): void {
  if (ren === _pool) {
    _inUse = false;
    // Clear any leftover state but keep the context alive
    ren.clear();
    ren.setRenderTarget(null);
  } else {
    // Unknown renderer — dispose it
    try { ren.forceContextLoss(); } catch {}
    ren.dispose();
  }
}

/**
 * Peek at the pooled renderer WITHOUT borrowing it (perf HUD / staging
 * assertions, WS11-1/-3). Read-only consumers only — never mutate state or
 * call render() through this reference.
 */
export function getPooledRenderer(): THREE.WebGLRenderer | null {
  return _pool;
}

/** Force-dispose the pooled renderer (e.g., on app unmount). */
export function disposePool(): void {
  if (_pool) {
    try { _pool.forceContextLoss(); } catch {}
    _pool.dispose();
    _pool = null;
    _inUse = false;
  }
}
