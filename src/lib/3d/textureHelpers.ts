import * as THREE from "three";
import type { Mem } from "@/lib/constants/defaults";
import { getQuality } from "./mobilePerf";

function isMemLocked(m: Mem | { hue?: number; s?: number; l?: number; title: string; dataUrl?: string | null; revealDate?: string }): boolean {
  if (!('revealDate' in m) || !m.revealDate) return false;
  const todayStr = new Date().toISOString().split("T")[0];
  return m.revealDate > todayStr;
}

function paintLockedTex(m: Mem | { hue?: number; s?: number; l?: number; title: string; dataUrl?: string | null; revealDate?: string }) {
  const Q = getQuality();
  const c = document.createElement("canvas"); c.width = Q.paintingResWidth; c.height = Q.paintingResHeight;
  const ctx = c.getContext("2d")!, w = 512, h = 384;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const baseHue = m.hue || 200;
  // Dark mysterious background
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${baseHue},15%,18%)`);
  g.addColorStop(1, `hsl(${baseHue + 20},12%,12%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // Subtle glow in center
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * .6);
  glow.addColorStop(0, `hsla(${baseHue},30%,45%,0.15)`);
  glow.addColorStop(0.5, `hsla(${baseHue},20%,30%,0.06)`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  // Lock icon
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "72px serif";
  ctx.fillStyle = "rgba(255,220,150,0.5)";
  ctx.fillText("\u{1F512}", w / 2, h / 2 - 20);
  // Obscured title
  ctx.font = "500 18px Georgia,serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 6;
  const obscured = m.title.replace(/[a-zA-Z0-9]/g, "\u{2022}");
  ctx.fillText(obscured, w / 2, h / 2 + 50);
  // Shimmer particles
  for (let i = 0; i < 12; i++) {
    const px = w * 0.2 + Math.random() * w * 0.6;
    const py = h * 0.15 + Math.random() * h * 0.7;
    const r = 1 + Math.random() * 2;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(40,60%,75%,${0.1 + Math.random() * 0.2})`;
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    ctx.fill();
  }
  return tex;
}

export function paintTex(m: Mem | { hue?: number; s?: number; l?: number; title: string; dataUrl?: string | null; revealDate?: string }, signal?: AbortSignal) {
  // If this is a locked time capsule, render the locked appearance
  if (isMemLocked(m)) return paintLockedTex(m);

  const Q = getQuality();
  const c = document.createElement("canvas"); c.width = Q.paintingResWidth; c.height = Q.paintingResHeight;
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
  tex.needsUpdate = true;

  if (m.dataUrl) {
    const drawImg = (img: HTMLImageElement) => {
      ctx.clearRect(0, 0, w, h);
      const iw = img.width, ih = img.height, scale = Math.max(w / iw, h / ih);
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      const v2 = ctx.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, h * .8);
      v2.addColorStop(0, "rgba(0,0,0,0)"); v2.addColorStop(1, "rgba(0,0,0,0.06)");
      ctx.fillStyle = v2; ctx.fillRect(0, 0, w, h);
      tex.needsUpdate = true;
    };
    // Data URIs and blob URLs: load directly (fetch+blob would taint or fail)
    if (m.dataUrl.startsWith("data:") || m.dataUrl.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => drawImg(img);
      img.src = m.dataUrl;
    } else {
      // Fetch as blob via ?stream=1 to avoid cross-origin redirect (tainted canvas blocks WebGL)
      const streamUrl = m.dataUrl.startsWith("/api/media/")
        ? m.dataUrl + (m.dataUrl.includes("?") ? "&" : "?") + "stream=1"
        : m.dataUrl;
      fetch(streamUrl, { credentials: "same-origin", signal })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
        .then(blob => {
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => { drawImg(img); URL.revokeObjectURL(objUrl); };
          img.onerror = () => URL.revokeObjectURL(objUrl);
          img.src = objUrl;
        })
        .catch(() => {});
    }
  }
  return tex;
}
