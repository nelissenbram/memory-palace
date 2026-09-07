/**
 * Shared config + guards for the marketing render pipeline.
 *
 * WHY THIS EXISTS
 * The whole marketing asset library went stale without anyone noticing, and the
 * root cause was not "we forgot to re-render". Every capture script hardcoded
 * `http://localhost:3000` and an output path inside
 * `C:/Users/nelis/memory-palace/socials-kit` — the JULY-OLD worktree. Whoever ran
 * `next dev` from the wrong checkout produced authentic-looking renders of
 * outdated geometry, and nothing anywhere detected it.
 *
 * So this module does three things:
 *   1. One place to configure the render target (MP_BASE) and output root (MP_KIT).
 *   2. assertStagingServer() — refuses to render against a server that is not the
 *      current worktree, by probing a route that only exists here.
 *   3. stamp() — provenance sidecars, so staleness is machine-detectable later
 *      (see scripts/marketing/check-stale.mjs, phase 4).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo root of THIS worktree — the code that will be rendered. */
export const REPO = resolve(__dirname, "..", "..");

/** Dev server to render against. Must serve THIS worktree — enforced below. */
export const BASE = process.env.MP_BASE || "http://localhost:3002";

/**
 * Output root for rendered assets. Defaults inside this worktree so the pipeline
 * and the code it renders travel together. Binaries stay out of git (.gitignore);
 * the scripts and manifest are versioned.
 */
export const KIT = process.env.MP_KIT || resolve(REPO, "socials-kit");

export const paths = {
  kit: KIT,
  clips: resolve(KIT, "clips"),
  src: resolve(KIT, "clips", "src"),
  work: resolve(KIT, "clips", "work"),
  stills: resolve(KIT, "clips", "work", "stills"),
  segs: resolve(KIT, "clips", "work", "segs"),
  video: resolve(REPO, "public", "video"),
  landing: resolve(REPO, "public", "landing"),
  press: resolve(REPO, "public", "press"),
  storeAssets: resolve(REPO, "store-assets"),
};

export function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

/** Short SHA of the worktree being rendered (with -dirty when uncommitted). */
export function sceneCommit() {
  try {
    const sha = execSync("git rev-parse --short HEAD", { cwd: REPO }).toString().trim();
    const dirty = execSync("git status --porcelain src/components/3d src/lib/3d", { cwd: REPO })
      .toString().trim().length > 0;
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
}

/**
 * Refuse to render against the wrong checkout.
 *
 * The probe is `/staging/corridor`, a dev-only review route that exists only in
 * this worktree's code (added with the corridor realism pass). A server running
 * the old worktree returns 404 for it, so a 200 proves the dev server is serving
 * code that at least includes the current 3D work. Cheap and needs no extra
 * endpoint. Note these routes notFound() in production builds by design (Apple
 * 2.2), so this also enforces "render against a DEV server".
 */
export async function assertStagingServer({ probe = "/staging/corridor" } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${probe}`, { redirect: "manual" });
  } catch {
    throw new Error(
      `No dev server reachable at ${BASE}.\n` +
      `Start one IN THIS WORKTREE:\n  cd ${REPO} && npx next dev -p 3002`
    );
  }
  if (res.status !== 200) {
    throw new Error(
      `${BASE} answered ${res.status} for ${probe}.\n` +
      `That route only exists in the current worktree's code, so this server is\n` +
      `either a production build or an OLD checkout — exactly the mistake that\n` +
      `made the whole asset library stale. Start the dev server here instead:\n` +
      `  cd ${REPO} && npx next dev -p 3002`
    );
  }
  return true;
}

/** Write a provenance sidecar next to a rendered asset. */
export function stamp(outPath, extra = {}) {
  const meta = {
    renderedAt: new Date().toISOString(),
    sceneCommit: sceneCommit(),
    base: BASE,
    ...extra,
  };
  ensureDir(dirname(outPath));
  writeFileSync(`${outPath}.stamp.json`, JSON.stringify(meta, null, 2));
  return meta;
}

/** Chromium/Edge args that make WebGL actually render in an automated browser. */
export const GPU_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-extensions", "--no-first-run",
  "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-webgl",
];

export const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

/** 3D scenes need assembly + reveal-veil fade before a frame is worth capturing. */
export const ASSEMBLY_WAIT_MS = 18000;

/**
 * Block until the scene has actually settled, instead of guessing a fixed wait.
 *
 * Two failures made this necessary, both of which produced plausible-looking but
 * wrong output rather than an error:
 *  - scene=exterior remounts (it logs "reveal (assembled)" twice); a remount
 *    swaps the canvas, so anything bound to the old one silently dies.
 *  - a still captured while the cream reveal-veil is still fading comes out
 *    desaturated — the red corridor runner rendered grey and looked like a scene
 *    regression rather than a capture bug.
 *
 * Waits for the SAME canvas element to persist at a stable size, then for the
 * veil to be gone (no near-opaque full-viewport overlay), then a short settle.
 */
export async function waitForScene(page, { stableFor = 2500, settleMs = 2500, capMs = 45000 } = {}) {
  const t0 = Date.now();
  let lastKey = "", stableSince = 0;
  for (;;) {
    const state = await page.evaluate(() => {
      const c = [...document.querySelectorAll("canvas")]
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (!c || !c.width) return { key: "", veiled: true };
      if (!c.dataset.recId) c.dataset.recId = String(Math.floor(performance.now()));
      // reveal veil = a fixed/absolute element covering ~the viewport, still opaque
      let veiled = false;
      for (const el of document.querySelectorAll("div")) {
        const s = getComputedStyle(el);
        if (s.position !== "fixed" && s.position !== "absolute") continue;
        const r = el.getBoundingClientRect();
        if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;
        if (el.querySelector("canvas")) continue;      // the scene's own wrapper
        if (Number(s.opacity) > 0.05 && s.backgroundColor !== "rgba(0, 0, 0, 0)") { veiled = true; break; }
      }
      return { key: `${c.dataset.recId}:${c.width}x${c.height}`, veiled };
    }).catch(() => ({ key: "", veiled: true }));

    const now = Date.now();
    if (state.key && state.key === lastKey && !state.veiled) {
      if (!stableSince) stableSince = now;
      if (now - stableSince >= stableFor) break;
    } else { lastKey = state.key; stableSince = 0; }
    if (now - t0 > capMs) break;             // don't hang forever; capture what we have
    await new Promise((r) => setTimeout(r, 400));
  }
  await new Promise((r) => setTimeout(r, settleMs));
  return ((Date.now() - t0) / 1000).toFixed(1);
}
