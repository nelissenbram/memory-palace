// Headless probe for the exterior ASSEMBLE-BEFORE-REVEAL barrier — loads
// /flythrough?scene=exterior, watches the [palace] console logs (first frame /
// assembled reveal), screenshots the veil, the reveal moment, +2s and +4s.
// The palace must NOT gain building parts after the reveal shot.
// Verification-only (pattern: scripts/ob_e2e_check.mjs).
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "scripts/exterior_reveal_out";
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--use-gl=angle", "--use-angle=swiftshader", "--window-size=1280,800"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

let firstFrameMs = null, revealMs = null;
page.on("console", (msg) => {
  const t = msg.text();
  if (/\[palace\]/.test(t)) log("console: " + t);
  const ff = t.match(/first frame at (\d+) ms/);
  if (ff) firstFrameMs = parseInt(ff[1], 10);
  const rv = t.match(/reveal \(assembled\) at (\d+) ms/);
  if (rv) revealMs = parseInt(rv[1], 10);
  if (/error/i.test(t) && !/Download the React DevTools/.test(t)) console.log("  [console-err]", t.slice(0, 200));
});
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 200)));

await page.goto("http://localhost:3000/flythrough?scene=exterior", { waitUntil: "domcontentloaded", timeout: 90000 });
log("page loaded (domcontentloaded)");

// Veil-up shot once the scene has begun mounting
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${OUT}/01_veil.png` });
log("shot 01_veil (expect cream veil)");

// Wait for the assembled-reveal log (cap 30s headless)
const deadline = Date.now() + 30000;
while (revealMs === null && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
if (revealMs === null) { log("FAIL: no assembled-reveal log within 30s"); await page.screenshot({ path: `${OUT}/02_timeout.png` }); await browser.close(); process.exit(1); }
log(`reveal fired: first frame ${firstFrameMs}ms, assembled reveal ${revealMs}ms`);

// Let the 400ms veil fade finish, then the reveal shot + drift shots
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: `${OUT}/02_reveal.png` });
log("shot 02_reveal");
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: `${OUT}/03_reveal_plus2s.png` });
log("shot 03_reveal_plus2s");
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: `${OUT}/04_reveal_plus4s.png` });
log("shot 04_reveal_plus4s");

await browser.close();
log(`DONE — first frame ${firstFrameMs}ms, assembled reveal ${revealMs}ms, shots in ${OUT}/`);
