// One-off diagnostic: load /flythrough, drag-orbit the exterior camera, capture.
import puppeteer from "puppeteer";

const PORT = process.env.SHOT_PORT || 3000;
const DRAG = Number(process.env.ORBIT_DRAG || 300); // px horizontal drag
const DRAGY = Number(process.env.ORBIT_DRAG_Y || 0); // px vertical drag (negative = camera up)
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
await page.goto(`http://localhost:${PORT}/flythrough`, { waitUntil: "networkidle2", timeout: 120000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 9000));

// drag on the canvas to orbit (mousedown → move → up)
const cx = 960, cy = 500;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(cx + (DRAG * i) / 10, cy + (DRAGY * i) / 10); await new Promise((r) => setTimeout(r, 40)); }
await page.mouse.up();
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/mp_orbit.png` });
console.log("saved", `${OUT}/mp_orbit.png`);
await browser.close();
