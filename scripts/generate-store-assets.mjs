#!/usr/bin/env node
/**
 * Generate Google Play Store visual assets using Puppeteer + Sharp.
 *
 * Produces:
 *   - feature-graphic.png (1024×500)
 *   - screenshot-1-hero.png through screenshot-6-legacy.png (1080×1920 each)
 *
 * All assets use the Memory Palace brand: Cormorant Garamond, Source Sans 3,
 * terracotta/linen/gold palette, classical elegance for 60+ audience.
 */

import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'store-assets');

// Convert images to base64 data URIs for embedding in HTML
function imageToDataUri(filePath, mime = 'image/png') {
  const buf = readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const palaceHeroUri = imageToDataUri(resolve(ROOT, 'public/palace-hero.jpg'), 'image/jpeg');
const entranceHallUri = imageToDataUri(resolve(ROOT, 'public/EntranceHall.jpg'), 'image/jpeg');
const iconUri = imageToDataUri(resolve(ROOT, 'public/icons/icon-512x512.png'), 'image/png');

// Palace SVG logo inline
const palaceSvg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf-8');
const palaceSvgDataUri = `data:image/svg+xml;base64,${Buffer.from(palaceSvg).toString('base64')}`;

// Shared CSS
const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600&display=swap');
`;

const BASE_CSS = `
${FONTS_CSS}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { overflow: hidden; }
.display-font { font-family: 'Cormorant Garamond', Georgia, serif; }
.body-font { font-family: 'Source Sans 3', system-ui, sans-serif; }
`;

// ─── FEATURE GRAPHIC (1024×500) ───────────────────────────────────────────────
const featureGraphicHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${BASE_CSS}
body {
  width: 1024px; height: 500px;
  background: linear-gradient(135deg, #2C2C2A 0%, #3D3530 40%, #4A3828 100%);
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
/* Subtle golden radial glow behind the palace image */
.glow {
  position: absolute;
  width: 600px; height: 600px;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%);
  border-radius: 50%;
}
/* Palace hero image */
.hero-img {
  position: absolute;
  left: 40px; top: 50%; transform: translateY(-50%);
  width: 420px; height: 420px;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid rgba(212,175,55,0.4);
  box-shadow: 0 0 60px rgba(212,175,55,0.2), 0 20px 60px rgba(0,0,0,0.4);
}
/* Right side content */
.content {
  position: absolute;
  right: 60px; top: 50%; transform: translateY(-50%);
  text-align: right;
  max-width: 480px;
}
.logo-row {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 14px; margin-bottom: 16px;
}
.logo-icon {
  width: 48px; height: 48px;
  filter: brightness(1.2) sepia(0.3);
}
.app-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 28px; font-weight: 600;
  color: #D4AF37;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.tagline {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 44px; font-weight: 600;
  color: #FAFAF7;
  line-height: 1.15;
  margin-bottom: 18px;
  text-shadow: 0 2px 20px rgba(0,0,0,0.3);
}
.tagline em {
  color: #D4AF37; font-style: italic;
}
.subtitle {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 18px; font-weight: 300;
  color: #D4C5B2;
  letter-spacing: 0.5px;
  line-height: 1.5;
}
/* Decorative gold line */
.gold-line {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, #D4AF37, transparent);
}
/* Corner ornaments */
.corner {
  position: absolute; width: 60px; height: 60px;
  border-color: rgba(212,175,55,0.25); border-style: solid;
}
.corner-tl { top: 20px; left: 20px; border-width: 2px 0 0 2px; }
.corner-tr { top: 20px; right: 20px; border-width: 2px 2px 0 0; }
.corner-bl { bottom: 20px; left: 20px; border-width: 0 0 2px 2px; }
.corner-br { bottom: 20px; right: 20px; border-width: 0 2px 2px 0; }
</style></head><body>
  <div class="glow"></div>
  <img class="hero-img" src="${palaceHeroUri}" />
  <div class="content">
    <div class="logo-row">
      <img class="logo-icon" src="${palaceSvgDataUri}" />
      <span class="app-name">The Memory Palace</span>
    </div>
    <div class="tagline">Your Memories<br/>Deserve a <em>Palace</em></div>
    <div class="subtitle">Preserve your life stories in a stunning<br/>3D virtual villa — for generations to come</div>
  </div>
  <div class="gold-line"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
</body></html>`;

// ─── SCREENSHOT TEMPLATE ──────────────────────────────────────────────────────
// Each screenshot is 1080×1920 (9:16 portrait) with a phone-style layout:
// - Top: feature text area with brand gradient
// - Bottom: app screenshot/visual in a device-like frame

function screenshotHtml({ title, subtitle, bgImage, accentColor = '#D4AF37', overlayOpacity = 0.6, bgPosition = 'center' }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${BASE_CSS}
body {
  width: 1080px; height: 1920px;
  background: #FAFAF7;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
/* Top section: text + branding */
.top {
  flex: 0 0 580px;
  background: linear-gradient(160deg, #2C2C2A 0%, #3D3530 50%, #4A3828 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 60px 70px;
  position: relative;
}
.top::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, transparent, ${accentColor}, transparent);
}
.logo-badge {
  width: 64px; height: 64px; margin-bottom: 24px;
  filter: brightness(1.3);
}
.title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 56px; font-weight: 600;
  color: #FAFAF7; text-align: center;
  line-height: 1.15; margin-bottom: 20px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.title em { color: ${accentColor}; font-style: italic; }
.sub {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 24px; font-weight: 300;
  color: #D4C5B2; text-align: center;
  line-height: 1.5; max-width: 700px;
}
/* Bottom section: app preview */
.bottom {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  padding: 40px;
  position: relative;
  background: linear-gradient(180deg, #F2EDE7 0%, #FAFAF7 100%);
}
/* Phone frame mockup */
.phone-frame {
  width: 900px; height: 1200px;
  border-radius: 40px;
  overflow: hidden;
  box-shadow: 0 20px 80px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.1);
  border: 8px solid #2C2C2A;
  position: relative;
  background: #000;
}
.phone-frame img {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: ${bgPosition};
}
.phone-frame .overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(44,44,42,${overlayOpacity * 0.3}) 0%, transparent 40%);
}
/* Floating decorative elements */
.decor-dot {
  position: absolute; border-radius: 50%;
  background: ${accentColor};
  opacity: 0.15;
}
.dot1 { width: 200px; height: 200px; top: -60px; right: -60px; }
.dot2 { width: 120px; height: 120px; bottom: 80px; left: -40px; }
</style></head><body>
  <div class="top">
    <img class="logo-badge" src="${palaceSvgDataUri}" />
    <div class="title">${title}</div>
    <div class="sub">${subtitle}</div>
    <div class="decor-dot dot1"></div>
  </div>
  <div class="bottom">
    <div class="phone-frame">
      <img src="${bgImage}" />
      <div class="overlay"></div>
    </div>
    <div class="decor-dot dot2"></div>
  </div>
</body></html>`;
}

// ─── SCREENSHOT DEFINITIONS ───────────────────────────────────────────────────

const screenshots = [
  {
    name: 'screenshot-1-hero',
    title: 'Your Memories<br/>Deserve a <em>Palace</em>',
    subtitle: 'A stunning 3D virtual villa where every memory finds its perfect place',
    bgImage: palaceHeroUri,
    bgPosition: 'center',
  },
  {
    name: 'screenshot-2-interior',
    title: 'Walk Through<br/>Your <em>Memories</em>',
    subtitle: '5 wings for every chapter of your life — Family, Travel, Childhood, Career & Creativity',
    bgImage: entranceHallUri,
    bgPosition: 'center',
    accentColor: '#C9A84C',
  },
  {
    name: 'screenshot-3-memories',
    title: 'Photos, Videos<br/>& <em>Stories</em>',
    subtitle: '8 beautiful display types — paintings, photo albums, glowing orbs, display cases & more',
    bgImage: entranceHallUri,
    bgPosition: 'left center',
    accentColor: '#C17F59',
  },
  {
    name: 'screenshot-4-interview',
    title: 'AI-Guided<br/><em>Life Stories</em>',
    subtitle: 'Gentle interviews that help you capture and preserve the stories behind your memories',
    bgImage: palaceHeroUri,
    bgPosition: 'center',
    accentColor: '#4A6741',
  },
  {
    name: 'screenshot-5-sharing',
    title: 'Share With<br/><em>Loved Ones</em>',
    subtitle: 'Invite family members to co-create and explore your palace together',
    bgImage: entranceHallUri,
    bgPosition: 'right center',
    accentColor: '#D4AF37',
  },
  {
    name: 'screenshot-6-legacy',
    title: 'Preserve Your<br/><em>Legacy</em>',
    subtitle: 'Time capsules, digital wills & legacy messages — your memories live on for generations',
    bgImage: palaceHeroUri,
    bgPosition: 'center top',
    accentColor: '#B8922E',
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // --- Feature Graphic ---
  console.log('Generating feature graphic (1024×500)...');
  const fgPage = await browser.newPage();
  await fgPage.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await fgPage.setContent(featureGraphicHtml, { waitUntil: 'networkidle0' });
  await fgPage.screenshot({ path: resolve(OUT, 'feature-graphic-raw.png'), fullPage: false });
  await fgPage.close();

  // Optimize with Sharp
  await sharp(resolve(OUT, 'feature-graphic-raw.png'))
    .png({ quality: 95, compressionLevel: 6 })
    .toFile(resolve(OUT, 'feature-graphic.png'));
  console.log('  ✓ feature-graphic.png');

  // --- Screenshots ---
  for (const ss of screenshots) {
    console.log(`Generating ${ss.name} (1080×1920)...`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    const html = screenshotHtml(ss);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: resolve(OUT, `${ss.name}-raw.png`), fullPage: false });
    await page.close();

    await sharp(resolve(OUT, `${ss.name}-raw.png`))
      .png({ quality: 95, compressionLevel: 6 })
      .toFile(resolve(OUT, `${ss.name}.png`));
    console.log(`  ✓ ${ss.name}.png`);
  }

  await browser.close();

  // Clean up raw files
  const { unlinkSync } = await import('fs');
  unlinkSync(resolve(OUT, 'feature-graphic-raw.png'));
  for (const ss of screenshots) {
    unlinkSync(resolve(OUT, `${ss.name}-raw.png`));
  }

  console.log('\n✅ All store assets generated in store-assets/');
  console.log('   - feature-graphic.png (1024×500)');
  screenshots.forEach(ss => console.log(`   - ${ss.name}.png (1080×1920)`));
}

main().catch(err => { console.error(err); process.exit(1); });
