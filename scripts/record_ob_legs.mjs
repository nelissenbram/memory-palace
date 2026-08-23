// Records the MOVING onboarding legs (/flythrough?scene=onboarding&name=Guillaume)
// in ONE headless run.
//
// Architecture (discovered 2026-08-23): the exterior builds its OWN canvas;
// hall/corridor/room share ONE pooled-renderer canvas (rendererPool.ts). So:
//   recorder 1 -> exterior canvas:  leg-a-approach.webm (Begin the walk -> gate -> door beat)
//   recorder 2 -> pooled canvas:    walk-full.webm (hall look+walk -> corridor -> door -> room),
//                                   with DOM-text beat OFFSETS logged for ffmpeg splitting.
// The ballroom HDRI env swap (desktop-GPU tier) washes the hall to near-white on
// the rig — blocked via request interception so the warm procedural env stays
// (matches the owner-approved look; zero app-code changes).
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT = path.resolve("scripts/hero_rec2");
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--no-sandbox", "--mute-audio", "--window-size=1920,1080", "--autoplay-policy=no-user-gesture-required"],
});
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const cdp = await p.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });

// Warm-hall parity: never let the ballroom HDRI swap load (potato-tier look).
await p.setRequestInterception(true);
p.on("request", (req) => {
  if (req.url().includes("ballroom_1k.hdr")) { req.abort().catch(() => {}); return; }
  req.continue().catch(() => {});
});

const text = () => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
const clickText = async (needle) => p.evaluate((n) => {
  const el = [...document.querySelectorAll("button, [role=button]")].find((e) => (e.innerText || "").toLowerCase().includes(n.toLowerCase()) && e.offsetParent !== null);
  if (el) { el.click(); return true; }
  return false;
}, needle);
const waitBeat = async (re, timeoutMs, pollMs = 250) => {
  const dl = Date.now() + timeoutMs;
  while (Date.now() < dl) {
    let t = "";
    try { t = await text(); } catch { /* transient */ }
    if (re.test(t)) return true;
    await sleep(pollMs);
  }
  return false;
};
// Arm a MediaRecorder on a canvas. which: "tagged-exterior" tags the current
// last canvas as the exterior first; "new" waits for a canvas that is NOT the
// tagged exterior one (the pooled interior canvas).
const armRec = async (fname, which) => {
  if (which === "new") {
    const dl = Date.now() + 15000;
    while (Date.now() < dl) {
      const found = await p.evaluate(() => [...document.querySelectorAll("canvas")].some((c) => c !== window.__extCanvas));
      if (found) break;
      await sleep(200);
    }
  }
  return p.evaluate((fn, w) => {
    let canvas;
    const all = [...document.querySelectorAll("canvas")];
    if (w === "new") canvas = all.find((c) => c !== window.__extCanvas);
    else { canvas = all.pop(); window.__extCanvas = canvas; }
    if (!canvas) return false;
    const stream = canvas.captureStream(60);
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((c) => MediaRecorder.isTypeSupported(c));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fn;
      document.body.appendChild(a); a.click(); a.remove();
    };
    window.__rec = rec;
    rec.start(500);
    return true;
  }, fname, which);
};
const stopRec = () => p.evaluate(() => { try { window.__rec.stop(); } catch {} });
const waitFile = async (fname, timeoutMs = 25000) => {
  const dl = Date.now() + timeoutMs;
  while (Date.now() < dl) { if (fs.existsSync(path.join(OUT, fname))) return true; await sleep(500); }
  return false;
};

// &mantelDemo=1 (tour item 5, owner 2026-08-23): the room leg records with the
// demo hero photo (graduation.jpg) already hung in the mantel frame.
await p.goto("http://localhost:3000/flythrough?scene=onboarding&name=Guillaume&mantelDemo=1", { waitUntil: "domcontentloaded", timeout: 60000 });
log("loaded");
await sleep(6000);
await clickText("Skip intro"); log("skipped intro");
await sleep(2500);
await clickText("Continue"); log("lang continue");
await sleep(2500);
await clickText("Continue"); log("name continue (Guillaume prefilled)");

// ── LEG A: approach (exterior canvas) — Begin the walk -> gate -> door beat ──
if (!(await waitBeat(/Begin the walk/i, 60000, 1000))) { log("ERROR: WP1 prompt never appeared"); await b.close(); process.exit(2); }
log("WP1 prompt visible — arming leg A (exterior canvas)");
await armRec("leg-a-approach.webm", "tagged-exterior");
await clickText("Begin the walk"); log("Begin clicked — recording approach");
const hallSeen = await waitBeat(/Through the entrance/i, 35000);
await stopRec(); log(`leg A stopped (hall beat ${hallSeen ? "seen" : "TIMEOUT"})`);

// ── WALK RECORDING (pooled canvas): hall -> corridor -> door -> room, one take ──
const armed = await armRec("walk-full.webm", "new");
if (!armed) { log("ERROR: pooled canvas never appeared"); await b.close(); process.exit(2); }
const walkT0 = Date.now();
const off = () => ((Date.now() - walkT0) / 1000).toFixed(1);
log("walk recorder armed on pooled canvas — hall leg running");

// beat: corridor entered (its early caption is distinctive vs the hall overlay)
const corrSeen = await waitBeat(/Each wing has rooms/i, 45000);
log(`BEAT corridor @ +${off()}s (${corrSeen ? "seen" : "TIMEOUT"})`);

// beat: corridor step-6 prompt -> click Enter The Room (retry until it lands)
const promptSeen = await waitBeat(/Your personal Room is/i, 45000);
log(`BEAT enter-prompt @ +${off()}s (${promptSeen ? "seen" : "TIMEOUT"})`);
await sleep(500); // settle on the prompt stance
let clicked = false;
for (let i = 0; i < 12 && !clicked; i++) { clicked = await clickText("Enter The Room"); if (!clicked) await sleep(400); }
log(`Enter The Room clicked=${clicked} @ +${off()}s`);

// beat: room leg begun (distinctive early room caption)
const roomSeen = await waitBeat(/This is your first room/i, 25000);
log(`BEAT room @ +${off()}s (${roomSeen ? "seen" : "TIMEOUT"})`);

// beat: room step 4 — the caption flips to "Every Room in your Palace holds"
// exactly when the LEFT-WALL pan begins (choreography t=7.0s into the room
// clock) — anchors the ffmpeg room cuts (tour item 3: left pan must be in).
const step4Seen = await waitBeat(/Every Room in your Palace holds/i, 30000);
log(`BEAT room-step4-leftpan @ +${off()}s (${step4Seen ? "seen" : "TIMEOUT"})`);

// beat: hang prompt (or ImportHub if a ceiling advanced) ends the take
const hangSeen = await waitBeat(/hang your first memory|Click on the empty painting|Drop your phot|Drop phot/i, 45000);
log(`BEAT hang @ +${off()}s (${hangSeen ? "seen" : "TIMEOUT"})`);
await sleep(800); // hold the final stance a beat
await stopRec(); log(`walk recorder stopped @ +${off()}s`);

// ── Collect downloads ──
let allOk = true;
for (const f of ["leg-a-approach.webm", "walk-full.webm"]) {
  const ok = await waitFile(f);
  if (ok) log(`DONE: ${f} (${(fs.statSync(path.join(OUT, f)).size / 1e6).toFixed(1)} MB)`);
  else { log(`MISSING: ${f}`); allOk = false; }
}
await b.close();
process.exit(allOk ? 0 : 2);
