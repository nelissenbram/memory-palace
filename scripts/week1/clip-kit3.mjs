// Clip-kit round 3 — smartphone carousel inlay (owner 2026-08-26 point 4):
// an iPhone-style frame on ink with fresh app captures sliding through
// (3D corridor on phone → hearth memory close-up → Explore). Frame-stepped
// PNG sequence for ffmpeg, same method as clip-kit2.
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const PHONE = `${KIT}/work/phone`;
const OUTDIR = `${KIT}/work/carousel`;
fs.mkdirSync(OUTDIR, { recursive: true });

const CREAM = "#FCFAF5", INK = "#1B1613";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
</style>`;

const SLIDES = await Promise.all(["cor3d.png", "hearth3d.png", "explore.png"].map(async (f) => {
  const buf = await sharp(`${PHONE}/${f}`).resize(600, 1300, { fit: "cover", position: "top" }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}));

// Phone: 640x1340 bezel, 600x1300 screen, notch pill. Track slides horizontally.
const carousel = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;">
    <div style="position:absolute;left:50%;top:170px;transform:translateX(-50%);width:640px;height:1340px;background:#0d0b09;border-radius:74px;box-shadow:0 40px 120px rgba(0,0,0,.6),inset 0 0 0 3px rgba(252,250,245,.14);">
      <div style="position:absolute;left:20px;top:20px;width:600px;height:1300px;border-radius:56px;overflow:hidden;">
        <div id="track" style="display:flex;height:100%;">
          ${SLIDES.map((s) => `<img src="${s}" style="width:600px;height:1300px;flex:0 0 600px;object-fit:cover;">`).join("")}
        </div>
      </div>
      <div style="position:absolute;left:50%;top:34px;transform:translateX(-50%);width:170px;height:34px;border-radius:17px;background:#0d0b09;"></div>
    </div>
    <div class="claim" style="position:absolute;left:80px;right:80px;top:1600px;font-size:58px;line-height:1.3;color:${CREAM};text-align:center;">it fits in your pocket,&nbsp;too.</div>
    <div id="dots" style="position:absolute;left:50%;top:1545px;transform:translateX(-50%);display:flex;gap:14px;">
      ${SLIDES.map(() => `<span style="width:10px;height:10px;border-radius:50%;background:rgba(252,250,245,.35);"></span>`).join("")}
    </div>
    <script>
      const ease = (p) => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      const clamp = (v) => Math.max(0, Math.min(1, v));
      // slide holds: 0-1.1 / 1.45-2.35 / 2.7-end; 0.35s eased transitions
      window.setT = (t) => {
        let idx = 0, prog = 0;
        if (t < 1.1) { idx = 0; }
        else if (t < 1.45) { idx = 0; prog = ease((t - 1.1) / 0.35); }
        else if (t < 2.35) { idx = 1; }
        else if (t < 2.7) { idx = 1; prog = ease((t - 2.35) / 0.35); }
        else { idx = 2; }
        const off = (idx + prog) * 600;
        document.getElementById('track').style.transform = 'translateX(' + (-off) + 'px)';
        const active = prog > 0.5 ? idx + 1 : idx;
        [...document.getElementById('dots').children].forEach((d, i) => {
          d.style.background = i === active ? 'rgba(252,250,245,.95)' : 'rgba(252,250,245,.35)';
        });
      };
    </script>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${carousel}</body></html>`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 400));
const FPS = 30, SECONDS = 3.4;
const frames = Math.round(SECONDS * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.setT(t), f / FPS);
  await page.screenshot({ path: path.join(OUTDIR, `f${String(f).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}
await browser.close();
console.log("wrote", frames, "carousel frames");
