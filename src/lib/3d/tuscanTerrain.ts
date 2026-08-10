import * as THREE from "three";
import { getQuality } from "./mobilePerf";

const HILL_Y = 8;
const SIZE = 800;
// Segments are determined per-device at runtime via getQuality().terrainSegments
// Desktop: 256 (65K verts), Mobile: 64 (4K verts) — ~16x fewer vertices

/**
 * Evaluate terrain height at any world (x, z) using the same formula as the mesh.
 * 4 octaves of sine/cosine + central Gaussian plateau for the palace hilltop.
 */
export function getHeightAt(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);

  // Rolling hills from layered sine/cosine (suppressed near palace)
  const noiseMask = Math.min(1, Math.max(0, (r - 52) / 28)); // 0 inside r<52, ramps to 1 by r=80 (rolling hills reach closer)
  let hills = 0;
  hills += Math.sin(x * 0.008) * Math.cos(z * 0.006) * 18;   // deeper rolling Tuscan hills (Gladiator)
  hills += Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.014 + 0.7) * 7;
  hills += Math.sin(x * 0.035 + 2.1) * Math.cos(z * 0.028 + 1.4) * 3;
  hills += Math.sin(x * 0.07 + 0.5) * Math.cos(z * 0.06 + 3.0) * 1.2;
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
    cropAO?: THREE.Texture;
  },
  opts?: {
    /** Anisotropic filtering samples for the terrain maps (MUSEO VIVO WS2-1: 4 mobile / 8 desktop). */
    anisotropy?: number;
    /** Golden-hour vertex-tint variant (MUSEO VIVO WS3-4: warm field tints, no cold greens). */
    warm?: boolean;
  }
) {
  const segments = getQuality().terrainSegments;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Golden wheat color for peaks, greener for valleys, atmospheric fade at edges.
  // Warm variant (MUSEO VIVO): valleys shift from cool green to sun-dried olive so
  // every terrain hue stays in the golden-hour earth family.
  const warm = !!opts?.warm;
  const colPeak = new THREE.Color(warm ? "#CCAA54" : "#C8A850"); // golden wheat
  const colValley = new THREE.Color(warm ? "#8A8A4C" : "#7A8A48"); // valley (olive when warm)
  const colEdge = new THREE.Color(warm ? "#DCC896" : "#D8C890"); // warm haze at edges
  const colPlateau = new THREE.Color(warm ? "#AC9A5E" : "#A8985A"); // warm golden for hilltop
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let y = getHeightAt(x, z);

    const dist = Math.sqrt(x * x + z * z);

    // Add micro-displacement noise to the plateau area to break up uniform lighting
    // This prevents the flat hilltop from catching all directional light uniformly
    if (dist < 55) {
      const noiseAmt = dist < 42 ? 0.15 : 0.15 * ((55 - dist) / 13);
      const micro = Math.sin(x * 0.8 + z * 1.1) * 0.06
        + Math.sin(x * 1.7 - z * 0.9) * 0.04
        + Math.sin(x * 3.2 + z * 2.8) * 0.03;
      y += micro * noiseAmt / 0.15;
    }
    pos.setY(i, y);

    // Near palace — darker earth tone (NOT bright golden)
    const plateauBlend = Math.max(0, 1 - dist / 80);
    // Far — height-based wheat/valley blend
    const normalizedH = Math.max(0, Math.min(1, (y + 5) / 18));
    tmpColor.copy(colValley).lerp(colPeak, normalizedH);
    tmpColor.lerp(colPlateau, plateauBlend * 0.6);

    // Darken the plateau center so it doesn't glow
    if (dist < 50) {
      const darken = Math.max(0, 1 - dist / 50) * 0.3;
      tmpColor.r *= (1 - darken);
      tmpColor.g *= (1 - darken);
      tmpColor.b *= (1 - darken);
    }

    // Atmospheric haze at edges
    const edgeFade = Math.max(0, Math.min(1, (dist - 200) / 200));
    tmpColor.lerp(colEdge, edgeFade * 0.6);

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  // WS2-1: anisotropic filtering on the terrain maps — the terrain is the single
  // most grazing-angle surface in the palace; zero anisotropy reads as smear.
  const aniso = opts?.anisotropy ?? 0;
  if (aniso > 1) {
    for (const tex of [textures.cropMap, textures.cropNormal, textures.cropRoughness, textures.cropAO]) {
      if (tex) { tex.anisotropy = aniso; tex.needsUpdate = true; }
    }
  }

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
    map: textures.cropMap || null,
    normalMap: textures.cropNormal || null,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: textures.cropRoughness || null,
    aoMap: textures.cropAO || null,
    aoMapIntensity: textures.cropAO ? 0.35 : 1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  return { mesh, getHeightAt };
}
