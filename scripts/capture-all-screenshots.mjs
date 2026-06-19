#!/usr/bin/env node
/**
 * Capture ALL store screenshots from the live site.
 * Uses a fresh browser profile but imports session cookies from Edge.
 *
 * Usage: node scripts/capture-all-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RAW = resolve(ROOT, 'store-assets', 'raw-v4');
if (!existsSync(RAW)) mkdirSync(RAW, { recursive: true });

const BASE = 'https://www.thememorypalace.ai';
const VP = { width: 430, height: 932, deviceScaleFactor: 2 };

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function hideOverlays(page) {
  await page.evaluate(() => {
    const selectors = [
      '[data-nudge]', '[role="dialog"]', '.cookie-banner',
      '[class*="nudge"]', '[class*="Nudge"]',
      '[class*="tooltip"]', '[class*="Tooltip"]',
      '[class*="tour"]', '[class*="Tour"]',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
    });
    document.querySelectorAll('button').forEach(b => {
      const t = b.textContent?.toLowerCase() || '';
      if (t.includes('skip') || t.includes('dismiss') || t.includes('got it') || t.includes('overslaan')) b.click();
    });
  }).catch(() => {});
}

async function capture(page, name, url, opts = {}) {
  const { waitMs = 5000, clickSequence } = opts;
  console.log(`  Capturing: ${name}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(waitMs);
  if (clickSequence) {
    for (const step of clickSequence) {
      console.log(`    Clicking: ${step.desc}...`);
      await page.evaluate((terms) => {
        const btns = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')];
        for (const term of terms) {
          const m = btns.find(b => (b.textContent||'').toLowerCase().includes(term.toLowerCase()));
          if (m) { m.click(); return; }
        }
      }, step.terms).catch(() => {});
      await sleep(step.wait || 2000);
    }
  }
  await hideOverlays(page);
  await sleep(500);
  await page.screenshot({ path: resolve(RAW, name), type: 'png' });
  console.log(`  Saved: ${name}`);
}

async function main() {
  console.log('=== Memory Palace Store Screenshot Capture ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-features=TranslateUI',
      '--disable-extensions',
      '--no-first-run',
      `--window-size=460,960`,
    ],
    protocolTimeout: 120000,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();
  await page.setViewport(VP);

  // Skip all tutorials
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('mp_nudges_skipped', 'true');
      localStorage.setItem('mp_room_tour_seen_v1', '1');
      localStorage.setItem('mp_entrance_tour_seen_v1', '1');
      localStorage.setItem('mp_palace_tour_seen_v1', '1');
      localStorage.setItem('mp_corridor_tour_seen_v1', '1');
      localStorage.setItem('mp_onboarding_walk_done', 'true');
    } catch {}
  });

  // Step 1: Login
  console.log('Opening login page...');
  console.log('Please log in in the browser window.\n');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for user to press Enter after logging in
  console.log('>>> After logging in, press ENTER here to continue <<<\n');
  await new Promise(r => {
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => r());
  });

  console.log('Continuing with captures...\n');
  await sleep(2000);

  // Navigate to app to verify login
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(4000);

  // Set tutorial skip flags after login (now on the real domain)
  await page.evaluate(() => {
    try {
      localStorage.setItem('mp_nudges_skipped', 'true');
      localStorage.setItem('mp_nudges_seen', JSON.stringify([
        'atrium_nav_modes','atrium_notifications','atrium_help_button',
        'atrium_overview','atrium_go_library',
        'explore_search','explore_tabs','explore_cards','explore_publish','explore_overview',
        'library_wing_sidebar','library_room_bar','library_search','library_tools',
        'library_overview','library_import','library_go_palace',
        'palace_subnav','palace_walk_intro','palace_click_entrance',
        'palace_entrance_info','palace_click_wing','palace_corridor_info','palace_click_room',
        'palace_room_overview','palace_room_info','palace_room_layout',
        'palace_room_upload','palace_room_memory','palace_room_share',
      ]));
      localStorage.setItem('mp_room_tour_seen_v1', '1');
      localStorage.setItem('mp_entrance_tour_seen_v1', '1');
      localStorage.setItem('mp_palace_tour_seen_v1', '1');
      localStorage.setItem('mp_corridor_tour_seen_v1', '1');
      localStorage.setItem('mp_onboarding_walk_done', 'true');
    } catch {}
  }).catch(() => {});

  // Helper
  async function safe(label, fn) {
    console.log(`\n=== ${label} ===`);
    try { await fn(); }
    catch (e) { console.log(`  FAILED: ${e.message.split('\n')[0]}`); }
  }

  // ─── 1. EXPLORE ────────────────────────────────────────────────────────
  await safe('1/8: Explore', () => capture(page, 'explore.png', `${BASE}/explore`, { waitMs: 6000 }));

  // ─── 2. KEP ────────────────────────────────────────────────────────────
  await safe('2/8: Kep', () => capture(page, 'kep.png', `${BASE}/kep`, { waitMs: 4000 }));

  // ─── 3. LIBRARY ────────────────────────────────────────────────────────
  await safe('3/8: Library', () => capture(page, 'library.png', `${BASE}/?view=library`, { waitMs: 5000 }));

  // ─── 4. FAMILY TREE ────────────────────────────────────────────────────
  await safe('4/8: Family Tree', () => capture(page, 'family-tree.png', `${BASE}/?view=library`, {
    waitMs: 5000,
    clickSequence: [
      { terms: ['roots', 'wortels'], desc: 'Roots wing', wait: 3000 },
      { terms: ['family', 'stamboom'], desc: 'Family Tree tab', wait: 3000 },
      { terms: ['fan', 'waaier'], desc: 'Fan chart', wait: 2000 },
    ],
  }));

  // ─── 5. ATRIUM/ACHIEVEMENTS ────────────────────────────────────────────
  await safe('5/8: Achievements', () => capture(page, 'achievements.png', `${BASE}/?view=atrium`, { waitMs: 5000 }));

  // ─── 6. 3D EXTERIOR ───────────────────────────────────────────────────
  await safe('6/8: 3D Exterior', async () => {
    await page.goto(`${BASE}/?view=palace`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    console.log('  Waiting for 3D to load (15s)...');
    await sleep(15000);
    await hideOverlays(page);
    // Skip cinematic
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        const t = b.textContent?.toLowerCase() || '';
        if (t.includes('skip') || t.includes('continue') || t.includes('overslaan')) b.click();
      });
    }).catch(() => {});
    await sleep(3000);
    await hideOverlays(page);
    await page.screenshot({ path: resolve(RAW, 'exterior.png'), type: 'png' });
    console.log('  Saved: exterior.png');
  });

  // ─── 7. ENTRANCE HALL ─────────────────────────────────────────────────
  await safe('7/8: Entrance Hall', async () => {
    // Click entrance
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', { clientX: r.width/2, clientY: r.height*0.6, bubbles: true }));
      }
      document.querySelectorAll('button').forEach(b => {
        const t = b.textContent?.toLowerCase() || '';
        if (t.includes('enter') || t.includes('binnentreden')) b.click();
      });
    }).catch(() => {});
    console.log('  Waiting for entrance hall (12s)...');
    await sleep(12000);
    await hideOverlays(page);
    await page.screenshot({ path: resolve(RAW, 'entrance.png'), type: 'png' });
    console.log('  Saved: entrance.png');
  });

  // ─── 8. ROOM INTERIOR ─────────────────────────────────────────────────
  await safe('8/8: Room Interior', async () => {
    // Click a door
    await page.evaluate(() => {
      document.querySelectorAll('button, [role="button"]').forEach(b => {
        const t = b.textContent?.toLowerCase() || '';
        if (t.includes('roots') || t.includes('wortels')) b.click();
      });
    }).catch(() => {});
    await sleep(6000);
    // Click a room
    await page.evaluate(() => {
      document.querySelectorAll('button, [role="button"]').forEach(b => {
        const t = b.textContent?.toLowerCase() || '';
        if (t.includes('room') || t.includes('kamer') || t.includes('me over')) b.click();
      });
    }).catch(() => {});
    await sleep(8000);
    await hideOverlays(page);
    await page.screenshot({ path: resolve(RAW, 'room.png'), type: 'png' });
    console.log('  Saved: room.png');
  });

  await browser.close();

  console.log('\n=== All screenshots captured! ===\n');
  console.log('Raw screenshots in: store-assets/raw-v4/');
  console.log('\nNow generate framed assets:');
  console.log('  node scripts/generate-store-assets-v4.mjs\n');
}

main().catch(err => { console.error(err); process.exit(1); });
