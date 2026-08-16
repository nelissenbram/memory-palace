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
  /** OPT-IN (corridor W3C, F15): recess the photo and add a raised inner
   *  molding lip that overhangs the photo edge → a real rabbet + shadow gap.
   *  Off by default so every existing caller (hall, interior) is unchanged. */
  rabbet?: boolean;
  /** OPT-IN (corridor W3C, F16): a brass gallery picture-light — a bracket
   *  arm over the frame with a shade tube, plus a BAKED warm down-wash on the
   *  top of the canvas (no dynamic light — canon ≤4). Off by default. */
  pictureLight?: boolean;
  /** OPT-IN (corridor W3C): a refined dark-walnut moulding with a thin gilt
   *  inner slip, instead of the solid-gold slab (owner: gold border too tacky).
   *  Off by default so hall/interior keep the canon gold frame. */
  refinedFrame?: boolean;
  /** OPT-IN (corridor W3C): a real museum plaque — an ivory/brass plate under
   *  the frame with engraved title+year, instead of floating wall lettering. */
  plaquePlate?: boolean;
}

export interface Artwork {
  group: THREE.Group;
  dispose(): void;
  setTexture(t: THREE.Texture): void;
}

// Shared, never-disposed materials — one gold frame + one liner shader program
// across every artwork in every scene.
let frameMat: THREE.MeshStandardMaterial | null = null;
let walnutFrameMat: THREE.MeshStandardMaterial | null = null;
let linerMat: THREE.MeshStandardMaterial | null = null;
let lampGlowMat: THREE.MeshBasicMaterial | null = null;
const glowMats: Partial<Record<"low" | "med" | "high", THREE.MeshBasicMaterial>> = {};

const GLOW_RES = { low: 64, med: 128, high: 256 } as const;
const PLAQUE_PX = { low: 120, med: 180, high: 240 } as const;

function getFrameMat() {
  if (!frameMat) frameMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.6 });
  return frameMat;
}

// Refined moulding — a dark walnut with a soft satin sheen, so the corridor
// frames read as fine-art frames (dark wood + a thin bronze slip) rather than a
// solid gold slab. Module-cached, shared across every corridor piece.
function getWalnutFrameMat() {
  if (!walnutFrameMat) walnutFrameMat = new THREE.MeshStandardMaterial({ color: "#3A2A1C", roughness: 0.5, metalness: 0.15 });
  return walnutFrameMat;
}

// Muted antique-bronze slip — owner round 2 wanted the gilt accents toned down;
// this replaces the bright gold slip/plaque-backing on refined (corridor) pieces.
let refinedSlipMat: THREE.MeshStandardMaterial | null = null;
function getRefinedSlipMat() {
  if (!refinedSlipMat) refinedSlipMat = new THREE.MeshStandardMaterial({ color: "#9E8455", roughness: 0.44, metalness: 0.5 });
  return refinedSlipMat;
}

function getLinerMat() {
  if (!linerMat) linerMat = new THREE.MeshStandardMaterial({ color: PLASTER, roughness: 0.9 });
  return linerMat;
}

// F16 picture-light down-wash — a vertical gradient (warm at the top of the
// canvas, fading to nothing) blended additive, so the lamp reads as spilling
// light onto the art without adding a dynamic light. Module-cached, never disposed.
function getLampGlowMat() {
  if (lampGlowMat) return lampGlowMat;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,224,176,0.55)");
  g.addColorStop(0.4, "rgba(255,224,176,0.16)");
  g.addColorStop(1, "rgba(255,224,176,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  lampGlowMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return lampGlowMat;
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

function makePlaqueTexture(title: string, year: string | undefined, pxPerUnit: number, planeW: number, planeH: number, plate?: boolean) {
  const cw = Math.min(512, Math.max(128, Math.round(planeW * pxPerUnit * 2)));
  const ch = Math.max(48, Math.round(cw * (planeH / planeW)));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Two treatments:
  //  - default: no plate, gallery wall lettering directly under the frame
  //    (transparent bg, ink Fraunces with a whisper of an incision shadow).
  //  - plate (corridor): a brass museum plaque — engraved dark serif on a
  //    bevelled metal plate with corner screws.
  const draw = () => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.textAlign = "center";
    const maxW = cw * (plate ? 0.86 : 0.96);
    if (plate) {
      // Owner round 2: a DARK bronze plate with ivory engraved serif (matches the
      // door nameplates the owner kept) — the bright brass plate read too tacky.
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, "#4A3B29");
      g.addColorStop(0.5, "#33281B");
      g.addColorStop(1, "#241A11");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      // faint top highlight
      ctx.fillStyle = "rgba(220,190,120,0.28)"; ctx.fillRect(0, 0, cw, Math.max(1, ch * 0.035));
      // muted bronze keyline border
      ctx.strokeStyle = "rgba(158,132,85,0.7)"; ctx.lineWidth = Math.max(1, ch * 0.022);
      ctx.strokeRect(ch * 0.09, ch * 0.09, cw - ch * 0.18, ch - ch * 0.18);
      const engrave = (s: string, y: number, font: string) => {
        ctx.font = font;
        ctx.fillStyle = "rgba(10,7,4,0.5)"; ctx.fillText(s, cw / 2, y + Math.max(1, ch * 0.02), maxW); // incision shadow
        ctx.fillStyle = "#EBDBB4"; ctx.fillText(s, cw / 2, y, maxW);                                   // ivory serif
      };
      if (year) {
        ctx.textBaseline = "alphabetic";
        engrave(title, ch * 0.5, `600 ${Math.round(ch * 0.3)}px Fraunces, Georgia, serif`);
        engrave(year, ch * 0.84, `italic 500 ${Math.round(ch * 0.21)}px Fraunces, Georgia, serif`);
      } else {
        ctx.textBaseline = "middle";
        engrave(title, ch / 2 + ch * 0.03, `600 ${Math.round(ch * 0.34)}px Fraunces, Georgia, serif`);
      }
      tex.needsUpdate = true;
      return;
    }
    const hair = Math.max(1, Math.round(ch * 0.014));
    const put = (s: string, y: number, font: string) => {
      ctx.font = font;
      ctx.fillStyle = "rgba(255,252,244,0.5)";
      ctx.fillText(s, cw / 2, y - hair, maxW);
      ctx.fillStyle = INK;
      ctx.fillText(s, cw / 2, y, maxW);
    };
    if (year) {
      ctx.textBaseline = "alphabetic";
      put(title, ch * 0.46, `500 ${Math.round(ch * 0.32)}px Fraunces, Georgia, serif`);
      put(year, ch * 0.82, `italic 400 ${Math.round(ch * 0.23)}px Fraunces, Georgia, serif`);
    } else {
      ctx.textBaseline = "middle";
      put(title, ch / 2 + ch * 0.02, `500 ${Math.round(ch * 0.36)}px Fraunces, Georgia, serif`);
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

  // Frame + plaster liner behind the photo. Canon = solid gold slab; refined
  // (corridor) = a slimmer dark-walnut moulding (gilt slip added below).
  const frameBorder = opts.refinedFrame ? 0.15 : 0.2;
  const frameDepth = opts.refinedFrame ? 0.08 : 0.06;
  const frameGeo = new THREE.BoxGeometry(w + frameBorder, h + frameBorder, frameDepth);
  const frame = new THREE.Mesh(frameGeo, opts.refinedFrame ? getWalnutFrameMat() : getFrameMat());
  frame.position.z = opts.refinedFrame ? -0.03 : -0.02;
  ownedGeos.push(frameGeo);
  group.add(frame);

  const linerGeo = new THREE.PlaneGeometry(w + 0.07, h + 0.07);
  const liner = new THREE.Mesh(linerGeo, getLinerMat());
  liner.position.z = opts.rabbet ? 0.014 : 0.016; // clear of the frame front (0.010) — no coplanar z-fight
  ownedGeos.push(linerGeo);
  group.add(liner);

  // The photo — unlit, aspect-correct, the brightest pixels on the wall.
  // F15 rabbet: the photo sits deeper so the raised lip below overhangs it.
  const photoMat = new THREE.MeshBasicMaterial({ map: opts.texture });
  const photoGeo = new THREE.PlaneGeometry(w, h);
  const photo = new THREE.Mesh(photoGeo, photoMat);
  photo.position.z = opts.rabbet ? 0.020 : 0.024; // above the liner (0.014); lip at 0.05 still overhangs
  ownedGeos.push(photoGeo);
  ownedMats.push(photoMat);
  group.add(photo);

  // F15 (opt-in): a raised molding lip around the photo opening. It sits proud
  // of the recessed photo and overhangs its edge → a genuine rabbet with a soft
  // shadow gap, instead of a photo floating flat on the wall.
  //  - refinedFrame: a SLIM gilt slip (the thin gold line an antique dark-wood
  //    frame carries at the sight edge) — restrained, not a gold slab.
  //  - plain rabbet: the original chunky gold lip.
  if (opts.rabbet) {
    const refined = opts.refinedFrame;
    const lipT = refined ? 0.022 : 0.05;   // slip width (overhang over the photo)
    const lipD = refined ? 0.03 : 0.05;    // how far it stands proud
    const lipZ = refined ? 0.045 : 0.05;   // proud of the recessed photo
    const lipMat = refined ? getRefinedSlipMat() : getFrameMat(); // muted bronze slip on refined frames
    const bars: [number, number, number, number][] = [
      [w + lipT * 2, lipT, 0, h / 2 - lipT / 2 + 0.01],   // top
      [w + lipT * 2, lipT, 0, -(h / 2 - lipT / 2 + 0.01)], // bottom
      [lipT, h - lipT, -(w / 2 - lipT / 2 + 0.01), 0],     // left
      [lipT, h - lipT, (w / 2 - lipT / 2 + 0.01), 0],      // right
    ];
    for (const [bw, bh, bx, by] of bars) {
      const g = new THREE.BoxGeometry(bw, bh, lipD);
      const m = new THREE.Mesh(g, lipMat);
      m.position.set(bx, by, lipZ - lipD / 2);
      m.castShadow = true;
      ownedGeos.push(g);
      group.add(m);
    }
  }

  // F16 (opt-in): brass gallery picture-light over the frame. A short riser off
  // the frame top, an arm reaching up-and-forward, a horizontal shade tube, and
  // a baked warm down-wash on the top of the canvas — all in the group's local
  // frame (front +Z), disposed with the artwork. No dynamic light (canon ≤4).
  if (opts.pictureLight) {
    const brass = getFrameMat();
    const topY = h / 2;
    const riserGeo = new THREE.BoxGeometry(0.05, 0.15, 0.05);
    const riser = new THREE.Mesh(riserGeo, brass);
    riser.position.set(0, topY + 0.075, 0.03);
    ownedGeos.push(riserGeo);
    group.add(riser);
    const armGeo = new THREE.BoxGeometry(0.045, 0.045, 0.36);
    const arm = new THREE.Mesh(armGeo, brass);
    arm.position.set(0, topY + 0.17, 0.2);
    arm.rotation.x = -0.55; // reach up and out over the canvas
    ownedGeos.push(armGeo);
    group.add(arm);
    const shadeLen = Math.min(w * 0.72, 1.1);
    const shadeGeo = new THREE.CylinderGeometry(0.05, 0.05, shadeLen, 12);
    const shade = new THREE.Mesh(shadeGeo, brass);
    shade.position.set(0, topY + 0.25, 0.36);
    shade.rotation.z = Math.PI / 2; // tube axis runs along the wall
    ownedGeos.push(shadeGeo);
    group.add(shade);
    // baked warm wash: a plane over the upper canvas, additive, faded downward.
    const washGeo = new THREE.PlaneGeometry(w * 1.02, h * 0.6);
    const wash = new THREE.Mesh(washGeo, getLampGlowMat());
    wash.position.set(0, topY - h * 0.3, (opts.rabbet ? 0.020 : 0.024) + 0.006);
    wash.renderOrder = 2;
    ownedGeos.push(washGeo);
    group.add(wash);
  }

  if (opts.title) {
    const plate = opts.plaquePlate;
    const plaqueW = plate ? Math.min(w * 0.6, 0.9) : Math.min(w * 0.75, 1.2);
    const plaqueH = plate ? (opts.year ? 0.2 : 0.15) : (opts.year ? 0.22 : 0.16);
    const plaqueTex = makePlaqueTexture(opts.title, opts.year, PLAQUE_PX[quality], plaqueW, plaqueH, plate);
    const plaqueY = -h / 2 - (plate ? 0.14 : 0.1) - plaqueH / 2;
    // Real museum plaque: a thin brass plate stands off the wall, the engraved
    // face sits just proud of it. Default: flat wall lettering, no plate.
    if (plate) {
      const backGeo = new THREE.BoxGeometry(plaqueW + 0.02, plaqueH + 0.02, 0.012);
      const back = new THREE.Mesh(backGeo, getRefinedSlipMat());
      back.position.set(0, plaqueY, 0.03);
      back.castShadow = true;
      ownedGeos.push(backGeo);
      group.add(back);
    }
    const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true, depthWrite: false });
    const plaqueGeo = new THREE.PlaneGeometry(plaqueW, plaqueH);
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, plaqueY, plate ? 0.037 : 0.024);
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
