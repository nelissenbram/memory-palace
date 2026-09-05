// Clip-kit round 9 — RESTORE product-UI inlay (owner 2026-08-26): phone frame
// with the app's real restore modal (strings from en.json memoryDetail.*) and
// an ANIMATED before/after compare slider sweeping across our exact portrait.
// Frame-stepped 4s @30fps.
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const R = `${KIT}/work/restore`;
const OUTDIR = `${KIT}/work/restoreui`;
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const CREAM = "#FCFAF5", INK = "#1B1613", GOLD = "#D4AF37", EMBER = "#B85C38";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.kicker{font-family:Marcellus,serif;text-transform:uppercase;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
.ui{font-family:'Segoe UI',-apple-system,sans-serif;}
</style>`;

const IMG_W = 560, IMG_H = Math.round(560 * 1426 / 1080);
const b64 = async (p, w, h) => `data:image/jpeg;base64,${(await sharp(p).resize(w, h, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer()).toString("base64")}`;
const BEFORE = await b64(`${R}/damaged.png`, IMG_W, IMG_H);
const AFTER = await b64(`${R}/restored-color.png`, IMG_W, IMG_H);

const body = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;">
    <div style="position:absolute;left:50%;top:210px;transform:translateX(-50%);width:680px;height:1240px;background:#0d0b09;border-radius:70px;box-shadow:0 40px 120px rgba(0,0,0,.6),inset 0 0 0 3px rgba(252,250,245,.14);">
      <div class="ui" style="position:absolute;left:20px;top:20px;width:640px;height:1200px;border-radius:52px;overflow:hidden;background:#F7F3EA;">
        <div style="padding:64px 40px 26px;text-align:center;">
          <div style="font-family:Fraunces,serif;font-weight:400;font-size:38px;color:#2A2118;">Restore this photo</div>
          <div style="font-size:24px;color:#7A6E5D;margin-top:10px;line-height:1.4;">Our AI gently repairs scratches, blur and faded&nbsp;faces.</div>
        </div>
        <div style="position:relative;width:${IMG_W}px;height:${IMG_H}px;margin:0 auto;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(42,33,24,.18);">
          <img src="${BEFORE}" style="position:absolute;inset:0;width:100%;height:100%;">
          <div id="clip" style="position:absolute;top:0;left:0;bottom:0;width:50%;overflow:hidden;">
            <img src="${AFTER}" style="width:${IMG_W}px;height:${IMG_H}px;max-width:none;">
          </div>
          <div id="handle" style="position:absolute;top:0;bottom:0;left:50%;width:4px;background:#fff;box-shadow:0 0 14px rgba(0,0,0,.4);">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#8A7A64;font-size:26px;">&#8596;</div>
          </div>
          <div id="lblA" style="position:absolute;left:16px;top:16px;background:rgba(27,22,19,.65);color:#fff;font-size:22px;padding:6px 16px;border-radius:12px;">After</div>
          <div style="position:absolute;right:16px;top:16px;background:rgba(27,22,19,.65);color:#fff;font-size:22px;padding:6px 16px;border-radius:12px;">Before</div>
        </div>
        <div style="text-align:center;margin-top:26px;font-size:23px;color:#7A6E5D;">7 of 10 restorations left</div>
        <div style="margin:20px 44px 0;background:${EMBER};color:#FCFAF5;font-size:28px;font-weight:600;text-align:center;padding:24px 0;border-radius:18px;">Save restored photo</div>
      </div>
      <div style="position:absolute;left:50%;top:34px;transform:translateX(-50%);width:170px;height:32px;border-radius:16px;background:#0d0b09;"></div>
    </div>
    <div style="position:absolute;top:104px;left:100px;z-index:5;display:inline-flex;flex-direction:column;align-items:flex-start;gap:2px;transform:rotate(-4deg);">
      <span class="claim" style="font-weight:500;font-size:52px;line-height:1.12;color:${GOLD};white-space:nowrap;text-shadow:0 2px 14px rgba(0,0,0,.55);">built into the palace</span>
      <svg width="72" height="56" viewBox="0 0 34 26" style="margin-left:44px;">
        <path d="M4 2 C 10 16, 20 20, 29 22 M23 20 l7 2 -4 -6" fill="none" stroke="${GOLD}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      </svg>
    </div>
    <div class="claim" style="position:absolute;left:80px;right:80px;top:1540px;font-size:56px;line-height:1.3;color:${CREAM};text-align:center;">ten free restores. one&nbsp;tap.</div>
    <script>
      const clamp = (v) => Math.max(0, Math.min(1, v));
      const ease = (p) => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      // slider: rest at 12% -> sweep to 88% (1.0-2.6s) -> settle back to 62%
      window.setT = (t) => {
        let p;
        if (t < 1.0) p = 0.12;
        else if (t < 2.6) p = 0.12 + 0.76 * ease((t - 1.0) / 1.6);
        else if (t < 3.4) p = 0.88 - 0.26 * ease((t - 2.6) / 0.8);
        else p = 0.62;
        const pct = (p * 100) + '%';
        document.getElementById('clip').style.width = pct;
        document.getElementById('handle').style.left = pct;
        document.getElementById('lblA').style.opacity = p > 0.22 ? 1 : 0.25;
      };
    </script>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${body}</body></html>`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 400));
const FPS = 30, SECONDS = 4;
for (let f = 0; f < Math.round(SECONDS * FPS); f++) {
  await page.evaluate((t) => window.setT(t), f / FPS);
  await page.screenshot({ path: path.join(OUTDIR, `f${String(f).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}
await browser.close();
console.log("wrote restore-ui frames");
