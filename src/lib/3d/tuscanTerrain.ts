import * as THREE from "three";

const HILL_Y = 8;
const SIZE = 800;
const SEGMENTS = 256;

/**
 * Evaluate terrain height at any world (x, z) using the same formula as the mesh.
 * 4 octaves of sine/cosine + central Gaussian bump for the palace hilltop.
 */
export function getHeightAt(x: number, z: number): number {
  // Octave 1 — broad rolling hills
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 12;
  // Octave 2
  h += Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.014 + 0.7) * 5;
  // Octave 3
  h += Math.sin(x * 0.035 + 2.1) * Math.cos(z * 0.028 + 1.4) * 2.5;
  // Octave 4 — fine detail
  h += Math.sin(x * 0.07 + 0.5) * Math.cos(z * 0.06 + 3.0) * 1.0;

  // Central Gaussian bump — palace hilltop (peaks at HILL_Y)
  const r2 = (x * x + z * z);
  const sigma = 60;
  h += HILL_Y * Math.exp(-r2 / (2 * sigma * sigma));

  // Gentle overall bowl — edges slope down slightly
  const edge = Math.sqrt(r2) / (SIZE * 0.5);
  h -= edge * edge * 8;

  return h;
}

/**
 * Create a single displaced terrain mesh covering the entire landscape.
 * Returns the mesh and the analytical getHeightAt function.
 */
export function createTuscanTerrain(
  scene: THREE.Scene,
  textures: {
    grassMap?: THREE.Texture;
    grassNormal?: THREE.Texture;
    grassRoughness?: THREE.Texture;
    cropMap?: THREE.Texture;
    cropNormal?: THREE.Texture;
    cropRoughness?: THREE.Texture;
  }
) {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Golden wheat color for peaks, greener for valleys, atmospheric fade at edges
  const colPeak = new THREE.Color("#C8A850"); // golden wheat
  const colValley = new THREE.Color("#7A8A48"); // green valley
  const colEdge = new THREE.Color("#D8C890"); // warm haze at edges
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getHeightAt(x, z);
    pos.setY(i, y);

    // Color: blend based on height + distance
    const normalizedH = Math.max(0, Math.min(1, (y + 5) / 20)); // 0=valley, 1=peak
    tmpColor.copy(colValley).lerp(colPeak, normalizedH);

    // Fade to atmospheric haze at edges
    const dist = Math.sqrt(x * x + z * z);
    const edgeFade = Math.max(0, Math.min(1, (dist - 200) / 200));
    tmpColor.lerp(colEdge, edgeFade * 0.6);

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.3,
    map: textures.cropMap || null,
    normalMap: textures.cropNormal || null,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: textures.cropRoughness || null,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  return { mesh, getHeightAt };
}
