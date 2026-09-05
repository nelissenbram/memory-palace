// Dev-only: headless render of the /flythrough exterior for self-review.
import puppeteer from "puppeteer";

const PORT = process.env.SHOT_PORT || 3100;
const URL = `http://localhost:${PORT}/flythrough`;
const OUT = process.env.TEMP || "/tmp";

const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl",
    "--ignore-gpu-blocklist", "--no-sandbox", "--window-size=1920,1080",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERR:", e.message));
page.on("console", (m) => { const t = m.text(); if (/palace|error|WebGL|fail|Exterior|mount/i.test(t)) console.log("LOG:", t.slice(0, 160)); });

console.log("loading", URL);
await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 }).catch((e) => console.log("goto:", e.message));
await new Promise((r) => setTimeout(r, 10000));

const info = await page.evaluate(() => ({
  hasCanvas: !!document.querySelector("canvas"),
  bodyText: (document.body.innerText || "").slice(0, 120),
}));
console.log("INFO:", JSON.stringify(info));

// Start the flythrough — scene 0 (Exterior) runs 8s. Capture within that window.
try { await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /start|begin|record/i.test(x.innerText)); if (b) b.click(); }); } catch {}

const times = [1200, 2600, 4000, 5400, 6800];
let prev = 0;
for (let i = 0; i < times.length; i++) {
  await new Promise((r) => setTimeout(r, times[i] - prev)); prev = times[i];
  const p = `${OUT}/mp_shot_${i}.png`;
  await page.screenshot({ path: p });
  console.log("shot", p, "@", times[i]);
}
await browser.close();
console.log("done");
