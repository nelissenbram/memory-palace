/**
 * MUSEO VIVO staging assertions (WS11-3) — periodic perf-budget sampler.
 *
 * Every 5s (only while flag3d("w1_assert") is on — staging-ON / prod-OFF) it
 * reads renderer.info from the pooled renderer and console.error's on:
 *   • draw-call budget: >150 calls per frame on mobile GPUs (demo checklist);
 *   • leak signal: geometries/textures rising MONOTONICALLY over >3 samples
 *     (scene cycles must return renderer.info.memory to baseline).
 *
 * Started/stopped from the PerfHud mount in MemoryPalace.tsx so the four scene
 * monoliths stay untouched. Ref-counted + history survives remounts, so
 * atrium↔3D mode switches don't reset leak detection.
 */
import * as THREE from "three";
import { flag3d } from "./flags3d";
import { isMobileGPU } from "./mobilePerf";
import { getPooledRenderer } from "./rendererPool";

const INTERVAL_MS = 5000;
/** Demo-checklist mobile budget: ≤150 draw calls per frame. */
const MOBILE_DRAW_CALL_BUDGET = 150;
/** Monotonic growth over MORE than 3 samples (i.e. 4 strictly-rising readings). */
const LEAK_WINDOW = 4;
const HISTORY_MAX = 12;

let _timer: ReturnType<typeof setInterval> | null = null;
let _refs = 0;
const _geo: number[] = [];
const _tex: number[] = [];

function strictlyRising(xs: number[]): boolean {
  if (xs.length < LEAK_WINDOW) return false;
  const w = xs.slice(-LEAK_WINDOW);
  for (let i = 1; i < w.length; i++) if (w[i] <= w[i - 1]) return false;
  return true;
}

function push(xs: number[], v: number): void {
  xs.push(v);
  if (xs.length > HISTORY_MAX) xs.shift();
}

function sample(): void {
  if (!flag3d("w1_assert")) return; // flag read per sample (5s) — never per frame
  const ren: THREE.WebGLRenderer | null = getPooledRenderer();
  if (!ren) return;
  const info = ren.info;

  // ── Budget: draw calls on mobile ──
  const calls = info.render.calls;
  if (isMobileGPU() && calls > MOBILE_DRAW_CALL_BUDGET) {
    console.error(
      `[mp-perf-assert] BUDGET EXCEEDED: ${calls} draw calls on mobile GPU (budget ${MOBILE_DRAW_CALL_BUDGET})`
    );
  }

  // ── Leak signal: renderer.info.memory growth across scene cycles ──
  push(_geo, info.memory.geometries);
  push(_tex, info.memory.textures);
  if (strictlyRising(_geo)) {
    console.error(
      `[mp-perf-assert] LEAK SIGNAL: geometries rising monotonically over ${LEAK_WINDOW} samples: ${_geo.slice(-LEAK_WINDOW).join(" → ")}`
    );
  }
  if (strictlyRising(_tex)) {
    console.error(
      `[mp-perf-assert] LEAK SIGNAL: textures rising monotonically over ${LEAK_WINDOW} samples: ${_tex.slice(-LEAK_WINDOW).join(" → ")}`
    );
  }
}

/** Start the sampler (ref-counted; safe to call from multiple mounts). */
export function startPerfAssert(): void {
  if (typeof window === "undefined") return;
  _refs++;
  if (_timer === null) _timer = setInterval(sample, INTERVAL_MS);
}

/**
 * Release one start ref; the interval stops when the last mount releases.
 * Sample history is deliberately KEPT so quick remounts (mode switches)
 * keep the cross-scene-cycle leak window intact.
 */
export function stopPerfAssert(): void {
  _refs = Math.max(0, _refs - 1);
  if (_refs === 0 && _timer !== null) {
    clearInterval(_timer);
    _timer = null;
  }
}
