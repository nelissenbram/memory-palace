// Clip-kit round 3 — smartphone carousel inlay (owner 2026-08-26 point 4;
// revised same day: use the SEVEN homepage showcase shots, slower pace).
// The 7 slides are public/landing/shots/shot-1..7.webp (820x1446) — the phone
// frame matches that ratio so no UI gets cropped. Frame-stepped PNG sequence.
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const SHOTS_DIR = "C:/Users/nelis/memory-palace-staging/public/landing/shots";
const OUTDIR = `${KIT}/work/carousel`;
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const CREAM = "#FCFAF5", INK = "#1B1613";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
</style>`;

// Screen keeps the shots' native 820:1446 ratio: 640 x 1129.
const SCREEN_W = 640, SCREEN_H = Math.round((640 * 1446) / 820);
const SLIDES = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(async (i) => {
  const buf = await sharp(`${SHOTS_DIR}/shot-${i}.webp`).resize(SCREEN_W, SCREEN_H).jpeg({ quality: 86 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}));

// Pace (owner: "gaat het niet te snel?"): 1.25s hold + 0.35s eased slide —
// a touch longer now that each slide carries a margin note to read.
const HOLD = 1.45, TRANS = 0.35;
const SECONDS = SLIDES.length * HOLD + (SLIDES.length - 1) * TRANS;

// USP margin notes per shot — same copy + playful gold style as the landing
// showcase strip (Fraunces italic #D4AF37, slight rotation, doodle arrow).
const GOLD = "#D4AF37";
const NOTES = [
  "your palace, from above",
  "every door, a chapter",
  "photos become rooms",
  "three generations, one tree",
  "the questions that matter",
  "a library of memories",
  "little wins, along the way",
];

const carousel = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;">
    <div style="position:absolute;left:50%;top:220px;transform:translateX(-50%);width:${SCREEN_W + 40}px;height:${SCREEN_H + 40}px;background:#0d0b09;border-radius:70px;box-shadow:0 40px 120px rgba(0,0,0,.6),inset 0 0 0 3px rgba(252,250,245,.14);">
      <div style="position:absolute;left:20px;top:20px;width:${SCREEN_W}px;height:${SCREEN_H}px;border-radius:52px;overflow:hidden;">
        <div id="track" style="display:flex;height:100%;">
          ${SLIDES.map((s) => `<img src="${s}" style="width:${SCREEN_W}px;height:${SCREEN_H}px;flex:0 0 ${SCREEN_W}px;">`).join("")}
        </div>
      </div>
      <div style="position:absolute;left:50%;top:34px;transform:translateX(-50%);width:170px;height:32px;border-radius:16px;background:#0d0b09;"></div>
    </div>
    <div id="note" style="position:absolute;top:96px;left:110px;z-index:5;display:inline-flex;flex-direction:column;align-items:flex-start;gap:2px;transform:rotate(-4deg);">
      <span id="noteText" class="claim" style="font-weight:500;font-size:52px;line-height:1.12;color:${GOLD};white-space:nowrap;text-shadow:0 2px 14px rgba(0,0,0,.55);"></span>
      <svg id="noteArrow" width="72" height="56" viewBox="0 0 34 26" style="margin-left:44px;">
        <path d="M4 2 C 10 16, 20 20, 29 22 M23 20 l7 2 -4 -6" fill="none" stroke="${GOLD}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      </svg>
    </div>
    <div id="dots" style="position:absolute;left:50%;top:${220 + SCREEN_H + 40 + 44}px;transform:translateX(-50%);display:flex;gap:14px;">
      ${SLIDES.map(() => `<span style="width:10px;height:10px;border-radius:50%;background:rgba(252,250,245,.35);"></span>`).join("")}
    </div>
    <div class="claim" style="position:absolute;left:80px;right:80px;top:${220 + SCREEN_H + 40 + 100}px;font-size:58px;line-height:1.3;color:${CREAM};text-align:center;">it fits in your pocket,&nbsp;too.</div>
    <script>
      const N = ${SLIDES.length}, HOLD = ${HOLD}, TRANS = ${TRANS};
      const NOTES = ${JSON.stringify(NOTES)};
      const ease = (p) => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      window.setT = (t) => {
        const cad = HOLD + TRANS;
        let idx = Math.min(N - 1, Math.floor(t / cad));
        const within = t - idx * cad;
        const prog = (idx < N - 1 && within > HOLD) ? ease((within - HOLD) / TRANS) : 0;
        const off = (idx + prog) * ${SCREEN_W};
        document.getElementById('track').style.transform = 'translateX(' + (-off) + 'px)';
        const active = prog > 0.5 ? idx + 1 : idx;
        [...document.getElementById('dots').children].forEach((d, i) => {
          d.style.background = i === active ? 'rgba(252,250,245,.95)' : 'rgba(252,250,245,.35)';
        });
        // margin note: crossfade at the slide handoff, alternate side + tilt
        const note = document.getElementById('note');
        document.getElementById('noteText').textContent = NOTES[active];
        note.style.opacity = prog === 0 ? 1 : (prog < 0.5 ? 1 - prog * 2 : (prog - 0.5) * 2);
        const right = active % 2 === 1;
        note.style.left = right ? 'auto' : '110px';
        note.style.right = right ? '110px' : 'auto';
        note.style.alignItems = right ? 'flex-end' : 'flex-start';
        note.style.transform = 'rotate(' + (right ? 3 : -4) + 'deg)';
        document.getElementById('noteArrow').style.transform = right ? 'scaleX(-1)' : 'none';
        document.getElementById('noteArrow').style.marginLeft = right ? '0' : '44px';
        document.getElementById('noteArrow').style.marginRight = right ? '44px' : '0';
      };
    </script>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${carousel}</body></html>`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 400));
const FPS = 30;
const frames = Math.round(SECONDS * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.setT(t), f / FPS);
  await page.screenshot({ path: path.join(OUTDIR, `f${String(f).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}
await browser.close();
console.log("wrote", frames, "carousel frames,", SECONDS.toFixed(2), "s");
