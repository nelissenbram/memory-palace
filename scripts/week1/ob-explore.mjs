// Onboarding-preview explorer: walks /flythrough?scene=onboarding by clicking
// the primary CTA per card, screenshotting each phase so the recording run
// can be scripted precisely. Trace lands in work/obtrace/.
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/obtrace";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: false,
  args: ["--window-size=830,1560", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 810, height: 1440 },
});
const page = await browser.newPage();
await page.goto("http://localhost:3000/flythrough?scene=onboarding&mantelDemo=1", { waitUntil: "networkidle2", timeout: 120000 });

const snap = async (tag) => {
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null).map((b) => b.textContent?.trim().slice(0, 50))
  );
  fs.appendFileSync(`${OUT}/trace.txt`, `[${tag}] buttons: ${JSON.stringify(btns)}\n`);
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  return btns;
};

const clickByText = async (texts) => {
  return page.evaluate((wanted) => {
    const btns = [...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null);
    for (const w of wanted) {
      const hit = btns.find((b) => b.textContent && b.textContent.toLowerCase().includes(w.toLowerCase()));
      if (hit) { hit.click(); return w; }
    }
    return null;
  }, texts);
};

await new Promise((r) => setTimeout(r, 5000));
for (let step = 0; step < 10; step++) {
  const btns = await snap(`step${step}`);
  // Try common CTAs in priority order
  const clicked = await clickByText(["skip", "continue", "next", "start", "begin", "let's", "verder", "doorgaan"]);
  fs.appendFileSync(`${OUT}/trace.txt`, `  clicked: ${clicked}\n`);
  if (!clicked) {
    // Maybe a name input is required first
    const typed = await page.evaluate(() => {
      const inp = document.querySelector("input[type=text], input:not([type])");
      if (inp && inp.offsetParent !== null) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(inp, "Sofia");
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      return false;
    });
    fs.appendFileSync(`${OUT}/trace.txt`, `  typed name: ${typed}\n`);
    if (typed) { await new Promise((r) => setTimeout(r, 500)); await clickByText(["continue", "next", "verder"]); }
  }
  await new Promise((r) => setTimeout(r, 3500));
  const hasCanvas = await page.evaluate(() => !!document.querySelector("canvas"));
  if (hasCanvas) { fs.appendFileSync(`${OUT}/trace.txt`, `  canvas appeared at step ${step}\n`); await snap(`step${step}-canvas`); break; }
}
await snap("final");
await browser.close();
console.log(fs.readFileSync(`${OUT}/trace.txt`, "utf8"));
