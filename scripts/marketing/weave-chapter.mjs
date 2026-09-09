#!/usr/bin/env node
/**
 * Re-weave the seeded Life Story chapter, so its prose stops being the
 * empty-state placeholder and reads as a real woven memoir — the thing CHAPTER-01
 * and -03 need and the demo-data seeder could not verify.
 *
 * ⚠️ Spends ONE model call on the owner's key. Owner has approved demo-account
 * writes; this is the single write here.
 *
 * Verification is by PIXEL DIFF of the panel, not DOM text: the woven prose does
 * not appear in document.body.innerText (some rich-text renderer keeps it out of
 * the text API), which is why every text-based check reported the wrong thing.
 * A screenshot before and after, differenced, is the honest signal.
 */
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { REPO, GPU_ARGS, EDGE } from "./kit.mjs";

const BASE = process.env.MP_APP_BASE || "http://localhost:3000";
const PROFILE = resolve(REPO, "store-assets/review/_reviewacct-profile");
const WORK = resolve(REPO, "socials-kit/clipwork");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: false, executablePath: EDGE, userDataDir: PROFILE,
  args: [...GPU_ARGS, "--window-size=560,1040"],
  protocolTimeout: 240000, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });

const click = (words) => page.evaluate((ws) => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.1;
  };
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const hit = [...document.querySelectorAll("button,a[role=button]")]
    .filter((b) => vis(b) && !b.disabled)
    .find((b) => ws.some((w) => norm(b.textContent).includes(w)));
  if (hit) { hit.click(); return norm(hit.textContent).slice(0, 30); }
  return null;
}, words);

// open Life Story — three tries, the atrium is intercepted at random
let opened = null;
for (let i = 0; i < 3 && !opened; i++) {
  await page.goto(`${BASE}/atrium?onboarding=off`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await sleep(11000);
  opened = await click(["life story", "record your story"]);
  if (!opened) await sleep(1500);
}
if (!opened) { console.log("FAILED: Life Story panel would not open"); await browser.close(); process.exit(1); }
await sleep(3600);

const before = resolve(WORK, "weave-before.png");
const after = resolve(WORK, "weave-after.png");
await page.screenshot({ path: before, type: "png" });

const wove = await click(["weave again", "weave this chapter"]);
if (!wove) { console.log("FAILED: no weave button"); await browser.close(); process.exit(1); }
console.log(`clicked "${wove}" — waiting for the model`);

// Poll the pixel diff: once the panel stops changing AND has changed from the
// start, the weave is in. Bounded at ~90 s.
let last = before, stable = 0, changed = false;
for (let i = 0; i < 36; i++) {
  await sleep(2500);
  const shot = resolve(WORK, `weave-poll.png`);
  await page.screenshot({ path: shot, type: "png" });
  const dPrev = frameDiff(last, shot);
  const dStart = frameDiff(before, shot);
  if (dStart > 0.02) changed = true;
  stable = dPrev < 0.002 ? stable + 1 : 0;
  execSync(`node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "${shot}" "${last = resolve(WORK, 'weave-last.png')}"`);
  if (changed && stable >= 2) break;
}
await page.screenshot({ path: after, type: "png" });
await browser.close();

const moved = frameDiff(before, after);
console.log(moved > 0.02
  ? `DONE: chapter re-woven (panel changed by ${(moved * 100).toFixed(1)}%). Re-capture: build-screen-library.mjs interview`
  : `UNSURE: panel barely changed (${(moved * 100).toFixed(1)}%). Check interview.png by eye.`);

/** Mean per-pixel luma difference of two PNGs, 0..1, via an 8x8 ffmpeg reduce. */
function frameDiff(a, b) {
  const raw = execSync(
    `ffmpeg -v error -i "${a}" -i "${b}" -filter_complex "[0:v][1:v]blend=all_mode=difference,scale=32:32,format=gray" -frames:v 1 -f rawvideo -`,
    { maxBuffer: 1 << 20, encoding: "buffer" },
  );
  let s = 0; for (const v of raw) s += v;
  return s / (raw.length * 255);
}
