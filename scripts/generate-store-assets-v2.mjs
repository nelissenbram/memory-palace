#!/usr/bin/env node
/**
 * Generate Google Play Store visual assets v2 — Real app screenshots + premium design.
 *
 * 1. Logs into thememorypalace.ai as the reviewer account
 * 2. Takes real screenshots at mobile viewport of key screens
 * 3. Generates a premium app icon with depth & gradients
 * 4. Wraps screenshots in elegant store listing frames
 * 5. Creates a cinematic feature graphic
 */

import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'store-assets');
const RAW = resolve(OUT, 'raw');

if (!existsSync(RAW)) mkdirSync(RAW, { recursive: true });

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const MOBILE_W = 390;
const MOBILE_H = 844;
const DPR = 2; // retina — gives us 780×1688 raw screenshots

const LOGIN_EMAIL = 'review@thememorypalace.ai';
const LOGIN_PASS = 'ReviewAccess2026';
const BASE_URL = 'https://thememorypalace.ai';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForCanvasRender(page, timeout = 20000) {
  // Wait for Three.js canvas to appear and have content
  try {
    await page.waitForSelector('canvas', { timeout });
    // Give the 3D scene time to render fully
    await sleep(5000);
  } catch {
    console.log('    (no canvas found, continuing)');
    await sleep(2000);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--ignore-gpu-blocklist',
    ],
  });

  // ─── STEP 1: Login and capture real app screenshots ─────────────────────

  console.log('\n=== STEP 1: Capturing real app screenshots ===\n');

  const page = await browser.newPage();
  await page.setViewport({ width: MOBILE_W, height: MOBILE_H, deviceScaleFactor: DPR });

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // Type credentials
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passInput = await page.$('input[type="password"], input[name="password"]');

  if (emailInput && passInput) {
    await emailInput.type(LOGIN_EMAIL, { delay: 30 });
    await passInput.type(LOGIN_PASS, { delay: 30 });

    // Find and click login/submit button
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }

    console.log('Waiting for redirect to palace...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(3000);
  } else {
    console.log('Could not find login fields, trying direct navigation...');
  }

  // Helper to capture a page with error handling
  async function capturePage(name, url, useAuthPage = true, waitExtra = 3000) {
    console.log(`Capturing ${name}...`);
    try {
      const p = useAuthPage ? page : await browser.newPage();
      if (!useAuthPage) await p.setViewport({ width: MOBILE_W, height: MOBILE_H, deviceScaleFactor: DPR });
      await p.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {});
      await waitForCanvasRender(p);
      await sleep(waitExtra);
      await p.screenshot({ path: resolve(RAW, `raw-${name}.png`) });
      if (!useAuthPage) await p.close();
      console.log(`  ✓ raw-${name}.png`);
      return true;
    } catch (err) {
      console.log(`  ✗ ${name} failed: ${err.message}`);
      return false;
    }
  }

  // Capture all screens
  await capturePage('palace', `${BASE_URL}/palace`, true, 6000);
  await capturePage('family-wing', `${BASE_URL}/palace/family`, true);
  await capturePage('room', `${BASE_URL}/palace/family/0`, true);
  await capturePage('travel-wing', `${BASE_URL}/palace/travel`, true);

  // Login page — use a fresh incognito context
  console.log('Capturing login page...');
  try {
    const ctx1 = await browser.createBrowserContext();
    const lp = await ctx1.newPage();
    await lp.setViewport({ width: MOBILE_W, height: MOBILE_H, deviceScaleFactor: DPR });
    await lp.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {});
    await sleep(3000);
    await lp.screenshot({ path: resolve(RAW, 'raw-login.png') });
    await lp.close(); await ctx1.close();
    console.log('  ✓ raw-login.png');
  } catch (err) { console.log(`  ✗ login failed: ${err.message}`); }

  // Landing page — fresh incognito context
  console.log('Capturing landing page...');
  try {
    const ctx2 = await browser.createBrowserContext();
    const lnd = await ctx2.newPage();
    await lnd.setViewport({ width: MOBILE_W, height: MOBILE_H, deviceScaleFactor: DPR });
    await lnd.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {});
    await sleep(4000);
    await lnd.screenshot({ path: resolve(RAW, 'raw-landing.png') });
    await lnd.close(); await ctx2.close();
    console.log('  ✓ raw-landing.png');
  } catch (err) { console.log(`  ✗ landing failed: ${err.message}`); }

  await page.close();

  // ─── STEP 2: Generate premium app icon ──────────────────────────────────

  console.log('\n=== STEP 2: Generating premium app icon ===\n');

  const palaceSvg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf-8');
  // Modify SVG to use white fill for the icon
  const whitePalaceSvg = palaceSvg.replace(/#C17F59/g, '#FFFFFF');
  const whiteSvgUri = `data:image/svg+xml;base64,${Buffer.from(whitePalaceSvg).toString('base64')}`;

  const iconHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 512px; height: 512px; overflow: hidden; }
.icon {
  width: 512px; height: 512px;
  background: linear-gradient(145deg, #D4895F 0%, #C17F59 30%, #A86B48 60%, #8B5A3A 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  position: relative;
  border-radius: 112px;
  overflow: hidden;
}
/* Warm light overlay from top-left */
.icon::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(255,220,180,0.35) 0%, transparent 60%);
}
/* Subtle inner shadow for depth */
.icon::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: 112px;
  box-shadow: inset 0 -8px 30px rgba(80,40,20,0.3), inset 0 4px 20px rgba(255,220,180,0.15);
}
.palace-img {
  width: 260px; height: 260px;
  position: relative; z-index: 1;
  filter: drop-shadow(0 6px 20px rgba(80,40,20,0.4));
  margin-bottom: 8px;
  margin-top: -16px;
}
/* Subtle golden glow behind palace */
.glow {
  position: absolute;
  width: 300px; height: 300px;
  top: 50%; left: 50%;
  transform: translate(-50%, -55%);
  background: radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%);
  border-radius: 50%;
}
</style></head><body>
<div class="icon">
  <div class="glow"></div>
  <img class="palace-img" src="${whiteSvgUri}" />
</div>
</body></html>`;

  const iconPage = await browser.newPage();
  await iconPage.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await iconPage.setContent(iconHtml, { waitUntil: 'networkidle0' });
  await iconPage.screenshot({ path: resolve(RAW, 'raw-icon.png'), fullPage: false });
  await iconPage.close();

  // Optimize icon
  await sharp(resolve(RAW, 'raw-icon.png'))
    .png({ compressionLevel: 6 })
    .toFile(resolve(OUT, 'icon-512x512.png'));
  console.log('  ✓ icon-512x512.png');

  // ─── STEP 3: Wrap screenshots in premium frames ────────────────────────

  console.log('\n=== STEP 3: Creating framed screenshots ===\n');

  const screenshotConfigs = [
    {
      name: 'screenshot-1-palace',
      rawFile: 'raw-palace.png',
      title: 'Your Personal<br/><em>Memory Palace</em>',
      subtitle: 'Walk through a stunning 3D space where every memory has its place',
    },
    {
      name: 'screenshot-2-wings',
      rawFile: 'raw-family-wing.png',
      title: 'Five Wings for<br/><em>Every Chapter</em>',
      subtitle: 'Family \u00b7 Travel \u00b7 Childhood \u00b7 Career \u00b7 Creativity',
    },
    {
      name: 'screenshot-3-room',
      rawFile: 'raw-room.png',
      title: 'Memories Come<br/><em>Alive</em>',
      subtitle: 'Photos, videos, stories \u2014 displayed as paintings, albums, and glowing orbs',
    },
    {
      name: 'screenshot-4-travel',
      rawFile: 'raw-travel-wing.png',
      title: 'Explore Your<br/><em>Journey</em>',
      subtitle: 'Each wing tells a different story from your life',
    },
    {
      name: 'screenshot-5-landing',
      rawFile: 'raw-landing.png',
      title: 'Beautiful<br/><em>Design</em>',
      subtitle: 'Crafted with care for people who treasure their memories',
    },
    {
      name: 'screenshot-6-login',
      rawFile: 'raw-login.png',
      title: 'Safe &<br/><em>Secure</em>',
      subtitle: 'EU-hosted, encrypted, GDPR compliant \u2014 your memories stay private',
    },
  ];

  for (const cfg of screenshotConfigs) {
    console.log(`Generating ${cfg.name}...`);

    const rawPath = resolve(RAW, cfg.rawFile);
    const rawBuf = readFileSync(rawPath);
    const rawUri = `data:image/png;base64,${rawBuf.toString('base64')}`;

    // 1080×1920 portrait screenshot with app preview taking 65% of space
    const frameHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1080px; height: 1920px;
  background: linear-gradient(175deg, #FAFAF7 0%, #F2EDE7 40%, #EDE5DB 100%);
  display: flex; flex-direction: column;
  align-items: center;
  position: relative; overflow: hidden;
}
/* Warm light effect top corner */
.light {
  position: absolute; top: -100px; right: -100px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%);
  border-radius: 50%;
}
/* Text section — compact at top */
.text-section {
  padding: 80px 60px 40px;
  text-align: center;
  position: relative; z-index: 1;
}
.title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 58px; font-weight: 600;
  color: #2C2C2A;
  line-height: 1.15;
  margin-bottom: 16px;
}
.title em {
  color: #C17F59; font-style: italic;
}
.subtitle {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 24px; font-weight: 400;
  color: #8B7355;
  line-height: 1.4;
}
/* Gold accent line */
.gold-line {
  width: 60px; height: 3px;
  background: linear-gradient(90deg, #D4AF37, #C9A84C);
  border-radius: 2px;
  margin: 24px auto 0;
}
/* Phone mockup — the star of the show */
.phone-wrapper {
  flex: 1;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 30px 50px 0;
  position: relative; z-index: 1;
}
.phone {
  width: 840px; height: 1300px;
  border-radius: 44px;
  overflow: hidden;
  background: #000;
  box-shadow:
    0 4px 8px rgba(0,0,0,0.08),
    0 16px 40px rgba(0,0,0,0.12),
    0 40px 80px rgba(139,115,85,0.15);
  border: 10px solid #1a1a1a;
  position: relative;
}
.phone img {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: top center;
}
/* Notch */
.notch {
  position: absolute; top: 0; left: 50%;
  transform: translateX(-50%);
  width: 180px; height: 34px;
  background: #1a1a1a;
  border-radius: 0 0 20px 20px;
  z-index: 2;
}
</style></head><body>
  <div class="light"></div>
  <div class="text-section">
    <div class="title">${cfg.title}</div>
    <div class="subtitle">${cfg.subtitle}</div>
    <div class="gold-line"></div>
  </div>
  <div class="phone-wrapper">
    <div class="phone">
      <div class="notch"></div>
      <img src="${rawUri}" />
    </div>
  </div>
</body></html>`;

    const framePage = await browser.newPage();
    await framePage.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await framePage.setContent(frameHtml, { waitUntil: 'networkidle0' });
    await framePage.screenshot({ path: resolve(OUT, `${cfg.name}.png`), fullPage: false });
    await framePage.close();
    console.log(`  ✓ ${cfg.name}.png`);
  }

  // ─── STEP 4: Feature graphic ───────────────────────────────────────────

  console.log('\n=== STEP 4: Creating feature graphic ===\n');

  // Use the palace entrance screenshot as background
  const palaceRaw = readFileSync(resolve(RAW, 'raw-palace.png'));
  const palaceUri = `data:image/png;base64,${palaceRaw.toString('base64')}`;
  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(whitePalaceSvg).toString('base64')}`;

  const featureHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:wght@300;400&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1024px; height: 500px; overflow: hidden; position: relative; }
.bg {
  position: absolute; inset: 0;
  background-image: url('${palaceUri}');
  background-size: cover;
  background-position: center 30%;
  filter: brightness(0.4) saturate(0.8);
}
/* Warm gradient overlay */
.overlay {
  position: absolute; inset: 0;
  background: linear-gradient(135deg,
    rgba(44,44,42,0.85) 0%,
    rgba(60,48,38,0.7) 40%,
    rgba(80,56,36,0.5) 70%,
    rgba(193,127,89,0.3) 100%
  );
}
/* Content */
.content {
  position: absolute; inset: 0;
  display: flex; align-items: center;
  padding: 0 70px;
}
.left {
  flex: 1;
}
.logo-row {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px;
}
.logo-img { width: 36px; height: 36px; opacity: 0.9; }
.logo-text {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 18px; font-weight: 600;
  color: #D4AF37;
  letter-spacing: 3px;
  text-transform: uppercase;
}
.tagline {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 52px; font-weight: 600;
  color: #FAFAF7;
  line-height: 1.1;
  margin-bottom: 14px;
}
.tagline em { color: #D4AF37; font-style: italic; }
.sub {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 18px; font-weight: 300;
  color: rgba(212,197,178,0.9);
  line-height: 1.5;
}
/* Phone preview on right side */
.right {
  flex: 0 0 300px;
  display: flex; justify-content: center; align-items: center;
}
.mini-phone {
  width: 220px; height: 440px;
  border-radius: 24px;
  overflow: hidden;
  border: 5px solid rgba(255,255,255,0.15);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  position: relative;
}
.mini-phone img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: top;
}
/* Gold line at bottom */
.gold-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #D4AF37, transparent);
}
/* Corner accents */
.corner { position: absolute; width: 40px; height: 40px; border-style: solid; border-color: rgba(212,175,55,0.2); }
.c-tl { top: 16px; left: 16px; border-width: 1px 0 0 1px; }
.c-br { bottom: 16px; right: 16px; border-width: 0 1px 1px 0; }
</style></head><body>
  <div class="bg"></div>
  <div class="overlay"></div>
  <div class="content">
    <div class="left">
      <div class="logo-row">
        <img class="logo-img" src="${svgDataUri}" />
        <span class="logo-text">The Memory Palace</span>
      </div>
      <div class="tagline">Your Memories<br/>Deserve a <em>Palace</em></div>
      <div class="sub">Preserve your life stories in a beautiful<br/>3D virtual villa \u2014 for generations to come</div>
    </div>
    <div class="right">
      <div class="mini-phone">
        <img src="${palaceUri}" />
      </div>
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="corner c-tl"></div>
  <div class="corner c-br"></div>
</body></html>`;

  const featurePage = await browser.newPage();
  await featurePage.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await featurePage.setContent(featureHtml, { waitUntil: 'networkidle0' });
  await featurePage.screenshot({ path: resolve(OUT, 'feature-graphic.png'), fullPage: false });
  await featurePage.close();
  console.log('  ✓ feature-graphic.png');

  await browser.close();

  console.log('\n✅ All v2 store assets generated in store-assets/');
  console.log('   - icon-512x512.png');
  console.log('   - feature-graphic.png (1024×500)');
  screenshotConfigs.forEach(c => console.log(`   - ${c.name}.png (1080×1920)`));
  console.log('\n   Raw app screenshots saved in store-assets/raw/ for reference');
}

main().catch(err => { console.error(err); process.exit(1); });
