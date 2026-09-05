// Captions for the "bring-to-life" motion piece (our disclosure-safe answer to
// MyHeritage LiveMemory: the photo doesn't animate — the living palace does).
import puppeteer from "puppeteer";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5";
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;}</style>`;
const caption = (html, size = 62) => `<div style="width:1080px;height:1920px;position:relative;"><div style="position:absolute;left:80px;right:80px;bottom:300px;display:flex;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.6);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.7);">${html}</div></div></div>`;
const CAPS = [
  ["bl-cap1.png", "Bring it to&nbsp;life."],
  ["bl-cap2.png", "Not by making it&nbsp;move."],
  ["bl-cap3.png", "But by giving it a&nbsp;place &mdash;"],
  ["bl-cap4.png", "named, hung, and&nbsp;visited."],
];
const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, html] of CAPS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><html><head>${HEAD}</head><body style="background:transparent;">${caption(html)}</body></html>`, { waitUntil: "networkidle0" });
  await p.evaluateHandle("document.fonts.ready");
  await new Promise((r)=>setTimeout(r,200));
  await p.screenshot({ path: `${SRC}/${name}`, omitBackground: true, clip: { x:0, y:0, width:1080, height:1920 } });
  await p.close();
  console.log("cap:", name);
}
await b.close();
