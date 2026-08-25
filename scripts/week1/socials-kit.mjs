// Social-profile asset kit — FINAL ("type-only" winner, polished; grafts from
// "museum-placard" runner-up: refined line-art temple w/ column capitals,
// translucent double-hairline frame on the post, 2x supersample + Lanczos
// downscale for print-house crispness).
// Output: C:/Users/nelis/memory-palace/socials-kit/
import puppeteer from "puppeteer";
import fs from "fs";
import { execFileSync } from "child_process";

const OUT = "C:/Users/nelis/memory-palace/socials-kit";
fs.mkdirSync(OUT, { recursive: true });

const CLAIM = "Memories become a place<br>your loved ones can visit";
const CREAM = "#FCFAF5", TRAY = "#F6EBE3", INK = "#403B36", INK_DEEP = "#2E2A26",
  EMBER = "#B85C38", EMBER_GLYPH = "#9A4F2A", MUTED = "#716A5E", HAIRLINE = "#E3D6BC",
  GOLD = "#D4AF37";

// ICON — the brand temple, redrawn as refined engraved line-art (same temple:
// pediment, 4 fluted columns + the raised 5th oval, 3 steps; now with column
// capitals/bases grafted from the museum-placard variant).
const ICON = (color, size, w = 2) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" fill="none"
     stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 32 L50 12 L90 32"/>
  <path d="M12 40 H88"/>
  <path d="M10 32 L12 40 M90 32 L88 40"/>
  <path d="M18 44 V68 M22.5 44 V68"/>
  <path d="M32 44 V68 M36.5 44 V68"/>
  <path d="M46 44 V68 M50.5 44 V68"/>
  <path d="M60 44 V68 M64.5 44 V68"/>
  <path d="M16.5 44 H24 M30.5 44 H38 M44.5 44 H52 M58.5 44 H66"/>
  <path d="M16.5 68 H24 M30.5 68 H38 M44.5 68 H52 M58.5 68 H66"/>
  <ellipse cx="78.5" cy="56" rx="4.5" ry="12"/>
  <path d="M10 72 H90 M6 78 H94 M2 84 H98"/>
</svg>`;

const HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400;1,9..144,500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Marcellus&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
  .kicker{font-family:Marcellus,serif;text-transform:uppercase;}
  .claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;letter-spacing:-0.01em;}
</style>`;

// gold diamond + domain lockup (tiny gold accent only)
const domainLine = (fontPx, color, mt) => `
  <div style="display:flex;align-items:center;justify-content:center;margin-top:${mt}px;">
    <span style="display:inline-block;width:5px;height:5px;background:${GOLD};transform:rotate(45deg);margin-right:${Math.round(fontPx)}px;"></span>
    <span class="kicker" style="font-size:${fontPx}px;letter-spacing:.32em;margin-right:-.32em;color:${color};">thememorypalace.ai</span>
  </div>`;

// translucent double-hairline frame (grafted from museum-placard)
const dblFrame = (a, b, color) => `
  <div style="position:absolute;inset:${a}px;border:1px solid ${color};pointer-events:none;"></div>
  <div style="position:absolute;inset:${b}px;border:1px solid ${color};opacity:.55;pointer-events:none;"></div>`;

const pages = [
  // ── AVATAR — the engraved line-art TEMPLE (brand mark), ember on cream.
  //    Stroke weight tuned so it still reads at 40px; circle-crop safe.
  ["avatar-1024.png", 1024, 1024, `
    <div style="width:1024px;height:1024px;background:radial-gradient(circle at 50% 40%, ${CREAM} 0%, ${CREAM} 55%, ${TRAY} 100%);position:relative;overflow:hidden;">
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        ${ICON(EMBER, 660, 3.2)}
      </div>
    </div>`],
  // ── X BANNER 1500×500 — centered maison axis: kicker / hairline / claim / domain.
  ["banner-x-1500x500.png", 1500, 500, `
    <div style="width:1500px;height:500px;background:${CREAM};position:relative;overflow:hidden;">
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:6px;">
        <div class="kicker" style="font-size:21px;letter-spacing:.42em;padding-left:.42em;color:${MUTED};">The Memory Palace</div>
        <div style="width:72px;height:1px;background:linear-gradient(90deg,transparent,${HAIRLINE} 20%,${HAIRLINE} 80%,transparent);margin:26px auto 30px;"></div>
        <div class="claim" style="font-size:106px;line-height:1.14;color:${EMBER};text-align:center;">${CLAIM}</div>
        ${domainLine(17, MUTED, 42)}
      </div>
    </div>`],
  // ── YOUTUBE BANNER 2560×1440 — same axis, everything inside the centered
  //    1546×423 safe zone; quiet cream→tray field outside it.
  ["banner-yt-2560x1440.png", 2560, 1440, `
    <div style="width:2560px;height:1440px;background:radial-gradient(ellipse at 50% 46%, ${CREAM} 0%, ${CREAM} 50%, ${TRAY} 100%);position:relative;overflow:hidden;">
      <div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class="kicker" style="font-size:22px;letter-spacing:.42em;padding-left:.42em;color:${MUTED};">The Memory Palace</div>
        <div style="width:72px;height:1px;background:linear-gradient(90deg,transparent,${HAIRLINE} 20%,${HAIRLINE} 80%,transparent);margin:24px auto 26px;"></div>
        <div class="claim" style="font-size:100px;line-height:1.13;color:${EMBER};text-align:center;">${CLAIM}</div>
        ${domainLine(17, MUTED, 34)}
      </div>
    </div>`],
  // ── POST 1080×1080 — cream on ember, left-set poetry stack, line-art temple,
  //    translucent double-hairline frame (museum-placard graft).
  ["post-1080-claim.png", 1080, 1080, `
    <div style="width:1080px;height:1080px;background:${EMBER};position:relative;overflow:hidden;">
      ${dblFrame(30, 40, "rgba(252,250,245,.32)")}
      <div style="position:absolute;left:104px;top:96px;">${ICON("rgba(252,250,245,.92)", 62, 2.4)}</div>
      <div class="kicker" style="position:absolute;left:104px;top:186px;font-size:20px;letter-spacing:.38em;color:rgba(252,250,245,.72);">The Memory Palace</div>
      <div class="claim" style="position:absolute;left:96px;top:308px;font-size:122px;line-height:1.13;color:${CREAM};">Memories<br>become a place<br>your loved ones<br>can visit</div>
      <div style="position:absolute;left:104px;bottom:104px;display:flex;align-items:center;">
        <span style="display:inline-block;width:5px;height:5px;background:${GOLD};transform:rotate(45deg);margin-right:18px;"></span>
        <span class="kicker" style="font-size:19px;letter-spacing:.32em;color:rgba(252,250,245,.8);">thememorypalace.ai</span>
      </div>
    </div>`],
];

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, w, h, body] of pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 }); // supersample
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;padding:0;">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  const tmp = `${OUT}/_2x-${name}`;
  await page.screenshot({ path: tmp, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  // Lanczos downscale to exact deliverable size (print-house crispness)
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-vf", `scale=${w}:${h}:flags=lanczos`, `${OUT}/${name}`]);
  fs.unlinkSync(tmp);
  console.log("wrote", name);
}
await browser.close();

fs.writeFileSync(`${OUT}/BIOS.txt`, `SOCIALS SETUP KIT — The Memory Palace
=====================================
✔ Instagram-handle geclaimd: @thememorypalace.ai
Zelfde handle proberen op TikTok + YouTube (punt is daar toegestaan): thememorypalace.ai
X staat geen punt toe → founder-handle (persoonlijk) of "thememorypalace".
E-mail: één adres voor alles + 2FA overal aan.

── BRAND-BIO (Instagram / TikTok / YouTube / Threads) ──
Turn a lifetime of memories into a place your loved ones can visit 🏛
Photos become rooms. Rooms become a palace.
Walk through a real one — no signup ↓
Link: https://www.thememorypalace.ai/go/bio

── X (founder-account, persoonlijk) ──
Building The Memory Palace — memories become a place your loved ones can visit.
Solo, from Antwerp. 8 Apple rejections deep. Real numbers every Monday.
Link: https://www.thememorypalace.ai/go/x

── LINK-IN-BIO per platform (tracking!) ──
Instagram : https://www.thememorypalace.ai/go/ig
TikTok    : https://www.thememorypalace.ai/go/tiktok
YouTube   : https://www.thememorypalace.ai/go/yt
X         : https://www.thememorypalace.ai/go/x
Overig    : https://www.thememorypalace.ai/go/bio

── VOLGORDE (≈45 min) ──
1. ✔ Instagram (@thememorypalace.ai) → Threads 1-klik erbij (threads.net → inloggen met IG)
2. TikTok + YouTube via "Doorgaan met Google"
3. X: founder-handle fixen/aanmaken
4. Bluesky (geen telefoon nodig)
5. Metricool.com → alle kanalen koppelen → klaar: 1 kalender, ik vul, jij keurt goed
`);
console.log("wrote BIOS.txt");
