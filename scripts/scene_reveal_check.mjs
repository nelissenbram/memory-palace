// Headless probe for the interior scenes' ASSEMBLE-BEFORE-REVEAL barrier —
// loads /flythrough?scene=<entrance|corridor|room>, watches the scene's
// console logs (first frame / assembled reveal), screenshots the veil, the
// reveal moment, +2s and +4s. The scene must NOT gain parts after the reveal
// shot (text/avatar chrome may differ). Pattern: scripts/exterior_reveal_check.mjs.
// Usage: node scripts/scene_reveal_check.mjs entrance|corridor|room
import puppeteer from "puppeteer";
import fs from "fs";

const sceneArg = (process.argv[2] || "entrance").toLowerCase();
const TAGS = { entrance: "hall", corridor: "corridor", room: "room" };
const tag = TAGS[sceneArg];
if (!tag) { console.error(`unknown scene "${sceneArg}" (use entrance|corridor|room)`); process.exit(2); }

const OUT = `scripts/scene_reveal_out/${sceneArg}`;
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
const tagRe = new RegExp(`\\[${tag}\\]`);
page.on("console", (msg) => {
  const t = msg.text();
  if (tagRe.test(t)) log("console: " + t);
  const ff = t.match(new RegExp(`\\[${tag}\\] first frame at (\\d+) ms`));
  if (ff) firstFrameMs = parseInt(ff[1], 10);
  const rv = t.match(new RegExp(`\\[${tag}\\] reveal \\(assembled\\) at (\\d+) ms`));
  if (rv) revealMs = parseInt(rv[1], 10);
  if (/error/i.test(t) && !/Download the React DevTools/.test(t)) console.log("  [console-err]", t.slice(0, 200));
});
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 200)));

await page.goto(`http://localhost:3000/flythrough?scene=${sceneArg}`, { waitUntil: "domcontentloaded", timeout: 90000 });
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
log(`DONE — scene=${sceneArg}: first frame ${firstFrameMs}ms, assembled reveal ${revealMs}ms, shots in ${OUT}/`);
