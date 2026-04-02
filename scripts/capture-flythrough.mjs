/**
 * Automated Palace Flythrough Capture
 *
 * Usage:
 *   1. Start the dev server: npx next dev
 *   2. Run: npx playwright test scripts/capture-flythrough.ts
 *   OR run directly: npx tsx scripts/capture-flythrough.ts
 *
 * This script:
 *   - Opens the /flythrough page in a headed Chromium browser with WebGL
 *   - Waits for the 3D scene to load
 *   - Clicks "Record" to start the flythrough sequence
 *   - Waits for the recording to complete (~30 seconds)
 *   - The page auto-downloads the .webm file to the Downloads folder
 *   - You can then move it to public/palace-flythrough.webm
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FLYTHROUGH_URL = "http://localhost:3000/flythrough";
const TOTAL_DURATION_MS = 35_000; // 25s recording + buffer for fades + scene loads
const DOWNLOAD_DIR = path.resolve(__dirname, "..", "public");

async function main() {
  console.log("🎬 Launching browser for palace flythrough capture...");

  const browser = await chromium.launch({
    headless: false, // Need headed mode for WebGL rendering
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader", // Software WebGL fallback if no GPU
      "--enable-webgl",
      "--window-size=1920,1080",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  console.log("📍 Navigating to /flythrough...");
  await page.goto(FLYTHROUGH_URL, { waitUntil: "networkidle" });

  // Wait for Three.js canvas to appear
  console.log("⏳ Waiting for 3D scene to load...");
  await page.waitForSelector("canvas", { timeout: 30_000 });

  // Give the scene an extra moment to fully render
  await page.waitForTimeout(3000);

  // Click the Record button
  console.log("🔴 Starting recording...");
  const recordButton = page.locator("button", { hasText: "Record" });
  await recordButton.click();

  // Wait for recording to complete
  console.log(`⏱️  Recording in progress (~${TOTAL_DURATION_MS / 1000}s)...`);

  // Listen for the download event
  const downloadPromise = page.waitForEvent("download", { timeout: TOTAL_DURATION_MS + 10_000 });

  const download = await downloadPromise;

  // Save the video
  const savePath = path.join(DOWNLOAD_DIR, "palace-flythrough.webm");
  await download.saveAs(savePath);

  console.log(`✅ Flythrough saved to: ${savePath}`);
  console.log("🎬 The video is now ready on your landing page!");

  await browser.close();
}

main().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
