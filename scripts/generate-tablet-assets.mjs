#!/usr/bin/env node
/**
 * Generate tablet screenshots by adapting the phone screenshots
 * to 7-inch (1200×1920) and 10-inch (1600×2560) tablet dimensions.
 */

import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'store-assets');

const screenshots = [
  'screenshot-1-exterior',
  'screenshot-2-entrance',
  'screenshot-3-room',
  'screenshot-4-upload',
  'screenshot-5-interview',
  'screenshot-6-map',
];

const tablets = [
  { suffix: '7inch', width: 1200, height: 1920 },
  { suffix: '10inch', width: 1600, height: 2560 },
];

async function main() {
  for (const tab of tablets) {
    console.log(`\n=== Generating ${tab.suffix} tablet screenshots (${tab.width}×${tab.height}) ===\n`);
    for (const name of screenshots) {
      const src = resolve(OUT, `${name}.png`);
      const dst = resolve(OUT, `${name}-${tab.suffix}.png`);

      await sharp(src)
        .resize(tab.width, tab.height, {
          fit: 'cover',
          position: 'top',
          background: { r: 250, g: 250, b: 247, alpha: 1 },
        })
        .png({ compressionLevel: 6 })
        .toFile(dst);

      console.log(`  ✓ ${name}-${tab.suffix}.png`);
    }
  }
  console.log('\n✅ All tablet screenshots generated');
}

main().catch(err => { console.error(err); process.exit(1); });
