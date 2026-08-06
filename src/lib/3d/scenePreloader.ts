/**
 * Scene preloading — warm the module cache for upcoming scenes.
 *
 * When the user is viewing the exterior, we preload the entrance hall module.
 * When in the entrance hall, we preload the corridor module. This way the
 * React.lazy() dynamic import resolves instantly from the webpack module cache.
 *
 * Also preloads shared assets (HDRI, PBR textures) that are reused across scenes.
 *
 * NOTE on GPU program warming (renderer.compileAsync): not feasible here — scene
 * graphs are constructed inside each scene component's mount effect, so no
 * THREE.Scene/camera exists to compile before the transition. Program retention is
 * handled instead by src/lib/3d/materialCache.ts (archetype materials survive scene
 * teardown, so the pooled renderer keeps their compiled programs across transitions).
 */

import { flag3d } from "@/lib/3d/flags3d";

export type SceneId = "exterior" | "entrance" | "corridor" | "room";

const preloaded = new Set<SceneId>();
// ── MUSEO VIVO WS9-8/9 warmth bookkeeping ──
// A hop is "warm" when the target's module is already in the webpack cache AND
// that scene type has fired onReady once this session (so its shared textures/
// archetype materials are primed). Cold targets keep the full loading card.
const moduleWarm = new Set<SceneId>();
const readyOnce = new Set<SceneId>();

/** Map of which scenes to preload when a given scene is active. */
const PRELOAD_MAP: Record<SceneId, SceneId[]> = {
  exterior: ["entrance"],
  entrance: ["corridor"],
  corridor: ["room"],
  room: [], // nothing to preload from the innermost scene
};

/** WS9-9 (flag w2_veil): completed preload map incl. back-paths, so return
 *  hops (room→corridor, corridor→entrance, entrance→exterior) are warm too. */
const PRELOAD_MAP_W2: Record<SceneId, SceneId[]> = {
  exterior: ["entrance"],
  entrance: ["corridor", "exterior"],
  corridor: ["room", "entrance"],
  room: ["corridor"],
};

/** Record that a scene type fired onReady this session (implies its module
 *  is loaded). Called from MemoryPalace's onReady handlers. */
export function markSceneReady(sceneId: SceneId): void {
  moduleWarm.add(sceneId);
  readyOnce.add(sceneId);
}

/** WS9-8: true when a transition to this scene can use the light golden veil
 *  instead of the full loading card. */
export function isWarm(sceneId: SceneId): boolean {
  return moduleWarm.has(sceneId) && readyOnce.has(sceneId);
}

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
  // Module-preload ONLY (no texture primes here — WS9-9 keeps mobile costs at
  // zero bytes of GPU memory; asset warming stays in preloadSharedAssets).
  const targets = (flag3d("w2_veil") ? PRELOAD_MAP_W2 : PRELOAD_MAP)[currentScene];
  if (!targets || targets.length === 0) return;

  const schedule = typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 200);

  schedule(() => {
    for (const target of targets) {
      if (preloaded.has(target)) continue;
      preloaded.add(target);
      // Fire and forget — we only care about populating the module cache
      SCENE_IMPORTS[target]()
        .then(() => { moduleWarm.add(target); })
        .catch(() => {
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
  SCENE_IMPORTS[sceneId]()
    .then(() => { moduleWarm.add(sceneId); })
    .catch(() => {
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
      // Trigger loading — the PBR cache inside assetLoader keeps them alive.
      // Base textures are cached repeat-agnostic, so this warms the fetched/
      // decoded images for every repeat variant scenes later request.
      loadMarbleTextures([4, 4]);
      loadPlasterWallTextures([3, 3]);
      loadDarkWoodTextures([2, 3]);
    });
  }).catch(() => {});
}
