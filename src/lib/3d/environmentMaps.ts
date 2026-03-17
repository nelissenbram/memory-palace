import * as THREE from "three";

/**
 * Procedural environment map generation for IBL (Image-Based Lighting).
 * Creates warm, atmospheric environment maps without needing external HDRI files.
 * Uses PMREMGenerator to create proper prefiltered environment maps.
 */

/** Create a warm interior environment map (for halls, corridors, rooms) */
export function createInteriorEnvMap(
  renderer: THREE.WebGLRenderer,
  options: {
    warmth?: number; // 0-1, how warm/golden the light is (default 0.7)
    brightness?: number; // 0-1 (default 0.4)
    tint?: THREE.Color; // optional color tint
  } = {}
): THREE.Texture {
  const { warmth = 0.7, brightness = 0.4, tint } = options;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();

  const envScene = new THREE.Scene();

  // Warm ambient fill
  const r = 0.6 + warmth * 0.3;
  const g = 0.5 + warmth * 0.15;
  const b = 0.35 + (1 - warmth) * 0.2;
  const bgColor = tint || new THREE.Color(r * brightness, g * brightness, b * brightness);
  envScene.background = bgColor;

  // Simulate warm ceiling light bounce
  const ceilGeo = new THREE.PlaneGeometry(20, 20);
  const ceilMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(
      1.0 * brightness * 1.5,
      0.9 * brightness * 1.5,
      0.7 * brightness * 1.5
    ),
  });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.position.y = 8;
  ceil.rotation.x = Math.PI / 2;
  envScene.add(ceil);

  // Warm walls at various angles for diffuse bounce
  const wallColor = new THREE.Color(
    0.7 * brightness * 1.2,
    0.55 * brightness * 1.2,
    0.38 * brightness * 1.2
  );
  const wallMat = new THREE.MeshBasicMaterial({ color: wallColor });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), wallMat);
    wall.position.set(Math.cos(angle) * 10, 3, Math.sin(angle) * 10);
    wall.lookAt(0, 3, 0);
    envScene.add(wall);
  }

  // Warm floor bounce
  const floorMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.4 * brightness, 0.3 * brightness, 0.2 * brightness),
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2;
  envScene.add(floor);

  // Bright window-like accent lights
  const windowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0 * brightness, 1.8 * brightness, 1.4 * brightness),
  });
  for (let i = 0; i < 3; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), windowMat);
    const angle = ((i - 1) / 3) * Math.PI * 0.5;
    win.position.set(Math.cos(angle) * 9, 4, Math.sin(angle) * 9);
    win.lookAt(0, 4, 0);
    envScene.add(win);
  }

  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  envScene.traverse((obj) => {
    if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    if ((obj as THREE.Mesh).material) ((obj as THREE.Mesh).material as THREE.Material).dispose();
  });
  pmrem.dispose();

  return envMap;
}

/** Create a golden-hour exterior environment map */
export function createExteriorEnvMap(
  renderer: THREE.WebGLRenderer,
  options: {
    sunIntensity?: number; // 0-1 (default 0.8)
    skyBrightness?: number; // 0-1 (default 0.6)
  } = {}
): THREE.Texture {
  const { sunIntensity = 0.8, skyBrightness = 0.6 } = options;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();

  const envScene = new THREE.Scene();

  // Golden hour sky gradient
  const skyColor = new THREE.Color(
    0.45 * skyBrightness,
    0.55 * skyBrightness,
    0.75 * skyBrightness
  );
  envScene.background = skyColor;

  // Sky dome - upper blue
  const skyGeo = new THREE.SphereGeometry(50, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const skyMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.3 * skyBrightness, 0.5 * skyBrightness, 0.8 * skyBrightness),
    side: THREE.BackSide,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(skyDome);

  // Horizon warm band
  const horizonGeo = new THREE.SphereGeometry(49, 32, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.3);
  const horizonMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0 * sunIntensity, 0.75 * sunIntensity, 0.45 * sunIntensity),
    side: THREE.BackSide,
  });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  envScene.add(horizon);

  // Sun disc
  const sunGeo = new THREE.CircleGeometry(5, 32);
  const sunMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.0 * sunIntensity, 2.5 * sunIntensity, 1.5 * sunIntensity),
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(30, 18, -15);
  sun.lookAt(0, 0, 0);
  envScene.add(sun);

  // Ground plane (greenish)
  const groundMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.15, 0.2, 0.08),
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -5;
  envScene.add(ground);

  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  envScene.traverse((obj) => {
    if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    if ((obj as THREE.Mesh).material) ((obj as THREE.Mesh).material as THREE.Material).dispose();
  });
  pmrem.dispose();

  return envMap;
}

/** Apply environment map to a scene — sets scene.environment for PBR IBL */
export function applyEnvMap(
  scene: THREE.Scene,
  envMap: THREE.Texture,
  options: {
    asBackground?: boolean; // also set as scene.background (exterior only)
    backgroundBlurriness?: number; // 0-1 blur for background
    envMapIntensity?: number; // default 1.0
  } = {}
): void {
  const { asBackground = false, backgroundBlurriness = 0.1, envMapIntensity = 1.0 } = options;
  scene.environment = envMap;
  scene.environmentIntensity = envMapIntensity;

  if (asBackground) {
    scene.background = envMap;
    scene.backgroundBlurriness = backgroundBlurriness;
  }
}
