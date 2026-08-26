// Fresh phone-viewport screenshots of the CURRENT app (for the smartphone
// carousel inlay, owner 2026-08-26) â€” store-asset cards are stale, so shoot
// the live pages instead. 390x844 @3x â†’ 1170x2532 PNGs.
// Usage: node scripts/week1/capture-phone.mjs   (dev server on :3000)
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/phone";
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ["cor3d", "/flythrough?scene=corridor"],
  ["hearth3d", "/flythrough?scene=room&fill=max&rcam=hearth"],
];

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox"],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");

for (const [name, path] of SHOTS) {
  console.log("capturing", name);
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle2", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 16000));
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    document.querySelectorAll("body *").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.contains(canvas) || canvas?.contains(el)) return;
      el.style.display = "none";
    });
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
await browser.close();
console.log("done:", fs.readdirSync(OUT).join(", "));
