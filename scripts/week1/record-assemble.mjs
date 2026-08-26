// WONDER-07 footage: record the room scene ASSEMBLING (canvas capture from
// the very first frame, before the reveal barrier fires). Headed for GPU.
// Usage: node scripts/week1/record-assemble.mjs [sceneUrl] [seconds] [outName]
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/scenes";
fs.mkdirSync(OUT, { recursive: true });
const SCENE = process.argv[2] || "/flythrough?scene=room&fill=max";
const SECONDS = Number(process.argv[3] || 16);
const NAME = process.argv[4] || "assemble-room";

const browser = await puppeteer.launch({
  headless: false,
  args: ["--window-size=830,1560", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 810, height: 1440 },
});
const page = await browser.newPage();
const cdp = await page.createCDPSession();
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

let saveResolve;
const saved = new Promise((r) => { saveResolve = r; });
await page.exposeFunction("saveRecording", (base64) => {
  fs.writeFileSync(`${OUT}/${NAME}.webm`, Buffer.from(base64, "base64"));
  saveResolve();
});

// Recorder arms itself as soon as a canvas with a WebGL context exists.
await page.evaluateOnNewDocument((seconds) => {
  const tryStart = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) { requestAnimationFrame(tryStart); return; }
    try {
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 10_000_000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const buf = await blob.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        window.saveRecording(btoa(bin));
      };
      rec.start(500);
      setTimeout(() => { try { rec.stop(); } catch {} }, seconds * 1000);
      window.__recArmed = true;
    } catch (e) { requestAnimationFrame(tryStart); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryStart);
  else tryStart();
}, SECONDS);

console.log("navigating", SCENE);
await page.goto(`http://localhost:3000${SCENE}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await Promise.race([saved, new Promise((r) => setTimeout(r, (SECONDS + 30) * 1000))]);
const ok = fs.existsSync(`${OUT}/${NAME}.webm`);
console.log(ok ? `saved ${NAME}.webm (${fs.statSync(`${OUT}/${NAME}.webm`).size} bytes)` : "FAILED â€” no recording saved");
await browser.close();
