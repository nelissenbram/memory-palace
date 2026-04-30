/**
 * Scene preloading — warm the module cache for upcoming scenes.
 *
 * When the user is viewing the exterior, we preload the entrance hall module.
 * When in the entrance hall, we preload the corridor module. This way the
 * React.lazy() dynamic import resolves instantly from the webpack module cache.
 *
 * Also preloads shared assets (HDRI, PBR textures) that are reused across scenes.
 */

type SceneId = "exterior" | "entrance" | "corridor" | "room";

const preloaded = new Set<SceneId>();

/** Map of which scenes to preload when a given scene is active. */
const PRELOAD_MAP: Record<SceneId, SceneId[]> = {
  exterior: ["entrance"],
  entrance: ["corridor"],
  corridor: ["room"],
  room: [], // nothing to preload from the innermost scene
};

/** Dynamic import expressions for each scene module.
 *  These MUST match the exact import paths used in MemoryPalace.tsx and
 *  OnboardingSceneHost.tsx so webpack reuses the same chunk. */
const SCENE_IMPORTS: Record<SceneId, () => Promise<unknown>> = {
  exterior: () => import("@/components/3d/ExteriorScene"),
  entrance: () => import("@/components/3d/EntranceHallScene"),
  corridor: () => import("@/components/3d/CorridorScene"),
  room: () => import("@/components/3d/InteriorScene"),
};

/**
 * Preload the next scene(s) for the given current scene.
 *
 * Call this once after a scene has rendered its first frame.
 * Uses requestIdleCallback (or setTimeout fallback) to avoid
 * competing with the current scene's initialisation.
 *
 * Safe to call multiple times — each scene is only preloaded once.
 */
export function preloadNextScene(currentScene: SceneId): void {
  const targets = PRELOAD_MAP[currentScene];
  if (!targets || targets.length === 0) return;

  const schedule = typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 200);

  schedule(() => {
    for (const target of targets) {
      if (preloaded.has(target)) continue;
      preloaded.add(target);
      // Fire and forget — we only care about populating the module cache
      SCENE_IMPORTS[target]().catch(() => {
        // Import failed — that's fine, user will get normal lazy load
        preloaded.delete(target);
      });
    }
  });
}

/**
 * Directly preload a specific scene module.
 * Use this during onboarding to warm scenes before they're needed.
 */
export function preloadScene(sceneId: SceneId): void {
  if (preloaded.has(sceneId)) return;
  preloaded.add(sceneId);
  SCENE_IMPORTS[sceneId]().catch(() => {
    preloaded.delete(sceneId);
  });
}

/**
 * Preload shared PBR textures that are used by multiple scenes.
 * Call once during app initialisation (e.g., from MemoryPalace mount).
 *
 * On mobile this is a no-op — we defer all texture loading to the scene
 * that actually needs them.
 */
export function preloadSharedAssets(): void {
  // Import asset loader lazily to avoid pulling Three.js into the main bundle
  // if this module is imported but never called.
  import("@/lib/3d/assetLoader").then(({ loadMarbleTextures, loadPlasterWallTextures, loadDarkWoodTextures }) => {
    import("@/lib/3d/mobilePerf").then(({ isMobileGPU }) => {
      if (isMobileGPU()) return; // skip on mobile
      // Trigger loading — the PBR cache inside assetLoader keeps them alive
      loadMarbleTextures([4, 4]);
      loadPlasterWallTextures([3, 3]);
      loadDarkWoodTextures([2, 3]);
    });
  }).catch(() => {});
}
