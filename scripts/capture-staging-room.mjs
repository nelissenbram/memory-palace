#!/usr/bin/env node
/**
 * Capture the /staging/room dev viewer to a PNG for fireplace/realism review.
 * Headful Edge (like capture-all-screenshots.mjs) so WebGL + rAF actually run
 * — the automated/background Chrome extension pauses requestAnimationFrame and
 * yields a black canvas, which is why this standalone headful capture exists.
 *
 * Usage:
 *   node scripts/capture-staging-room.mjs [outName] [query] [wait_ms] [w] [h] [dsf]
 * Examples:
 *   node scripts/capture-staging-room.mjs before.png ""            12000 900 1400 2
 *   node scripts/capture-staging-room.mjs empty.png  "empty=1&z=3" 12000 900 1400 2
 */
import puppeteer from 'puppeteer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'store-assets', 'fireplace-review');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const [, , outName = 'staging-room.png', query = '', waitMsRaw = '12000', wRaw = '900', hRaw = '1400', dsfRaw = '2'] = process.argv;
const waitMs = Number(waitMsRaw), W = Number(wRaw), H = Number(hRaw), DSF = Number(dsfRaw);
const PORT = process.env.PORT || '3001';
const URL = `http://localhost:${PORT}/staging/room${query ? `?${query}` : ''}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Capturing ${URL} -> ${outName} (${W}x${H}@${DSF}, wait ${waitMs}ms)`);
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions', '--no-first-run',
      '--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl',
      `--window-size=${W + 40},${H + 120}`],
    protocolTimeout: 120000,
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  console.log(`  waiting ${waitMs}ms for the 3D scene to build...`);
  await sleep(waitMs);
  // Hide ONLY the dev control panel (by id) so it doesn't cover the fireplace.
  // (Matching on text would also match the outer container and blank the scene.)
  await page.evaluate(() => {
    const p = document.getElementById('staging-dev-panel');
    if (p) p.style.setProperty('display', 'none', 'important');
    // Hide the global cookie-consent banner / any fixed overlay chrome.
    for (const el of document.querySelectorAll('div,section,aside')) {
      const t = (el.textContent || '');
      if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400 && getComputedStyle(el).position === 'fixed') {
        el.style.setProperty('display', 'none', 'important');
      }
    }
  }).catch(() => {});
  await sleep(400);
  const path = resolve(OUT, outName);
  await page.screenshot({ path, type: 'png' });
  console.log(`  saved: ${path}`);
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
