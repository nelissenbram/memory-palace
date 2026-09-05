// Clip-kit round 5 — assets for the rest of the starter set:
// PARENT-05a, LEGACY-02a, LEGACY-04a, NATIVE-03a, NATIVE-04a, WONDER-07a,
// RESTORE-01a/07a. Same brand system; data-driven still list + the
// "Mama" WhatsApp sequence (PARENT-05 beat 2).
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const SRC = `${KIT}/src`;
const OUTDIR = `${KIT}/work/mamachat`;
const DEMO = "C:/Users/nelis/memory-palace/public/demo";
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

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

// Full-frame ink hook card
const inkCard = (html, size = 84) => `
  <div style="width:1080px;height:1920px;background:${INK};display:flex;align-items:center;justify-content:center;">
    <div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;max-width:880px;">${html}</div>
  </div>`;
// Bottom-third caption pill (transparent)
const caption = (html, size = 60) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:70px;right:70px;bottom:330px;display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;
// Center caption pill (transparent) — hooks over footage / poetry lines
const midCaption = (html, size = 66) => `
  <div style="width:1080px;height:1920px;position:relative;">
    <div style="position:absolute;left:70px;right:70px;top:46%;transform:translateY(-50%);display:flex;justify-content:center;">
      <div class="claim" style="font-size:${size}px;line-height:1.34;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:22px 46px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div>
    </div>
  </div>`;
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

const photoBuf = await sharp(`${DEMO}/edge-of-water.jpg`).resize(560, 400, { fit: "cover" }).jpeg({ quality: 84 }).toBuffer();
const PHOTO = `data:image/jpeg;base64,${photoBuf.toString("base64")}`;
const mamachat = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;font-family:'Segoe UI',-apple-system,sans-serif;">
    <div style="position:absolute;left:90px;right:90px;top:280px;height:1120px;border-radius:44px;overflow:hidden;background:#EFE7DD;box-shadow:0 40px 120px rgba(0,0,0,.55);">
      <div style="height:118px;background:#075E54;display:flex;align-items:center;padding:0 36px;">
        <div style="width:66px;height:66px;border-radius:50%;background:#C77B54;display:flex;align-items:center;justify-content:center;color:#FCFAF5;font-size:34px;">❤️</div>
        <div style="margin-left:24px;">
          <div style="color:#fff;font-size:32px;font-weight:600;">Mama ❤️</div>
          <div style="color:rgba(255,255,255,.75);font-size:24px;">online</div>
        </div>
      </div>
      <div style="padding:40px 36px;">
        <div id="b1" style="width:620px;background:#fff;border-radius:22px 22px 22px 6px;padding:14px;opacity:0;transform:scale(.9);transform-origin:bottom left;box-shadow:0 3px 10px rgba(0,0,0,.12);">
          <img src="${PHOTO}" style="width:592px;height:420px;object-fit:cover;border-radius:14px;display:block;">
          <div style="font-size:30px;color:#111;padding:14px 8px 4px;">look what I found — you at the sea, summer &rsquo;02 🥹</div>
          <div style="font-size:22px;color:#777;text-align:right;padding-right:8px;">19:52</div>
        </div>
        <div id="b2" style="margin-top:28px;margin-left:auto;width:560px;background:#DCF8C6;border-radius:22px 22px 6px 22px;padding:22px 26px;opacity:0;transform:scale(.9);transform-origin:bottom right;box-shadow:0 3px 10px rgba(0,0,0,.12);">
          <div style="font-size:30px;color:#111;line-height:1.4;">Hung in the <b>Nest</b> room 🏛 The whole family can visit it tonight.</div>
          <div style="font-size:22px;color:#777;padding-top:6px;text-align:right;">19:53 ✓✓</div>
        </div>
      </div>
    </div>
    <div style="position:absolute;left:80px;right:80px;top:1490px;display:flex;justify-content:center;">
      <div id="cap" class="claim" style="font-size:58px;line-height:1.3;color:${CREAM};text-align:center;opacity:0;">she lives 400 km away.</div>
    </div>
    <script>
      const clamp = (v) => Math.max(0, Math.min(1, v));
      const pop = (el, t, t0) => {
        const p = clamp((t - t0) / 0.35);
        el.style.opacity = p;
        el.style.transform = 'scale(' + (0.9 + 0.1 * p) + ')';
      };
      window.setT = (t) => {
        pop(document.getElementById('b1'), t, 0.5);
        pop(document.getElementById('b2'), t, 2.7);
        document.getElementById('cap').style.opacity = clamp((t - 4.4) / 0.5);
      };
    </script>
  </div>`;

const STILLS = [
  // PARENT-05
  ["p5-hook.png", midCaption("My mother lives 400 km away.<br>Last night she hung a photo in our&nbsp;house.", 62), true],
  ["p5-cap-everyone.png", caption("everyone who loves them can add to&nbsp;it."), true],
  ["endcard-parent05a.png", endcard("PARENT-05a"), false],
  // LEGACY-02
  ["l2-hook.png", inkCard("What&rsquo;s the one question you never asked your&nbsp;father?"), false],
  ["l2-q1.png", caption("&lsquo;How did you meet&nbsp;mum?&rsquo;"), true],
  ["l2-q2.png", caption("&lsquo;What were you afraid of at&nbsp;30?&rsquo;"), true],
  ["l2-q3.png", caption("&lsquo;What do you want us to&nbsp;keep?&rsquo;"), true],
  ["l2-cap-answered.png", caption("He answered. It hangs here&nbsp;now."), true],
  ["l2-ask.png", inkCard("Ask it this&nbsp;week.", 92), false],
  ["endcard-legacy02a.png", endcard("LEGACY-02a"), false],
  // LEGACY-04
  ["l4-hook.png", midCaption("A family story survives about three generations. Then it&rsquo;s&nbsp;gone.", 62), true],
  ["l4-q1.png", caption("You know your grandparents&rsquo;&nbsp;names."), true],
  ["l4-q2.png", caption("Can you tell one story about their&nbsp;parents?"), true],
  ["l4-cap-place.png", caption("Unless someone builds it a place to&nbsp;live."), true],
  ["l4-cap-outlast.png", caption("Yours could outlast&nbsp;you."), true],
  ["endcard-legacy04a.png", endcard("LEGACY-04a"), false],
  // NATIVE-03
  ["n3-hook.png", midCaption("your grandmother&rsquo;s kitchen still exists. just not where you left&nbsp;it.", 62), true],
  ["n3-l1.png", midCaption("the tram stop where he asked&nbsp;her", 58), true],
  ["n3-l2.png", midCaption("the hallway that smelled like&nbsp;Sunday", 58), true],
  ["n3-cap-built.png", caption("some places we can&rsquo;t go back to. so we built one you&nbsp;can.", 56), true],
  ["n3-cap-place.png", caption("a place made of&nbsp;memories."), true],
  ["endcard-native03a.png", endcard("NATIVE-03a"), false],
  // NATIVE-04
  ["n4-hook.png", midCaption("liminal spaces, except someone still loves this&nbsp;one", 60), true],
  ["n4-cap.png", caption("every photo here is someone&rsquo;s real&nbsp;memory"), true],
  ["n4-hook2.png", midCaption("not a dream house.<br>a house of&nbsp;memories.", 66), true],
  ["endcard-native04a.png", endcard("NATIVE-04a"), false],
  // WONDER-07
  ["w7-hook.png", midCaption("Watch a life assemble&nbsp;itself.", 70), true],
  ["w7-cap.png", caption("Yours starts with one&nbsp;memory."), true],
  ["endcard-wonder07a.png", endcard("WONDER-07a"), false],
  // RESTORE
  ["r1-hook.png", midCaption("Watch her come&nbsp;back.", 72), true],
  ["r1-years.png", caption("BEFORE 1943 &nbsp;·&nbsp; TODAY", 44), true],
  ["r7-hook.png", midCaption("This is what 70 years does to a&nbsp;face.", 62), true],
  ["r7-cap.png", caption("Unless someone stops&nbsp;it."), true],
  ["endcard-restore01a.png", endcard("RESTORE-01a"), false],
  ["endcard-restore07a.png", endcard("RESTORE-07a"), false],
];

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, body, transparent] of STILLS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 220));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("wrote", name);
}

const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${mamachat}</body></html>`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 400));
const FPS = 30, SECONDS = 6;
for (let f = 0; f < Math.round(SECONDS * FPS); f++) {
  await page.evaluate((t) => window.setT(t), f / FPS);
  await page.screenshot({ path: path.join(OUTDIR, `f${String(f).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}
await browser.close();
console.log("done");
