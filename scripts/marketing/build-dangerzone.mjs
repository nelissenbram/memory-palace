#!/usr/bin/env node
/**
 * OWNED-02 "Type the Word": the delete-account confirmation, typed letter by
 * letter, the button waking from grey to live — and NEVER pressed.
 *
 * ⚠️ This is a DEPICTION rendered from the app's real copy, not a screen-rec of
 * the live account. Recording the actual danger zone means automating a browser
 * over the review account's delete flow, one stray click from erasing the demo
 * data just seeded into it. So the panel is rebuilt in HTML from the shipped
 * strings (settings.dangerZone / dangerDescription / deleteConfirmTitle /
 * deleteConfirmDescription / deleteConfirmPlaceholder / deleteConfirmWord =
 * "DELETE" / deleteAccount), and the typing is animated. It is faithful to what
 * the feature does; it is not a capture of it, and must not be captioned as one.
 *
 * The confirm field fills to "DELETE" and the button turns live — the whole
 * point of the beat — but there is no button to press here, so there is no risk.
 *
 * Output: socials-kit/footage/dangerzone.mp4 (10 s).
 */
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { REPO, ensureDir, GPU_ARGS, EDGE } from "./kit.mjs";

const OUT = ensureDir(resolve(REPO, "socials-kit/footage"));
const FPS = 30, SECS = 10, W = 1080, H = 1920;
const WORD = "DELETE";

/**
 * The panel, styled to match the app's danger zone: cream card, ember accents,
 * the ink/serif house type. Rendered on the same warm-dark field the phone
 * inlays use so it drops into a clip without a jarring background.
 */
const html = `<!DOCTYPE html><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Source+Sans+3:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;background:#1B1613;font-family:'Source Sans 3',sans-serif;
  display:flex;align-items:center;justify-content:center}
.card{width:840px;background:#FBF6EC;border-radius:28px;padding:56px 52px;
  border:2px solid rgba(190,74,58,.5);box-shadow:0 40px 90px rgba(0,0,0,.55)}
.zone{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;
  font-size:40px;color:#B34A32;margin-bottom:10px}
.desc{font-size:26px;color:#6A5F52;line-height:1.45;margin-bottom:40px}
.q{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:44px;color:#2A211A;margin-bottom:16px}
.qd{font-size:25px;color:#6A5F52;line-height:1.5;margin-bottom:30px}
.qd b{color:#B34A32}
.field{height:88px;border:2px solid #D8CCB8;border-radius:14px;background:#fff;
  display:flex;align-items:center;padding:0 26px;font-size:34px;color:#2A211A;letter-spacing:.06em}
.ph{color:#B3A794}
.caret{display:inline-block;width:3px;height:40px;background:#B34A32;margin-left:2px;animation:bl 1s step-end infinite}
@keyframes bl{50%{opacity:0}}
.btn{margin-top:34px;height:82px;border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-size:30px;font-weight:600;transition:none}
.dead{background:#E6DDCE;color:#B3A794}
.live{background:#B34A32;color:#FBF6EC;box-shadow:0 12px 30px rgba(179,74,50,.4)}
</style>
<div class="card">
  <div class="zone">Danger Zone</div>
  <div class="desc">Permanently delete your account and all associated data. This action cannot be undone.</div>
  <div class="q">Are you absolutely sure?</div>
  <div class="qd">This will permanently delete your account, all your memories, photos, and stories.
    Type <b>DELETE</b> below to confirm.</div>
  <div class="field"><span id="typed"></span><span class="ph" id="ph">Type "DELETE" to confirm</span><span class="caret" id="car" style="display:none"></span></div>
  <div class="btn dead" id="btn">Delete My Account</div>
</div>`;

const browser = await puppeteer.launch({
  headless: true, executablePath: EDGE, args: GPU_ARGS,
  ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts?.ready).catch(() => {});
await new Promise((r) => setTimeout(r, 400));

const dir = mkdtempSync(join(tmpdir(), "dz-"));
const total = FPS * SECS;

/**
 * The schedule: 1.2 s still, then a letter roughly every 4 frames, then hold on
 * the live button. Frames are shot one at a time and assembled — a video-record
 * of the page would be at the mercy of the compositor's frame timing, and this
 * beat has to hit the exact frame the last letter lands.
 */
const perLetter = 5;
const startFrame = 36;
for (let f = 0; f < total; f++) {
  const typedCount = Math.max(0, Math.min(WORD.length, Math.floor((f - startFrame) / perLetter) + 1));
  await page.evaluate((n, word) => {
    const typed = word.slice(0, n);
    document.getElementById("typed").textContent = typed;
    document.getElementById("ph").style.display = n > 0 ? "none" : "inline";
    document.getElementById("car").style.display = (n > 0 && n < word.length) ? "inline-block" : "none";
    const btn = document.getElementById("btn");
    const live = typed === word;
    btn.className = "btn " + (live ? "live" : "dead");
  }, typedCount, WORD);
  await page.screenshot({ path: join(dir, `f${String(f).padStart(4, "0")}.png`), type: "png" });
}
await browser.close();

execSync(
  `ffmpeg -y -v error -framerate ${FPS} -i "${join(dir, "f%04d.png")}" `
  + `-t ${SECS} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r ${FPS} -an "${resolve(OUT, "dangerzone.mp4")}"`,
  { stdio: "inherit" },
);
rmSync(dir, { recursive: true, force: true });
console.log(`   dangerzone  ${SECS}s (word lands ~${((startFrame + WORD.length * perLetter) / FPS).toFixed(1)}s) -> ./socials-kit/footage/dangerzone.mp4`);
