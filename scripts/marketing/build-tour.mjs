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
const SEGMENTS = [
  { id: "s0", query: "scene=exterior",                        record: 11, from: 1.0, dur: 6.5, xfadeIn: 0 },
  { id: "s1", query: "scene=hall",                            record: 9,  from: 1.0, dur: 5.5, xfadeIn: 0.3 },
  { id: "s2", query: "scene=corridor&walk=1&wing=roots",      record: 13, from: 0.5, dur: 7.0, xfadeIn: 0.5 },
  { id: "s3", query: "scene=corridor&walk=left&wing=roots",   record: 13, from: 3.0, dur: 2.5, xfadeIn: 0.2 },
  { id: "s4", query: "scene=corridor&walk=right&wing=roots",  record: 13, from: 5.0, dur: 4.0, xfadeIn: 0.5 },
  { id: "s5", query: "scene=room&fill=max&rmove=reveal",      record: 13, from: 2.0, dur: 4.0, xfadeIn: 0.2 },
  { id: "s6", query: "scene=room&fill=max&rmove=hearth",      record: 13, from: 4.0, dur: 3.5, xfadeIn: 0.2 },
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

// ── 2. trim each take to its cut window ──────────────────────────────────────
console.log("\n● trimming");
const cuts = [];
for (const s of SEGMENTS) {
  const src = resolve(SEG, `${s.id}.mp4`);
  if (!existsSync(src)) throw new Error(`missing take: ${src} (run without --assemble)`);
  const cut = resolve(SEG, `cut_${s.id}.mp4`);
  // re-encode (not stream copy) so every cut starts on a keyframe — xfade needs it
  ff(`-ss ${s.from} -i "${src}" -t ${s.dur} -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 -an "${cut}"`);
  cuts.push({ ...s, file: cut });
  console.log(`   ${s.id}  ${s.from}s +${s.dur}s`);
}

// ── 3. chain with xfades ─────────────────────────────────────────────────────
console.log("\n● chaining");
let cur = cuts[0].file;
for (let i = 1; i < cuts.length; i++) {
  const d = cuts[i].xfadeIn;
  const off = dur(cur) - d;
  const out = resolve(SEG, `chain_${i}.mp4`);
  ff(`-i "${cur}" -i "${cuts[i].file}" -filter_complex ` +
     `"[0:v][1:v]xfade=transition=fade:duration=${d}:offset=${off}" ` +
     `-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 -an "${out}"`);
  cur = out;
  console.log(`   + ${cuts[i].id} (xfade ${d}s)`);
}

// ── 4. publish ───────────────────────────────────────────────────────────────
const final = resolve(SEG, "walkthrough-tour.mp4");
// CRF 27 + a hard bitrate ceiling: this is a landing-page video, and the whole
// point is that visitors actually see it. An earlier pass shipped CRF 20, which
// looked identical in a still but tripled the file to 30 MB against the 9 MB the
// page used to carry. Intermediate chains stay at CRF 18 so only the final
// encode is lossy-for-delivery.
ff(`-i "${cur}" -c:v libx264 -crf 27 -maxrate 3M -bufsize 6M -preset slow ` +
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
