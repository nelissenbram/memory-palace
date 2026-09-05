// Capture UNIQUE hearth stills per clip. Bulletproof: a FRESH browser per photo
// (isolates GPU/renderer crashes across the heavy 3D reloads), skip already-done.
import puppeteer from "puppeteer";
import fs from "fs";
const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/stills/pool";
fs.mkdirSync(OUT, { recursive: true });
const A = JSON.parse(fs.readFileSync("C:/Users/nelis/memory-palace/socials-kit/clips/work/pool/assignment.json", "utf8"));
const enc = encodeURIComponent;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0;
for (const m of A) {
  const dst = `${OUT}/${m.code}.png`;
  if (fs.existsSync(dst)) { done++; continue; }
  console.log("capturing", m.code, m.title);
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle","--use-angle=d3d11","--enable-gpu","--ignore-gpu-blocklist","--no-sandbox","--disable-features=CalculateNativeWinOcclusion","--force-device-scale-factor=1"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1620, height: 2880, deviceScaleFactor: 1 });
    const url = `/flythrough?scene=room&fill=max&rcam=hearth&heroUrl=${enc(m.url)}&heroTitle=${enc(m.title)}&heroYear=${m.year}`;
    await page.goto(`http://localhost:3000${url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("canvas", { timeout: 60000 });
    await sleep(20000);
    await page.evaluate(() => { const c = document.querySelector("canvas"); for (const el of document.body.children) { if (el instanceof HTMLElement && !el.contains(c)) el.style.display = "none"; } });
    await sleep(400);
    await page.screenshot({ path: dst, clip: { x: 0, y: 0, width: 1620, height: 2880 } });
    done++;
  } catch (e) { console.log("  ERR", m.code, String(e.message).slice(0, 50)); }
  finally { if (browser) await browser.close().catch(() => {}); }
}
console.log(`done: ${fs.readdirSync(OUT).length}/${A.length}`);
process.exit(fs.readdirSync(OUT).length >= A.length ? 0 : 1);
