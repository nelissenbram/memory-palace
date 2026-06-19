#!/usr/bin/env node
/**
 * Capture 2D page screenshots from the live site for store assets.
 *
 * Usage:
 *   1. Log in to thememorypalace.ai in Edge
 *   2. Open DevTools > Application > Cookies
 *   3. Copy the value of "sb-xxxxxx-auth-token" cookie
 *   4. Run: node scripts/capture-2d-screenshots.mjs "COOKIE_VALUE"
 *
 *   Or just run without args to capture public pages only:
 *   node scripts/capture-2d-screenshots.mjs
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

// Phone viewport at 2x for crisp screenshots
const VP = { width: 430, height: 932, deviceScaleFactor: 2 };

async function capture(page, name, url, waitMs = 4000) {
  console.log(`  Capturing: ${name}...`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, waitMs));

  // Hide overlays (nudges, dialogs, cookie banners)
  await page.evaluate(() => {
    // Hide nudge tooltips and dialogs
    document.querySelectorAll('[data-nudge], [role="dialog"], .cookie-banner').forEach(el => {
      el.style.display = 'none';
    });
    // Hide any fixed/absolute positioned overlays that look like tutorials
    document.querySelectorAll('[class*="nudge"], [class*="Nudge"], [class*="tooltip"], [class*="Tooltip"]').forEach(el => {
      el.style.display = 'none';
    });
    // Also try clicking "Skip tutorial" if visible
    const skipBtns = [...document.querySelectorAll('button')];
    const skip = skipBtns.find(b => b.textContent?.toLowerCase().includes('skip'));
    if (skip) skip.click();
  }).catch(() => {});

  await page.screenshot({ path: resolve(RAW, name), type: 'png' });
  console.log(`  Saved: ${name}`);
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 60000,
  });

  const page = await browser.newPage();
  await page.setViewport(VP);

  // Set auth cookie if provided
  const cookieValue = process.argv[2];
  if (cookieValue) {
    console.log('Setting auth cookie...');
    // Supabase uses multiple cookie chunks
    const cookies = cookieValue.split(';').map((c, i) => {
      const [name, ...val] = c.trim().split('=');
      return {
        name: name.trim(),
        value: val.join('=').trim(),
        domain: '.thememorypalace.ai',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      };
    }).filter(c => c.name && c.value);

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }
  }

  // ─── Public pages (no login needed) ───────────────────────────────────

  console.log('\n=== Capturing public pages ===\n');

  await capture(page, 'kep.png', `${BASE}/kep`, 3000);
  await capture(page, 'explore.png', `${BASE}/explore`, 5000);

  // ─── Authenticated pages ──────────────────────────────────────────────

  if (cookieValue) {
    console.log('\n=== Capturing authenticated pages ===\n');

    // Navigate to app first to establish session
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !window.location.pathname.includes('/login');
    });

    if (isLoggedIn) {
      await capture(page, 'library.png', `${BASE}/?view=library`, 5000);
      await capture(page, 'achievements.png', `${BASE}/?view=atrium`, 5000);

      // Family tree - need to navigate within the app
      console.log('  Navigating to family tree...');
      await page.goto(`${BASE}/?view=library`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));

      // Click Roots wing
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, a, [role="tab"]')];
        const roots = btns.find(b => {
          const t = b.textContent?.toLowerCase() || '';
          return t.includes('roots') || t.includes('wortels') || t.includes('wurzeln');
        });
        if (roots) roots.click();
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      // Click Family Tree tab
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, a, [role="tab"]')];
        const tree = btns.find(b => {
          const t = b.textContent?.toLowerCase() || '';
          return t.includes('family') || t.includes('stamboom') || t.includes('stammbaum');
        });
        if (tree) tree.click();
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      // Try fan chart
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const fan = btns.find(b => {
          const t = b.textContent?.toLowerCase() || '';
          return t.includes('fan') || t.includes('waaier') || t.includes('facher');
        });
        if (fan) fan.click();
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      await page.evaluate(() => {
        document.querySelectorAll('[data-nudge], [role="dialog"]').forEach(el => {
          el.style.display = 'none';
        });
      }).catch(() => {});

      await page.screenshot({ path: resolve(RAW, 'family-tree.png'), type: 'png' });
      console.log('  Saved: family-tree.png');
    } else {
      console.log('  Not logged in — skipping authenticated pages.');
      console.log('  Provide auth cookie as argument to capture these.');
    }
  } else {
    console.log('\nSkipping authenticated pages (no cookie provided).');
    console.log('To capture all pages, provide your auth cookie:');
    console.log('  node scripts/capture-2d-screenshots.mjs "cookie_name=value;..."');
  }

  await browser.close();

  console.log('\n=== Done ===\n');
  console.log('Captured screenshots saved to: store-assets/raw-v4/\n');
  console.log('You still need to manually capture these 3D scenes:');
  console.log('  - exterior.png    (3D palace exterior, golden hour)');
  console.log('  - entrance.png    (entrance hall, columns and doors)');
  console.log('  - room.png        (populated room with 4+ memories)');
  console.log('\nThen run: node scripts/generate-store-assets-v4.mjs');
}

main().catch(err => { console.error(err); process.exit(1); });
