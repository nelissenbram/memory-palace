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
}

/**
 * Create an instanced grass system with wind animation
 */
export function createGrassSystem(scene: THREE.Scene, opts: GrassOptions) {
  const { count, radius, innerRadius, bladeHeight, baseColor, tipColor1, tipColor2, yOffset } = opts;

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

  for (let i = 0; i < count; i++) {
    // Random position in annular ring
    const angle = Math.random() * Math.PI * 2;
    const dist = innerRadius + Math.random() * (radius - innerRadius);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    dummy.position.set(x, yOffset + bladeHeight / 2, z);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.setScalar(0.7 + Math.random() * 0.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
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
  const { count, centerX, centerZ, width, depth, stalkHeight, color, headColor, yOffset = 0, getHeightAt } = opts;

  // Stalk geometry — thin cylinder
  const stalkGeo = new THREE.CylinderGeometry(0.015, 0.02, stalkHeight, 3);
  const stalkMat = new THREE.ShaderMaterial({
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

  for (let i = 0; i < count; i++) {
    const x = centerX + (Math.random() - 0.5) * width;
    const z = centerZ + (Math.random() - 0.5) * depth;
    const baseY = getHeightAt ? getHeightAt(x, z) : yOffset;
    dummy.position.set(x, baseY + stalkHeight / 2 + 0.1, z);
    dummy.rotation.y = Math.random() * Math.PI;
    // Slight lean variation
    dummy.rotation.x = (Math.random() - 0.5) * 0.15;
    dummy.rotation.z = (Math.random() - 0.5) * 0.15;
    dummy.scale.setScalar(0.8 + Math.random() * 0.4);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  const clock = new THREE.Clock();

  return {
    update: () => {
      stalkMat.uniforms.time.value = clock.getElapsedTime();
    },
    dispose: () => {
      scene.remove(mesh);
      stalkGeo.dispose();
      stalkMat.dispose();
    },
  };
}
