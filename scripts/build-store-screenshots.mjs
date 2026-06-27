import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = "store-assets/June2026b/BramManualJune2026";
const APPSTORE = "store-assets/June2026b/appstore";
const LANDING = "public/screenshots/store";
fs.mkdirSync(APPSTORE, { recursive: true });

const TARGET_W = 1290, TARGET_H = 2796; // App Store iPhone 6.7"/6.9"

async function edgeColor(buf, top) {
  const m = await sharp(buf).metadata();
  const y = top ? 2 : m.height - 3;
  const { channels } = await sharp(buf).extract({ left: 0, top: y, width: m.width, height: 2 }).stats();
  const [r, g, b] = channels.map((c) => Math.round(c.mean));
  return { r, g, b };
}

// Scale to target width, then letterbox (pad top/bottom) to exact 1290x2796 with
// the screen's own edge colors — no crop, no distortion.
async function normalize(buf) {
  const m = await sharp(buf).metadata();
  const scaledH = Math.round((TARGET_W / m.width) * m.height);
  const resized = await sharp(buf).resize(TARGET_W, scaledH, { kernel: "lanczos3" }).toBuffer();
  const diff = TARGET_H - scaledH;
  if (diff === 0) return sharp(resized).png().toBuffer();
  if (diff < 0) {
    // taller than target — center-crop height (rare)
    return sharp(resized).extract({ left: 0, top: Math.floor(-diff / 2), width: TARGET_W, height: TARGET_H }).png().toBuffer();
  }
  const padTop = Math.floor(diff / 2), padBottom = diff - padTop;
  const top = await edgeColor(resized, true);
  const bottom = await edgeColor(resized, false);
  return sharp(resized)
    .extend({ top: padTop, background: top })
    .extend({ bottom: padBottom, background: bottom })
    .png().toBuffer();
}

// name -> source (one interview kept; Picture2==Picture4)
// Order matches the landing carousel (LANDING_NAMES) so each webp filename gets
// the correct content.
const SCREENS = [
  { name: "01-exterior", src: "Picture3.jpg" },
  { name: "02-corridor", src: "Picture7.jpg" },
  { name: "03-room-travel", src: "Picture9.jpg" },
  { name: "04-family-tree", src: "Picture12.jpg" },
  { name: "05-interview", src: "Picture4.jpg" },
  { name: "06-explore", src: "Picture5.jpg" },
  { name: "07-library", src: "Picture6.jpg" },
  { name: "08-achievements", src: "Picture8.jpg" },
];

// Landing carousel reuses the existing 8 filenames (page.tsx unchanged).
const LANDING_NAMES = [
  "1-exterior", "2-entrance", "3-room", "4-family-tree",
  "5-interview", "6-explore", "7-library", "8-achievements",
];

for (let i = 0; i < SCREENS.length; i++) {
  const s = SCREENS[i];
  const raw = await sharp(path.join(SRC, s.src)).toBuffer();
  const finalPng = await normalize(raw);
  fs.writeFileSync(path.join(APPSTORE, `${s.name}.png`), finalPng);
  // Landing webp (820 wide) from the same normalized frame.
  await sharp(finalPng).resize({ width: 820 }).webp({ quality: 82 })
    .toFile(path.join(LANDING, `screenshot-${LANDING_NAMES[i]}.webp`));
  console.log(`${s.name}  ->  appstore PNG (1290x2796) + landing webp screenshot-${LANDING_NAMES[i]}`);
}
console.log("\nDone.");
