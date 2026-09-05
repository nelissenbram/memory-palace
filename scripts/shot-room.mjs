// Diagnostic: load the deployed /flythrough room scene with a debug camera and capture.
import puppeteer from "puppeteer";

const URL = process.env.SHOT_URL || "http://localhost:3000/flythrough?scene=room&wallcount=24&rcam=door";
const OUT = process.env.OUT || (process.env.TEMP || "/tmp") + "/mp_room.png";

const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl",
    "--ignore-gpu-blocklist", "--no-sandbox", "--window-size=1920,1080",
  ],
});
const page = await browser.newPage();
if (process.env.UA) await page.setUserAgent(process.env.UA);
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
page.on("console", (m) => { const t = m.text(); if (/error|warn|aspect|rooms|draw|light|budget|tris/i.test(t)) console.log("PAGE:", t); });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 }).catch(() => {});
await new Promise((r) => setTimeout(r, Number(process.env.WAIT || 10000)));
await page.screenshot({ path: OUT });
console.log("saved", OUT);
await browser.close();
