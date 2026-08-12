// Temp: headless render of a Vercel preview /flythrough for self-review.
import puppeteer from "puppeteer";

const URL = process.env.SHOT_URL;
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
await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 }).catch((e) => console.log("goto:", e.message));
await new Promise((r) => setTimeout(r, 12000));
try { await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /start|begin|record/i.test(x.innerText)); if (b) b.click(); }); } catch {}
await new Promise((r) => setTimeout(r, 3200));
await page.screenshot({ path: `${OUT}/mp_ivy.png` });
console.log("done");
await browser.close();
