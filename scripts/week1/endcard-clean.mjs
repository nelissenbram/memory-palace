// Clean ember end card WITHOUT the corner clip-ID (that was a testing marker;
// reused across 26 clips it showed the wrong ID). One shared launch end card.
import puppeteer from "puppeteer";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5", EMBER = "#B85C38", GOLD = "#D4AF37";
const ICON = (c, s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${s}" height="${s}"><g fill="${c}"><path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/><rect x="18" y="40" width="8" height="32"/><rect x="32" y="40" width="8" height="32"/><rect x="46" y="40" width="8" height="32"/><rect x="60" y="40" width="8" height="32"/><ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/><rect x="10" y="72" width="80" height="4"/><rect x="6" y="78" width="88" height="4"/><rect x="2" y="84" width="96" height="4"/></g></svg>`;
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}.kicker{font-family:Marcellus,serif;text-transform:uppercase;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}</style>`;
const body = `<div style="width:1080px;height:1920px;background:${EMBER};position:relative;overflow:hidden;">
  <div style="position:absolute;inset:44px;border:1px solid rgba(252,250,245,.32);"></div>
  <div style="position:absolute;inset:56px;border:1px solid rgba(252,250,245,.18);"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
    ${ICON("rgba(252,250,245,.94)", 120)}
    <div class="kicker" style="font-size:24px;letter-spacing:.42em;padding-left:.42em;color:rgba(252,250,245,.75);margin-top:34px;">The Memory Palace</div>
    <div class="claim" style="font-size:84px;line-height:1.22;color:${CREAM};text-align:center;margin-top:44px;">Memories<br>become a place<br>your loved ones<br>can visit</div>
    <div style="display:flex;align-items:center;margin-top:56px;"><span style="display:inline-block;width:6px;height:6px;background:${GOLD};transform:rotate(45deg);margin-right:20px;"></span><span class="kicker" style="font-size:23px;letter-spacing:.32em;color:rgba(252,250,245,.85);">thememorypalace.ai</span></div>
  </div>
</div>`;
const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await p.setContent(`<!doctype html><html><head>${HEAD}</head><body>${body}</body></html>`, { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 250));
await p.screenshot({ path: `${SRC}/endcard-clean.png`, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
await b.close();
console.log("wrote endcard-clean.png");
