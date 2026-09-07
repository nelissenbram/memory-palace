#!/usr/bin/env node
/**
 * Build a numbered contact sheet from a list of images, for owner review.
 *
 * The 1-by-1 review of phases 1-2 caught 4 bad assets out of 12, so it earns its
 * keep — but paging through dozens of separate files is slow for everyone. This
 * lays them out with their index and filename so we can talk about "number 7"
 * and only open the ones that need a closer look.
 *
 * Usage:
 *   node scripts/marketing/contact-sheet.mjs <out.png> <title> <file...>
 */
import puppeteer from "puppeteer";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname, resolve, dirname } from "node:path";
import { ensureDir, GPU_ARGS, EDGE, REPO } from "./kit.mjs";

const [, , out, title, ...files] = process.argv;
if (!out || !files.length) { console.error("usage: contact-sheet.mjs <out.png> <title> <file...>"); process.exit(1); }

const mime = (f) => (extname(f).toLowerCase() === ".jpg" ? "image/jpeg" : "image/png");
const cards = files.filter((f) => existsSync(f)).map((f, i) => {
  const b64 = readFileSync(f).toString("base64");
  return `<figure><div class="n">${i + 1}</div><img src="data:${mime(f)};base64,${b64}"><figcaption>${basename(f)}</figcaption></figure>`;
});

const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:22px;background:#141210;color:#EAE2D4;font:13px system-ui,sans-serif}
  h1{font-size:17px;margin:0 0 16px;color:#C8A868;letter-spacing:.4px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  figure{margin:0;background:#1e1b18;border:1px solid #332d26;border-radius:9px;overflow:hidden;position:relative}
  img{display:block;width:100%;height:250px;object-fit:contain;background:#0c0b0a}
  figcaption{padding:6px 8px;font-size:11px;color:#9c9184;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .n{position:absolute;top:6px;left:6px;z-index:2;background:#C8A868;color:#1a1712;font-weight:700;
     width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px}
</style><h1>${title} — ${cards.length} items</h1><div class="grid">${cards.join("")}</div>`;

const browser = await puppeteer.launch({
  headless: true, executablePath: EDGE, args: GPU_ARGS, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 900, deviceScaleFactor: 1.4 });
await page.setContent(html, { waitUntil: "load" });
const target = resolve(REPO, out);
ensureDir(dirname(target));
await page.screenshot({ path: target, fullPage: true });
await browser.close();
console.log(`${cards.length} items -> ${target}`);
