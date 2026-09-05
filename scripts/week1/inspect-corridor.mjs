// Inspect what the standalone corridor scene exposes (camera/renderer/debug hooks)
// so we can frame-step a dolly (throttle-proof genuine motion).
import puppeteer from "puppeteer";
const cp = "cp1=" + encodeURIComponent("/demo/personas/giovanni-del-mare/roots-r0-m1.jpg|Mending Nets");
const b = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle","--use-angle=d3d11","--enable-gpu","--ignore-gpu-blocklist","--no-sandbox","--disable-features=CalculateNativeWinOcclusion"] });
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await p.goto(`http://localhost:3000/flythrough?scene=corridor&${cp}`, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r=>setTimeout(r, 12000));
const info = await p.evaluate(() => {
  const keys = Object.keys(window).filter(k => /mp|dbg|three|scene|corr|cam|render|__/i.test(k));
  const canvases = [...document.querySelectorAll("canvas")].map(c=>({w:c.width,h:c.height}));
  let dbg = null;
  try { dbg = window.__mpDbg ? Object.keys(window.__mpDbg) : null; } catch {}
  // probe for a THREE renderer on any canvas
  return JSON.stringify({ keys, canvases, dbg, hasThree: typeof window.THREE !== "undefined" });
});
console.log(info);
await b.close();
