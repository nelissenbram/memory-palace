// Clip-kit round 7 — RESTORE-07 year-ticker stamps (1954/1980/2010/today).
import puppeteer from "puppeteer";

const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
</style>`;
const stamp = (txt) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:70px;right:70px;bottom:290px;display:flex;justify-content:center;">
      <div class="claim" style="font-size:92px;line-height:1.1;color:${CREAM};background:rgba(24,19,15,.6);padding:16px 52px;border-radius:26px;text-shadow:0 3px 26px rgba(0,0,0,.7);">${txt}</div>
    </div>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, txt] of [["r7-y1.png", "1954"], ["r7-y2.png", "1980"], ["r7-y3.png", "2010"], ["r7-y4.png", "today."]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;background:transparent;">${stamp(txt)}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}
await browser.close();
