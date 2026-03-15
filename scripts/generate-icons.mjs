/**
 * Generate PWA icons and favicon for The Memory Palace app.
 *
 * Uses the `canvas` npm package to draw a classical building silhouette.
 * Run: node scripts/generate-icons.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

mkdirSync(iconsDir, { recursive: true });

// Colors from "Sunlit Gallery" design system
const TERRACOTTA = '#C17F59';
const LINEN = '#FAFAF7';

/**
 * Draw the classical building icon on a canvas context.
 * The icon is drawn within a square area of `size` pixels.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size - canvas size
 * @param {number} padding - padding from edges
 * @param {string} fillColor - color for the building
 */
function drawPalace(ctx, size, padding, fillColor) {
  const s = (v) => (v / 64) * (size - padding * 2) + padding;

  ctx.fillStyle = fillColor;

  // Pediment (triangle)
  ctx.beginPath();
  ctx.moveTo(s(32), s(6));
  ctx.lineTo(s(8), s(22));
  ctx.lineTo(s(56), s(22));
  ctx.closePath();
  ctx.fill();

  // Entablature
  roundRect(ctx, s(6), s(22), s(56) - s(6), s(26) - s(22), 1);

  // Columns
  const columns = [10, 21, 32, 43];
  for (const x of columns) {
    // Capital
    roundRect(ctx, s(x - 1), s(25), s(x + 6) - s(x - 1), s(27) - s(25), 1);
    // Shaft
    roundRect(ctx, s(x), s(26), s(x + 5) - s(x), s(52) - s(26), 2);
    // Base
    roundRect(ctx, s(x - 1), s(50), s(x + 6) - s(x - 1), s(52) - s(50), 1);
  }

  // Steps
  roundRect(ctx, s(4), s(52), s(60) - s(4), s(55) - s(52), 1);
  roundRect(ctx, s(2), s(55), s(62) - s(2), s(58) - s(55), 1);
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

/**
 * Generate a regular (non-maskable) icon: palace on linen background with rounded corners.
 */
function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Linen background
  ctx.fillStyle = LINEN;
  ctx.fillRect(0, 0, size, size);

  const padding = Math.round(size * 0.12);
  drawPalace(ctx, size, padding, TERRACOTTA);

  writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`Created ${outputPath} (${size}x${size})`);
}

/**
 * Generate a maskable icon: palace centered with extra safe-zone padding.
 * Maskable icons need content within the inner 80% (safe zone).
 */
function generateMaskableIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Linen background fills entire canvas
  ctx.fillStyle = LINEN;
  ctx.fillRect(0, 0, size, size);

  // Safe zone = inner 80%, so padding = 10% on each side + extra internal padding
  const safeZonePadding = Math.round(size * 0.10);
  const innerPadding = Math.round(size * 0.05);
  const totalPadding = safeZonePadding + innerPadding;

  drawPalace(ctx, size, totalPadding, TERRACOTTA);

  writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`Created ${outputPath} (${size}x${size}, maskable)`);
}

/**
 * Generate apple touch icon (180x180).
 */
function generateAppleTouchIcon(outputPath) {
  const size = 180;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = LINEN;
  ctx.fillRect(0, 0, size, size);

  const padding = Math.round(size * 0.12);
  drawPalace(ctx, size, padding, TERRACOTTA);

  writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`Created ${outputPath} (180x180, apple-touch-icon)`);
}

/**
 * Generate a minimal .ico file containing a 32x32 PNG.
 * ICO format: header + directory entry + embedded PNG.
 */
function generateFaviconIco(outputPath) {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background for .ico
  ctx.clearRect(0, 0, size, size);

  const padding = Math.round(size * 0.06);
  drawPalace(ctx, size, padding, TERRACOTTA);

  const pngBuffer = canvas.toBuffer('image/png');

  // Build ICO file
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: 1 = ICO
  header.writeUInt16LE(1, 4);     // number of images

  // Directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);      // width (0 means 256)
  entry.writeUInt8(size, 1);      // height
  entry.writeUInt8(0, 2);         // color palette
  entry.writeUInt8(0, 3);         // reserved
  entry.writeUInt16LE(1, 4);      // color planes
  entry.writeUInt16LE(32, 6);     // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);  // image size
  entry.writeUInt32LE(6 + 16, 12);           // offset to image data

  const ico = Buffer.concat([header, entry, pngBuffer]);
  writeFileSync(outputPath, ico);
  console.log(`Created ${outputPath} (32x32 .ico)`);
}

// Generate all icons
generateIcon(192, join(iconsDir, 'icon-192x192.png'));
generateIcon(512, join(iconsDir, 'icon-512x512.png'));
generateMaskableIcon(192, join(iconsDir, 'icon-maskable-192x192.png'));
generateMaskableIcon(512, join(iconsDir, 'icon-maskable-512x512.png'));
generateAppleTouchIcon(join(publicDir, 'apple-touch-icon.png'));
generateFaviconIco(join(publicDir, 'favicon.ico'));

console.log('\nAll icons generated successfully!');
