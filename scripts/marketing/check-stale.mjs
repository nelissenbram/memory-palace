#!/usr/bin/env node
/**
 * Report which rendered marketing assets are older than the 3D code they depict.
 *
 * The whole overhaul happened because staleness was invisible: assets looked fine
 * in isolation, and nobody could tell that a corridor still had the old geometry
 * without opening it and squinting. This makes it mechanical.
 *
 * How: every render writes a <asset>.stamp.json containing the scene-commit it was
 * rendered from (scripts/marketing/kit.mjs → stamp()). For each manifest entry we
 * compare that commit's date against the last commit touching the scene sources it
 * depends on. Older => stale.
 *
 * Usage:
 *   node scripts/marketing/check-stale.mjs          # table; exit 1 if anything is stale
 *   node scripts/marketing/check-stale.mjs --json
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "./kit.mjs";

/** Which sources invalidate which scene tag. */
const SCENE_SOURCES = {
  room: ["src/components/3d/InteriorScene.tsx", "src/lib/3d"],
  corridor: ["src/components/3d/CorridorScene.tsx", "src/lib/3d"],
  hall: ["src/components/3d/EntranceHallScene.tsx", "src/lib/3d"],
  exterior: ["src/components/3d/ExteriorScene.tsx", "src/lib/3d"],
};

const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: REPO }).toString().trim(); } catch { return ""; } };

/** Unix timestamp of the last commit touching any of these paths. */
function lastTouched(paths) {
  const existing = paths.filter((p) => existsSync(resolve(REPO, p)));
  if (!existing.length) return 0;
  const out = git(`log -1 --format=%ct -- ${existing.map((p) => `"${p}"`).join(" ")}`);
  return Number(out) || 0;
}

function commitTime(sha) {
  if (!sha || sha === "unknown") return 0;
  return Number(git(`log -1 --format=%ct ${sha.replace(/-dirty$/, "")}`)) || 0;
}

const manifest = JSON.parse(readFileSync(resolve(REPO, "marketing/shots.manifest.json"), "utf8"));
const sceneTimes = Object.fromEntries(
  Object.entries(SCENE_SOURCES).map(([k, v]) => [k, lastTouched(v)]),
);

const rows = [];
for (const shot of manifest.shots) {
  const out = resolve(REPO, shot.out);
  const stampPath = `${out}.stamp.json`;
  const scenes = shot.scenes || [];
  const newestScene = Math.max(0, ...scenes.map((s) => sceneTimes[s] || 0));

  let status, detail, renderedAt = 0;
  if (!existsSync(out)) {
    status = "MISSING"; detail = "asset not rendered yet";
  } else if (!existsSync(stampPath)) {
    status = "UNKNOWN"; detail = "no stamp — rendered before provenance existed";
  } else {
    const st = JSON.parse(readFileSync(stampPath, "utf8"));
    renderedAt = commitTime(st.sceneCommit);
    const dirty = String(st.sceneCommit || "").endsWith("-dirty");
    if (!renderedAt) { status = "UNKNOWN"; detail = `unresolvable commit ${st.sceneCommit}`; }
    else if (renderedAt < newestScene) {
      status = "STALE";
      detail = `scene moved on ${new Date(newestScene * 1000).toISOString().slice(0, 10)}, asset is from ${new Date(renderedAt * 1000).toISOString().slice(0, 10)}`;
    } else { status = "OK"; detail = dirty ? "rendered from a dirty tree" : ""; }
  }
  rows.push({ id: shot.id, scenes: scenes.join(","), status, detail, out: shot.out });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ sceneTimes, rows }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\n${pad("STATUS", 9)}${pad("ID", 30)}${pad("SCENES", 18)}DETAIL`);
  console.log("-".repeat(112));
  const order = { STALE: 0, MISSING: 1, UNKNOWN: 2, OK: 3 };
  for (const r of rows.sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id))) {
    console.log(`${pad(r.status, 9)}${pad(r.id, 30)}${pad(r.scenes, 18)}${r.detail}`);
  }
  const n = (s) => rows.filter((r) => r.status === s).length;
  console.log(`\n${n("STALE")} stale · ${n("MISSING")} missing · ${n("UNKNOWN")} unknown · ${n("OK")} ok`);
  console.log("Re-render a scene's assets:  node scripts/marketing/render.mjs --scenes <scene>\n");
}

process.exitCode = rows.some((r) => r.status === "STALE") ? 1 : 0;
