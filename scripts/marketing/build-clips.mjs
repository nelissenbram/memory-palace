#!/usr/bin/env node
/**
 * Declarative builder for the 9:16 social clips.
 *
 * Replaces the PowerShell wave scripts (build-40-final.ps1 and friends), which
 * worked but hid each clip's structure inside positional function arguments —
 * `ExtCor "WONDER-01a" "WONDER" "slug" "$CD\walk-craft.mp4" "music.mp3" 60 1.1` —
 * so you could not see a clip's shape without reading the function body.
 *
 * Here a clip is a list of beats. That matters for this rebuild because the
 * montage changes, not just the footage: the room/corridor overhaul added the
 * velario ceiling, five themed wing centrepieces and a proper hearth push-in,
 * none of which the old recipes could show.
 *
 * Footage comes from socials-kit/footage (build-footage-bank.mjs) — native
 * 1080x1920, so no beat is cropped out of landscape and upscaled any more.
 *
 * Usage:
 *   node scripts/marketing/build-clips.mjs --list
 *   node scripts/marketing/build-clips.mjs --id WONDER-01a
 *   node scripts/marketing/build-clips.mjs --family WONDER
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir } from "./kit.mjs";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const SRC = `${KIT}/src`;              // typography cards (hook/caption/endcard)
const MUSIC = `${KIT}/music`;
const FOOT = resolve(REPO, "socials-kit/footage");
const WORK = ensureDir(resolve(REPO, "socials-kit/clipwork"));
const OUT = ensureDir(resolve(REPO, "socials-kit/clips-v2"));

const ENC = "-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an";

/**
 * Filmic grade for 3D beats (owner: "kan het paleis filmischer ipv straight?").
 * The renderer output is clean and even — technically correct, but flat, because
 * real lenses and film stock are none of those things. Four cheap cues do most
 * of the work:
 *   curves    a gentle S — lifted-but-cool shadows, rolled-off highlights
 *   colorbalance  warm highlights against cooler shadows (the classic split-tone)
 *   vignette  draws the eye off the frame edge
 *   noise     a whisper of grain so flat walls stop looking like vector fills
 * Kept subtle: this should read as "shot" and not as "filtered".
 */
const FILMIC = [
  // ⚠️ Second pass overshot into magenta: a screen-blend bloom lifts everything,
  // and stacked on warm highlights (+red) with lifted-blue shadows it tinted the
  // whole frame pink. Bloom is now gentle and neutral, the warm/cool split is
  // halved, and the lift lives in the curve rather than in the blend.
  "curves=r='0/0.016 0.22/0.190 0.78/0.820 1/0.980':g='0/0.016 0.22/0.192 0.78/0.815 1/0.980':b='0/0.026 0.22/0.205 0.78/0.800 1/0.968'",
  "colorbalance=rs=-0.018:gs=-0.008:bs=0.034:rh=0.040:gh=0.016:bh=-0.030",
  "eq=contrast=1.10:saturation=1.06:gamma=0.985",
  "split[a][b];[b]gblur=sigma=22,curves=all='0/0 0.80/0.02 1/0.30'[bl];[a][bl]blend=all_mode=screen:all_opacity=0.15",
  "vignette=angle=PI/4.4",
  "noise=alls=6:allf=t+u",
].join(",");

/** Half-strength: warmth and a little contrast, no bloom, gentle vignette. */
const FILMIC_SOFT = [
  "curves=r='0/0.010 0.22/0.205 0.78/0.830 1/0.988':g='0/0.010 0.22/0.206 0.78/0.826 1/0.988':b='0/0.016 0.22/0.214 0.78/0.816 1/0.980'",
  "colorbalance=rs=-0.010:gs=-0.004:bs=0.018:rh=0.024:gh=0.010:bh=-0.018",
  "eq=contrast=1.05:saturation=1.03",
  "vignette=angle=PI/6.0",
  "noise=alls=4:allf=t+u",
].join(",");
const ff = (a) => execSync(`ffmpeg -y -v error ${a}`, { stdio: "inherit" });
const dur = (f) => Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());

/**
 * A still card held for `secs`, fading in and (optionally) out.
 *
 * With `sheen`, the card stops being a freeze-frame: a very slow push-in plus a
 * single soft band of light that travels across it once, the way afternoon sun
 * crosses a marble wall. Deliberately understated — the end card is the last
 * thing on screen and should feel like a room settling, not like an animation.
 *
 * The band is a Gaussian in (x + 1.6y), so it lies on a shallow diagonal, and it
 * is screen-blended at low opacity: that lifts the highlights and leaves the
 * blacks alone, where a straight brightness bump would grey the whole card.
 */
function card(png, out, secs, fadeOut = true, sheen = false) {
  const fade = `fade=t=in:st=0:d=0.35${fadeOut ? `,fade=t=out:st=${(secs - 0.4).toFixed(2)}:d=0.4` : ""}`;
  if (!sheen) {
    ff(`-loop 1 -framerate 30 -t ${secs} -i "${png}" -vf "${fade},format=yuv420p" ${ENC} "${out}"`);
    return;
  }
  const W = 1080, H = 1920, F = Math.round(secs * 30);
  const SPAN = W + 1.6 * H;                       // diagonal extent the band crosses
  // Travels from just off one corner to just past the other across the hold.
  const pos = `${SPAN.toFixed(0)}*(-0.20+1.40*T/${secs})`;
  ff(
    `-loop 1 -framerate 30 -t ${secs} -i "${png}" ` +
    `-f lavfi -t ${secs} -i "color=c=black:s=${W}x${H}:r=30" ` +
    `-filter_complex "` +
    // 1.05 over the whole hold — a push you feel rather than see.
    `[0:v]scale=${W}:${H},zoompan=z='1+0.05*on/${F}':d=${F}:s=${W}x${H}:fps=30,format=gbrp[base];` +
    `[1:v]format=gray,geq=lum='255*exp(-pow((X+1.6*Y-(${pos}))/330,2))',format=gbrp[band];` +
    `[base][band]blend=all_mode=screen:all_opacity=0.11,${fade},format=yuv420p[v]" ` +
    `-map "[v]" -t ${secs} ${ENC} "${out}"`,
  );
}

/**
 * A slice of footage, optionally with a caption card faded over it.
 * `from` picks the window: the beats are 8-14s takes and the interesting part is
 * rarely at second zero — the tour rebuild showed how much a cut window matters.
 */
function beat(src, out, { secs, from = 0, cap = null, capIn = 0.8, capOut = null, raw = false, grade = "full" }) {
  const co = capOut ?? secs - 0.6;
  // `raw` skips the filmic pass: the phone inlay is UI, and grading it green-
  // shifts screenshots that must look like the real app.
  // `grade` picks the strength. The corridor took the full pass badly: its long
  // vaulted perspective already darkens toward the far end, so vignette+toe
  // stacked into murk. "soft" keeps the warmth and drops the heavy lifting.
  const G = raw ? "null" : (grade === "soft" ? FILMIC_SOFT : FILMIC);
  if (cap) {
    ff(`-ss ${from} -i "${src}" -loop 1 -i "${cap}" -filter_complex ` +
       `"[0:v]trim=0:${secs},setpts=PTS-STARTPTS,${G},format=yuv420p[b];` +
       `[1:v]format=rgba,fade=t=in:st=${capIn}:d=0.4:alpha=1,fade=t=out:st=${co}:d=0.4:alpha=1[c];` +
       `[b][c]overlay=0:0:shortest=1,format=yuv420p[v]" -map "[v]" -t ${secs} ${ENC} "${out}"`);
  } else {
    ff(`-ss ${from} -i "${src}" -vf "trim=0:${secs},setpts=PTS-STARTPTS,${G},format=yuv420p" -t ${secs} ${ENC} "${out}"`);
  }
}

/**
 * Join the parts with CROSSFADES rather than hard cuts.
 *
 * This used to be a concat demuxer with -c copy: fast, lossless, and every join
 * a butt cut. Owner on the exterior->corridor join: "er is een kleine slechte
 * overgang, moet smoother". Cutting straight from a wide aerial orbit into an
 * interior walk gives the eye no thread to follow - the two frames share no
 * shape, so it reads as a splice.
 *
 * xfade needs an absolute offset per join measured on the OUTPUT timeline, which
 * shortens by the fade duration at every join. Hence the running `acc`:
 * offset = acc - xf, then acc += d - xf. Getting this wrong does not error, it
 * silently drifts the fades off the cuts - so durations are PROBED from the
 * encoded parts rather than trusted from the declared beat lengths.
 */
function assemble(parts, xfs, silent) {
  const d = parts.map(dur);
  const ins = parts.map((p) => `-i "${p}"`).join(" ");
  let chain = `[0:v]format=yuv420p,settb=AVTB[x0]`;
  let acc = d[0];
  for (let i = 1; i < parts.length; i++) {
    const xf = Math.max(0.12, Math.min(xfs[i] ?? 0.3, d[i] - 0.2, acc - 0.2));
    chain += `;[${i}:v]format=yuv420p,settb=AVTB[s${i}]`;
    chain += `;[x${i - 1}][s${i}]xfade=transition=fade:duration=${xf.toFixed(2)}`
          + `:offset=${(acc - xf).toFixed(2)}[x${i}]`;
    acc += d[i] - xf;
  }
  ff(`${ins} -filter_complex "${chain}" -map "[x${parts.length - 1}]" ${ENC} "${silent}"`);
}

function mux(silent, music, out, { offset = 0, vol = 1.0 }) {
  const total = dur(silent);
  ff(`-i "${silent}" -ss ${offset} -i "${MUSIC}/${music}" ` +
     `-filter_complex "[1:a]volume=${vol},afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]" ` +
     `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -t ${total} "${out}"`);
}

// ── the library ─────────────────────────────────────────────────────────────
// Beats are declared in order. `f` = footage-bank id, `c` = card in src/.
const F = (n) => `${FOOT}/${n}.mp4`;
const C = (n) => `${SRC}/${n}.png`;
const ENDCARD = C("endcard-clean");

const CLIPS = [
  {
    code: "WONDER-01a", family: "WONDER", slug: "your-photos-as-a-house",
    music: "light-in-dark-places.mp3", offset: 60, vol: 1.1,
    // Old shape: hook -> exterior -> one corridor walk -> phone inlay -> endcard.
    // The arc now travels outside -> hallway -> ceiling -> hearth, so the clip
    // actually shows the palace it is selling.
    // `xf` = crossfade INTO this beat, in seconds. Longer where the two shots
    // share nothing: a wide aerial orbit and an interior walk have no common
    // shape, so that join needs time to dissolve, while two interior moves can
    // cut almost straight.
    //
    // ⚠️ The `from` values are MEASURED, not eyeballed. Matching metres per
    // second across the scenes (which cameraComfort.MOVE_SPEED now does) is not
    // the same as matching APPARENT speed: a room's walls are metres from the
    // lens and a corridor's vanishing point is tens of metres away, so equal
    // ground speed still looks like different tempo. Sampling
    //   tblend=difference -> signalstats YAVG, divided by edgedetect YAVG
    // (motion per unit of scene detail, so a dark corridor is not scored as
    // "slow" merely for being dark) gave, on the windows that were in use:
    //   exterior 0.265 · corridor 0.118 · room 0.646  — a 5.5x spread.
    //
    // ⚠️ Re-cutting alone was NOT enough. The 0.354 an earlier pass settled for
    // was measured across a window running PAST the end of the move, so seconds
    // of stillness averaged in and flattered it. Measured strictly while moving,
    // the room was ~0.50 — and halving its ground speed barely moved that,
    // because the dominant term is the camera's ROTATION, whose rate depends on
    // the move's DURATION and not on how far it travels. Gentling the look swing
    // is what closed the gap. Now 0.265 / 0.238 / 0.275.
    beats: [
      { kind: "card", png: C("bat-WONDER-01a-hook"), secs: 3 },
      // from:2 — the orbit is under way by then, so the clip opens on movement
      // rather than on what reads as a photograph.
      { kind: "beat", f: "exterior-hero", secs: 4.0, from: 2.0, xf: 0.5 },
      { kind: "beat", f: "walk-craft", secs: 4.8, from: 4.5, grade: "soft", xf: 0.8,
        cap: C("bat-WONDER-01a-cap") },
      // ONE room move, not two. velario + hearth-push read as separate shots of
      // the same room; walkin enters wide (ceiling in frame), advances, and
      // settles on the mantel in a single take. Soft grade — the room went murky
      // under the full pass. Back to from:1.5 — skipping ahead had been a
      // workaround for a beat that moved too fast, and the pace is now fixed in
      // the SCENE, so the window can open at the start and keep the wide entry.
      { kind: "beat", f: "room-walkin", secs: 7.5, from: 1.5, grade: "soft", xf: 0.5 },
      // The inlay is UI: dissolving into it slowly would smear the screenshots,
      // so this join is short and clean.
      { kind: "beat", f: "inlay-upload", secs: 6.6, from: 0.0, raw: true, xf: 0.3 },
      // sheen: the end card holds for three seconds and was a dead freeze —
      // a slow light sweep across it lets the clip settle instead of stopping.
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
];

// ── driver ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const pick = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const id = pick("--id"), fam = pick("--family");
let todo = CLIPS;
if (id) todo = CLIPS.filter((c) => c.code === id);
if (fam) todo = CLIPS.filter((c) => c.family === fam);

if (args.includes("--list")) {
  for (const c of CLIPS) console.log(`${c.code.padEnd(14)}${c.family.padEnd(9)}${c.beats.length} beats  ${c.slug}`);
  process.exit(0);
}
if (!todo.length) { console.error("No clips matched."); process.exit(1); }

for (const c of todo) {
  console.log(`\n● ${c.code}`);
  const parts = [];
  c.beats.forEach((b, i) => {
    const out = resolve(WORK, `${c.code}-${i}.mp4`);
    if (b.kind === "card") {
      if (!existsSync(b.png)) throw new Error(`missing card: ${b.png}`);
      // No fade-to-black on a card a crossfade follows: the join would dip to
      // black and THEN dissolve, which reads as a stutter rather than a cut.
      card(b.png, out, b.secs, i === c.beats.length - 1, !!b.sheen);
    } else {
      const src = F(b.f);
      if (!existsSync(src)) throw new Error(`missing footage: ${src} — run build-footage-bank.mjs`);
      beat(src, out, b);
    }
    parts.push(out);
    console.log(`   ${String(i).padStart(2)} ${b.kind === "card" ? "card" : b.f}  ${b.secs}s`);
  });

  const silent = resolve(WORK, `${c.code}-silent.mp4`);
  assemble(parts, c.beats.map((b) => b.xf), silent);
  const final = resolve(OUT, `${c.code}-${c.slug}-9x16.mp4`);
  mux(silent, c.music, final, c);
  for (const p of parts) rmSync(p, { force: true });
  rmSync(silent, { force: true });
  console.log(`   -> ${final.replace(REPO, ".")}  ${dur(final).toFixed(1)}s`);
}
