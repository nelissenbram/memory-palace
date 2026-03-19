import * as THREE from "three";

// Instanced grass blade system adapted from FluffyGrass (MIT license)
// Uses billboard alpha-tested grass clumps with wind animation via custom shaders

const VERTEX_SHADER = `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>

uniform sampler2D uNoiseTexture;
uniform float uNoiseScale;
uniform float uTime;

varying vec3 vColor;
varying vec2 vGlobalUV;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vWindColor;

void main() {
  #include <color_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <fog_vertex>
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>

  // Wind
  vec2 uWindDirection = vec2(1.0, 0.6);
  float uWindAmp = 0.12;
  float uWindFreq = 40.0;
  float uSpeed = 0.8;
  float uNoiseFactor = 4.0;
  float uNoiseSpeed = 0.0008;

  vec2 windDirection = normalize(uWindDirection);
  vec4 modelPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);

  float terrainSize = 200.0;
  vGlobalUV = (terrainSize - vec2(modelPosition.xz)) / terrainSize;

  vec4 noise = texture2D(uNoiseTexture, vGlobalUV + uTime * uNoiseSpeed);

  float sinWave = sin(uWindFreq * dot(windDirection, vGlobalUV) + noise.g * uNoiseFactor + uTime * uSpeed) * uWindAmp * (1.0 - uv.y);

  modelPosition.x += sinWave;
  modelPosition.z += sinWave * 0.7;

  // Vary height using noise
  modelPosition.y += exp(texture2D(uNoiseTexture, vGlobalUV * uNoiseScale).r) * 0.3 * (1.0 - uv.y);

  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  vUv = vec2(uv.x, 1.0 - uv.y);
  vNormal = normalize(normalMatrix * normal);
  vWindColor = vec2(sinWave);
  vViewPosition = mvPosition.xyz;
}
`;

const FRAGMENT_SHADER = `
#include <alphatest_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uTipColor1;
uniform vec3 uTipColor2;
uniform sampler2D uGrassAlphaTexture;
uniform sampler2D uNoiseTexture;
uniform float uNoiseScale;
uniform float uGrassLightIntensity;
uniform float uShadowDarkness;

varying vec2 vUv;
varying vec2 vGlobalUV;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vWindColor;

void main() {
  vec4 grassAlpha = texture2D(uGrassAlphaTexture, vUv);

  vec4 grassVariation = texture2D(uNoiseTexture, vGlobalUV * uNoiseScale);
  vec3 tipColor = mix(uTipColor1, uTipColor2, grassVariation.r);

  vec4 diffuseColor = vec4(mix(uBaseColor, tipColor, vUv.y), step(0.1, grassAlpha.r));
  vec3 grassFinalColor = diffuseColor.rgb * uGrassLightIntensity;

  // Shadow calculation
  vec3 geometryPosition = vViewPosition;
  vec3 geometryNormal = vNormal;
  vec3 geometryViewDir = (isOrthographic) ? vec3(0, 0, 1) : normalize(vViewPosition);
  vec3 geometryClearcoatNormal;
  IncidentLight directLight;
  float shadow = 0.0;
  float currentShadow = 0.0;

  #if (NUM_DIR_LIGHTS > 0)
    DirectionalLight directionalLight;
    #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
      DirectionalLightShadow directionalLightShadow;
    #endif
    #pragma unroll_loop_start
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
      directionalLight = directionalLights[i];
      getDirectionalLightInfo(directionalLight, directLight);
      directionalLightShadow = directionalLightShadows[i];
      currentShadow = getShadow(
        directionalShadowMap[i],
        directionalLightShadow.shadowMapSize,
        directionalLightShadow.shadowBias,
        directionalLightShadow.shadowRadius,
        vDirectionalShadowCoord[i]
      );
      currentShadow = all(bvec2(directLight.visible, receiveShadow)) ? currentShadow : 1.0;
      float weight = clamp(pow(length(vDirectionalShadowCoord[i].xy * 2.0 - 1.0), 4.0), 0.0, 1.0);
      shadow += mix(currentShadow, 1.0, weight);
    }
    #pragma unroll_loop_end
  #endif

  grassFinalColor = mix(grassFinalColor, grassFinalColor * uShadowDarkness, 1.0 - shadow);
  diffuseColor.rgb = clamp(diffuseColor.rgb * shadow, 0.0, 1.0);

  #include <alphatest_fragment>
  gl_FragColor = vec4(grassFinalColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface GrassConfig {
  count?: number;        // number of grass clump instances
  radius?: number;       // scatter radius
  innerRadius?: number;  // keep-out radius (no grass inside this)
  bladeHeight?: number;  // base blade height
  baseColor?: string;
  tipColor1?: string;
  tipColor2?: string;
  yOffset?: number;      // vertical offset (e.g. for hilltop)
}

const DEFAULT_CONFIG: Required<GrassConfig> = {
  count: 6000,
  radius: 75,
  innerRadius: 42,
  bladeHeight: 1.0,
  baseColor: "#2A3A15",
  tipColor1: "#7AB86A",
  tipColor2: "#3A5828",
  yOffset: 0,
};

export function createGrassSystem(scene: THREE.Scene, config?: GrassConfig) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const textureLoader = new THREE.TextureLoader();

  const grassAlpha = textureLoader.load("/textures/grass_alpha.png");
  const noiseTexture = textureLoader.load("/textures/perlinnoise.webp");
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

  const uniforms: Record<string, { value: any }> = {
    uTime: { value: 0 },
    uNoiseScale: { value: 1.5 },
    uGrassLightIntensity: { value: 1.2 },
    uShadowDarkness: { value: 0.5 },
    uBaseColor: { value: new THREE.Color(cfg.baseColor) },
    uTipColor1: { value: new THREE.Color(cfg.tipColor1) },
    uTipColor2: { value: new THREE.Color(cfg.tipColor2) },
    uNoiseTexture: { value: noiseTexture },
    uGrassAlphaTexture: { value: grassAlpha },
  };

  // Create grass clump geometry: three intersecting planes (star cross) for fuller look
  const hw = 0.8, hh = cfg.bladeHeight;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Three crossed planes at 60-degree intervals for dense, round clump
  for (let p = 0; p < 3; p++) {
    const angle = (p / 3) * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const base = p * 4;

    // 4 vertices per plane — slight taper at top for more natural shape
    const topW = hw * 0.7;
    positions.push(-hw * cos, 0, -hw * sin);         uvs.push(0, 0);
    positions.push(hw * cos, 0, hw * sin);            uvs.push(1, 0);
    positions.push(topW * cos, hh, topW * sin);       uvs.push(1, 1);
    positions.push(-topW * cos, hh, -topW * sin);    uvs.push(0, 1);

    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  grassGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  grassGeo.setIndex(indices);
  grassGeo.computeVertexNormals();

  // Material with custom shaders injected into MeshLambertMaterial
  const grassMat = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    color: 0x228833,
    transparent: true,
    alphaTest: 0.1,
    shadowSide: 1,
  });

  grassMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTime: uniforms.uTime,
      uTipColor1: uniforms.uTipColor1,
      uTipColor2: uniforms.uTipColor2,
      uBaseColor: uniforms.uBaseColor,
      uShadowDarkness: uniforms.uShadowDarkness,
      uGrassLightIntensity: uniforms.uGrassLightIntensity,
      uNoiseScale: uniforms.uNoiseScale,
      uNoiseTexture: uniforms.uNoiseTexture,
      uGrassAlphaTexture: uniforms.uGrassAlphaTexture,
    });
    shader.vertexShader = VERTEX_SHADER;
    shader.fragmentShader = FRAGMENT_SHADER;
  };

  // Create instanced mesh
  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, cfg.count);
  grassMesh.receiveShadow = true;
  grassMesh.frustumCulled = false; // instances span large area

  // Scatter instances on terrain ring between innerRadius and radius
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let i = 0; i < cfg.count; i++) {
    // Random position in ring
    const angle = Math.random() * Math.PI * 2;
    const dist = cfg.innerRadius + Math.random() * (cfg.radius - cfg.innerRadius);
    position.set(Math.cos(angle) * dist, cfg.yOffset + 0.1, Math.sin(angle) * dist);

    // Random Y rotation
    euler.set(0, Math.random() * Math.PI * 2, 0);
    quaternion.setFromEuler(euler);

    // Vary scale slightly
    const s = 0.7 + Math.random() * 0.6;
    const sy = 0.6 + Math.random() * 0.8;
    scale.set(s, sy, s);

    matrix.compose(position, quaternion, scale);
    grassMesh.setMatrixAt(i, matrix);
  }

  scene.add(grassMesh);

  // Return update function for animation loop
  const clock = new THREE.Clock();
  return {
    update: () => {
      uniforms.uTime.value += clock.getDelta();
    },
    dispose: () => {
      grassGeo.dispose();
      grassMat.dispose();
      grassAlpha.dispose();
      noiseTexture.dispose();
      scene.remove(grassMesh);
    },
  };
}

// ══════════════════════════════════════════
// WHEAT STALKS — instanced tall crop geometry with gentle sway
// ══════════════════════════════════════════

export interface WheatFieldConfig {
  count?: number;
  centerX?: number;
  centerZ?: number;
  width?: number;
  depth?: number;
  stalkHeight?: number;
  color?: string;
  headColor?: string;
}

export function createWheatField(scene: THREE.Scene, config: WheatFieldConfig) {
  const count = config.count || 2000;
  const cx = config.centerX || 0;
  const cz = config.centerZ || 0;
  const fw = config.width || 30;
  const fd = config.depth || 20;
  const sh = config.stalkHeight || 1.8;
  const stalkCol = new THREE.Color(config.color || "#B8A040");
  const headCol = new THREE.Color(config.headColor || "#D4B848");

  // Wheat stalk geometry: thin tapered cylinder + seed head (small sphere on top)
  const stalkGeo = new THREE.CylinderGeometry(0.015, 0.025, sh, 3, 4);
  // Bend the stalk slightly — displace top vertices
  const posAttr = stalkGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const bendFactor = Math.pow(Math.max(0, y / sh), 2);
    posAttr.setX(i, posAttr.getX(i) + bendFactor * 0.15);
  }
  posAttr.needsUpdate = true;
  stalkGeo.computeVertexNormals();

  // Merge stalk + head into single geometry
  const headGeo = new THREE.SphereGeometry(0.04, 4, 3);
  headGeo.translate(0.15 * 1, sh / 2 + 0.03, 0); // offset to match bend

  // Use two instanced meshes: stalks and heads
  const stalkMat = new THREE.MeshStandardMaterial({ color: stalkCol, roughness: 0.92, envMapIntensity: 0.1 });
  const headMat = new THREE.MeshStandardMaterial({ color: headCol, roughness: 0.88, envMapIntensity: 0.1 });

  const stalkMesh = new THREE.InstancedMesh(stalkGeo, stalkMat, count);
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, count);
  stalkMesh.receiveShadow = true;
  stalkMesh.castShadow = true;
  headMesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let i = 0; i < count; i++) {
    pos.set(
      cx + (Math.random() - 0.5) * fw,
      sh / 2 + 0.1,
      cz + (Math.random() - 0.5) * fd
    );
    euler.set(
      (Math.random() - 0.5) * 0.15, // slight random lean
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.15
    );
    quat.setFromEuler(euler);
    const s = 0.8 + Math.random() * 0.4;
    scl.set(s, 0.7 + Math.random() * 0.6, s);
    matrix.compose(pos, quat, scl);
    stalkMesh.setMatrixAt(i, matrix);
    headMesh.setMatrixAt(i, matrix);
  }

  scene.add(stalkMesh);
  scene.add(headMesh);

  return {
    dispose: () => {
      stalkGeo.dispose();
      headGeo.dispose();
      stalkMat.dispose();
      headMat.dispose();
      scene.remove(stalkMesh);
      scene.remove(headMesh);
    },
  };
}
