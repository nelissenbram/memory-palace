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

// ════════════════════════════════════════════
// HDRI ENVIRONMENT MAPS
// ════════════════════════════════════════════

/** Load an HDR environment map and generate a prefiltered env map for PBR IBL */
export function loadHDRI(
  renderer: THREE.WebGLRenderer,
  path: string,
  onLoad?: (envMap: THREE.Texture) => void
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
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
        reject(err);
      }
    );
  });
}

/** Interior HDRI — warm ballroom with chandeliers */
export const HDRI_INTERIOR = "/textures/hdri/ballroom_1k.hdr";
/** Exterior HDRI — courtyard with warm daylight */
export const HDRI_EXTERIOR = "/textures/hdri/courtyard_1k.hdr";

// ════════════════════════════════════════════
// PBR TEXTURE SETS
// ════════════════════════════════════════════

export interface PBRTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
}

/** Load a PBR texture set (diffuse, normal, roughness, AO) */
function loadPBRSet(
  basePath: string,
  prefix: string,
  options?: {
    repeat?: [number, number];
    normalScale?: number;
  }
): PBRTextureSet {
  const repeat = options?.repeat || [1, 1];

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

  return { map, normalMap, roughnessMap, aoMap };
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

// ════════════════════════════════════════════
// DISPOSAL
// ════════════════════════════════════════════

export function disposePBRSet(set: PBRTextureSet) {
  set.map.dispose();
  set.normalMap.dispose();
  set.roughnessMap.dispose();
  set.aoMap.dispose();
}
