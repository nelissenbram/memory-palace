/**
 * Mobile performance detection and quality settings.
 *
 * Centralises device capability detection so all 3D code can
 * make consistent decisions about quality vs. performance.
 */

// ════════════════════════════════════════════
// DEVICE DETECTION
// ════════════════════════════════════════════

export type GPUTier = "potato" | "mobile" | "desktop";

let _gpuTier: GPUTier | null = null;
let _rendererString: string | null = null;
let _tierLogged = false;

/** Software renderers (no GPU acceleration) — potato tier even on desktop. */
const SOFTWARE_RENDERER_PATTERN = /SwiftShader|llvmpipe|Software\s*Rasterizer/i;

const POTATO_GPU_PATTERNS = [
  /Mali-[34]/i,
  /Adreno.*[23]../i, /Adreno\s*4[0-2]/i,
  /PowerVR\s*SGX/i,
  /Apple\s*A[78]\b/i,
  /Intel.*HD\s*Graphics\s*([0-3]\d{3}|[0-9]{1,3})\b/i,
  /SwiftShader/i, /llvmpipe/i, /Software\s*Rasterizer/i,
  /VideoCore/i, /Vivante/i,
];

function detectRendererString(): string {
  if (_rendererString !== null) return _rendererString;
  if (typeof document === "undefined") { _rendererString = ""; return ""; }
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) { _rendererString = ""; return ""; }
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    _rendererString = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
  } catch { _rendererString = ""; }
  return _rendererString!;
}

/** Classify the GPU into one of three tiers. Cached after first call. */
export function getGPUTier(): GPUTier {
  if (_gpuTier !== null) return _gpuTier;

  if (typeof window === "undefined") { _gpuTier = "desktop"; return "desktop"; }

  const smallScreen = window.innerWidth < 768 || window.innerHeight < 500;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent);
  // iPad has large screens but shares mobile GPU constraints in WKWebView
  // iPadOS 26+ may report "Macintosh" instead of "MacIntel" in navigator.platform
  const isIPad = /iPad/i.test(navigator.userAgent) ||
    (/Mac/i.test(navigator.platform) && hasTouch && navigator.maxTouchPoints > 1);
  // Capacitor iOS native app — always treat as mobile regardless of UA
  const cap = (window as any).Capacitor;
  const isCapacitorIOS = cap?.getPlatform?.() === "ios" ||
    (cap?.isNativePlatform?.() && /Mac|iPhone|iPad/i.test(navigator.platform));
  const isMobile = smallScreen || isIPad || isCapacitorIOS || (hasTouch && mobileUA);

  if (isMobile) {
    const renderer = detectRendererString();
    const isPotato = renderer && POTATO_GPU_PATTERNS.some(p => p.test(renderer));
    _gpuTier = isPotato ? "potato" : "mobile";
  } else {
    // Desktop is not automatically capable: software-rendered contexts
    // (SwiftShader/llvmpipe) can't handle desktop quality, so classify potato.
    const renderer = detectRendererString();
    const isSoftware = renderer && SOFTWARE_RENDERER_PATTERN.test(renderer);
    _gpuTier = isSoftware ? "potato" : "desktop";
  }
  if (!_tierLogged) {
    _tierLogged = true;
    console.info(`[mp-perf] tier=${_gpuTier} renderer=${_rendererString || "unknown"}`);
  }
  return _gpuTier;
}

/** Detect whether the device is a low-power mobile GPU.
 *  Cached after first call. */
export function isMobileGPU(): boolean {
  return getGPUTier() !== "desktop";
}

// ════════════════════════════════════════════
// QUALITY TIERS
// ════════════════════════════════════════════

export interface QualitySettings {
  /** Terrain grid segments (per axis). Desktop 256, mobile 64. */
  terrainSegments: number;
  /** Sky canvas resolution. Desktop 2048x1024, mobile 512x256. */
  skyCanvasWidth: number;
  skyCanvasHeight: number;
  /** Max pixel ratio. Desktop 2, mobile 1.0. */
  maxPixelRatio: number;
  /** Shadow map resolution. Desktop 2048, mobile 512. 0 = shadows disabled. */
  shadowMapSize: number;
  /** Whether shadows are enabled at all. */
  shadowsEnabled: boolean;
  /** Whether to enable SSAO post-processing. */
  ssao: boolean;
  /** Whether to enable DOF post-processing. */
  dof: boolean;
  /** Whether to enable bloom post-processing. */
  bloom: boolean;
  /** Whether to enable SMAA anti-aliasing. */
  smaa: boolean;
  /** Number of grass/wheat instances. Multiplier (0..1). */
  vegetationDensity: number;
  /** Whether to load the background HDRI panorama. */
  loadBackgroundHDRI: boolean;
  /** Whether to load the environment HDRI (for reflections). */
  loadEnvHDRI: boolean;
  /** PBR texture resolution suffix (WS2-7): "512" | "1k" | "2k".
   *  loadPBRSet derives filename suffixes from this; missing variants
   *  gracefully fall back to 1k (404→1k), so "512" is safe to set before
   *  all 512 assets exist. */
  textureRes: "512" | "1k" | "2k";
  /** Max number of PBR texture sets to load eagerly. Rest are deferred. */
  maxEagerTextureSets: number;
  /** Canvas texture resolution for memory paintings. */
  paintingResWidth: number;
  paintingResHeight: number;
  /** Antialias on WebGLRenderer. */
  antialias: boolean;
}

const DESKTOP_QUALITY: QualitySettings = {
  terrainSegments: 256,
  skyCanvasWidth: 2048,
  skyCanvasHeight: 1024,
  maxPixelRatio: 2,
  shadowMapSize: 2048,
  shadowsEnabled: true,
  ssao: true,
  dof: false, // DOF already disabled most places
  bloom: true,
  smaa: true,
  vegetationDensity: 1,
  loadBackgroundHDRI: true,
  loadEnvHDRI: true,
  textureRes: "1k",
  maxEagerTextureSets: 20,
  paintingResWidth: 512,
  paintingResHeight: 384,
  antialias: false, // Post-processing handles AA via SMAA
};

const MOBILE_QUALITY: QualitySettings = {
  terrainSegments: 128,
  skyCanvasWidth: 1024,
  skyCanvasHeight: 512,
  maxPixelRatio: 1.5,
  shadowMapSize: 1024,
  shadowsEnabled: true,
  ssao: false,
  dof: false,
  bloom: false,
  smaa: true,
  // Owner r2 2026-08-20 ("mobile vegetatie niet zelfde als desktop"): mobile
  // gets FULL desktop vegetation density — grass/wheat are instanced (draw-call
  // cheap); potato keeps its 0 floor.
  vegetationDensity: 1,
  // Mobile skips the 6.5 MB background HDRI (the procedural sky sphere stands
  // in) — it was documented as skipped but the flag was still true, so phones
  // were silently downloading + decoding it on exterior entry. Env HDRI (small,
  // used for PBR reflections) stays.
  loadBackgroundHDRI: false,
  loadEnvHDRI: true,
  textureRes: "1k",
  maxEagerTextureSets: 4,
  paintingResWidth: 256,
  paintingResHeight: 192,
  antialias: false,
};

const POTATO_QUALITY: QualitySettings = {
  terrainSegments: 32,
  skyCanvasWidth: 256,
  skyCanvasHeight: 128,
  maxPixelRatio: 0.75,
  shadowMapSize: 0,
  shadowsEnabled: false,
  ssao: false,
  dof: false,
  bloom: false,
  smaa: false,
  vegetationDensity: 0,
  loadBackgroundHDRI: false,
  loadEnvHDRI: false,
  textureRes: "512", // WS2-7: potato loads 512px PBR variants (404→1k fallback)
  maxEagerTextureSets: 2,
  paintingResWidth: 128,
  paintingResHeight: 96,
  antialias: false,
};

let _quality: QualitySettings | null = null;

const TIER_QUALITY: Record<GPUTier, QualitySettings> = {
  desktop: DESKTOP_QUALITY,
  mobile: MOBILE_QUALITY,
  potato: POTATO_QUALITY,
};

/** Get quality settings for the current device. Cached after first call.
 *  WS11-7: starts at a persisted governor demotion (≤7 days old) when one
 *  exists, and arms the adaptive governor on first browser-side call. */
export function getQuality(): QualitySettings {
  if (_quality) return _quality;
  const native = getGPUTier();
  let tier = native;
  const demoted = readGovernorDemotion();
  if (demoted && tierRank(demoted) < tierRank(native)) {
    tier = demoted;
    console.info(`[mp-perf] WS11-7 governor: starting at persisted demoted tier "${tier}" (native "${native}")`);
  }
  _effectiveTier = tier;
  _quality = { ...TIER_QUALITY[tier] };
  startGovernorOnce();
  return _quality;
}

// ════════════════════════════════════════════
// ADAPTIVE GOVERNOR (WS11-7)
// ════════════════════════════════════════════
//
// Samples rAF deltas for the first ~15s of 3D use. If >20% of frames miss
// the frame budget in a sustained way (majority of 3s windows), the device
// is demoted ONE tier (desktop→mobile→potato) — shadows/textureRes/
// vegetation etc. all follow the existing tier presets, no scene edits.
// The demotion is persisted per renderer string so the next load starts
// directly at the demoted tier. One-way ratchet: at most one demotion per
// session, never below potato. Promotion is manual (clearGovernorDemotion)
// or automatic after 7 days (record expiry → re-audition at native tier).

const GOV_KEY_PREFIX = "mp3d:governor:v1";
const GOV_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7-day re-audition
const GOV_SAMPLE_MS = 15000;  // total measurement span
const GOV_WARMUP_MS = 2500;   // ignore scene-load jank
const GOV_WINDOW_MS = 3000;   // evaluation window
const GOV_MISSED_FRAME_MS = 25; // >25ms delta = missed frame (<40fps instant on 60Hz)
const GOV_MISS_RATIO = 0.2;   // >20% missed frames = bad window
const GOV_MIN_BAD_WINDOWS = 2; // "sustained" = ≥2 of ~4 windows
const GOV_PAUSE_MS = 500;     // deltas above this = tab switch/GC pause, not a frame
const GOV_MIN_WINDOW_FRAMES = 30; // window must have enough visible frames to count

let _effectiveTier: GPUTier | null = null;
let _governorStarted = false;

function tierRank(t: GPUTier): number {
  return t === "potato" ? 0 : t === "mobile" ? 1 : 2;
}

function govKey(): string {
  return `${GOV_KEY_PREFIX}:${detectRendererString() || "unknown"}`;
}

function readGovernorDemotion(): GPUTier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(govKey());
    if (!raw) return null;
    const rec = JSON.parse(raw) as { tier?: string; at?: number };
    if (rec.tier !== "potato" && rec.tier !== "mobile") return null;
    if (typeof rec.at !== "number" || Date.now() - rec.at > GOV_TTL_MS) {
      window.localStorage.removeItem(govKey()); // expired → re-audition at native tier
      return null;
    }
    return rec.tier;
  } catch {
    return null;
  }
}

/** Manual promotion path: forget the persisted demotion so the next load
 *  re-auditions at the native tier. */
export function clearGovernorDemotion(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(govKey()); } catch {}
}

function governorDemote(): void {
  const cur = _effectiveTier ?? getGPUTier();
  const next: GPUTier | null = cur === "desktop" ? "mobile" : cur === "mobile" ? "potato" : null;
  if (!next) return; // potato floor — never below
  _effectiveTier = next;
  try { window.localStorage.setItem(govKey(), JSON.stringify({ tier: next, at: Date.now() })); } catch {}
  // In-place update so held getQuality() references read demoted values on
  // their next access; mounted scenes adopt fully on next mount.
  if (_quality) Object.assign(_quality, TIER_QUALITY[next]);
  console.info(`[mp-perf] WS11-7 governor: sustained missed frames — demoted "${cur}"→"${next}" (persisted 7d; clearGovernorDemotion() to re-audition)`);
}

function startGovernorOnce(): void {
  if (_governorStarted) return;
  _governorStarted = true;
  if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;
  if (_effectiveTier === "potato") return; // already at the floor
  let started = false;
  let start = 0, last = 0, winStart = 0;
  let winFrames = 0, winMissed = 0, badWindows = 0;
  const closeWindow = () => {
    if (winFrames >= GOV_MIN_WINDOW_FRAMES && winMissed / winFrames > GOV_MISS_RATIO) badWindows++;
    winFrames = 0; winMissed = 0;
  };
  const tick = (now: number) => {
    if (!started) { started = true; start = last = winStart = now; requestAnimationFrame(tick); return; }
    const dt = now - last;
    last = now;
    if (now - start >= GOV_WARMUP_MS && dt < GOV_PAUSE_MS && !document.hidden) {
      winFrames++;
      if (dt > GOV_MISSED_FRAME_MS) winMissed++;
    }
    if (now - winStart >= GOV_WINDOW_MS) { closeWindow(); winStart = now; }
    if (now - start >= GOV_SAMPLE_MS) {
      closeWindow();
      if (badWindows >= GOV_MIN_BAD_WINDOWS) governorDemote();
      return; // sampling done — governor runs once per session
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ════════════════════════════════════════════
// MATERIAL DOWNGRADE HELPER
// ════════════════════════════════════════════

/**
 * On mobile, MeshPhysicalMaterial fragment shaders are 2-3x heavier than
 * MeshStandardMaterial. This helper strips Physical-only properties
 * (transmission, ior, thickness, clearcoat, sheen) and returns a
 * MeshStandardMaterial on mobile, or the original MeshPhysicalMaterial
 * on desktop.
 *
 * Usage: `mkPhys(THREE, { color: "#B8973A", clearcoat: 0.15, ... })`
 */
export function mkPhys(
  three: { MeshPhysicalMaterial: any; MeshStandardMaterial: any },
  props: Record<string, any>
): any {
  if (!isMobileGPU()) {
    return new three.MeshPhysicalMaterial(props);
  }
  // Strip Physical-only properties
  const stripped = { ...props };
  delete stripped.transmission;
  delete stripped.ior;
  delete stripped.thickness;
  delete stripped.clearcoat;
  delete stripped.clearcoatRoughness;
  delete stripped.clearcoatNormalMap;
  delete stripped.clearcoatNormalScale;
  delete stripped.sheen;
  delete stripped.sheenRoughness;
  delete stripped.sheenColor;
  delete stripped.reflectivity;
  delete stripped.attenuationColor;
  delete stripped.attenuationDistance;
  // For glass/window materials using transmission, replace with simple opacity
  if (props.transmission && props.transmission > 0) {
    stripped.transparent = true;
    stripped.opacity = Math.min(props.opacity ?? 0.7, 0.7);
  }
  return new three.MeshStandardMaterial(stripped);
}

/** Override quality (useful for testing). */
export function setQualityOverride(q: Partial<QualitySettings>): void {
  _quality = { ...getQuality(), ...q };
}
