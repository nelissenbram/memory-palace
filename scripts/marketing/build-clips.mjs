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

function mux(silent, music, out, { offset = 0, vol = 1.0, aiFaces = false, simulated = false }) {
  const total = dur(silent);
  // LEG-023 (owner-akkoord 10/12-09): machine-leesbare markering in de container,
  // gezet op het laatste export-punt zodat geen enkele publicatie-kopie hem mist.
  //   aiFaces: true   -> clip toont Flux-persona's of AI-restored portretten
  //                      (AI-Act art. 50(2): trainedAlgorithmicMedia)
  //   simulated: true -> gesimuleerde before/after (UCPD: compositeSynthetic;
  //                      caption draagt daarnaast zichtbaar "Simulated demo")
  // De zichtbare end-card-vermelding ("Faces AI-generated") is een aparte
  // card-taak — zie OWNER-BRIEFING-CLIP-FLOW (AI-badge-sectie).
  const marks = aiFaces
    ? `-movflags use_metadata_tags -metadata digital_source_type="trainedAlgorithmicMedia" -metadata comment="AI-generated persona / AI-restored portrait - AI-Act art.50(2). Provenance: docs/legal-records/MARKETING-SOURCES-RESTORE.json" `
    : simulated
      ? `-movflags use_metadata_tags -metadata digital_source_type="compositeSynthetic" -metadata comment="SIMULATED DEMO - staged before/after; best-case depiction, not captured product output" `
      : "";
  ff(`-i "${silent}" -ss ${offset} -i "${MUSIC}/${music}" ` +
     `-filter_complex "[1:a]volume=${vol},afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]" ` +
     `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -t ${total} ${marks}"${out}"`);
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
    tests: 'Baseline: a plain question hook + exterior-to-interior arc.', carousel: 'upload',
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
    tests: 'A stat hook inside a wonder clip. Walks ALONG the salon hang, then into a room.', carousel: 'organise',
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
      // ⚠️ Three DIFFERENT shots, not three wall-walks. The captions are
      // "just walls / just rooms / just light", and the first cut ran all three
      // over near-identical salon-hang pans (owner: too repetitive). Now each
      // line gets footage that means it: the wall, the doored corridor, the
      // glazed ceiling.
      { kind: "beat", f: "walk-roots-wall", secs: 4.0, from: 3.0, grade: "soft", xf: 0.5,
        cap: G("WONDER-04-cap1"), capIn: 0.5, capOut: 3.4 },   // just walls — the hang
      { kind: "beat", f: "walk-craft", secs: 3.6, from: 4.5, grade: "soft", xf: 0.5,
        cap: G("WONDER-04-cap2"), capIn: 0.4, capOut: 3.0 },   // just rooms — doors passing
      { kind: "beat", f: "velario", secs: 3.6, from: 2.0, grade: "soft", xf: 0.5,
        cap: G("WONDER-04-cap3"), capIn: 0.4, capOut: 3.0 },   // just light — the velario
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
    tests: 'The growth mechanic as the wonder — four match cuts from one camera pose.', carousel: 'scroll: library',
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
    tests: 'Confession hook + reverse reveal: photo first, palace second.', carousel: 'memory',
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
    tests: 'Hushed sanctuary vs spectacle — can low stimulation hold attention?', carousel: 'scroll: keps',
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
    tests: 'Two words, one shot. Crane up the facade from the approach road: the scale is the subject.', carousel: 'scroll: atrium',
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
    tests: 'Doors = chapters. Opens on two readable plaquettes rather than naming rooms you cannot read.', carousel: 'family',
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
    tests: 'Process vs finished-space footage. The corridor lengthens as rooms are added.', carousel: 'capture',
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
    tests: "Tech-flex: one unbroken palace take. Hook no longer claims 'no cuts' — the clip now has one.", carousel: 'discover',
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
    tests: 'One specific image as the whole clip — a plaquette: every photo carries a title and a year.', carousel: 'memory',
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

  // ══ Family: LEGACY (LG) — memoirist ICP. Mortality salience handled dryly:
  // the catalogue is explicit that this family must not become grief-bait, so
  // every hook here is a question or a fact, never a bereavement. Frame follows
  // the owner's 2026-09-07 USP decision — private, visitable, yours — and no
  // clip headlines "permanent" or "forever".
  //
  // RESTORE was the obvious next family and is BLOCKED: every clip in it needs a
  // GFPGAN before/after pair, and none exist in the repo. GRAVE opens on a
  // cluttered camera roll we equally cannot produce (the same gap that hollowed
  // out WONDER-04). LEGACY needs only corridor, room and door footage.
  {
    code: "LEGACY-02", family: "LEGACY", slug: "the-question-you-never-asked",
    tests: 'Direct question aimed at the viewer. Near-actionless by design; judged on comments and profile taps.', carousel: 'interview',
    music: "light-in-dark-places.mp3", offset: 30, vol: 0.95,
    beats: [
      // One beat of stark text before any footage: the hook is a question aimed
      // at the viewer, and it needs a moment of nothing to land in.
      { kind: "card", png: G("LEGACY-02-hook"), secs: 3.2 },
      /**
       * ⚠️ THE PHOTOGRAPH FIRST, then the same photograph on a wall.
       *
       * This clip used to walk past the salon hang while asking its questions,
       * and the owner was right that it earned nothing: a corridor of pictures
       * you cannot see properly says nothing about a question you never asked.
       *
       * kb-mantel holds the three images that hang over the fireplace, and they
       * are byte-identical to the room's hero files. So the questions play over
       * the actual photograph, and the answer beat cuts to THAT photograph,
       * hung, lit, with its plaque. The match is real, not a lookalike.
       */
      { kind: "beat", f: "kb-mantel", secs: 2.8, from: 0.2, grade: "soft", xf: 0.6,
        cap: G("LEGACY-02-cap1"), capIn: 0.4, capOut: 2.3 },
      { kind: "beat", f: "kb-mantel", secs: 2.6, from: 3.0, grade: "soft", xf: 0.25,
        cap: G("LEGACY-02-cap2"), capIn: 0.3, capOut: 2.1 },
      { kind: "beat", f: "kb-mantel", secs: 2.6, from: 5.6, grade: "soft", xf: 0.25,
        cap: G("LEGACY-02-cap3"), capIn: 0.3, capOut: 2.1 },
      // the same picture, hanging: the pullback opens flush on it
      { kind: "beat", f: "room-pullback-h2", secs: 6.0, from: 0.4, grade: "soft", xf: 0.5,
        cap: G("LEGACY-02-cap4"), capIn: 2.6 },
      { kind: "beat", f: "hearth-hold-h3", secs: 3.0, from: 1.2, grade: "soft", xf: 0.5,
        cap: G("LEGACY-02-cap5"), capIn: 0.6 },
      { kind: "beat", f: "inlay-interview", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-04", family: "LEGACY", slug: "three-generations",
    tests: "Stat hook, kept dry and factual — does an intellectual 'huh, true' hold better than an emotional one?", carousel: 'scroll: library',
    music: "light-in-dark-places.mp3", offset: 54, vol: 0.95,
    beats: [
      { kind: "card", png: G("LEGACY-04-hook"), secs: 3.4 },
      { kind: "beat", f: "walk-roots-wall", secs: 3.6, from: 4.5, grade: "soft", xf: 0.6,
        cap: G("LEGACY-04-cap1"), capIn: 0.5, capOut: 3.0 },
      { kind: "beat", f: "walk-roots-wall", secs: 3.6, from: 8.0, grade: "soft", xf: 0.3,
        cap: G("LEGACY-04-cap2"), capIn: 0.4, capOut: 3.0 },
      // "a place to live" — said over the room, not over a slogan card
      { kind: "beat", f: "room-walkin-h1", secs: 5.6, from: 1.5, grade: "soft", xf: 0.7,
        cap: G("LEGACY-04-cap3"), capIn: 2.0 },
      // ⚠️ The door close-up is gone (owner: "ECHT te lelijk"). A flat-on shot of
      // a wooden door with a plaque is a product photograph of a door; the
      // library, with its rooms, actually shows the chapters the line claims.
      { kind: "beat", f: "scroll-library", secs: 3.4, from: 0.2, raw: true, xf: 0.5,
        cap: G("LEGACY-04-cap4"), capIn: 0.6, capOut: 2.8 },
      { kind: "beat", f: "scroll-library", secs: 4.6, from: 3.6, raw: true, xf: 0.2 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-08", family: "LEGACY", slug: "twelve-questions",
    tests: 'Save-optimised: scrolls the real Interviews list — dozens of grouped question sets — rather than the extract of one woven chapter. The feature is the asking.', carousel: 'none - the interview list is the body',
    music: "light-in-dark-places.mp3", offset: 78, vol: 0.9,
    // Save-optimised: judged on saves, not holds. The clip scrolls the atrium's
    // Interviews list — the real, grouped question sets — so a viewer sees the
    // feature keeps asking, not a single answer. The slug still says
    // "twelve-questions" from the catalogue; the clip no longer promises a
    // count it cannot show.
    beats: [
      { kind: "card", png: G("LEGACY-08-hook"), secs: 3.2 },
      /**
       * ⚠️ Built on the Interviews LIST, not one woven chapter. The owner: walk
       * the different interview options, do not sit on the extract of one. The
       * atrium's "Interviews — tell your story aloud" card opens a scrollable
       * list of grouped question sets, which is the feature itself; scroll it
       * slowly and let a handful of captions name what passes.
       */
      { kind: "beat", f: "scroll-interview-options", secs: 3.4, from: 0.4, raw: true, xf: 0.5,
        cap: G("LEGACY-08-cap1"), capIn: 0.4, capOut: 2.9 },
      { kind: "beat", f: "scroll-interview-options", secs: 3.4, from: 3.8, raw: true, xf: 0.2,
        cap: G("LEGACY-08-cap2"), capIn: 0.3, capOut: 2.9 },
      { kind: "beat", f: "scroll-interview-options", secs: 3.4, from: 7.2, raw: true, xf: 0.2,
        cap: G("LEGACY-08-cap3"), capIn: 0.3, capOut: 2.9 },
      // the answers become a place — pay it off in the room, then name it
      { kind: "beat", f: "room-pullback-h1", secs: 5.2, from: 1.0, grade: "soft", xf: 0.6,
        cap: G("LEGACY-08-cap4"), capIn: 1.8 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-01", family: "LEGACY", slug: "a-life-in-nine-rooms",
    tests: 'Seed concept: a whole life told as dated rooms. Structure is ENUMERATION - one room, one year, one line.',
    carousel: 'scroll: library',
    music: "light-in-dark-places.mp3", offset: 6, vol: 0.95,
    beats: [
      { kind: "card", png: G("LEGACY-01-hook"), secs: 3.0 },
      { kind: "beat", f: "exterior-lookup", secs: 3.4, from: 1.0, xf: 0.5 },
      /**
       * ⚠️ One beat per PHOTOGRAPH, each caption naming the plaque beneath it.
       *
       * This used to alternate hero shots with plan-view tier shots, which did
       * two things wrong: the wide room added nothing (owner), and it hung a
       * DIFFERENT photograph over the mantel from the one the caption was
       * describing. Four heroes, four captions, in order.
       */
      { kind: "beat", f: "room-walkin", secs: 3.0, from: 5.0, grade: "soft", xf: 0.5,
        cap: G("LEGACY-01-cap1"), capIn: 0.3, capOut: 2.5 },
      { kind: "beat", f: "room-walkin-h1", secs: 3.0, from: 5.0, grade: "soft", xf: 0.3,
        cap: G("LEGACY-01-cap2"), capIn: 0.3, capOut: 2.5 },
      { kind: "beat", f: "room-walkin-h2", secs: 3.0, from: 5.0, grade: "soft", xf: 0.3,
        cap: G("LEGACY-01-cap3"), capIn: 0.3, capOut: 2.5 },
      { kind: "beat", f: "room-walkin-h3", secs: 3.0, from: 5.0, grade: "soft", xf: 0.3,
        cap: G("LEGACY-01-cap4"), capIn: 0.3, capOut: 2.5 },
      // pull back down the hall: all those rooms at once
      { kind: "beat", f: "corridor-grow4", secs: 3.2, from: 1.4, grade: "soft", xf: 0.6,
        cap: G("LEGACY-01-cap5"), capIn: 0.8 },
      { kind: "beat", f: "scroll-library", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-05", family: "LEGACY", slug: "call-your-mother",
    tests: 'Imperative hook + a hyper-specific year. PHOTO-first rather than 3D-first: does archive imagery out-hook architecture inside this family?',
    carousel: 'none - the photographs are the body',
    music: "light-in-dark-places.mp3", offset: 18, vol: 0.95,
    beats: [
      { kind: "card", png: G("LEGACY-05-hook"), secs: 3.0 },
      // The only clip in the family that opens on PHOTOGRAPHS. That is the whole
      // test - every sibling argues through architecture, so if this one wins,
      // the family's footage assumption was wrong.
      { kind: "beat", f: "kb-seventies", secs: 2.6, from: 0.2, grade: "soft", xf: 0.5,
        cap: G("LEGACY-05-cap1"), capIn: 0.3, capOut: 2.0 },
      { kind: "beat", f: "kb-seventies", secs: 2.4, from: 2.6, grade: "soft", xf: 0.25,
        cap: G("LEGACY-05-cap2"), capIn: 0.2, capOut: 1.9 },
      { kind: "beat", f: "kb-seventies", secs: 2.4, from: 5.0, grade: "soft", xf: 0.25,
        cap: G("LEGACY-05-cap3"), capIn: 0.2, capOut: 1.9 },
      // ⚠️ h1, not h2. The captions count 1974 / 1977 / 1981 and then cut to the
      // mantel — h2 hangs "The Walk They Always Took, 1996" there, so the clip
      // said 1981 while the wall said 1996. h1 hangs "Still Dancing, 1974",
      // which is the era the captions just established.
      { kind: "beat", f: "room-pullback-h1", secs: 5.4, from: 0.8, grade: "soft", xf: 0.7,
        cap: G("LEGACY-05-cap4"), capIn: 2.2 },
      { kind: "beat", f: "hearth-hold-h3", secs: 3.0, from: 1.2, grade: "soft", xf: 0.5,
        cap: G("LEGACY-05-cap5"), capIn: 0.5 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-06", family: "LEGACY", slug: "the-seventieth-birthday",
    tests: 'Gift framing told from the giver. Structure is a CALENDAR - months filling a house - which no sibling uses.',
    carousel: 'family',
    music: "light-in-dark-places.mp3", offset: 42, vol: 0.95,
    beats: [
      { kind: "card", png: G("LEGACY-06-hook"), secs: 3.2 },
      { kind: "beat", f: "exterior-hero", secs: 3.4, from: 2.0, xf: 0.5,
        cap: G("LEGACY-06-cap1"), capIn: 0.8, capOut: 2.8 },
      { kind: "beat", f: "kb-ayear", secs: 2.6, from: 0.2, grade: "soft", xf: 0.5,
        cap: G("LEGACY-06-cap2"), capIn: 0.3, capOut: 2.1 },
      { kind: "beat", f: "kb-ayear", secs: 2.4, from: 2.8, grade: "soft", xf: 0.25,
        cap: G("LEGACY-06-cap3"), capIn: 0.2, capOut: 1.9 },
      { kind: "beat", f: "kb-ayear", secs: 2.4, from: 5.2, grade: "soft", xf: 0.25,
        cap: G("LEGACY-06-cap4"), capIn: 0.2, capOut: 1.9 },
      { kind: "beat", f: "walk-roots-wall", secs: 4.4, from: 4.0, grade: "soft", xf: 0.6,
        cap: G("LEGACY-06-cap5"), capIn: 1.4 },
      { kind: "beat", f: "inlay-family", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-09", family: "LEGACY", slug: "fifty-years-from-now",
    tests: 'Platform-native POV with the timeline flipped forward - descendants, not death. Judged on profile taps, not hold.',
    carousel: 'none - POV breaks if a phone appears',
    music: "light-in-dark-places.mp3", offset: 66, vol: 0.9,
    beats: [
      { kind: "card", png: G("LEGACY-09-hook"), secs: 3.4 },
      // Unbroken first person. A carousel would put a phone in the hand of
      // someone who is supposed to be standing in 2076, so this clip has none.
      // Opens in motion, not on a door. The POV breaks the moment the clip
      // stops to photograph a fixture — you are supposed to be walking.
      { kind: "beat", f: "walk-roots", secs: 3.0, from: 5.0, grade: "soft", xf: 0.5,
        cap: G("LEGACY-09-cap1"), capIn: 0.4, capOut: 2.4 },
      { kind: "beat", f: "walk-roots-wall", secs: 3.6, from: 3.0, grade: "soft", xf: 0.4,
        cap: G("LEGACY-09-cap2"), capIn: 0.3, capOut: 3.0 },
      { kind: "beat", f: "walk-nest-wall", secs: 3.6, from: 6.0, grade: "soft", xf: 0.3,
        cap: G("LEGACY-09-cap3"), capIn: 0.3, capOut: 3.0 },
      { kind: "beat", f: "room-walkin-h1", secs: 5.6, from: 1.5, grade: "soft", xf: 0.7 },
      { kind: "beat", f: "hearth-hold-h3", secs: 3.4, from: 1.0, grade: "soft", xf: 0.5,
        cap: G("LEGACY-09-cap4"), capIn: 0.8 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-10", family: "LEGACY", slug: "no-memoir-needed",
    tests: 'Relief hook aimed at the guilt of the unwritten memoir. Argues that a memoir is rooms by walking past them - the growth mechanic is not visible from inside a room, so it is not claimed.',
    carousel: 'organise',
    music: "light-in-dark-places.mp3", offset: 90, vol: 0.95,
    beats: [
      { kind: "card", png: G("LEGACY-10-hook"), secs: 3.2 },
      /**
       * ⚠️ The empty-versus-full match cut is GONE, and the reason is structural
       * rather than a matter of taste.
       *
       * sizeForRoom freezes rW and rH and grows only depth, so the tier change
       * is legible from a plan view near the ceiling and almost invisible from
       * inside — which is why the before/after used that pose. The owner found
       * it read as a floorplan, and shooting the same contrast with the walk-in
       * and reveal cameras produced two takes of the same photograph over the
       * same mantel: the growth simply is not visible from where a person
       * stands.
       *
       * So the clip stops arguing "it grows" and argues its actual line — a
       * memoir is not a manuscript, it is ROOMS — by walking past them. The
       * corridor does that in one continuous move, which is what the owner
       * suggested and what the footage can honestly support.
       */
      { kind: "beat", f: "room-sparse", secs: 3.4, from: 1.2, grade: "soft", xf: 0.5,
        cap: G("LEGACY-10-cap1"), capIn: 0.8, capOut: 2.8 },
      { kind: "beat", f: "walk-roots", secs: 4.2, from: 4.5, grade: "soft", xf: 0.6,
        cap: G("LEGACY-10-cap2"), capIn: 1.0, capOut: 3.6 },
      { kind: "beat", f: "walk-roots-wall", secs: 4.4, from: 6.0, grade: "soft", xf: 0.4 },
      { kind: "beat", f: "room-pullback-h1", secs: 4.6, from: 1.0, grade: "soft", xf: 0.5,
        cap: G("LEGACY-10-cap3"), capIn: 1.6 },
      { kind: "beat", f: "inlay-organise", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },

  // ══ Family: OWNED (OW) — custody threat, then a demonstrable act of ownership.
  // Sceptic ICP. The palace appears only as the RELIEF beat: if any of these
  // still works with the palace removed it is on-mechanism, and if it collapses
  // it has drifted into WONDER. Frame is YOURS + PRIVATE; no clip headlines
  // "permanent" (2026-09-07 USP decision — permanence is the consequence of
  // ownership, not the pitch).
  {
    code: "OWNED-01", family: "OWNED", slug: "take-it-all-with-you",
    tests: 'Tests whether PORTABILITY stops a scroll at all. If a settings-page scroll holds like GRAVE doom-scroll, the YOURS pillar has a visual language; if not, it is a landing-page argument, learned cheaply.',
    carousel: 'scroll: security',
    music: "light-in-dark-places.mp3", offset: 12, vol: 0.9,
    beats: [
      { kind: "card", png: G("OWNED-01-hook"), secs: 3.4 },
      // the exit, in full: export tree, photo count, download — a real page
      { kind: "beat", f: "scroll-security", secs: 6.6, from: 0.0, raw: true, xf: 0.5,
        cap: G("OWNED-01-cap1"), capIn: 0.6 },
      // and it still is not a folder: the same memories, hanging
      { kind: "beat", f: "room-walkin-h2", secs: 5.4, from: 1.5, grade: "soft", xf: 0.6,
        cap: G("OWNED-01-cap2"), capIn: 2.0 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "OWNED-02", family: "OWNED", slug: "type-the-word",
    tests: 'Counter-intuitive: shows the DESTRUCTION affordance, not the preservation one. If the delete beat out-holds OW-01 export, the mechanism is permission (I may leave) over portability (I may copy).',
    carousel: 'none - the point is the exit, not the app',
    music: "light-in-dark-places.mp3", offset: 36, vol: 0.85,
    beats: [
      { kind: "card", png: G("OWNED-02-hook"), secs: 3.0 },
      /**
       * ⚠️ A DEPICTION, not a screen-rec. dangerzone.mp4 rebuilds the delete
       * panel from the app's real strings and animates the word being typed and
       * the button waking — because recording the live danger zone means driving
       * a browser over the review account's actual delete flow, one stray click
       * from erasing the demo data just seeded. Faithful to the feature; not a
       * capture of it. The button is never pressed because there is no button.
       */
      { kind: "beat", f: "dangerzone", secs: 6.0, from: 0.3, raw: true, xf: 0.5,
        cap: G("OWNED-02-cap1"), capIn: 3.4 },
      // the villa, whole and unbothered — which is exactly why you won't use it
      { kind: "beat", f: "exterior-hero", secs: 5.0, from: 2.0, xf: 0.6,
        cap: G("OWNED-02-cap2"), capIn: 1.6 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.5, sheen: true },
    ],
  },
  {
    code: "OWNED-03", family: "OWNED", slug: "the-small-print",
    tests: 'Documentary evidence as the hook — no authored claim, just the product own small print, which is a stronger promise than any slogan. Counter-tests the assumption that copy must be written.',
    carousel: 'none - the small print is the argument',
    music: "light-in-dark-places.mp3", offset: 60, vol: 0.85,
    beats: [
      { kind: "card", png: G("OWNED-03-hook"), secs: 3.0 },
      // ⚠️ Two stages: the note as it really is (tiny, on the page), then the
      // note made legible. The owner found the push-into-the-six-point original
      // still too small to read — because it IS six-point. So this establishes
      // the real page briefly, then hands the viewer the exact words at size.
      { kind: "beat", f: "kb-privacy-note", secs: 4.0, from: 0.3, raw: true, xf: 0.5 },
      // the same sentence, re-typeset large — the product's own promise, legible
      { kind: "card", png: G("OWNED-03-quote"), secs: 5.5, xf: 0.5, sheen: true },
      // nothing came in that you did not carry in: photographs on a wall
      { kind: "beat", f: "walk-roots-wall", secs: 5.0, from: 4.0, grade: "soft", xf: 0.6,
        cap: G("OWNED-03-cap1"), capIn: 1.6 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  // ══ Family: RESTORE (RS) — borrowed demand, and the fewest words in the
  // library: the reveal is the payoff, so captions get out of its way.
  //
  // Footage is build-restore-pairs: a colour original aged into a damaged
  // monochrome print, revealed by a blend wipe. /api/ai-enhance really does
  // restore AND colourise a monochrome input in one pass (Kontext, falling back
  // to GFPGAN + DDColor), so the transformation shown is the product's own.
  // ⚠️ The "after" is the untouched original rather than a captured model
  // output — a best-case depiction of a real capability. Never caption these as
  // actual output.
  {
    code: "RESTORE-01", family: "RESTORE", slug: "watch-them-come-back",
    tests: 'Command hook + a near-silent single reveal. Tests whether restraint holds attention better than the busy Remini grammar.',
    carousel: 'restore',
    music: "light-in-dark-places.mp3", offset: 12, vol: 0.75,
    beats: [
      { kind: "card", png: G("RESTORE-01-hook"), secs: 2.6 },
      // One unbroken take. No captions across the wipe: the face is the event.
      { kind: "beat", f: "rp-wedding", secs: 6.8, from: 0.1, grade: "soft", xf: 0.5,
        cap: G("RESTORE-01-cap1"), capIn: 0.4, capOut: 2.6 },
      { kind: "beat", f: "rp-lane", secs: 4.0, from: 3.0, grade: "soft", xf: 0.5,
        cap: G("RESTORE-01-cap2"), capIn: 1.2 },
      { kind: "beat", f: "inlay-restore", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "RESTORE-03", family: "RESTORE", slug: "restored-then-hung",
    tests: 'The bridge clip: delivers the restore payoff fast, then argues that repairing a photo is not the same as giving it somewhere to live.',
    carousel: 'scroll: library',
    music: "light-in-dark-places.mp3", offset: 36, vol: 0.9,
    beats: [
      { kind: "card", png: G("RESTORE-03-hook"), secs: 2.6 },
      { kind: "beat", f: "rp-wedding", secs: 5.6, from: 0.6, grade: "soft", xf: 0.5 },
      // ⚠️ room-pullback (default), NOT h1. The restore beat colourises the
      // WEDDING; room-pullback hangs the wedding (hero 0), while h1 hung a
      // different photo (still-dancing) — so the wall showed a picture the clip
      // never restored. Same image now: restored, then hung.
      { kind: "beat", f: "room-pullback", secs: 6.0, from: 0.8, grade: "soft", xf: 0.7,
        cap: G("RESTORE-03-cap1"), capIn: 1.6, capOut: 5.2 },
      { kind: "beat", f: "walk-roots-wall", secs: 4.0, from: 4.5, grade: "soft", xf: 0.5,
        cap: G("RESTORE-03-cap2"), capIn: 0.8 },
      { kind: "beat", f: "scroll-library", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "RESTORE-05", family: "RESTORE", slug: "the-detail-you-missed",
    tests: 'Curiosity gap: names a detail before showing it. Tests whether a delayed, promised payoff lifts completion over an immediate reveal.',
    carousel: 'restore',
    music: "light-in-dark-places.mp3", offset: 60, vol: 0.85,
    beats: [
      { kind: "card", png: G("RESTORE-05-hook"), secs: 3.0 },
      // damage held long enough for the eye to hunt before the wipe answers
      { kind: "beat", f: "rp-lane", secs: 3.2, from: 0.1, grade: "soft", xf: 0.5 },
      { kind: "beat", f: "rp-lane", secs: 4.4, from: 3.0, grade: "soft", xf: 0.25,
        cap: G("RESTORE-05-cap1"), capIn: 1.8, capOut: 3.9 },
      { kind: "beat", f: "rp-wedding", secs: 4.2, from: 3.4, grade: "soft", xf: 0.5,
        cap: G("RESTORE-05-cap2"), capIn: 1.2 },
      { kind: "beat", f: "inlay-restore", secs: 6.6, from: 0.0, raw: true, xf: 0.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "RESTORE-07", family: "RESTORE", slug: "watch-it-fade",
    tests: 'Loss-framing: the reveal runs backwards and the photograph decays. Tests whether inverting the direction beats the standard wipe.',
    carousel: 'restore',
    music: "light-in-dark-places.mp3", offset: 84, vol: 0.85,
    beats: [
      { kind: "card", png: G("RESTORE-07-hook"), secs: 2.8 },
      // opens PRISTINE — the audience assumes this is the "after"
      { kind: "beat", f: "rp-fade", secs: 3.0, from: 0.2, grade: "soft", xf: 0.5,
        cap: G("RESTORE-07-cap1"), capIn: 0.3, capOut: 2.4 },
      { kind: "beat", f: "rp-fade", secs: 2.6, from: 3.2, grade: "soft", xf: 0.2,
        cap: G("RESTORE-07-cap2"), capIn: 0.2, capOut: 2.1 },
      { kind: "beat", f: "rp-fade", secs: 2.8, from: 5.8, grade: "soft", xf: 0.2,
        cap: G("RESTORE-07-cap3"), capIn: 0.2, capOut: 2.3 },
      // snap forward: the repair is the answer to the decay
      { kind: "beat", f: "rp-wedding", secs: 4.6, from: 3.4, grade: "soft", xf: 0.12,
        cap: G("RESTORE-07-cap4"), capIn: 1.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "LEGACY-03b", family: "LEGACY", slug: "the-folder-nobody-opens",
    tests: 'Replaces the founder-cam cell. Tests RECOGNITION as the hook — the viewer seeing their own behaviour — rather than parasocial trust, so it is a different mechanism under a different code.',
    carousel: 'scroll: library',
    music: "light-in-dark-places.mp3", offset: 102, vol: 0.95,
    beats: [
      { kind: "card", png: G("LEGACY-03b-hook"), secs: 3.2 },
      // the folder itself: a grid that keeps going and means nothing
      { kind: "beat", f: "scroll-library", secs: 3.4, from: 0.2, raw: true, xf: 0.5,
        cap: G("LEGACY-03b-cap1"), capIn: 0.4, capOut: 2.8 },
      { kind: "beat", f: "scroll-library", secs: 3.0, from: 3.6, raw: true, xf: 0.2,
        cap: G("LEGACY-03b-cap2"), capIn: 0.3, capOut: 2.5 },
      // the same pictures, somewhere
      { kind: "beat", f: "room-walkin-h2", secs: 5.4, from: 1.5, grade: "soft", xf: 0.7,
        cap: G("LEGACY-03b-cap3"), capIn: 2.0 },
      { kind: "beat", f: "walk-roots-wall", secs: 4.0, from: 5.0, grade: "soft", xf: 0.5,
        cap: G("LEGACY-03b-cap4"), capIn: 1.2 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  // ══ Family: KIN (KN) — the family as co-authors. Organiser ICP. The pain is
  // DISTRIBUTED: the archive is in five houses and the job landed on one person.
  // Relief is handover. Frame is PRIVATE (your family, your rules — a real
  // checkbox tree), VISITABLE the payoff. ⚠️ Boundary vs OWNED: OW is about
  // institutions holding your things; KIN is about which cousin sees which room.
  {
    code: "KIN-01", family: "KIN", slug: "not-the-only-author",
    tests: 'Distributed ownership as a hook — the missing photos are not lost, they are in someone else house. vs GRAVE (personal disorder): is "you cannot do this alone" a stronger opener than "you failed to organise this"? Judged on send-to-a-person shares.',
    carousel: 'family: group + sharing + tree',
    music: "light-in-dark-places.mp3", offset: 12, vol: 0.9,
    beats: [
      { kind: "card", png: G("KIN-01-hook"), secs: 3.0 },
      // the hang, which one person did not fill
      { kind: "beat", f: "walk-roots-wall", secs: 5.0, from: 3.0, grade: "soft", xf: 0.6,
        cap: G("KIN-01-cap1"), capIn: 1.2 },
      // invite them, then decide what they see: group, sharing, tree
      { kind: "beat", f: "inlay-kin", secs: 6.6, from: 0.0, raw: true, xf: 0.5,
        cap: G("KIN-01-cap2"), capIn: 0.6 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "KIN-02", family: "KIN", slug: "three-checkboxes",
    tests: 'Granularity as reassurance. The competitor is a free vault that syncs to a shared PUBLIC archive; the answer is not promising privacy but showing its resolution — a per-wing/per-room publish tree. Highest-information clip in the proposal.',
    carousel: 'none - the tree is the argument',
    music: "light-in-dark-places.mp3", offset: 36, vol: 0.85,
    beats: [
      { kind: "card", png: G("KIN-02-hook"), secs: 3.0 },
      // pull out over the real publish matrix: Roots/Nest/Craft, each a box
      { kind: "beat", f: "kb-sharing-tree", secs: 7.5, from: 0.3, raw: true, xf: 0.5,
        cap: G("KIN-02-cap1"), capIn: 4.6 },
      // you decide which of these open: the double doors, closed then held
      { kind: "beat", f: "corridor-portal", secs: 4.0, from: 1.2, grade: "soft", xf: 0.6,
        cap: G("KIN-02-cap2"), capIn: 1.4 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "KIN-03", family: "KIN", slug: "the-one-with-the-box",
    tests: 'Role recognition as a hook — names the viewer unpaid family job rather than asking a question. ⚠️ KPI is deliberately saves and shares, NOT comments; if comments carry it, it has drifted into CURIOUS territory.',
    carousel: 'family: group + sharing + tree',
    music: "light-in-dark-places.mp3", offset: 60, vol: 0.9,
    beats: [
      { kind: "card", png: G("KIN-03-hook"), secs: 3.4 },
      // nobody appointed you: the hang, moving
      { kind: "beat", f: "walk-nest-wall", secs: 4.4, from: 4.0, grade: "soft", xf: 0.6,
        cap: G("KIN-03-cap1"), capIn: 1.2, capOut: 3.8 },
      // you don't have to carry it alone: the hall long and populated
      { kind: "beat", f: "corridor-grow4", secs: 3.8, from: 1.4, grade: "soft", xf: 0.5,
        cap: G("KIN-03-cap2"), capIn: 0.8 },
      // ⚠️ Was a second corridor walk (walk-roots), which just repeated the move
      // faster and added nothing after the growing hall. A warm room instead —
      // what the shared archive becomes — leads into the handover carousel.
      { kind: "beat", f: "room-walkin-h1", secs: 4.6, from: 1.5, grade: "soft", xf: 0.6 },
      { kind: "beat", f: "inlay-kin", secs: 6.6, from: 0.0, raw: true, xf: 0.5 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  // ══ Family: CHAPTER (CH) — the interview that writes back. Memoirist ICP,
  // reading as the payoff. The product asks a small question and later returns
  // prose you did not write. Frame is PRIVATE (the interview is yours,
  // exportable). No death — the emotion is being SEEN.
  //
  // ⚠️ CH-01 and CH-03 depend on a chapter with WOVEN prose. That is now done:
  // weave-chapter.mjs ran Weave on the seeded chapter (32 memories attached), and
  // the scroll shows real memoir text ("Looking back on those years between 1988
  // and 2000…") drawn from those memories rather than the empty-state placeholder.
  // The re-weave was verified by pixel diff, since the prose does not surface in
  // the DOM text API — which is why every text-based check had reported it wrong.
  {
    code: "CHAPTER-02", family: "CHAPTER", slug: "a-minute-kept-forever",
    tests: 'Isolates QUESTION QUALITY against HT-02/03, which hand the same insight to the viewer as advice. Here the product performs it. If it beats them on go-clicks (not saves, where a list wins), "it asks so you do not have to remember to" is the real product claim.',
    carousel: 'none - the question is the argument',
    music: "light-in-dark-places.mp3", offset: 36, vol: 0.85,
    beats: [
      { kind: "card", png: G("CHAPTER-02-hook"), secs: 3.0 },
      // the real daily question, large and legible
      { kind: "beat", f: "kb-suggested", secs: 4.4, from: 0.3, raw: true, xf: 0.5,
        cap: G("CHAPTER-02-cap1"), capIn: 2.4 },
      // the exact question, written out — the snip read weak on its own
      { kind: "card", png: G("CHAPTER-02-quote"), secs: 3.6, xf: 0.5 },
      // ⚠️ the ANSWER, not doors. The two plaquettes added nothing to "small
      // question, then a chapter" — the payoff of this family is READING what
      // the answer becomes, so it scrolls the woven chapter instead.
      { kind: "beat", f: "scroll-lifestory-bare", secs: 6.6, from: 0.0, raw: true, xf: 0.5,
        cap: G("CHAPTER-02-cap2"), capIn: 0.8 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "CHAPTER-01", family: "CHAPTER", slug: "it-wrote-the-part",
    tests: 'Family baseline: can TEXT output be a short-form payoff at all — a scroll of prose against the catalogue grammar of wipes and walks? Judged on completion and saves, not 3s-hold, since reading is slow-intent. The chapter is now re-woven, so the scroll shows real memoir prose drawn from the attached memories.',
    carousel: 'none - the prose is the payoff',
    music: "light-in-dark-places.mp3", offset: 12, vol: 0.85,
    beats: [
      { kind: "card", png: G("CHAPTER-01-hook"), secs: 3.0 },
      // scroll the woven chapter (label-less: the prose is the subject)
      { kind: "beat", f: "scroll-lifestory-bare", secs: 6.6, from: 0.0, raw: true, xf: 0.5,
        cap: G("CHAPTER-01-cap1"), capIn: 0.6 },
      // then the chapter gets a room
      { kind: "beat", f: "room-walkin-h3", secs: 5.0, from: 1.5, grade: "soft", xf: 0.6,
        cap: G("CHAPTER-01-cap2"), capIn: 2.0 },
      { kind: "card", png: ENDCARD, secs: 3.4, xf: 0.45, sheen: true },
    ],
  },
  {
    code: "CHAPTER-03", family: "CHAPTER", slug: "weave-again",
    tests: 'The dopamine cell: imports RESTORE before/after grammar but applies it to TEXT — tests whether the reveal mechanism is modality-independent. Now buildable: the chapter has been re-woven from attached memories.',
    carousel: 'none - the reweave is the reveal',
    music: "light-in-dark-places.mp3", offset: 60, vol: 0.85,
    beats: [
      { kind: "card", png: G("CHAPTER-03-hook"), secs: 3.0 },
      // the woven chapter, scrolled — the re-weave's output
      { kind: "beat", f: "scroll-lifestory-bare", secs: 5.6, from: 0.0, raw: true, xf: 0.5,
        cap: G("CHAPTER-03-cap1"), capIn: 2.4 },
      { kind: "beat", f: "room-pullback-h1", secs: 5.0, from: 1.0, grade: "soft", xf: 0.6,
        cap: G("CHAPTER-03-cap2"), capIn: 1.6 },
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
  // LEG-023-poort: RESTORE/PARENT-clips tonen per definitie AI- of sim-beeld —
  // bouwen zonder markeringsvlag is vrijwel zeker een vergeten declaratie.
  if (/^(RESTORE|PARENT)-/.test(c.code) && !c.aiFaces && !c.simulated) {
    console.warn(`   ⚠️  LEG-023: ${c.code} draagt geen aiFaces/simulated-vlag — zet er een, of documenteer waarom niet (zie OWNER-BRIEFING-CLIP-FLOW).`);
  }
  mux(silent, c.music, final, c);
  for (const p of parts) rmSync(p, { force: true });
  rmSync(silent, { force: true });
  console.log(`   -> ${final.replace(REPO, ".")}  ${dur(final).toFixed(1)}s`);
}

/**
 * Emit a manifest beside the videos so the review viewer cannot drift from the
 * clips it is describing.
 *
 * /staging/clips used to carry a hardcoded map of what each clip tests. It went
 * stale twice: it warned about a problem WONDER-04 no longer had, and the whole
 * LEGACY family appeared with no hypothesis at all because nobody remembered to
 * add it in a second place. The brief belongs next to the beats it explains.
 *
 * Written for every clip in CLIPS, not only the ones just built, so a partial
 * build cannot shrink the manifest — the same rule the screen library needed.
 */
writeFileSync(resolve(OUT, "manifest.json"), JSON.stringify(
  CLIPS.map((c) => ({
    code: c.code, family: c.family, slug: c.slug,
    tests: c.tests || null, carousel: c.carousel || null,
  })), null, 2));
