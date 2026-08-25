// Social-profile asset kit v2 — cinematic: gold temple on deep umber (the app's
// dark-band aesthetic) + real palace stills as banner backgrounds.
// Output: C:/Users/nelis/memory-palace/socials-kit/
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit";
fs.mkdirSync(OUT, { recursive: true });
const ICON = `<path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/><rect x="18" y="40" width="8" height="32"/><rect x="32" y="40" width="8" height="32"/><rect x="46" y="40" width="8" height="32"/><rect x="60" y="40" width="8" height="32"/><ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/><rect x="10" y="72" width="80" height="4"/><rect x="6" y="78" width="88" height="4"/><rect x="2" y="84" width="96" height="4"/>`;
const svg = (size, color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><g fill="${color}">${ICON}</g></svg>`;
const b64 = (p) => `data:image/jpeg;base64,${fs.readFileSync(p).toString("base64")}`;

const gate = b64("public/press/still-blossom-gate.jpg");
const atelier = b64("public/press/still-garden-atelier.jpg");

const CLAIM = "Memories become a place your loved ones can visit";
const GOLD = "#D4AF37", CREAM = "#FCFAF5", UMBER = "#241C15";

const pages = [
  // Avatar — gold temple on deep umber, warm radial glow + double gold ring
  ["avatar-1024.png", 1024, 1024, `
    <div style="width:1024px;height:1024px;background:radial-gradient(circle at 50% 42%, #3A2C1D 0%, ${UMBER} 62%, #1A140E 100%);display:flex;align-items:center;justify-content:center;">
      <div style="width:840px;height:840px;border-radius:50%;border:6px solid rgba(212,175,55,.85);box-shadow:inset 0 0 0 22px rgba(212,175,55,.14), 0 0 120px rgba(212,175,55,.18);display:flex;align-items:center;justify-content:center;">
        <div style="filter:drop-shadow(0 10px 40px rgba(212,175,55,.35));">${svg(520, GOLD)}</div>
      </div>
    </div>`],
  // X banner — blossom-gate still, cinematic umber overlay, cream wordmark + gold claim
  ["banner-x-1500x500.png", 1500, 500, `
    <div style="width:1500px;height:500px;position:relative;overflow:hidden;background:${UMBER};">
      <img src="${gate}" style="position:absolute;right:0;top:-140px;width:980px;opacity:.92;"/>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg, ${UMBER} 34%, rgba(36,28,21,.86) 48%, rgba(36,28,21,.25) 72%, rgba(36,28,21,.45) 100%);"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(0deg, rgba(26,20,14,.55), transparent 40%);"></div>
      <div style="position:relative;height:100%;display:flex;align-items:center;padding-left:70px;gap:44px;">
        <div style="filter:drop-shadow(0 6px 24px rgba(212,175,55,.4));">${svg(190, GOLD)}</div>
        <div>
          <div style="font-family:Georgia,serif;font-weight:600;font-size:66px;color:${CREAM};letter-spacing:.01em;text-shadow:0 2px 18px rgba(0,0,0,.5);">The Memory Palace</div>
          <div style="font-family:Georgia,serif;font-style:italic;font-size:31px;color:${GOLD};margin-top:16px;text-shadow:0 2px 12px rgba(0,0,0,.6);">${CLAIM}</div>
          <div style="font-family:Arial,sans-serif;font-size:23px;color:rgba(252,250,245,.75);margin-top:24px;letter-spacing:.06em;">thememorypalace.ai</div>
        </div>
      </div>
    </div>`],
  // YouTube banner — atelier still full-bleed, safe-zone centered text
  ["banner-yt-2560x1440.png", 2560, 1440, `
    <div style="width:2560px;height:1440px;position:relative;overflow:hidden;background:${UMBER};">
      <img src="${atelier}" style="position:absolute;left:0;top:-260px;width:2560px;opacity:.85;"/>
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(36,28,21,.28) 0%, rgba(36,28,21,.82) 58%, rgba(26,20,14,.95) 100%);"></div>
      <div style="position:relative;height:100%;display:flex;align-items:center;justify-content:center;">
        <div style="display:flex;align-items:center;gap:52px;">
          <div style="filter:drop-shadow(0 8px 30px rgba(212,175,55,.45));">${svg(280, GOLD)}</div>
          <div>
            <div style="font-family:Georgia,serif;font-weight:600;font-size:80px;color:${CREAM};text-shadow:0 3px 24px rgba(0,0,0,.6);">The Memory Palace</div>
            <div style="font-family:Georgia,serif;font-style:italic;font-size:36px;color:${GOLD};margin-top:16px;text-shadow:0 2px 16px rgba(0,0,0,.7);">${CLAIM}</div>
          </div>
        </div>
      </div>
    </div>`],
  // Bonus: IG first-post square — still + claim card (so the account never looks empty)
  ["post-1080-claim.png", 1080, 1080, `
    <div style="width:1080px;height:1080px;position:relative;overflow:hidden;background:${UMBER};">
      <img src="${gate}" style="position:absolute;left:-190px;top:0;width:1460px;opacity:.9;"/>
      <div style="position:absolute;inset:0;background:linear-gradient(0deg, rgba(26,20,14,.92) 0%, rgba(36,28,21,.35) 45%, rgba(36,28,21,.15) 70%);"></div>
      <div style="position:absolute;left:0;right:0;bottom:76px;text-align:center;padding:0 90px;">
        <div style="margin-bottom:26px;filter:drop-shadow(0 6px 24px rgba(212,175,55,.45));">${svg(120, GOLD)}</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:52px;line-height:1.25;color:${CREAM};text-shadow:0 2px 18px rgba(0,0,0,.6);">${CLAIM}.</div>
        <div style="font-family:Arial,sans-serif;font-size:26px;color:${GOLD};margin-top:26px;letter-spacing:.08em;">THEMEMORYPALACE.AI</div>
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
Handle overal proberen: thememorypalace  (fallback: memorypalaceapp)
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
1. Instagram aanmaken (brand) → Threads 1-klik erbij
2. TikTok + YouTube via "Doorgaan met Google"
3. X: founder-handle fixen/aanmaken
4. Bluesky (geen telefoon nodig)
5. Metricool.com → alle kanalen koppelen → klaar: 1 kalender, ik vul, jij keurt goed
`);
console.log("wrote BIOS.txt");
