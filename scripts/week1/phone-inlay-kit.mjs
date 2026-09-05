// USP-matched phone-inlay "proof beat" (owner loved the GRAVE-05a screenshot inlay).
// Renders an iPhone frame showing a real app screenshot + a gold Fraunces USP note
// + a cream caption, on umber bg. One reusable slide per USP. 1080x1920 PNG.
// Usage: node phone-inlay-kit.mjs  (edit INLAYS below)
import puppeteer from "puppeteer";
import fs from "fs";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const SHOTS = "C:/Users/nelis/memory-palace-staging/public/landing/shots";
const CREAM = "#FCFAF5", GOLD = "#D4AF37", UMBER = "#241C15";
const b64 = (p) => { const buf = fs.readFileSync(p); const ext = p.split(".").pop(); return `data:image/${ext};base64,${buf.toString("base64")}`; };
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;}</style>`;

// [outName, screenshotFile, goldNote, creamCaption]
const INLAYS = [
  ["inlay-interview.png", "shot-5.webp", "it interviews them<br>for you", "the questions, and the answers &mdash; kept."],
  ["inlay-palace.png",    "shot-1.webp", "a place you<br>can walk", "your memories, somewhere you can visit."],
  ["inlay-room.png",      "shot-2.webp", "every door,<br>a chapter", "it fits in your pocket, too."],
];

const inlayHTML = (imgUri, note, cap) => `
<div style="width:1080px;height:1920px;background:${UMBER};position:relative;overflow:hidden;">
  <div class="claim" style="position:absolute;top:120px;right:90px;text-align:right;font-size:52px;line-height:1.2;color:${GOLD};">${note}
    <svg width="120" height="70" style="display:block;margin-left:auto;margin-top:6px;" viewBox="0 0 120 70"><path d="M10 8 C 60 8, 100 20, 100 58" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M92 46 L102 60 L110 44" fill="none" stroke="${GOLD}" stroke-width="3"/></svg>
  </div>
  <div style="position:absolute;left:50%;top:300px;transform:translateX(-50%);width:560px;height:1140px;background:#0c0a08;border-radius:66px;padding:16px;box-shadow:0 40px 90px rgba(0,0,0,.55);">
    <div style="width:100%;height:100%;border-radius:52px;overflow:hidden;position:relative;background:#000;">
      <img src="${imgUri}" style="width:100%;height:100%;object-fit:cover;">
      <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);width:150px;height:26px;background:#0c0a08;border-radius:16px;"></div>
    </div>
  </div>
  <div class="claim" style="position:absolute;left:80px;right:80px;bottom:210px;text-align:center;font-size:56px;line-height:1.3;color:${CREAM};">${cap}</div>
</div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [out, shot, note, cap] of INLAYS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body>${inlayHTML(b64(`${SHOTS}/${shot}`), note, cap)}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${SRC}/${out}`, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  console.log("inlay:", out);
}
await browser.close();
