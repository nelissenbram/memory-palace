import * as THREE from "three";
import { INK } from "./canon";

/**
 * WS4-4 — the Fraunces lintel plaque: ink on cream with a hairline gold rule.
 * Unlit (MeshBasicMaterial) so the label is always readable regardless of the
 * scene's light rig, honoring the plaque tier of the brightness dogma without
 * competing with the photos. First paint may fall back to Georgia; the canvas
 * redraws once the Fraunces webfont finishes loading.
 */
export function makeFrauncesLabel(
  text: string,
  opts: { width?: number; height?: number; gilded?: boolean } = {}
): THREE.Object3D {
  const width = opts.width ?? 2.6;
  const height = opts.height ?? 0.5;
  // Owner feedback 2026-08-06: door plaques read soft — the old canvas labels
  // rendered at 1024px wide, 220px/unit gave a 2.6m plaque only ~572px. Render
  // at 420px/unit (2048 cap) with full anisotropy so the type stays crisp at
  // grazing angles.
  const cw = Math.min(2048, Math.max(512, Math.round(width * 420)));
  const ch = Math.max(96, Math.round(cw * (height / width)));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // Owner feedback 2026-08-06 round 2: the framed cream plate read as a
  // license plate. No plate, no border — the letters sit directly on the
  // architecture like carved museum lettering: transparent canvas, ink
  // Fraunces capitals with a hairline light-top/dark-bottom emboss so the
  // type reads incised in the surface.
  const draw = () => {
    ctx.clearRect(0, 0, cw, ch);
    const size = Math.round(ch * 0.52);
    ctx.font = `${opts.gilded ? 600 : 500} ${size}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(ch * 0.09)}px`;
    } catch {
      // letterSpacing unsupported — plain tracking is fine
    }
    const cx = cw / 2, cy = ch / 2 + ch * 0.02, maxW = cw * 0.94;
    const hair = Math.max(1, Math.round(ch * 0.012));
    if (opts.gilded) {
      // W3 hall (owner: labels unreadable): carved-and-GILDED Roman
      // inscription — deep incision shadow, then a vertical gold-leaf
      // gradient fill with a warm bright core. Still no plate.
      const deep = Math.max(2, Math.round(ch * 0.03));
      ctx.fillStyle = "rgba(20,14,8,0.85)";
      ctx.fillText(text, cx, cy + deep, maxW);
      ctx.fillStyle = "rgba(255,250,238,0.5)";
      ctx.fillText(text, cx, cy - hair, maxW);
      const gold = ctx.createLinearGradient(0, cy - ch * 0.3, 0, cy + ch * 0.3);
      gold.addColorStop(0, "#8A6A26");
      gold.addColorStop(0.45, "#F0D488");
      gold.addColorStop(0.55, "#E4C468");
      gold.addColorStop(1, "#7E5E20");
      ctx.fillStyle = gold;
      ctx.fillText(text, cx, cy, maxW);
    } else {
      // incision shadow above-light / below-dark
      ctx.fillStyle = "rgba(255,252,244,0.55)";
      ctx.fillText(text, cx, cy - hair, maxW);
      ctx.fillStyle = "rgba(24,20,16,0.45)";
      ctx.fillText(text, cx, cy + hair, maxW);
      ctx.fillStyle = INK;
      ctx.fillText(text, cx, cy, maxW);
    }
    tex.needsUpdate = true;
  };
  draw();
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
}
