import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const modelCache = new Map<string, THREE.Group>();

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
    amphora: "/models/roman/amphora.glb",
    oilLamp: "/models/roman/oil_lamp.glb",
    couch: "/models/roman/roman_couch.glb",
    columnFragment: "/models/roman/column_fragment.glb",
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
