import * as THREE from "three";
import type { Mem } from "@/lib/constants/defaults";
import { getQuality } from "./mobilePerf";

// ── WS7-1 QUARTER-CROP FIX ──
// The painting canvases are sized from Q.paintingResWidth/Height (512×384 desktop,
// 256×192 mobile, 128×96 potato) but every draw call below composes in a fixed
// 512×384 logical space. Before this fix the logical space was NOT mapped onto the
// actual canvas, so on mobile/potato only the top-left quarter (or sixteenth) of
// every photo was visible and titles drew off-canvas. One ctx.scale() maps the
// full 512×384 composition onto whatever the tier's real canvas size is.
const LOGICAL_W = 512, LOGICAL_H = 384;
function scaleToTier(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
  ctx.scale(c.width / LOGICAL_W, c.height / LOGICAL_H);
}

/**
 * Dev-only regression check (WS7-1/WS6-1): warn when a texture's aspect and the
 * plane it is mapped onto diverge by more than 2% — the visible symptom of the
 * quarter-crop/stretch class of bugs. No-op in production builds.
 */
export function devCheckArtworkAspect(
  tex: THREE.Texture,
  planeW: number,
  planeH: number,
  label = "artwork"
): void {
  if (process.env.NODE_ENV === "production") return;
  const img: any = tex.image;
  const tw = img?.width, th = img?.height;
  if (!tw || !th || !planeW || !planeH) return;
  const texAspect = tw / th;
  const planeAspect = planeW / planeH;
  const divergence = Math.abs(texAspect / planeAspect - 1);
  if (divergence > 0.02) {
    console.warn(
      `[3d-aspect] ${label}: texture aspect ${texAspect.toFixed(3)} (${tw}x${th}) vs plane aspect ${planeAspect.toFixed(3)} (${planeW}x${planeH}) diverge ${(divergence * 100).toFixed(1)}% (>2%)`
    );
  }
}

// ── Shared image FETCH (owner 2026-08-20, "media heel traag") ──
// Every painting canvas used to fire its OWN fetch of the FULL-RES original —
// and a memory shown on two units (hero + photo-book, screen fill, …) or a
// quick scene rebuild fetched the same URL again. One module-level in-flight
// promise per URL means each source crosses the NETWORK exactly once per
// session, shared by every consumer.
//
// REGRESSION FIX (2026-08-20): the first version of this cache stored a
// Promise<HTMLImageElement> whose blob object-URL was revoked inside onload,
// BEFORE any consumer had drawn it. An HTMLImageElement is lazily decoded: a
// later drawImage() on a canvas can need the (already revoked) source again —
// on prod every painting canvas stayed on its placeholder gradient forever
// while the network tab showed the originals arriving 200 OK, and any consumer
// registering after a failure inherited the poisoned rejection with no retry.
// The cache now stores the raw Blob (cheap, still one fetch per URL); EVERY
// consumer decodes its own Image from a fresh object URL and revokes it only
// AFTER its own draw — the exact per-consumer sequence that shipped before the
// cache existed — so multiple consumers of one URL each repaint their canvas.
const _blobCache = new Map<string, Promise<Blob>>();
const BLOB_CACHE_MAX = 200; // FIFO cap — thumbnails are small, keep it simple
function fetchBlobShared(streamUrl: string): Promise<Blob> {
  const hit = _blobCache.get(streamUrl);
  if (hit) return hit;
  const p = fetch(streamUrl, { credentials: "same-origin" })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); });
  p.catch(() => _blobCache.delete(streamUrl)); // a failed load may retry later
  if (_blobCache.size >= BLOB_CACHE_MAX) {
    const oldest = _blobCache.keys().next().value;
    if (oldest !== undefined) _blobCache.delete(oldest);
  }
  _blobCache.set(streamUrl, p);
  return p;
}

/** `?stream=1` keeps /api/media same-origin (a cross-origin redirect would taint the canvas and block WebGL). */
function toStreamUrl(u: string): string {
  return u.startsWith("/api/media/") ? u + (u.includes("?") ? "&" : "?") + "stream=1" : u;
}

/** The smallest sufficient source for a ≤512px painting canvas: the memory's
 *  thumbnail when it has one (full-screen viewers keep using dataUrl at full
 *  resolution), else the original. data:video posters are never paintable. */
function paintingSrc(m: { dataUrl?: string | null; thumbnailUrl?: string | null }): string | null {
  const thumb = (m as { thumbnailUrl?: string | null }).thumbnailUrl;
  if (typeof thumb === "string" && thumb && !thumb.startsWith("data:video")) return thumb;
  return m.dataUrl || null;
}

function isMemLocked(m: Mem | { hue?: number; s?: number; l?: number; title: string; dataUrl?: string | null; revealDate?: string }): boolean {
  if (!('revealDate' in m) || !m.revealDate) return false;
  const todayStr = new Date().toISOString().split("T")[0];
  return m.revealDate > todayStr;
}

function paintLockedTex(m: Mem | { hue?: number; s?: number; l?: number; title: string; dataUrl?: string | null; revealDate?: string }) {
  const Q = getQuality();
  const c = document.createElement("canvas"); c.width = Q.paintingResWidth; c.height = Q.paintingResHeight;
  const ctx = c.getContext("2d")!, w = LOGICAL_W, h = LOGICAL_H;
  scaleToTier(ctx, c); // full composition on every tier (quarter-crop fix)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.aspect = c.width / c.height; // canvas aspect (4:3) until a photo loads
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
  ctx.font = "500 18px Fraunces,Georgia,serif";
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
  const ctx = c.getContext("2d")!, w = LOGICAL_W, h = LOGICAL_H;
  scaleToTier(ctx, c); // full composition on every tier (quarter-crop fix)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.aspect = c.width / c.height; // canvas aspect (4:3) until a photo loads
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
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "500 20px Fraunces,Georgia,serif";
  ctx.fillText(m.title, w / 2, h / 2 + 4);
  tex.needsUpdate = true;

  // Owner 2026-08-20: paint from the THUMBNAIL when the memory has one — the
  // painting canvas is at most 512×384, so streaming the full-res original was
  // pure waste (the fullscreen RoomMediaPlayer keeps the original).
  const src = paintingSrc(m as { dataUrl?: string | null; thumbnailUrl?: string | null });
  if (src) {
    const drawImg = (img: HTMLImageElement) => {
      ctx.clearRect(0, 0, w, h);
      const iw = img.width, ih = img.height, scale = Math.max(w / iw, h / ih);
      // Record the photo's natural aspect so consumers (makeArtwork, salon-hang)
      // can size planes aspect-correct instead of stretching the 4:3 canvas.
      tex.userData.aspect = iw / ih;
      tex.userData.naturalWidth = iw;
      tex.userData.naturalHeight = ih;
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      const v2 = ctx.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, h * .8);
      v2.addColorStop(0, "rgba(0,0,0,0)"); v2.addColorStop(1, "rgba(0,0,0,0.06)");
      ctx.fillStyle = v2; ctx.fillRect(0, 0, w, h);
      tex.needsUpdate = true;
    };
    // Per-consumer decode + draw. The blob is fetched once per URL (shared
    // cache); THIS canvas gets its own Image and repaints in onload — the
    // object URL is revoked only after the draw, never before.
    const loadAndDraw = (url: string, onFail?: () => void) => {
      fetchBlobShared(toStreamUrl(url))
        .then(blob => {
          if (signal?.aborted) return;
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            try { if (!signal?.aborted) drawImg(img); } finally { URL.revokeObjectURL(objUrl); }
          };
          img.onerror = () => { URL.revokeObjectURL(objUrl); onFail?.(); };
          img.src = objUrl;
        })
        .catch(() => { onFail?.(); });
    };
    // Data URIs and blob URLs: load directly (fetch+blob would taint or fail)
    if (src.startsWith("data:") || src.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => drawImg(img);
      img.src = src;
    } else {
      // Thumbnails stay preferred (src) — but a broken/missing thumbnail must
      // not leave the placeholder up forever: fall back to the original once.
      const orig = m.dataUrl;
      const canFallback = !!orig && orig !== src && !orig.startsWith("blob:");
      loadAndDraw(src, canFallback
        ? () => {
            if (orig!.startsWith("data:")) {
              const img = new Image();
              img.onload = () => { if (!signal?.aborted) drawImg(img); };
              img.src = orig!;
            } else loadAndDraw(orig!);
          }
        : undefined);
    }
  }
  return tex;
}
