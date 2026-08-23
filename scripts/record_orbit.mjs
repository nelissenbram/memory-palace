// Records a slow scripted ORBIT of the palace in the idle exterior viewer
// (/flythrough?scene=exterior&name=Guillaume): after the assembled reveal,
// injects a MediaRecorder on the canvas (8Mbps vp9) and performs one graceful
// partial orbit via many tiny mouse-drag steps (eased ramp in/out, no zoom).
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT = path.resolve("scripts/hero_rec2");
fs.mkdirSync(OUT, { recursive: true });
const FILE = "palace-orbit.webm";
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--no-sandbox", "--mute-audio", "--window-size=1920,1080"],
});
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const cdp = await p.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });

await p.goto("http://localhost:3000/flythrough?scene=exterior&name=Guillaume", { waitUntil: "domcontentloaded", timeout: 60000 });
log("loaded — waiting for assembled reveal");
await sleep(16000); // veil holds until onReady (<=10s ceiling) + settle
await p.screenshot({ path: path.join(OUT, "orbit_pre.png") });

await p.evaluate((fname) => {
  const canvas = [...document.querySelectorAll("canvas")].pop();
  const stream = canvas.captureStream(60);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((c) => MediaRecorder.isTypeSupported(c));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
  };
  window.__rec = rec;
  rec.start(500);
}, FILE);
log("recorder armed — 1.2s static hold");
await sleep(1200);

// One graceful partial orbit: single mouse-down, ~11s of tiny eased drag steps.
// theta -= dx*0.004 (camO lerps toward camOT — smoothing built in). Target
// ~-620px total => ~+2.5rad (~140deg) orbit, plus a gentle downward drift.
const startX = 1430, startY = 520;
await p.mouse.move(startX, startY);
await p.mouse.down();
const DUR = 11000, TOTAL_DX = -620, TOTAL_DY = 46, STEP_MS = 16;
// Eased progress: trapezoid velocity profile — smooth ramp-in/out (~1.65s each).
const prog = (u) => {
  // integral-of-trapezoid velocity profile: ramp 0..r, flat, ramp 1-r..1
  const r = 0.15;
  const flatV = 1 / (1 - r); // so total area = 1
  if (u < r) return (flatV * u * u) / (2 * r);
  if (u > 1 - r) { const w = 1 - u; return 1 - (flatV * w * w) / (2 * r); }
  return (flatV * r) / 2 + flatV * (u - r);
};
const steps = Math.floor(DUR / STEP_MS);
const tStart = Date.now();
for (let i = 1; i <= steps; i++) {
  const u = Math.min(1, (Date.now() - tStart) / DUR);
  const pr = prog(u);
  await p.mouse.move(startX + TOTAL_DX * pr, startY + TOTAL_DY * pr);
  if (u >= 1) break;
  const drift = tStart + i * STEP_MS - Date.now();
  if (drift > 0) await sleep(drift);
}
await p.mouse.up();
log("drag done — 1.4s settle");
await sleep(1400);
await p.screenshot({ path: path.join(OUT, "orbit_post.png") });
await p.evaluate(() => { try { window.__rec.stop(); } catch {} });
log("stopped — waiting for download");
const dl = Date.now() + 20000;
let ok = false;
while (Date.now() < dl) { if (fs.existsSync(path.join(OUT, FILE))) { ok = true; break; } await sleep(1000); }
await sleep(2000);
if (ok) log(`DONE: ${FILE} (${(fs.statSync(path.join(OUT, FILE)).size / 1e6).toFixed(1)} MB)`);
else log("ERROR: download never arrived");
await b.close();
process.exit(ok ? 0 : 2);
