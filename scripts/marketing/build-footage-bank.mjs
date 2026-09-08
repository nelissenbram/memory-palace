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
  // walking the salon hang, camera angled at the wall (not merely offset)
  ...["roots","nest"].map((w) => ({ group: "corridor", id: `walk-${w}-wall`, route: "/staging/corridor", q: `wing=${w}&walk=wall`, secs: 14 })),
  // ── corridor: the themed centrepiece of each wing, held still
  ...WINGS.map((w) => ({ group: "statue", id: `statue-${w}`, route: "/staging/corridor", q: `wing=${w}&cam=statue`, secs: 8 })),
  // ── room: the money shots
  { group: "room", id: "hearth-push", route: "/staging/room", q: "rmove=hearth", secs: 14 },
  { group: "room", id: "room-walkin", route: "/staging/room", q: "rmove=walkin", secs: 14 },
  // ⚠️ Hero VARIANTS. Every room beat was shot from the same default deck, so
  // five clips all ended on the same photograph of the same two people and the
  // palace looked like it held one memory. ?hero=N rotates which photo hangs
  // over the mantel (and brings its own titles with it).
  ...[1, 2, 3, 4].map((n) => ({ group: "room", id: `room-walkin-h${n}`,
    route: "/staging/room", q: `rmove=walkin&hero=${n}`, secs: 14 })),
  ...[1, 2].map((n) => ({ group: "room", id: `room-pullback-h${n}`,
    route: "/staging/room", q: `rmove=pullback&hero=${n}`, secs: 17 })),
  { group: "room", id: "hearth-hold-h3", route: "/staging/room", q: "rcam=hearth&hero=3", secs: 8 },  // ~5.6 m at ROOM_PACE 0.45 = ~10 s move; headroom to cut from
  { group: "room", id: "room-reveal", route: "/staging/room", q: "rmove=reveal", secs: 14 },
  { group: "room", id: "hearth-hold", route: "/staging/room", q: "rcam=hearth", secs: 8 },
  { group: "room", id: "velario", route: "/staging/room", q: "rmove=ceiling", secs: 13 },
  // ── exterior: NATIVE portrait, replacing the cropped-and-upscaled landscape beat
  // ── corridor GROWING: one take per room count, same camera. The hall's length
  // is totalSlots*spacing+14, so adding rooms literally extends the architecture
  // — this is the "a life assembling" footage, without the onboarding sequence.
  ...[1, 3, 5, 8].map((n, i) => ({ group: "grow", id: `corridor-grow${i + 1}`,
    route: "/staging/corridor", q: `wing=roots&rooms=${n}&cam=terminus`, secs: 4 })),
  // a held shot of one named door, for the "doors are chapters" beats
  ...[0, 1, 2, 3].map((n) => ({ group: "corridor", id: `corridor-door${n + 1}`,
    route: "/staging/corridor", q: `wing=roots&cam=door&door=${n}`, secs: 6 })),
  // ── exterior: ONE long unbroken orbit for the "no cuts" clip. Deliberately
  // longer than the beat that uses it, so the take never has to be spliced.
  { group: "exterior", id: "exterior-long", route: "/staging/exterior", q: "ecam=orbit", secs: 24 },
  { group: "exterior", id: "exterior-lookup", route: "/staging/exterior", q: "ecam=lookup", secs: 25 },

  // ── corridor: the double doors at the end, for arrival beats
  { group: "corridor", id: "corridor-portal", route: "/staging/corridor", q: "wing=roots&cam=portal", secs: 8 },
  // ── room: the reverse dolly (one photo -> the whole room) and the library nook
  { group: "room", id: "room-pullback", route: "/staging/room", q: "rmove=pullback", secs: 17 },
  { group: "room", id: "room-library", route: "/staging/room", q: "rcam=libshelf", secs: 8 },
  // ── room tiers, IDENTICAL camera per take so they match-cut cleanly. This is
  // the whole point of WONDER-05: the room widens, the lens does not move.
  // ⚠️ wallcount is a MEMORY COUNT, not a bay index. tierForCount buckets it at
  // 6 / 16 / 32, so 1-2-3-4 all land in "Intimate" and the four takes came out
  // pixel-identical — a match-cut sequence with nothing to cut between. These
  // are one count per tier. Growth is depth-only (sizeForRoom freezes rW/rH),
  // so the room gets LONGER, which is what ?rcam=plan is pointed down.
  ...[3, 10, 24, 40].map((n, i) => ({ group: "tier", id: `room-tier${i + 1}`,
    route: "/staging/room", q: `rcam=plan&wallcount=${n}`, secs: 4 })),

  { group: "exterior", id: "exterior-hero", route: "/staging/exterior", q: "ecam=orbit", secs: 14 },
  { group: "exterior", id: "exterior-wide", route: "/staging/exterior", q: "", secs: 12 },
];

// Match a GROUP or a single BEAT ID. Re-rendering a whole group to refresh one
// beat costs ~10 takes of 14 s each, which is why a scene tweak used to mean
// either a long wait or a stale bank.
const todo = BEATS.filter((b) => !only || b.group === only || b.id === only);
if (!todo.length) {
  console.error(`No beats for "${only}". Groups: corridor, statue, room, exterior`);
  console.error(`Or pass a beat id, e.g. room-walkin.`);
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
