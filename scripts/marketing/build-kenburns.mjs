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
      // ⚠️ Was rosa-baila/nest-r0-m0 — a man at a bar, under a caption reading
      // "month 12: the grandchildren's wing". Not merely the wrong style, the
      // wrong subject: no child appeared in the beat that claimed one.
      { f: "chidi-okafor/nest-r0-m0.jpg", z: 0.93, pan: [+0.03, 0] },
    ],
  },
  /**
   * The three photographs that hang over the mantel, in the order the room's
   * hero rotation uses them. Byte-identical to public/demo — verified, not
   * assumed — so a clip can open on the photograph in the hand and cut to the
   * SAME photograph on the wall. That match is the whole argument of LEGACY-02,
   * and it only works because these are one file, not a lookalike.
   */
  "kb-mantel": {
    secs: 3.0,
    shots: [
      { f: "eleanor-remembers/nest-r0-m1.jpg", z: 1.08, pan: [0, +0.02] },   // the wedding, 1961
      { f: "eleanor-remembers/nest-r0-m0.jpg", z: 1.10, pan: [+0.02, 0] },   // still dancing, 1974
      { f: "beatrice-provence/nest-r0-m0.jpg", z: 0.94, pan: [-0.02, 0] },   // the long walk, 1996
    ],
  },
};

/**
 * A single-shot push into a SCREENSHOT, for OWNED-03: open on the whole settings
 * page with the privacy note illegibly small, end filling the frame with that
 * paragraph, legible. `crop` is the region to end on in source pixels
 * [w,h,x,y]; the move eases from the full frame to it. crop's own eval=frame is
 * absent in this ffmpeg build, so the pan is expressed through zoompan's x/y.
 */
const PUSHES = {
  "kb-privacy-note": {
    file: "socials-kit/screens/settings-connections.png",
    secs: 8.0, crop: [1040, 300, 20, 1200],
  },
};
for (const [id, s] of Object.entries(PUSHES)) {
  if (process.argv[2] && process.argv[2] !== id) continue;
  const src = resolve(REPO, s.file);
  if (!existsSync(src)) { console.log(`   missing ${s.file} — skipped`); continue; }
  const [W2, H2] = [1080, 1920];
  const frames = Math.round(s.secs * FPS);
  const [cw, ch, cx, cy] = s.crop;
  const endZoom = Math.min(W2 / cw, H2 / ch);
  const cxCenter = cx + cw / 2, cyCenter = cy + ch / 2;
  const zExpr = `1+(${(endZoom - 1).toFixed(4)})*(0.5-0.5*cos(PI*on/${frames}))`;
  const xExpr = `(${cxCenter}-iw/2)*(0.5-0.5*cos(PI*on/${frames}))+iw/2-(iw/zoom/2)`;
  const yExpr = `(${cyCenter}-ih/2)*(0.5-0.5*cos(PI*on/${frames}))+ih/2-(ih/zoom/2)`;
  execSync(
    `ffmpeg -y -v error -loop 1 -framerate ${FPS} -t ${s.secs} -i "${src}" `
    + `-vf "scale=${W2}:${H2}:force_original_aspect_ratio=increase,crop=${W2}:${H2},`
    + `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${W2}x${H2}:fps=${FPS},`
    + `format=yuv420p" -t ${s.secs} `
    + `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r ${FPS} -an "${resolve(OUT, id + ".mp4")}"`,
    { stdio: "inherit" },
  );
  console.log(`   ${id}  ${s.secs}s  -> ${resolve(OUT, id + ".mp4").replace(REPO, ".")}`);
  if (process.argv[2] === id) process.exit(0);
}

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
      // ⚠️ COVER, then crop, before zoompan. Scaling to width alone and letting
      // zoompan output 1080x1920 squashes the frame into the target shape: a
      // 1152x896 landscape source came out with everyone stretched tall. Cover
      // the 9:16 box at 4x and crop to it, so the only thing zoompan changes is
      // which part of an already-correct frame you are looking at.
      + `-vf "scale=${W * 4}:${H * 4}:force_original_aspect_ratio=increase,`
      + `crop=${W * 4}:${H * 4},`
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
