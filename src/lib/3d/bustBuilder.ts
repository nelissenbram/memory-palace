import * as THREE from "three";
import { loadModel } from "@/lib/3d/modelLoader";

export type BustStyle = "roman" | "renaissance";
export type BustGender = "male" | "female";

const BUST_MODEL_PATH = "/models/bust_base.glb";

// ════════════════════════════════════════════
// PRIMARY: COMPOSITE BUST (TORSO + CAMEO HEAD)
// ════════════════════════════════════════════

/**
 * Load a classical bust with the head replaced by a cameo portrait.
 * - Torso: GLB model clipped at neck with a marble cap
 * - Head: oval cameo with the user's photo, desaturated + tinted
 * If no photo, returns the full GLB model as-is (generic bust).
 */
export async function loadBustModel(
  style: BustStyle = "roman",
  gender: BustGender = "male",
  faceImageUrl?: string | null,
  marblePBR?: { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture } | null,
): Promise<THREE.Group> {
  try {
    const model = await loadModel(BUST_MODEL_PATH);
    const mat = style === "renaissance"
      ? createBronzePhysicalMaterial()
      : createMarblePhysicalMaterial(marblePBR);

    if (!faceImageUrl) {
      // Generic bust — full model, no cameo
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) child.material = mat;
      });
      // Gender adjustment on full bust — narrower shoulders, slightly smaller, slimmer proportions
      if (gender === "female") {
        model.scale.x *= 0.78;
        model.scale.z *= 0.85;
        model.scale.y *= 0.93;
      }
      return model;
    }

    // User bust — torso + cameo head
    const group = new THREE.Group();
    group.name = "CompositeBust";

    // Compute model bounds for clipping
    const box = new THREE.Box3().setFromObject(model);
    const totalHeight = box.max.y - box.min.y;
    const neckCutY = box.min.y + totalHeight * 0.58; // cut at ~58% height (neck)

    // Apply clipping plane to hide the head
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), neckCutY);

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const clonedMat = mat.clone();
      clonedMat.clippingPlanes = [clipPlane];
      clonedMat.clipShadows = true;
      child.material = clonedMat;
    });

    // Gender adjustment on torso — narrower shoulders, slimmer
    if (gender === "female") {
      model.scale.x *= 0.78;
      model.scale.z *= 0.85;
      model.scale.y *= 0.93;
    }
    group.add(model);

    // Neck cap — disc to cover the open cut
    const modelWidth = box.max.x - box.min.x;
    const capRadius = modelWidth * 0.08;
    const capGeo = new THREE.CircleGeometry(capRadius, 24);
    capGeo.rotateX(-Math.PI / 2);
    const capMat = mat.clone();
    const capMesh = new THREE.Mesh(capGeo, capMat);
    const modelCenterX = (box.min.x + box.max.x) / 2;
    const modelCenterZ = (box.min.z + box.max.z) / 2;
    capMesh.position.set(modelCenterX, neckCutY, modelCenterZ);
    group.add(capMesh);

    // Cameo head with user's photo
    const cameo = await createCameoHead(faceImageUrl, style, modelWidth);
    cameo.position.set(modelCenterX, neckCutY, modelCenterZ);
    group.add(cameo);

    return group;
  } catch {
    // Fallback: simple procedural bust
    return generateFallbackBust(style);
  }
}

// ════════════════════════════════════════════
// CAMEO HEAD — PORTRAIT MEDALLION
// ════════════════════════════════════════════

/**
 * Create an oval cameo portrait head — like a classical relief portrait.
 * The photo is desaturated, tinted to match marble/bronze, and mapped
 * onto a gently domed oval shape.
 */
async function createCameoHead(
  imageUrl: string,
  style: BustStyle,
  modelWidth: number,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  const headScale = modelWidth * 0.12; // proportional to torso

  // Create the oval cameo geometry: a domed front, flat back
  // Using a hemisphere scaled to oval proportions
  const geo = new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
  // Scale: wider (X), taller (Y), shallow depth (Z)
  geo.scale(headScale * 0.85, headScale * 1.1, headScale * 0.55);

  // Create the face texture
  const img = await loadImage(imageUrl);
  const faceTexture = createCameoTexture(img, style);

  // Generate a subtle normal map from the face for carved/relief look
  const faceCanvas = faceTexture.image as HTMLCanvasElement;
  const normalMap = generateNormalMapFromCanvas(faceCanvas, 1.5);

  const baseMat = style === "renaissance"
    ? createBronzePhysicalMaterial()
    : createMarblePhysicalMaterial();

  const cameoMat = new THREE.MeshPhysicalMaterial({
    map: faceTexture,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: baseMat.roughness,
    metalness: baseMat.metalness,
    clearcoat: 0.15,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.7,
  });

  const cameoMesh = new THREE.Mesh(geo, cameoMat);
  cameoMesh.castShadow = true;
  group.add(cameoMesh);

  // Back of head — a matching half-sphere, solid marble/bronze
  const backGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55);
  backGeo.scale(headScale * 0.82, headScale * 1.05, headScale * 0.45);
  const backMesh = new THREE.Mesh(backGeo, baseMat.clone());
  backMesh.castShadow = true;
  group.add(backMesh);

  // Thin rim/border around the portrait
  const rimGeo = new THREE.TorusGeometry(headScale * 0.88, headScale * 0.03, 8, 32);
  rimGeo.rotateX(Math.PI / 2);
  rimGeo.scale(0.97, 1.25, 0.3);
  const rimMat = baseMat.clone();
  rimMat.color.multiplyScalar(0.9);
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.z = headScale * 0.05;
  group.add(rimMesh);

  return group;
}

/**
 * Create the cameo face texture: desaturated, marble/bronze tinted,
 * with a smooth oval vignette and relief-like quality.
 */
function createCameoTexture(
  faceImage: HTMLImageElement,
  style: BustStyle,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base color
  const baseColor = style === "roman" ? "#E8E0D4" : "#6A5840";
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Draw the photo within an oval clip
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.44, size * 0.48, 0, 0, Math.PI * 2);
  ctx.clip();

  // Fill the photo, covering the oval
  const imgAspect = faceImage.width / faceImage.height;
  let drawW = size * 0.96;
  let drawH = drawW / imgAspect;
  if (drawH < size * 0.96) {
    drawH = size * 0.96;
    drawW = drawH * imgAspect;
  }
  ctx.drawImage(faceImage, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
  ctx.restore();

  // Desaturate — partial, keeping ~20% color for warmth
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const desatAmount = style === "roman" ? 0.85 : 0.75;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i] + (gray - data[i]) * desatAmount;
    data[i + 1] = data[i + 1] + (gray - data[i + 1]) * desatAmount;
    data[i + 2] = data[i + 2] + (gray - data[i + 2]) * desatAmount;
  }
  ctx.putImageData(imageData, 0, 0);

  // Material tint overlay
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = style === "roman" ? "#F5EDE0" : "#8A7050";
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  // Soft oval vignette — fade edges to base color
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.28,
    size / 2, size / 2, size * 0.48
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0)");
  gradient.addColorStop(1, style === "roman" ? "rgba(232,224,212,0.85)" : "rgba(106,88,64,0.85)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ════════════════════════════════════════════
// HIGH-QUALITY MATERIALS
// ════════════════════════════════════════════

function createMarblePhysicalMaterial(
  pbrSet?: { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture } | null,
): THREE.MeshPhysicalMaterial {
  if (pbrSet?.map) {
    return new THREE.MeshPhysicalMaterial({
      map: pbrSet.map,
      normalMap: pbrSet.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: pbrSet.roughnessMap,
      aoMap: pbrSet.aoMap,
      aoMapIntensity: 0.6,
      color: "#F0EBE0",
      roughness: 0.20,
      metalness: 0.0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.15,
      envMapIntensity: 0.9,
    });
  }

  // Fallback: procedural marble
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#F0EBE0";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(195,185,175,0.3)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.3) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    imgData.data[i] += noise;
    imgData.data[i + 1] += noise;
    imgData.data[i + 2] += noise;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  const normalMap = generateNormalMapFromCanvas(canvas, 0.6);

  return new THREE.MeshPhysicalMaterial({
    map: tex,
    normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
    color: "#F0EBE0",
    roughness: 0.22,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.0,
  });
}

function createBronzePhysicalMaterial(): THREE.MeshPhysicalMaterial {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#5A4A38";
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    imgData.data[i] += noise;
    imgData.data[i + 1] += noise;
    imgData.data[i + 2] += noise;
  }
  ctx.putImageData(imgData, 0, 0);

  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const intensity = 0.15 + (y / size) * 0.2;
    const r = 12 + Math.random() * 30;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(55,110,65,${intensity})`);
    grad.addColorStop(0.6, `rgba(65,100,60,${intensity * 0.5})`);
    grad.addColorStop(1, "rgba(60,100,70,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  const normalMap = generateNormalMapFromCanvas(canvas, 1.2);

  return new THREE.MeshPhysicalMaterial({
    map: tex,
    normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    color: "#6A5840",
    roughness: 0.28,
    metalness: 0.85,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.2,
  });
}

/** Generate a normal map from a canvas by computing luminance gradients */
function generateNormalMapFromCanvas(source: HTMLCanvasElement, strength: number): THREE.CanvasTexture {
  const w = source.width;
  const h = source.height;
  const srcCtx = source.getContext("2d")!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const outData = ctx.createImageData(w, h);

  const lum = (i: number) => (srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114) / 255;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const l = lum(idx);
      const lR = x < w - 1 ? lum(idx + 4) : l;
      const lD = y < h - 1 ? lum(idx + w * 4) : l;
      const dx = (l - lR) * strength;
      const dy = (l - lD) * strength;
      outData.data[idx] = Math.round((dx * 0.5 + 0.5) * 255);
      outData.data[idx + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      outData.data[idx + 2] = 255;
      outData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(outData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// ════════════════════════════════════════════
// FALLBACK: SIMPLE PROCEDURAL BUST
// ════════════════════════════════════════════

function generateFallbackBust(style: BustStyle): THREE.Group {
  const group = new THREE.Group();
  group.name = "FallbackBust";

  const mat = style === "renaissance"
    ? createBronzePhysicalMaterial()
    : createMarblePhysicalMaterial();

  // Simple torso shape
  const raw: [number, number][] = [
    [0.00, 0.00], [0.28, 0.00], [0.30, 0.02], [0.28, 0.10],
    [0.26, 0.14], [0.22, 0.18], [0.12, 0.22], [0.10, 0.30],
    [0.09, 0.36], [0.00, 0.38],
  ];
  const curvePoints = raw.map(([r, h]) => new THREE.Vector2(r, h));
  const curve = new THREE.SplineCurve(curvePoints);
  const pts = curve.getPoints(30);

  const latheGeo = new THREE.LatheGeometry(pts, 32);
  const bustMesh = new THREE.Mesh(latheGeo, mat);
  bustMesh.castShadow = true;
  bustMesh.receiveShadow = true;
  group.add(bustMesh);

  // Simple head sphere
  const headGeo = new THREE.SphereGeometry(0.09, 24, 18);
  headGeo.translate(0, 0.46, 0);
  const headMesh = new THREE.Mesh(headGeo, mat.clone());
  headMesh.castShadow = true;
  group.add(headMesh);

  return group;
}

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Validate that an image contains a well-cropped face.
 * Uses the browser's FaceDetector API if available, otherwise basic heuristics.
 */
export async function validateFacePhoto(
  img: HTMLImageElement
): Promise<{ valid: boolean; message?: string }> {
  // Try browser FaceDetector API (Chrome/Edge)
  if ("FaceDetector" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).FaceDetector();
      const faces = await detector.detect(img);
      if (faces.length === 0) {
        return { valid: false, message: "No face detected. Please upload a clear face photo." };
      }
      if (faces.length > 1) {
        return { valid: false, message: "Multiple faces detected. Please crop to a single face." };
      }
      // Check face size relative to image
      const face = faces[0].boundingBox;
      const faceArea = face.width * face.height;
      const imgArea = img.width * img.height;
      if (faceArea / imgArea < 0.08) {
        return { valid: false, message: "Face is too small. Please use a closer crop or portrait photo." };
      }
      return { valid: true };
    } catch {
      // FaceDetector failed, fall through to basic check
    }
  }

  // Basic heuristic: check image dimensions
  if (img.width < 100 || img.height < 100) {
    return { valid: false, message: "Image is too small. Please use a higher resolution photo." };
  }
  // Accept — we can't validate without FaceDetector
  return { valid: true };
}
