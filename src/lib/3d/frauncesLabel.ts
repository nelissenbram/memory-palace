import * as THREE from "three";
import { PLASTER, INK, GOLD } from "./canon";

/**
 * WS4-4 — the Fraunces lintel plaque: ink on cream with a hairline gold rule.
 * Unlit (MeshBasicMaterial) so the label is always readable regardless of the
 * scene's light rig, honoring the plaque tier of the brightness dogma without
 * competing with the photos. First paint may fall back to Georgia; the canvas
 * redraws once the Fraunces webfont finishes loading.
 */
export function makeFrauncesLabel(
  text: string,
  opts: { width?: number; height?: number } = {}
): THREE.Object3D {
  const width = opts.width ?? 2.6;
  const height = opts.height ?? 0.5;
  const cw = Math.min(1024, Math.max(256, Math.round(width * 220)));
  const ch = Math.max(64, Math.round(cw * (height / width)));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const draw = () => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = PLASTER;
    ctx.fillRect(0, 0, cw, ch);
    const inset = Math.max(3, ch * 0.07);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1.5, ch * 0.02);
    ctx.strokeRect(inset, inset, cw - inset * 2, ch - inset * 2);
    ctx.fillStyle = INK;
    ctx.font = `500 ${Math.round(ch * 0.4)}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(ch * 0.06)}px`;
    } catch {
      // letterSpacing unsupported — plain tracking is fine
    }
    ctx.fillText(text, cw / 2, ch / 2 + ch * 0.02, cw - inset * 4);
    tex.needsUpdate = true;
  };
  draw();
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex })
  );
}
