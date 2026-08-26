// Hi-res 9:16 stills of the CURRENT palace scenes via /flythrough (owner
// 2026-08-26: clips must show the newest palace). 1620x2880 captures leave
// headroom for digital camera moves (ffmpeg zoompan) at 1080x1920 delivery.
// Usage: node scripts/week1/capture-stills.mjs   (dev server on :3000)
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/stills";
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = process.argv[2] === "round4" ? [
  ["hearth-papa", "/flythrough?scene=room&fill=max&rcam=hearth&heroUrl=%2Fdemo%2Fbetween-two-hands.jpg&heroTitle=You%20and%20Papa&heroYear=1992"],
  ["hearth-sea", "/flythrough?scene=room&fill=max&rcam=hearth&heroUrl=%2Fdemo%2Fedge-of-water.jpg&heroTitle=At%20the%20Sea&heroYear=2002"],
  ["cor-v2", "/flythrough?scene=corridor&cp1=%2Fdemo%2Fquiet-morning.jpg%7CSunday%20Morning&cp2=%2Fdemo%2Fpexels-alexander-mass-748453803-28107011.jpg%7CGolden%20Hour&cp3=%2Fdemo%2Fgraduation.jpg%7CGraduation&cp4=%2Fdemo%2Fquiet-morning.jpg%7CQuiet"],
  ["cor-v3-terminus", "/flythrough?scene=corridor&cam=terminus&cp1=%2Fdemo%2Fedge-of-water.jpg%7CAt%20the%20Sea&cp2=%2Fdemo%2Fgraduation.jpg%7CGraduation&cp3=%2Fdemo%2Fpexels-alexander-mass-748453803-28107011.jpg%7CGolden%20Hour&cp4=%2Fdemo%2Fbetween-two-hands.jpg%7CYou%20and%20Papa"],
] : process.argv[2] === "round3" ? [
  ["cor-portal", "/flythrough?scene=corridor&cam=portal"],
  ["room-bookcase2", "/flythrough?scene=room&fill=max&rcam=bookcase"],
  ["room-music", "/flythrough?scene=room&fill=max&rcam=music"],
  ["room-libportal", "/flythrough?scene=room&fill=max&rcam=libportal"],
  ["room-hearth-min", "/flythrough?scene=room&fill=min&rcam=hearth"],
] : process.argv[2] === "round2" ? [
  ["room-entry", "/flythrough?scene=room&fill=max&rcam=entry"],
  ["room-hearth", "/flythrough?scene=room&fill=max&rcam=hearth"],
  ["room-bookcase", "/flythrough?scene=room&fill=max&rcam=bookcase"],
] : [
  ["ext", "/flythrough?scene=exterior"],
  ["cor", "/flythrough?scene=corridor"],
  ["cor-terminus", "/flythrough?scene=corridor&cam=terminus"],
  ["cor-door", "/flythrough?scene=corridor&cam=door"],
  ["room-max", "/flythrough?scene=room&fill=max"],
];

const browser = await puppeteer.launch({
  headless: false,
  args: ["--window-size=1640,2900", "--force-device-scale-factor=1"],
  defaultViewport: { width: 1620, height: 2880 },
});
const page = await browser.newPage();

for (const [name, path] of SHOTS) {
  console.log("capturing", name);
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.waitForSelector("canvas", { timeout: 60000 });
  // Assemble-before-reveal veil lifts on onReady (â‰¤10s viewer ceiling) + settle
  await new Promise((r) => setTimeout(r, 24000));
  // Hide every top-level element that does not contain the canvas (viewer chrome)
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    for (const el of document.body.children) {
      if (!(el instanceof HTMLElement)) continue;
      if (!el.contains(canvas)) el.style.display = "none";
    }
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: 1620, height: 2880 } });
}
await browser.close();
console.log("done:", fs.readdirSync(OUT).join(", "));
