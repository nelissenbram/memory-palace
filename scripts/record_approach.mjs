// Records the onboarding exterior approach (hold → flyover → name beat → gate)
// with ?name=Guillaume by injecting a MediaRecorder around "Begin the walk".
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
const OUT = path.resolve("scripts/hero_rec");
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const b = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--no-sandbox", "--mute-audio", "--window-size=1920,1080", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const cdp = await p.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
await p.goto("http://localhost:3000/flythrough?scene=onboarding&name=Guillaume", { waitUntil: "domcontentloaded", timeout: 60000 });
log("loaded");
const clickText = async (needle) => p.evaluate((n) => { const el = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").toLowerCase().includes(n.toLowerCase()) && e.offsetParent !== null); if (el) { el.click(); return true; } return false; }, needle);
await new Promise((r) => setTimeout(r, 6000));
await clickText("Skip intro"); log("skipped intro");
await new Promise((r) => setTimeout(r, 2500));
await clickText("Continue"); log("lang continue");
await new Promise((r) => setTimeout(r, 2500));
await clickText("Continue"); log("name continue (Guillaume prefilled)");
// wait for the WP1 prompt
const deadline = Date.now() + 40000;
let prompted = false;
while (Date.now() < deadline) {
  const t = await p.evaluate(() => document.body.innerText || "");
  if (/Begin the walk/i.test(t)) { prompted = true; break; }
  await new Promise((r) => setTimeout(r, 1500));
}
if (!prompted) { log("ERROR: prompt never appeared"); await b.close(); process.exit(2); }
log("prompt visible — arming recorder");
await p.evaluate(() => {
  const canvas = document.querySelector("canvas");
  const stream = canvas.captureStream(60);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((c) => MediaRecorder.isTypeSupported(c));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "palace-approach.webm";
    document.body.appendChild(a); a.click(); a.remove();
  };
  window.__rec = rec;
  rec.start(500);
});
await clickText("Begin the walk"); log("Begin clicked — recording approach");
await new Promise((r) => setTimeout(r, 9500));
await p.evaluate(() => { try { window.__rec.stop(); } catch {} });
log("stopped — waiting for download");
const dl = Date.now() + 20000;
let ok = false;
while (Date.now() < dl) { if (fs.existsSync(path.join(OUT, "palace-approach.webm"))) { ok = true; break; } await new Promise((r) => setTimeout(r, 1000)); }
await new Promise((r) => setTimeout(r, 2000));
if (ok) log(`DONE: palace-approach.webm (${(fs.statSync(path.join(OUT, "palace-approach.webm")).size / 1e6).toFixed(1)} MB)`);
await b.close();
process.exit(ok ? 0 : 2);
