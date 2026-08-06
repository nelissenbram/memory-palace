import * as THREE from "three";

/**
 * WS4-6 / WS7-7 / WS7-15 — Ancestral Wall helpers for the entrance hall
 * (MUSEO VIVO Wave 2, behind flag3d("w2_hall")).
 *
 * 1. `selectAncestralMemories` — THE auto-selection rule (owner decision 4):
 *    favorites first, then oldest; a "choose what hangs here" picker is a
 *    Wave-3 nicety, so the rule lives in one pure function that both
 *    MemoryPalace (owner route) and the visitor loaders can call.
 * 2. Procedural texture makers for WS4-8/9 (living water + oculus pool):
 *    deterministic canvas textures (zero Math.random), so the hall renders
 *    identically on every mount and nothing here costs a dynamic light —
 *    the ≤4-light budget is untouched by design.
 */

// ── WS4-6 selection (owner decision 4 + decision 7) ──

/** The slice of Mem the selection rule needs (structural, so visitor payloads fit too). */
export interface AncestralCandidate {
  id: string;
  type: string;
  dataUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string;
  /** Owner-starred flag — no Mem field carries this yet; callers may decorate. Favorites hang first. */
  favorite?: boolean;
  /** Memory visibility — public-visitor mode only hangs "public" (owner decision 7). */
  visibility?: "private" | "shared" | "family" | "public";
  /** Time capsules still sealed (revealDate in the future) never hang on the family wall. */
  revealDate?: string;
}

export interface AncestralSelectOptions {
  /** Hard cap (tier budget) — plan WS4-6 hangs 3–5 pieces; default 5. */
  max?: number;
  /**
   * Owner decision 7: public visitors see ONLY visibility === "public" photos,
   * and (WS7-15) fewer than 3 public photos → the warm cream empty state
   * (returns []), never a thin/placeholder wall.
   */
  publicOnly?: boolean;
}

/**
 * Deterministic auto-selection for the Ancestral Wall: photo memories with a
 * real image, favorites first, then oldest by createdAt (undated photos sort
 * last), capped at `max`. Pure — no store/scene imports, stable for equal input.
 */
export function selectAncestralMemories<M extends AncestralCandidate>(
  memories: readonly M[],
  opts: AncestralSelectOptions = {}
): M[] {
  const max = opts.max ?? 5;
  const today = new Date().toISOString().split("T")[0];
  const eligible = memories.filter((m) => {
    if (m.type !== "photo") return false;
    if (!m.dataUrl && !m.thumbnailUrl) return false;
    if (m.revealDate && m.revealDate > today) return false; // sealed capsule
    if (opts.publicOnly && m.visibility !== "public") return false;
    return true;
  });
  // WS7-15: a guest wall needs at least 3 public photos or shows the easel.
  if (opts.publicOnly && eligible.length < 3) return [];
  const sorted = [...eligible].sort((a, b) => {
    if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
    const da = a.createdAt || "￿"; // undated → after every dated memory
    const db = b.createdAt || "￿";
    if (da !== db) return da < db ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; // total order → deterministic
  });
  return sorted.slice(0, Math.max(0, max));
}

// ── Deterministic PRNG (no Math.random — dogma: identical hall every mount) ──

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── WS4-8: tileable water normal map (living impluvium) ──

/**
 * Small tileable normal map for the impluvium water — a sum of sine waves
 * (periodic by construction, so RepeatWrapping tiles seamlessly). The scene
 * scrolls `texture.offset` ~0.02/s in the frame loop (static on mobile);
 * no shader, no light, one texture for the app's lifetime of the mount.
 */
export function makeWaterNormalTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const TWO_PI = Math.PI * 2;
  // Periodic heightfield: integer wave counts keep every edge tileable.
  const h = (x: number, y: number) => {
    const u = (x / size) * TWO_PI, v = (y / size) * TWO_PI;
    return (
      Math.sin(u * 2 + v) * 0.5 +
      Math.sin(u * 3 - v * 2 + 1.7) * 0.3 +
      Math.sin(u - v * 3 + 4.1) * 0.25 +
      Math.sin(u * 5 + v * 4 + 2.3) * 0.12
    );
  };
  const amp = 1.35; // gentle slopes — calm museum water, not ocean chop
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * amp;
      const dy = (h(x, y + 1) - h(x, y - 1)) * amp;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((-dx * inv) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((-dy * inv) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // Normal data is linear — no SRGB conversion.
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// ── WS4-8/9: caustics web (additive decal over the water / under the oculus) ──

/**
 * Tileable warm caustic-web texture for additive decals: overlapping soft
 * rings from a seeded PRNG (deterministic). Two counter-drifting layers of
 * this one texture read as living light — zero dynamic-light cost.
 */
export function makeCausticsTexture(size = 256, seed = 7): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const rand = mulberry32(seed);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 10 + rand() * 30;
    const a = 0.05 + rand() * 0.1;
    // Draw with wrap-around copies so RepeatWrapping tiles without seams.
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(cx + ox, cy + oy, r * 0.55, cx + ox, cy + oy, r);
        g.addColorStop(0, "rgba(255,224,178,0)");
        g.addColorStop(0.72, `rgba(255,224,178,${a})`);
        g.addColorStop(0.86, `rgba(255,236,200,${a * 1.6})`);
        g.addColorStop(1, "rgba(255,224,178,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, r + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * WS4-9 oculus pool: soft radial warm gradient with a transparent core, laid
 * flat where the oculus shaft lands (the impluvium sits in the core, so the
 * decal glows on the marble rim, not as a film over the sunken water).
 * Additive, depthWrite off — a baked "pool of light", not a light.
 */
export function makeOculusPoolTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, "rgba(255,216,168,0)");
  g.addColorStop(0.34, "rgba(255,216,168,0)"); // transparent core over the sunken pool
  g.addColorStop(0.5, "rgba(255,216,168,0.55)"); // bright rim where the shaft lands
  g.addColorStop(0.7, "rgba(255,196,130,0.22)");
  g.addColorStop(1, "rgba(255,184,112,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.center.set(0.5, 0.5); // slow rotation drift in the frame loop (desktop)
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
