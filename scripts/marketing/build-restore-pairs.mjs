#!/usr/bin/env node
/**
 * Before/after restore beats, without spending Replicate credits.
 *
 * The RESTORE family needs one thing: a photograph that is visibly ruined, and
 * the same photograph repaired. Rather than run real archive scans through the
 * paid pipeline, this goes the other way — take a COLOUR photo, age it into a
 * damaged monochrome print, and let the reveal return to the original.
 *
 * ⚠️ Is that honest? Yes for the TRANSFORMATION, with one caveat worth stating.
 * /api/ai-enhance routes a monochrome input to Kontext restore-image, which
 * restores AND colourises in a single pass (falling back to GFPGAN + DDColor).
 * So "damaged black-and-white in, clean colour out" is exactly what the product
 * does with an old print — checked in the route, not assumed.
 *
 * The caveat: the "after" here is the untouched original, where a real run would
 * show the model's colourisation, which is close but not identical. This is
 * therefore a best-case depiction of a real capability, not a captured result.
 * Do not caption these clips as "actual output".
 *
 * Usage:
 *   node scripts/marketing/build-restore-pairs.mjs --list
 *   node scripts/marketing/build-restore-pairs.mjs rp-couple
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir } from "./kit.mjs";

const MEDIA = resolve(REPO, "scripts/populate/media");
const OUT = ensureDir(resolve(REPO, "socials-kit/footage"));
const W = 1080, H = 1920, FPS = 30;

/**
 * The ageing chain. Each step is something that actually happens to a print
 * left in a drawer for sixty years, which is why it reads as damage rather than
 * as a filter:
 *   hue s=0        the silver image has no colour left
 *   curves         contrast collapses; blacks lift, whites go dirty
 *   colorbalance   what remains drifts warm — the sepia of oxidised silver
 *   noise          grain plus the speckle of foxing
 *   vignette       edges darken where the print was handled and light-struck
 */
const AGE = [
  "hue=s=0",
  "curves=all='0/0.10 0.25/0.30 0.75/0.78 1/0.90'",
  "colorbalance=rm=0.10:gm=0.04:bm=-0.10:rh=0.08:bh=-0.08",
  "eq=contrast=0.88:saturation=0",
  "noise=alls=14:allf=t+u",
  "vignette=angle=PI/3.6",
  "gblur=sigma=0.7",
].join(",");

/** The repaired look: the original, lifted a little so the reveal has snap. */
const FRESH = "eq=contrast=1.06:saturation=1.05:gamma=1.02";

const SETS = {
  // Faces, so the reveal lands where the family's whole argument is.
  // ⚠️ Sources are chosen by MEASURED saturation. The first pick here was a
  // couple dancing that reads beautifully and scores 1.06 — it is already
  // monochrome, so ageing it changed nothing and the wipe revealed grey to grey.
  // A restore clip needs an original with colour to come back TO.
  "rp-couple": { src: "rosa-baila/nest-r0-m0.jpg", secs: 7.0 },      // SAT 37.0
  "rp-wedding": { src: "eleanor-remembers/nest-r0-m1.jpg", secs: 7.0 }, // SAT 28.1
  "rp-lane": { src: "beatrice-provence/nest-r0-m0.jpg", secs: 7.0 },   // SAT 15.1
};

/**
 * Below this, ageing a photo is a no-op and the reveal shows nothing. Measured
 * with signalstats rather than eyeballed, and it FAILS rather than producing a
 * clip in which nothing happens — a silent dud is the expensive kind.
 */
const MIN_SAT = 8;

const args = process.argv.slice(2);
if (args.includes("--list")) {
  for (const [k, v] of Object.entries(SETS)) console.log(`${k.padEnd(12)}${v.src}`);
  process.exit(0);
}
const only = args[0];
const todo = only ? Object.entries(SETS).filter(([k]) => k === only) : Object.entries(SETS);
if (!todo.length) { console.error(`No set "${only}". Known: ${Object.keys(SETS).join(", ")}`); process.exit(1); }

for (const [id, set] of todo) {
  const src = resolve(MEDIA, set.src);
  if (!existsSync(src)) { console.log(`   missing ${set.src} — skipped`); continue; }
  /**
   * Saturation gate. ffmpeg writes metadata=print to its LOG stream, so the
   * value has to be read from stderr — piping stdout returns an empty string and
   * every source then scores 0.
   */
  // 2>&1, because execSync returns STDOUT and ffmpeg logs to stderr; asking for
  // stderr via stdio:["ignore","ignore","pipe"] returns null from execSync.
  let probe = "";
  try {
    probe = execSync(
      `ffmpeg -v info -i "${src}" -vf "scale=200:-1,signalstats,metadata=print" -f null - 2>&1`,
      { maxBuffer: 1 << 24 },
    ).toString();
  } catch (e) { probe = String(e.stdout || ""); }
  const sat = Number(probe.match(/SATAVG=([0-9.]+)/)?.[1] || 0);
  if (sat < MIN_SAT) {
    console.log(`   ${id}: source saturation ${sat.toFixed(1)} < ${MIN_SAT} — nothing to restore to, SKIPPED`);
    continue;
  }
  const out = resolve(OUT, `${id}.mp4`);
  const frames = Math.round(set.secs * FPS);
  // The wipe crosses the middle of the beat, so the damage has time to be read
  // before it is undone, and the repaired face has time to land after.
  const wipeStart = 0.42, wipeEnd = 0.62;

  /**
   * ⚠️ A WIPE, not a switch and not a slide, done with `blend`.
   *
   * `overlay ... enable='gte(t,x)'` snaps the whole frame at once and reads as a
   * jump cut. Sliding the restored layer across would move the subject. The
   * obvious fix — crop the repaired copy to a growing width — needs crop's
   * eval=frame, and this ffmpeg build has no such option on crop ("Option not
   * found"), because by default crop sizes itself once at init where `t` does
   * not exist yet.
   *
   * blend evaluates per pixel per frame and has T, X and W, so the wipe front is
   * just an inequality: left of it show the repaired image, right of it the
   * ruined one. No geometry moves, which is exactly what a wipe should be.
   */
  const t0 = (set.secs * wipeStart).toFixed(2);
  const dur = (set.secs * (wipeEnd - wipeStart)).toFixed(2);
  const wipe = `if(lte(X\,W*(T-${t0})/${dur})\,B\,A)`;

  execSync(
    `ffmpeg -y -v error -loop 1 -framerate ${FPS} -t ${set.secs} -i "${src}" `
    + `-filter_complex "`
    + `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},`
    + `zoompan=z='1+0.05*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':`
    + `d=${frames}:s=${W}x${H}:fps=${FPS},split=2[a][b];`
    + `[a]${AGE},format=gbrp[old];`
    + `[b]${FRESH},format=gbrp[new];`
    + `[old][new]blend=all_expr='${wipe}',format=yuv420p[mix]" `
    + `-map "[mix]" -t ${set.secs} `
    + `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r ${FPS} -an "${out}"`,
    { stdio: "inherit" },
  );
  console.log(`   ${id}  ${set.secs}s  ${set.src}  -> ${out.replace(REPO, ".")}`);
}
