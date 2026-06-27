import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = "store-assets/June2026b/BramManualJune2026";
const FT_RAW = "store-assets/June2026b/f359b57e-a3c9-4ba8-8ed7-85bed19d3558.png";
const APPSTORE = "store-assets/June2026b/appstore";
const LANDING = "public/screenshots/store";
fs.mkdirSync(APPSTORE, { recursive: true });

const TARGET_W = 1290, TARGET_H = 2796; // App Store iPhone 6.7"/6.9"
const STATUS_BAR_H = 168;               // native status-bar height to crop (FT only)

// Family-tree: erase person name+surname with the card's own background color
// (keeps the date line below). Boxes are on the native 1179x2556 image.
const FILL = { r: 246, g: 241, b: 233 };
const NAME_BOXES = [
  { x: 700, y: 700, w: 292, h: 122 },  // Guillaume
  { x: 600, y: 1012, w: 258, h: 122 }, // Albert
  { x: 855, y: 1012, w: 258, h: 122 }, // Marina
  { x: 245, y: 1362, w: 258, h: 122 }, // Bram
  { x: 605, y: 1362, w: 258, h: 122 }, // Kirsten
  { x: 935, y: 1362, w: 258, h: 122 }, // Gert
  { x: 720, y: 1709, w: 330, h: 122 }, // Ophélie (wider — name runs right)
  { x: 55,  y: 1694, w: 340, h: 122 }, // child (left, partial)
];

async function buildFamilyTree() {
  const base = await sharp(FT_RAW).toBuffer();
  const comps = NAME_BOXES.map((b) => ({
    input: { create: { width: b.w, height: b.h, channels: 3, background: FILL } },
    left: b.x, top: b.y,
  }));
  const erased = await sharp(base).composite(comps).toBuffer();
  // Crop the status bar so it matches the manual (already-cropped) screenshots.
  const meta = await sharp(erased).metadata();
  return sharp(erased)
    .extract({ left: 0, top: STATUS_BAR_H, width: meta.width, height: meta.height - STATUS_BAR_H })
    .toBuffer();
}

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
  { name: "04-family-tree", familyTree: true },
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

const ftBuf = await buildFamilyTree();

for (let i = 0; i < SCREENS.length; i++) {
  const s = SCREENS[i];
  const raw = s.familyTree ? ftBuf : await sharp(path.join(SRC, s.src)).toBuffer();
  const finalPng = await normalize(raw);
  fs.writeFileSync(path.join(APPSTORE, `${s.name}.png`), finalPng);
  // Landing webp (820 wide) from the same normalized frame.
  await sharp(finalPng).resize({ width: 820 }).webp({ quality: 82 })
    .toFile(path.join(LANDING, `screenshot-${LANDING_NAMES[i]}.webp`));
  console.log(`${s.name}  ->  appstore PNG (1290x2796) + landing webp screenshot-${LANDING_NAMES[i]}`);
}
console.log("\nDone.");
