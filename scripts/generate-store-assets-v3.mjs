#!/usr/bin/env node
/**
 * Generate Google Play Store assets v3 — Real screenshots in premium frames.
 */

import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'store-assets');
const RAW = resolve(OUT, 'raw');

function imgToUri(filePath) {
  const ext = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${ext};base64,${readFileSync(filePath).toString('base64')}`;
}

// Source screenshots
const SHOTS = {
  exterior: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 223251.jpg')),
  entrance: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 223428.jpg')),
  corridor: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 223531.jpg')),
  room: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 223744.jpg')),
  upload: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 223829.jpg')),
  interview: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 224035.jpg')),
  map: imgToUri(resolve(RAW, 'Schermafbeelding 2026-03-17 224056.jpg')),
};

const palaceSvg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf-8');
const whiteSvg = palaceSvg.replace(/#C17F59/g, '#FFFFFF');
const whiteSvgUri = `data:image/svg+xml;base64,${Buffer.from(whiteSvg).toString('base64')}`;
const terraSvgUri = `data:image/svg+xml;base64,${Buffer.from(palaceSvg).toString('base64')}`;

// ─── Screenshot frame template ───────────────────────────────────────────────

function makeScreenshotHtml({ title, subtitle, imgUri, accentColor = '#C17F59', bgStyle = 'light' }) {
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
  const lightGlow = isDark
    ? `background: radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%);`
    : `background: radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%);`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1080px; height: 1920px;
  background: ${bgGradient};
  display: flex; flex-direction: column;
  align-items: center;
  position: relative; overflow: hidden;
}
.glow {
  position: absolute; top: -80px; right: -80px;
  width: 450px; height: 450px;
  ${lightGlow}
  border-radius: 50%;
}
.text-section {
  padding: 72px 64px 32px;
  text-align: center;
  position: relative; z-index: 1;
  flex-shrink: 0;
}
.logo { width: 44px; height: 44px; margin-bottom: 20px; }
.title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 54px; font-weight: 600;
  color: ${titleColor};
  line-height: 1.15;
  margin-bottom: 16px;
}
.title em { color: ${accentColor}; font-style: italic; }
.sub {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 22px; font-weight: 400;
  color: ${subColor};
  line-height: 1.45;
}
.gold-line {
  width: 56px; height: 2.5px;
  background: linear-gradient(90deg, ${accentColor}, ${accentColor}88);
  border-radius: 2px;
  margin: 22px auto 0;
}
.phone-wrapper {
  flex: 1;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 28px 44px 0;
  position: relative; z-index: 1;
  min-height: 0;
}
.phone {
  width: 880px; height: 1260px;
  border-radius: 40px;
  overflow: hidden;
  background: #000;
  box-shadow: ${phoneShadow};
  border: 8px solid ${phoneBorder};
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
  width: 160px; height: 30px;
  background: ${phoneBorder};
  border-radius: 0 0 18px 18px;
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

// ─── Screenshot configs ──────────────────────────────────────────────────────

const screenshots = [
  {
    name: 'screenshot-1-exterior',
    title: 'Your Personal<br/><em>Memory Palace</em>',
    subtitle: 'A stunning 3D villa where every memory finds its perfect place',
    imgUri: SHOTS.exterior,
    accentColor: '#C17F59',
  },
  {
    name: 'screenshot-2-entrance',
    title: 'Walk Through<br/>Your <em>Memories</em>',
    subtitle: '5 wings for every chapter — Family, Travel, Childhood, Career & Creativity',
    imgUri: SHOTS.entrance,
    accentColor: '#D4AF37',
  },
  {
    name: 'screenshot-3-room',
    title: 'Memories Come<br/><em>Alive</em>',
    subtitle: 'Paintings, videos, photo albums, glowing orbs — 8 stunning display types',
    imgUri: SHOTS.room,
    accentColor: '#C17F59',
  },
  {
    name: 'screenshot-4-upload',
    title: '8 Ways to<br/><em>Display</em>',
    subtitle: 'Frame, Painting, Screen, Album, Orb, Vitrine, Audio & Document',
    imgUri: SHOTS.upload,
    accentColor: '#8B7355',
  },
  {
    name: 'screenshot-5-interview',
    title: 'AI-Guided<br/><em>Life Stories</em>',
    subtitle: 'Gentle interviews that capture the stories behind your memories',
    imgUri: SHOTS.interview,
    accentColor: '#D4AF37',
    bgStyle: 'dark',
  },
  {
    name: 'screenshot-6-map',
    title: 'Your Memories<br/><em>Mapped</em>',
    subtitle: 'See where your life has taken you — every memory pinned on the globe',
    imgUri: SHOTS.map,
    accentColor: '#4A6741',
  },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ─── App icon ──────────────────────────────────────────────────────────

  console.log('\n=== Generating app icon ===\n');

  const iconHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 512px; height: 512px; overflow: hidden; }
.icon {
  width: 512px; height: 512px;
  background: linear-gradient(145deg, #D4895F 0%, #C17F59 30%, #A86B48 60%, #8B5A3A 100%);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  border-radius: 110px;
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
  border-radius: 110px;
  box-shadow: inset 0 -6px 25px rgba(80,40,20,0.3), inset 0 3px 15px rgba(255,220,180,0.12);
}
.glow {
  position: absolute;
  width: 280px; height: 280px;
  top: 50%; left: 50%;
  transform: translate(-50%, -52%);
  background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 65%);
  border-radius: 50%;
}
.palace {
  width: 240px; height: 240px;
  position: relative; z-index: 1;
  filter: drop-shadow(0 5px 18px rgba(80,40,20,0.35));
  margin-top: -10px;
}
</style></head><body>
<div class="icon">
  <div class="glow"></div>
  <img class="palace" src="${whiteSvgUri}" />
</div>
</body></html>`;

  const iconPage = await browser.newPage();
  await iconPage.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await iconPage.setContent(iconHtml, { waitUntil: 'networkidle0' });
  await iconPage.screenshot({ path: resolve(OUT, 'icon-512x512.png') });
  await iconPage.close();
  console.log('  \u2713 icon-512x512.png');

  // ─── Screenshots ───────────────────────────────────────────────────────

  console.log('\n=== Generating framed screenshots ===\n');

  for (const cfg of screenshots) {
    console.log(`Generating ${cfg.name}...`);
    const html = makeScreenshotHtml(cfg);
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: resolve(OUT, `${cfg.name}.png`) });
    await page.close();
    console.log(`  \u2713 ${cfg.name}.png`);
  }

  // ─── Feature graphic ──────────────────────────────────────────────────

  console.log('\n=== Generating feature graphic ===\n');

  const featureHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:wght@300;400&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1024px; height: 500px; overflow: hidden; position: relative; }
.bg {
  position: absolute; inset: 0;
  background-image: url('${SHOTS.entrance}');
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
  console.log('  \u2713 feature-graphic.png');

  await browser.close();

  console.log('\n\u2705 All v3 store assets generated in store-assets/');
  console.log('   - icon-512x512.png (512\u00d7512)');
  console.log('   - feature-graphic.png (1024\u00d7500)');
  screenshots.forEach(s => console.log(`   - ${s.name}.png (1080\u00d71920)`));
}

main().catch(err => { console.error(err); process.exit(1); });
