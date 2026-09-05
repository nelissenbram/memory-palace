// Localization Multiplier — regenerate a clip's hook + caption cards per language
// from autonomy/i18n/clip-strings.json. Proof: GRAVE-04a in nl/de/es/fr.
// Output: socials-kit/clips/src/ as g04-hook-<lang>.png + g04-cap-plaque-<lang>.png
import puppeteer from "puppeteer";
import fs from "fs";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const S = JSON.parse(fs.readFileSync("C:/Users/nelis/memory-palace/socials-kit/autonomy/i18n/clip-strings.json", "utf8"));
const CREAM="#FCFAF5", INK="#1B1613";
const HEAD=`<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;}</style>`;
const hook=(html,size)=>`<div style="width:1080px;height:1920px;background:${INK};display:flex;align-items:center;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.28;color:${CREAM};text-align:center;max-width:900px;">${html}</div></div>`;
const caption=(html,size=60)=>`<div style="width:1080px;height:1920px;position:relative;"><div style="position:absolute;left:80px;right:80px;bottom:330px;display:flex;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div></div></div>`;
const b = await puppeteer.launch({ headless:true, args:["--no-sandbox"] });
async function still(name, body){ const p=await b.newPage(); await p.setViewport({width:1080,height:1920,deviceScaleFactor:1}); await p.setContent(`<!doctype html><html><head>${HEAD}</head><body style="background:transparent;">${body}</body></html>`,{waitUntil:"networkidle0"}); await p.evaluateHandle("document.fonts.ready"); await new Promise(r=>setTimeout(r,200)); const transparent=name.includes("cap"); await p.screenshot({path:`${SRC}/${name}`,omitBackground:transparent,clip:{x:0,y:0,width:1080,height:1920}}); await p.close(); console.log(name); }
for (const lang of ["nl","de","es","fr"]) {
  const hk = S.g04_hook[lang]; const cp = S.g04_cap[lang];
  const hsize = hk.length > 34 ? 66 : 80;
  await still(`g04-hook-${lang}.png`, hook(hk, hsize));
  await still(`g04-cap-plaque-${lang}.png`, caption(cp));
}
await b.close();
