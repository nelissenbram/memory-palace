#!/usr/bin/env node
/**
 * MUSEO VIVO WS2-5 — KTX2 build script for the PBR texture library.
 *
 * Converts every PBR map under public/textures/pbr/** to GPU-compressed
 * .ktx2 (Basis Universal), generates the 512px potato-tier JPG variants
 * (WS2-7), and writes public/textures/pbr/ktx2-manifest.json — the runtime
 * feature-detect that activates WS2-6 KTX2 routing in assetLoader.ts.
 *
 * Encoding policy (per master plan WS2-5):
 *   - *_diff_*    → ETC1S, sRGB          (color; smallest payload)
 *   - *_nor_gl_*  → UASTC, linear        (ETC1S destroys normal maps)
 *   - *_rough_* / *_ao_* → ETC1S, linear (single-channel-ish data)
 *   - always --genmipmap (repeat-wrap + minification need full mip chains)
 *
 * ALL-OR-NOTHING: if the `toktx` tool (KTX-Software) is not installed, the
 * script explains how to get it and exits WITHOUT generating anything — no
 * half-built asset states. Requires the `canvas` devDependency (already in
 * package.json) for 512px downscales and JPG→PNG decode for toktx.
 *
 * Usage:  npm run build:ktx2 [-- --force]
 *   --force  re-encode even when the .ktx2 is newer than its source
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PBR_ROOT = path.join(__dirname, "..", "public", "textures", "pbr");
const MANIFEST_PATH = path.join(PBR_ROOT, "ktx2-manifest.json");
const PUBLIC_PREFIX = "/textures/pbr"; // manifest entries are public URL paths
const FORCE = process.argv.includes("--force");

// ── 1. Locate toktx (all-or-nothing gate) ────────────────────────────────
function findToktx() {
  const candidates = [
    "toktx", // PATH
    process.env.KTX_HOME ? path.join(process.env.KTX_HOME, "bin", "toktx.exe") : null,
    "C:\\Program Files\\KTX-Software\\bin\\toktx.exe",
    "/usr/local/bin/toktx",
    "/opt/homebrew/bin/toktx",
  ].filter(Boolean);
  for (const cmd of candidates) {
    try {
      const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
      if (r.status === 0 || (r.stdout || r.stderr || "").toLowerCase().includes("toktx")) {
        return cmd;
      }
    } catch { /* try next */ }
  }
  return null;
}

const TOKTX = findToktx();
if (!TOKTX) {
  console.error(`
[build-ktx2] toktx (KTX-Software) is NOT installed on this machine.

Nothing was generated — this script is all-or-nothing by design (WS2-5):
no half-built .ktx2 sets, no manifest, so the runtime stays on the JPG
pipeline (WS2-6 routing only activates when ktx2-manifest.json exists).

To install on Windows (pick one):
  winget install KhronosGroup.KTXSoftware
  — or download the installer from:
  https://github.com/KhronosGroup/KTX-Software/releases (KTX-Software-*-Windows-x64.exe)

Then re-run:  npm run build:ktx2
(If installed to a custom location, set KTX_HOME or add its bin/ to PATH.)
`);
  process.exit(1);
}
console.log(`[build-ktx2] using toktx: ${TOKTX}`);

// ── 2. canvas (bundled devDependency) for 512 downscales + JPG→PNG decode ─
let Canvas;
try {
  Canvas = createRequire(import.meta.url)("canvas");
} catch {
  console.error("[build-ktx2] the `canvas` devDependency is missing — run `npm install` first. Nothing was generated.");
  process.exit(1);
}
const { createCanvas, loadImage } = Canvas;

// ── 3. Collect sources ───────────────────────────────────────────────────
// Naming convention (Poly Haven): <prefix>_<kind>_<res>.jpg
// kinds: diff | nor_gl | rough | ao;  res: 512 | 1k | 2k
const SRC_RE = /^(.+)_(diff|nor_gl|rough|ao)_(512|1k|2k)\.jpg$/;

if (!fs.existsSync(PBR_ROOT)) {
  console.error(`[build-ktx2] PBR root not found: ${PBR_ROOT}`);
  process.exit(1);
}
const dirs = fs.readdirSync(PBR_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

/** @type {{dir: string, file: string, prefix: string, kind: string, res: string}[]} */
const sources = [];
for (const dir of dirs) {
  for (const file of fs.readdirSync(path.join(PBR_ROOT, dir))) {
    const m = SRC_RE.exec(file);
    if (m) sources.push({ dir, file, prefix: m[1], kind: m[2], res: m[3] });
  }
}
console.log(`[build-ktx2] found ${sources.length} source JPGs in ${dirs.length} texture dirs`);

// ── 4. Generate missing 512px JPG variants from the 1k sources (WS2-7) ───
async function ensure512Variants() {
  let made = 0;
  for (const s of sources.filter((x) => x.res === "1k")) {
    const out = path.join(PBR_ROOT, s.dir, `${s.prefix}_${s.kind}_512.jpg`);
    if (fs.existsSync(out) && !FORCE) continue;
    const img = await loadImage(path.join(PBR_ROOT, s.dir, s.file));
    const size = 512;
    const cv = createCanvas(size, Math.round((img.height / img.width) * size) || size);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    fs.writeFileSync(out, cv.toBuffer("image/jpeg", { quality: 0.82 }));
    sources.push({ dir: s.dir, file: path.basename(out), prefix: s.prefix, kind: s.kind, res: "512" });
    made++;
  }
  console.log(`[build-ktx2] 512px JPG variants: ${made} generated`);
}

// ── 5. Encode each JPG to .ktx2 via toktx ────────────────────────────────
function toktxArgs(kind) {
  const base = ["--t2", "--genmipmap"];
  if (kind === "nor_gl") {
    // Normals: UASTC — ETC1S block artifacts destroy normal data
    return [...base, "--encode", "uastc", "--uastc_quality", "2", "--zcmp", "18", "--assign_oetf", "linear"];
  }
  if (kind === "diff") {
    return [...base, "--encode", "etc1s", "--clevel", "2", "--qlevel", "224", "--assign_oetf", "srgb"];
  }
  // rough / ao — linear data, ETC1S is fine
  return [...base, "--encode", "etc1s", "--clevel", "2", "--qlevel", "128", "--assign_oetf", "linear"];
}

async function encodeAll() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mp-ktx2-"));
  let encoded = 0, skipped = 0, failed = 0;
  const manifest = [];
  try {
    for (const s of sources) {
      const srcPath = path.join(PBR_ROOT, s.dir, s.file);
      const outPath = srcPath.replace(/\.jpg$/, ".ktx2");
      const urlPath = `${PUBLIC_PREFIX}/${s.dir}/${path.basename(outPath)}`;
      if (!FORCE && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(srcPath).mtimeMs) {
        manifest.push(urlPath);
        skipped++;
        continue;
      }
      // Decode JPG → temp PNG (toktx PNG input support is universal across versions)
      const img = await loadImage(srcPath);
      const cv = createCanvas(img.width, img.height);
      cv.getContext("2d").drawImage(img, 0, 0);
      const tmpPng = path.join(tmpDir, `${s.dir}__${s.file.replace(/\.jpg$/, ".png")}`);
      fs.writeFileSync(tmpPng, cv.toBuffer("image/png"));

      const r = spawnSync(TOKTX, [...toktxArgs(s.kind), outPath, tmpPng], { encoding: "utf8" });
      fs.rmSync(tmpPng, { force: true });
      if (r.status === 0 && fs.existsSync(outPath)) {
        manifest.push(urlPath);
        encoded++;
        const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
        console.log(`  ✓ ${s.dir}/${path.basename(outPath)} (${kb} KB, ${s.kind === "nor_gl" ? "UASTC" : "ETC1S"})`);
      } else {
        failed++;
        console.error(`  ✗ ${s.dir}/${s.file}: toktx exit ${r.status}\n${(r.stderr || "").trim()}`);
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return { encoded, skipped, failed, manifest };
}

// ── 6. Run ───────────────────────────────────────────────────────────────
await ensure512Variants();
const { encoded, skipped, failed, manifest } = await encodeAll();

if (failed > 0 && encoded === 0 && skipped === 0) {
  console.error("[build-ktx2] every encode failed — NOT writing a manifest (runtime stays on JPG).");
  process.exit(1);
}
manifest.sort();
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
console.log(`[build-ktx2] done: ${encoded} encoded, ${skipped} up-to-date, ${failed} failed`);
console.log(`[build-ktx2] manifest: ${MANIFEST_PATH} (${manifest.length} entries) — WS2-6 runtime routing is now active for these files`);
if (failed > 0) process.exitCode = 1;
