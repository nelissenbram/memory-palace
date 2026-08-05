import * as THREE from "three";
import { PLASTER, INK, GOLD, GOLDEN } from "./canon";

/**
 * WS7-3 — makeArtwork(): every photo memory becomes a museum piece via ONE
 * shared factory. Aspect-correct photo plane (no more stretched 4:3 canvas),
 * canon gold frame with a plaster liner, Fraunces brass plaque (title + year),
 * and a BAKED art light — an additive warm wash behind the frame that replaces
 * the per-painting SpotLight, so art reads lit identically on every tier.
 *
 * Brightness dogma: the photo is unlit (MeshBasicMaterial → brightest pixels),
 * frame and plaque sit below it, the baked wash never exceeds the photo.
 *
 * The group's front faces +Z; callers position/rotate the group at the wall
 * spot. dispose() releases everything the artwork owns — the incoming photo
 * texture stays owned by the caller (paintTex cache), shared frame/liner/glow
 * materials are module-cached and live for the app's lifetime.
 */

export interface ArtworkOptions {
  texture: THREE.Texture;
  /** Photo aspect (w/h) — pass tex.userData.aspect from paintTex. */
  aspect: number;
  title?: string;
  year?: string;
  /** Photo plane width in metres; height follows the aspect. */
  width: number;
  quality?: "low" | "med" | "high";
}

export interface Artwork {
  group: THREE.Group;
  dispose(): void;
  setTexture(t: THREE.Texture): void;
}

// Shared, never-disposed materials — one gold frame + one liner shader program
// across every artwork in every scene.
let frameMat: THREE.MeshStandardMaterial | null = null;
let linerMat: THREE.MeshStandardMaterial | null = null;
const glowMats: Partial<Record<"low" | "med" | "high", THREE.MeshBasicMaterial>> = {};

const GLOW_RES = { low: 64, med: 128, high: 256 } as const;
const PLAQUE_PX = { low: 120, med: 180, high: 240 } as const;

function getFrameMat() {
  if (!frameMat) frameMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.6 });
  return frameMat;
}

function getLinerMat() {
  if (!linerMat) linerMat = new THREE.MeshStandardMaterial({ color: PLASTER, roughness: 0.9 });
  return linerMat;
}

function getGlowMat(quality: "low" | "med" | "high") {
  let mat = glowMats[quality];
  if (mat) return mat;
  const res = GLOW_RES[quality];
  const c = document.createElement("canvas");
  c.width = res;
  c.height = res;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res / 2);
  g.addColorStop(0, "rgba(255,216,168,0.55)");
  g.addColorStop(0.55, "rgba(255,216,168,0.18)");
  g.addColorStop(1, "rgba(255,216,168,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, res, res);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  mat = new THREE.MeshBasicMaterial({
    map: tex,
    color: GOLDEN.fillColor,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  glowMats[quality] = mat;
  return mat;
}

function makePlaqueTexture(title: string, year: string | undefined, pxPerUnit: number, planeW: number, planeH: number) {
  const cw = Math.min(512, Math.max(128, Math.round(planeW * pxPerUnit * 2)));
  const ch = Math.max(48, Math.round(cw * (planeH / planeW)));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = PLASTER;
    ctx.fillRect(0, 0, cw, ch);
    const inset = Math.max(2, ch * 0.06);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1, ch * 0.018);
    ctx.strokeRect(inset, inset, cw - inset * 2, ch - inset * 2);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    if (year) {
      ctx.textBaseline = "alphabetic";
      ctx.font = `500 ${Math.round(ch * 0.3)}px Fraunces, Georgia, serif`;
      ctx.fillText(title, cw / 2, ch * 0.48, cw - inset * 4);
      ctx.font = `italic 400 ${Math.round(ch * 0.22)}px Fraunces, Georgia, serif`;
      ctx.fillText(year, cw / 2, ch * 0.8, cw - inset * 4);
    } else {
      ctx.textBaseline = "middle";
      ctx.font = `500 ${Math.round(ch * 0.34)}px Fraunces, Georgia, serif`;
      ctx.fillText(title, cw / 2, ch / 2 + ch * 0.02, cw - inset * 4);
    }
    tex.needsUpdate = true;
  };
  draw();
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function makeArtwork(opts: ArtworkOptions): Artwork {
  const quality = opts.quality ?? "med";
  const w = opts.width;
  const h = opts.width / (opts.aspect || 4 / 3);
  const group = new THREE.Group();
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedTexs: THREE.Texture[] = [];

  // Baked art light — the warm wall wash a gallery spot would cast.
  const glowGeo = new THREE.PlaneGeometry(w * 1.9 + 0.6, h * 1.9 + 0.6);
  const glow = new THREE.Mesh(glowGeo, getGlowMat(quality));
  glow.position.z = -0.035;
  glow.renderOrder = -1;
  ownedGeos.push(glowGeo);
  group.add(glow);

  // Canon gold frame + plaster liner behind the photo.
  const frameGeo = new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.06);
  const frame = new THREE.Mesh(frameGeo, getFrameMat());
  frame.position.z = -0.02;
  ownedGeos.push(frameGeo);
  group.add(frame);

  const linerGeo = new THREE.PlaneGeometry(w + 0.07, h + 0.07);
  const liner = new THREE.Mesh(linerGeo, getLinerMat());
  liner.position.z = 0.012;
  ownedGeos.push(linerGeo);
  group.add(liner);

  // The photo — unlit, aspect-correct, the brightest pixels on the wall.
  const photoMat = new THREE.MeshBasicMaterial({ map: opts.texture });
  const photoGeo = new THREE.PlaneGeometry(w, h);
  const photo = new THREE.Mesh(photoGeo, photoMat);
  photo.position.z = 0.02;
  ownedGeos.push(photoGeo);
  ownedMats.push(photoMat);
  group.add(photo);

  if (opts.title) {
    const plaqueW = Math.min(w * 0.75, 1.2);
    const plaqueH = opts.year ? 0.22 : 0.16;
    const plaqueTex = makePlaqueTexture(opts.title, opts.year, PLAQUE_PX[quality], plaqueW, plaqueH);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex });
    const plaqueGeo = new THREE.PlaneGeometry(plaqueW, plaqueH);
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, -h / 2 - 0.1 - plaqueH / 2, 0.02);
    ownedGeos.push(plaqueGeo);
    ownedMats.push(plaqueMat);
    ownedTexs.push(plaqueTex);
    group.add(plaque);
  }

  return {
    group,
    setTexture(t: THREE.Texture) {
      photoMat.map = t;
      photoMat.needsUpdate = true;
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      for (const t of ownedTexs) t.dispose();
    },
  };
}
