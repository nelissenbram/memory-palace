import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const modelCache = new Map<string, THREE.Group>();

/**
 * Pre-warm the DRACO decoder (WASM worker) so the first GLB load does not stall
 * the main thread / establishing dolly. The exterior ships zero GLBs by default,
 * so its decoder is cold — call this once at scene mount when a W3 asset is
 * gated on. No-op safe: if the decoder is unavailable, loadModel still rejects
 * and the caller falls back to procedural geometry.
 */
export function warmDracoDecoder(): void {
  try {
    dracoLoader.preload();
  } catch {
    /* decoder unavailable — ignore, load path degrades gracefully */
  }
}

/**
 * Load a GLTF model with caching. Returns a clone of the cached model.
 * Supports DRACO-compressed meshes.
 */
export async function loadModel(path: string): Promise<THREE.Group> {
  // Return cached clone
  if (modelCache.has(path)) {
    return modelCache.get(path)!.clone();
  }

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        // Enable shadows on all meshes
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        modelCache.set(path, model);
        resolve(model.clone());
      },
      undefined,
      (err) => {
        console.warn(`[ModelLoader] Failed to load: ${path}`, err);
        reject(err);
      }
    );
  });
}

/**
 * Clear the model cache and dispose all cached resources.
 */
export function clearModelCache() {
  modelCache.forEach((model) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  });
  modelCache.clear();
}

/**
 * Era-specific model paths.
 */
export const ERA_MODELS = {
  roman: {
    // Placeholder — no Roman-era GLB assets currently shipped
  },
  renaissance: {
    candelabra: "/models/renaissance/candelabra.glb",
    writingDesk: "/models/renaissance/writing_desk.glb",
    openBook: "/models/renaissance/open_book.glb",
    globe: "/models/renaissance/globe.glb",
  },
} as const;

/**
 * Try to load an era-specific decorative model. Returns null if not available.
 */
export async function loadEraModel(
  era: "roman" | "renaissance",
  modelName: string
): Promise<THREE.Group | null> {
  const models = ERA_MODELS[era] as Record<string, string>;
  const path = models[modelName];
  if (!path) return null;

  try {
    return await loadModel(path);
  } catch {
    // Model file not available — return null silently
    return null;
  }
}
