import * as THREE from "three";

/**
 * Procedural canvas-based PBR texture generation.
 * Creates diffuse, normal, and roughness maps for common architectural surfaces.
 */

// ── Seeded random for deterministic textures ──
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Converts a canvas to a Three.js texture with proper settings */
function canvasToTexture(canvas: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}

/** Creates a normal map from a heightmap canvas (Sobel-based) */
function heightToNormal(heightCanvas: HTMLCanvasElement, strength: number = 2.0): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext("2d")!;
  const heightData = ctx.getImageData(0, 0, w, h).data;

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = w;
  normalCanvas.height = h;
  const nCtx = normalCanvas.getContext("2d")!;
  const normalData = nCtx.createImageData(w, h);

  const getHeight = (x: number, y: number) => {
    const cx = ((x % w) + w) % w;
    const cy = ((y % h) + h) % h;
    return heightData[(cy * w + cx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const left = getHeight(x - 1, y);
      const right = getHeight(x + 1, y);
      const top = getHeight(x, y - 1);
      const bottom = getHeight(x, y + 1);

      const dx = (left - right) * strength;
      const dy = (top - bottom) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * w + x) * 4;
      normalData.data[idx] = ((dx / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 2] = ((dz / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 3] = 255;
    }
  }

  nCtx.putImageData(normalData, 0, 0);
  return normalCanvas;
}

// ════════════════════════════════════════════
// MARBLE TEXTURE
// ════════════════════════════════════════════

export interface MarbleTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createMarbleTextures(options: {
  size?: number;
  baseColor?: [number, number, number]; // RGB 0-255
  veinColor?: [number, number, number];
  veinIntensity?: number;
  repeat?: [number, number];
  seed?: number;
} = {}): MarbleTextureSet {
  const {
    size = 512,
    baseColor = [232, 226, 218],
    veinColor = [160, 145, 130],
    veinIntensity = 0.4,
    repeat,
    seed = 42,
  } = options;
  const rand = seededRandom(seed);

  // ── Diffuse map ──
  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dc = diffCanvas.getContext("2d")!;

  // Base color
  dc.fillStyle = `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})`;
  dc.fillRect(0, 0, size, size);

  // Marble veins using turbulent sine waves
  const imgData = dc.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Multi-octave turbulence
      let turb = 0;
      let amp = 1;
      let freq = 0.008;
      for (let o = 0; o < 5; o++) {
        turb += amp * Math.sin(
          x * freq + y * freq * 0.7 +
          rand() * 0.3 * amp +
          Math.sin(y * freq * 1.3 + x * freq * 0.5) * 3
        );
        amp *= 0.5;
        freq *= 2.1;
      }

      // Vein pattern
      const vein = Math.abs(Math.sin(x * 0.01 + y * 0.005 + turb * 2.5));
      const veinFactor = Math.pow(1 - vein, 3) * veinIntensity;

      // Subtle noise
      const noise = (rand() - 0.5) * 8;

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, baseColor[0] + (veinColor[0] - baseColor[0]) * veinFactor + noise));
      data[idx + 1] = Math.min(255, Math.max(0, baseColor[1] + (veinColor[1] - baseColor[1]) * veinFactor + noise));
      data[idx + 2] = Math.min(255, Math.max(0, baseColor[2] + (veinColor[2] - baseColor[2]) * veinFactor + noise));
    }
  }
  dc.putImageData(imgData, 0, 0);

  // ── Heightmap for normal ──
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hc = heightCanvas.getContext("2d")!;
  const hData = hc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    hData.data[i] = hData.data[i + 1] = hData.data[i + 2] = gray;
    hData.data[i + 3] = 255;
  }
  hc.putImageData(hData, 0, 0);

  // ── Roughness map (marble is mostly smooth with rougher veins) ──
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rc = roughCanvas.getContext("2d")!;
  const rData = rc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    // Darker areas (veins) are rougher
    const roughness = 50 + (255 - gray) * 0.3;
    rData.data[i] = rData.data[i + 1] = rData.data[i + 2] = roughness;
    rData.data[i + 3] = 255;
  }
  rc.putImageData(rData, 0, 0);

  return {
    map: canvasToTexture(diffCanvas, repeat),
    normalMap: canvasToTexture(heightToNormal(heightCanvas, 1.5), repeat),
    roughnessMap: canvasToTexture(roughCanvas, repeat),
  };
}

// ════════════════════════════════════════════
// WOOD TEXTURE
// ════════════════════════════════════════════

export interface WoodTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createWoodTextures(options: {
  size?: number;
  baseColor?: [number, number, number];
  darkColor?: [number, number, number];
  grainDensity?: number;
  repeat?: [number, number];
  seed?: number;
} = {}): WoodTextureSet {
  const {
    size = 512,
    baseColor = [120, 80, 48],
    darkColor = [70, 45, 25],
    grainDensity = 40,
    repeat,
    seed = 77,
  } = options;
  const rand = seededRandom(seed);

  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dc = diffCanvas.getContext("2d")!;

  const imgData = dc.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Wood ring pattern (rings running along Y axis)
      const ringFreq = grainDensity / size;
      const distortion = Math.sin(y * 0.02 + rand() * 0.1) * 8 +
        Math.sin(y * 0.007) * 15;
      const ring = Math.sin((x + distortion) * ringFreq * Math.PI * 2);

      // Fine grain lines
      const grain = Math.sin(y * 0.5 + x * 0.02 + rand() * 0.05) * 0.15;

      // Combine
      const t = (ring * 0.5 + 0.5) * 0.6 + grain;
      const noise = (rand() - 0.5) * 10;

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, baseColor[0] + (darkColor[0] - baseColor[0]) * t + noise));
      data[idx + 1] = Math.min(255, Math.max(0, baseColor[1] + (darkColor[1] - baseColor[1]) * t + noise));
      data[idx + 2] = Math.min(255, Math.max(0, baseColor[2] + (darkColor[2] - baseColor[2]) * t + noise));
      data[idx + 3] = 255;
    }
  }
  dc.putImageData(imgData, 0, 0);

  // Heightmap
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hc = heightCanvas.getContext("2d")!;
  const hData = hc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    hData.data[i] = hData.data[i + 1] = hData.data[i + 2] = gray;
    hData.data[i + 3] = 255;
  }
  hc.putImageData(hData, 0, 0);

  // Roughness - wood grain creates directional roughness
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rc = roughCanvas.getContext("2d")!;
  const rData = rc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    const roughness = 100 + (255 - gray) * 0.25 + (rand() - 0.5) * 15;
    rData.data[i] = rData.data[i + 1] = rData.data[i + 2] = Math.min(255, Math.max(0, roughness));
    rData.data[i + 3] = 255;
  }
  rc.putImageData(rData, 0, 0);

  return {
    map: canvasToTexture(diffCanvas, repeat),
    normalMap: canvasToTexture(heightToNormal(heightCanvas, 2.0), repeat),
    roughnessMap: canvasToTexture(roughCanvas, repeat),
  };
}

// ════════════════════════════════════════════
// STONE / PLASTER TEXTURE
// ════════════════════════════════════════════

export interface StoneTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createStoneTextures(options: {
  size?: number;
  baseColor?: [number, number, number];
  variation?: number; // 0-1 how much color variation
  bumpStrength?: number;
  repeat?: [number, number];
  seed?: number;
} = {}): StoneTextureSet {
  const {
    size = 512,
    baseColor = [200, 190, 175],
    variation = 0.3,
    bumpStrength = 2.5,
    repeat,
    seed = 99,
  } = options;
  const rand = seededRandom(seed);

  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dc = diffCanvas.getContext("2d")!;

  const imgData = dc.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Multi-scale noise for stone surface
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let noise = 0;
      let amp = 1;
      let freq = 0.015;
      for (let o = 0; o < 6; o++) {
        noise += amp * (rand() - 0.5);
        amp *= 0.55;
        freq *= 2;
      }

      // Large-scale patches
      const patch = Math.sin(x * 0.008 + rand() * 0.1) *
        Math.sin(y * 0.006 + rand() * 0.1) * 20;

      const v = noise * variation * 40 + patch * variation;

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, baseColor[0] + v));
      data[idx + 1] = Math.min(255, Math.max(0, baseColor[1] + v));
      data[idx + 2] = Math.min(255, Math.max(0, baseColor[2] + v));
      data[idx + 3] = 255;
    }
  }
  dc.putImageData(imgData, 0, 0);

  // Heightmap
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hc = heightCanvas.getContext("2d")!;
  const hData = hc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    hData.data[i] = hData.data[i + 1] = hData.data[i + 2] = gray;
    hData.data[i + 3] = 255;
  }
  hc.putImageData(hData, 0, 0);

  // Roughness - stone is mostly rough
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rc = roughCanvas.getContext("2d")!;
  const rData = rc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const roughness = 160 + (rand() - 0.5) * 50;
    rData.data[i] = rData.data[i + 1] = rData.data[i + 2] = Math.min(255, Math.max(0, roughness));
    rData.data[i + 3] = 255;
  }
  rc.putImageData(rData, 0, 0);

  return {
    map: canvasToTexture(diffCanvas, repeat),
    normalMap: canvasToTexture(heightToNormal(heightCanvas, bumpStrength), repeat),
    roughnessMap: canvasToTexture(roughCanvas, repeat),
  };
}

// ════════════════════════════════════════════
// TILE / HERRINGBONE FLOOR TEXTURE
// ════════════════════════════════════════════

export function createTileTextures(options: {
  size?: number;
  tileColor?: [number, number, number];
  groutColor?: [number, number, number];
  tileSize?: number; // pixels per tile
  groutWidth?: number;
  pattern?: "grid" | "herringbone" | "checkerboard";
  repeat?: [number, number];
  seed?: number;
} = {}): StoneTextureSet {
  const {
    size = 512,
    tileColor = [210, 195, 170],
    groutColor = [140, 130, 115],
    tileSize = 64,
    groutWidth = 3,
    pattern = "grid",
    repeat,
    seed = 55,
  } = options;
  const rand = seededRandom(seed);

  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dc = diffCanvas.getContext("2d")!;

  // Fill with grout color
  dc.fillStyle = `rgb(${groutColor[0]},${groutColor[1]},${groutColor[2]})`;
  dc.fillRect(0, 0, size, size);

  if (pattern === "herringbone") {
    const tw = tileSize;
    const th = tileSize / 2;
    for (let row = -2; row < size / th + 2; row++) {
      for (let col = -2; col < size / tw + 2; col++) {
        const isOdd = (row + col) % 2 !== 0;
        const colorVar = (rand() - 0.5) * 15;
        dc.fillStyle = `rgb(${Math.min(255, tileColor[0] + colorVar)},${Math.min(255, tileColor[1] + colorVar)},${Math.min(255, tileColor[2] + colorVar)})`;

        dc.save();
        const cx = col * tw / 2 + (row % 2) * tw / 4;
        const cy = row * th;
        dc.translate(cx, cy);
        if (isOdd) dc.rotate(Math.PI / 2);
        dc.fillRect(groutWidth / 2, groutWidth / 2, tw - groutWidth, th - groutWidth);
        dc.restore();
      }
    }
  } else if (pattern === "checkerboard") {
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        const isLight = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        const colorVar = (rand() - 0.5) * 10;
        if (isLight) {
          dc.fillStyle = `rgb(${Math.min(255, tileColor[0] + colorVar)},${Math.min(255, tileColor[1] + colorVar)},${Math.min(255, tileColor[2] + colorVar)})`;
        } else {
          dc.fillStyle = `rgb(${Math.min(255, tileColor[0] - 50 + colorVar)},${Math.min(255, tileColor[1] - 50 + colorVar)},${Math.min(255, tileColor[2] - 50 + colorVar)})`;
        }
        dc.fillRect(x + groutWidth / 2, y + groutWidth / 2, tileSize - groutWidth, tileSize - groutWidth);
      }
    }
  } else {
    // Grid
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        const colorVar = (rand() - 0.5) * 12;
        dc.fillStyle = `rgb(${Math.min(255, tileColor[0] + colorVar)},${Math.min(255, tileColor[1] + colorVar)},${Math.min(255, tileColor[2] + colorVar)})`;
        dc.fillRect(x + groutWidth / 2, y + groutWidth / 2, tileSize - groutWidth, tileSize - groutWidth);
      }
    }
  }

  // Extract diffuse data for heightmap
  const imgData = dc.getImageData(0, 0, size, size);

  // Heightmap
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hc = heightCanvas.getContext("2d")!;
  const hData = hc.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const gray = imgData.data[i] * 0.3 + imgData.data[i + 1] * 0.6 + imgData.data[i + 2] * 0.1;
    hData.data[i] = hData.data[i + 1] = hData.data[i + 2] = gray;
    hData.data[i + 3] = 255;
  }
  hc.putImageData(hData, 0, 0);

  // Roughness
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rc = roughCanvas.getContext("2d")!;
  const rData = rc.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const gray = imgData.data[i] * 0.3 + imgData.data[i + 1] * 0.6 + imgData.data[i + 2] * 0.1;
    // Grout is rougher, tiles are smoother
    const isGrout = gray < 160;
    const roughness = isGrout ? 200 : 100 + (rand() - 0.5) * 30;
    rData.data[i] = rData.data[i + 1] = rData.data[i + 2] = Math.min(255, Math.max(0, roughness));
    rData.data[i + 3] = 255;
  }
  rc.putImageData(rData, 0, 0);

  return {
    map: canvasToTexture(diffCanvas, repeat),
    normalMap: canvasToTexture(heightToNormal(heightCanvas, 3.0), repeat),
    roughnessMap: canvasToTexture(roughCanvas, repeat),
  };
}

// ════════════════════════════════════════════
// FABRIC / RUG TEXTURE
// ════════════════════════════════════════════

export function createFabricTextures(options: {
  size?: number;
  baseColor?: [number, number, number];
  weaveScale?: number;
  repeat?: [number, number];
  seed?: number;
} = {}): { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } {
  const {
    size = 256,
    baseColor = [106, 32, 40],
    weaveScale = 4,
    repeat,
    seed = 33,
  } = options;
  const rand = seededRandom(seed);

  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dc = diffCanvas.getContext("2d")!;

  const imgData = dc.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Woven pattern
      const warpX = Math.sin(x / weaveScale * Math.PI) * 0.5 + 0.5;
      const weftY = Math.sin(y / weaveScale * Math.PI) * 0.5 + 0.5;
      const weave = ((Math.floor(x / weaveScale) + Math.floor(y / weaveScale)) % 2 === 0)
        ? warpX * 0.15 : weftY * 0.15;

      const noise = (rand() - 0.5) * 12;
      const v = weave * 40 + noise;

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, baseColor[0] + v));
      data[idx + 1] = Math.min(255, Math.max(0, baseColor[1] + v * 0.5));
      data[idx + 2] = Math.min(255, Math.max(0, baseColor[2] + v * 0.5));
      data[idx + 3] = 255;
    }
  }
  dc.putImageData(imgData, 0, 0);

  // Heightmap
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hc = heightCanvas.getContext("2d")!;
  const hData = hc.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1;
    hData.data[i] = hData.data[i + 1] = hData.data[i + 2] = gray;
    hData.data[i + 3] = 255;
  }
  hc.putImageData(hData, 0, 0);

  return {
    map: canvasToTexture(diffCanvas, repeat),
    normalMap: canvasToTexture(heightToNormal(heightCanvas, 1.0), repeat),
  };
}

// ════════════════════════════════════════════
// DISPOSE HELPERS
// ════════════════════════════════════════════

/** Dispose all textures in a texture set */
export function disposeTextureSet(set: { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture }) {
  if (set.map) set.map.dispose();
  if (set.normalMap) set.normalMap.dispose();
  if (set.roughnessMap) set.roughnessMap.dispose();
  if (set.aoMap) set.aoMap.dispose();
}
