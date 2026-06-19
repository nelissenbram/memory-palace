#!/usr/bin/env node
/**
 * Generate Store Assets v4 — New 8-screenshot sequence with multi-size output.
 *
 * Usage:
 *   1. Place raw screenshots in store-assets/raw-v4/ (see STORE_VISUALS_GUIDE.md)
 *   2. Run: node scripts/generate-store-assets-v4.mjs
 *
 * Outputs per screenshot:
 *   - Phone:    1080x1920 (Google Play)
 *   - 7-inch:   1200x1920 (Google Play tablet)
 *   - 10-inch:  1600x2560 (Google Play tablet)
 *   - iOS 6.7": 1290x2796 (App Store iPhone)
 *   - iPad 13": 2064x2752 (App Store iPad)
 */

import puppeteer from 'puppeteer';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'store-assets');
const RAW = resolve(OUT, 'raw-v4');
const IOS_OUT = resolve(OUT, 'ios');

// Ensure output dirs
for (const d of [OUT, IOS_OUT]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function imgToUri(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`  WARNING: Missing raw screenshot: ${filePath}`);
    // Return a placeholder gradient
    return 'data:image/svg+xml;base64,' + Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#D6CCBA"/>
          <stop offset="100%" stop-color="#C17F59"/>
        </linearGradient></defs>
        <rect fill="url(#g)" width="1080" height="1920"/>
        <text x="540" y="960" text-anchor="middle" fill="#fff" font-size="48" font-family="sans-serif">
          PLACEHOLDER — capture raw screenshot
        </text>
      </svg>`
    ).toString('base64');
  }
  const ext = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${ext};base64,${readFileSync(filePath).toString('base64')}`;
}

// SVG logo
const palaceSvg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf-8');
const whiteSvg = palaceSvg.replace(/#C17F59/g, '#FFFFFF');
const whiteSvgUri = `data:image/svg+xml;base64,${Buffer.from(whiteSvg).toString('base64')}`;
const terraSvgUri = `data:image/svg+xml;base64,${Buffer.from(palaceSvg).toString('base64')}`;

// ─── Source images ──────────────────────────────────────────────────────────

// Try raw-v4 first, fall back to raw/ for any existing screenshots
function rawImg(name) {
  const v4 = resolve(RAW, name);
  if (existsSync(v4)) return imgToUri(v4);
  const legacy = resolve(OUT, 'raw', name);
  if (existsSync(legacy)) return imgToUri(legacy);
  return imgToUri(v4); // will show placeholder warning
}

// ─── Phone frame template ───────────────────────────────────────────────────

function makeScreenshotHtml({ title, subtitle, imgUri, accentColor = '#C17F59', bgStyle = 'light', w = 1080, h = 1920 }) {
  const isDark = bgStyle === 'dark';
  const bgGradient = isDark
    ? 'linear-gradient(175deg, #2C2C2A 0%, #3D3530 40%, #4A3828 100%)'
    : 'linear-gradient(175deg, #FAFAF7 0%, #F2EDE7 40%, #EDE5DB 100%)';
  const titleColor = isDark ? '#FAFAF7' : '#2C2C2A';
  const subColor = isDark ? '#D4C5B2' : '#8B7355';
  const logoSrc = isDark ? whiteSvgUri : terraSvgUri;
  const phoneBorder = isDark ? '#333' : '#1a1a1a';
  const phoneShadow = isDark
    ? '0 16px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)'
    : '0 4px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.1), 0 40px 80px rgba(139,115,85,0.12)';

  // Scale all dimensions relative to base 1080x1920
  const s = w / 1080;
  const titleSize = Math.round(54 * s);
  const subSize = Math.round(22 * s);
  const logoSize = Math.round(44 * s);
  const padTop = Math.round(72 * s);
  const padSide = Math.round(64 * s);
  const phoneW = Math.round(880 * s);
  const phoneH = Math.round(1260 * s);
  const phoneR = Math.round(40 * s);
  const phoneBW = Math.round(8 * s);
  const notchW = Math.round(160 * s);
  const notchH = Math.round(30 * s);
  const notchR = Math.round(18 * s);
  const goldW = Math.round(56 * s);
  const goldH = Math.round(2.5 * s);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: ${w}px; height: ${h}px;
  background: ${bgGradient};
  display: flex; flex-direction: column;
  align-items: center;
  position: relative; overflow: hidden;
}
.glow {
  position: absolute; top: ${-80*s}px; right: ${-80*s}px;
  width: ${450*s}px; height: ${450*s}px;
  background: radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%);
  border-radius: 50%;
}
.text-section {
  padding: ${padTop}px ${padSide}px ${32*s}px;
  text-align: center;
  position: relative; z-index: 1;
  flex-shrink: 0;
}
.logo { width: ${logoSize}px; height: ${logoSize}px; margin-bottom: ${20*s}px; }
.title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: ${titleSize}px; font-weight: 600;
  color: ${titleColor};
  line-height: 1.15;
  margin-bottom: ${16*s}px;
}
.title em { color: ${accentColor}; font-style: italic; }
.sub {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: ${subSize}px; font-weight: 400;
  color: ${subColor};
  line-height: 1.45;
}
.gold-line {
  width: ${goldW}px; height: ${goldH}px;
  background: linear-gradient(90deg, ${accentColor}, ${accentColor}88);
  border-radius: 2px;
  margin: ${22*s}px auto 0;
}
.phone-wrapper {
  flex: 1;
  display: flex; align-items: flex-start; justify-content: center;
  padding: ${28*s}px ${44*s}px 0;
  position: relative; z-index: 1;
  min-height: 0;
}
.phone {
  width: ${phoneW}px; height: ${phoneH}px;
  border-radius: ${phoneR}px;
  overflow: hidden;
  background: #000;
  box-shadow: ${phoneShadow};
  border: ${phoneBW}px solid ${phoneBorder};
  position: relative;
  flex-shrink: 0;
}
.phone img {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center top;
}
.notch {
  position: absolute; top: 0; left: 50%;
  transform: translateX(-50%);
  width: ${notchW}px; height: ${notchH}px;
  background: ${phoneBorder};
  border-radius: 0 0 ${notchR}px ${notchR}px;
  z-index: 2;
}
</style></head><body>
  <div class="glow"></div>
  <div class="text-section">
    <img class="logo" src="${logoSrc}" />
    <div class="title">${title}</div>
    <div class="sub">${subtitle}</div>
    <div class="gold-line"></div>
  </div>
  <div class="phone-wrapper">
    <div class="phone">
      <div class="notch"></div>
      <img src="${imgUri}" />
    </div>
  </div>
</body></html>`;
}

// ─── Screenshot configs (new v4 sequence) ───────────────────────────────────

const screenshots = [
  {
    name: 'screenshot-1-exterior',
    title: 'Your Personal<br/><em>Memory Palace</em>',
    subtitle: 'A stunning 3D villa where your memories come alive',
    rawFile: 'exterior.png',
    accentColor: '#C17F59',
  },
  {
    name: 'screenshot-2-entrance',
    title: 'Step Inside<br/>Your <em>Story</em>',
    subtitle: '5 themed wings for every chapter of your life',
    rawFile: 'entrance.png',
    accentColor: '#D4AF37',
  },
  {
    name: 'screenshot-3-room',
    title: 'Every Memory Has<br/>Its <em>Place</em>',
    subtitle: 'Photos, videos, voice notes, documents \u2014 beautifully displayed',
    rawFile: 'room.png',
    accentColor: '#C17F59',
  },
  {
    name: 'screenshot-4-family-tree',
    title: 'See Where You<br/>Come <em>From</em>',
    subtitle: 'Interactive family tree connecting generations',
    rawFile: 'family-tree.png',
    accentColor: '#D4AF37',
  },
  {
    name: 'screenshot-5-kep',
    title: 'Capture Memories<br/><em>Effortlessly</em>',
    subtitle: 'Send photos via WhatsApp \u2014 they appear in your palace',
    rawFile: 'kep.png',
    accentColor: '#C17F59',
  },
  {
    name: 'screenshot-6-explore',
    title: 'Visit & Share<br/><em>Palaces</em>',
    subtitle: 'Discover stories from people around the world',
    rawFile: 'explore.png',
    accentColor: '#D4AF37',
  },
  {
    name: 'screenshot-7-library',
    title: 'Organize by<br/>Life\u2019s <em>Chapters</em>',
    subtitle: 'Roots, Nest, Craft, Travel, Passions \u2014 all searchable',
    rawFile: 'library.png',
    accentColor: '#8B7355',
  },
  {
    name: 'screenshot-8-achievements',
    title: 'Build Your<br/><em>Legacy</em>',
    subtitle: 'Unlock milestones as you preserve and share',
    rawFile: 'achievements.png',
    accentColor: '#D4AF37',
    bgStyle: 'dark',
  },
];

// ─── Output sizes ───────────────────────────────────────────────────────────

const SIZES = [
  { suffix: '',            w: 1080, h: 1920, dir: OUT },      // Google Play phone
  { suffix: '-7inch',      w: 1200, h: 1920, dir: OUT },      // Google Play 7" tablet
  { suffix: '-10inch',     w: 1600, h: 2560, dir: OUT },      // Google Play 10" tablet
  { suffix: '-ios67',      w: 1290, h: 2796, dir: IOS_OUT },  // iOS iPhone 6.7"
  { suffix: '-ipad13',     w: 2064, h: 2752, dir: IOS_OUT },  // iOS iPad 13"
];

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  // Ensure raw-v4 dir exists
  if (!existsSync(RAW)) {
    mkdirSync(RAW, { recursive: true });
    console.log(`\nCreated ${RAW}/`);
    console.log('Place your raw screenshots there (see STORE_VISUALS_GUIDE.md):\n');
    console.log('  exterior.png    - 3D palace exterior, golden hour');
    console.log('  entrance.png    - Entrance hall, columns and doors');
    console.log('  room.png        - Populated room with 4+ memories');
    console.log('  family-tree.png - Fan chart, 4+ generations');
    console.log('  kep.png         - Kep landing or WhatsApp flow');
    console.log('  explore.png     - Explore page with palace cards');
    console.log('  library.png     - Library with wings expanded');
    console.log('  achievements.png- Achievement badges panel');
    console.log('\nThen re-run this script.\n');
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ─── App icon (512 + 1024) ────────────────────────────────────────────

  console.log('\n=== Generating app icons ===\n');

  const iconHtml = (size) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${size}px; height: ${size}px; overflow: hidden; }
.icon {
  width: ${size}px; height: ${size}px;
  background: linear-gradient(145deg, #D4895F 0%, #C17F59 30%, #A86B48 60%, #8B5A3A 100%);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  border-radius: ${Math.round(size * 0.215)}px;
  overflow: hidden;
}
.icon::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 30% 25%, rgba(255,220,180,0.35) 0%, transparent 55%);
}
.icon::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: ${Math.round(size * 0.215)}px;
  box-shadow: inset 0 -${Math.round(size*0.012)}px ${Math.round(size*0.049)}px rgba(80,40,20,0.3),
              inset 0 ${Math.round(size*0.006)}px ${Math.round(size*0.029)}px rgba(255,220,180,0.12);
}
.glow {
  position: absolute;
  width: ${size*0.547}px; height: ${size*0.547}px;
  top: 50%; left: 50%;
  transform: translate(-50%, -52%);
  background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 65%);
  border-radius: 50%;
}
.palace {
  width: ${size*0.469}px; height: ${size*0.469}px;
  position: relative; z-index: 1;
  filter: drop-shadow(0 ${Math.round(size*0.01)}px ${Math.round(size*0.035)}px rgba(80,40,20,0.35));
  margin-top: -${Math.round(size*0.02)}px;
}
</style></head><body>
<div class="icon">
  <div class="glow"></div>
  <img class="palace" src="${whiteSvgUri}" />
</div>
</body></html>`;

  for (const size of [512, 1024]) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(iconHtml(size), { waitUntil: 'networkidle0' });
    const outDir = size === 1024 ? IOS_OUT : OUT;
    const name = size === 1024 ? 'appstore-icon-1024.png' : 'icon-512x512.png';
    await page.screenshot({ path: resolve(outDir, name) });
    await page.close();
    console.log(`  \u2713 ${name}`);
  }

  // ─── Screenshots in all sizes ─────────────────────────────────────────

  console.log('\n=== Generating framed screenshots ===\n');

  for (const cfg of screenshots) {
    const imgUri = rawImg(cfg.rawFile);
    console.log(`\n${cfg.name}:`);

    for (const size of SIZES) {
      const html = makeScreenshotHtml({
        ...cfg,
        imgUri,
        w: size.w,
        h: size.h,
      });
      const page = await browser.newPage();
      await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.screenshot({ path: resolve(size.dir, `${cfg.name}${size.suffix}.png`) });
      await page.close();
      console.log(`  \u2713 ${cfg.name}${size.suffix}.png (${size.w}x${size.h})`);
    }
  }

  // ─── Feature graphic ──────────────────────────────────────────────────

  console.log('\n=== Generating feature graphic ===\n');

  const entranceImg = rawImg('entrance.png');
  const featureHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:wght@300;400&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1024px; height: 500px; overflow: hidden; position: relative; }
.bg {
  position: absolute; inset: 0;
  background-image: url('${entranceImg}');
  background-size: cover;
  background-position: center 35%;
}
.overlay {
  position: absolute; inset: 0;
  background: linear-gradient(100deg,
    rgba(44,44,42,0.92) 0%,
    rgba(44,44,42,0.8) 35%,
    rgba(44,44,42,0.4) 65%,
    rgba(44,44,42,0.15) 100%
  );
}
.content {
  position: absolute; inset: 0;
  display: flex; align-items: center;
  padding: 0 65px;
}
.left { flex: 1; max-width: 520px; }
.logo-row {
  display: flex; align-items: center; gap: 11px;
  margin-bottom: 12px;
}
.logo-img { width: 32px; height: 32px; opacity: 0.85; }
.logo-text {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 16px; font-weight: 600;
  color: #D4AF37;
  letter-spacing: 2.5px;
  text-transform: uppercase;
}
.tagline {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 50px; font-weight: 600;
  color: #FAFAF7;
  line-height: 1.1;
  margin-bottom: 12px;
}
.tagline em { color: #D4AF37; font-style: italic; }
.sub {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 17px; font-weight: 300;
  color: rgba(212,197,178,0.9);
  line-height: 1.5;
}
.gold-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #D4AF37, #D4AF3744, transparent);
}
.corner { position: absolute; width: 36px; height: 36px; border-style: solid; border-color: rgba(212,175,55,0.18); }
.c-tl { top: 14px; left: 14px; border-width: 1px 0 0 1px; }
.c-br { bottom: 14px; right: 14px; border-width: 0 1px 1px 0; }
</style></head><body>
  <div class="bg"></div>
  <div class="overlay"></div>
  <div class="content">
    <div class="left">
      <div class="logo-row">
        <img class="logo-img" src="${whiteSvgUri}" />
        <span class="logo-text">The Memory Palace</span>
      </div>
      <div class="tagline">Your Memories<br/>Deserve a <em>Palace</em></div>
      <div class="sub">Preserve your life stories in a beautiful<br/>3D virtual villa \u2014 for generations to come</div>
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="corner c-tl"></div>
  <div class="corner c-br"></div>
</body></html>`;

  const featurePage = await browser.newPage();
  await featurePage.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await featurePage.setContent(featureHtml, { waitUntil: 'networkidle0' });
  await featurePage.screenshot({ path: resolve(OUT, 'feature-graphic.png') });
  await featurePage.close();
  console.log('  \u2713 feature-graphic.png (1024x500)');

  await browser.close();

  // ─── Summary ──────────────────────────────────────────────────────────

  console.log('\n\u2705 All v4 store assets generated!\n');
  console.log('Google Play (store-assets/):');
  console.log('  - icon-512x512.png');
  console.log('  - feature-graphic.png (1024x500)');
  screenshots.forEach(s => {
    console.log(`  - ${s.name}.png (1080x1920)`);
    console.log(`  - ${s.name}-7inch.png (1200x1920)`);
    console.log(`  - ${s.name}-10inch.png (1600x2560)`);
  });
  console.log('\nApple App Store (store-assets/ios/):');
  console.log('  - appstore-icon-1024.png');
  screenshots.forEach(s => {
    console.log(`  - ${s.name}-ios67.png (1290x2796)`);
    console.log(`  - ${s.name}-ipad13.png (2064x2752)`);
  });
  console.log(`\nTotal: ${2 + screenshots.length * SIZES.length + 1} assets`);
}

main().catch(err => { console.error(err); process.exit(1); });
