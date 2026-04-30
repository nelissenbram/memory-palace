import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

/**
 * Asset loader for real HDRI environment maps and PBR texture sets.
 * Uses Poly Haven assets stored in /public/textures/.
 *
 * All assets are CC0 from https://polyhaven.com
 */

// Shared loaders (reused across scenes)
const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();

// KTX2 loader — initialized lazily when a renderer is available
let ktx2Loader: KTX2Loader | null = null;

// ── Caches (persist across scene transitions) ──
const pbrCache = new Map<string, PBRTextureSet>();
// Cache raw HDR data (ArrayBuffer) so we don't re-fetch, but re-run PMREM per renderer
const hdrDataCache = new Map<string, THREE.DataTexture>();
const compressedTextureCache = new Map<string, THREE.Texture>();

/** Check if a texture is managed by the PBR asset cache. Cached textures
 *  must NOT be disposed by individual scenes — they are shared across scene transitions. */
export function isCachedTexture(tex: THREE.Texture): boolean {
  for (const set of pbrCache.values()) {
    if (tex === set.map || tex === set.normalMap || tex === set.roughnessMap || tex === set.aoMap) return true;
  }
  return false;
}

/** Build a Set of all cached textures for O(1) lookup during scene cleanup.
 *  Call once at the start of cleanup instead of calling isCachedTexture per texture. */
export function buildCachedTextureSet(): Set<THREE.Texture> {
  const s = new Set<THREE.Texture>();
  for (const set of pbrCache.values()) {
    if (set.map) s.add(set.map);
    if (set.normalMap) s.add(set.normalMap);
    if (set.roughnessMap) s.add(set.roughnessMap);
    if (set.aoMap) s.add(set.aoMap);
  }
  return s;
}

// ════════════════════════════════════════════
// KTX2 COMPRESSED TEXTURES
// ════════════════════════════════════════════

/**
 * Initialise the KTX2 loader with a renderer (needed for Basis transcoder).
 * Safe to call multiple times — only the first call has an effect.
 */
export function initKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    // Basis Universal transcoder WASM files served from /basis/
    ktx2Loader.setTranscoderPath("/basis/");
    ktx2Loader.detectSupport(renderer);
  }
  return ktx2Loader;
}

/**
 * Load a GPU-compressed KTX2 texture with automatic fallback to standard
 * TextureLoader for non-KTX2 files or when KTX2 loading fails.
 *
 * If the URL ends with `.ktx2`, attempts KTX2Loader first.
 * Otherwise (or on failure) falls back to standard TextureLoader.
 *
 * @param url       Path to the texture file (.ktx2, .jpg, .png, etc.)
 * @param renderer  WebGL renderer (required for KTX2 transcoder detection)
 */
export async function loadCompressedTexture(
  url: string,
  renderer?: THREE.WebGLRenderer
): Promise<THREE.Texture> {
  // Return cached texture if available
  const cached = compressedTextureCache.get(url);
  if (cached) return cached;

  const isKTX2 = url.toLowerCase().endsWith(".ktx2");

  if (isKTX2 && renderer) {
    try {
      const loader = initKTX2Loader(renderer);
      const texture = await loader.loadAsync(url);
      compressedTextureCache.set(url, texture);
      return texture;
    } catch (err) {
      console.warn(
        `[AssetLoader] KTX2 load failed for ${url}, falling back to standard loader`,
        err
      );
    }
  }

  // Fallback: standard TextureLoader (works for .jpg, .png, .webp, and as
  // a safety net for KTX2 failures — caller would typically provide a .jpg fallback URL)
  return new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      // Strip .ktx2 extension and try .jpg as fallback
      isKTX2 ? url.replace(/\.ktx2$/i, ".jpg") : url,
      (tex) => {
        compressedTextureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

// ════════════════════════════════════════════
// HDRI ENVIRONMENT MAPS
// ════════════════════════════════════════════

/** Load an HDR environment map and generate a prefiltered env map for PBR IBL.
 *  Raw HDR data is cached for reuse, but PMREM is regenerated per renderer
 *  since PMREM textures are GPU render targets tied to the renderer that created them. */
export function loadHDRI(
  renderer: THREE.WebGLRenderer,
  path: string,
  onLoad?: (envMap: THREE.Texture) => void
): Promise<THREE.Texture> {
  // If we already have the raw HDR data cached, just re-run PMREM with this renderer
  const cachedRaw = hdrDataCache.get(path);
  if (cachedRaw) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromEquirectangular(cachedRaw).texture;
    pmrem.dispose();
    onLoad?.(envMap);
    return Promise.resolve(envMap);
  }

  return new Promise<THREE.Texture>((resolve, reject) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    rgbeLoader.load(
      path,
      (hdrTexture) => {
        // Cache the raw HDR texture for future renderers
        hdrDataCache.set(path, hdrTexture);
        const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
        // Don't dispose hdrTexture — it's cached for reuse
        pmrem.dispose();
        onLoad?.(envMap);
        resolve(envMap);
      },
      undefined,
      (err) => {
        console.warn(`[AssetLoader] Failed to load HDRI: ${path}`, err);
        pmrem.dispose();
        reject(err);
      }
    );
  });
}

// ════════════════════════════════════════════
// PROGRESSIVE HDRI LOADING
// ════════════════════════════════════════════

/**
 * Callback interface for progressive HDRI loading stages.
 */
export interface ProgressiveHDRICallbacks {
  /** Called immediately with a procedural low-res environment (no network) */
  onProcedural?: (envMap: THREE.Texture) => void;
  /** Called when the small preview HDRI is ready */
  onPreview?: (envMap: THREE.Texture) => void;
  /** Called when the full-resolution HDRI is ready */
  onFull?: (envMap: THREE.Texture) => void;
}

/**
 * Create a simple procedural gradient environment map for instant use
 * while real HDRIs are loading.
 */
function createProceduralEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  // Create a small gradient DataTexture as a stand-in sky
  const width = 64;
  const height = 32;
  const data = new Float32Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const t = y / height; // 0 = top, 1 = bottom
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Warm gradient: pale sky at top -> warm amber at horizon
      data[idx] = 0.6 + t * 0.4;     // R
      data[idx + 1] = 0.55 + t * 0.3; // G
      data[idx + 2] = 0.5 + t * 0.1;  // B
      data[idx + 3] = 1.0;             // A
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;

  const envMap = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();

  return envMap;
}

/**
 * Load an HDRI progressively in three stages:
 *
 * 1. **Procedural** — instant, no network, warm gradient
 * 2. **Preview** — small HDRI (e.g., 256px) loaded quickly
 * 3. **Full** — final high-resolution HDRI
 *
 * Backward-compatible: if no preview path exists, skips stage 2.
 * Returns a Promise that resolves with the final (full-res) envMap.
 *
 * @param renderer     WebGL renderer
 * @param fullPath     Path to the full-resolution HDRI
 * @param callbacks    Optional stage callbacks
 * @param previewPath  Optional path to a low-res preview HDRI
 */
export async function loadHDRIProgressive(
  renderer: THREE.WebGLRenderer,
  fullPath: string,
  callbacks?: ProgressiveHDRICallbacks,
  previewPath?: string
): Promise<THREE.Texture> {
  // Stage 1: Procedural environment — instant
  const proceduralEnv = createProceduralEnv(renderer);
  callbacks?.onProcedural?.(proceduralEnv);

  // Stage 2: Preview HDRI (if provided)
  let previewEnv: THREE.Texture | null = null;
  if (previewPath) {
    try {
      previewEnv = await loadHDRI(renderer, previewPath);
      callbacks?.onPreview?.(previewEnv);
    } catch {
      // Preview failed — no problem, we still have procedural
      console.debug("[AssetLoader] Preview HDRI not available, skipping");
    }
  }

  // Stage 3: Full-resolution HDRI
  const fullEnv = await loadHDRI(renderer, fullPath);
  callbacks?.onFull?.(fullEnv);

  // Clean up intermediate textures now that full-res HDRI is loaded.
  // These are PMREM render targets, not shared cache entries, so safe to dispose.
  proceduralEnv.dispose();
  if (previewEnv) previewEnv.dispose();

  return fullEnv;
}

/** Interior HDRI — warm ballroom with chandeliers */
export const HDRI_INTERIOR = "/textures/hdri/ballroom_1k.hdr";
/** Exterior HDRI — courtyard with warm daylight */
export const HDRI_EXTERIOR = "/textures/hdri/courtyard_1k.hdr";
/** Tuscan landscape HDRI — Alps field panorama for realistic background */
export const HDRI_TUSCAN_LANDSCAPE = "/textures/hdri/tuscan_landscape_2k.hdr";

// ════════════════════════════════════════════
// PBR TEXTURE SETS
// ════════════════════════════════════════════

export interface PBRTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
}

/** Load a PBR texture set (diffuse, normal, roughness, AO).
 *  Results are cached by basePath+prefix+repeat — repeat visits reuse GPU textures. */
function loadPBRSet(
  basePath: string,
  prefix: string,
  options?: {
    repeat?: [number, number];
    normalScale?: number;
  }
): PBRTextureSet {
  const repeat = options?.repeat || [1, 1];
  const cacheKey = `${basePath}|${prefix}|${repeat[0]},${repeat[1]}`;
  const cached = pbrCache.get(cacheKey);
  if (cached) return cached;

  const configTex = (tex: THREE.Texture) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    return tex;
  };

  const map = configTex(textureLoader.load(`${basePath}/${prefix}_diff_1k.jpg`));
  map.colorSpace = THREE.SRGBColorSpace;

  const normalMap = configTex(textureLoader.load(`${basePath}/${prefix}_nor_gl_1k.jpg`));
  const roughnessMap = configTex(textureLoader.load(`${basePath}/${prefix}_rough_1k.jpg`));
  const aoMap = configTex(textureLoader.load(`${basePath}/${prefix}_ao_1k.jpg`));
  // Basic geometries (Box, Plane, etc.) only have UV channel 0.
  // Three.js aoMap defaults to channel 1 (uv2), so override to channel 0.
  aoMap.channel = 0;

  const set = { map, normalMap, roughnessMap, aoMap };
  pbrCache.set(cacheKey, set);
  return set;
}

// ── Pre-configured texture loaders for each surface type ──

/** Polished cream marble — for entrance hall floors, pedestals, columns */
export function loadMarbleTextures(repeat: [number, number] = [4, 4]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/marble", "marble_01", { repeat });
}

/** Herringbone parquet — for corridor and room floors */
export function loadHerringboneTextures(repeat: [number, number] = [4, 4]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/herringbone", "herringbone_parquet", { repeat });
}

/** Dark wood — for doors, furniture, wainscoting */
export function loadDarkWoodTextures(repeat: [number, number] = [2, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/dark_wood", "dark_wood", { repeat });
}

/** Plaster wall — for wall surfaces */
export function loadPlasterWallTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/plaster_wall", "painted_plaster_wall", { repeat });
}

/** Worn plaster wall — aged Italian villa exterior walls */
export function loadWornPlasterTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/worn_plaster_wall", "worn_plaster_wall", { repeat });
}

/** Clay plaster — warm Tuscan villa stucco with coarse weathered finish (CC0, Poly Haven) */
export function loadClayPlasterTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/clay_plaster", "clay_plaster", { repeat });
}

/** Stone floor tiles — for corridor and entrance floors */
export function loadFloorTileTextures(repeat: [number, number] = [4, 4]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/floor_tiles", "floor_tiles_02", { repeat });
}

/** Woven fabric pattern — for rugs and upholstery */
export function loadFabricTextures(repeat: [number, number] = [2, 2]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/fabric", "fabric_pattern_07", { repeat });
}

/** Velour velvet — for curtains, cushions, velvet surfaces */
export function loadVelvetTextures(repeat: [number, number] = [2, 2]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/velvet", "velour_velvet", { repeat });
}

// ── Era-specific texture loaders (Roman) ──

/** Travertine stone — Roman walls, columns */
export function loadTravertineTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/travertine", "travertine", { repeat });
}

/** Terracotta tiles — Roman roofing, accents */
export function loadTerracottaTileTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/terracotta_tiles", "terracotta_tiles", { repeat });
}

/** Roman mosaic — decorative floors */
export function loadRomanMosaicTextures(repeat: [number, number] = [2, 2]): PBRTextureSet {
  // Falls back to floor tiles if mosaic textures unavailable
  return loadPBRSet("/textures/pbr/floor_tiles", "floor_tiles_02", { repeat });
}

// ── Era-specific texture loaders (Renaissance) ──

/** Sandstone (pietra serena grey) — Renaissance columns, trim */
export function loadSandstoneTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/sandstone", "sandstone", { repeat });
}

/** Ornate plaster — Renaissance frescoed/textured walls */
export function loadOrnatePlasterTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/ornate_plaster", "ornate_plaster", { repeat });
}

/** Florentine tile — Renaissance floor tiles */
export function loadFlorentineTileTextures(repeat: [number, number] = [4, 4]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/floor_tiles", "floor_tiles_02", { repeat });
}

/** Walnut wood — Renaissance furniture, coffered ceilings */
export function loadWalnutWoodTextures(repeat: [number, number] = [2, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/walnut_wood", "walnut_wood", { repeat });
}

// ── Exterior landscape texture loaders ──
// These reuse existing PBR sets as stand-ins until dedicated landscape textures are added

/** Grass — uses plaster wall textures tinted green via material color */
export function loadGrassTextures(repeat: [number, number] = [12, 12]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/plaster_wall", "painted_plaster_wall", { repeat });
}

/** Ground / earth — uses plaster wall textures tinted brown via material color */
export function loadGroundTextures(repeat: [number, number] = [8, 8]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/plaster_wall", "painted_plaster_wall", { repeat });
}

/** Crop / wheat fields — uses plaster wall textures tinted golden via material color */
export function loadCropTextures(repeat: [number, number] = [6, 6]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/plaster_wall", "painted_plaster_wall", { repeat });
}

/** White gravel roads (strade bianche) — uses travertine textures */
export function loadWhiteGravelTextures(repeat: [number, number] = [4, 4]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/travertine", "travertine", { repeat });
}

/** Gravel road — uses travertine textures */
export function loadGravelRoadTextures(repeat: [number, number] = [3, 3]): PBRTextureSet {
  return loadPBRSet("/textures/pbr/travertine", "travertine", { repeat });
}

/** Load a single displacement map texture */
export function loadDisplacementMap(path: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}

// ════════════════════════════════════════════
// DISPOSAL
// ════════════════════════════════════════════

/** Dispose textures. Cached sets are kept alive for reuse across scenes. */
export function disposePBRSet(set: PBRTextureSet) {
  // If this set is in cache, keep it alive for next scene
  for (const cached of pbrCache.values()) {
    if (cached === set) return;
  }
  set.map.dispose();
  set.normalMap.dispose();
  set.roughnessMap.dispose();
  set.aoMap.dispose();
}
