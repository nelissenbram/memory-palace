#!/usr/bin/env node
/**
 * Typography cards for the clips: hook cards and caption overlays.
 *
 * The existing cards were one-off PNGs in the old repo's clip kit, hand-made per
 * clip. That was fine for one clip and is the reason the library stalled at one:
 * declaring WONDER-04 meant first drawing WONDER-04's artwork. Cards are now
 * generated from text, so a clip is a data change.
 *
 * The look is copied from the shipped cards rather than reinvented, sampled off
 * bat-WONDER-01a-hook.png and endcard-clean.png:
 *   hook     #1B1613 field, centred Cormorant italic in #E8DCC6
 *   caption  transparent, one dark pill low in frame so it sits over footage
 *            without hiding it (measured off bat-WONDER-01a-cap.png)
 * Rendered through a browser rather than ffmpeg's drawtext, for the same reason
 * build-inlay is: escaping commas and Windows font paths inside a filter option
 * is a losing game, and this gets real webfont kerning.
 *
 * Usage:
 *   node scripts/marketing/build-cards.mjs            # every declared card
 *   node scripts/marketing/build-cards.mjs WONDER-04  # one clip
 */
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { REPO, ensureDir, GPU_ARGS, EDGE } from "./kit.mjs";

const OUT = ensureDir(resolve(REPO, "socials-kit/cards"));

/**
 * Card text per clip, straight from docs/CLIP_CATALOG.md.
 * `hook` is the opening card; `caps` are overlays, in the order the clip uses
 * them. Keep hooks to two short lines — three wraps into a wall of italic.
 */
export const CARDS = {
  "WONDER-04": {
    hook: "4,000 photos.\nZero folders.",
    caps: ["just walls.", "just rooms.", "just light."],
  },
  "WONDER-05": {
    hook: "This room was half\nthis size last month.",
    caps: ["it grows every time you add a memory."],
  },
  "WONDER-06": {
    hook: "I stopped scrolling my\ncamera roll after I saw this.",
    caps: ["every photo gets a place."],
  },
  // ── The five that were specified in the entrance hall, re-scoped.
  // /staging has viewers for exterior, corridor and room but not the hall, whose
  // only surface is a fixed 6 s cinematic with no camera control. Rather than
  // leave a third of the family unbuilt, each clip keeps its HYPOTHESIS and
  // moves to a space we can actually shoot — noted per clip in build-clips.
  "WONDER-02": {
    hook: "Look up.",
    caps: ["built to hold one family's memories."],
  },
  "WONDER-03": {
    hook: "Behind each of these doors:\na different chapter of one life.",
    // ⚠️ These name the doors the clip ACTUALLY shows, in order. An earlier set
    // named three rooms over walking footage where no plaquette is legible —
    // asserting names the viewer had no way to read. Only the left-hand doors
    // face the ?cam=door pose, which is why these two and not four.
    caps: ["me, over time", "dad's garage", "rooms grow as the story does."],
  },
  "WONDER-07": {
    hook: "Watch a life\nassemble itself.",
    caps: ["yours starts with one memory."],
  },
  "WONDER-09": {
    // ⚠️ "No cuts" is gone from the hook. The clip now carries a phone beat at
    // the end, so it demonstrably DOES cut — and a clip must not open with a
    // claim its own edit breaks. The tech-flex survives without that half.
    hook: "No CGI renders.\nThis is running in a browser tab.",
    caps: ["a real palace. walk it yourself — no signup."],
  },
  "WONDER-10": {
    // Rethought. The bronze nest was a strange object with nothing to say: the
    // hook pointed at it and the clip had no second thought. A plaquette is
    // just as specific and it MEANS something — every photograph here is
    // recorded with a title and a year, which is the product's actual promise.
    hook: "Every photo here\nhas a name and a year.",
    caps: ["not a filename. a title, and when it happened."],
  },
  "WONDER-08": {
    hook: "The quietest place\non the internet.",
    caps: ["some rooms are just for remembering."],
  },
};

const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap');";
const BASE = `${FONTS}*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px}
.t{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:600;color:#E8DCC6}`;

const hookHtml = (text) => `<!DOCTYPE html><meta charset="utf-8"><style>${BASE}
body{background:#1B1613;display:flex;align-items:center;justify-content:center}
.t{font-size:64px;line-height:1.35;text-align:center;padding:0 130px;
   letter-spacing:.01em;white-space:pre-line}
</style><div class="t">${text}</div>`;

/**
 * Caption plate. Transparent everywhere except the pill, so build-clips can fade
 * it over a beat. Sits at 82% height: clear of the safe area most platforms
 * crop, and out of the way of the shot's subject, which is usually centred.
 */
const capHtml = (text) => `<!DOCTYPE html><meta charset="utf-8"><style>${BASE}
body{background:transparent;position:relative}
.wrap{position:absolute;top:82%;left:0;right:0;display:flex;justify-content:center}
.pill{background:rgba(28,24,20,.72);border-radius:14px;padding:16px 34px;
      backdrop-filter:blur(2px);box-shadow:0 8px 30px rgba(0,0,0,.35)}
.t{font-size:40px;line-height:1.25}
</style><div class="wrap"><div class="pill"><div class="t">${text}</div></div></div>`;

const only = (process.argv[2] || "").toUpperCase();
const todo = Object.entries(CARDS).filter(([code]) => !only || code === only);
if (!todo.length) {
  console.error(`No cards for "${only}". Known: ${Object.keys(CARDS).join(", ")}`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true, executablePath: EDGE, args: GPU_ARGS,
  ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

/** "load", not networkidle0: the Google Fonts @import keeps a socket warm and
 *  networkidle0 sits there until the navigation timeout. */
const shot = async (html, file, transparent) => {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: file, type: "png", omitBackground: transparent });
};

let n = 0;
for (const [code, def] of todo) {
  await shot(hookHtml(def.hook), resolve(OUT, `${code}-hook.png`), false);
  n++;
  for (let i = 0; i < (def.caps || []).length; i++) {
    await shot(capHtml(def.caps[i]), resolve(OUT, `${code}-cap${i + 1}.png`), true);
    n++;
  }
  console.log(`   ${code}  hook + ${def.caps?.length || 0} caption(s)`);
}
await browser.close();
console.log(`\n${n} card(s) -> ${OUT.replace(REPO, ".")}`);
