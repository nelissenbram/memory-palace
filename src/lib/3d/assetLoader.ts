import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { getQuality, type QualitySettings } from "./mobilePerf";
import { getPooledRenderer } from "./rendererPool";

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
// Base (repeat-agnostic) PBR textures — each file is fetched/decoded exactly once;
// per-repeat variants in pbrCache are lightweight clones sharing the base's Source
const pbrBaseCache = new Map<string, PBRTextureSet>();
// Clones created before their base texture finished loading — marked
// needsUpdate from the base's onLoad so they upload once the image is ready
const pendingClones = new Map<THREE.Texture, THREE.Texture[]>();
// Cache raw HDR data (ArrayBuffer) so we don't re-fetch, but re-run PMREM per renderer
const hdrDataCache = new Map<string, THREE.DataTexture>();
const compressedTextureCache = new Map<string, THREE.Texture>();

// ── Environment-map cache (PMREM results) ──
// PMREM textures are GPU resources tied to the renderer that created them, so the
// cache is keyed per renderer (WeakMap) + a string key (HDR url / procedural params).
// Entries are refcounted: scenes acquire on mount and release on cleanup instead of
// disposing, so the processed env map (and the shader programs sampling it) survive
// scene transitions. Unreferenced entries beyond a small cap are evicted + disposed.
interface EnvMapEntry {
  key: string;
  map: Map<string, EnvMapEntry>;
  tex: THREE.Texture;
  refs: number;
  lru: number;
  dispose: () => void;
}
const envMapCacheByRenderer = new WeakMap<THREE.WebGLRenderer, Map<string, EnvMapEntry>>();
const envMapEntryByTexture = new Map<THREE.Texture, EnvMapEntry>();
let _envLruClock = 0;
const ENV_CACHE_MAX_IDLE = 6;

/** Get (or create via `create`) a cached PMREM env texture for this renderer+key.
 *  Callers MUST balance every acquire with releaseEnvMap() (not .dispose()). */
export function acquireEnvMap(
  renderer: THREE.WebGLRenderer,
  key: string,
  create: () => { texture: THREE.Texture; dispose: () => void }
): THREE.Texture {
  let map = envMapCacheByRenderer.get(renderer);
  if (!map) {
    map = new Map();
    envMapCacheByRenderer.set(renderer, map);
  }
  let entry = map.get(key);
  if (entry) {
    entry.refs++;
    entry.lru = ++_envLruClock;
    return entry.tex;
  }
  const made = create();
  entry = { key, map, tex: made.texture, refs: 1, lru: ++_envLruClock, dispose: made.dispose };
  map.set(key, entry);
  envMapEntryByTexture.set(entry.tex, entry);
  // Evict oldest unreferenced entries beyond the cap
  const idle: EnvMapEntry[] = [];
  for (const e of map.values()) if (e !== entry && e.refs <= 0) idle.push(e);
  idle.sort((a, b) => a.lru - b.lru);
  while (idle.length > ENV_CACHE_MAX_IDLE) {
    const ev = idle.shift()!;
    map.delete(ev.key);
    envMapEntryByTexture.delete(ev.tex);
    try { ev.dispose(); } catch {}
  }
  return entry.tex;
}

/** True if this texture is managed by the env-map cache (must not be disposed by scenes). */
export function isCachedEnvMap(tex: THREE.Texture): boolean {
  return envMapEntryByTexture.has(tex);
}

/** Release an env map obtained from acquireEnvMap/loadHDRI/createProceduralEnv.
 *  Cached maps are refcount-decremented (kept warm for the next scene);
 *  non-cached maps are disposed directly — safe drop-in for `tex.dispose()`. */
export function releaseEnvMap(tex: THREE.Texture | null | undefined): void {
  if (!tex) return;
  const entry = envMapEntryByTexture.get(tex);
  if (!entry) { tex.dispose(); return; }
  entry.refs = Math.max(0, entry.refs - 1);
}

// Externally-registered cached textures (e.g. CorridorScene's module-level
// painting texture cache) — exempt from scene dispose sweeps exactly like the
// PBR cache textures above, so they survive scene transitions.
const externallyCachedTextures = new Set<THREE.Texture>();

/** Register a module-cached texture owned by another cache so scene dispose
 *  sweeps (via isCachedTexture/buildCachedTextureSet) leave it alive. */
export function registerCachedTexture(tex: THREE.Texture): void {
  externallyCachedTextures.add(tex);
}

/** Check if a texture is managed by the PBR asset cache. Cached textures
 *  must NOT be disposed by individual scenes — they are shared across scene transitions. */
export function isCachedTexture(tex: THREE.Texture): boolean {
  if (externallyCachedTextures.has(tex)) return true;
  for (const cache of [pbrCache, pbrBaseCache]) {
    for (const set of cache.values()) {
      if (tex === set.map || tex === set.normalMap || tex === set.roughnessMap || tex === set.aoMap) return true;
    }
  }
  return false;
}

/** Build a Set of all cached textures for O(1) lookup during scene cleanup.
 *  Call once at the start of cleanup instead of calling isCachedTexture per texture. */
export function buildCachedTextureSet(): Set<THREE.Texture> {
  const s = new Set<THREE.Texture>(externallyCachedTextures);
  for (const cache of [pbrCache, pbrBaseCache]) {
    for (const set of cache.values()) {
      if (set.map) s.add(set.map);
      if (set.normalMap) s.add(set.normalMap);
      if (set.roughnessMap) s.add(set.roughnessMap);
      if (set.aoMap) s.add(set.aoMap);
    }
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

// ── WS2-6: KTX2 manifest feature-detect ──
// KTX2 routing is only active for files listed in
// /textures/pbr/ktx2-manifest.json (written by scripts/build-ktx2.mjs).
// No manifest (or an empty one) → the JPG pipeline stays authoritative, so
// this ships safely before any .ktx2 assets are generated.
let ktx2Manifest: Set<string> | null = null;
let ktx2ManifestRequested = false;

function requestKTX2Manifest(): void {
  if (ktx2ManifestRequested || typeof window === "undefined" || typeof fetch === "undefined") return;
  ktx2ManifestRequested = true;
  fetch("/textures/pbr/ktx2-manifest.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        ktx2Manifest = new Set(list.map(String));
        console.info(`[AssetLoader] WS2-6: KTX2 manifest loaded — ${ktx2Manifest.size} compressed textures available`);
      }
    })
    .catch(() => { /* manifest absent — JPG pipeline stays authoritative */ });
}

/** WS2-6: pick a manifest-confirmed .ktx2 URL for this map, preferring the
 *  active textureRes and falling back to the 1k variant. Returns null when
 *  routing must stay on JPG (no manifest / no renderer for transcoding). */
function pickKTX2Url(basePath: string, prefix: string, kind: string, res: QualitySettings["textureRes"]): string | null {
  if (!ktx2Manifest || !getPooledRenderer()) return null;
  const resChain = res === "1k" ? ["1k"] : [res, "1k"];
  for (const r of resChain) {
    const url = `${basePath}/${prefix}_${kind}_${r}.ktx2`;
    if (ktx2Manifest.has(url)) return url;
  }
  return null;
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

/** Run PMREM on raw HDR data — used as the acquireEnvMap factory. */
function pmremFromHDR(renderer: THREE.WebGLRenderer, hdr: THREE.DataTexture): { texture: THREE.Texture; dispose: () => void } {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const texture = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();
  return { texture, dispose: () => texture.dispose() };
}

/** Load an HDR environment map and generate a prefiltered env map for PBR IBL.
 *  Raw HDR data is cached for reuse, and the PMREM-processed result is cached
 *  per renderer (keyed by url) so repeat mounts skip the PMREM pass entirely.
 *  Callers must releaseEnvMap() the result instead of disposing it. */
export function loadHDRI(
  renderer: THREE.WebGLRenderer,
  path: string,
  onLoad?: (envMap: THREE.Texture) => void
): Promise<THREE.Texture> {
  // If we already have the raw HDR data cached, reuse (or build once) the PMREM result
  const cachedRaw = hdrDataCache.get(path);
  if (cachedRaw) {
    const envMap = acquireEnvMap(renderer, `hdr|${path}`, () => pmremFromHDR(renderer, cachedRaw));
    onLoad?.(envMap);
    return Promise.resolve(envMap);
  }

  return new Promise<THREE.Texture>((resolve, reject) => {
    rgbeLoader.load(
      path,
      (hdrTexture) => {
        // Cache the raw HDR texture for future renderers
        hdrDataCache.set(path, hdrTexture);
        // Don't dispose hdrTexture — it's cached for reuse
        const envMap = acquireEnvMap(renderer, `hdr|${path}`, () => pmremFromHDR(renderer, hdrTexture));
        onLoad?.(envMap);
        resolve(envMap);
      },
      undefined,
      (err) => {
        console.warn(`[AssetLoader] Failed to load HDRI: ${path}`, err);
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
 * while real HDRIs are loading. Cached per renderer (parameterless).
 */
function createProceduralEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  return acquireEnvMap(renderer, "procedural|gradient", () => {
    const texture = buildProceduralEnv(renderer);
    return { texture, dispose: () => texture.dispose() };
  });
}

function buildProceduralEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
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

  // Release intermediate env maps now that the full-res HDRI is loaded.
  // They are refcounted cache entries — releasing keeps them warm for the
  // next scene mount instead of re-running PMREM.
  releaseEnvMap(proceduralEnv);
  if (previewEnv) releaseEnvMap(previewEnv);

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

/** Base texture ready — clear the loading marker and flush clones created
 *  before the load finished. Because KTX2 payloads and 404-fallback swaps
 *  resolve AFTER clone() snapshotted mipmaps/format, the payload fields are
 *  re-copied onto each waiting clone before marking it for upload. */
function finishBaseLoad(baseTex: THREE.Texture): void {
  (baseTex as { __mpLoading?: boolean }).__mpLoading = false;
  const waiting = pendingClones.get(baseTex);
  if (!waiting) return;
  for (const c of waiting) {
    c.image = baseTex.image;
    c.mipmaps = baseTex.mipmaps;
    c.format = baseTex.format;
    c.type = baseTex.type;
    c.colorSpace = baseTex.colorSpace;
    c.minFilter = baseTex.minFilter;
    c.magFilter = baseTex.magFilter;
    c.generateMipmaps = baseTex.generateMipmaps;
    c.flipY = baseTex.flipY;
    (c as unknown as { isCompressedTexture: boolean }).isCompressedTexture =
      (baseTex as unknown as { isCompressedTexture?: boolean }).isCompressedTexture === true;
    c.needsUpdate = true;
  }
  pendingClones.delete(baseTex);
}

/** WS2-7: load a resolution-suffixed JPG base with graceful 404→1k fallback,
 *  so the 512 tier works before all 512 variants exist. The fallback image is
 *  swapped into the SAME Texture/Source, keeping clone-sharing intact. */
function loadJPGBase(url: string, fallbackUrl: string | null): THREE.Texture {
  const tex: THREE.Texture = textureLoader.load(
    url,
    () => finishBaseLoad(tex),
    undefined,
    fallbackUrl
      ? () => {
          console.info(`[AssetLoader] WS2-7: ${url} missing — falling back to ${fallbackUrl}`);
          textureLoader.load(fallbackUrl, (fb) => {
            tex.image = fb.image; // shared Source data — clones follow
            tex.needsUpdate = true;
            finishBaseLoad(tex);
          });
        }
      : undefined
  );
  (tex as { __mpLoading?: boolean }).__mpLoading = true;
  return tex;
}

/** WS2-6: load a manifest-confirmed .ktx2 base via KTX2Loader, adopting the
 *  transcoded payload into a placeholder CompressedTexture so loadPBRSet's
 *  sync contract and clone-sharing survive. Per-file JPG fallback on failure. */
function loadKTX2Base(url: string, jpgFallbackUrl: string): THREE.Texture {
  const tex = new THREE.CompressedTexture([], 1, 1);
  (tex as { __mpLoading?: boolean }).__mpLoading = true;
  tex.version = 0; // nothing to upload yet
  const renderer = getPooledRenderer();
  const loader = initKTX2Loader(renderer!); // pickKTX2Url guaranteed renderer non-null
  loader.load(
    url,
    (loaded) => {
      tex.image = loaded.image;
      tex.mipmaps = loaded.mipmaps;
      tex.format = loaded.format;
      tex.type = loaded.type;
      tex.colorSpace = loaded.colorSpace;
      tex.minFilter = loaded.minFilter;
      tex.magFilter = loaded.magFilter;
      tex.generateMipmaps = false;
      tex.flipY = loaded.flipY;
      tex.needsUpdate = true;
      finishBaseLoad(tex);
    },
    undefined,
    () => {
      // KTX2 failed (transcode/support/404) — drop this file to the JPG pipeline
      console.warn(`[AssetLoader] WS2-6: KTX2 load failed for ${url} — falling back to ${jpgFallbackUrl}`);
      (tex as unknown as { isCompressedTexture: boolean }).isCompressedTexture = false;
      tex.mipmaps = [];
      tex.generateMipmaps = true;
      tex.flipY = true;
      textureLoader.load(jpgFallbackUrl, (fb) => {
        tex.image = fb.image;
        tex.needsUpdate = true;
        finishBaseLoad(tex);
      });
    }
  );
  return tex;
}

/** Load a PBR texture set (diffuse, normal, roughness, AO).
 *  Base textures are cached by basePath+prefix+res — each file is fetched and
 *  decoded exactly once regardless of how many repeat variants are requested.
 *  Per-repeat sets are lightweight clones sharing the base's image/Source
 *  (same-parameter clones also share one GL texture), cached by full key.
 *  WS2-7: resolution suffix comes from getQuality().textureRes (512/1k/2k)
 *  with 404→1k fallback. WS2-6: files listed in the KTX2 manifest route
 *  through KTX2Loader with per-file JPG fallback. */
function loadPBRSet(
  basePath: string,
  prefix: string,
  options?: {
    repeat?: [number, number];
    normalScale?: number;
  }
): PBRTextureSet {
  requestKTX2Manifest(); // WS2-6: prime manifest (no-op after first call / on SSR)
  const res = getQuality().textureRes; // WS2-7: tier-derived suffix
  const repeat = options?.repeat || [1, 1];
  const cacheKey = `${basePath}|${prefix}|${res}|${repeat[0]},${repeat[1]}`;
  const cached = pbrCache.get(cacheKey);
  if (cached) return cached;

  const baseKey = `${basePath}|${prefix}|${res}`;
  let base = pbrBaseCache.get(baseKey);
  if (!base) {
    const loadBase = (kind: "diff" | "nor_gl" | "rough" | "ao", srgb = false): THREE.Texture => {
      const jpg1k = `${basePath}/${prefix}_${kind}_1k.jpg`;
      const ktxUrl = pickKTX2Url(basePath, prefix, kind, res); // WS2-6
      const tex = ktxUrl
        ? loadKTX2Base(ktxUrl, jpg1k)
        : loadJPGBase(`${basePath}/${prefix}_${kind}_${res}.jpg`, res !== "1k" ? jpg1k : null); // WS2-7
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const map = loadBase("diff", true);
    const normalMap = loadBase("nor_gl");
    const roughnessMap = loadBase("rough");
    const aoMap = loadBase("ao");
    // Basic geometries (Box, Plane, etc.) only have UV channel 0.
    // Three.js aoMap defaults to channel 1 (uv2), so override to channel 0.
    aoMap.channel = 0;

    base = { map, normalMap, roughnessMap, aoMap };
    pbrBaseCache.set(baseKey, base);
  }

  const cloneTex = (baseTex: THREE.Texture): THREE.Texture => {
    // clone() shares the underlying image/Source — no refetch, no re-decode.
    // It also copies wrap/colorSpace/channel from the base.
    const tex = baseTex.clone();
    tex.repeat.set(repeat[0], repeat[1]);
    const img = baseTex.image as { complete?: boolean } | null;
    const stillLoading =
      (baseTex as { __mpLoading?: boolean }).__mpLoading === true || !img || img.complete === false;
    if (stillLoading) {
      // Image still loading — keep version at 0 so the renderer doesn't warn
      // about missing image data; finishBaseLoad marks us for upload.
      tex.version = 0;
      const waiting = pendingClones.get(baseTex);
      if (waiting) waiting.push(tex);
      else pendingClones.set(baseTex, [tex]);
    } else {
      tex.needsUpdate = true;
    }
    return tex;
  };

  const set = {
    map: cloneTex(base.map),
    normalMap: cloneTex(base.normalMap),
    roughnessMap: cloneTex(base.roughnessMap),
    aoMap: cloneTex(base.aoMap),
  };
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
