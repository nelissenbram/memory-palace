#!/usr/bin/env node
/**
 * Ken-Burns beats over the demo photo library.
 *
 * The clip library had been 3D-only, which quietly decided what could be made:
 * every family had to argue through architecture. Several catalogue concepts
 * (LEGACY-05, -06, -07) open on PHOTOGRAPHS and only later cut to the palace,
 * and there was no way to shoot that.
 *
 * Source is scripts/populate/media — 1586 images across 42 seeded personas,
 * seven of them elders. That library sat unused for the whole clip build while
 * five stock demo images were recycled through every room shot.
 *
 * Each photo gets a slow push or pull with a drift, never a static hold: a still
 * photograph held still reads as a slideshow, and the whole point of these beats
 * is that the picture is being looked AT.
 *
 * Usage:
 *   node scripts/marketing/build-kenburns.mjs --list
 *   node scripts/marketing/build-kenburns.mjs kb-seventies
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir } from "./kit.mjs";

const MEDIA = resolve(REPO, "scripts/populate/media");
const OUT = ensureDir(resolve(REPO, "socials-kit/footage"));
const W = 1080, H = 1920, FPS = 30;

/**
 * A set is a list of photos with a move each. `z` is the zoom at the END of the
 * beat relative to the start: >1 pushes in, <1 pulls out. `pan` nudges the
 * centre so the move has a direction rather than merely scaling.
 */
const SETS = {
  // LEGACY-05 — "call your mother, ask her about 1974". Era-specific, warm,
  // domestic. Deliberately not the wedding: the clip is about ordinary years.
  "kb-seventies": {
    secs: 2.4,
    shots: [
      { f: "eleanor-remembers/nest-r0-m0.jpg", z: 1.10, pan: [+0.03, 0] },
      { f: "margit-garden/roots-r0-m0.jpg", z: 0.94, pan: [-0.02, +0.02] },
      { f: "beatrice-provence/nest-r0-m0.jpg", z: 1.12, pan: [0, -0.03] },
      { f: "arthur-ink/roots-r0-m0.jpg", z: 0.92, pan: [+0.02, 0] },
    ],
  },
  // LEGACY-06 — one gift, filled over a year: childhood, the wedding, the
  // grandchildren. Three photos that read as three decades.
  "kb-ayear": {
    secs: 2.8,
    shots: [
      { f: "giovanni-del-mare/roots-r0-m0.jpg", z: 1.09, pan: [0, +0.02] },
      { f: "eleanor-remembers/nest-r0-m1.jpg", z: 1.11, pan: [-0.02, 0] },
      { f: "rosa-baila/nest-r0-m0.jpg", z: 0.93, pan: [+0.03, 0] },
    ],
  },
};

const args = process.argv.slice(2);
if (args.includes("--list")) {
  for (const [k, v] of Object.entries(SETS)) console.log(`${k.padEnd(16)}${v.shots.length} shots`);
  process.exit(0);
}
const only = args[0];
const todo = only ? Object.entries(SETS).filter(([k]) => k === only) : Object.entries(SETS);
if (!todo.length) { console.error(`No set "${only}". Known: ${Object.keys(SETS).join(", ")}`); process.exit(1); }

for (const [id, set] of todo) {
  const frames = Math.round(set.secs * FPS);
  const parts = [];
  set.shots.forEach((s, i) => {
    const src = resolve(MEDIA, s.f);
    if (!existsSync(src)) { console.log(`   missing ${s.f} — skipped`); return; }
    const out = resolve(OUT, `_kb-${id}-${i}.mp4`);
    /**
     * ⚠️ Upscale BEFORE zoompan. zoompan samples its output grid from the input
     * frame, so panning a 1080-wide source produces visible stair-stepping on
     * the diagonals — the classic "why does my Ken Burns shimmer". Scaling to 4x
     * first costs nothing here and removes it entirely.
     */
    const zExpr = s.z >= 1
      ? `1+${(s.z - 1).toFixed(3)}*on/${frames}`
      : `${s.z.toFixed(3)}+${(1 - s.z).toFixed(3)}*(1-on/${frames})`;
    const xExpr = `iw/2-(iw/zoom/2)+${(s.pan[0] * 400).toFixed(0)}*on/${frames}`;
    const yExpr = `ih/2-(ih/zoom/2)+${(s.pan[1] * 400).toFixed(0)}*on/${frames}`;
    execSync(
      `ffmpeg -y -v error -loop 1 -framerate ${FPS} -t ${set.secs} -i "${src}" `
      + `-vf "scale=${W * 4}:-1,`
      + `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${W}x${H}:fps=${FPS},`
      + `format=yuv420p" -t ${set.secs} `
      + `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r ${FPS} -an "${out}"`,
      { stdio: "inherit" },
    );
    parts.push(out);
  });
  if (!parts.length) { console.log(`   ${id}: no shots — skipped`); continue; }

  // Cross-dissolve the stills into one beat, so build-clips can slice it like
  // any other footage rather than juggling four files per clip.
  const XF = 0.5;
  const ins = parts.map((p) => `-i "${p}"`).join(" ");
  let chain = `[0:v]format=yuv420p,settb=AVTB[x0]`;
  let acc = set.secs;
  for (let i = 1; i < parts.length; i++) {
    chain += `;[${i}:v]format=yuv420p,settb=AVTB[s${i}]`;
    chain += `;[x${i - 1}][s${i}]xfade=transition=fade:duration=${XF}:offset=${(acc - XF).toFixed(2)}[x${i}]`;
    acc += set.secs - XF;
  }
  const final = resolve(OUT, `${id}.mp4`);
  execSync(`ffmpeg -y -v error ${ins} -filter_complex "${chain}" -map "[x${parts.length - 1}]" `
    + `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r ${FPS} -an "${final}"`, { stdio: "inherit" });
  for (const p of parts) execSync(`node -e "require('fs').rmSync(process.argv[1],{force:true})" "${p}"`);
  console.log(`   ${id}  ${parts.length} shots  ${acc.toFixed(1)}s -> ${final.replace(REPO, ".")}`);
}
