// Smooth slow orbit around the palace (idle exterior viewer), CFR 30 capture.
// One continuous horizontal drag with an ease-in/hold/ease-out velocity profile
// — no jerks. Downloads palace-orbit.webm to scripts/hero_rec2/.
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
const OUT = path.resolve("scripts/hero_rec2");
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--no-sandbox", "--mute-audio", "--window-size=1920,1080"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const cdp = await p.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
await p.goto("http://localhost:3000/flythrough?scene=exterior&name=Guillaume", { waitUntil: "domcontentloaded", timeout: 60000 });
log("loaded — waiting for the reveal veil to lift");
// Poll until "Preparing the palace" veil is gone (assemble-before-reveal can
// take 20-30s under headless d3d11) + a settle beat, so the orbit never starts blank.
const revealDl = Date.now() + 60000;
while (Date.now() < revealDl) {
  const veil = await p.evaluate(() => /Preparing the palace/i.test(document.body.innerText || ""));
  if (!veil) break;
  await sleep(1000);
}
await sleep(2500);
await p.screenshot({ path: path.join(OUT, "orbit_before.png") });
log(`veil lifted; canvases: ${await p.evaluate(() => document.querySelectorAll("canvas").length)}`);
// arm CFR-30 recorder
await p.evaluate(() => {
  const c = document.querySelector("canvas");
  const s = c.captureStream(30);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((x) => MediaRecorder.isTypeSupported(x));
  const rec = new MediaRecorder(s, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => { const bl = new Blob(chunks, { type: "video/webm" }); const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "palace-orbit.webm"; document.body.appendChild(a); a.click(); a.remove(); };
  window.__rec = rec; rec.start(500);
});
log("recording — smooth orbit");
// One continuous eased drag. Total horizontal travel ~1100px over ~12s.
const cx = 960, cy = 540;
await p.mouse.move(cx, cy);
await p.mouse.down();
const DUR = 12000, TRAVEL = 1150;
const start = Date.now();
let last = 0;
// ease: smoothstep over the whole gesture -> velocity ramps up then down, no jerk
const ease = (t) => t * t * (3 - 2 * t);
while (true) {
  const e = Date.now() - start;
  const t = Math.min(e / DUR, 1);
  const x = cx + ease(t) * TRAVEL;
  await p.mouse.move(x, cy);   // horizontal only -> pure yaw, no pitch wobble
  if (t >= 1) break;
  await sleep(16);             // ~60 input steps/s, far finer than 30fps capture
  last = t;
}
await p.mouse.up();
await p.screenshot({ path: path.join(OUT, "orbit_after.png") });
await sleep(400);
await p.evaluate(() => { try { window.__rec.stop(); } catch {} });
log("stopped — waiting for download");
const dl = Date.now() + 20000;
let ok = false;
while (Date.now() < dl) { if (fs.existsSync(path.join(OUT, "palace-orbit.webm"))) { ok = true; break; } await sleep(1000); }
await sleep(2000);
if (ok) log(`DONE: palace-orbit.webm (${(fs.statSync(path.join(OUT, "palace-orbit.webm")).size / 1e6).toFixed(1)} MB)`);
await b.close();
process.exit(ok ? 0 : 2);
