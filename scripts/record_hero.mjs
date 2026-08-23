// Records the 25s palace flythrough (scenes 0-3) at 1920x1080 via the built-in
// recorder, with ?name=Guillaume. Downloads the webm to scripts/hero_rec/.
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT = path.resolve("scripts/hero_rec");
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const b = await puppeteer.launch({
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--no-sandbox", "--mute-audio", "--window-size=1920,1080"],
});
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const cdp = await p.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
p.on("console", (m) => { const t = m.text(); if (/record|Record|error|Error/.test(t) && !/DevTools/.test(t)) console.log("  [console]", t.slice(0, 140)); });

await p.goto("http://localhost:3000/flythrough?name=Guillaume", { waitUntil: "domcontentloaded", timeout: 60000 });
log("page loaded — waiting for scene assembly");
await new Promise((r) => setTimeout(r, 15000));
await p.screenshot({ path: `${OUT}/pre_record.png` });

const clicked = await p.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((x) => /^Record/i.test((x.innerText || "").trim()));
  if (btn) { btn.click(); return true; }
  return false;
});
if (!clicked) { log("ERROR: Record button not found"); await b.close(); process.exit(2); }
log("Record clicked — capturing");

// wait for the 4 per-scene webms (footage 25s + assembly waits; allow 150s)
const deadline = Date.now() + 150000;
let got = 0;
while (Date.now() < deadline) {
  const files = fs.readdirSync(OUT).filter((f) => /^palace-scene-\d\.webm$/.test(f));
  got = files.length;
  if (got >= 4) break;
  await new Promise((r) => setTimeout(r, 2000));
}
await new Promise((r) => setTimeout(r, 3000));
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith(".webm"))) {
  log(`  ${f} (${(fs.statSync(path.join(OUT, f)).size / 1e6).toFixed(1)} MB)`);
}
log(got >= 4 ? "DONE: 4 segments" : `TIMED OUT — only ${got} segments`);
await p.screenshot({ path: `${OUT}/post_record.png` });
await b.close();
process.exit(got >= 4 ? 0 : 2);
