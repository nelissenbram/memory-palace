import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = join(import.meta.dirname, "..", "public", "splash");
mkdirSync(OUTPUT_DIR, { recursive: true });

const SIZES = [
  { w: 1170, h: 2532, name: "1170x2532" },
  { w: 1179, h: 2556, name: "1179x2556" },
  { w: 1290, h: 2796, name: "1290x2796" },
  { w: 1284, h: 2778, name: "1284x2778" },
  { w: 1125, h: 2436, name: "1125x2436" },
  { w: 1242, h: 2688, name: "1242x2688" },
  { w: 828, h: 1792, name: "828x1792" },
  { w: 750, h: 1334, name: "750x1334" },
  { w: 1536, h: 2048, name: "1536x2048" },
  { w: 2048, h: 2732, name: "2048x2732" },
];

const BG = "#FAFAF7";
const ACCENT = "#C17F59";
const TEXT = "#2C2C2A";

function buildSVG(w, h) {
  // Scale factor relative to a 1170-wide baseline
  const s = w / 1170;

  // Icon dimensions
  const iconW = 220 * s;
  const iconH = 200 * s;
  const cx = w / 2;
  const cy = h / 2 - 80 * s;

  // Column parameters
  const colW = 18 * s;
  const colH = 120 * s;
  const baseY = cy + 40 * s; // bottom of columns
  const colTop = baseY - colH;

  // Pediment (triangle) sits on top of columns
  const pedH = 50 * s;
  const pedTop = colTop - pedH;
  const pedLeft = cx - iconW / 2 + 10 * s;
  const pedRight = cx + iconW / 2 - 10 * s;
  const pedPeak = cx;

  // Steps / base platform
  const stepH = 14 * s;
  const stepW1 = iconW + 30 * s;
  const stepW2 = iconW + 60 * s;

  // Column x-positions (5 columns evenly spaced)
  const numCols = 5;
  const colSpacing = (iconW - 40 * s) / (numCols - 1);
  const colStartX = cx - (iconW - 40 * s) / 2;

  let columns = "";
  for (let i = 0; i < numCols; i++) {
    const x = colStartX + i * colSpacing - colW / 2;
    // Column shaft
    columns += `<rect x="${x}" y="${colTop}" width="${colW}" height="${colH}" rx="${3 * s}" fill="${ACCENT}"/>`;
    // Column capital (small wider rect on top)
    columns += `<rect x="${x - 4 * s}" y="${colTop - 6 * s}" width="${colW + 8 * s}" height="${8 * s}" rx="${2 * s}" fill="${ACCENT}"/>`;
    // Column base
    columns += `<rect x="${x - 3 * s}" y="${baseY - 6 * s}" width="${colW + 6 * s}" height="${8 * s}" rx="${2 * s}" fill="${ACCENT}"/>`;
  }

  // Entablature (horizontal beam above capitals)
  const entY = colTop - 12 * s;
  const entH = 10 * s;
  const entablature = `<rect x="${pedLeft - 5 * s}" y="${entY - entH}" width="${pedRight - pedLeft + 10 * s}" height="${entH}" rx="${2 * s}" fill="${ACCENT}"/>`;

  // Adjusted pediment to sit on entablature
  const pedBaseY = entY - entH;
  const pediment = `<polygon points="${pedPeak},${pedBaseY - pedH} ${pedLeft - 10 * s},${pedBaseY} ${pedRight + 10 * s},${pedBaseY}" fill="${ACCENT}"/>`;

  // Small acroterion at peak
  const acroterion = `<circle cx="${pedPeak}" cy="${pedBaseY - pedH - 8 * s}" r="${8 * s}" fill="${ACCENT}" opacity="0.7"/>`;

  // Steps
  const steps = `
    <rect x="${cx - stepW1 / 2}" y="${baseY}" width="${stepW1}" height="${stepH}" rx="${3 * s}" fill="${ACCENT}" opacity="0.6"/>
    <rect x="${cx - stepW2 / 2}" y="${baseY + stepH - 2 * s}" width="${stepW2}" height="${stepH}" rx="${3 * s}" fill="${ACCENT}" opacity="0.4"/>
  `;

  // Text
  const fontSize = Math.round(48 * s);
  const textY = baseY + stepH * 2 + 70 * s;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <g>
    ${pediment}
    ${acroterion}
    ${entablature}
    ${columns}
    ${steps}
  </g>
  <text x="${cx}" y="${textY}" text-anchor="middle"
        font-family="'Cormorant Garamond', 'Georgia', 'Times New Roman', serif"
        font-size="${fontSize}" font-weight="400" letter-spacing="${2 * s}"
        fill="${TEXT}">The Memory Palace</text>
</svg>`;
}

async function generate() {
  console.log("Generating splash screens...");
  for (const { w, h, name } of SIZES) {
    const svg = buildSVG(w, h);
    const outPath = join(OUTPUT_DIR, `splash-${name}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`  Created ${outPath}`);
  }
  console.log("Done!");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
