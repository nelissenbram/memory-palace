const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function processFile(inPath) {
  const img = sharp(inPath);
  const meta = await img.metadata();
  const { width, height } = meta;
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const bg = [data[0], data[1], data[2]];
  const tol = 6;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * ch;
      if (Math.abs(data[i] - bg[0]) > tol || Math.abs(data[i + 1] - bg[1]) > tol || Math.abs(data[i + 2] - bg[2]) > tol) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const newW = Math.round(bw * 0.95);
  const newH = Math.round(bh * 0.95);
  const content = await sharp(inPath).extract({ left: minX, top: minY, width: bw, height: bh }).resize(newW, newH).toBuffer();
  const bgPng = await sharp({ create: { width, height, channels: 4, background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } } }).png().toBuffer();
  const out = await sharp(bgPng).composite([{ input: content, left: Math.round((width - newW) / 2), top: Math.round((height - newH) / 2) }]).png().toBuffer();
  fs.writeFileSync(inPath, out);
  console.log("wrote", inPath, `${bw}x${bh} -> ${newW}x${newH}`);
}

(async () => {
  const files = [
    "public/icons/icon-maskable-512x512.png",
    "public/icons/icon-maskable-192x192.png",
    "public/icons/icon-512x512.png",
    "public/icons/icon-192x192.png",
    "public/icons/icon-pwa-512.png",
    "public/icons/icon-pwa-192.png",
    "public/apple-touch-icon.png",
  ];
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) await processFile(p);
    else console.log("skip", f);
  }
})().catch((e) => { console.error(e); process.exit(1); });
