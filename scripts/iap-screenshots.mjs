import puppeteer from "puppeteer";
import path from "path";

const OUTPUT_DIR = path.resolve("store-assets/iap-review");
const URL = "https://thememorypalace.ai/pricing";

const WIDTH = 1290;
const HEIGHT = 2796;

async function scrollToText(page, text) {
  await page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim() === t) {
        const el = walker.currentNode.parentElement;
        el.scrollIntoView({ block: "start" });
        window.scrollBy(0, -40);
        return;
      }
    }
  }, text);
  await new Promise((r) => setTimeout(r, 500));
}

async function clickToggle(page, label) {
  await page.evaluate((l) => {
    const all = Array.from(document.querySelectorAll("button, [role='tab'], label, span"));
    const btn = all.find((b) => b.textContent.trim().toLowerCase() === l.toLowerCase());
    if (btn) btn.click();
  }, label);
  await new Promise((r) => setTimeout(r, 1000));
}

async function main() {
  const { mkdirSync } = await import("fs");
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: Math.floor(WIDTH / 3), height: Math.floor(HEIGHT / 3), deviceScaleFactor: 3 },
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Default = Annual toggle

  // Keeper Annual — scroll to "Keeper" heading
  await scrollToText(page, "Keeper");
  await page.screenshot({ path: path.join(OUTPUT_DIR, "keeper-annual.png") });

  // Guardian Annual — scroll to "Guardian" heading
  await scrollToText(page, "Guardian");
  await page.screenshot({ path: path.join(OUTPUT_DIR, "guardian-annual.png") });

  // Switch to Monthly
  await clickToggle(page, "Monthly");

  // Keeper Monthly
  await scrollToText(page, "Keeper");
  await page.screenshot({ path: path.join(OUTPUT_DIR, "keeper-monthly.png") });

  // Guardian Monthly
  await scrollToText(page, "Guardian");
  await page.screenshot({ path: path.join(OUTPUT_DIR, "guardian-monthly.png") });

  await browser.close();

  const { execSync } = await import("child_process");
  for (const file of ["keeper-annual.png", "keeper-monthly.png", "guardian-annual.png", "guardian-monthly.png"]) {
    const fp = path.join(OUTPUT_DIR, file);
    const info = execSync(`magick identify "${fp}"`).toString().trim();
    console.log(info);
  }
  console.log("Done — 4 screenshots ready");
}

main().catch((err) => { console.error(err); process.exit(1); });
