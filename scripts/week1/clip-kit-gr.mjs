// Card kit for the enrichment build: GRAVE-01, GRAVE-04, RESTORE-03.
// Same brand system as clip-kit2.mjs (Fraunces italic + ink-pill captions).
// Output: socials-kit/clips/src/. Endcards reuse existing family cards.
import puppeteer from "puppeteer";

const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5", INK = "#1B1613";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}</style>`;

const hook = (html, size = 84) => `
  <div style="width:1080px;height:1920px;background:${INK};display:flex;align-items:center;justify-content:center;">
    <div class="claim" style="font-size:${size}px;line-height:1.3;color:${CREAM};text-align:center;max-width:880px;">${html}</div>
  </div>`;

const caption = (html, size = 62) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:80px;right:80px;bottom:330px;display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
async function still(name, body, transparent) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}

// GRAVE-01 · The Prediction
await still("g01-hook.png", hook("You&rsquo;ll take 6 photos today.<br>You&rsquo;ll look at 0 of them&nbsp;again.", 76), false);
await still("g01-cap-place.png", caption("we built a place&nbsp;&mdash;"), true);
await still("g01-cap-hang.png", caption("&mdash; where the good ones&nbsp;hang."), true);
// GRAVE-04 · Photo #3,847
await still("g04-hook.png", hook("What&rsquo;s behind photo<br>number 3,847?", 84), false);
await still("g04-cap-plaque.png", caption("every photo keeps its&nbsp;story."), true);
// RESTORE-03 · Restored, Then Hung
await still("r3-hook.png", hook("Restoring it was<br>the easy&nbsp;part.", 84), false);
await still("r3-cap-wall.png", caption("Then it got a&nbsp;wall."), true);
await still("r3-cap-visited.png", caption("A photo in a folder is&nbsp;filed.<br>A photo on a wall is&nbsp;visited.", 56), true);

await browser.close();
