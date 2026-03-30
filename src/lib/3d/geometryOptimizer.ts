import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { isCachedTexture } from "./assetLoader";

/**
 * Geometry and scene optimization utilities.
 *
 * Reduces draw calls, prevents memory leaks, and deduplicates materials.
 */

// ════════════════════════════════════════════
// GEOMETRY MERGING
// ════════════════════════════════════════════

/**
 * Merge an array of BufferGeometries into a single geometry to reduce draw calls.
 * All geometries must share the same set of attributes (position, normal, uv, etc.).
 *
 * This is a thin wrapper around Three.js BufferGeometryUtils.mergeGeometries
 * with null-safety and optional world-matrix baking.
 *
 * @param geometries   Array of geometries to merge
 * @param useGroups    If true, creates groups for multi-material support
 */
export function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[],
  useGroups = false
): THREE.BufferGeometry | null {
  const valid = geometries.filter((g) => g && g.getAttribute("position"));
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0].clone();

  return mergeGeometries(valid, useGroups) ?? null;
}

/**
 * Collect meshes from a scene subtree that share the same material,
 * bake their world transforms into geometry, and merge them.
 *
 * Returns an array of merged meshes — one per unique material.
 * The original meshes are NOT removed; the caller decides what to do.
 *
 * @param root  The root Object3D to scan for static meshes
 */
export function mergeStaticMeshes(
  root: THREE.Object3D
): THREE.Mesh[] {
  // Group meshes by material UUID
  const buckets = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    // Skip skinned meshes and instanced meshes
    if (child instanceof THREE.SkinnedMesh) return;
    if (child instanceof THREE.InstancedMesh) return;
    // Skip multi-material meshes — they can't be merged by single material key
    if (Array.isArray(child.material)) return;

    const mat = child.material as THREE.Material;
    if (!mat) return;

    const key = mat.uuid;
    if (!buckets.has(key)) {
      buckets.set(key, { material: mat, meshes: [] });
    }
    buckets.get(key)!.meshes.push(child);
  });

  const results: THREE.Mesh[] = [];

  for (const { material, meshes } of Array.from(buckets.values())) {
    if (meshes.length < 2) continue; // No benefit from merging singles

    const geometries: THREE.BufferGeometry[] = [];
    for (const mesh of meshes) {
      const geo = mesh.geometry.clone();
      // Bake world transform into the geometry
      mesh.updateWorldMatrix(true, false);
      geo.applyMatrix4(mesh.matrixWorld);
      geometries.push(geo);
    }

    const merged = mergeBufferGeometries(geometries);
    if (merged) {
      const mergedMesh = new THREE.Mesh(merged, material);
      mergedMesh.castShadow = true;
      mergedMesh.receiveShadow = true;
      results.push(mergedMesh);
    }

    // Dispose temporary cloned geometries
    for (const geo of geometries) geo.dispose();
  }

  return results;
}

// ════════════════════════════════════════════
// SCENE DISPOSAL
// ════════════════════════════════════════════

/**
 * Recursively dispose all geometries, materials, and textures in a scene.
 * Respects the PBR texture cache — cached textures are NOT disposed.
 *
 * Call this when tearing down a scene to prevent GPU memory leaks.
 */
export function disposeScene(scene: THREE.Scene): void {
  const disposedTextures = new Set<string>();
  const disposedMaterials = new Set<string>();
  const disposedGeometries = new Set<number>();

  scene.traverse((object) => {
    // Dispose geometries
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      const geo = (object as THREE.Mesh).geometry;
      if (geo && !disposedGeometries.has(geo.id)) {
        geo.dispose();
        disposedGeometries.add(geo.id);
      }
    }

    // Dispose materials and their textures
    if ("material" in object) {
      const materials = Array.isArray((object as THREE.Mesh).material)
        ? ((object as THREE.Mesh).material as THREE.Material[])
        : [(object as THREE.Mesh).material as THREE.Material];

      for (const mat of materials) {
        if (!mat || disposedMaterials.has(mat.uuid)) continue;
        disposedMaterials.add(mat.uuid);

        // Dispose textures referenced by the material
        disposeMaterialTextures(mat, disposedTextures);
        mat.dispose();
      }
    }
  });

  // Clear the scene children
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
}

/** Dispose all textures attached to a material, skipping cached ones. */
function disposeMaterialTextures(
  material: THREE.Material,
  alreadyDisposed: Set<string>
): void {
  // Common texture properties on MeshStandardMaterial / MeshPhysicalMaterial
  const textureProps: (keyof THREE.MeshStandardMaterial)[] = [
    "map",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "aoMap",
    "emissiveMap",
    "bumpMap",
    "displacementMap",
    "alphaMap",
    "envMap",
    "lightMap",
  ];

  for (const prop of textureProps) {
    const tex = (material as unknown as Record<string, unknown>)[prop as string];
    if (tex instanceof THREE.Texture) {
      if (alreadyDisposed.has(tex.uuid)) continue;
      // Do NOT dispose textures managed by the PBR cache
      if (isCachedTexture(tex)) continue;
      tex.dispose();
      alreadyDisposed.add(tex.uuid);
    }
  }
}

// ════════════════════════════════════════════
// MATERIAL DEDUPLICATION
// ════════════════════════════════════════════

/**
 * Scan a scene and replace duplicate materials with shared references.
 * Two materials are considered identical if they have the same type and
 * matching texture UUIDs + key numeric properties.
 *
 * This reduces GPU state changes during rendering.
 */
export function optimizeMaterials(scene: THREE.Scene): void {
  const materialMap = new Map<string, THREE.Material>();
  let deduped = 0;

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    const newMaterials = materials.map((mat) => {
      const key = materialFingerprint(mat);
      const existing = materialMap.get(key);
      if (existing && existing !== mat) {
        deduped++;
        return existing;
      }
      materialMap.set(key, mat);
      return mat;
    });

    if (Array.isArray(mesh.material)) {
      mesh.material = newMaterials;
    } else {
      mesh.material = newMaterials[0];
    }
  });

  if (deduped > 0) {
    console.debug(`[GeometryOptimizer] Deduplicated ${deduped} material references`);
  }
}

/** Create a fingerprint string that identifies a material's visual properties. */
function materialFingerprint(mat: THREE.Material): string {
  const parts: string[] = [mat.type];

  // Common properties for all materials
  parts.push(
    `side:${mat.side}`,
    `transparent:${mat.transparent}`,
    `opacity:${mat.opacity.toFixed(2)}`,
    `depthWrite:${mat.depthWrite}`,
    `depthTest:${mat.depthTest}`,
    `visible:${mat.visible}`,
    `blending:${mat.blending}`
  );

  if (mat instanceof THREE.MeshStandardMaterial) {
    parts.push(
      `c:${mat.color.getHexString()}`,
      `r:${mat.roughness.toFixed(2)}`,
      `m:${mat.metalness.toFixed(2)}`,
      `ec:${mat.emissive.getHexString()}`,
      `ei:${mat.emissiveIntensity.toFixed(2)}`,
      `map:${mat.map?.uuid ?? "none"}`,
      `nrm:${mat.normalMap?.uuid ?? "none"}`,
      `nrmScale:${mat.normalScale?.x.toFixed(2) ?? "1"},${mat.normalScale?.y.toFixed(2) ?? "1"}`,
      `rgh:${mat.roughnessMap?.uuid ?? "none"}`,
      `met:${mat.metalnessMap?.uuid ?? "none"}`,
      `ao:${mat.aoMap?.uuid ?? "none"}`,
      `aoI:${mat.aoMapIntensity.toFixed(2)}`,
      `em:${mat.emissiveMap?.uuid ?? "none"}`,
      `bump:${mat.bumpMap?.uuid ?? "none"}`,
      `disp:${mat.displacementMap?.uuid ?? "none"}`,
      `alpha:${mat.alphaMap?.uuid ?? "none"}`,
      `env:${mat.envMap?.uuid ?? "none"}`,
      `envI:${mat.envMapIntensity.toFixed(2)}`,
      `light:${mat.lightMap?.uuid ?? "none"}`,
      `flatShading:${mat.flatShading}`,
      `wireframe:${mat.wireframe}`
    );

    // MeshPhysicalMaterial extends MeshStandardMaterial
    if (mat instanceof THREE.MeshPhysicalMaterial) {
      parts.push(
        `clearcoat:${mat.clearcoat.toFixed(2)}`,
        `clearcoatRoughness:${mat.clearcoatRoughness.toFixed(2)}`,
        `sheen:${mat.sheen.toFixed(2)}`,
        `sheenColor:${mat.sheenColor.getHexString()}`,
        `sheenRoughness:${mat.sheenRoughness.toFixed(2)}`,
        `transmission:${mat.transmission.toFixed(2)}`,
        `thickness:${mat.thickness.toFixed(2)}`,
        `ior:${mat.ior.toFixed(2)}`
      );
    }
  } else if (mat instanceof THREE.MeshBasicMaterial) {
    parts.push(
      `c:${mat.color.getHexString()}`,
      `map:${mat.map?.uuid ?? "none"}`,
      `wireframe:${mat.wireframe}`
    );
  } else {
    // Generic fallback — use name as a weak fingerprint.
    // Materials without a name cannot be safely deduplicated.
    parts.push(mat.name || mat.uuid);
  }

  return parts.join("|");
}
