import * as THREE from "three";
import { PLASTER, INK } from "./canon";
import { EYE_HEIGHT } from "./cameraComfort";
import { makeArtwork, type Artwork } from "./makeArtwork";

/**
 * WS7-5 / WS6-6 — the salon-hang generator (kills every photo cap).
 *
 * Pure layout + mount, shared by all four scenes: given memories and a flat
 * wall run (width × height, y-base at the floor), produce a deterministic
 * museum salon hang of makeArtwork placements.
 *
 * Plan behaviour (demo checklist / dogma 6):
 *  - 1 photo   → one large piece, centred on the sightline.
 *  - 12 photos → salon wall: 2 rows, varied widths, a shared sightline seam.
 *  - 0 photos  → cream easel placeholder ("Hang your first memory" — TEXT IS A
 *    PARAMETER; i18n lives in the scene, never in this lib).
 *  - No caps: more memories than the wall can take → widths scale down to
 *    `minPieceWidth`, beyond that extra rows (≤3); past physical capacity the
 *    overflow is reported in `layout.omitted` (tier budget via `maxPieces`).
 *
 * DETERMINISM: zero Math.random / Date.now — the hang is seeded from an
 * FNV-1a hash of the memory ids (+ optional `seed`, e.g. a roomId hash), so
 * the same collection hangs identically on every mount/revisit.
 *
 * Coordinate contract: the layout is expressed in the WALL's local frame —
 * x runs along the wall (0 = wall centre), y is world-up from the same origin
 * the caller measured `yBase` in (pass yBase=0 and the wall's floor y via the
 * parent group), z faces out of the wall (+Z). Callers position/rotate the
 * returned mount `group` onto the wall plane; artwork fronts face +Z
 * (makeArtwork convention).
 *
 * Texture ownership: mount does NOT own photo textures (paintTex cache stays
 * the scene's) — `dispose()` releases only what makeArtwork/easel created.
 * Layout uses the aspect known at layout time (`mem.aspect`, default 4:3);
 * when paintTex later resolves a photo's true aspect the scene re-runs the
 * hang on its existing displayFingerprint rebuild — planes never live-stretch.
 */

// ── Public types ──

export interface SalonMemoryRef {
  /** Stable id — the determinism seed and the artwork map key. */
  id: string;
  /** Photo aspect (w/h) — pass tex.userData.aspect when known; default 4:3. */
  aspect?: number;
  title?: string;
  year?: string;
}

export interface SalonWallSpec {
  /** Usable wall run in metres (door/window/fireplace reserves already subtracted by the caller). */
  width: number;
  /** Usable wall height in metres from yBase. */
  height: number;
  /** Wall-local floor y (default 0). Sightline = yBase + EYE_HEIGHT, clamped into the wall. */
  yBase?: number;
}

export interface SalonHangOptions {
  /** Tier budget — hard cap on hung pieces (e.g. ~24 CanvasTexture cap on mobile). Overflow → `omitted`. */
  maxPieces?: number;
  /** Extra seed mixed into the id hash (e.g. hash of actualRoomId) so two rooms with equal ids differ. */
  seed?: number;
  /** Narrowest a piece may shrink before the hang adds rows (default 0.55m). */
  minPieceWidth?: number;
  /** Widest a salon piece may grow when sparse (default 3.2m; the single hero piece may reach 3.6m). */
  maxPieceWidth?: number;
  /** Horizontal gap between pieces (default 0.35m). */
  gap?: number;
  /** Side margin kept clear at each end of the run (default 0.5m). */
  margin?: number;
}

export interface SalonPlacement {
  memory: SalonMemoryRef;
  /** Wall-local x of the piece centre (0 = wall centre). */
  x: number;
  /** Wall-local y of the PHOTO centre (plaque hangs below, handled by makeArtwork). */
  y: number;
  /** Photo plane width for makeArtwork; height = width / aspect. */
  width: number;
  /** Derived photo plane height (width / aspect) — for colliders/focus targets. */
  height: number;
  /** Row index, 0 = bottom. */
  row: number;
  /** Reserved for future easel rows — always 0 for wall-hung pieces. */
  rotY?: number;
}

export interface SalonLayout {
  placements: SalonPlacement[];
  /** Memories that did not fit (maxPieces or physical wall capacity). */
  omitted: SalonMemoryRef[];
  rows: number;
  /** The shared sightline y (single row: piece centres; 2+ rows: the seam between rows 0 and 1). */
  sightY: number;
  /** The resolved deterministic seed (debugging / cache keys). */
  seed: number;
  wall: Required<SalonWallSpec>;
}

export interface SalonMountOptions {
  /** Scene-owned texture per memory (paintTex result). Called once per placement. */
  getTexture(mem: SalonMemoryRef): THREE.Texture;
  quality?: "low" | "med" | "high";
  /** Opt-in (corridor W3C, F15): raised rabbet molding on every piece. */
  rabbet?: boolean;
  /** Opt-in (corridor W3C, F16): brass picture-light + baked wash on every piece. */
  pictureLight?: boolean;
  /** Opt-in (corridor W3C): refined dark-walnut moulding instead of gold slab. */
  refinedFrame?: boolean;
  /** Opt-in (corridor W3C): real engraved brass museum plaque under each piece. */
  plaquePlate?: boolean;
  /** Empty-state easel text ("Hang your first memory", pre-translated by the scene). Omit → no easel. */
  emptyText?: string;
  /** Hook per created piece — attach userData.memory, hit planes, focus targets. */
  onPiece?(artwork: Artwork, placement: SalonPlacement): void;
}

export interface SalonHangMount {
  /** Position/rotate this onto the wall plane; children face +Z. */
  group: THREE.Group;
  /** Mounted pieces by memory id. */
  artworks: Map<string, Artwork>;
  layout: SalonLayout;
  /** Removes the group from its parent and disposes everything the hang created (not photo textures). */
  dispose(): void;
}

// ── Deterministic seed ──

/** FNV-1a over memory ids ⊕ seed — stable across mounts, no Math.random/Date.now anywhere in this module. */
function hashIds(ids: readonly string[], seed: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h = (h ^ 0x9e3779b9) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG for the seeded width variation. */
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Layout constants ──

const DEF_MIN_W = 0.55;
const DEF_MAX_W = 3.2;
const HERO_MAX_W = 3.6;
const DEF_GAP = 0.35;
const DEF_MARGIN = 0.5;
/** Vertical room reserved under each piece for the brass plaque (makeArtwork hangs it at -0.1..-0.32). */
const PLAQUE_ALLOW = 0.35;
/** Art never touches the floor / ceiling. */
const BOTTOM_CLEAR = 0.8;
const TOP_CLEAR = 0.3;
/** Vertical seam between salon rows (rows 0↔1 straddle the sightline). */
const SEAM_GAP = 0.5;
/** Gap above row 1 for a rare third row. */
const ROW_GAP = 0.45;
const MAX_ROWS = 3;
const DEFAULT_ASPECT = 4 / 3;

// ── Layout ──

/**
 * Pure, deterministic salon layout. Order matters: the caller sorts memories
 * (chronological/starred) — rows fill bottom-first in the given order.
 */
export function computeSalonHang(
  memories: readonly SalonMemoryRef[],
  wallSpec: SalonWallSpec,
  opts: SalonHangOptions = {}
): SalonLayout {
  const wall: Required<SalonWallSpec> = {
    width: wallSpec.width,
    height: wallSpec.height,
    yBase: wallSpec.yBase ?? 0,
  };
  const minW = opts.minPieceWidth ?? DEF_MIN_W;
  const maxW = opts.maxPieceWidth ?? DEF_MAX_W;
  const gap = opts.gap ?? DEF_GAP;
  const margin = opts.margin ?? DEF_MARGIN;

  const usableW = Math.max(0, wall.width - 2 * margin);
  const usableH = Math.max(0, wall.height - BOTTOM_CLEAR - TOP_CLEAR);
  const seed = hashIds(memories.map((m) => m.id), opts.seed ?? 0);
  const sightY = clamp(
    wall.yBase + EYE_HEIGHT,
    wall.yBase + BOTTOM_CLEAR + 0.4,
    wall.yBase + BOTTOM_CLEAR + Math.max(0.4, usableH - 0.4)
  );

  // Budget cap first (tier), then physical capacity.
  const budget = opts.maxPieces !== undefined ? Math.max(0, opts.maxPieces) : Infinity;
  const maxRows = clamp(Math.floor(usableH / 1.15), 1, MAX_ROWS);
  const perRowCap = Math.max(1, Math.floor((usableW + gap) / (minW + gap)));
  const capacity = perRowCap * maxRows;
  const nWanted = Math.min(memories.length, budget);
  const n = Math.min(nWanted, capacity);
  const hung = memories.slice(0, n);
  const omitted = memories.slice(n);

  const layout: SalonLayout = { placements: [], omitted: [...omitted], rows: 0, sightY, seed, wall };
  if (n === 0 || usableW <= 0 || usableH <= 0) return layout;

  const rand = mulberry32(seed);

  // Row count: fewest rows that keep pieces comfortably wide; scale widths down
  // toward minPieceWidth before adding a row (plan: shrink first, then rows).
  const comfortableW = Math.max(minW * 1.6, 0.9);
  let rows = 1;
  while (rows < maxRows) {
    const perRow = Math.ceil(n / rows);
    const wEach = (usableW - (perRow - 1) * gap) / perRow;
    if (perRow <= perRowCap && wEach >= comfortableW) break;
    rows++;
  }
  rows = Math.max(rows, Math.ceil(n / perRowCap));
  layout.rows = rows;

  // Bottom-heavy distribution in caller order (row 0 = bottom).
  const base = Math.floor(n / rows);
  const extra = n % rows;
  const counts = Array.from({ length: rows }, (_, k) => base + (k < extra ? 1 : 0));

  // Max photo height per row so plaques never collide with the next row.
  const rowBandH = Math.max(0.4, (usableH - (rows - 1) * ROW_GAP) / rows - PLAQUE_ALLOW);

  let cursor = 0;
  let prevRowTop = -Infinity;
  for (let r = 0; r < rows; r++) {
    const cnt = counts[r];
    const rowMems = hung.slice(cursor, cursor + cnt);
    cursor += cnt;
    if (cnt === 0) continue;

    // Base width for the row, then seeded ±~17% variation, renormalised so the
    // row still fills its run — "varied breedtes" without ever going random-looking.
    const baseW = clamp((usableW - (cnt - 1) * gap) / cnt, minW, n === 1 ? Math.min(HERO_MAX_W, usableW) : maxW);
    let widths = rowMems.map(() => baseW * (n === 1 ? 1 : 0.85 + rand() * 0.33));
    const sum0 = widths.reduce((a, b) => a + b, 0);
    widths = widths.map((w) => (w * (cnt * baseW)) / sum0);
    // Clamp: min width, max width, and row-band height (h = w / aspect ≤ band).
    widths = widths.map((w, i) => {
      const aspect = rowMems[i].aspect || DEFAULT_ASPECT;
      const hi = Math.min(n === 1 ? HERO_MAX_W : maxW, rowBandH * aspect);
      return clamp(w, Math.min(minW, hi), Math.max(hi, 0.3));
    });
    // If clamping overflowed the run, shrink proportionally (never below 0.8·minW).
    const total = widths.reduce((a, b) => a + b, 0) + (cnt - 1) * gap;
    if (total > usableW) {
      const s = Math.max((usableW - (cnt - 1) * gap) / (total - (cnt - 1) * gap), (minW * 0.8) / baseW);
      widths = widths.map((w) => w * s);
    }

    // Horizontal: centred run.
    const rowTotal = widths.reduce((a, b) => a + b, 0) + (cnt - 1) * gap;
    let x = -rowTotal / 2;
    let rowTop = prevRowTop;
    for (let i = 0; i < cnt; i++) {
      const mem = rowMems[i];
      const w = widths[i];
      const h = w / (mem.aspect || DEFAULT_ASPECT);
      // Vertical: shared sightline. 1 row → centres ON the line; 2+ rows → the
      // seam sits on the line: row 0 aligns TOP edges under it, row 1 aligns
      // BOTTOM edges above it, row 2 stacks above row 1.
      let y: number;
      if (rows === 1) y = sightY;
      else if (r === 0) y = sightY - SEAM_GAP / 2 - h / 2;
      else if (r === 1) y = sightY + SEAM_GAP / 2 + h / 2;
      else y = prevRowTop + ROW_GAP + h / 2;
      // Never breach the wall's top/bottom clears.
      y = Math.min(y, wall.yBase + wall.height - TOP_CLEAR - h / 2);
      y = Math.max(y, wall.yBase + BOTTOM_CLEAR + PLAQUE_ALLOW + h / 2 - (rows === 1 ? 0 : r > 0 ? 0 : 0.15));
      layout.placements.push({ memory: mem, x: x + w / 2, y, width: w, height: h, row: r, rotY: 0 });
      rowTop = Math.max(rowTop, y + h / 2);
      x += w + gap;
    }
    prevRowTop = rowTop;
  }
  return layout;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ── Empty state: the cream easel ──

/**
 * WS7-12-style warm empty state: a cream canvas on an ink easel, Fraunces ink
 * text ("Hang your first memory" — pass the scene's translated string; ×5
 * locales live in messages/*.json with FLAT keys, per the i18n gotcha).
 * Canon palette only: PLASTER canvas, INK legs and type. Unlit materials so it
 * reads warm on every tier without a light. Board centre ≈ y 1.35 above yBase;
 * front faces +Z. The scene may set userData on `group` to route taps to the
 * existing __upload__ station path.
 */
export function makeSalonEmptyEasel(
  text: string,
  opts: { yBase?: number } = {}
): { group: THREE.Group; dispose(): void } {
  const yBase = opts.yBase ?? 0;
  const group = new THREE.Group();
  group.name = "salonEmptyEasel";
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];

  // Canvas board — cream, Fraunces ink text, word-wrapped, redrawn when fonts land.
  const bw = 1.15, bh = 0.9;
  const cw = 512, ch = Math.round((cw * bh) / bw);
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
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, cw - 20, ch - 20);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fs = 44;
    ctx.font = `500 ${fs}px Fraunces, Georgia, serif`;
    // Simple word wrap into ≤3 centred lines.
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const wd of words) {
      const probe = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(probe).width > cw - 80 && line) {
        lines.push(line);
        line = wd;
      } else line = probe;
    }
    if (line) lines.push(line);
    const shown = lines.slice(0, 3);
    const lh = fs * 1.25;
    shown.forEach((l, i) => ctx.fillText(l, cw / 2, ch / 2 + (i - (shown.length - 1) / 2) * lh, cw - 60));
    tex.needsUpdate = true;
  };
  draw();
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  texs.push(tex);

  const boardGeo = new THREE.PlaneGeometry(bw, bh);
  const boardMat = new THREE.MeshBasicMaterial({ map: tex });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, yBase + 1.35, 0.09);
  board.rotation.x = -0.08; // leaned back on the easel
  geos.push(boardGeo);
  mats.push(boardMat);
  group.add(board);

  // Ink easel: two splayed front legs, one rear leg, one tray ledge.
  const legMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.85 });
  mats.push(legMat);
  const legGeo = new THREE.BoxGeometry(0.05, 1.9, 0.05);
  geos.push(legGeo);
  const mkLeg = (x: number, z: number, tiltZ: number, tiltX: number) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, yBase + 0.95, z);
    leg.rotation.set(tiltX, 0, tiltZ);
    group.add(leg);
  };
  mkLeg(-0.32, 0.06, 0.16, -0.08);
  mkLeg(0.32, 0.06, -0.16, -0.08);
  mkLeg(0, -0.28, 0, 0.3);
  const trayGeo = new THREE.BoxGeometry(0.9, 0.05, 0.1);
  geos.push(trayGeo);
  const tray = new THREE.Mesh(trayGeo, legMat);
  tray.position.set(0, yBase + 0.85, 0.13);
  tray.rotation.x = -0.08;
  group.add(tray);

  return {
    group,
    dispose() {
      group.parent?.remove(group);
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of texs) t.dispose();
    },
  };
}

// ── Mount ──

/**
 * Mounts a computed layout as real makeArtwork pieces (shared frame/plaque/
 * glow materials — salon rows stay draw-call cheap). Empty layout + `emptyText`
 * → the cream easel instead. The caller adds `mount.group` to the scene and
 * poses it on the wall; `dispose()` detaches and frees everything the hang
 * created (photo textures stay caller-owned).
 */
export function mountSalonHang(layout: SalonLayout, opts: SalonMountOptions): SalonHangMount {
  const group = new THREE.Group();
  group.name = "salonHang";
  const artworks = new Map<string, Artwork>();
  let easel: { group: THREE.Group; dispose(): void } | null = null;

  if (layout.placements.length === 0) {
    if (opts.emptyText) {
      easel = makeSalonEmptyEasel(opts.emptyText, { yBase: layout.wall.yBase });
      group.add(easel.group);
    }
  } else {
    for (const p of layout.placements) {
      const texture = opts.getTexture(p.memory);
      const art = makeArtwork({
        texture,
        aspect: p.memory.aspect || DEFAULT_ASPECT,
        title: p.memory.title,
        year: p.memory.year,
        width: p.width,
        quality: opts.quality,
        rabbet: opts.rabbet,
        pictureLight: opts.pictureLight,
        refinedFrame: opts.refinedFrame,
        plaquePlate: opts.plaquePlate,
      });
      art.group.position.set(p.x, p.y, 0);
      if (p.rotY) art.group.rotation.y = p.rotY;
      group.add(art.group);
      artworks.set(p.memory.id, art);
      opts.onPiece?.(art, p);
    }
  }

  return {
    group,
    artworks,
    layout,
    dispose() {
      group.parent?.remove(group);
      for (const art of artworks.values()) art.dispose();
      artworks.clear();
      easel?.dispose();
    },
  };
}
