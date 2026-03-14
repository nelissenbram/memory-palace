import * as THREE from "three";
import type { Mem } from "@/lib/constants/defaults";

export function paintTex(m: Mem | { hue?: number; s?: number; l?: number; title: string; dataUrl?: string | null }) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 384;
  const ctx = c.getContext("2d")!, w = 512, h = 384;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const baseHue = m.hue || 200, baseS = m.s || 30, baseL = m.l || 65;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${baseHue},${baseS}%,${baseL}%)`);
  g.addColorStop(1, `hsl(${baseHue + 20},${baseS - 8}%,${baseL - 8}%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 20; i++) {
    ctx.save(); ctx.translate(Math.random() * w, Math.random() * h);
    ctx.fillStyle = `hsla(${baseHue + Math.random() * 20},${baseS + 10}%,${baseL + Math.random() * 12}%,0.05)`;
    ctx.fillRect(-40, -3, 80 + Math.random() * 60, 5); ctx.restore();
  }
  const v = ctx.createRadialGradient(w / 2, h / 2, h * .25, w / 2, h / 2, h * .75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 4;
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "500 20px Georgia,serif";
  ctx.fillText(m.title, w / 2, h / 2 + 4);
  if (m.dataUrl) {
    const img = new Image();
    if (m.dataUrl.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      const iw = img.width, ih = img.height, scale = Math.max(w / iw, h / ih);
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      const v2 = ctx.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, h * .8);
      v2.addColorStop(0, "rgba(0,0,0,0)"); v2.addColorStop(1, "rgba(0,0,0,0.06)");
      ctx.fillStyle = v2; ctx.fillRect(0, 0, w, h);
      tex.needsUpdate = true;
    };
    img.onerror = () => { tex.needsUpdate = true; };
    img.src = m.dataUrl;
  }
  return tex;
}
