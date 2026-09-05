// RESTORE-03 hearth: hang the REAL GFPGAN-restored portrait above the mantel so
// the "restored, then hung" continuity holds (same image that gets wipe-revealed).
// Usage: dev server on :3000, then node scripts/week1/capture-restore03.mjs
import puppeteer from "puppeteer";
import fs from "fs";
const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/stills";
fs.mkdirSync(OUT, { recursive: true });
const url = "/flythrough?scene=room&fill=max&rcam=hearth&heroUrl=%2Fdemo%2Frestored-portrait.png&heroTitle=Grandmother&heroYear=1943";
const browser = await puppeteer.launch({ headless: false, args: ["--window-size=1640,2900", "--force-device-scale-factor=1"], defaultViewport: { width: 1620, height: 2880 } });
const page = await browser.newPage();
console.log("capturing hearth-restored");
await page.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 24000));
await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  for (const el of document.body.children) { if (el instanceof HTMLElement && !el.contains(canvas)) el.style.display = "none"; }
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/hearth-restored.png`, clip: { x: 0, y: 0, width: 1620, height: 2880 } });
await browser.close();
console.log("done: hearth-restored.png");
