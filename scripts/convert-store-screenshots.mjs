// One-off: convert the v5 iOS store screenshots (portrait PNGs, ~1290×2796) into
// web-sized webp for the landing carousel. Safe to delete after running.
import sharp from "sharp";
import { mkdirSync } from "fs";

const SRC = "store-assets/v5/ios";
const OUT = "public/screenshots/store";
const NAMES = [
  "1-exterior", "2-entrance", "3-room", "4-family-tree",
  "5-interview", "6-explore", "7-library", "8-achievements",
];

mkdirSync(OUT, { recursive: true });

for (const n of NAMES) {
  const src = `${SRC}/screenshot-${n}-ios67.png`;
  const out = `${OUT}/screenshot-${n}.webp`;
  await sharp(src).resize({ width: 820 }).webp({ quality: 80 }).toFile(out);
  console.log("wrote", out);
}
console.log("done");
