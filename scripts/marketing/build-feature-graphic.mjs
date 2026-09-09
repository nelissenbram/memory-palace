#!/usr/bin/env node
/**
 * Build the Google Play feature graphic (1024x500).
 *
 * The previous one was broken in two visible ways: its background was
 * Screenshot_20260614_193746_Edge.jpg — a browser screenshot of the LANDING PAGE,
 * so that page's own headline ("Your memories deserve a palace, not a folder")
 * showed through beneath the overlaid tagline as a second layer of text — and the
 * right ~10% of the canvas was left white.
 *
 * Here the background is a clean exterior render (store-assets/play/_feature-bg.png,
 * from the manifest entry play-feature-bg) and the layout is checked to fill the
 * full 1024x500.
 *
 * Usage: node scripts/marketing/build-feature-graphic.mjs
 */
import puppeteer from "puppeteer";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir, stamp, GPU_ARGS, EDGE } from "./kit.mjs";

const BG = resolve(REPO, "store-assets/play/_feature-bg.png");
const OUT = resolve(REPO, "store-assets/play/feature-graphic.png");
if (!existsSync(BG)) {
  console.error(`Missing ${BG}\nRun: node scripts/marketing/render.mjs --id play-feature-bg`);
  process.exit(1);
}
const bgUri = `data:image/png;base64,${readFileSync(BG).toString("base64")}`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Source+Sans+3:wght@300;400&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;position:relative;background:#2C2C2A}
.bg{position:absolute;inset:0;background-image:url('${bgUri}');background-size:cover;background-position:center 42%}
/* Gradient reaches the RIGHT edge — the old one faded out early and left white. */
.overlay{position:absolute;inset:0;background:linear-gradient(100deg,
  rgba(30,26,22,0.95) 0%, rgba(30,26,22,0.88) 34%, rgba(30,26,22,0.55) 62%, rgba(30,26,22,0.28) 100%)}
.content{position:absolute;inset:0;display:flex;align-items:center;padding:0 0 0 58px}
.left{max-width:560px}
.logo-row{display:flex;align-items:center;gap:11px;margin-bottom:26px}
.logo-mark{width:26px;height:26px}
.logo-text{font-family:'Source Sans 3',sans-serif;font-weight:400;font-size:15px;
  letter-spacing:2.6px;text-transform:uppercase;color:#D8CBB4}
.tagline{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:57px;
  line-height:1.08;color:#FBF7F0;letter-spacing:.4px}
.tagline em{font-style:italic;color:#D9A741}
.sub{margin-top:20px;font-family:'Source Sans 3',sans-serif;font-weight:300;font-size:19px;
  line-height:1.5;color:rgba(240,232,220,.82)}
.gold-bar{position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#C8A24B,#8A6A2A)}
.corner{position:absolute;width:34px;height:34px;border-style:solid;border-color:rgba(212,175,55,.22)}
.c-tl{top:15px;left:15px;border-width:1px 0 0 1px}
.c-br{bottom:15px;right:15px;border-width:0 1px 1px 0}
</style></head><body>
  <div class="bg"></div><div class="overlay"></div>
  <div class="content"><div class="left">
    <div class="logo-row">
      <svg class="logo-mark" viewBox="0 0 24 24" fill="none" stroke="#D9A741" stroke-width="1.5">
        <path d="M3 21h18M4 21V10m16 11V10M2 10l10-6 10 6M8 21v-6h3v6m5 0v-6h-3"/>
      </svg>
      <span class="logo-text">The Memory Palace</span>
    </div>
    <div class="tagline">Your Memories<br/>Deserve a <em>Palace</em></div>
    <div class="sub">Walk through your photos, voices and life stories<br/>in a 3D villa built for generations.</div>
  </div></div>
  <div class="gold-bar"></div><div class="corner c-tl"></div><div class="corner c-br"></div>
</body></html>`;

const browser = await puppeteer.launch({
  headless: true, executablePath: EDGE, args: GPU_ARGS, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1200));   // let the webfonts settle
ensureDir(resolve(REPO, "store-assets/play"));
await page.screenshot({ path: OUT, type: "png" });
await browser.close();
stamp(OUT, { source: "play-feature-bg", size: [1024, 500] });
console.log(`-> ${OUT.replace(REPO, ".")}`);
