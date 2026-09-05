import * as THREE from "three";

/**
 * Procedural foliage — runtime alpha leaf-cards that replace the flat low-poly
 * green spheres in the corridor (potted plants + the roots "Family Tree").
 * Owner: the greenery "looks WAY too unrealistic" and drives the corridor's
 * whole material read.
 *
 * Two primitives:
 *  - makeFoliageClump(): a bushy volume from intersecting leaf-cluster cards.
 *    Used for tree canopies where you look at a mass, not individual leaves.
 *  - makePottedPlant(): a real plant — individual leaves on arcing stems rising
 *    from the soil. Reads far better than a ball at the 1-3 m viewing distance
 *    a corridor pot actually gets (owner round 2: "realism WAY higher").
 *
 * Alpha handling: cards use alphaTest CUTOUT (not blending) so they depth-sort
 * correctly and still cast shadows. Every card also gets a unique polygonOffset
 * so near-parallel overlapping cards can never z-fight (owner round 2: "z-
 * fighting in the plants") — coplanar alpha cards are the classic cause.
 *
 * No asset files: every texture is drawn to a canvas at runtime, deterministic
 * (no Math.random — stable across reloads and SSR hydration).
 */

let _clusterTex: THREE.CanvasTexture | null = null;
let _leafTex: THREE.CanvasTexture | null = null;

/** Deterministic PRNG factory — same seed always yields the same plant. */
function prng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** Draw one tapered leaf blade with midrib + side veins, pointing up (-y). */
function drawLeafBlade(
  g: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number,
  fill: string, vein: string, width = 0.4,
) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const w = len * width;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(w, -len * 0.22, w * 0.82, -len * 0.75, 0, -len);
  g.bezierCurveTo(-w * 0.82, -len * 0.75, -w, -len * 0.22, 0, 0);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = vein;
  g.lineWidth = Math.max(0.8, len * 0.028);
  g.beginPath();
  g.moveTo(0, -len * 0.06);
  g.lineTo(0, -len * 0.94);
  g.stroke();
  // side veins
  g.lineWidth = Math.max(0.5, len * 0.014);
  for (let v = 1; v <= 4; v++) {
    const t = v / 5;
    const vy = -len * (0.15 + t * 0.7);
    const vw = w * (1 - Math.abs(t - 0.45) * 1.1) * 0.72;
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(0, vy);
      g.quadraticCurveTo(sgn * vw * 0.6, vy - len * 0.04, sgn * vw, vy - len * 0.1);
      g.stroke();
    }
  }
  g.restore();
}

/** Cached alpha leaf-CLUSTER sprite (many leaves, for canopy masses). */
export function getLeafClusterTexture(): THREE.CanvasTexture | null {
  if (_clusterTex) return _clusterTex;
  if (typeof document === "undefined") return null;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2;
  const rnd = prng(1337);
  const greens = ["#2E4A1E", "#37591F", "#446B29", "#547F35", "#679247"];
  const veins = ["#24401A", "#2C4C1C", "#3A5C24"];
  // Lobed, RAGGED outline — a smooth disc of leaves makes every card read as a
  // circle, which is what turns a canopy into a row of balloons (owner r4).
  // A low-frequency lobe function pushes some directions out and pulls others
  // in, and a handful of outliers break the rim entirely.
  const lobe = (ang: number) => 0.78 + 0.22 * Math.sin(ang * 3 + 0.7) + 0.12 * Math.sin(ang * 5 - 1.3);
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2;
    const outlier = i % 17 === 0;
    const reach = (S * 0.46) * lobe(a) * (outlier ? 1.18 : 1);
    const rad = Math.pow(rnd(), 0.62) * reach;
    const edge = rad / (S * 0.46);
    const len = (S * 0.19) * (1 - Math.min(edge, 1) * 0.28) * (0.7 + rnd() * 0.6);
    const gi = Math.min(greens.length - 1, Math.floor(edge * greens.length + rnd() * 1.2));
    drawLeafBlade(g, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, len,
      a + Math.PI / 2 + (rnd() - 0.5) * 1.5, greens[gi], veins[i % veins.length]);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _clusterTex = tex;
  return tex;
}

/** Cached alpha SINGLE-leaf sprite (one blade, for potted-plant sprays). */
export function getSingleLeafTexture(): THREE.CanvasTexture | null {
  if (_leafTex) return _leafTex;
  if (typeof document === "undefined") return null;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, S, S);
  // one blade filling the canvas, tip at top, stalk at bottom-centre
  drawLeafBlade(g, S / 2, S * 0.99, S * 0.95, 0, "#4E6B3A", "#33501F", 0.34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _leafTex = tex;
  return tex;
}

/** Back-compat alias (older call sites). */
export const getLeafSpriteTexture = getLeafClusterTexture;

/** Unique polygonOffset per card so overlapping alpha planes never z-fight. */
let _poCounter = 0;
function applyDepthBias(mat: THREE.Material) {
  _poCounter = (_poCounter + 1) % 64;
  mat.polygonOffset = true;
  // negative = pull toward camera; distinct per card, small enough to be invisible
  mat.polygonOffsetFactor = -1 - _poCounter * 0.05;
  mat.polygonOffsetUnits = -1 - _poCounter * 0.05;
}

export interface FoliageOpts {
  radius?: number;
  planes?: number;
  tint?: THREE.ColorRepresentation;
  seed?: number;
  lift?: number;
}

/**
 * A bushy foliage clump: intersecting alpha-cutout leaf-cluster cards + a dark
 * inner core. Returns a Group centred on its own origin.
 */
export function makeFoliageClump(opts: FoliageOpts = {}): THREE.Group {
  const { radius = 0.34, planes = 4, tint = "#5C7A42", seed = 0, lift = 0.06 } = opts;
  const grp = new THREE.Group();
  const tex = getLeafClusterTexture();

  if (tex) {
    const geo = new THREE.PlaneGeometry(radius * 2.1, radius * 2.1);
    const rnd = prng(seed + 11);
    for (let i = 0; i < planes; i++) {
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: false,
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.88,
        metalness: 0,
        color: new THREE.Color(tint).offsetHSL(0, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.08),
        emissive: new THREE.Color(tint).multiplyScalar(0.5),
        emissiveIntensity: lift,
      });
      applyDepthBias(mat);
      const p = new THREE.Mesh(geo, mat);
      // Fan across a HALF turn only (a card at 0 and one at PI are the same
      // plane with DoubleSide — that pair is what z-fights). Jitter stays well
      // inside the slice so no two cards land parallel.
      p.rotation.y = ((i + 0.5) / planes) * Math.PI + (rnd() - 0.5) * 0.28;
      p.rotation.x = (rnd() - 0.5) * 0.5;
      p.rotation.z = (rnd() - 0.5) * 0.4;
      p.position.set((rnd() - 0.5) * radius * 0.5, (rnd() - 0.5) * radius * 0.35, (rnd() - 0.5) * radius * 0.5);
      p.scale.setScalar(0.82 + rnd() * 0.36);
      grp.add(p);
    }
  }

  // Dark opaque core so inter-card gaps read as shaded interior, not background.
  // Kept SMALL (owner r4: the tree "looks unrealistic") — a large core shows
  // through the cards as a smooth sphere and makes the clump read as a balloon.
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius * 0.4, 1),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).multiplyScalar(0.4), roughness: 0.95, metalness: 0 }),
  );
  grp.add(core);
  return grp;
}

let _terracottaTex: THREE.CanvasTexture | null = null;
/**
 * Cached terracotta texture for the pots (owner r6: "more structure/texture on
 * the pot"). Wheel-thrown clay reads through three cues, all drawn here:
 * horizontal THROWING RINGS left by the potter's wheel, a fine clay grain, and
 * patchy lime/salt bloom weathering. Canvas UV maps straight onto a cylinder —
 * u wraps around the pot, v runs up it, so rings are horizontal lines.
 */
export function getTerracottaTexture(): THREE.CanvasTexture | null {
  if (_terracottaTex) return _terracottaTex;
  if (typeof document === "undefined") return null;
  const W = 256, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  const rnd = prng(613);
  g.fillStyle = "#B0603A";
  g.fillRect(0, 0, W, H);
  // broad vertical firing variation (kiln blush) — subtle, low frequency
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, w = 10 + rnd() * 42;
    g.fillStyle = `rgba(${rnd() > 0.5 ? "150,80,48" : "196,116,78"},${(0.05 + rnd() * 0.09).toFixed(3)})`;
    g.fillRect(x, 0, w, H);
  }
  // throwing rings: closely spaced horizontal bands, alternating light/dark
  for (let y = 0; y < H; y += 2 + Math.floor(rnd() * 3)) {
    const dark = rnd() > 0.5;
    g.fillStyle = dark
      ? `rgba(126,66,40,${(0.10 + rnd() * 0.14).toFixed(3)})`
      : `rgba(214,138,96,${(0.08 + rnd() * 0.13).toFixed(3)})`;
    g.fillRect(0, y, W, 1 + (rnd() > 0.7 ? 1 : 0));
  }
  // clay grain — fine speckle
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * W, y = rnd() * H, r = 0.4 + rnd() * 1.1;
    g.fillStyle = rnd() > 0.5 ? "rgba(96,50,30,0.20)" : "rgba(226,158,116,0.18)";
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // pale mineral bloom, denser toward the top where water evaporates
  for (let i = 0; i < 120; i++) {
    const y = Math.pow(rnd(), 1.8) * H * 0.7;
    const x = rnd() * W, r = 3 + rnd() * 14;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(232,216,196,${(0.05 + rnd() * 0.10).toFixed(3)})`);
    grd.addColorStop(1, "rgba(232,216,196,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  _terracottaTex = tex;
  return tex;
}

let _soilTex: THREE.CanvasTexture | null = null;
/** Cached crumbly potting-soil texture (dark peat + grit + lighter clods). */
export function getSoilTexture(): THREE.CanvasTexture | null {
  if (_soilTex) return _soilTex;
  if (typeof document === "undefined") return null;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#5C4530";
  g.fillRect(0, 0, S, S);
  const rnd = prng(97);
  // clods + grit: many small irregular blobs across the whole surface.
  // Kept mid-brown, not near-black — inside a pot it's already in shadow, and a
  // too-dark mix reads as an empty hole rather than soil.
  const tones = ["#6B5138", "#48351F", "#7A5E42", "#3C2C1B", "#8A6B4C"];
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S, y = rnd() * S;
    const r = 0.6 + rnd() * 2.6;
    g.fillStyle = tones[Math.floor(rnd() * tones.length)];
    g.beginPath();
    g.ellipse(x, y, r, r * (0.6 + rnd() * 0.7), rnd() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  _soilTex = tex;
  return tex;
}

/**
 * A visible potting-soil surface: a gently MOUNDED, textured cap plus a few
 * loose clods, so the plant clearly grows out of soil instead of merging into
 * the pot (owner r5: "de plant gaat over in de pot, maar er is geen potgrond").
 * Origin sits at the soil rim level; the mound rises above it.
 */
export function makeSoilSurface(radius = 0.2, seed = 5): THREE.Group {
  const grp = new THREE.Group();
  const tex = getSoilTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: "#C6B49E", map: tex || undefined, roughness: 1, metalness: 0,
  });
  if (tex) { tex.repeat.set(2, 2); }
  // shallow spherical cap = mounded soil
  const t = 0.42, R = radius / Math.sin(t);
  const dome = new THREE.SphereGeometry(R, 22, 8, 0, Math.PI * 2, 0, t);
  dome.translate(0, -R * Math.cos(t), 0); // rim sits at y=0, mound rises above
  grp.add(new THREE.Mesh(dome, mat));
  // close the underside so no hole shows at grazing angles
  const capGeo = new THREE.CircleGeometry(radius, 22);
  capGeo.rotateX(Math.PI / 2);
  grp.add(new THREE.Mesh(capGeo, mat));
  // a few loose clods for silhouette break-up
  const rnd = prng(seed + 41);
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2, rr = rnd() * radius * 0.8;
    const cl = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * (0.06 + rnd() * 0.07), 0),
      mat,
    );
    cl.position.set(Math.cos(a) * rr, R * (1 - Math.cos(t)) * (0.5 + rnd() * 0.4), Math.sin(a) * rr);
    cl.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    grp.add(cl);
  }
  return grp;
}

export interface PottedPlantOpts {
  /** height of the leaf mass above the soil, metres */
  height?: number;
  /** how far leaves splay from the axis, metres */
  spread?: number;
  /** number of leaves (18–30 reads full) */
  leaves?: number;
  tint?: THREE.ColorRepresentation;
  seed?: number;
}

/**
 * A real potted plant: individual leaves on arcing stems rising out of the
 * soil, longer and droopier at the rim, short and upright in the centre.
 * Origin sits at SOIL level — position it at the top of the pot.
 */
export function makePottedPlant(opts: PottedPlantOpts = {}): THREE.Group {
  const { height = 0.62, spread = 0.34, leaves = 24, tint = "#54793C", seed = 3 } = opts;
  const grp = new THREE.Group();
  const tex = getSingleLeafTexture();
  if (!tex) return grp;
  const rnd = prng(seed);

  const stemMat = new THREE.MeshStandardMaterial({ color: "#405A2C", roughness: 0.9, metalness: 0 });

  for (let i = 0; i < leaves; i++) {
    // Golden-angle phyllotaxis — how leaves actually arrange around a stem.
    const a = i * 2.39996 + rnd() * 0.25;
    const t = i / leaves;                       // 0 = inner/young, 1 = outer/old
    const lean = 0.25 + t * 0.95;               // outer leaves arch outward more
    const len = height * (0.5 + (1 - t) * 0.55) * (0.8 + rnd() * 0.4);
    const rOut = spread * (0.25 + t * 0.9) * (0.8 + rnd() * 0.35);
    const baseY = 0.02 + rnd() * 0.05;

    // short stem from the soil out to where the blade starts
    const stemLen = len * 0.45;
    const sx = Math.cos(a), sz = Math.sin(a);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.011, stemLen, 5),
      stemMat,
    );
    stem.position.set(sx * rOut * 0.35, baseY + stemLen * 0.42, sz * rOut * 0.35);
    stem.rotation.z = -sx * lean * 0.5;
    stem.rotation.x = sz * lean * 0.5;
    grp.add(stem);

    // the blade itself — a cutout card, tilted outward and rolled a little
    const bw = len * 0.42;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: false,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.82,
      metalness: 0,
      color: new THREE.Color(tint).offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.14),
      emissive: new THREE.Color(tint).multiplyScalar(0.5),
      emissiveIntensity: 0.05,
    });
    applyDepthBias(mat);
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(bw, len), mat);
    // plane's origin is its centre; shift so the stalk end sits at the stem tip
    blade.geometry.translate(0, len / 2, 0);
    blade.position.set(sx * rOut * 0.62, baseY + stemLen * 0.8, sz * rOut * 0.62);
    // face outward, then arch over
    blade.rotation.y = -a + Math.PI / 2;
    blade.rotation.x = lean * 0.9 * (0.7 + rnd() * 0.5);
    blade.rotation.z = (rnd() - 0.5) * 0.5;
    grp.add(blade);
  }
  return grp;
}
