import * as THREE from "three";

const HILL_Y = 8;
const SIZE = 800;
const SEGMENTS = 256;

/**
 * Evaluate terrain height at any world (x, z) using the same formula as the mesh.
 * 4 octaves of sine/cosine + central Gaussian plateau for the palace hilltop.
 */
export function getHeightAt(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);

  // Rolling hills from layered sine/cosine (suppressed near palace)
  const noiseMask = Math.min(1, Math.max(0, (r - 55) / 40)); // 0 inside r<55, ramps to 1 by r=95
  let hills = 0;
  hills += Math.sin(x * 0.008) * Math.cos(z * 0.006) * 10;
  hills += Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.014 + 0.7) * 4;
  hills += Math.sin(x * 0.035 + 2.1) * Math.cos(z * 0.028 + 1.4) * 2;
  hills += Math.sin(x * 0.07 + 0.5) * Math.cos(z * 0.06 + 3.0) * 0.8;
  hills *= noiseMask;

  // Central plateau — flat at HILL_Y, smooth falloff (wider sigma for larger flat area)
  const sigma = 70;
  const plateau = HILL_Y * Math.exp(-(r * r) / (2 * sigma * sigma));

  // Combine: plateau dominates near center, hills dominate far away
  let h = plateau + hills;

  // Hard clamp: terrain is exactly HILL_Y inside courtyard radius (r < 42)
  // Smooth blend between hard clamp and natural terrain from r=42 to r=55
  if (r < 42) {
    h = HILL_Y;
  } else if (r < 55) {
    const blend = (r - 42) / (55 - 42); // 0 at r=42, 1 at r=55
    const smooth = blend * blend * (3 - 2 * blend); // smoothstep
    h = HILL_Y * (1 - smooth) + h * smooth;
  }

  // Gentle bowl — edges slope down
  const edge = r / (SIZE * 0.5);
  h -= edge * edge * 6;

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
  const colPlateau = new THREE.Color("#A8985A"); // warm golden for hilltop
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getHeightAt(x, z);
    pos.setY(i, y);

    const dist = Math.sqrt(x * x + z * z);

    // Near palace — warm golden plateau color
    const plateauBlend = Math.max(0, 1 - dist / 80);
    // Far — height-based wheat/valley blend
    const normalizedH = Math.max(0, Math.min(1, (y + 5) / 18));
    tmpColor.copy(colValley).lerp(colPeak, normalizedH);
    tmpColor.lerp(colPlateau, plateauBlend * 0.6);

    // Atmospheric haze at edges
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
