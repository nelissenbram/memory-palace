#!/usr/bin/env node
/**
 * Re-render the 3D footage bank the 44 social clips are assembled from.
 *
 * The clips (socials-kit/clips/build-*.ps1) cut beats out of:
 *   work/corridor-dyn/*.mp4     corridor walks, one per wing
 *   work/persona-segs/*.mp4     hearth push-ins, one per persona
 *   scripts/hero_rec2/seg/*.mp4 exterior/hall beats (LANDSCAPE)
 *
 * All of it dates from 2026-08-29 — before the room and corridor overhauls — so
 * every clip still shows the old bronze-pail nest, bare hallways and the old
 * floor. This regenerates the bank from the current scenes.
 *
 * Two quality changes:
 *  - everything is shot NATIVE 1080x1920. The exterior beats used to be cropped
 *    608px wide out of a 1920x1080 landscape take and upscaled 1.78x to fill the
 *    frame (see $VCROP in build-40-final.ps1); shooting portrait removes that.
 *  - footage comes from the /staging viewers, which have no recorder chrome.
 *
 * Usage:
 *   node scripts/marketing/build-footage-bank.mjs           # everything
 *   node scripts/marketing/build-footage-bank.mjs corridor  # one group
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir } from "./kit.mjs";

const OUT = ensureDir(resolve(REPO, "socials-kit/footage"));
const REC = resolve(REPO, "scripts/marketing/record-segment.mjs");
const only = (process.argv[2] || "").toLowerCase();

const WINGS = ["roots", "nest", "craft", "travel", "passions"];

/** id, route, query, seconds. All 1080x1920. */
const BEATS = [
  // ── corridor: a walk per wing, plus left/right variants for cutting variety
  ...WINGS.map((w) => ({ group: "corridor", id: `walk-${w}`, route: "/staging/corridor", q: `wing=${w}&walk=1`, secs: 14 })),
  ...WINGS.map((w) => ({ group: "corridor", id: `walk-${w}-left`, route: "/staging/corridor", q: `wing=${w}&walk=left`, secs: 14 })),
  // ── corridor: the themed centrepiece of each wing, held still
  ...WINGS.map((w) => ({ group: "statue", id: `statue-${w}`, route: "/staging/corridor", q: `wing=${w}&cam=statue`, secs: 8 })),
  // ── room: the money shots
  { group: "room", id: "hearth-push", route: "/staging/room", q: "rmove=hearth", secs: 14 },
  { group: "room", id: "room-reveal", route: "/staging/room", q: "rmove=reveal", secs: 14 },
  { group: "room", id: "hearth-hold", route: "/staging/room", q: "rcam=hearth", secs: 8 },
  { group: "room", id: "velario", route: "/staging/room", q: "rcam=velario", secs: 8 },
  // ── exterior: NATIVE portrait, replacing the cropped-and-upscaled landscape beat
  { group: "exterior", id: "exterior-hero", route: "/staging/exterior", q: "ecam=hero", secs: 12 },
  { group: "exterior", id: "exterior-wide", route: "/staging/exterior", q: "", secs: 12 },
];

const todo = BEATS.filter((b) => !only || b.group === only);
if (!todo.length) {
  console.error(`No beats for "${only}". Groups: corridor, statue, room, exterior`);
  process.exit(1);
}

console.log(`${todo.length} beat(s) -> ${OUT.replace(REPO, ".")}\n`);
let done = 0, skipped = 0;
for (const b of todo) {
  const target = resolve(OUT, `${b.id}.mp4`);
  if (existsSync(target) && !process.argv.includes("--force")) {
    console.log(`= ${b.id} exists (use --force)`); skipped++; continue;
  }
  console.log(`● ${b.id}  [${b.group}]`);
  try {
    execFileSync(process.execPath, [REC, b.id, b.q, String(b.secs), "1080", "1920"], {
      stdio: "inherit", cwd: REPO,
      env: { ...process.env, ROUTE: b.route, MP_SEG_OUT: OUT },
    });
    done++;
  } catch {
    console.log(`  FAILED: ${b.id}`);
  }
}
console.log(`\n${done} rendered, ${skipped} skipped.`);
