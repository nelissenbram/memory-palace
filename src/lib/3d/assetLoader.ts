import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/**
 * Asset loader for real HDRI environment maps and PBR texture sets.
 * Uses Poly Haven assets stored in /public/textures/.
 *
 * All assets are CC0 from https://polyhaven.com
 */

// Shared loaders (reused across scenes)
const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();

// ── Caches (persist across scene transitions) ──
const pbrCache = new Map<string, PBRTextureSet>();
const hdriCache = new Map<string, Promise<THREE.Texture>>();

// ════════════════════════════════════════════
// HDRI ENVIRONMENT MAPS
// ════════════════════════════════════════════

/** Load an HDR environment map and generate a prefiltered env map for PBR IBL.
 *  Results are cached — subsequent calls for the same path return instantly. */
export function loadHDRI(
  renderer: THREE.WebGLRenderer,
  path: string,
  onLoad?: (envMap: THREE.Texture) => void
): Promise<THREE.Texture> {
  const cached = hdriCache.get(path);
  if (cached) {
    cached.then(t => onLoad?.(t));
    return cached;
  }

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    rgbeLoader.load(
      path,
      (hdrTexture) => {
        const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
        hdrTexture.dispose();
        pmrem.dispose();
        onLoad?.(envMap);
        resolve(envMap);
      },
      undefined,
      (err) => {
        console.warn(`[AssetLoader] Failed to load HDRI: ${path}`, err);
        pmrem.dispose();
        hdriCache.delete(path); // allow retry
        reject(err);
      }
    );
  });

  hdriCache.set(path, promise);
  return promise;
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
