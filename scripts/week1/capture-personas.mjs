// Persona-palace footage: hi-res 9:16 stills of /flythrough dressed with the
// seeded demo-palace media (run persona-select.mjs first). Per persona:
// corridor with their 4 photos+titles (cam alternates for variety) + room
// hearth with their hero memory on the mantel plaque.
// Usage: dev server on :3000, then  node scripts/week1/capture-personas.mjs
import puppeteer from "puppeteer";
import fs from "fs";

const WORK = "C:/Users/nelis/memory-palace/socials-kit/clips/work";
const OUT = `${WORK}/stills/personas`;
fs.mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(`${WORK}/personas/manifest.json`, "utf8"));

// Era-appropriate plaque years matching each hero memory's narrative period.
const HERO_YEAR = {
  "sol-alvarez": "2024", "kenji-tanaka": "2022", "rafa-chases-waves": "2019",
  "fatima-weaves": "1998", "mercedes-cocina": "2003", "eleanor-remembers": "1943",
  "giovanni-del-mare": "1962", "margit-garden": "1975",
};

const enc = encodeURIComponent;
const SHOTS = [];
manifest.forEach((p, i) => {
  const cps = p.corridor
    .map((c, n) => `cp${n + 1}=${enc(`${c.url}|${c.title}`)}`)
    .join("&");
  const cam = i % 2 === 1 ? "&cam=terminus" : "";
  SHOTS.push([`cor-${p.username}`, `/flythrough?scene=corridor${cam}&${cps}`]);
  SHOTS.push([
    `hearth-${p.username}`,
    `/flythrough?scene=room&fill=max&rcam=hearth&heroUrl=${enc(p.hero.url)}&heroTitle=${enc(p.hero.title)}&heroYear=${HERO_YEAR[p.username] || "2026"}`,
  ]);
});

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
  // Assemble-before-reveal veil lifts on onReady (≤10s viewer ceiling) + settle
  await new Promise((r) => setTimeout(r, 24000));
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
