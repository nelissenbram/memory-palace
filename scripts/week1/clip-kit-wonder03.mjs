// One-off card kit: WONDER-03a "A door for every chapter" (corridor-led, canon-compliant).
// Same brand system as clip-kit-batch.mjs (Fraunces italic 300 + ink-pill). Output -> socials-kit/clips/src/.
import puppeteer from "puppeteer";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5", INK = "#1B1613";
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}</style>`;
const hook = (html, size = 80) => `<div style="width:1080px;height:1920px;background:${INK};display:flex;align-items:center;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.3;color:${CREAM};text-align:center;max-width:880px;">${html}</div></div>`;
const caption = (html, size = 60) => `<div style="width:1080px;height:1920px;position:relative;"><div style="position:absolute;left:80px;right:80px;bottom:330px;display:flex;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div></div></div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
async function still(name, body, transparent) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
}
// hook (dark card, 0-2s) + running USP caption over the corridor + payoff caption over the hearth
await still("bat-WONDER-03a-hook.png", hook(`Every chapter of a life,<br>behind its own&nbsp;door.`), false);
await still("bat-WONDER-03a-cap.png", caption(`a room for every&nbsp;chapter.`), true);
await still("bat-WONDER-03a-cap2.png", caption(`and it grows as the story&nbsp;does.`), true);
await browser.close();
console.log("cards: WONDER-03a");
