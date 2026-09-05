// Intro / title screen for clips (owner 2026-08-31) — also the thumbnail/start image,
// so it must scroll-stop. Cinematic palace, letterbox, gold temple logo + title + tagline.
import puppeteer from "puppeteer";
import fs from "fs";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const BG = "C:/Users/nelis/memory-palace/socials-kit/clips/work/intro/palace-bg.png";
const CREAM="#FCFAF5", GOLD="#D4AF37";
const bg = "data:image/png;base64," + fs.readFileSync(BG).toString("base64");
const ICON=(c,s)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${s}" height="${s}"><g fill="${c}"><path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/><rect x="18" y="40" width="8" height="32"/><rect x="32" y="40" width="8" height="32"/><rect x="46" y="40" width="8" height="32"/><rect x="60" y="40" width="8" height="32"/><ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/><rect x="10" y="72" width="80" height="4"/><rect x="6" y="78" width="88" height="4"/><rect x="2" y="84" width="96" height="4"/></g></svg>`;
const HEAD=`<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=Marcellus&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}</style>`;
const body=`<div style="width:1080px;height:1920px;position:relative;overflow:hidden;background:#141019;">
  <img src="${bg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.62) saturate(1.05);">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,16,12,.55) 0%,rgba(20,16,12,.15) 38%,rgba(20,16,12,.72) 100%);"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:130px;background:#0c0a08;"></div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:130px;background:#0c0a08;"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
    ${ICON(GOLD,132)}
    <div style="font-family:Marcellus,serif;text-transform:uppercase;letter-spacing:.44em;padding-left:.44em;font-size:46px;color:${CREAM};margin-top:44px;text-shadow:0 4px 30px rgba(0,0,0,.7);">The Memory Palace</div>
    <div style="width:80px;height:1px;background:${GOLD};margin:34px 0;"></div>
    <div style="font-family:Fraunces,serif;font-style:italic;font-weight:300;font-size:54px;color:${CREAM};text-shadow:0 3px 26px rgba(0,0,0,.7);max-width:760px;line-height:1.3;">where a memory<br>becomes a place.</div>
  </div>
</div>`;
const b = await puppeteer.launch({ headless:true, args:["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({width:1080,height:1920,deviceScaleFactor:1});
await p.setContent(`<!doctype html><html><head>${HEAD}</head><body>${body}</body></html>`,{waitUntil:"networkidle0"});
await p.evaluateHandle("document.fonts.ready");
await new Promise(r=>setTimeout(r,250));
await p.screenshot({ path:`${SRC}/intro-screen.png`, clip:{x:0,y:0,width:1080,height:1920} });
await b.close();
console.log("wrote intro-screen.png");
