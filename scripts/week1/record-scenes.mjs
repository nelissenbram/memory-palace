// Records fresh 9:16 footage of the CURRENT palace scenes via the /flythrough
// dev recorder (owner 2026-08-26: old tour footage shows an outdated palace).
// Opens the viewer at a portrait viewport with fill=max, clicks Record, and
// collects the four per-scene webms (exterior / hall / corridor / room).
// Usage: node scripts/week1/record-scenes.mjs   (dev server on :3000 required)
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/scenes";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: false, // headed → real GPU WebGL
  args: ["--window-size=830,1560", "--force-device-scale-factor=1"],
  defaultViewport: { width: 810, height: 1440 },
});
const page = await browser.newPage();
const cdp = await page.createCDPSession();
await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: OUT.replace(/\//g, "\\") });

console.log("navigating…");
await page.goto("http://localhost:3000/flythrough?fill=max", { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
// Let the first scene assemble (veil lifts on onReady, ≤10s safety ceiling)
await new Promise((r) => setTimeout(r, 12000));

// Click the Record button
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Record"));
  if (!btn) return false;
  btn.click();
  return true;
});
if (!clicked) {
  console.error("Record button not found");
  await browser.close();
  process.exit(1);
}
console.log("recording… (~25s + scene loads)");

// Wait until all four segment webms are fully downloaded (no .crdownload)
const deadline = Date.now() + 180000;
const done = () => {
  const files = fs.readdirSync(OUT);
  const webms = files.filter((f) => /^palace-scene-\d\.webm$/.test(f));
  const partial = files.some((f) => f.endsWith(".crdownload"));
  return webms.length >= 4 && !partial;
};
while (!done() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 1000));
await new Promise((r) => setTimeout(r, 2000));
console.log("downloads:", fs.readdirSync(OUT).join(", "));
await browser.close();
