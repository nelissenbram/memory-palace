// Renders brand-typography overlays + end card for the vertical clips
// (Fraunces italic maison-style, matching the socials kit). Transparent PNGs
// for titles; full ember end card. Output: C:/Users/nelis/memory-palace/socials-kit/clips/src/
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
fs.mkdirSync(OUT, { recursive: true });
const CREAM = "#FCFAF5", EMBER = "#B85C38", GOLD = "#D4AF37";
const ICON_FILL = (color, size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <g fill="${color}">
    <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/>
    <rect x="18" y="40" width="8" height="32"/><rect x="32" y="40" width="8" height="32"/>
    <rect x="46" y="40" width="8" height="32"/><rect x="60" y="40" width="8" height="32"/>
    <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/>
    <rect x="10" y="72" width="80" height="4"/><rect x="6" y="78" width="88" height="4"/><rect x="2" y="84" width="96" height="4"/>
  </g>
</svg>`;
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.kicker{font-family:Marcellus,serif;text-transform:uppercase;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
</style>`;

// Title overlay (transparent): kicker + hairline + italic hook, top third,
// soft shadow for legibility on footage.
const title = (l1, l2) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:0;right:0;top:150px;display:flex;flex-direction:column;align-items:center;">
      <div class="kicker" style="font-size:26px;letter-spacing:.44em;padding-left:.44em;color:${CREAM};text-shadow:0 2px 18px rgba(0,0,0,.55);">The Memory Palace</div>
      <div style="width:76px;height:1px;background:rgba(252,250,245,.75);box-shadow:0 1px 8px rgba(0,0,0,.4);margin:26px 0 30px;"></div>
      <div class="claim" style="font-size:78px;line-height:1.18;color:${CREAM};text-align:center;text-shadow:0 3px 26px rgba(0,0,0,.6);">${l1}<br>${l2}</div>
    </div>
  </div>`;

// End card: ember, double hairline, temple, claim, domain (post-1080 design, vertical)
const endcard = `
  <div style="width:1080px;height:1920px;background:${EMBER};position:relative;overflow:hidden;">
    <div style="position:absolute;inset:44px;border:1px solid rgba(252,250,245,.32);"></div>
    <div style="position:absolute;inset:56px;border:1px solid rgba(252,250,245,.18);"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      ${ICON_FILL("rgba(252,250,245,.94)", 120)}
      <div class="kicker" style="font-size:24px;letter-spacing:.42em;padding-left:.42em;color:rgba(252,250,245,.75);margin-top:34px;">The Memory Palace</div>
      <div class="claim" style="font-size:84px;line-height:1.22;color:${CREAM};text-align:center;margin-top:44px;">Memories<br>become a place<br>your loved ones<br>can visit</div>
      <div style="display:flex;align-items:center;margin-top:56px;">
        <span style="display:inline-block;width:6px;height:6px;background:${GOLD};transform:rotate(45deg);margin-right:20px;"></span>
        <span class="kicker" style="font-size:23px;letter-spacing:.32em;color:rgba(252,250,245,.85);">thememorypalace.ai</span>
      </div>
    </div>
  </div>`;

const jobs = [
  ["title1.png", title("Forty years of memories,", "kept as a place."), true],
  ["title2.png", title("Memories become a place", "your loved ones can visit."), true],
  ["endcard.png", endcard, false],
];
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, body, transparent] of jobs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${OUT}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}
await browser.close();
