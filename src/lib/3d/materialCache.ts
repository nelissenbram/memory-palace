import * as THREE from "three";

/**
 * Module-level archetype-material cache.
 *
 * Scene cleanups dispose every material, which drops the pooled renderer's
 * shader-program refcounts to zero — so every transition still pays a full
 * shader recompile even though the WebGL context is reused. Keeping one
 * never-disposed material instance per recurring shader variant makes the
 * compiled programs survive scene transitions.
 *
 * Entries are PARAMETER-KEYED (wing wall colors, daylight-preset tints etc.
 * differ per wing / time of day — a naive singleton would leak wrong colors
 * across wings) and refcounted: scenes acquire on mount and release on
 * cleanup. Unreferenced sets beyond a small cap are evicted and disposed
 * (their textures live in the assetLoader caches and are untouched by
 * material.dispose()).
 *
 * This is the material-side parallel of assetLoader's isCachedTexture /
 * buildCachedTextureSet exemption mechanism: scene dispose traversals must
 * skip materials in buildCachedMaterialSet().
 */

type MaterialRecord = Record<string, THREE.Material>;

interface Entry {
  key: string;
  mats: MaterialRecord;
  refs: number;
  lru: number;
}

const cache = new Map<string, Entry>();
const cachedMaterials = new Set<THREE.Material>();
let _lruClock = 0;
const MAX_IDLE_ENTRIES = 6;

/** Get (or create via `create`) the cached material set for this key.
 *  Callers MUST balance every acquire with releaseMaterialSet(key) in cleanup,
 *  and MUST NOT dispose the returned materials (clones are fine to dispose). */
export function acquireMaterialSet<T extends MaterialRecord>(key: string, create: () => T): T {
  let entry = cache.get(key);
  if (!entry) {
    const mats = create();
    entry = { key, mats, refs: 0, lru: 0 };
    cache.set(key, entry);
    for (const m of Object.values(mats)) cachedMaterials.add(m);
    // Evict oldest unreferenced sets beyond the cap (keys churn slightly with
    // the blended daylight presets, so the cache must stay bounded)
    const idle: Entry[] = [];
    for (const e of cache.values()) if (e !== entry && e.refs <= 0) idle.push(e);
    idle.sort((a, b) => a.lru - b.lru);
    while (idle.length > MAX_IDLE_ENTRIES) {
      const ev = idle.shift()!;
      cache.delete(ev.key);
      for (const m of Object.values(ev.mats)) {
        cachedMaterials.delete(m);
        m.dispose();
      }
    }
  }
  entry.refs++;
  entry.lru = ++_lruClock;
  return entry.mats as T;
}

/** Release a material set acquired with acquireMaterialSet (call from scene cleanup). */
export function releaseMaterialSet(key: string): void {
  const entry = cache.get(key);
  if (entry) entry.refs = Math.max(0, entry.refs - 1);
}

/** Check if a material is managed by the archetype cache (must not be disposed). */
export function isCachedMaterial(mat: THREE.Material): boolean {
  return cachedMaterials.has(mat);
}

/** Set of all cached materials for O(1) exemption lookups during scene cleanup.
 *  Parallel to assetLoader's buildCachedTextureSet(). */
export function buildCachedMaterialSet(): ReadonlySet<THREE.Material> {
  return cachedMaterials;
}
