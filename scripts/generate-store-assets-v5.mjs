#!/usr/bin/env node
/**
 * Generate Store Assets v5 — Full-bleed screenshots with text overlay.
 *
 * Takes landscape desktop screenshots from store-assets/June2026/,
 * crops them to portrait, and overlays headline + subtitle text
 * directly on a gradient scrim at the bottom.
 *
 * Usage: node scripts/generate-store-assets-v5.mjs
 */

import puppeteer from 'puppeteer';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'store-assets', 'v5');
const IOS_OUT = resolve(OUT, 'ios');
const RAW = resolve(ROOT, 'store-assets', 'June2026');

for (const d of [OUT, IOS_OUT]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

/**
 * Blur rectangular regions on an image using sharp.
 * Regions are in % of image dimensions: { top, left, width, height }
 */
async function blurImageRegions(filePath, regions, inputBuffer) {
  const src = inputBuffer || readFileSync(filePath);
  if (!regions || regions.length === 0) return src;

  if (regions.length === 1 && regions[0].fullBlur) {
    return sharp(src).blur(regions[0].fullBlur).png().toBuffer();
  }

  const meta = await sharp(src).metadata();
  const imgW = meta.width;
  const imgH = meta.height;

  let composite = [];
  for (const r of regions) {
    const rx = Math.round(r.left / 100 * imgW);
    const ry = Math.round(r.top / 100 * imgH);
    const rw = Math.min(Math.round(r.width / 100 * imgW), imgW - rx);
    const rh = Math.min(Math.round(r.height / 100 * imgH), imgH - ry);
    if (rw <= 0 || rh <= 0) continue;

    const sigma = r.sigma || 200;
    const blurred = await sharp(src)
      .extract({ left: rx, top: ry, width: rw, height: rh })
      .blur(sigma)
      .toBuffer();

    composite.push({ input: blurred, left: rx, top: ry });
  }

  return sharp(src).composite(composite).png().toBuffer();
}

function imgToUri(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`  WARNING: Missing: ${filePath}`);
    return 'data:image/svg+xml;base64,' + Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
        <rect fill="#3D3530" width="1080" height="1920"/>
        <text x="540" y="960" text-anchor="middle" fill="#fff" font-size="36">MISSING</text>
      </svg>`
    ).toString('base64');
  }
  return `data:image/png;base64,${readFileSync(filePath).toString('base64')}`;
}

// ─── Screenshot configs ─────────────────────────────────────────────────────
// Note: corridor_vChrome replaces "entrance" from the guide (it's the entrance hall corridor view)

const screenshots = [
  {
    name: 'screenshot-1-exterior',
    title: 'Your Personal<br/><em>Memory Palace</em>',
    subtitle: 'A stunning 3D palace where your memories come alive',
    rawFile: 'Screenshot_20260614_193709_Edge.jpg',
    accentColor: '#C17F59',
    cropTopExtra: 340, // remove all 3 rows of nav pills
  },
  {
    name: 'screenshot-2-entrance',
    title: 'Step Inside<br/>Your <em>Story</em>',
    subtitle: 'Themed wings for every chapter of your life',
    rawFile: 'Screenshot_20260614_193746_Edge.jpg',
    accentColor: '#D4AF37',
    cropTopExtra: 340, // remove all 3 rows of nav pills
  },
  {
    name: 'screenshot-3-room',
    title: 'Every Memory Has<br/>Its <em>Place</em>',
    subtitle: 'Photos, videos, voice notes, documents — beautifully displayed',
    rawFile: 'Screenshot_20260614_194737_Edge.jpg',
    accentColor: '#C17F59',
    // keep top nav bar
  },
  {
    name: 'screenshot-4-family-tree',
    title: 'See Where You<br/>Come <em>From</em>',
    subtitle: 'Interactive family tree connecting generations',
    rawFile: 'Screenshot_20260614_193843_Edge.jpg',
    accentColor: '#D4AF37',
    // Blur only the midsection (tree cards), not the top menu
    blurRegions: [
      { top: 20, left: 0, width: 100, height: 55, sigma: 8 },
    ],
  },
  {
    name: 'screenshot-5-interview',
    title: 'Tell Your<br/><em>Story</em>',
    subtitle: 'AI-guided interviews that capture your life stories',
    rawFile: 'Screenshot_20260614_194322_Edge.jpg',
    accentColor: '#C17F59',
    cropBottomOverride: 130, // only Android nav, no browser chrome
  },
  {
    name: 'screenshot-6-explore',
    title: 'Visit & Share<br/><em>Palaces</em>',
    subtitle: 'Discover stories from people around the world',
    rawFile: 'Screenshot_20260614_194149_Edge.jpg',
    accentColor: '#D4AF37',
  },
  {
    name: 'screenshot-7-library',
    title: 'Organize by<br/>Life\u2019s <em>Chapters</em>',
    subtitle: 'Roots, Nest, Craft, Travel, Passions — all searchable',
    rawFile: 'Screenshot_20260614_194804_Edge.jpg',
    accentColor: '#8B7355',
  },
  {
    name: 'screenshot-8-achievements',
    title: 'Build Your<br/><em>Legacy</em>',
    subtitle: 'Unlock milestones as you preserve and share',
    rawFile: 'Screenshot_20260614_193916_Edge.jpg',
    accentColor: '#D4AF37',
  },
];

// ─── Output sizes ───────────────────────────────────────────────────────────

const SIZES = [
  { suffix: '',            w: 1080, h: 1920, dir: OUT },      // Google Play phone
  { suffix: '-7inch',      w: 1200, h: 1920, dir: OUT },      // Google Play 7" tablet
  { suffix: '-10inch',     w: 1600, h: 2560, dir: OUT },      // Google Play 10" tablet
];

// iOS sizes — rendered WITHOUT text overlay (Apple Guideline 2.3.3)
const IOS_SIZES = [
  { suffix: '-ios65',      w: 1284, h: 2778, dir: IOS_OUT },  // iOS iPhone 6.5"
  { suffix: '-ipad13',     w: 2064, h: 2752, dir: IOS_OUT },  // iOS iPad 13"
];

// ─── Full-bleed HTML template ───────────────────────────────────────────────

function makeFullBleedHtml({ title, subtitle, imgUri, accentColor, w, h }) {
  const s = w / 1080;
  const titleSize = Math.round(56 * s);
  const subSize = Math.round(23 * s);
  const padBottom = Math.round(72 * s);
  const padSide = Math.round(48 * s);
  const gradientHeight = Math.round(480 * s);
  const goldW = Math.round(48 * s);
  const goldH = Math.round(3 * s);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Source+Sans+3:wght@300;400;500;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: ${w}px; height: ${h}px;
  overflow: hidden; position: relative;
  background: #1a1a1a;
}
.bg-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center top;
}
.scrim {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: ${gradientHeight}px;
  background: linear-gradient(
    to top,
    rgba(20, 18, 15, 0.92) 0%,
    rgba(20, 18, 15, 0.82) 25%,
    rgba(20, 18, 15, 0.5) 55%,
    rgba(20, 18, 15, 0.15) 80%,
    transparent 100%
  );
}
.text-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: ${padBottom}px ${padSide}px;
  z-index: 2;
}
.title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: ${titleSize}px;
  font-weight: 600;
  color: #FAFAF7;
  line-height: 1.15;
  margin-bottom: ${Math.round(12 * s)}px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3);
}
.title em {
  color: ${accentColor};
  font-style: italic;
  text-shadow: 0 2px 16px rgba(0,0,0,0.6), 0 0 30px ${accentColor}33;
}
.gold-line {
  width: ${goldW}px; height: ${goldH}px;
  background: linear-gradient(90deg, ${accentColor}, ${accentColor}66);
  border-radius: 2px;
  margin-bottom: ${Math.round(12 * s)}px;
}
.sub {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: ${subSize}px;
  font-weight: 400;
  color: rgba(250, 250, 247, 0.8);
  line-height: 1.45;
  text-shadow: 0 1px 6px rgba(0,0,0,0.4);
}
</style></head><body>
  <img class="bg-img" src="${imgUri}" />
  <div class="scrim"></div>
  <div class="text-overlay">
    <div class="title">${title}</div>
    <div class="gold-line"></div>
    <div class="sub">${subtitle}</div>
  </div>
</body></html>`;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Launching browser...\n');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ─── App icons (reuse from v4) ──────────────────────────────────────

  const palaceSvg = readFileSync(resolve(ROOT, 'public/favicon.svg'), 'utf-8');
  const whiteSvg = palaceSvg.replace(/#C17F59/g, '#FFFFFF');
  const whiteSvgUri = `data:image/svg+xml;base64,${Buffer.from(whiteSvg).toString('base64')}`;

  console.log('=== Generating app icons ===\n');

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
.glow {
  position: absolute;
  width: ${size*0.55}px; height: ${size*0.55}px;
  top: 50%; left: 50%;
  transform: translate(-50%, -52%);
  background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 65%);
  border-radius: 50%;
}
.palace {
  width: ${size*0.47}px; height: ${size*0.47}px;
  position: relative; z-index: 1;
  filter: drop-shadow(0 ${Math.round(size*0.01)}px ${Math.round(size*0.035)}px rgba(80,40,20,0.35));
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
    console.log(`  OK ${name}`);
  }

  // ─── Full-bleed screenshots ─────────────────────────────────────────

  console.log('\n=== Generating full-bleed screenshots ===\n');

  for (const cfg of screenshots) {
    const rawPath = resolve(RAW, cfg.rawFile);
    if (!existsSync(rawPath)) {
      console.log(`  SKIP ${cfg.name}: missing ${cfg.rawFile}`);
      continue;
    }

    // Pre-process: crop phone chrome + optional blur
    const meta = await sharp(rawPath).metadata();
    // Crop: status bar (80px) + optional nav (cropTopExtra), browser chrome (400px bottom)
    const cropTopPx = 80 + (cfg.cropTopExtra || 0);
    const cropBottomPx = cfg.cropBottomOverride || 400;
    const croppedH = meta.height - cropTopPx - cropBottomPx;
    let pipeline = sharp(rawPath)
      .extract({ left: 0, top: cropTopPx, width: meta.width, height: croppedH });

    let buf;
    if (cfg.blurRegions && cfg.blurRegions.length > 0) {
      console.log(`  Pre-processing blur for ${cfg.rawFile}...`);
      // Save cropped first, then blur
      const croppedBuf = await pipeline.png().toBuffer();
      buf = await blurImageRegions(null, cfg.blurRegions, croppedBuf);
    } else {
      buf = await pipeline.png().toBuffer();
    }

    const imgUri = `data:image/png;base64,${buf.toString('base64')}`;
    console.log(`${cfg.name}:`);

    // Google Play: full-bleed with text overlay
    for (const size of SIZES) {
      const html = makeFullBleedHtml({
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
      console.log(`  OK ${cfg.name}${size.suffix}.png (${size.w}x${size.h})`);
    }

    // iOS: clean screenshots WITHOUT text overlay (Apple Guideline 2.3.3)
    for (const size of IOS_SIZES) {
      const outPath = resolve(size.dir, `${cfg.name}${size.suffix}.png`);
      await sharp(buf)
        .resize(size.w, size.h, { fit: 'cover', position: 'top' })
        .png()
        .toFile(outPath);
      console.log(`  OK ${cfg.name}${size.suffix}.png (${size.w}x${size.h}) [clean]`);
    }
    console.log('');
  }

  // ─── Feature graphic ────────────────────────────────────────────────

  console.log('=== Generating feature graphic ===\n');

  const entranceImg = imgToUri(resolve(RAW, 'Screenshot_20260614_193746_Edge.jpg'));
  const terraSvgUri = `data:image/svg+xml;base64,${Buffer.from(palaceSvg).toString('base64')}`;

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
  console.log('  OK feature-graphic.png (1024x500)');

  await browser.close();

  // ─── Summary ────────────────────────────────────────────────────────

  const total = 2 + screenshots.length * SIZES.length + 1;
  console.log(`\nDone! ${total} assets generated in store-assets/v5/\n`);
  console.log('Google Play (v5/):');
  console.log('  icon-512x512.png, feature-graphic.png');
  screenshots.forEach(s => {
    console.log(`  ${s.name}.png | -7inch | -10inch`);
  });
  console.log('\nApple App Store (v5/ios/):');
  console.log('  appstore-icon-1024.png');
  screenshots.forEach(s => {
    console.log(`  ${s.name}-ios67.png | -ipad13.png`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
