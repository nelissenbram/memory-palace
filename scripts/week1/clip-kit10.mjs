// Clip-kit round 10 — WONDER-04a "Zero Folders" captions + endcard
// (family-sibling swap for WONDER-10: owner vetoed entrance-hall footage).
import puppeteer from "puppeteer";

const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5", EMBER = "#B85C38", GOLD = "#D4AF37", INK = "#1B1613";
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
const midCaption = (html, size = 66) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:70px;right:70px;top:46%;transform:translateY(-50%);display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.34;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:22px 46px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;
const caption = (html, size = 62) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:70px;right:70px;bottom:330px;display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;
const endcard = (clipId) => `
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
    <div class="kicker" style="position:absolute;right:76px;bottom:72px;font-size:19px;letter-spacing:.22em;color:rgba(252,250,245,.45);">${clipId}</div>
  </div>`;

const STILLS = [
  ["w4-hook.png", midCaption("4,000 photos. Zero&nbsp;folders.", 70), true],
  ["w4-c1.png", caption("Just&nbsp;walls."), true],
  ["w4-c2.png", caption("Just&nbsp;rooms."), true],
  ["w4-c3.png", caption("Just&nbsp;light."), true],
  ["endcard-wonder04a.png", endcard("WONDER-04a"), false],
];
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, body, transparent] of STILLS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 220));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}
await browser.close();
