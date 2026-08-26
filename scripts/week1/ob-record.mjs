// WONDER-07 recorder: drives the onboarding preview (skip intro → lang →
// name "Sofia" → pick 3 capture photos → walk) and records the CANVAS
// per scene segment (the DOM veil hides assembly from users, but the canvas
// underneath shows the architecture assembling — exactly WONDER-07's shot).
// Segments save as work/obwalk/seg-<n>.webm.
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/obwalk";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const TOTAL_S = 150;

const browser = await puppeteer.launch({
  protocolTimeout: 240000,
  headless: false,
  args: ["--window-size=830,1560", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 810, height: 1440 },
});
const page = await browser.newPage();
page.on("console", (m) => { if (m.text().startsWith("[rec]")) console.log(m.text()); });

let segIdx = 0;
await page.exposeFunction("saveSegment", (base64) => {
  const n = segIdx++;
  fs.writeFileSync(`${OUT}/seg-${n}.webm`, Buffer.from(base64, "base64"));
  console.log(`saved seg-${n}.webm`);
});

await page.evaluateOnNewDocument((totalS) => {
  const seen = new Set();
  const armAll = () => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      if (seen.has(canvas)) return;
      try {
        const stream = canvas.captureStream(30);
        const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 10_000_000 });
        const chunks = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          if (!chunks.length) return;
          const buf = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
          let bin = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          window.saveSegment(btoa(bin));
        };
        stream.getVideoTracks()[0].addEventListener("ended", () => { try { rec.stop(); } catch {} });
        window.__recs = window.__recs || [];
        window.__recs.push(rec);
        rec.start(500);
        seen.add(canvas);
        console.log("[rec] armed on canvas", canvas.width, canvas.height);
        setTimeout(() => { try { if (rec.state !== "inactive") rec.stop(); } catch {} }, totalS * 1000);
      } catch (e) { console.log("[rec] arm failed:", String(e)); }
    });
  };
  setInterval(armAll, 800);
  try { new MutationObserver(armAll).observe(document.documentElement, { childList: true, subtree: true }); } catch {}
  try { document.addEventListener("DOMContentLoaded", armAll); } catch {}
}, TOTAL_S);

const clickByText = (texts) => page.evaluate((wanted) => {
  const btns = [...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null && !b.disabled);
  for (const w of wanted) {
    const hit = btns.find((b) => b.textContent && b.textContent.toLowerCase().includes(w.toLowerCase()));
    if (hit) { hit.click(); return w; }
  }
  return null;
}, texts);

console.log("navigating…");
await page.goto("http://localhost:3000/flythrough?scene=onboarding&mantelDemo=1", { waitUntil: "networkidle2", timeout: 120000 });
await new Promise((r) => setTimeout(r, 5000));
console.log("skip intro:", await clickByText(["skip"]));
await new Promise((r) => setTimeout(r, 2500));
console.log("lang continue:", await clickByText(["continue"]));
await new Promise((r) => setTimeout(r, 2500));
// name card: type via the native setter so React sees it
await page.evaluate(() => {
  const inp = document.querySelector("input[type=text], input:not([type])");
  if (inp) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(inp, "Sofia");
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await new Promise((r) => setTimeout(r, 600));
console.log("name continue:", await clickByText(["continue"]));
await new Promise((r) => setTimeout(r, 3000));
try { await page.screenshot({ path: `${OUT}/capture-card.png` }); } catch {}
// capture card: "Choose your photos" opens a file chooser — feed it 3 demo jpgs
try {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 5000 }),
    clickByText(["choose your photos"]),
  ]);
  await chooser.accept([
    "C:/Users/nelis/memory-palace-staging/public/demo/edge-of-water.jpg",
    "C:/Users/nelis/memory-palace-staging/public/demo/quiet-morning.jpg",
    "C:/Users/nelis/memory-palace-staging/public/demo/between-two-hands.jpg",
  ]);
  console.log("picked 3 via file chooser");
} catch {
  console.log("no file chooser — falling back to 'add later'");
  await clickByText(["later"]);
}
await new Promise((r) => setTimeout(r, 2500));
try { await page.screenshot({ path: `${OUT}/after-pick.png` }); } catch {}
console.log("capture continue:", await clickByText(["continue", "hang", "start", "begin", "walk"]));
console.log("walk running — recording segments…");
// Let the whole walk play out (auto-advance timers move the legs along)
for (let t = 0; t < TOTAL_S; t += 15) {
  await new Promise((r) => setTimeout(r, 15000));
  const info = await page.evaluate(() => ({
    canvases: document.querySelectorAll("canvas").length,
    buttons: [...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null).map((b) => b.textContent?.trim().slice(0, 30)),
  }));
  console.log(`t=${t + 15}s canvases=${info.canvases} buttons=${JSON.stringify(info.buttons)}`);
  try { await page.screenshot({ path: `${OUT}/walk-${t + 15}.png` }); } catch {}
  const adv = await clickByText(["begin the walk", "enter the", "continue"]);
  if (adv) console.log(`  advanced via: ${adv}`);
}
await page.evaluate(() => { (window.__recs || []).forEach((r) => { try { if (r.state !== "inactive") r.stop(); } catch {} }); });
await new Promise((r) => setTimeout(r, 8000));
console.log("segments:", fs.readdirSync(OUT).filter((f) => f.endsWith(".webm")).join(", ") || "NONE");
await browser.close();
