// Clip-kit round 2 — assets for GRAVE-08a ("Nobody Inherits a Camera Roll")
// and GRAVE-05a ("Storage Almost Full"). Same brand system as clip-kit.mjs
// (Fraunces italic + Marcellus kicker, ember end card), plus two frame-stepped
// motion graphics rendered as PNG sequences for ffmpeg assembly.
// Output: socials-kit/clips/src/ (stills) + socials-kit/clips/work/ (sequences)
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const SRC = `${KIT}/src`;
const WORK = `${KIT}/work`;
const DEMO = "C:/Users/nelis/memory-palace/public/demo";
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(`${WORK}/g8grid`, { recursive: true });
fs.mkdirSync(`${WORK}/g5anim`, { recursive: true });

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

// file:// is blocked from setContent pages — embed 400px data URIs instead.
const PHOTOS = await Promise.all([
  "quiet-morning.jpg", "graduation.jpg", "between-two-hands.jpg", "edge-of-water.jpg",
  "Old/birthday.jpg", "pexels-alexander-mass-748453803-28107011.jpg", "Old/winter.jpg", "Old/greatwave.jpg",
  "song-of-summer-thumb.jpg", "Old/starrynight.jpg", "piano-recital-thumb.jpg", "Old/wanderer.jpg",
].map(async (f) => {
  const buf = await sharp(`${DEMO}/${f}`).resize(400, 400, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}));

// ── Stills ──────────────────────────────────────────────────────────────────
// Full-frame hook card on ink: hook alone, dead center (GRAVE-08 beat 1).
const g8hook = `
  <div style="width:1080px;height:1920px;background:${INK};display:flex;align-items:center;justify-content:center;">
    <div class="claim" style="font-size:88px;line-height:1.3;color:${CREAM};text-align:center;max-width:860px;">No one has ever inherited a&nbsp;camera&nbsp;roll.</div>
  </div>`;

// Caption overlays (transparent, lower third, soft shadow for footage).
const caption = (html, size = 62) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:80px;right:80px;bottom:330px;display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;

// iOS-style alert mock + hook beneath (GRAVE-05 beat 1).
const g5hook = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;">
    <div style="position:absolute;left:0;right:0;top:430px;display:flex;flex-direction:column;align-items:center;">
      <div style="width:600px;background:rgba(240,240,243,.97);border-radius:32px;overflow:hidden;font-family:'Segoe UI',-apple-system,sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.5);">
        <div style="padding:44px 44px 36px;text-align:center;">
          <div style="font-size:38px;font-weight:600;color:#111;">Storage Almost Full</div>
          <div style="font-size:29px;color:#444;margin-top:14px;line-height:1.35;">You can manage your storage in&nbsp;Settings.</div>
        </div>
        <div style="display:flex;border-top:1px solid rgba(0,0,0,.12);">
          <div style="flex:1;text-align:center;padding:26px 0;font-size:34px;color:#0A7AFF;border-right:1px solid rgba(0,0,0,.12);">Settings</div>
          <div style="flex:1;text-align:center;padding:26px 0;font-size:34px;color:#0A7AFF;font-weight:600;">Done</div>
        </div>
      </div>
      <div class="claim" style="font-size:64px;line-height:1.34;color:${CREAM};text-align:center;max-width:880px;margin-top:120px;">&ldquo;Storage almost full&rdquo; is the saddest sentence your phone knows how&nbsp;to&nbsp;say.</div>
    </div>
  </div>`;

// Ember end card with the clip-id burned into the corner (testing system).
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

// ── Frame-stepped motion graphics ───────────────────────────────────────────
// GRAVE-08 beat 2: quiet 3x4 grid of thumbnails losing saturation one by one
// (6s @30fps). Caption 'a folder is not a bequest.' baked in.
const g8grid = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;">
    <div id="grid" style="position:absolute;left:70px;right:70px;top:270px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;">
      ${PHOTOS.map((p) => `<div style="aspect-ratio:1;overflow:hidden;border-radius:6px;"><img src="${p}" style="width:100%;height:100%;object-fit:cover;"></div>`).join("")}
    </div>
    <div id="cap" class="claim" style="position:absolute;left:80px;right:80px;bottom:340px;font-size:62px;line-height:1.3;color:${CREAM};text-align:center;opacity:0;">a folder is not a&nbsp;bequest.</div>
    <script>
      const tiles = [...document.querySelectorAll('#grid img')];
      const clamp = (v) => Math.max(0, Math.min(1, v));
      window.setT = (t) => {
        tiles.forEach((img, i) => {
          const p = clamp((t - (0.4 + i * 0.42)) / 0.8);
          img.style.filter = \`grayscale(\${p}) brightness(\${1 - 0.38 * p}) contrast(\${1 - 0.12 * p})\`;
        });
        document.getElementById('cap').style.opacity = clamp((t - 2.6) / 0.6);
      };
    </script>
  </div>`;

// GRAVE-05 beat 2: settings-style storage bar filling, then the roll
// doom-scrolling beneath; deadpan line fades in (5.5s @30fps).
const TILE_ROWS = [...PHOTOS, ...PHOTOS, ...PHOTOS];
const g5anim = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;overflow:hidden;font-family:'Segoe UI',-apple-system,sans-serif;">
    <div style="position:absolute;left:70px;right:70px;top:190px;z-index:3;background:rgba(28,23,19,.92);padding:0 0 34px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div style="font-size:34px;font-weight:600;color:#EDEAE4;">iPhone Storage</div>
        <div id="gb" style="font-size:27px;color:#B7B0A6;">0 GB of 128 GB used</div>
      </div>
      <div style="margin-top:22px;height:26px;border-radius:13px;background:rgba(252,250,245,.13);overflow:hidden;">
        <div id="bar" style="height:100%;width:0%;border-radius:13px;background:linear-gradient(90deg,#C9A44C,#B85C38);"></div>
      </div>
    </div>
    <div style="position:absolute;left:70px;right:70px;top:360px;bottom:0;overflow:hidden;">
      <div id="roll" style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
        ${TILE_ROWS.map((p) => `<div style="aspect-ratio:1;overflow:hidden;"><img src="${p}" style="width:100%;height:100%;object-fit:cover;"></div>`).join("")}
      </div>
      <div style="position:absolute;left:-70px;right:-70px;bottom:0;height:700px;background:linear-gradient(180deg,transparent,${INK} 78%);"></div>
    </div>
    <div id="cap" class="claim" style="position:absolute;left:80px;right:80px;bottom:300px;z-index:4;font-size:58px;line-height:1.34;color:${CREAM};text-align:center;opacity:0;text-shadow:0 3px 26px rgba(0,0,0,.8);">your solution will be to delete the blurry ones. again.</div>
    <script>
      const clamp = (v) => Math.max(0, Math.min(1, v));
      window.setT = (t) => {
        const fill = 0.42 + clamp(t / 1.8) * 0.56;
        document.getElementById('bar').style.width = (fill * 100) + '%';
        document.getElementById('gb').textContent = Math.round(fill * 128 * 10) / 10 + ' GB of 128 GB used';
        const scroll = Math.max(0, t - 1.6) * 300;
        document.getElementById('roll').style.transform = 'translateY(' + (-scroll) + 'px)';
        document.getElementById('cap').style.opacity = clamp((t - 3.2) / 0.6);
      };
    </script>
  </div>`;

// ── Render ──────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

async function still(name, body, transparent) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}

async function sequence(dir, body, seconds, fps = 30) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 400));
  const frames = Math.round(seconds * fps);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.setT(t), f / fps);
    await page.screenshot({ path: path.join(dir, `f${String(f).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  }
  await page.close();
  console.log("wrote", frames, "frames to", dir);
}

await still("g8-hook.png", g8hook, false);
await still("g8-cap-rooms.png", caption("rooms, though.<br>rooms get walked&nbsp;through."), true);
await still("g5-hook.png", g5hook, false);
await still("g5-cap-relief.png", caption("or give the good ones a bigger&nbsp;house."), true);
await still("endcard-grave08a.png", endcard("GRAVE-08a"), false);
await still("endcard-grave05a.png", endcard("GRAVE-05a"), false);
await sequence(`${WORK}/g8grid`, g8grid, 6);
await sequence(`${WORK}/g5anim`, g5anim, 5.5);

await browser.close();
