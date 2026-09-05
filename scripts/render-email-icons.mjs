// Renders the Memory Palace temple mark (from PalaceLogo.tsx) to transparent
// PNGs in two brand tints for use as <img> in emails (SVG doesn't render in
// most email clients). Output: public/email/palace-gold.png, palace-ember.png.
import puppeteer from "puppeteer";
import fs from "fs";

const ICON = `<path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/><rect x="18" y="40" width="8" height="32"/><rect x="32" y="40" width="8" height="32"/><rect x="46" y="40" width="8" height="32"/><rect x="60" y="40" width="8" height="32"/><ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/><rect x="10" y="72" width="80" height="4"/><rect x="6" y="78" width="88" height="4"/><rect x="2" y="84" width="96" height="4"/>`;
const OUT = "public/email";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, color] of [["palace-gold", "#D4AF37"], ["palace-ember", "#9A4F2A"]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 240, height: 240, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;background:transparent;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="240" height="240"><g fill="${color}">${ICON}</g></svg></body></html>`);
  await page.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 240, height: 240 } });
  await page.close();
  console.log("wrote", `${OUT}/${name}.png`);
}
await browser.close();
