import * as THREE from "three";

/**
 * LOD (Level of Detail) utilities for the Memory Palace.
 *
 * Wraps THREE.LOD with convenient helpers so scenes can swap between
 * high-detail and simplified meshes based on camera distance.
 */

// ════════════════════════════════════════════
// MANUAL LOD
// ════════════════════════════════════════════

export interface LODLevel {
  /** The Object3D (mesh/group) to show at this distance */
  mesh: THREE.Object3D;
  /** Camera distance at which this level activates (closer = higher detail) */
  distance: number;
}

/**
 * Create a THREE.LOD from an explicit list of levels.
 *
 * Usage:
 * ```ts
 * const lod = createLODModel([
 *   { mesh: highDetailMesh, distance: 0 },
 *   { mesh: medDetailMesh,  distance: 10 },
 *   { mesh: lowDetailMesh,  distance: 25 },
 * ]);
 * scene.add(lod);
 * ```
 */
export function createLODModel(levels: LODLevel[]): THREE.LOD {
  const lod = new THREE.LOD();

  // Sort by distance ascending so THREE.LOD picks the right level
  const sorted = [...levels].sort((a, b) => a.distance - b.distance);
  for (const { mesh, distance } of sorted) {
    lod.addLevel(mesh, distance);
  }

  return lod;
}

// ════════════════════════════════════════════
// AUTO LOD (geometry simplification)
// ════════════════════════════════════════════

/**
 * Generate a simplified version of a BufferGeometry by decimating faces.
 * Uses a simple vertex-merging strategy: keeps every Nth vertex based on
 * the reduction ratio. Works best on non-indexed geometry.
 *
 * @param geometry  Source geometry (will not be mutated)
 * @param ratio     Target ratio (0..1) — e.g., 0.5 keeps ~50% of triangles
 */
export function simplifyGeometry(
  geometry: THREE.BufferGeometry,
  ratio: number
): THREE.BufferGeometry {
  const clamped = Math.max(0.05, Math.min(1, ratio));
  if (clamped >= 1) return geometry.clone();

  const srcPosition = geometry.getAttribute("position");
  if (!srcPosition || srcPosition.count === 0) return geometry.clone();

  // Convert indexed geometry to non-indexed so we can stride over
  // individual triangles (each 3 consecutive vertices = 1 triangle).
  const nonIndexed = geometry.index
    ? geometry.toNonIndexed()   // expands shared vertices into per-face copies
    : geometry;                 // already non-indexed

  const position = nonIndexed.getAttribute("position");
  if (!position) return geometry.clone();

  const totalVertices = position.count;
  // Each consecutive group of 3 vertices forms one triangle
  const totalTriangles = Math.floor(totalVertices / 3);
  if (totalTriangles === 0) return geometry.clone();

  const targetTriangles = Math.max(1, Math.floor(totalTriangles * clamped));
  const step = Math.max(1, Math.floor(totalTriangles / targetTriangles));

  // Collect kept triangle data — preserves all vertex attributes
  const keptPositions: number[] = [];
  const srcNormal = nonIndexed.getAttribute("normal");
  const srcUv = nonIndexed.getAttribute("uv");
  const keptNormals: number[] = [];
  const keptUvs: number[] = [];

  for (let t = 0; t < totalTriangles; t += step) {
    const base = t * 3;
    for (let v = 0; v < 3; v++) {
      const idx = base + v;
      if (idx >= totalVertices) break;

      keptPositions.push(
        position.getX(idx),
        position.getY(idx),
        position.getZ(idx)
      );

      if (srcNormal) {
        keptNormals.push(
          srcNormal.getX(idx),
          srcNormal.getY(idx),
          srcNormal.getZ(idx)
        );
      }

      if (srcUv) {
        keptUvs.push(srcUv.getX(idx), srcUv.getY(idx));
      }
    }
  }

  // Dispose the temporary non-indexed geometry if we created one
  if (geometry.index) nonIndexed.dispose();

  const simplified = new THREE.BufferGeometry();
  simplified.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(keptPositions, 3)
  );

  if (keptNormals.length > 0) {
    simplified.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(keptNormals, 3)
    );
  } else {
    simplified.computeVertexNormals();
  }

  if (keptUvs.length > 0) {
    simplified.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(keptUvs, 2)
    );
  }

  return simplified;
}

/**
 * Automatically create a LOD from a single mesh by generating simplified
 * geometry at each requested distance threshold.
 *
 * The original mesh is used for the closest level (distance 0).
 * Each subsequent distance gets a progressively simplified copy.
 *
 * Usage:
 * ```ts
 * const lod = autoLOD(myDetailedMesh, [0, 15, 30]);
 * scene.add(lod);
 * ```
 *
 * @param original   The high-detail source mesh
 * @param distances  Camera distances for each LOD level (first should be 0)
 */
export function autoLOD(
  original: THREE.Mesh,
  distances: number[]
): THREE.LOD {
  const sorted = [...distances].sort((a, b) => a - b);
  const levels: LODLevel[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      // Highest detail — clone geometry only (transform goes on the LOD node)
      const mesh = new THREE.Mesh(original.geometry.clone(), original.material);
      mesh.castShadow = original.castShadow;
      mesh.receiveShadow = original.receiveShadow;
      levels.push({ mesh, distance: sorted[i] });
    } else {
      // Reduce detail progressively: each level keeps less geometry
      // Ratios: for 3 levels -> [1.0, 0.73, 0.47], for 4 -> [1.0, 0.8, 0.6, 0.4]
      const ratio = 1 - (i / sorted.length) * 0.8;
      const simplified = simplifyGeometry(original.geometry, ratio);
      const mesh = new THREE.Mesh(simplified, original.material);
      mesh.castShadow = original.castShadow;
      mesh.receiveShadow = original.receiveShadow;
      levels.push({ mesh, distance: sorted[i] });
    }
  }

  const lod = createLODModel(levels);

  // Apply the original's transform to the LOD node itself (not to each child,
  // since children are in the LOD's local coordinate space).
  lod.position.copy(original.position);
  lod.rotation.copy(original.rotation);
  lod.scale.copy(original.scale);

  return lod;
}
