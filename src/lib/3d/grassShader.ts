import * as THREE from "three";

interface GrassOptions {
  count: number;
  radius: number;
  innerRadius: number;
  bladeHeight: number;
  baseColor: string;
  tipColor1: string;
  tipColor2: string;
  yOffset: number;
  /** Seat each blade on the terrain instead of the flat yOffset plane. */
  getHeightAt?: (x: number, z: number) => number;
  /** Skip blades where this returns true (e.g. keep the approach road clear). */
  exclude?: (x: number, z: number) => boolean;
}

interface WheatFieldOptions {
  count: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  stalkHeight: number;
  color: string;
  headColor: string;
  yOffset?: number;
  getHeightAt?: (x: number, z: number) => number;
  /** Skip stalks where this returns true (e.g. keep the approach road clear). */
  exclude?: (x: number, z: number) => boolean;
  /**
   * MUSEO VIVO WS2-4: pass ONE material (from createSharedWheatMaterial) so every
   * wheat field shares a single shader program + uniform set instead of compiling
   * ~45 per-field ShaderMaterials. When provided, `stalkHeight` must equal the
   * height the shared material was created with, `color`/`headColor` are ignored
   * (per-instance variation lives in the shared shader), and the caller owns the
   * material's `time` uniform + disposal.
   */
  material?: THREE.ShaderMaterial;
}

/**
 * One shared wheat-stalk material for ALL fields (MUSEO VIVO WS2-4).
 * Per-field color uniforms are replaced by a per-instance world-position hash
 * (same trick as the grass blades) blending two sun-dried golden stalk tones,
 * so visual variety survives the material collapse. Warm canon-family tones only.
 */
export function createSharedWheatMaterial(stalkHeight: number, ripe = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      // ripe (W3): fully sun-ripened gold — the default B-tone reads olive-green
      stalkColorA: { value: new THREE.Color(ripe ? "#E5C45E" : "#C9A94E") },
      stalkColorB: { value: new THREE.Color(ripe ? "#D4AC48" : "#B08E3C") },
      headColor: { value: new THREE.Color(ripe ? "#F2DA80" : "#E2C468") },
    },
    vertexShader: `
      uniform float time;
      varying float vHeight;
      varying float vRandom;
      void main() {
        vHeight = (position.y + ${(stalkHeight / 2).toFixed(2)}) / ${stalkHeight.toFixed(2)};
        vec4 worldPos = instanceMatrix * vec4(position, 1.0);
        vRandom = fract(sin(worldPos.x * 12.9898 + worldPos.z * 78.233) * 43758.5453);
        // Gentle wheat sway
        float wind = sin(time * 1.2 + worldPos.x * 0.2 + worldPos.z * 0.15) * vHeight * vHeight * 0.4;
        worldPos.x += wind;
        worldPos.z += wind * 0.2;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 stalkColorA;
      uniform vec3 stalkColorB;
      uniform vec3 headColor;
      varying float vHeight;
      varying float vRandom;
      void main() {
        vec3 stalk = mix(stalkColorA, stalkColorB, vRandom);
        vec3 color = mix(stalk, headColor, smoothstep(0.7, 1.0, vHeight));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

/**
 * Create an instanced grass system with wind animation
 */
export function createGrassSystem(scene: THREE.Scene, opts: GrassOptions) {
  const { count, radius, innerRadius, bladeHeight, baseColor, tipColor1, tipColor2, yOffset, getHeightAt, exclude } = opts;

  // Blade geometry — simple thin triangular prism
  const bladeGeo = new THREE.PlaneGeometry(0.08, bladeHeight, 1, 4);
  // Taper the blade: narrow at tip
  const pos = bladeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const taper = 1 - (y + bladeHeight / 2) / bladeHeight;
    pos.setX(i, pos.getX(i) * (0.3 + taper * 0.7));
  }
  bladeGeo.computeVertexNormals();

  // Shader material with wind animation
  const bladeMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(baseColor) },
      tipColor1: { value: new THREE.Color(tipColor1) },
      tipColor2: { value: new THREE.Color(tipColor2) },
    },
    vertexShader: `
      uniform float time;
      varying float vHeight;
      varying float vRandom;
      void main() {
        vHeight = (position.y + ${(bladeHeight / 2).toFixed(2)}) / ${bladeHeight.toFixed(2)};
        vec4 worldPos = instanceMatrix * vec4(position, 1.0);
        vRandom = fract(sin(worldPos.x * 12.9898 + worldPos.z * 78.233) * 43758.5453);
        // Wind displacement — stronger at tip
        float wind = sin(time * 1.5 + worldPos.x * 0.3 + worldPos.z * 0.2) * vHeight * 0.5;
        wind += sin(time * 0.8 + worldPos.x * 0.1) * vHeight * 0.3;
        worldPos.x += wind;
        worldPos.z += wind * 0.3;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 tipColor1;
      uniform vec3 tipColor2;
      varying float vHeight;
      varying float vRandom;
      void main() {
        vec3 tipColor = mix(tipColor1, tipColor2, vRandom);
        vec3 color = mix(baseColor, tipColor, vHeight);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
  const dummy = new THREE.Object3D();

  let written = 0;
  for (let i = 0; i < count; i++) {
    // Random position in annular ring
    const angle = Math.random() * Math.PI * 2;
    const dist = innerRadius + Math.random() * (radius - innerRadius);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (exclude && exclude(x, z)) continue;
    const baseY = getHeightAt ? getHeightAt(x, z) : yOffset;
    dummy.position.set(x, baseY + bladeHeight / 2, z);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.setScalar(0.7 + Math.random() * 0.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(written++, dummy.matrix);
  }
  mesh.count = written; // never render unwritten (identity-at-origin) instances
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  const clock = new THREE.Clock();

  return {
    update: () => {
      bladeMat.uniforms.time.value = clock.getElapsedTime();
    },
    dispose: () => {
      scene.remove(mesh);
      bladeGeo.dispose();
      bladeMat.dispose();
    },
  };
}

/**
 * Create a 3D wheat field with instanced stalks and grain heads
 */
export function createWheatField(scene: THREE.Scene, opts: WheatFieldOptions) {
  const { count, centerX, centerZ, width, depth, stalkHeight, color, headColor, yOffset = 0, getHeightAt, exclude } = opts;

  // Stalk geometry — thin cylinder
  const stalkGeo = new THREE.CylinderGeometry(0.015, 0.02, stalkHeight, 3);
  const sharedMat = opts.material;
  const stalkMat = sharedMat ?? new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      stalkColor: { value: new THREE.Color(color) },
      headColor: { value: new THREE.Color(headColor) },
    },
    vertexShader: `
      uniform float time;
      varying float vHeight;
      void main() {
        vHeight = (position.y + ${(stalkHeight / 2).toFixed(2)}) / ${stalkHeight.toFixed(2)};
        vec4 worldPos = instanceMatrix * vec4(position, 1.0);
        // Gentle wheat sway
        float wind = sin(time * 1.2 + worldPos.x * 0.2 + worldPos.z * 0.15) * vHeight * vHeight * 0.4;
        worldPos.x += wind;
        worldPos.z += wind * 0.2;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 stalkColor;
      uniform vec3 headColor;
      varying float vHeight;
      void main() {
        vec3 color = mix(stalkColor, headColor, smoothstep(0.7, 1.0, vHeight));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(stalkGeo, stalkMat, count);
  const dummy = new THREE.Object3D();

  let written = 0;
  for (let i = 0; i < count; i++) {
    const x = centerX + (Math.random() - 0.5) * width;
    const z = centerZ + (Math.random() - 0.5) * depth;
    if (exclude && exclude(x, z)) continue; // skipped slots are trimmed via mesh.count below
    const baseY = getHeightAt ? getHeightAt(x, z) : yOffset;
    dummy.position.set(x, baseY + stalkHeight / 2 + 0.1, z);
    dummy.rotation.y = Math.random() * Math.PI;
    // Slight lean variation
    dummy.rotation.x = (Math.random() - 0.5) * 0.15;
    dummy.rotation.z = (Math.random() - 0.5) * 0.15;
    dummy.scale.setScalar(0.8 + Math.random() * 0.4);
    dummy.updateMatrix();
    mesh.setMatrixAt(written++, dummy.matrix);
  }
  mesh.count = written; // never render unwritten (identity-at-origin) instances
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  const clock = new THREE.Clock();

  return {
    update: () => {
      // Shared material: the caller drives the single time uniform once per frame.
      if (!sharedMat) stalkMat.uniforms.time.value = clock.getElapsedTime();
    },
    dispose: () => {
      scene.remove(mesh);
      stalkGeo.dispose();
      if (!sharedMat) stalkMat.dispose();
    },
  };
}
