import * as THREE from "three";

/**
 * Procedural Tuscan terrain: rolling hills via canvas heightmap + splat-based coloring.
 * Replaces the flat-plane + sphere-hill approach with a single dramatic terrain mesh.
 */

// ═══ SIMPLEX-LIKE NOISE (2D, fast) ═══
// Simple value noise with cosine interpolation — good enough for terrain

function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) / 2147483648;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  // Cosine interpolation for smoother results
  const sx = (1 - Math.cos(fx * Math.PI)) * 0.5;
  const sy = (1 - Math.cos(fy * Math.PI)) * 0.5;
  const n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbmNoise(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

// ═══ HEIGHTMAP GENERATION ═══

export interface TerrainConfig {
  size: number;        // world units
  resolution: number;  // heightmap pixels (power of 2)
  hillHeight: number;  // max hill height
  valleyDepth: number; // how deep valleys go
  seed: number;        // random seed offset
  palaceRadius: number; // flat area around palace
  palaceY: number;     // palace hill elevation
}

const DEFAULT_CONFIG: TerrainConfig = {
  size: 1200,
  resolution: 512,
  hillHeight: 22,
  valleyDepth: 5,
  seed: 42,
  palaceRadius: 60,
  palaceY: 8,
};

/**
 * Generate a canvas heightmap for Tuscan rolling hills.
 * Returns both the canvas texture and height data array for queries.
 */
export function generateTuscanHeightmap(config?: Partial<TerrainConfig>): {
  texture: THREE.CanvasTexture;
  heightData: Float32Array;
  config: TerrainConfig;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { resolution: res, seed, palaceRadius, palaceY, hillHeight, valleyDepth, size } = cfg;

  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(res, res);
  const heightData = new Float32Array(res * res);

  for (let py = 0; py < res; py++) {
    for (let px = 0; px < res; px++) {
      // Map pixel to world coords (-size/2 to size/2)
      const wx = (px / res - 0.5) * size;
      const wz = (py / res - 0.5) * size;
      const distFromCenter = Math.sqrt(wx * wx + wz * wz);

      // Multi-octave noise for rolling hills
      const nx = (px / res) * 3.5 + seed;
      const ny = (py / res) * 3.5 + seed * 0.7;

      // Large rolling hills
      const largeHills = fbmNoise(nx * 0.8, ny * 0.8, 4, 0.45, 2.1) * hillHeight;
      // Medium undulation
      const medHills = fbmNoise(nx * 1.6 + 100, ny * 1.6 + 100, 3, 0.4, 2.0) * hillHeight * 0.3;
      // Fine detail
      const detail = fbmNoise(nx * 4 + 200, ny * 4 + 200, 2, 0.35, 2.0) * hillHeight * 0.08;

      // Combine
      let h = largeHills + medHills + detail - valleyDepth;

      // Palace hilltop — raised mound
      const palaceBlend = Math.max(0, 1 - distFromCenter / palaceRadius);
      const palaceMound = palaceBlend * palaceBlend * palaceY * 1.4; // Smooth quadratic mound
      // Flatten the top of the palace hill
      const flattenRadius = palaceRadius * 0.55;
      if (distFromCenter < flattenRadius) {
        const flatBlend = 1 - distFromCenter / flattenRadius;
        h = h * (1 - flatBlend) + palaceY * flatBlend;
      }
      h = Math.max(h, h + palaceMound * (1 - Math.min(1, distFromCenter / palaceRadius)));

      // Gentle valley path going south from palace (for the strada bianca)
      const roadDist = Math.abs(wx - Math.sin(wz * 0.005) * 20);
      if (wz < 0 && roadDist < 15) {
        const valleyFactor = Math.max(0, 1 - roadDist / 15) * 0.4;
        h *= (1 - valleyFactor);
      }

      // Normalize to 0-1 for heightmap
      const normalized = Math.max(0, Math.min(1, (h + valleyDepth) / (hillHeight + palaceY + valleyDepth)));

      heightData[py * res + px] = h;

      const idx = (py * res + px) * 4;
      const v = Math.floor(normalized * 255);
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return { texture, heightData, config: cfg };
}

/**
 * Generate a splat map texture for terrain material blending.
 * R = grass, G = wheat/golden, B = rock/dirt, A = road
 */
export function generateSplatMap(
  heightData: Float32Array,
  config: TerrainConfig
): THREE.CanvasTexture {
  const res = config.resolution;
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(res, res);

  for (let py = 0; py < res; py++) {
    for (let px = 0; px < res; px++) {
      const h = heightData[py * res + px];
      const wx = (px / res - 0.5) * config.size;
      const wz = (py / res - 0.5) * config.size;
      const distFromCenter = Math.sqrt(wx * wx + wz * wz);

      // Calculate slope from neighboring heights
      const hL = px > 0 ? heightData[py * res + px - 1] : h;
      const hR = px < res - 1 ? heightData[py * res + px + 1] : h;
      const hU = py > 0 ? heightData[(py - 1) * res + px] : h;
      const hD = py < res - 1 ? heightData[(py + 1) * res + px] : h;
      const slope = Math.abs(hR - hL) + Math.abs(hD - hU);

      // Noise for variation
      const n = fbmNoise(px * 0.05 + 300, py * 0.05 + 300, 2, 0.5, 2.0);

      let grass = 0, wheat = 0, dirt = 0, road = 0;

      // Near palace — green grass
      if (distFromCenter < config.palaceRadius * 1.5) {
        grass = Math.max(0, 1 - distFromCenter / (config.palaceRadius * 1.5));
      }

      // Height-based: lower = greener, mid = wheat, high ridges = dirt
      if (h < 3) {
        grass += 0.6;
        wheat += 0.2;
      } else if (h < 10) {
        wheat += 0.7 + n * 0.2;
        grass += 0.2 * (1 - n);
      } else {
        wheat += 0.4;
        dirt += 0.3;
      }

      // Steep slopes → dirt/rock
      if (slope > 2) {
        dirt += Math.min(0.8, slope * 0.15);
        wheat *= 0.5;
        grass *= 0.5;
      }

      // Road path
      const roadDist = Math.abs(wx - Math.sin(wz * 0.005) * 20);
      if (wz < 0 && roadDist < 6) {
        road = Math.max(0, 1 - roadDist / 6) * 0.6;
      }

      // Normalize
      const total = grass + wheat + dirt + road || 1;
      const idx = (py * res + px) * 4;
      imageData.data[idx] = Math.floor((grass / total) * 255);
      imageData.data[idx + 1] = Math.floor((wheat / total) * 255);
      imageData.data[idx + 2] = Math.floor((dirt / total) * 255);
      imageData.data[idx + 3] = Math.floor((road / total) * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Create the terrain mesh with splat-map blended materials.
 * Uses a custom ShaderMaterial to blend 4 terrain textures based on the splat map.
 */
export function createTuscanTerrain(
  grassTex: { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture },
  cropTex: { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture },
  groundTex: { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture },
  config?: Partial<TerrainConfig>
): {
  mesh: THREE.Mesh;
  heightData: Float32Array;
  config: TerrainConfig;
  dispose: () => void;
} {
  const { texture: heightMap, heightData, config: cfg } = generateTuscanHeightmap(config);
  const splatMap = generateSplatMap(heightData, cfg);

  // Create terrain geometry
  const geo = new THREE.PlaneGeometry(cfg.size, cfg.size, 256, 256);
  geo.rotateX(-Math.PI / 2);

  // Apply heightmap displacement to vertex positions
  const pos = geo.attributes.position;
  const res = cfg.resolution;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Map world coords to heightmap pixel coords
    const px = Math.floor(((x / cfg.size) + 0.5) * (res - 1));
    const py = Math.floor(((z / cfg.size) + 0.5) * (res - 1));
    const cpx = Math.max(0, Math.min(res - 1, px));
    const cpy = Math.max(0, Math.min(res - 1, py));
    const h = heightData[cpy * res + cpx];
    pos.setY(i, h);
  }
  geo.computeVertexNormals();

  // Splat-map terrain shader — blends grass, wheat, dirt, and road textures
  const terrainMat = new THREE.ShaderMaterial({
    uniforms: {
      uSplatMap: { value: splatMap },
      uGrassMap: { value: grassTex.map },
      uGrassNormal: { value: grassTex.normalMap },
      uWheatMap: { value: cropTex.map },
      uWheatNormal: { value: cropTex.normalMap },
      uDirtMap: { value: groundTex.map },
      uDirtNormal: { value: groundTex.normalMap },
      uTexScale: { value: 60.0 }, // how many times textures tile
      uFogColor: { value: new THREE.Color("#D8CBB0") },
      uFogDensity: { value: 0.0016 },
      uAtmosColor: { value: new THREE.Color("#C8C0A8") },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vFogFactor;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);

        // Exponential fog
        float fogDist = length(worldPos.xyz - cameraPosition);
        vFogFactor = 1.0 - exp(-0.0016 * fogDist * 0.0016 * fogDist);
        vFogFactor = clamp(vFogFactor, 0.0, 1.0);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D uSplatMap;
      uniform sampler2D uGrassMap;
      uniform sampler2D uGrassNormal;
      uniform sampler2D uWheatMap;
      uniform sampler2D uWheatNormal;
      uniform sampler2D uDirtMap;
      uniform sampler2D uDirtNormal;
      uniform float uTexScale;
      uniform vec3 uFogColor;
      uniform vec3 uAtmosColor;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vFogFactor;

      void main() {
        // Sample splat map
        vec4 splat = texture2D(uSplatMap, vUv);
        float grassW = splat.r;
        float wheatW = splat.g;
        float dirtW = splat.b;
        float roadW = splat.a;

        // Tile detail textures
        vec2 tiledUV = vWorldPos.xz / uTexScale;

        vec3 grassCol = texture2D(uGrassMap, tiledUV).rgb;
        vec3 wheatCol = texture2D(uWheatMap, tiledUV).rgb;
        vec3 dirtCol = texture2D(uDirtMap, tiledUV).rgb;
        vec3 roadCol = vec3(0.92, 0.88, 0.82); // white gravel

        // Tint the textures for Tuscan warmth
        grassCol *= vec3(0.7, 0.85, 0.5); // green tint
        wheatCol *= vec3(1.1, 0.95, 0.65); // golden tint
        dirtCol *= vec3(0.85, 0.75, 0.6);  // warm earth

        // Blend based on splat weights
        float total = grassW + wheatW + dirtW + roadW;
        if (total < 0.01) total = 1.0;
        vec3 albedo = (grassCol * grassW + wheatCol * wheatW + dirtCol * dirtW + roadCol * roadW) / total;

        // Simple directional lighting
        vec3 lightDir = normalize(vec3(0.5, 0.7, 0.3));
        vec3 lightColor = vec3(1.0, 0.95, 0.85); // warm sun
        float NdotL = max(dot(vNormal, lightDir), 0.0);
        vec3 ambient = vec3(0.35, 0.32, 0.28);

        vec3 color = albedo * (ambient + lightColor * NdotL * 0.8);

        // Height-based atmospheric perspective — blue shift at distance
        float dist = length(vWorldPos.xz);
        float atmosBlend = clamp((dist - 80.0) / 500.0, 0.0, 0.6);
        color = mix(color, uAtmosColor, atmosBlend);

        // Fog
        color = mix(color, uFogColor, vFogFactor);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geo, terrainMat);
  mesh.receiveShadow = true;

  return {
    mesh,
    heightData,
    config: cfg,
    dispose: () => {
      geo.dispose();
      terrainMat.dispose();
      heightMap.dispose();
      splatMap.dispose();
    },
  };
}

/**
 * Get terrain height at world (x, z) coordinate.
 * Useful for placing objects on terrain.
 */
export function getTerrainHeight(
  x: number,
  z: number,
  heightData: Float32Array,
  config: TerrainConfig
): number {
  const res = config.resolution;
  const px = ((x / config.size) + 0.5) * (res - 1);
  const py = ((z / config.size) + 0.5) * (res - 1);
  const cpx = Math.max(0, Math.min(res - 1, Math.floor(px)));
  const cpy = Math.max(0, Math.min(res - 1, Math.floor(py)));
  return heightData[cpy * res + cpx];
}

/**
 * Create instanced wildflower patches (poppies, lavender, daisies).
 * Places flowers on the hilltop near the camera for foreground interest.
 */
export function createWildflowers(
  scene: THREE.Scene,
  heightData: Float32Array,
  config: TerrainConfig
): { dispose: () => void } {
  const meshes: THREE.InstancedMesh[] = [];

  // Poppy red flowers
  const poppyGeo = new THREE.SphereGeometry(0.12, 5, 4);
  const poppyMat = new THREE.MeshStandardMaterial({
    color: "#CC3333", roughness: 0.7, emissive: "#CC3333", emissiveIntensity: 0.05,
  });
  const poppyStemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.5, 3);
  const stemMat = new THREE.MeshStandardMaterial({ color: "#3A5A28", roughness: 0.85 });

  // Lavender
  const lavGeo = new THREE.ConeGeometry(0.06, 0.3, 5);
  const lavMat = new THREE.MeshStandardMaterial({
    color: "#8A6898", roughness: 0.75, emissive: "#8A6898", emissiveIntensity: 0.03,
  });

  // Daisy white
  const daisyGeo = new THREE.SphereGeometry(0.08, 5, 4);
  const daisyMat = new THREE.MeshStandardMaterial({
    color: "#F0E8D0", roughness: 0.65, emissive: "#FFF8E0", emissiveIntensity: 0.02,
  });

  const flowerTypes = [
    { geo: poppyGeo, mat: poppyMat, count: 800, yOffset: 0.55, scale: 0.8 },
    { geo: lavGeo, mat: lavMat, count: 600, yOffset: 0.45, scale: 1.0 },
    { geo: daisyGeo, mat: daisyMat, count: 500, yOffset: 0.5, scale: 0.7 },
  ];

  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const euler = new THREE.Euler();

  flowerTypes.forEach(ft => {
    const mesh = new THREE.InstancedMesh(ft.geo, ft.mat, ft.count);
    const stems = new THREE.InstancedMesh(poppyStemGeo, stemMat, ft.count);

    let placed = 0;
    let attempts = 0;
    while (placed < ft.count && attempts < ft.count * 4) {
      attempts++;
      // Place near hilltop (within 45-90 units from center)
      const angle = Math.random() * Math.PI * 2;
      const dist = 42 + Math.random() * 50;
      const wx = Math.cos(angle) * dist;
      const wz = Math.sin(angle) * dist;

      const h = getTerrainHeight(wx, wz, heightData, config);
      if (h < 2 || h > 12) continue; // only on elevated ground

      // Flower head
      pos.set(wx, h + ft.yOffset, wz);
      euler.set(Math.random() * 0.3, Math.random() * Math.PI * 2, Math.random() * 0.3);
      quat.setFromEuler(euler);
      const s = ft.scale * (0.7 + Math.random() * 0.6);
      scl.set(s, s, s);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(placed, matrix);

      // Stem
      pos.set(wx, h + ft.yOffset * 0.5, wz);
      scl.set(1, 0.6 + Math.random() * 0.6, 1);
      matrix.compose(pos, quat, scl);
      stems.setMatrixAt(placed, matrix);

      placed++;
    }

    mesh.count = placed;
    stems.count = placed;
    scene.add(mesh);
    scene.add(stems);
    meshes.push(mesh, stems);
  });

  return {
    dispose: () => {
      meshes.forEach(m => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        scene.remove(m);
      });
      poppyGeo.dispose(); lavGeo.dispose(); daisyGeo.dispose();
      poppyStemGeo.dispose();
      poppyMat.dispose(); lavMat.dispose(); daisyMat.dispose(); stemMat.dispose();
    },
  };
}

/**
 * Create a Tuscan ambient soundscape.
 * Layers: cicadas, birds, wind, distant church bells.
 */
export function createTuscanSoundscape(): {
  start: () => void;
  stop: () => void;
  dispose: () => void;
} {
  let started = false;
  const audioElements: HTMLAudioElement[] = [];
  const timers: number[] = [];

  // Create audio context on user interaction
  const start = () => {
    if (started) return;
    started = true;

    // We'll use simple HTML5 Audio elements for ambient loops
    // These audio files would need to be added to public/audio/
    const ambientDefs = [
      { src: "/audio/cicadas.mp3", volume: 0.12, loop: true },
      { src: "/audio/wind.mp3", volume: 0.08, loop: true },
      { src: "/audio/birds.mp3", volume: 0.06, loop: true },
    ];

    ambientDefs.forEach(def => {
      try {
        const audio = new Audio(def.src);
        audio.loop = def.loop;
        audio.volume = def.volume;
        audio.play().catch(() => {}); // Silently fail if no audio files yet
        audioElements.push(audio);
      } catch {
        // Audio files may not exist yet — that's fine
      }
    });

    // Random bird calls every 15-45 seconds
    const scheduleBird = () => {
      const delay = 15000 + Math.random() * 30000;
      const timer = window.setTimeout(() => {
        try {
          const bird = new Audio("/audio/bird_call.mp3");
          bird.volume = 0.04 + Math.random() * 0.04;
          bird.play().catch(() => {});
        } catch {}
        if (started) scheduleBird();
      }, delay);
      timers.push(timer);
    };
    scheduleBird();

    // Distant church bells every 60-120 seconds
    const scheduleBells = () => {
      const delay = 60000 + Math.random() * 60000;
      const timer = window.setTimeout(() => {
        try {
          const bells = new Audio("/audio/church_bells.mp3");
          bells.volume = 0.02 + Math.random() * 0.02;
          bells.play().catch(() => {});
        } catch {}
        if (started) scheduleBells();
      }, delay);
      timers.push(timer);
    };
    scheduleBells();
  };

  const stop = () => {
    started = false;
    audioElements.forEach(a => { a.pause(); a.currentTime = 0; });
    timers.forEach(t => clearTimeout(t));
    timers.length = 0;
  };

  const dispose = () => {
    stop();
    audioElements.length = 0;
  };

  return { start, stop, dispose };
}
