#!/usr/bin/env node
/**
 * Rebuild public/video/walkthrough-tour.mp4 end-to-end, reproducibly.
 *
 * Replaces the old undocumented chain. build_tour.mjs consumed seven "graded"
 * segments in scripts/hero_rec2/seg2/ that nothing in the repo produced — the
 * grading/cutting was manual, so the tour could not be rebuilt without guessing.
 * Here the whole chain is declared: record -> trim -> xfade -> publish -> stamp.
 *
 * All seven segments are re-recorded (not just the stale corridor/room ones) so
 * every take passes through the SAME grade in record-segment.mjs; matching an
 * unknown legacy grade by eye would have risked a visible colour jump exactly at
 * the hall->corridor cut.
 *
 * Usage:
 *   node scripts/marketing/build-tour.mjs            # record what's missing, then assemble
 *   node scripts/marketing/build-tour.mjs --force    # re-record everything
 *   node scripts/marketing/build-tour.mjs --assemble # assemble from existing takes
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir, stamp, paths } from "./kit.mjs";

const SEG = ensureDir(resolve(REPO, "scripts/hero_rec2/seg3"));
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ASSEMBLE_ONLY = args.includes("--assemble");

/**
 * The tour, declared. `record` is how long to capture; `from`/`dur` is the window
 * kept in the cut. Durations mirror the original 31.1 s tour so the landing
 * section, its poster and the JSON-LD duration stay valid.
 * `xfadeIn` = crossfade INTO this segment (0.5 s at the two structural joins).
 */
// ⚠️ Windows matter as much as the takes. The first cut sampled `walk=right` at
// 5-9 s — by then the camera is deep in a BARE stretch of corridor, past every
// plant, bench and statue, so the rebuilt corridor read as the old empty one.
// The room cuts had the mirror problem: sliced from the slow START of a 13 s
// eased dolly, so the push-in never arrived at the chimneypiece. Corridor cuts
// now sit early (furniture in frame), room cuts late (the payoff).
const SEGMENTS = [
  { id: "s0", query: "scene=exterior",                        record: 11, from: 1.0, dur: 6.5, xfadeIn: 0 },
  { id: "s1", query: "scene=hall",                            record: 9,  from: 1.0, dur: 5.5, xfadeIn: 0.3 },
  { id: "s2", query: "scene=corridor&walk=1&wing=roots",      record: 13, from: 0.5, dur: 7.0, xfadeIn: 0.5 },
  { id: "s3", query: "scene=corridor&walk=left&wing=roots",   record: 13, from: 0.6, dur: 2.5, xfadeIn: 0.2 },
  { id: "s4", query: "scene=corridor&walk=right&wing=roots",  record: 13, from: 0.8, dur: 4.0, xfadeIn: 0.5 },
  { id: "s5", query: "scene=room&fill=max&rmove=reveal",      record: 13, from: 6.0, dur: 4.0, xfadeIn: 0.2 },
  { id: "s6", query: "scene=room&fill=max&rmove=hearth",      record: 13, from: 8.8, dur: 3.5, xfadeIn: 0.2 },
];

const ff = (cmd) => execSync(`ffmpeg -y -v error ${cmd}`, { stdio: "inherit" });
const dur = (f) => Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());

// ── 1. record ────────────────────────────────────────────────────────────────
if (!ASSEMBLE_ONLY) {
  for (const s of SEGMENTS) {
    const out = resolve(SEG, `${s.id}.mp4`);
    if (existsSync(out) && !FORCE) { console.log(`= ${s.id} exists, skipping (use --force to re-record)`); continue; }
    console.log(`\n● recording ${s.id}: ${s.query}`);
    execFileSync(process.execPath,
      [resolve(REPO, "scripts/marketing/record-segment.mjs"), s.id, s.query, String(s.record), "1920", "1080"],
      { stdio: "inherit", cwd: REPO });
  }
}

// ── 2+3. trim AND crossfade in ONE pass ──────────────────────────────────────
// ⚠️ This used to trim each take (encode #2), then chain them pairwise, with every
// xfade re-encoding the whole accumulated chain again. By the last join s0 had
// been through SEVEN generations of lossy encoding and the tour looked soft.
// Input seeking (-ss/-t before -i) does the trimming for free, and one
// filter_complex does all six crossfades, so the whole assembly is a single
// encode. Generations: webm capture -> segment mp4 -> this. That's it.
console.log("\n● trim + chain (single pass)");
const inputs = SEGMENTS.map((s) => {
  const src = resolve(SEG, `${s.id}.mp4`);
  if (!existsSync(src)) throw new Error(`missing take: ${src} (run without --assemble)`);
  console.log(`   ${s.id}  ${s.from}s +${s.dur}s`);
  return `-ss ${s.from} -t ${s.dur} -i "${src}"`;
}).join(" ");

// offset_i = (timeline length so far) - (this crossfade's duration)
let running = SEGMENTS[0].dur;
const steps = [];
let label = "0:v";
for (let i = 1; i < SEGMENTS.length; i++) {
  const d = SEGMENTS[i].xfadeIn;
  const offset = (running - d).toFixed(3);
  const out = i === SEGMENTS.length - 1 ? "vout" : `v${i}`;
  steps.push(`[${label}][${i}:v]xfade=transition=fade:duration=${d}:offset=${offset}[${out}]`);
  running = running + SEGMENTS[i].dur - d;
  label = out;
}

const final = resolve(SEG, "walkthrough-tour.mp4");
// CRF 23 with a 6M ceiling. CRF 27 was too aggressive once it was the ONLY lossy
// step; an earlier CRF 20 pass produced 30 MB against the 9 MB the page carried.
ff(`${inputs} -filter_complex "${steps.join(";")}" -map "[vout]" ` +
   `-c:v libx264 -crf 23 -maxrate 6M -bufsize 12M -preset slow -r 30 ` +
   `-pix_fmt yuv420p -movflags +faststart -an "${final}"`);
const target = resolve(paths.video, "walkthrough-tour.mp4");
copyFileSync(final, target);

// Posters from the closing mantel beat — the hero frame of the product.
// BOTH are regenerated: walkthrough-poster-v2.jpg is what TourPlayer shows, and
// tour-poster.jpg is the thumbnailUrl in the JSON-LD VideoObject (i.e. the frame
// Google displays). The latter was still from 17/07 and easy to miss.
const total = dur(final);
const posters = ["walkthrough-poster-v2.jpg", "tour-poster.jpg"].map((n) => resolve(paths.video, n));
for (const p of posters) ff(`-ss ${total - 1.2} -i "${final}" -frames:v 1 -q:v 3 "${p}"`);

stamp(target, { segments: SEGMENTS.map((s) => s.id), durationSec: total });
console.log(`\n✓ ${target.replace(REPO, ".")}  ${total.toFixed(1)}s`);
for (const p of posters) console.log(`✓ ${p.replace(REPO, ".")}`);
console.log(`\nNext: bump VideoObject uploadDate + duration in src/app/LandingV2Client.tsx (PT${Math.round(total)}S).`);
