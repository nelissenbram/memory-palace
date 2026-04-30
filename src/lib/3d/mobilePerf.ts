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
  const isMobile = smallScreen || (hasTouch && mobileUA);

  if (isMobile) {
    const renderer = detectRendererString();
    const isPotato = renderer && POTATO_GPU_PATTERNS.some(p => p.test(renderer));
    _gpuTier = isPotato ? "potato" : "mobile";
  } else {
    _gpuTier = "desktop";
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
  /** PBR texture resolution suffix: "1k" or "2k". */
  textureRes: "1k" | "2k";
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
  vegetationDensity: 0.5,
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
  textureRes: "1k",
  maxEagerTextureSets: 2,
  paintingResWidth: 128,
  paintingResHeight: 96,
  antialias: false,
};

let _quality: QualitySettings | null = null;

/** Get quality settings for the current device. Cached after first call. */
export function getQuality(): QualitySettings {
  if (_quality) return _quality;
  const tier = getGPUTier();
  _quality = tier === "desktop" ? { ...DESKTOP_QUALITY }
           : tier === "potato"  ? { ...POTATO_QUALITY }
           : { ...MOBILE_QUALITY };
  return _quality;
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
