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
  // Rolling hills only WELL BEYOND the palace, and kept below the hilltop so the
  // villa always crowns the scene (Gladiator height variation lives out in the fields).
  const noiseMask = Math.min(1, Math.max(0, (r - 78) / 55));
  let hills = 0;
  hills += Math.sin(x * 0.008) * Math.cos(z * 0.006) * 14;   // deep rolling Tuscan hills
  hills += Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.014 + 0.7) * 6;
  hills += Math.sin(x * 0.035 + 2.1) * Math.cos(z * 0.028 + 1.4) * 2.5;
  hills += Math.sin(x * 0.07 + 0.5) * Math.cos(z * 0.06 + 3.0) * 1;
  hills *= noiseMask;

  // Central plateau — flat at HILL_Y, smooth falloff (wider sigma for larger flat area)
  const sigma = 70;
  const plateau = HILL_Y * Math.exp(-(r * r) / (2 * sigma * sigma));

  // The villa CROWNS the hill: the surrounding land falls away BELOW HILL_Y as it
  // goes out, so the palace sits on top instead of in a bowl of higher hills.
  const descent = Math.min(1, Math.max(0, (r - 42) / 120)) * 16;

  // Combine: plateau + hilltop crown near centre, land descends + rolls far away
  let h = plateau + hills - descent;

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
    /** W3: lift the material past the dark crop map — sun-bleached pale ground. */
    bright?: boolean;
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
  // Owner: the ground reads WHITE — sun-bleached pale dusty Tuscan summer earth.
  // (Second lighten pass: the crop texture map multiplies these down, so the
  // vertex palette sits near-white to compensate.)
  const colPeak = new THREE.Color(warm ? "#F4ECD8" : "#F2EAD4");
  const colValley = new THREE.Color(warm ? "#EAE2CA" : "#E8DFC6");
  const colEdge = new THREE.Color(warm ? "#F8F2E4" : "#F6F0E0");
  const colPlateau = new THREE.Color(warm ? "#F0E8D2" : "#EEE4CC");
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

    // Keep the plateau pale too (owner: white ground) — no darken at all.
    if (dist < 50) {
      const darken = 0;
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
  if (opts?.bright) {
    // The crop map multiplies the pale vertex palette back down to amber-brown;
    // an over-unity material colour lifts it to sun-bleached pale ground.
    mat.color.setRGB(1.35, 1.30, 1.18);
    mat.aoMapIntensity = 0.15;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  return { mesh, getHeightAt };
}
