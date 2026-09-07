#!/usr/bin/env node
/**
 * Find marketing assets the manifest does not know about.
 *
 * WHY: check-stale.mjs only inspects entries in marketing/shots.manifest.json, so
 * it happily reported "12 ok" while public/landing/shots/shot-1..7.webp sat on the
 * live landing page showing the pre-overhaul corridor and room. A staleness check
 * that can only see what you remembered to register has a blind spot exactly where
 * you are most likely to make a mistake. This closes it.
 *
 * Two findings, both actionable:
 *   UNCOVERED — referenced by the app but absent from the manifest. These are the
 *               dangerous ones: they ship, and nothing watches them.
 *   ORPHAN    — present on disk, referenced nowhere, not in the manifest. Cleanup
 *               candidates (verify before deleting; they are usually in git).
 *
 * Usage: node scripts/marketing/check-coverage.mjs [--json]
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, basename, extname, dirname } from "node:path";
import { REPO } from "./kit.mjs";

const ASSET_DIRS = ["public/video", "public/landing", "public/press"];
const EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm", ".gif"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(extname(e).toLowerCase())) out.push(p);
  }
  return out;
}

/** One grep pass over the app source; far faster than per-file searching. */
function sourceText() {
  try {
    return execSync(
      'git grep -h --no-color -e "/video/" -e "/landing/" -e "/press/" -- src || true',
      { cwd: REPO, maxBuffer: 32 * 1024 * 1024 },
    ).toString();
  } catch { return ""; }
}

const manifest = JSON.parse(readFileSync(join(REPO, "marketing/shots.manifest.json"), "utf8"));
const managed = new Set(manifest.shots.map((s) => s.out.replace(/\\/g, "/")));
/** Deliberately not rendered by this pipeline — see manifest.unmanaged for why. */
const unmanaged = new Set(Object.keys(manifest.unmanaged || {}));
const src = sourceText();

const rows = [];
for (const dir of ASSET_DIRS) {
  for (const abs of walk(join(REPO, dir))) {
    const rel = relative(REPO, abs).replace(/\\/g, "/");
    if (rel.endsWith(".stamp.json")) continue;
    if (managed.has(rel) || unmanaged.has(rel)) continue;
    const base = basename(rel);
    // Directory matching only applies to SUBdirectories (e.g. /landing/shots/),
    // where paths are built dynamically like `shot-${n}.webp`. Applying it to a
    // top-level dir would match "/landing/" from any sibling and mark genuinely
    // orphaned files as referenced — which it did on the first run.
    const dirRel = relative(join(REPO, "public"), dirname(abs)).replace(/\\/g, "/");
    const isSubdir = dirRel.split("/").length > 1;
    const referenced = src.includes(base) || (isSubdir && src.includes(`/${dirRel}/`));
    rows.push({ rel, status: referenced ? "UNCOVERED" : "ORPHAN" });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const un = rows.filter((r) => r.status === "UNCOVERED");
  const or = rows.filter((r) => r.status === "ORPHAN");
  console.log(`\nUNCOVERED — shipped by the app, not watched by the manifest (${un.length}):`);
  for (const r of un) console.log(`  ${r.rel}`);
  console.log(`\nORPHAN — on disk, referenced nowhere (${or.length}):`);
  for (const r of or) console.log(`  ${r.rel}`);
  console.log(`\n${managed.size} asset(s) in the manifest.\n`);
}
process.exitCode = rows.some((r) => r.status === "UNCOVERED") ? 1 : 0;
