// Clip-kit round 4 — GRAVE-08 v3 (owner 2026-08-26: "does not say a lot,
// link to USPs"): answer-turn captions + a Kep WhatsApp capture mock
// (photo texted in → hung in the palace), the core capture USP.
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const SRC = `${KIT}/src`;
const OUTDIR = `${KIT}/work/g8kep`;
const DEMO = "C:/Users/nelis/memory-palace/public/demo";
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const CREAM = "#FCFAF5", INK = "#1B1613";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.kicker{font-family:Marcellus,serif;text-transform:uppercase;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
</style>`;

const caption = (html, size = 62) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:80px;right:80px;bottom:330px;display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;

const photoBuf = await sharp(`${DEMO}/between-two-hands.jpg`).resize(560, 400, { fit: "cover" }).jpeg({ quality: 84 }).toBuffer();
const PHOTO = `data:image/jpeg;base64,${photoBuf.toString("base64")}`;

// Kep WhatsApp mock: grandma texts a photo, Kep hangs it. Frame-stepped 3.5s.
const kep = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;font-family:'Segoe UI',-apple-system,sans-serif;">
    <div style="position:absolute;left:90px;right:90px;top:280px;height:1120px;border-radius:44px;overflow:hidden;background:#EFE7DD;box-shadow:0 40px 120px rgba(0,0,0,.55);">
      <div style="height:118px;background:#075E54;display:flex;align-items:center;padding:0 36px;">
        <div style="width:66px;height:66px;border-radius:50%;background:#B85C38;display:flex;align-items:center;justify-content:center;color:#FCFAF5;font-size:34px;font-weight:600;">K</div>
        <div style="margin-left:24px;">
          <div style="color:#fff;font-size:32px;font-weight:600;">Kep</div>
          <div style="color:rgba(255,255,255,.75);font-size:24px;">your memory porter</div>
        </div>
      </div>
      <div style="padding:40px 36px;">
        <div id="b1" style="margin-left:auto;width:620px;background:#DCF8C6;border-radius:22px 22px 6px 22px;padding:14px;opacity:0;transform:scale(.9);transform-origin:bottom right;box-shadow:0 3px 10px rgba(0,0,0,.12);">
          <img src="${PHOTO}" style="width:592px;height:420px;object-fit:cover;border-radius:14px;display:block;">
          <div style="font-size:30px;color:#111;padding:14px 8px 4px;">found this one — you and papa, 1992 ❤️</div>
          <div style="font-size:22px;color:#777;text-align:right;padding-right:8px;">20:14 ✓✓</div>
        </div>
        <div id="b2" style="margin-top:28px;width:560px;background:#fff;border-radius:22px 22px 22px 6px;padding:22px 26px;opacity:0;transform:scale(.9);transform-origin:bottom left;box-shadow:0 3px 10px rgba(0,0,0,.12);">
          <div style="font-size:30px;color:#111;line-height:1.4;">Hung in the <b>Roots</b> room, above the mantel. Anna will see it tonight. 🏛</div>
          <div style="font-size:22px;color:#777;padding-top:6px;">20:14</div>
        </div>
      </div>
    </div>
    <div id="cap" class="claim" style="position:absolute;left:80px;right:80px;top:1490px;font-size:60px;line-height:1.3;color:${CREAM};text-align:center;opacity:0;">texted in. hung&nbsp;forever.</div>
    <script>
      const clamp = (v) => Math.max(0, Math.min(1, v));
      const pop = (el, t, t0) => {
        const p = clamp((t - t0) / 0.35);
        el.style.opacity = p;
        el.style.transform = 'scale(' + (0.9 + 0.1 * p) + ')';
      };
      // Owner 2026-08-26: give the conversation room to breathe (6s beat).
      window.setT = (t) => {
        pop(document.getElementById('b1'), t, 0.5);
        pop(document.getElementById('b2'), t, 2.7);
        document.getElementById('cap').style.opacity = clamp((t - 4.4) / 0.5);
      };
    </script>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

// New answer-turn caption stills
const stills = [
  ["g8-cap-place.png", caption("so build them a&nbsp;place.")],
  ["g8-cap-hung.png", caption("hung. framed.&nbsp;named.")],
];
for (const [name, body] of stills) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;background:transparent;">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}

// Kep sequence (3.5s @30fps)
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${kep}</body></html>`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 400));
const FPS = 30, SECONDS = 6;
const frames = Math.round(SECONDS * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.setT(t), f / FPS);
  await page.screenshot({ path: path.join(OUTDIR, `f${String(f).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}
await browser.close();
console.log("wrote", frames, "kep frames");
