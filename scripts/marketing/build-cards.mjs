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
  // ── Family: LEGACY (LG) — memoirist ICP, mortality-salience without grief-bait.
  // Chosen over RESTORE because RESTORE needs GFPGAN before/after pairs that do
  // not exist yet, and over GRAVE because that family opens on a cluttered
  // camera roll we also cannot produce. These three are shootable today.
  // Owner USP decision 2026-09-07: the frame is private + visitable + yours;
  // "permanent/forever" may support but never headline. None of these do.
  "LEGACY-01": {
    // ⚠️ Captions ALIGNED to the plaques actually on screen. The catalogue's
    // years (1943 the kitchen, 1962 the tram stop, 1971 the first house) were
    // invented for a life the footage does not show, so every beat had a caption
    // saying one thing while the bronze plate under the photograph said another.
    // These are the four hero photographs in the order the clip cuts them, with
    // their own titles and years.
    hook: "She was born in 1938.\nThis is her whole life, on four walls.",
    caps: ["1961. the day they married.", "1974. still dancing.",
           "1996. the walk they always took.", "1998. the day she made it.",
           "four photographs. one life."],
  },
  "LEGACY-05": {
    hook: "Call your mother tonight.\nAsk her about 1974.",
    caps: ["1974", "1977", "1981", "then give the answer somewhere to live.", "one call. one room."],
  },
  "LEGACY-06": {
    hook: "Her daughter gave her this for\nher 70th. It took a year to fill.",
    caps: ["not a photo book. a house.", "month 2: her childhood.",
           "month 6: the wedding.", "month 12: the grandchildren's wing.",
           "a year of sunday phone calls, hanging on walls."],
  },
  "LEGACY-09": {
    hook: "POV: it's 2076 and you're walking\nthrough your grandmother's memories.",
    caps: ["her handwriting.", "her voice on this one.",
           "the kitchen, exactly as she told it.", "she built it in 2026."],
  },
  "LEGACY-10": {
    hook: "You've been going to write it\nall down for ten years.",
    caps: ["the book never happens. that's fine.",
           "a memoir isn't a manuscript. it's rooms.",
           "one memory at a time. no blank page."],
  },
  "LEGACY-02": {
    hook: "What's the one question\nyou never asked your father?",
    caps: ["how did you meet mum?", "what were you afraid of at 30?",
           "what do you want us to keep?", "he answered. it hangs here now.",
           "ask it this week."],
  },
  "LEGACY-04": {
    hook: "A family story survives about\nthree generations. Then it's gone.",
    caps: ["you know your grandparents' names.",
           "can you tell one story about their parents?",
           "unless someone builds it a place to live.",
           "yours could outlast you."],
  },
  "LEGACY-08": {
    // ⚠️ Rebuilt on the Interviews list. The captions no longer INVENT twelve
    // questions over room footage — the app already has dozens, grouped, and the
    // clip scrolls the real ones. These few name what is passing under them.
    hook: "The app has 40 questions to ask\nyou. Screenshot the ones that land.",
    caps: ["family traditions.", "the love story.",
           "the turning points.", "and then it writes them into rooms."],
  },
  // ── Family: RESTORE (RS) — borrowed demand. The payoff is the reveal itself,
  // so these carry the fewest words in the library: a hook, then silence.
  "RESTORE-01": {
    // ⚠️ "them", not "her". The catalogue hook was written for a single
    // woman's portrait; the footage shows a man and then a couple, so the clip
    // spent its opening line describing someone who never appears.
    hook: "Watch them come back.",
    caps: ["before", "today"],
  },
  "RESTORE-03": {
    hook: "Restoring it was\nthe easy part.",
    caps: ["then it got a wall.",
           "a photo in a folder is filed. a photo on a wall is visited."],
  },
  "RESTORE-05": {
    hook: "There is something in this\nphotograph you cannot see yet.",
    caps: ["there.", "restoration isn't cosmetic. it's evidence."],
  },
  "RESTORE-07": {
    hook: "This is what seventy years\ndoes to a photograph.",
    caps: ["1954", "1980", "today", "unless someone stops it."],
  },
  // Replaces the founder-cam cell, which needs footage the owner is not going to
  // shoot. Tests RECOGNITION as the hook — the viewer seeing their own behaviour
  // — instead of parasocial trust, so it is a different mechanism and carries a
  // different code rather than pretending to be LG-03.
  "LEGACY-03b": {
    hook: "Everyone has this folder.\nNobody has opened it twice.",
    caps: ["12,431 photos.", "no names. no dates. no order.",
           "the same pictures, given a room.", "you don't sort it. you walk it."],
  },
  // ── Family: OWNED (OW) — custody threat, then a demonstrable act of ownership.
  // Sceptic ICP. The palace appears only as the RELIEF beat, never the subject:
  // if an OW clip still works with the palace footage removed it is on-mechanism,
  // and if it collapses it has drifted into WONDER. The frame is YOURS + PRIVATE;
  // "permanent/forever" appears in none of them, per the 2026-09-07 USP decision
  // — permanence is now the consequence of ownership, not the pitch.
  "OWNED-01": {
    hook: "Every app keeps your memories.\nAlmost none will hand them back.",
    caps: ["take all of it, any day.", "and it still isn't a folder."],
  },
  "OWNED-02": {
    hook: "Most apps bury this screen.\nOurs makes you type a word first.",
    caps: ["the exit is not hidden.", "which is exactly why you won't use it."],
  },
  "OWNED-03": {
    // The hook and the footage are the SAME sentence — the clip pushes into the
    // product's own six-point privacy note until it is legible, and lets that be
    // the argument. No authored claim over it.
    hook: "The most important sentence in this app\nis in six-point grey.",
    // The EXACT settings-page text, re-typeset large. Owner: the push into the
    // real six-point note leaves it too small to read — so the clip shows the
    // real page (tiny, in context) and then blows the words up to legible here.
    quote: {
      text: "Memory Palace only accesses your files when you explicitly choose to import them. We never scan, index, or store your cloud files without your direct action.",
      source: "Settings · Connections · the actual text",
    },
    caps: ["nothing came in here that you didn't carry in."],
  },
  // ── Family: KIN (KN) — the family as co-authors. Organiser ICP. The pain is
  // not personal disorder (that is GRAVE) but DISTRIBUTED ownership: the archive
  // is in five houses and the job landed on one person. Relief is handover. The
  // frame is PRIVATE (your family, your rules — a real checkbox tree) with
  // VISITABLE as the payoff.
  "KIN-01": {
    hook: "Everyone in your family is holding\na photo nobody else has.",
    caps: ["this wall was not filled by one person.", "invite them, then decide what they see."],
  },
  "KIN-02": {
    hook: "Three checkboxes decide who ever\nsees your mother's kitchen.",
    caps: ["per wing. per room. not per app.", "you decide which of these open."],
  },
  "KIN-03": {
    hook: "In every family there's one person\nwho ended up with the box. It's you.",
    caps: ["nobody appointed you. it just happened.",
           "you don't have to be the only one carrying it."],
  },
  // ── Family: CHAPTER (CH) — the interview that writes back. Memoirist ICP.
  // Payoff modality is READING: the product asks a small question and later
  // returns prose you did not write about a life you did not think was a story.
  // Frame is PRIVATE (the interview is yours, exportable). No death in it — the
  // emotion is being SEEN, not being lost.
  "CHAPTER-01": {
    hook: "I gave it four photographs.\nIt gave me back a paragraph about my twenties.",
    caps: ["it asks, you answer.", "then the chapter gets a room."],
  },
  "CHAPTER-02": {
    // ⚠️ Hook matches the question the atrium ACTUALLY shows today ("the bravest
    // thing you've ever done"); the card rotates, so it is quoted, not invented.
    hook: "It never asks 'tell me about your life.'\nToday it asked the bravest thing I've ever done.",
    caps: ["one question. most days.", "a year of small answers is a door."],
  },
  "CHAPTER-03": {
    hook: "There's a button in here that rewrites\nyour life in a different voice.",
    caps: ["same memories. different telling.", "the memories don't change. only the words do."],
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

// Case-insensitive: clip codes carry a hook-variant letter (LEGACY-03b), and
// uppercasing the argument made those impossible to select.
const only = (process.argv[2] || "").toLowerCase();
const todo = Object.entries(CARDS).filter(([code]) => !only || code.toLowerCase() === only);
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

/**
 * A `quote` card: a clip's own real product text, re-typeset large and legible,
 * with a source line under it. Built for OWNED-03 — the point of "the small
 * print" is that it is TINY and important, so after the real (tiny) settings
 * page the clip enlarges the EXACT words to where they can actually be read,
 * rather than just pushing into the six-point original, which stays small.
 */
const quoteHtml = (text, source) => `<!DOCTYPE html><meta charset="utf-8"><style>${BASE}
body{background:#1B1613;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 120px}
.mark{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:180px;color:#C8A868;
  line-height:0.6;opacity:.5;margin-bottom:20px}
.q{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:600;
  font-size:56px;line-height:1.34;text-align:center;color:#F0E7D4}
.src{margin-top:44px;font-family:'Source Sans 3',sans-serif;font-weight:300;
  font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:#8C8477}
</style><div class="mark">&ldquo;</div><div class="q">${text}</div><div class="src">${source}</div>`;

let n = 0;
for (const [code, def] of todo) {
  await shot(hookHtml(def.hook), resolve(OUT, `${code}-hook.png`), false);
  n++;
  if (def.quote) {
    await shot(quoteHtml(def.quote.text, def.quote.source), resolve(OUT, `${code}-quote.png`), false);
    n++;
  }
  for (let i = 0; i < (def.caps || []).length; i++) {
    await shot(capHtml(def.caps[i]), resolve(OUT, `${code}-cap${i + 1}.png`), true);
    n++;
  }
  console.log(`   ${code}  hook${def.quote ? " + quote" : ""} + ${def.caps?.length || 0} caption(s)`);
}
await browser.close();
console.log(`\n${n} card(s) -> ${OUT.replace(REPO, ".")}`);
