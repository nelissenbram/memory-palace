#!/usr/bin/env node
/**
 * Phone-inlay beats that SCROLL a page, rather than sliding between stills.
 *
 * The carousel proves an app has screens; it cannot show that a screen has depth.
 * Owner: "ik verwacht ook een scroll door atrium en library" — a page that keeps
 * going under your thumb reads as content, where three cropped stills read as
 * three screenshots.
 *
 * Method: ONE full-page screenshot, then pan a phone-sized window down it with
 * ffmpeg. Screenshotting 180 frames and assembling them would also work and be
 * far slower, and would judder wherever a frame took longer to paint; panning a
 * single tall render is perfectly smooth by construction. The trade is that
 * on-page animation is frozen — irrelevant for content pages, and the reason
 * this is a separate tool rather than a mode of build-inlay.
 *
 * Usage:
 *   node scripts/marketing/build-scroll.mjs atrium
 *   node scripts/marketing/build-scroll.mjs --list
 */
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir, GPU_ARGS, EDGE } from "./kit.mjs";

const BASE = process.env.MP_APP_BASE || "http://localhost:3002";
const PROFILE = resolve(REPO, "store-assets/review/_reviewacct-profile");
const OUT = ensureDir(resolve(REPO, "socials-kit/footage"));
const WORK = ensureDir(resolve(REPO, "socials-kit/clipwork"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `open` clicks into a surface with no URL of its own. `expect` proves we are on
 * the right page before spending a capture on it — the screen library learned
 * that the hard way, four rounds of plausible screenshots of the wrong thing.
 */
const PAGES = [
  { id: "atrium", path: "/atrium",  expect: /Palace Visitors|Enter Your Palace|Your Atrium/i,
    label: "your palace at a glance" },
  // ⚠️ The Library has no URL of its own. /library REWRITES to /palace (see
  // next.config: "/atrium and /library serve the same palace page"), and the
  // library view is reached by pressing a card inside it, which changes no
  // route. So it is clicked into, like the achievements panel.
  { id: "library", path: "/atrium",  expect: /Palace Visitors|Enter Your Palace|Your Atrium/i,
    open: ["enter your library"], label: "every memory, in one place" },
  // The interview flow, scrolled: the point of this feature is that it KEEPS
  // asking — a still frame shows one question, a scroll shows a conversation
  // with somewhere to go.
  { id: "interview", path: "/atrium",  expect: /Palace Visitors|Enter Your Palace|Your Atrium/i,
    open: ["record your story", "start interview"], label: "it asks, you answer" },
  // Scrolled, because the argument is the WHOLE page: export, then the delete
  // that proves it is yours. A still frame shows one half and hides the point.
  { id: "security", path: "/settings/security", expect: /Danger Zone|Export Your Data/i,
    label: "take it all with you" },
  // The AI interview, scrolled through its chapters and the prose it writes back.
  // Owner on LEGACY-08: the clip must travel through the QUESTIONS AND ANSWERS,
  // not sit on a still of the panel — the feature's whole argument is that it
  // keeps asking and keeps writing.
  { id: "lifestory", path: "/atrium", expect: /Palace Visitors|Enter Your Palace|Your Atrium/i,
    // 15 s, not the usual 6.6: LEGACY-08 is built ON this scroll rather than
    // ending with it, and five questions need room to be read.
    open: ["life story", "record your story"], panel: "Life Story", secs: 15,
    label: "it asks. you answer. it writes." },
  // ⚠️ Label-less twin. When a scroll is a clip's BODY rather than its outro the
  // built-in caption collides with the clip's own captions — LEGACY-08 carried
  // "it asks. you answer. it writes." across the top while a question sat at the
  // bottom of the same frame. A scroll that is the subject should not also
  // annotate itself.
  /**
   * ⚠️ DOES NOT WORK YET, kept so the next attempt starts informed.
   *
   * LEGACY-08 should walk the interview OPTIONS — type or speak, and a
   * Literary / Balanced / Factual voice — because scrolling one woven chapter
   * shows the OUTPUT of the feature and hides the feature itself.
   *
   * The two clicks land (both log "opened via"), but the captured scroll
   * contains only chapter prose: expanding the panel to its full height appears
   * to close the recorder, so the options are gone by the time the screenshot
   * is taken. Needs the recorder captured at viewport height instead, without
   * the expand-and-pan trick.
   */
  { id: "interview-options", path: "/atrium", expect: /Palace Visitors|Enter Your Palace|Your Atrium/i,
    open: [["life story", "record your story"], ["record an interview"]],
    panel: "Life Story", secs: 15, label: null },
  { id: "lifestory-bare", path: "/atrium", expect: /Palace Visitors|Enter Your Palace|Your Atrium/i,
    open: ["life story", "record your story"], panel: "Life Story", secs: 15, label: null },
  { id: "explore", path: "/explore", expect: /Explore Palaces/i,
    label: "visit other palaces" },
  { id: "keps", path: "/palace/keps", expect: /Meet Kep|Kep Capture/i,
    label: "saved by message" },
  { id: "family", path: "/family-tree", expect: /Family Tree/i,
    label: "build the family tree" },
];

const DEMO_NAME_FROM = "Apple Review";
const DEMO_NAME_TO = "Elena Marchetti";

const S = { x: 232, y: 430, w: 616, h: 1096, r: 46 };
const DEFAULT_TOTAL = 6.6;

/**
 * Caption plate + arrow, matching the carousel's.
 *
 * The scroll beats shipped without one: a phone appears at the end of a clip and
 * nothing says what you are looking at. The PAGES entries have carried a `label`
 * from the start — it was simply never drawn. Same typography, same gold arrow,
 * so a scroll outro and a carousel outro read as the same device.
 *
 * ⚠️ The arrow rotation is NEGATIVE to lean right. SVG rotate() is clockwise and
 * in screen coordinates (y down) that swings a down-pointing arrow LEFT — the
 * carousel had both its arrows aimed away from the phone until this was fixed.
 * Straight down (0) needs no sign, but the offset variants do.
 */
const capHtml = (label) => `<!DOCTYPE html><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1920px;background:transparent}
.wrap{position:absolute;top:206px;left:0;right:0;display:flex;flex-direction:column;
  align-items:center;gap:6px}
.c{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:600;
   font-size:44px;color:#E8DCC6;text-shadow:0 2px 16px rgba(0,0,0,.7)}
</style><div class="wrap"><div class="c">${label}</div>
<svg width="46" height="76" viewBox="0 0 46 76" fill="none"
     stroke="#C8A868" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M23 4 C 31 24, 15 44, 23 66"/><path d="M14 55 l9 13 9-13"/>
</svg></div>`;

const arg = (process.argv[2] || "").toLowerCase();
if (process.argv.includes("--list")) {
  for (const p of PAGES) console.log(`${p.id.padEnd(10)} ${p.path}`);
  process.exit(0);
}
const todo = arg ? PAGES.filter((p) => p.id === arg) : PAGES;
if (!todo.length) { console.error(`No page "${arg}". Known: ${PAGES.map((p) => p.id).join(", ")}`); process.exit(1); }

const browser = await puppeteer.launch({
  headless: false, executablePath: EDGE, userDataDir: PROFILE,
  args: [...GPU_ARGS, "--window-size=560,1040"],
  protocolTimeout: 240000, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });

const DISMISS = ["add photos later", "explore on my own", "skip intro", "skip tutorial",
  "maybe later", "not now", "accept", "continue", "got it", "skip", "enter the room"];
const clickText = (words) => page.evaluate((ws) => {
  const norm = (s) => (s || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  // NOT offsetParent: it is null for every position:fixed element, i.e. modals.
  const shown = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const st = getComputedStyle(e);
    return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.1;
  };
  const hit = [...document.querySelectorAll("button,a[role=button]")]
    .filter((b) => shown(b) && !b.disabled)
    .find((b) => norm(b.textContent) !== "skip to content" && ws.some((w) => norm(b.textContent).includes(w)));
  if (hit) { hit.click(); return hit.textContent.trim().slice(0, 28); }
  return null;
}, words);
const clearOverlays = async () => {
  for (let i = 0; i < 12; i++) { if (!(await clickText(DISMISS))) return; await sleep(1500); }
};

for (const p of todo) {
  console.log(`● ${p.id}`);
  /**
   * ⚠️ ?onboarding=off. MemoryPalace forces the walkthrough on every login
   * for any non-production host — deliberately, so onboarding can be
   * reviewed on previews — and localhost is a non-production host. That is
   * why the atrium intercepted captures at random and why clicking into its
   * panels produced the same picture under three different names. The escape
   * hatch was documented in a comment beside the flag the whole time.
   */
  const url = `${BASE}${p.path}` + (p.path.includes("?") ? "&" : "?") + "onboarding=off";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await clearOverlays();

  let ok = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const st = await page.evaluate((src) => {
      const t = (document.body.innerText || "").replace(/\s+/g, " ").trim();
      return { hit: new RegExp(src.slice(1, src.lastIndexOf("/")), "i").test(t) };
    }, String(p.expect)).catch(() => null);
    if (st?.hit) { ok = true; break; }
    await clearOverlays();
    await sleep(700);
  }
  if (!ok) { console.log(`   never showed ${p.expect} — SKIPPED`); continue; }
  await clearOverlays();
  await sleep(1200);

  /**
   * Click into a view that has no route of its own. `open` may be a list of
   * words (one click) or a list of lists (a sequence) — the interview options
   * live two presses deep: Life Story, then Record an interview.
   */
  if (p.open) {
    const steps = Array.isArray(p.open[0]) ? p.open : [p.open];
    let failed = null;
    for (const step of steps) {
      const hit = await clickText(step);
      if (!hit) { failed = step; break; }
      console.log(`   opened via "${hit}"`);
      await sleep(2800);
    }
    if (failed) { console.log(`   no button matching ${JSON.stringify(failed)} — SKIPPED`); continue; }
    await clearOverlays();
    await sleep(900);
  }

  await page.evaluate((from, to) => {
    for (const el of document.querySelectorAll("nextjs-portal,[data-nextjs-toast],[data-next-badge-root]")) el.remove();
    for (const el of document.querySelectorAll("div,section,aside")) {
      const t = el.textContent || "";
      if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400
          && getComputedStyle(el).position === "fixed") el.style.setProperty("display", "none", "important");
    }
    // Same demo-account substitution as the screen library: Apple signs into
    // this login, so its profile stays as the review notes describe and the
    // name is swapped in the DOM instead.
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; const re = new RegExp(from, "g");
    while ((n = w.nextNode())) if (n.nodeValue && re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, to);
  }, DEMO_NAME_FROM, DEMO_NAME_TO).catch(() => {});
  await sleep(500);

  /**
   * ⚠️ fullPage is NOT enough here. The app is a fixed-viewport shell that
   * scrolls an INNER container, so fullPage returned exactly one screenful
   * (1080x1920) and the pan had nothing to travel over — ffmpeg then refused a
   * 1096px crop out of a 1095px frame, which is how the problem surfaced.
   *
   * So: find the element that actually scrolls (largest scrollHeight beyond its
   * own clientHeight), then let it grow to its full height and unpin whatever is
   * clamping the page, so one screenshot contains the whole thing.
   */
  const pageH = await page.evaluate((panelText) => {
    /**
     * When a PANEL is open, scroll the panel — not the page behind it.
     *
     * The scroller was chosen as the tallest scrollable element in the document,
     * and the atrium underneath a modal is always taller than the modal. So the
     * life-story capture panned through the atrium's action list while carrying
     * the caption "it asks. you answer. it writes." — right label, wrong
     * content, the exact failure this pipeline keeps having to unlearn.
     *
     * A modal is position:fixed, so scope the search inside the innermost fixed
     * container that actually holds text (the outermost is the dimming backdrop).
     */
    const all = [...document.body.querySelectorAll("*")];
    let best = null, bestOver = 0;
    /**
     * ⚠️ Pick the scroller by CONTENT, not by height, when a panel is open.
     *
     * The Life Story panel is a div.mp-scroll of about 1550 px sitting over an
     * atrium of about 3300 px — and it is position:relative, not fixed, so a
     * "find the modal" heuristic missed it twice. Choosing the tallest scroller
     * panned through the atrium's action list under the caption "it asks. you
     * answer. it writes.": the right label over the wrong content, which is the
     * failure this pipeline exists to prevent.
     *
     * With `panel` set, only a scroller whose own text carries that marker is
     * eligible. No marker, no capture — better absent than wrong.
     */
    if (panelText) {
      // Smallest match that is still substantial. The panel's own text also
      // appears in the atrium wrapper behind it (the panel is a descendant), so
      // "largest match" returns the page again; "smallest match" returns a
      // 120 px fragment of the heading. The floor separates the two.
      const MIN = 400;
      for (const el of all) {
        if (el.scrollHeight - el.clientHeight <= 8) continue;
        if (el.scrollHeight < MIN) continue;
        if (!(el.innerText || "").includes(panelText)) continue;
        if (!best || el.scrollHeight < best.scrollHeight) best = el;
      }
      if (!best) return -1;
      bestOver = best.scrollHeight;
      // Tag it so the screenshot can target the ELEMENT. Measuring the panel and
      // then capturing the page was the last version of this bug: the numbers
      // said 1551 px of Life Story while the image was the atrium, because a
      // fullPage shot starts at the top of the document and the panel is not
      // there.
      best.setAttribute("data-mp-scroll", "1");
    }
    for (const el of best ? [] : all) {
      const over = el.scrollHeight - el.clientHeight;
      // ⚠️ Rank by CONTENT HEIGHT, not by overflow, and drop the clientHeight
      // floor. On /settings/security the tallest overflow belonged to a 40 px
      // strip, so the pan had nothing to travel and the page was reported as
      // unscrollable while its export and danger-zone sections sat below the
      // fold. What matters is which element holds the most content.
      if (over > 8 && el.scrollHeight > bestOver) { best = el; bestOver = el.scrollHeight; }
    }
    for (const el of [document.documentElement, document.body]) {
      el.style.setProperty("height", "auto", "important");
      el.style.setProperty("overflow", "visible", "important");
      el.style.setProperty("position", "static", "important");
    }
    if (best) {
      const full = best.scrollHeight;
      best.style.setProperty("height", `${full}px`, "important");
      best.style.setProperty("max-height", "none", "important");
      best.style.setProperty("overflow", "visible", "important");
      // ⚠️ Expanding the scroller alone is not enough: an ANCESTOR is usually the
      // thing pinning the layout to one viewport (height:100vh + overflow:hidden
      // on an app shell). The atrium reported 3374px of content and still
      // screenshotted exactly one screenful until the whole chain was unclamped.
      for (let el = best.parentElement; el; el = el.parentElement) {
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("min-height", "0", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("overflow", "visible", "important");
        if (getComputedStyle(el).position === "fixed") el.style.setProperty("position", "static", "important");
      }
      // Fixed chrome (bottom nav, headers) would smear down a panned capture.
      for (const el of document.querySelectorAll("*")) {
        if (getComputedStyle(el).position === "fixed") el.style.setProperty("display", "none", "important");
      }
      // ⚠️ Report where the CONTENT ends, not how tall the box now is. Forcing a
      // container to its scrollHeight can leave blank space below the last real
      // element (lazily-mounted or virtualised children never fill it), and the
      // atrium panned into two seconds of white before this. The lowest visible
      // element bottom is the honest floor.
      let bottom = 0;
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.width > 0 && getComputedStyle(el).visibility !== "hidden") {
          bottom = Math.max(bottom, r.bottom + window.scrollY);
        }
      }
      return Math.min(full, Math.ceil(bottom) + 24);
    }
    return document.documentElement.scrollHeight;
  }, p.panel || null).catch(() => 0);
  if (pageH === -1) { console.log(`   panel "${p.panel}" not found as a scroller — SKIPPED`); continue; }
  await sleep(900);
  const tall = resolve(WORK, `scroll-${p.id}.png`);
  const target = p.panel ? await page.$('[data-mp-scroll="1"]') : null;
  if (target) await target.screenshot({ path: tall, type: "png" });
  else await page.screenshot({ path: tall, type: "png", fullPage: true });
  console.log(`   scrollable content: ${pageH}px`);
  let h = Number(execSync(`ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "${tall}"`).toString().trim());
  // The screenshot is at deviceScaleFactor 2, so page px are half image px.
  if (pageH > 0) h = Math.min(h, pageH * 2);

  // Pan from the top to the bottom of the page, easing at both ends so it reads
  // as a thumb-flick settling rather than a constant machine scroll.
  // Guard: a page no taller than the phone window has nothing to scroll, and a
  // crop taller than the source is a hard ffmpeg error rather than a no-op.
  const srcH = Math.floor(h * (S.w / 1080));
  if (srcH <= S.h + 8) { console.log(`   only ${srcH}px after scaling — nothing to scroll, SKIPPED`); continue; }
  const TOTAL = p.secs || DEFAULT_TOTAL;
  const travel = Math.max(0, srcH - S.h);
  const yExpr = travel > 0
    ? `(${travel})*(0.5-0.5*cos(PI*min(1\\,t/${(TOTAL - 0.8).toFixed(2)})))`
    : "0";
  // The phone frame plate (bezel, notch, side buttons) is built by build-inlay;
  // reuse it so a scroll beat and a carousel beat sit in the SAME handset. Cut
  // without it the screen floats on a dark field and stops reading as a phone.
  const frame = resolve(WORK, "phone-frame.png");
  if (!existsSync(frame)) {
    console.log("   phone-frame.png missing — run build-inlay.mjs once first");
    continue;
  }
  if (!p.label) {
    execSync(
      `ffmpeg -y -v error -loop 1 -framerate 30 -t ${TOTAL} -i "${tall}" `
      + `-loop 1 -framerate 30 -t ${TOTAL} -i "${frame}" `
      + `-filter_complex "[0:v]crop=iw:${h}:0:0,scale=${S.w}:-1,crop=${S.w}:${S.h}:0:'${yExpr}',format=yuv420p[scr];`
      + `color=c=#1B1613:s=1080x1920:d=${TOTAL},format=yuv420p[bg];`
      + `[bg][scr]overlay=${S.x}:${S.y}:shortest=1[base];`
      + `[base][1:v]overlay=0:0,format=yuv420p[v]" -map "[v]" -t ${TOTAL} `
      + `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${resolve(OUT, `scroll-${p.id}.mp4`)}"`,
      { stdio: "inherit" },
    );
    console.log(`   page ${h}px -> scroll-${p.id}.mp4 (no label)`);
    continue;
  }
  const cap = resolve(WORK, `scroll-cap-${p.id}.png`);
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(capHtml(p.label), { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await sleep(800);
  await page.screenshot({ path: cap, type: "png", omitBackground: true });
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });

  const out = resolve(OUT, `scroll-${p.id}.mp4`);
  execSync(
    `ffmpeg -y -v error -loop 1 -framerate 30 -t ${TOTAL} -i "${tall}" `
    + `-loop 1 -framerate 30 -t ${TOTAL} -i "${frame}" `
    + `-loop 1 -framerate 30 -t ${TOTAL} -i "${cap}" `
    + `-filter_complex "[0:v]crop=iw:${h}:0:0,scale=${S.w}:-1,crop=${S.w}:${S.h}:0:'${yExpr}',format=yuv420p[scr];`
    + `color=c=#1B1613:s=1080x1920:d=${TOTAL},format=yuv420p[bg];`
    + `[bg][scr]overlay=${S.x}:${S.y}:shortest=1[base];`
    + `[base][1:v]overlay=0:0[framed];`
    // Fades in just after the scroll starts moving and holds: it labels the
    // whole beat, so it should not blink on and off like a lower third.
    + `[2:v]format=rgba,fade=t=in:st=0.5:d=0.5:alpha=1[c];`
    + `[framed][c]overlay=0:0,format=yuv420p[v]" -map "[v]" -t ${TOTAL} `
    + `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    { stdio: "inherit" },
  );
  console.log(`   page ${h}px -> ${out.replace(REPO, ".")}`);
}
await browser.close();
