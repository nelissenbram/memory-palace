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
// Generated cards (build-cards.mjs) live in the staging tree; the hand-made
// WONDER-01a set still comes from the old kit via C().
const G = (n) => `${resolve(REPO, "socials-kit/cards")}/${n}.png`;

/**
 * ⚠️ Two things vary DELIBERATELY across the family, and both were wrong first:
 *
 * The mantel photo. Every room beat came from the same default deck, so clip
 * after clip ended on the same photograph — the palace looked like it held one
 * memory. Each room beat now uses its own ?hero= variant.
 *
 * The phone carousel. WONDER-01a had one and none of its siblings did, so the
 * family read as nine art films and one advert. Six clips now carry one, each
 * showing a DIFFERENT part of the app, so a viewer who sees two clips does not
 * see the same three screens twice.
 *
 * Three clips deliberately have no carousel: WONDER-02 exists to test whether
 * wonder alone converts, with zero product explanation; WONDER-08 is the quiet
 * one; WONDER-10 is a single strange object. A phone in any of them would break
 * the thing being measured.
 */
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

  {
    code: "WONDER-04", family: "WONDER", slug: "zero-folders",
    music: "light-in-dark-places.mp3", offset: 24, vol: 1.0,
    // Catalogue PW-04. The spec opens on a 1s flash of a cluttered phone gallery
    // for contrast; there is no such asset in the library and faking one from an
    // app screen would be a different claim, so this opens on the hook alone and
    // lets the empty corridor carry the "zero folders" idea instead.
    beats: [
      { kind: "card", png: G("WONDER-04-hook"), secs: 2.6 },
      // ⚠️ KNOWN GAP, left visible rather than papered over. The hook claims
      // 4,000 photos and this clip shows none of them; the catalogue's mechanism
      // was a 1 s flash of a cluttered camera roll, and no such asset exists in
      // the library. A photo-dense room was tried here and cut again: from the
      // wide ?rcam=plan pose the salon-hung pictures are too small to read as
      // "4,000 photos", so it added a shot without adding the argument.
      // The corridor walk below does show photographs hung in sequence, which
      // carries "zero folders" — but the before/after contrast the concept is
      // built on needs a camera-roll asset that has to be shot first.
      // Three captions in rhythm over one unbroken walk — the beat of the line
      // ("just walls / just rooms / just light") does the cutting, so the footage
      // must NOT cut with it.
      // ⚠️ ?walk=wall, not the forward walk. left/right only shift the camera
      // sideways — they still look down the hall, so the salon hang sat in the
      // far periphery and this clip argued "zero folders" over an empty
      // corridor. Angled at the wall, the photographs and their plaquettes are
      // the subject: you see the photos, and you see there are no folders.
      { kind: "beat", f: "walk-roots-wall", secs: 4.0, from: 3.0, grade: "soft", xf: 0.5,
        cap: G("WONDER-04-cap1"), capIn: 0.5, capOut: 3.4 },
      { kind: "beat", f: "walk-roots-wall", secs: 3.6, from: 7.4, grade: "soft", xf: 0.35,
        cap: G("WONDER-04-cap2"), capIn: 0.4, capOut: 3.0 },
      { kind: "beat", f: "walk-nest-wall", secs: 3.6, from: 5.5, grade: "soft", xf: 0.35,
        cap: G("WONDER-04-cap3"), capIn: 0.4, capOut: 3.0 },
      // ⚠️ The wing centrepiece used to close this clip and it earned nothing —
      // a slow zoom onto a potted tree says nothing about photographs or
      // folders. Ending INSIDE a room does: the corridor showed the hang, the
      // room shows the same idea at arm's length.
      { kind: "beat", f: "room-walkin-h2", secs: 4.6, from: 2.0, grade: "soft", xf: 0.6 },
      { kind: "beat", f: "inlay-organise", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "WONDER-05", family: "WONDER", slug: "the-room-that-grew",
    music: "light-in-dark-places.mp3", offset: 48, vol: 1.0,
    // Catalogue PW-05. The four tier takes share one camera pose, so they are
    // MATCH CUTS: the room jumps a size while nothing else moves. Crossfading
    // them would dissolve exactly the jump the clip is about, so xf is floored
    // at the assemble minimum rather than given room to breathe.
    beats: [
      { kind: "card", png: G("WONDER-05-hook"), secs: 2.6 },
      { kind: "beat", f: "room-tier1", secs: 1.3, from: 1.6, grade: "soft", xf: 0.5 },
      { kind: "beat", f: "room-tier2", secs: 1.1, from: 1.6, grade: "soft", xf: 0.05 },
      { kind: "beat", f: "room-tier3", secs: 1.1, from: 1.6, grade: "soft", xf: 0.05 },
      { kind: "beat", f: "room-tier4", secs: 1.6, from: 1.6, grade: "soft", xf: 0.05 },
      // then let the grown room breathe, and name what happened
      { kind: "beat", f: "room-walkin-h1", secs: 6.4, from: 1.5, grade: "soft", xf: 0.6,
        cap: G("WONDER-05-cap1"), capIn: 1.6 },
      // The library grid, not stills: this clip is about a room filling with
      // memories, so the outro that matches it is hundreds of them scrolling
      // past. (WONDER-01a already carries the upload carousel; repeating three
      // screens across two clips teaches a viewer nothing new.)
      { kind: "beat", f: "scroll-library", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "WONDER-06", family: "WONDER", slug: "it-hangs-somewhere",
    music: "light-in-dark-places.mp3", offset: 12, vol: 1.0,
    // Catalogue PW-06: photo first, palace second. The reverse dolly is the whole
    // clip — it opens flush on one hung photograph and retreats until the room
    // assembles around it, so it gets the longest single beat in the family.
    beats: [
      { kind: "card", png: G("WONDER-06-hook"), secs: 2.8 },
      { kind: "beat", f: "room-pullback-h2", secs: 9.5, from: 0.6, grade: "soft", xf: 0.5,
        cap: G("WONDER-06-cap1"), capIn: 6.2 },
      // keep retreating: out of the room and down the hall
      { kind: "beat", f: "walk-roots-left", secs: 4.0, from: 6.0, grade: "soft", xf: 0.7 },
      { kind: "beat", f: "inlay-memory", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "WONDER-08", family: "WONDER", slug: "the-quietest-place",
    // Catalogue PW-08 asks for room tone and no soundtrack. There is no room-tone
    // stem in the kit, so the bed stays but drops to 0.45 — quiet enough to read
    // as atmosphere rather than as a track.
    music: "light-in-dark-places.mp3", offset: 96, vol: 0.45,
    beats: [
      { kind: "card", png: G("WONDER-08-hook"), secs: 2.8 },
      { kind: "beat", f: "hearth-hold-h3", secs: 3.6, from: 1.0, grade: "soft", xf: 0.5 },
      { kind: "beat", f: "room-walkin-h3", secs: 6.0, from: 2.0, grade: "soft", xf: 0.8 },
      { kind: "beat", f: "room-library", secs: 5.0, from: 1.2, grade: "soft", xf: 0.8,
        cap: G("WONDER-08-cap1"), capIn: 1.4 },
      // Owner overruled the "quiet clip, no product" call. A scroll keeps the
      // register: slow, one continuous movement, nothing flashing.
      { kind: "beat", f: "scroll-keps", secs: 6.6, from: 0.0, raw: true, xf: 0.5 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },

  {
    code: "WONDER-02", family: "WONDER", slug: "look-up",
    music: "light-in-dark-places.mp3", offset: 72, vol: 0.9,
    // Catalogue PW-02 asks for a floor-to-oculus tilt in the entrance hall.
    // Re-scoped to the ROOM's glazed velario, which is the same shot — one slow
    // tilt ending on a skylight — in a space that has a camera we can drive. The
    // hypothesis is untouched: a two-word command and one money-shot, no product
    // explanation at all. Deliberately ONE beat; adding a second would answer a
    // question the clip is built not to answer.
    beats: [
      // ⚠️ Shot from OUTSIDE now. The interior velario tilt ended on ceiling
      // beams: a correct shot that said nothing about how big the place is.
      // Craning up the facade from the approach road makes the scale the
      // subject, which is the only thing this clip has to sell.
      { kind: "card", png: G("WONDER-02-hook"), secs: 2.4 },
      { kind: "beat", f: "exterior-lookup", secs: 13.0, from: 1.0, xf: 0.6,
        cap: G("WONDER-02-cap1"), capIn: 9.0 },
      // Owner overruled the "no product, by design" call here. A SCROLL rather
      // than a carousel: the clip has been one unhurried move, and three sliding
      // stills would break that rhythm where a page travelling under a thumb
      // does not. The atrium scroll also answers "where is the rest of it" —
      // it travels past import, restore, capture, timeline, family tree, legacy.
      { kind: "beat", f: "scroll-atrium", secs: 6.6, from: 0.0, raw: true, xf: 0.5 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.5, sheen: true },
    ],
  },
  {
    code: "WONDER-03", family: "WONDER", slug: "the-named-doors",
    music: "light-in-dark-places.mp3", offset: 36, vol: 1.0,
    // PW-03 wanted the entrance hall's ring of doors. The CORRIDOR's doors carry
    // the same metaphor and carry it better: they are already named, with bronze
    // plaquettes you can read, and they open onto the actual rooms. Opening on
    // one plaque states the premise before the walk pays it off.
    beats: [
      { kind: "card", png: G("WONDER-03-hook"), secs: 3.0 },
      // ⚠️ SHOW the doors, do not assert them. The first cut of this clip tagged
      // three room names over walking footage — and at walking distance no
      // plaquette is legible, so it was naming things the viewer could not read.
      // These two poses sit at the doors, where the bronze plates are the subject.
      { kind: "beat", f: "corridor-door1", secs: 2.8, from: 1.6, grade: "soft", xf: 0.5,
        cap: G("WONDER-03-cap1"), capIn: 0.5, capOut: 2.2 },
      { kind: "beat", f: "corridor-door3", secs: 2.8, from: 1.6, grade: "soft", xf: 0.45,
        cap: G("WONDER-03-cap2"), capIn: 0.5, capOut: 2.2 },
      // now the hall they belong to, then through into a room
      { kind: "beat", f: "walk-roots", secs: 4.0, from: 4.5, grade: "soft", xf: 0.6 },
      { kind: "beat", f: "room-walkin-h4", secs: 5.4, from: 1.5, grade: "soft", xf: 0.7,
        cap: G("WONDER-03-cap3"), capIn: 2.0 },
      { kind: "beat", f: "inlay-family", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "WONDER-07", family: "WONDER", slug: "a-life-assembling",
    music: "light-in-dark-places.mp3", offset: 60, vol: 1.0,
    // PW-07 wanted the onboarding assemble sequence. That is a phase machine, not
    // a scene with a camera, so it cannot be driven frame by frame. The corridor
    // gives the same idea in architecture: its length is a function of how many
    // rooms exist, so adding rooms literally builds more hall. Same camera each
    // take, so the growth is the only thing that moves.
    //
    // NOT the same clip as WONDER-05: that one deepens a single room seen from
    // above; this one extends a corridor seen head-on, and it is cut as process
    // (even steps, no captions until the end) rather than as before/after.
    beats: [
      { kind: "card", png: G("WONDER-07-hook"), secs: 2.6 },
      { kind: "beat", f: "corridor-grow1", secs: 1.3, from: 1.6, grade: "soft", xf: 0.5 },
      { kind: "beat", f: "corridor-grow2", secs: 1.2, from: 1.6, grade: "soft", xf: 0.05 },
      { kind: "beat", f: "corridor-grow3", secs: 1.2, from: 1.6, grade: "soft", xf: 0.05 },
      { kind: "beat", f: "corridor-grow4", secs: 1.8, from: 1.6, grade: "soft", xf: 0.05 },
      // then walk the hall the clip just built
      // ⚠️ The forward walk ends at the centrepiece, so this clip also closed on
      // the potted tree. ?walk=wall ends on the salon hang instead: the last
      // thing you see is a photograph on a wall, which is what was assembled.
      // Deliberately not the mantel — that is every other clip's closing image.
      { kind: "beat", f: "walk-roots-wall", secs: 5.0, from: 5.5, grade: "soft", xf: 0.6,
        cap: G("WONDER-07-cap1"), capIn: 2.2 },
      { kind: "beat", f: "inlay-capture", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "WONDER-09", family: "WONDER", slug: "no-tricks",
    music: "light-in-dark-places.mp3", offset: 8, vol: 0.95,
    // PW-09's claim is "no cuts", and the original route to it — one continuous
    // take across four scenes — is not shootable: they are separate routes, so
    // any such take would in fact be spliced, which is the one thing this clip
    // must not be. A single unbroken exterior orbit makes the same claim and
    // makes it truthfully. ONE footage beat, no internal edits.
    beats: [
      { kind: "card", png: G("WONDER-09-hook"), secs: 3.0 },
      { kind: "beat", f: "exterior-long", secs: 15.0, from: 2.0, xf: 0.6,
        cap: G("WONDER-09-cap1"), capIn: 11.4 },
      // ⚠️ The carousel is back at the owner's call — and the HOOK changed with
      // it, from "No cuts. No CGI renders." to just the second half. A clip that
      // cuts to a phone cannot open by claiming it does not cut. Fixing the
      // sentence was the honest way to keep both.
      { kind: "beat", f: "inlay-discover", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.5, sheen: true },
    ],
  },
  {
    code: "WONDER-10", family: "WONDER", slug: "a-name-and-a-year",
    music: "light-in-dark-places.mp3", offset: 84, vol: 0.9,
    // PW-10 tests whether ONE specific image out-hooks a grand tour. A first cut
    // used the bronze nest: specific, certainly, but it said nothing — the hook
    // pointed at an odd object and the clip had no second thought. A plaquette
    // is just as particular and it carries the product's actual promise, so the
    // hypothesis is tested by an image that also means something.
    beats: [
      { kind: "card", png: G("WONDER-10-hook"), secs: 2.8 },
      // The pullback opens flush on a hung photograph with its bronze plaquette
      // legible — "Grandpa and the Mare, 1961" — then retreats. That IS the
      // argument: a title and a year, attached to the picture, on the wall.
      { kind: "beat", f: "room-pullback-h1", secs: 7.0, from: 0.4, grade: "soft", xf: 0.6,
        cap: G("WONDER-10-cap1"), capIn: 3.4 },
      { kind: "beat", f: "inlay-memory", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.5, sheen: true },
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
