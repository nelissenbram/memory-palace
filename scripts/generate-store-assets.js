/**
 * Generate Store Assets for Google Play
 * Uses Puppeteer to render HTML templates with proper fonts and styling
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Brand constants — from src/lib/theme.ts
const BRAND = {
  bg: '#E8DDD0',          // carrara marble (Renaissance era)
  bgLight: '#F2EDE7',     // warmStone
  accent: '#D4AF37',      // gold from theme
  title: '#2C2C2A',       // charcoal from theme
  subtitle: '#8B7355',    // walnut from theme
  border: '#D4C5B2',      // sandstone from theme
  frameBg: '#F5F0E8',     // warm marble (Renaissance era)
  primary: '#9B5A38',     // theme terracotta / PWA theme color
};

// Temple icon SVG (from favicon.svg)
const TEMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="36" height="36">
  <g fill="${BRAND.primary}">
    <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z"/>
    <rect x="18" y="40" width="8" height="32"/>
    <rect x="32" y="40" width="8" height="32"/>
    <rect x="46" y="40" width="8" height="32"/>
    <rect x="60" y="40" width="8" height="32"/>
    <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7"/>
    <rect x="10" y="72" width="80" height="4"/>
    <rect x="6" y="78" width="88" height="4"/>
    <rect x="2" y="84" width="96" height="4"/>
  </g>
</svg>`;

// Screenshot definitions — optimized order based on analysis
// 1. Hero (3D palace), 2. Home (Atrium), 3. Emotional (Interview),
// 4. Organization (Library), 5. Engagement (Quest), 6. Differentiator (Legacy),
// 7. Family Tree, 8. Achievements
const SCREENSHOTS = [
  {
    id: 'palace-peristylium',
    file: 'palace-peristylium-1200w.webp',
    title: ['Your', '*Living* Palace'],
    subtitle: 'A villa built from your memories',
  },
  {
    id: 'atrium-dashboard',
    file: 'atrium-dashboard-1200w.webp',
    title: ['Begin Each', 'Day *Here*'],
    subtitle: 'Your personal atrium awaits',
  },
  {
    id: 'interview-intro',
    file: 'interview-intro-1200w.webp',
    title: ['Stories Worth', '*Keeping*'],
    subtitle: 'Guided prompts unlock hidden memories',
  },
  {
    id: 'library-nest',
    file: 'library-nest-1200w.webp',
    title: ['Every *Chapter*', 'Has a Room'],
    subtitle: 'Roots, travel, craft — all in place',
  },
  {
    id: 'quest-enhance',
    file: 'quest-enhance-1200w.webp',
    title: ['Memories', '*Enhanced* by AI'],
    subtitle: 'Smart prompts that deepen every story',
  },
  {
    id: 'legacy-settings',
    file: 'legacy-settings-1200w.webp',
    title: ['Pass It On.', '*Forever.*'],
    subtitle: 'Your legacy, safely preserved for generations',
  },
  {
    id: 'family-tree-view',
    file: 'family-tree-view-1200w.webp',
    title: ['See Your', '*Roots* Grow'],
    subtitle: 'An interactive tree across generations',
  },
  {
    id: 'quest-enhance',
    file: 'quest-enhance-1200w.webp',
    title: ['AI-Powered', '*Quests*'],
    subtitle: 'Intelligent prompts to enrich and enhance your memories',
  },
];

// Format configurations
const FORMATS = {
  phone: { width: 1080, height: 1920, suffix: '' },
  tablet7: { width: 1200, height: 1920, suffix: '-7inch' },
  tablet10: { width: 1600, height: 2560, suffix: '-10inch' },
};

function renderTitle(titleLines) {
  return titleLines.map(line => {
    // *word* becomes golden italic accent
    return line.replace(/\*([^*]+)\*/g, `<span class="accent">$1</span>`);
  }).join('<br>');
}

function generateScreenshotHTML(screenshot, format, screenshotBase64) {
  const { width, height } = format;
  const scale = width / 1080; // base scale relative to phone

  // Layout proportions
  const titleTop = Math.round(height * 0.065);
  const titleSize = Math.round(58 * scale);
  const subtitleSize = Math.round(24 * scale);
  const iconSize = Math.round(32 * scale);
  const iconTop = Math.round(height * 0.025);
  const subtitleTop = Math.round(16 * scale);

  // Frame dimensions: screenshot takes ~92% of width
  const frameWidth = Math.round(width * 0.90);
  const frameHeight = Math.round(frameWidth * 0.625); // 16:10 aspect
  const framePadding = Math.round(12 * scale);
  const frameBorderRadius = Math.round(18 * scale);
  const frameTop = Math.round(height * 0.30);

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: ${width}px;
      height: ${height}px;
      background: ${BRAND.bg};
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
      font-family: 'Cormorant Garamond', Georgia, serif;
    }

    .header {
      text-align: center;
      padding-top: ${titleTop}px;
    }

    .icon {
      margin-bottom: ${iconTop}px;
    }

    .title {
      font-size: ${titleSize}px;
      font-weight: 600;
      color: ${BRAND.title};
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: ${subtitleTop}px;
    }

    .title .accent {
      color: ${BRAND.accent};
      font-style: italic;
      font-weight: 500;
    }

    .subtitle {
      font-size: ${subtitleSize}px;
      font-weight: 300;
      font-style: italic;
      color: ${BRAND.subtitle};
      line-height: 1.4;
      max-width: ${Math.round(width * 0.85)}px;
      margin: 0 auto;
    }

    .device-frame {
      position: absolute;
      top: ${frameTop}px;
      left: 50%;
      transform: translateX(-50%);
      width: ${frameWidth + framePadding * 2}px;
      background: ${BRAND.frameBg};
      border: ${Math.round(2.5 * scale)}px solid ${BRAND.border};
      border-radius: ${frameBorderRadius}px;
      padding: ${framePadding}px;
      box-shadow:
        0 ${Math.round(4 * scale)}px ${Math.round(20 * scale)}px rgba(0,0,0,0.08),
        0 ${Math.round(8 * scale)}px ${Math.round(40 * scale)}px rgba(0,0,0,0.05);
    }

    .device-frame img {
      width: ${frameWidth}px;
      height: ${frameHeight}px;
      object-fit: cover;
      border-radius: ${Math.round(8 * scale)}px;
      display: block;
    }

    .bottom-fade {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${Math.round(height * 0.15)}px;
      background: linear-gradient(to bottom, transparent, ${BRAND.bg});
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">${TEMPLE_SVG.replace(/width="36"/, `width="${iconSize}"`).replace(/height="36"/, `height="${iconSize}"`)}</div>
    <div class="title">${renderTitle(screenshot.title)}</div>
    <div class="subtitle">${screenshot.subtitle}</div>
  </div>

  <div class="device-frame">
    <img src="data:image/webp;base64,${screenshotBase64}" />
  </div>

  <div class="bottom-fade"></div>
</body>
</html>`;
}

function generateFeatureGraphicHTML(screenshotBase64) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1024px;
      height: 500px;
      overflow: hidden;
      font-family: 'Cormorant Garamond', Georgia, serif;
      position: relative;
    }

    .bg-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to right,
        rgba(30, 20, 12, 0.88) 0%,
        rgba(30, 20, 12, 0.75) 35%,
        rgba(30, 20, 12, 0.3) 70%,
        rgba(30, 20, 12, 0.15) 100%
      );
    }

    .content {
      position: absolute;
      left: 60px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2;
    }

    .icon { margin-bottom: 16px; }

    .title {
      font-size: 54px;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
    }

    .title .accent {
      color: ${BRAND.accent};
      font-style: italic;
      font-weight: 500;
    }

    .subtitle {
      font-size: 22px;
      font-weight: 300;
      font-style: italic;
      color: rgba(212, 165, 116, 0.9);
      line-height: 1.5;
      max-width: 480px;
    }
  </style>
</head>
<body>
  <img class="bg-image" src="data:image/webp;base64,${screenshotBase64}" />
  <div class="overlay"></div>
  <div class="content">
    <div class="icon">${TEMPLE_SVG.replace(/fill="${BRAND.primary}"/g, 'fill="#D4A574"')}</div>
    <div class="title">Your Memories<br>Deserve a <span class="accent">Palace</span></div>
    <div class="subtitle">Preserve your life stories in a beautiful 3D virtual villa — for generations to come.</div>
  </div>
</body>
</html>`;
}

async function main() {
  const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');
  const outputDir = path.join(__dirname, '..', 'store-assets');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();

  // Pre-load Cormorant Garamond font
  console.log('Pre-loading fonts...');
  await page.goto('about:blank');
  await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&display=swap' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));
  console.log('Fonts loaded.');

  // Generate screenshots for each format
  const names = ['1-palace', '2-atrium', '3-interview', '4-library', '5-quests', '6-legacy', '7-family', '8-achievements'];

  for (let i = 0; i < SCREENSHOTS.length; i++) {
    const ss = SCREENSHOTS[i];
    const name = names[i];
    const imgPath = path.join(screenshotsDir, ss.file);

    if (!fs.existsSync(imgPath)) {
      console.log(`  Skipping ${ss.id} — file not found`);
      continue;
    }

    const imgBase64 = fs.readFileSync(imgPath).toString('base64');

    for (const [formatName, format] of Object.entries(FORMATS)) {
      const outFile = path.join(outputDir, `screenshot-${name}${format.suffix}.png`);

      await page.setViewport({ width: format.width, height: format.height, deviceScaleFactor: 1 });

      const html = generateScreenshotHTML(ss, format, imgBase64);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Wait for fonts to render
      await page.evaluateHandle('document.fonts.ready');
      await new Promise(r => setTimeout(r, 500));

      await page.screenshot({ path: outFile, type: 'png' });
      console.log(`  Created: screenshot-${name}${format.suffix}.png (${format.width}x${format.height})`);
    }
  }

  // Feature graphic
  console.log('Generating feature graphic...');
  const palaceImg = path.join(screenshotsDir, 'palace-peristylium-1200w.webp');
  const palaceBase64 = fs.readFileSync(palaceImg).toString('base64');

  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  const featureHTML = generateFeatureGraphicHTML(palaceBase64);
  await page.setContent(featureHTML, { waitUntil: 'domcontentloaded' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outputDir, 'feature-graphic.png'), type: 'png' });
  console.log('  Created: feature-graphic.png (1024x500)');

  await browser.close();
  console.log('\nDone! All store assets generated.');
}

main().catch(console.error);
