#!/usr/bin/env node
/**
 * The "in your pocket" phone-inlay beat: a carousel of app screens inside a phone
 * frame, led by the screens that prove the USP the clip is selling.
 *
 * Design notes, all of them owner corrections:
 *  - Several screens, not one. One screenshot proves a screen exists; a carousel
 *    that keeps travelling proves an app.
 *  - It PAUSES on each screen — a constant glide gives no time to read anything.
 *  - A neighbour is always half in frame, so the library reads as deeper than the
 *    few screens actually shown.
 *  - Captions sit ABOVE the phone and move around, rather than being printed over
 *    the very screenshot they describe.
 *
 * Captions and frame are rendered as transparent PNGs rather than drawn with
 * ffmpeg's drawtext: the labels contain commas and the Windows font path a colon,
 * both of which must be escaped inside a filter option, and getting it wrong
 * surfaces only as an opaque parse error. PNGs also give real webfont kerning.
 *
 * Usage: node scripts/marketing/build-inlay.mjs <usp> [outName]
 */
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir, GPU_ARGS, EDGE } from "./kit.mjs";

const [, , usp = "upload", outName = `inlay-${process.argv[2] || "upload"}`] = process.argv;
const SCREENS = resolve(REPO, "socials-kit/screens");
const OUT = ensureDir(resolve(REPO, "socials-kit/footage"));
const WORK = ensureDir(resolve(REPO, "socials-kit/clipwork"));
const out = resolve(OUT, `${outName}.mp4`);

// ── selection ───────────────────────────────────────────────────────────────
const lib = JSON.parse(readFileSync(resolve(SCREENS, "screens.json"), "utf8"));
const tagged = lib.filter((s) => s.usp.includes(usp));
const rest = lib.filter((s) => !s.usp.includes(usp));
// ⚠️ Diversity by FEATURE, not just by tag. Tagging alone put keps, kep-new and
// kep-landing in the first three for usp="upload" — all three the same feature,
// so the carousel argued the app does one thing. Screens are grouped and the
// lead-in takes at most one per group; the rest of the library still trails
// behind them so the strip stays deep.
const GROUP = {
  keps: "kep", "kep-new": "kep", "kep-landing": "kep",
  "settings-family": "sharing", "settings-sharing": "sharing", "settings-connections": "import",
  "settings-subscription": "plan", pricing: "plan",
  "library-grid": "library", pending: "library",
  atrium: "palace", explore: "discover", me: "progress",
  "family-tree": "family", help: "help",
};
const leads = [];
const seenGroup = new Set();
for (const s of [...tagged, ...rest]) {
  const g = GROUP[s.id] || s.id;
  if (seenGroup.has(g)) continue;
  seenGroup.add(g);
  leads.push(s);
  if (leads.length === 3) break;
}
const strip = [...leads, ...[...tagged, ...rest].filter((s) => !leads.includes(s))];
console.log(`usp="${usp}" leads with: ${strip.slice(0, 3).map((c) => c.id).join(", ")}`);

/** Plain language, not product names: "Meet Kep" means nothing to a stranger. */
const LABELS = {
  "library-grid": "every photo in one place",
  keps: "saved by message",
  "kep-new": "capture by WhatsApp",
  pending: "sort them later",
  atrium: "your palace at a glance",
  explore: "visit other palaces",
  me: "your progress",
  "family-tree": "build the family tree",
  "settings-family": "invite the family",
  "settings-connections": "import from the cloud",
  "settings-sharing": "choose who sees what",
  "settings-subscription": "your plan",
  "kep-landing": "save a memory by text",
  pricing: "free to start",
  help: "guides and answers",
};

const S = { x: 232, y: 430, w: 616, h: 1096, r: 46 };
const GAP = 26, STEP = S.w + GAP;
const HOLD = 1.5, SLIDE = 0.75, CYCLE = HOLD + SLIDE;
const TOTAL = 6.6;
const NCAP = Math.min(3, strip.length);

// ── plates (phone frame + one caption per held screen) ──────────────────────
const shell = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&family=Source+Sans+3:wght@300&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1920px;background:transparent}`;

const frameHtml = `<!DOCTYPE html><meta charset="utf-8"><style>${shell}
body{position:relative;font-family:'Source Sans 3',sans-serif}
.hole{position:absolute;left:${S.x}px;top:${S.y}px;width:${S.w}px;height:${S.h}px;
  border-radius:${S.r}px;box-shadow:0 0 0 9999px #1B1613}
.bezel{position:absolute;left:${S.x - 18}px;top:${S.y - 18}px;width:${S.w + 36}px;height:${S.h + 36}px;
  border-radius:${S.r + 14}px;border:3px solid rgba(228,216,198,.30);
  box-shadow:0 30px 70px rgba(0,0,0,.62), inset 2px 0 0 rgba(255,255,255,.10)}
.notch{position:absolute;left:${S.x + S.w / 2 - 58}px;top:${S.y + 12}px;width:116px;height:24px;
  border-radius:13px;background:#1B1613}
.btn{position:absolute;background:rgba(228,216,198,.22);border-radius:3px}
.b1{left:${S.x - 22}px;top:${S.y + 190}px;width:4px;height:56px}
.b2{left:${S.x - 22}px;top:${S.y + 262}px;width:4px;height:56px}
.b3{left:${S.x + S.w + 18}px;top:${S.y + 230}px;width:4px;height:92px}
/* Owner: "all of this in your pocket" and "the real app — in your hand" are
   gone. Both were assertions ABOUT the screens rather than anything the viewer
   could not already see, and the top line sat directly above the per-screen
   caption, so two pieces of italic serif competed for the same glance. What is
   left is the phone and one caption naming the feature on show. */
</style>
<div class="hole"></div><div class="bezel"></div><div class="notch"></div>
<div class="btn b1"></div><div class="btn b2"></div><div class="btn b3"></div>`;

/**
 * Alternating placement, so the caption is not parked in one spot all beat.
 *
 * ⚠️ The rotation signs are INVERTED from the obvious guess. SVG rotate() turns
 * clockwise, and in screen coordinates (y down) turning a DOWN-pointing arrow
 * clockwise swings it to the LEFT: rotate(26) on (0,1) gives (-0.44, 0.90). So a
 * caption on the left, which needs its arrow aimed down-RIGHT at the phone,
 * takes a NEGATIVE angle. The first pass had +26 on the left and -26 on the
 * right, which pointed both arrows away from the screen they were labelling —
 * the owner's "de pijltjes moeten naar het scherm wijzen".
 *
 * The angles are also steeper than a token lean: from the left caption the phone
 * centre sits roughly 390px across and 130px down, and a 26-degree tilt at that
 * offset does not read as pointing at anything.
 */
const POS = [
  { items: "flex-start", pad: "0 0 0 108px", top: 232, rot: -48 },  // aims down-right
  { items: "center", pad: "0", top: 206, rot: 0 },                  // straight down
  { items: "flex-end", pad: "0 108px 0 0", top: 232, rot: 48 },     // aims down-left
];
const capHtml = (label, p) => `<!DOCTYPE html><meta charset="utf-8"><style>${shell}
.wrap{position:absolute;top:${p.top}px;left:0;right:0;padding:${p.pad};
   display:flex;flex-direction:column;align-items:${p.items};gap:6px}
.c{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:600;
   font-size:44px;color:#E8DCC6;text-shadow:0 2px 16px rgba(0,0,0,.7)}
/* The arrow sits under its own caption and leans back toward the phone, so the
   pairing survives the caption moving left/centre/right each hold. */
.a{transform:rotate(${p.rot}deg)}
</style><div class="wrap"><div class="c">${label}</div>
<svg class="a" width="46" height="76" viewBox="0 0 46 76" fill="none"
     stroke="#C8A868" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M23 4 C 31 24, 15 44, 23 66"/><path d="M14 55 l9 13 9-13"/>
</svg></div>`;

const browser = await puppeteer.launch({
  headless: true, executablePath: EDGE, args: GPU_ARGS, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const shot = async (html, file) => {
  // "load", not "networkidle0": the Google Fonts @import keeps a connection warm
  // and networkidle0 sat there until the 30s navigation timeout. A fixed settle
  // is enough for a webfont to paint.
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: file, type: "png", omitBackground: true });
  return file;
};

const frame = await shot(frameHtml, resolve(WORK, "phone-frame.png"));
const caps = [];
for (let i = 0; i < NCAP; i++) {
  const label = LABELS[strip[i].id] || strip[i].id.replace(/-/g, " ");
  caps.push(await shot(capHtml(label, POS[i]), resolve(WORK, `cap-${i}.png`)));
}
await browser.close();

// ── composite ───────────────────────────────────────────────────────────────
const ins = strip.map((c) => `-loop 1 -t ${TOTAL} -i "${resolve(SCREENS, c.file)}"`).join(" ");
const capIns = caps.map((c) => `-loop 1 -t ${TOTAL} -i "${c}"`).join(" ");
const iFrame = strip.length;

const cells = strip.map((c, i) =>
  `[${i}:v]scale=${S.w}:${S.h}:force_original_aspect_ratio=increase,crop=${S.w}:${S.h},` +
  `pad=${STEP}:${S.h}:0:0:color=#1B1613,format=yuv420p[p${i}]`).join(";");

// Hold on a screen for HOLD, then slide one STEP over SLIDE, and repeat.
const xExpr = `${STEP}*trunc(t/${CYCLE})+${STEP}*max(0\\,t-trunc(t/${CYCLE})*${CYCLE}-${HOLD})/${SLIDE}`;

let chain =
  `${cells};${strip.map((_, i) => `[p${i}]`).join("")}hstack=inputs=${strip.length}[row];` +
  `[row]crop=${S.w}:${S.h}:x='${xExpr}':y=0,format=yuv420p[scr];` +
  `color=c=#1B1613:s=1080x1920:d=${TOTAL},format=yuv420p[bg];` +
  `[bg][scr]overlay=${S.x}:${S.y}:shortest=1[base];[base][${iFrame}:v]overlay=0:0[v0]`;
for (let i = 0; i < NCAP; i++) {
  const t0 = i * CYCLE, t1 = t0 + HOLD + 0.3;
  chain += `;[v${i}][${iFrame + 1 + i}:v]overlay=0:0:enable='between(t\\,${t0.toFixed(2)}\\,${t1.toFixed(2)})'[v${i + 1}]`;
}
chain += `;[v${NCAP}]format=yuv420p[v]`;

execSync(
  `ffmpeg -y -v error ${ins} -i "${frame}" ${capIns} -filter_complex "${chain}" -map "[v]" -t ${TOTAL} ` +
  `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
  { stdio: "inherit" },
);
console.log(`-> ${out.replace(REPO, ".")}  ${TOTAL}s`);
