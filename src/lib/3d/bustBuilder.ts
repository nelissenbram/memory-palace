import * as THREE from "three";
import { loadModel } from "@/lib/3d/modelLoader";

export type BustStyle = "roman" | "renaissance";
export type BustGender = "male" | "female";

const BUST_MODEL_PATH = "/models/bust_base.glb";
const BUST_FEMALE_MODEL_PATH = "/models/bust_female.glb";

// ════════════════════════════════════════════
// PRIMARY: COMPOSITE BUST (TORSO + PHOTO HEAD)
// ════════════════════════════════════════════

/**
 * Load a classical bust.
 * - No photo: full GLB model with gender-specific adjustments (+ hair bun for female)
 * - With photo: GLB torso clipped at neck, face photo as flat portrait disc on top
 */
export async function loadBustModel(
  style: BustStyle = "roman",
  gender: BustGender = "male",
  faceImageUrl?: string | null,
  marblePBR?: { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture } | null,
): Promise<THREE.Group> {
  const mat = style === "renaissance"
    ? createBronzePhysicalMaterial()
    : createMarblePhysicalMaterial(marblePBR);

  // Both genders use GLB models
  const modelPath = gender === "female" ? BUST_FEMALE_MODEL_PATH : BUST_MODEL_PATH;
  const fallbackGen = gender === "female" ? generateFemaleBust : generateMaleBust;

  try {
    const model = await loadModel(modelPath);
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) child.material = mat;
    });

    // Female bust: scale slightly for feminine proportions
    // (narrower shoulders, slightly smaller overall)
    if (gender === "female") {
      model.scale.set(0.88, 0.95, 0.90);
    }

    if (!faceImageUrl) return model;

    // User bust — torso + portrait head
    return addPortraitToGLBBust(model, faceImageUrl, style, mat, gender);
  } catch {
    const bust = fallbackGen(style, mat);
    if (faceImageUrl) {
      return addPortraitToProceduralBust(bust, faceImageUrl, style, mat);
    }
    return bust;
  }
}

/** Wrap a model in a named group */
function wrapInGroup(model: THREE.Object3D, name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.add(model);
  return group;
}

/** Add a portrait head to a GLB bust model — removes head geometry and adds a 3D portrait sphere.
 *  Uses geometry trimming (not clipping planes) so it works correctly after scene scaling/positioning. */
async function addPortraitToGLBBust(
  model: THREE.Object3D,
  faceImageUrl: string,
  style: BustStyle,
  mat: THREE.MeshPhysicalMaterial,
  gender: BustGender,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "CompositeBust";

  const box = new THREE.Box3().setFromObject(model);
  const totalHeight = box.max.y - box.min.y;
  // Neck cut at ~58% from bottom for male, ~65% for female
  const neckRatio = gender === "female" ? 0.65 : 0.58;
  const neckCutY = box.min.y + totalHeight * neckRatio;

  // Remove vertices above neck by modifying geometry directly
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.material = mat.clone();

    const geo = child.geometry;
    if (!geo || !geo.attributes.position) return;

    // Get world transform to handle any local transforms on the mesh
    child.updateMatrixWorld(true);
    const posAttr = geo.attributes.position;
    const vertex = new THREE.Vector3();

    if (geo.index) {
      // Indexed geometry — rebuild index excluding triangles above neck
      const oldIndex = geo.index.array;
      const newIndices: number[] = [];
      for (let i = 0; i < oldIndex.length; i += 3) {
        const i0 = oldIndex[i], i1 = oldIndex[i + 1], i2 = oldIndex[i + 2];
        // Check if ALL vertices of the triangle are above cut — if so, skip it
        vertex.fromBufferAttribute(posAttr, i0); child.localToWorld(vertex);
        const y0 = vertex.y;
        vertex.fromBufferAttribute(posAttr, i1); child.localToWorld(vertex);
        const y1 = vertex.y;
        vertex.fromBufferAttribute(posAttr, i2); child.localToWorld(vertex);
        const y2 = vertex.y;
        // Keep triangle if any vertex is below cut line
        if (y0 <= neckCutY || y1 <= neckCutY || y2 <= neckCutY) {
          newIndices.push(i0, i1, i2);
        }
      }
      geo.setIndex(newIndices);
    } else {
      // Non-indexed geometry — rebuild position buffer
      const positions = posAttr.array as Float32Array;
      const keep: number[] = [];
      for (let i = 0; i < positions.length; i += 9) {
        vertex.set(positions[i], positions[i + 1], positions[i + 2]);
        child.localToWorld(vertex);
        const y0 = vertex.y;
        vertex.set(positions[i + 3], positions[i + 4], positions[i + 5]);
        child.localToWorld(vertex);
        const y1 = vertex.y;
        vertex.set(positions[i + 6], positions[i + 7], positions[i + 8]);
        child.localToWorld(vertex);
        const y2 = vertex.y;
        if (y0 <= neckCutY || y1 <= neckCutY || y2 <= neckCutY) {
          for (let j = 0; j < 9; j++) keep.push(positions[i + j]);
        }
      }
      geo.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
    }
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
  });
  group.add(model);

  // Neck cap
  const modelWidth = box.max.x - box.min.x;
  const capGeo = new THREE.CircleGeometry(modelWidth * 0.1, 24);
  capGeo.rotateX(-Math.PI / 2);
  const capMesh = new THREE.Mesh(capGeo, mat.clone());
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  capMesh.position.set(cx, neckCutY, cz);
  group.add(capMesh);

  // Portrait head — 3D sphere with face mapped
  const portrait = await createPortraitHead(faceImageUrl, style, modelWidth);
  portrait.position.set(cx, neckCutY + modelWidth * 0.11 * 0.85, cz);
  group.add(portrait);

  return group;
}

// ════════════════════════════════════════════
// PROCEDURAL BUST GENERATORS
// ════════════════════════════════════════════

/** Generate a distinctly male procedural bust — broad shoulders, strong jaw, short hair */
function generateMaleBust(style: BustStyle, mat: THREE.MeshPhysicalMaterial): THREE.Group {
  const group = new THREE.Group();
  group.name = "MaleBust";

  // Broad-shouldered torso
  const torsoRaw: [number, number][] = [
    [0.00, 0.00], [0.28, 0.00], [0.30, 0.02], [0.29, 0.08],
    [0.27, 0.14], [0.22, 0.18], [0.13, 0.22], [0.10, 0.30],
    [0.09, 0.36], [0.00, 0.38],
  ];
  const torsoPts = new THREE.SplineCurve(torsoRaw.map(([r, h]) => new THREE.Vector2(r, h))).getPoints(30);
  const torsoMesh = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 32), mat);
  torsoMesh.castShadow = true;
  group.add(torsoMesh);

  // Strong neck
  const neckGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.08, 16);
  const neck = new THREE.Mesh(neckGeo, mat.clone());
  neck.position.y = 0.41;
  neck.castShadow = true;
  group.add(neck);

  // Head — slightly squared (wider)
  const headGeo = new THREE.SphereGeometry(0.09, 24, 18);
  headGeo.scale(1.0, 1.05, 0.95);
  const head = new THREE.Mesh(headGeo, mat.clone());
  head.position.y = 0.52;
  head.castShadow = true;
  group.add(head);

  // Short hair cap — flattened sphere on top
  const hairGeo = new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const hairMat = mat.clone();
  hairMat.color.multiplyScalar(0.92);
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.y = 0.545;
  hair.scale.set(1.02, 0.4, 1.0);
  group.add(hair);

  return group;
}

/** Generate a classical female bust — graceful proportions, draped toga, upswept hair */
function generateFemaleBust(style: BustStyle, mat: THREE.MeshPhysicalMaterial): THREE.Group {
  const group = new THREE.Group();
  group.name = "FemaleBust";

  // ── Torso — graceful feminine silhouette via lathe profile ──
  // Profile: starts at base, curves out for shoulders, narrows at chest, to neckline
  const torsoProfile: [number, number][] = [
    [0.00, 0.00], [0.24, 0.00], [0.26, 0.02], [0.27, 0.05],
    [0.26, 0.08], [0.24, 0.12], [0.22, 0.15],
    [0.18, 0.20], [0.15, 0.24], [0.14, 0.27],
    [0.13, 0.30], [0.10, 0.33], [0.07, 0.36], [0.00, 0.38],
  ];
  const torsoCurve = new THREE.SplineCurve(
    torsoProfile.map(([r, h]) => new THREE.Vector2(r, h))
  ).getPoints(40);
  const torsoGeo = new THREE.LatheGeometry(torsoCurve, 32);
  const torsoMesh = new THREE.Mesh(torsoGeo, mat);
  torsoMesh.castShadow = true;
  group.add(torsoMesh);

  // ── Draped toga — overlapping curved surfaces wrapping around torso ──
  const drapeMat = mat.clone();
  drapeMat.color.multiplyScalar(0.94);

  // Main drape fold across chest (curved surface using lathe)
  const drapeProfile: [number, number][] = [
    [0.00, 0.18], [0.12, 0.19], [0.16, 0.21], [0.18, 0.24],
    [0.15, 0.28], [0.10, 0.31], [0.00, 0.33],
  ];
  const drapeCurve = new THREE.SplineCurve(
    drapeProfile.map(([r, h]) => new THREE.Vector2(r, h))
  ).getPoints(20);
  // Partial lathe — only the front half (toga doesn't wrap all the way around)
  const drapeGeo = new THREE.LatheGeometry(drapeCurve, 16, 0, Math.PI * 1.3);
  const drapeMesh = new THREE.Mesh(drapeGeo, drapeMat);
  drapeMesh.scale.set(1.02, 1.0, 1.02);
  drapeMesh.rotation.y = -Math.PI * 0.15; // offset slightly
  drapeMesh.castShadow = true;
  group.add(drapeMesh);

  // Shoulder drape — a second layer draped from one shoulder
  const shoulderDrapeGeo = new THREE.LatheGeometry(drapeCurve, 12, 0, Math.PI * 0.6);
  const shoulderDrape = new THREE.Mesh(shoulderDrapeGeo, drapeMat);
  shoulderDrape.scale.set(1.04, 1.02, 1.04);
  shoulderDrape.rotation.y = Math.PI * 0.6;
  group.add(shoulderDrape);

  // ── Elegant neck — slender, slightly longer than male ──
  const neckGeo = new THREE.CylinderGeometry(0.042, 0.055, 0.09, 16);
  const neck = new THREE.Mesh(neckGeo, mat.clone());
  neck.position.y = 0.42;
  neck.castShadow = true;
  group.add(neck);

  // ── Head — softer, rounder proportions ──
  const headGeo = new THREE.SphereGeometry(0.08, 24, 20);
  headGeo.scale(0.95, 1.05, 0.93); // elegant oval
  const head = new THREE.Mesh(headGeo, mat.clone());
  head.position.y = 0.52;
  head.castShadow = true;
  group.add(head);

  // ── Classical upswept hairstyle ──
  const hairMat = mat.clone();
  hairMat.color.multiplyScalar(0.88);

  // Main hair volume — covers top and back of head like a classical coiffure
  const hairProfile: [number, number][] = [
    [0.00, 0.00], [0.085, 0.00], [0.09, 0.03], [0.088, 0.06],
    [0.082, 0.09], [0.06, 0.11], [0.00, 0.12],
  ];
  const hairCurve = new THREE.SplineCurve(
    hairProfile.map(([r, h]) => new THREE.Vector2(r, h))
  ).getPoints(16);
  const hairGeo = new THREE.LatheGeometry(hairCurve, 20);
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.set(0, 0.52, -0.01);
  hairMesh.castShadow = true;
  group.add(hairMesh);

  // Bun / chignon at the back-top
  const bunGeo = new THREE.SphereGeometry(0.045, 14, 10);
  const bun = new THREE.Mesh(bunGeo, hairMat);
  bun.position.set(0, 0.59, -0.035);
  bun.scale.set(1.0, 0.8, 0.9);
  bun.castShadow = true;
  group.add(bun);

  // Side waves framing the face — smooth capsules
  for (const side of [-1, 1]) {
    const waveGeo = new THREE.CapsuleGeometry(0.016, 0.05, 4, 8);
    const wave = new THREE.Mesh(waveGeo, hairMat);
    wave.position.set(side * 0.058, 0.50, 0.025);
    wave.rotation.z = side * 0.2;
    group.add(wave);
  }

  // ── Base trim / socle ring ──
  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.015, 6, 24),
    drapeMat
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.01;
  group.add(baseRing);

  return group;
}

/** Add a portrait disc to a procedural bust (clip head, add photo disc) */
async function addPortraitToProceduralBust(
  bust: THREE.Group,
  faceImageUrl: string,
  style: BustStyle,
  mat: THREE.MeshPhysicalMaterial,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "CompositeBust";

  // Find and remove head-related meshes (above neck level ~0.42)
  const toRemove: THREE.Object3D[] = [];
  bust.children.forEach(child => {
    if (child.position.y > 0.42) toRemove.push(child);
  });
  toRemove.forEach(child => bust.remove(child));
  group.add(bust);

  // Add portrait head — 3D sphere at neck height
  const portrait = await createPortraitHead(faceImageUrl, style, 0.55);
  portrait.position.set(0, 0.42 + 0.055 * 0.85, 0);
  group.add(portrait);

  return group;
}

// ════════════════════════════════════════════
// PORTRAIT HEAD — 3D SPHERE WITH FACE MAPPED
// ════════════════════════════════════════════

/**
 * Create a 3D portrait head: a head-shaped sphere with the face photo
 * mapped on the front and marble/bronze on the back.
 * Sits naturally on the bust neck.
 */
async function createPortraitHead(
  imageUrl: string,
  style: BustStyle,
  modelWidth: number,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "PortraitHead";
  const headRadius = modelWidth * 0.11;

  // Load and create the wrapped head texture
  const img = await loadImage(imageUrl);
  const headTexture = createHeadTexture(img, style);

  const baseMat = style === "renaissance"
    ? createBronzePhysicalMaterial()
    : createMarblePhysicalMaterial();

  // Head sphere — slightly taller than wide (natural head proportions)
  const headGeo = new THREE.SphereGeometry(headRadius, 32, 24);
  headGeo.scale(1.0, 1.15, 0.95); // taller, slightly flatter front-back

  const headMat = new THREE.MeshPhysicalMaterial({
    map: headTexture,
    roughness: baseMat.roughness * 1.1,
    metalness: baseMat.metalness,
    clearcoat: 0.15,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.6,
  });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.castShadow = true;
  group.add(headMesh);

  // Thin neck cylinder connecting to torso
  const neckR = headRadius * 0.45;
  const neckH = headRadius * 0.3;
  const neckGeo = new THREE.CylinderGeometry(neckR, neckR * 1.15, neckH, 16);
  const neckMesh = new THREE.Mesh(neckGeo, baseMat.clone());
  neckMesh.position.y = -headRadius * 1.0;
  neckMesh.castShadow = true;
  group.add(neckMesh);

  return group;
}

/**
 * Create an equirectangular-style texture for a sphere head:
 * face photo centered on front, marble/bronze color wrapping around sides and back.
 */
function createHeadTexture(
  faceImage: HTMLImageElement,
  style: BustStyle,
): THREE.CanvasTexture {
  // 2:1 aspect for sphere UV mapping
  const w = 1024, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Fill with base material color (marble cream or bronze)
  const baseColor = style === "roman" ? "#E8E0D4" : "#6A5840";
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  // Add subtle texture noise to base
  const imgData = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 10;
    imgData.data[i] += noise;
    imgData.data[i + 1] += noise;
    imgData.data[i + 2] += noise;
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw the face photo in the center region (front of sphere)
  // UV center (0.5, 0.5) = front of sphere
  const faceW = w * 0.45; // covers ~45% of width (front ~160°)
  const faceH = h * 0.75; // covers most of vertical
  const faceX = (w - faceW) / 2;
  const faceY = (h - faceH) / 2;

  ctx.save();
  // Soft elliptical clip for face region
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, faceW / 2, faceH / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  // Draw face image covering the clip area
  const imgAspect = faceImage.width / faceImage.height;
  let drawW = faceW;
  let drawH = drawW / imgAspect;
  if (drawH < faceH) {
    drawH = faceH;
    drawW = drawH * imgAspect;
  }
  ctx.drawImage(faceImage, faceX + (faceW - drawW) / 2, faceY + (faceH - drawH) / 2, drawW, drawH);
  ctx.restore();

  // Desaturate face region partially for marble/bronze look
  const faceData = ctx.getImageData(0, 0, w, h);
  const data = faceData.data;
  const desatAmount = style === "roman" ? 0.65 : 0.55;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i] + (gray - data[i]) * desatAmount;
    data[i + 1] = data[i + 1] + (gray - data[i + 1]) * desatAmount;
    data[i + 2] = data[i + 2] + (gray - data[i + 2]) * desatAmount;
  }
  ctx.putImageData(faceData, 0, 0);

  // Material tint overlay
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = style === "roman" ? "#F5EDE0" : "#8A7050";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  // Soft elliptical vignette — blend edges to base color
  const gradient = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(faceW, faceH) * 0.3,
    w / 2, h / 2, Math.max(faceW, faceH) * 0.55
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.5, "rgba(0,0,0,0)");
  gradient.addColorStop(1, style === "roman" ? "rgba(232,224,212,0.9)" : "rgba(106,88,64,0.9)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

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

/** Legacy fallback — delegates to gender-specific generators */
function generateFallbackBust(style: BustStyle, gender: BustGender = "male"): THREE.Group {
  const mat = style === "renaissance"
    ? createBronzePhysicalMaterial()
    : createMarblePhysicalMaterial();
  return gender === "female" ? generateFemaleBust(style, mat) : generateMaleBust(style, mat);
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
 * Detect and crop the face from an image.
 * Uses the browser FaceDetector API (Chrome/Edge) for detection,
 * with a center-crop fallback for other browsers.
 *
 * Returns a data URL of the cropped face image (square, 512x512).
 */
export async function detectAndCropFace(
  img: HTMLImageElement,
): Promise<{
  croppedUrl: string;
  detected: boolean;
  message: string;
}> {
  const outputSize = 512;
  let faceBox: { x: number; y: number; width: number; height: number } | null = null;

  // Try browser FaceDetector API (Chrome/Edge)
  if ("FaceDetector" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).FaceDetector();
      const faces = await detector.detect(img);
      if (faces.length === 1) {
        faceBox = faces[0].boundingBox;
      } else if (faces.length > 1) {
        // Pick the largest face
        let largest = faces[0];
        for (const f of faces) {
          if (f.boundingBox.width * f.boundingBox.height > largest.boundingBox.width * largest.boundingBox.height) {
            largest = f;
          }
        }
        faceBox = largest.boundingBox;
      }
    } catch {
      // FaceDetector failed silently
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  if (faceBox) {
    // Face detected — crop around it with margin for head + neck
    const cx = faceBox.x + faceBox.width / 2;
    const cy = faceBox.y + faceBox.height / 2;
    // Expand to include forehead + chin + some neck. The face box usually
    // covers brow to chin, so add ~40% above and ~60% below.
    const headSize = Math.max(faceBox.width, faceBox.height) * 2.0;
    const cropSize = Math.min(headSize, Math.min(img.width, img.height));
    const halfCrop = cropSize / 2;

    // Clamp to image bounds
    let sx = Math.max(0, cx - halfCrop);
    let sy = Math.max(0, cy - halfCrop * 0.7); // shift up to show more forehead
    if (sx + cropSize > img.width) sx = img.width - cropSize;
    if (sy + cropSize > img.height) sy = img.height - cropSize;
    sx = Math.max(0, sx);
    sy = Math.max(0, sy);
    const actualCrop = Math.min(cropSize, img.width - sx, img.height - sy);

    ctx.drawImage(img, sx, sy, actualCrop, actualCrop, 0, 0, outputSize, outputSize);

    return {
      croppedUrl: canvas.toDataURL("image/jpeg", 0.9),
      detected: true,
      message: "Face detected and calibrated!",
    };
  }

  // No FaceDetector or no face found — center-crop as portrait
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = Math.max(0, (img.height - minDim) / 2 - img.height * 0.1); // shift up slightly
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, outputSize, outputSize);

  // Check basic quality
  if (img.width < 100 || img.height < 100) {
    return {
      croppedUrl: canvas.toDataURL("image/jpeg", 0.9),
      detected: false,
      message: "Image is too small. Please use a higher resolution photo.",
    };
  }

  return {
    croppedUrl: canvas.toDataURL("image/jpeg", 0.9),
    detected: false,
    message: "Could not auto-detect face. The photo will be center-cropped. For best results, use a clear portrait photo.",
  };
}

/** Legacy validation wrapper */
export async function validateFacePhoto(
  img: HTMLImageElement
): Promise<{ valid: boolean; message?: string }> {
  const result = await detectAndCropFace(img);
  return { valid: result.detected, message: result.detected ? undefined : result.message };
}
