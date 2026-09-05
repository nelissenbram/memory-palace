// Clip-kit round 8 — dramatize the RESTORE "before": authentic-looking aging
// on the archive scan (sepia fade, foxing blotches, scratches, crease, torn
// edge, dust) so the wipe delta reads on a phone (owner: effect too small).
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";

const R = "C:/Users/nelis/memory-palace/socials-kit/clips/work/restore";
const buf = await sharp(`${R}/cand3.jpg`).resize(1080, null).jpeg({ quality: 90 }).toBuffer();
const meta = await sharp(buf).metadata();
const PHOTO = `data:image/jpeg;base64,${buf.toString("base64")}`;
const W = 1080, H = meta.height;

// Deterministic pseudo-random (no Math.random in workflows-adjacent tooling,
// and reproducible renders are easier to iterate on).
let seed = 42;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const blotches = Array.from({ length: 26 }, () => ({
  x: rnd() * W, y: rnd() * H, r: 14 + rnd() * 90, o: 0.08 + rnd() * 0.22,
}));
const scratches = Array.from({ length: 9 }, () => ({
  x1: rnd() * W, y1: rnd() * H * 0.3, x2: rnd() * W, y2: H * (0.7 + rnd() * 0.3), w: 0.6 + rnd() * 1.6, o: 0.14 + rnd() * 0.3,
}));
const dust = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 2.2, o: 0.1 + rnd() * 0.4 }));

const body = `
  <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#efe3cd;">
    <img src="${PHOTO}" style="width:100%;height:100%;display:block;filter:sepia(0.55) contrast(0.78) brightness(1.06) blur(0.6px);">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(112,84,44,.38) 100%);"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(115deg, rgba(139,109,63,.25) 0%, transparent 30%, transparent 68%, rgba(139,109,63,.33) 100%);"></div>
    <svg style="position:absolute;inset:0;" width="${W}" height="${H}">
      ${blotches.map((b) => `<circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="#8b6a3a" opacity="${b.o}" filter="url(#soft)"/>`).join("")}
      ${scratches.map((s) => `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#f6efe2" stroke-width="${s.w}" opacity="${s.o}"/>`).join("")}
      ${dust.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="#3a2f22" opacity="${d.o}"/>`).join("")}
      <path d="M 0 ${H * 0.62} Q ${W * 0.3} ${H * 0.58}, ${W * 0.55} ${H * 0.63} T ${W} ${H * 0.60}" stroke="#fdf8ee" stroke-width="2.6" fill="none" opacity="0.55"/>
      <path d="M 0 ${H * 0.625} Q ${W * 0.3} ${H * 0.585}, ${W * 0.55} ${H * 0.635} T ${W} ${H * 0.605}" stroke="#7a6034" stroke-width="1.4" fill="none" opacity="0.45"/>
      <path d="M ${W * 0.86} 0 L ${W} 0 L ${W} ${H * 0.09} Z" fill="#efe3cd" opacity="0.95"/>
      <path d="M ${W * 0.858} 0 L ${W} ${H * 0.092}" stroke="#b39a6e" stroke-width="2.4" opacity="0.8"/>
      <defs><filter id="soft"><feGaussianBlur stdDeviation="7"/></filter></defs>
    </svg>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><body style="margin:0;">${body}</body></html>`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${R}/damaged.png`, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
console.log(`wrote damaged.png (${W}x${H})`);
