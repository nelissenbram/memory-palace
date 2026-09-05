// Transparent-screen iPhone bezel + gold USP note + cream caption as ONE overlay
// PNG (owner #4: moving screenshots on a phone frame). The screen area is left
// fully transparent so a moving app clip shows through when composited beneath.
import puppeteer from "puppeteer";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5", GOLD = "#D4AF37";
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;}</style>`;
// Phone: width 576 centered, screen hole 544x1128 at y316 (transparent).
const html = `<div style="width:1080px;height:1920px;position:relative;">
  <!-- gold USP note top-right -->
  <div class="claim" style="position:absolute;top:120px;right:80px;text-align:right;font-size:54px;line-height:1.15;color:${GOLD};">all of this &mdash;<br>in your pocket
    <svg width="120" height="70" style="display:block;margin-left:auto;margin-top:6px;" viewBox="0 0 120 70"><path d="M10 8 C 60 8, 100 20, 100 58" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M92 46 L102 60 L110 44" fill="none" stroke="${GOLD}" stroke-width="3"/></svg>
  </div>
  <!-- bezel ring (screen stays transparent) -->
  <div style="position:absolute;left:50%;top:300px;transform:translateX(-50%);width:576px;height:1160px;border:16px solid #0c0a08;border-radius:70px;box-shadow:0 40px 90px rgba(0,0,0,.55);"></div>
  <div style="position:absolute;left:50%;top:328px;transform:translateX(-50%);width:150px;height:26px;background:#0c0a08;border-radius:16px;"></div>
  <!-- cream caption bottom -->
  <div class="claim" style="position:absolute;left:80px;right:80px;bottom:150px;text-align:center;font-size:52px;line-height:1.3;color:${CREAM};">the real app &mdash; in your hand.</div>
</div>`;
const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await p.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;background:transparent;">${html}</body></html>`, { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 200));
await p.screenshot({ path: `${SRC}/phone-frame-overlay.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
await b.close();
console.log("wrote phone-frame-overlay.png (screen area transparent, note+caption baked)");
