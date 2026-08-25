// Social-profile asset kit v3 — terracotta canon (cream/ink/ember) with the
// hero-video golden-hour villa as backdrop. Output: C:/Users/nelis/memory-palace/socials-kit/
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit";
fs.mkdirSync(OUT, { recursive: true });
const ICON = `<path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/><rect x="18" y="40" width="8" height="32"/><rect x="32" y="40" width="8" height="32"/><rect x="46" y="40" width="8" height="32"/><rect x="60" y="40" width="8" height="32"/><ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/><rect x="10" y="72" width="80" height="4"/><rect x="6" y="78" width="88" height="4"/><rect x="2" y="84" width="96" height="4"/>`;
const svg = (size, color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><g fill="${color}">${ICON}</g></svg>`;
const b64 = (p) => `data:image/jpeg;base64,${fs.readFileSync(p).toString("base64")}`;

const villa = b64("public/press/still-villa-goldenhour.jpg"); // hero-video golden hour, cypress path

const CLAIM = "Memories become a place your loved ones can visit";
const CREAM = "#FCFAF5", TRAY = "#F6EBE3", INK = "#403B36", INK_DEEP = "#2E2A26",
  EMBER = "#B85C38", EMBER_GLYPH = "#9A4F2A", MUTED = "#716A5E", HAIRLINE = "#E3D6BC";

const pages = [
  // Avatar — ember temple on warm cream/tray, terracotta ring (canon-pure, crisp small)
  ["avatar-1024.png", 1024, 1024, `
    <div style="width:1024px;height:1024px;background:radial-gradient(circle at 50% 40%, ${CREAM} 0%, ${TRAY} 74%, #EFDFCB 100%);display:flex;align-items:center;justify-content:center;">
      <div style="width:860px;height:860px;border-radius:50%;border:14px solid ${EMBER};box-shadow:inset 0 0 0 8px ${CREAM}, inset 0 0 0 11px ${HAIRLINE};display:flex;align-items:center;justify-content:center;background:${CREAM};">
        <div style="filter:drop-shadow(0 12px 28px rgba(154,79,42,.28));">${svg(520, EMBER)}</div>
      </div>
    </div>`],
  // X banner — golden-hour villa right, cream panel left, ink wordmark + ember claim
  ["banner-x-1500x500.png", 1500, 500, `
    <div style="width:1500px;height:500px;position:relative;overflow:hidden;background:${CREAM};">
      <img src="${villa}" style="position:absolute;right:0;top:-180px;width:1160px;"/>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg, ${CREAM} 38%, rgba(252,250,245,.96) 50%, rgba(252,250,245,.35) 68%, rgba(252,250,245,0) 82%);"></div>
      <div style="position:relative;height:100%;display:flex;align-items:center;padding-left:66px;gap:40px;">
        ${svg(180, EMBER)}
        <div>
          <div style="font-family:Georgia,serif;font-weight:600;font-size:64px;color:${INK_DEEP};letter-spacing:.01em;">The Memory Palace</div>
          <div style="font-family:Georgia,serif;font-style:italic;font-size:30px;color:${EMBER_GLYPH};margin-top:14px;">${CLAIM}</div>
          <div style="font-family:Arial,sans-serif;font-size:22px;color:${MUTED};margin-top:22px;letter-spacing:.06em;">thememorypalace.ai</div>
        </div>
      </div>
    </div>`],
  // YouTube banner — villa full-bleed, centered cream card in the safe zone
  ["banner-yt-2560x1440.png", 2560, 1440, `
    <div style="width:2560px;height:1440px;position:relative;overflow:hidden;background:${TRAY};">
      <img src="${villa}" style="position:absolute;left:0;top:-10px;width:2560px;"/>
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 52%, rgba(252,250,245,0) 22%, rgba(246,235,227,.28) 58%, rgba(246,235,227,.66) 100%);"></div>
      <div style="position:relative;height:100%;display:flex;align-items:center;justify-content:center;">
        <div style="background:rgba(252,250,245,.93);border:1px solid ${HAIRLINE};border-top:6px solid ${EMBER};border-radius:10px;padding:56px 88px;text-align:center;box-shadow:0 24px 80px rgba(64,59,54,.25);">
          <div style="margin-bottom:22px;">${svg(140, EMBER)}</div>
          <div style="font-family:Georgia,serif;font-weight:600;font-size:76px;color:${INK_DEEP};">The Memory Palace</div>
          <div style="font-family:Georgia,serif;font-style:italic;font-size:34px;color:${EMBER_GLYPH};margin-top:14px;">${CLAIM}</div>
        </div>
      </div>
    </div>`],
  // IG first-post square — villa + cream claim card bottom
  ["post-1080-claim.png", 1080, 1080, `
    <div style="width:1080px;height:1080px;position:relative;overflow:hidden;background:${TRAY};">
      <img src="${villa}" style="position:absolute;left:-420px;top:0;height:1080px;"/>
      <div style="position:absolute;left:64px;right:64px;bottom:64px;background:rgba(252,250,245,.94);border:1px solid ${HAIRLINE};border-top:5px solid ${EMBER};border-radius:10px;padding:44px 48px;text-align:center;box-shadow:0 18px 60px rgba(64,59,54,.28);">
        <div style="margin-bottom:18px;">${svg(96, EMBER)}</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:44px;line-height:1.3;color:${INK};">${CLAIM}.</div>
        <div style="font-family:Arial,sans-serif;font-size:23px;color:${EMBER_GLYPH};margin-top:20px;letter-spacing:.09em;">THEMEMORYPALACE.AI</div>
      </div>
    </div>`],
];

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, w, h, body] of pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;">${body}</body></html>`);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${OUT}/${name}`, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
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
