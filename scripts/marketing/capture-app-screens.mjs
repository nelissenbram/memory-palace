#!/usr/bin/env node
/**
 * Capture the in-app screenshots the marketing set needs — the ones that show
 * the app's UI chrome (nav pills, joystick, tab bar) and therefore cannot come
 * from the login-free /staging viewers.
 *
 * Differences from scripts/capture-all-screenshots.mjs, both deliberate:
 *
 *  1. NO stdin prompt. That script blocks on ENTER in the terminal, which is
 *     unusable when it runs as a background process — nobody can press the key.
 *     This one POLLS until the browser is logged in and proceeds on its own.
 *
 *  2. It waits for the scene to actually settle before shooting. The landing
 *     carousel's shot-1 shipped a palace with NO DOME: the screenshot was taken
 *     before the dome GLB finished loading. Date-based triage can never catch
 *     that — the file looked current. waitForScene() + a model check does.
 *
 * Usage: node scripts/marketing/capture-app-screens.mjs
 *        (a browser opens; log in; capture proceeds automatically)
 */
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { ensureDir, GPU_ARGS, EDGE, REPO, waitForScene } from "./kit.mjs";

const BASE = process.env.MP_APP_BASE || "http://localhost:3002";
const KIT = "C:/Users/nelis/memory-palace/socials-kit/clips";
const OUT = resolve(REPO, "store-assets/review/_appshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Screens to capture, in navigation order. */
const TARGETS = [
  { id: "exterior", needsDome: true,  targets: ["public/landing/shots/shot-1.webp"] },
  { id: "corridor", needsDome: false, targets: ["public/landing/shots/shot-2.webp", `${KIT}/aso/clean/2-corridor.png`] },
  { id: "room",     needsDome: false, targets: ["public/landing/shots/shot-3.webp", `${KIT}/aso/clean/3-room-travel.png`] },
];

async function hideOverlays(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("div,section,aside")) {
      const t = el.textContent || "";
      if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400
          && getComputedStyle(el).position === "fixed") el.style.setProperty("display", "none", "important");
    }
  }).catch(() => {});
}

/** True once the palace GLBs are in the scene — guards the missing-dome bug. */
async function modelsLoaded(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas");
    return !!(c && c.width > 0);
  }).catch(() => false);
}

// PERSISTENT profile. Puppeteer's default temp profile is discarded on exit, so
// every fix-and-retry cost another manual login — and this flow needed several.
// With a fixed userDataDir the session survives, making iteration free.
const PROFILE = resolve(REPO, "store-assets/review/_appshots-profile");
ensureDir(PROFILE);

const browser = await puppeteer.launch({
  headless: false,
  executablePath: EDGE,
  userDataDir: PROFILE,
  args: [...GPU_ARGS, "--window-size=470,1000"],
  defaultViewport: { width: 430, height: 932, deviceScaleFactor: 2 },
  protocolTimeout: 240000,
  ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();

await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem("mp_nudges_skipped", "true");
    localStorage.setItem("mp_corridor_tour_seen_v1", "1");
    localStorage.setItem("mp_onboarding_walk_done", "true");
  } catch {}
});

console.log(`\nOpening ${BASE}/login — LOG IN in the browser window.`);
console.log("No key press needed; capture starts by itself once you are in.\n");
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});

// Poll for login instead of blocking on stdin.
// ⚠️ "URL is no longer /login" is NOT proof of a session. The first run passed
// that test while sitting on the anonymous LANDING page and captured three
// marketing pages instead of the palace. Require positive evidence that the
// authenticated app shell is on screen, and explicitly reject the landing page.
const deadline = Date.now() + 8 * 60 * 1000;
let announced = false;
for (;;) {
  const state = await page.evaluate(() => {
    const body = document.body?.innerText || "";
    const landing = /Create Your Palace|Turn a lifetime of memories/i.test(body);
    // Authenticated == a Supabase session token exists. Checking what is drawn on
    // screen is the wrong signal twice over: "not /login" matched the anonymous
    // landing page (captured three marketing pages), and requiring a canvas or
    // tab bar missed the Atrium, which is 2D and has neither.
    const hasSession = Object.keys(localStorage).some((k) => /^sb-.*auth-token/.test(k))
      || /sb-[^=]*auth-token/.test(document.cookie);
    return { url: location.href, landing, appShell: hasSession };
  }).catch(() => ({ url: page.url(), landing: false, appShell: false }));

  if (state.appShell && !state.landing) break;
  if (state.landing && !announced) {
    console.log("   still on the public landing page — log in in THIS window (Edge, fresh profile).");
    announced = true;
  }
  if (Date.now() > deadline) {
    console.error("\nTimed out: never saw the authenticated app shell.");
    console.error("The browser this script opens is a SEPARATE Edge profile — logging in");
    console.error("elsewhere does not carry over. Log in inside that window.\n");
    await browser.close(); process.exit(1);
  }
  await sleep(1500);
}
console.log("Authenticated app shell detected — continuing.\n");
await sleep(3000);

ensureDir(OUT);
const saved = [];

/** Click the first visible button/link whose text contains one of `words`. */
const clickText = (words) => page.evaluate((ws) => {
  const vis = [...document.querySelectorAll("button,a")].filter((b) => b.offsetParent !== null && !b.disabled);
  for (const w of ws) {
    const hit = vis.find((b) => (b.textContent || "").trim().toLowerCase().includes(w));
    if (hit) { hit.click(); return hit.textContent.trim().slice(0, 40); }
  }
  return null;
}, words);

// Navigation, measured rather than assumed (an earlier version clicked the centre
// of the canvas and bounced straight back to the Atrium):
//   /palace redirects to /atrium, which ALSO has a canvas — hence the guard below
//   checks more than "a canvas exists". "Enter Your Palace" opens the 3D view,
//   which greets you with a multi-step tutorial. Once dismissed, the top compass
//   bar ("Palace › Wing › Room") opens a picker for jumping to any wing or room.
await page.goto(`${BASE}/palace`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
await sleep(8000);
for (let i = 0; i < 10; i++) {
  const c = await clickText(["i'll explore on my own", "skip intro", "accept"]);
  if (!c) break;
  console.log(`   dismissed: "${c}"`);
  await sleep(2200);
}
console.log(`   enter -> ${await clickText(["enter your palace"])}`);
await sleep(4000);
for (let i = 0; i < 8; i++) {                        // the tutorial has several cards
  const c = await clickText(["skip tutorial"]);
  if (!c) break;
  await sleep(1800);
}

for (const t of TARGETS) {
  console.log(`● ${t.id}`);
  if (t.id !== "exterior") {
    // Open the compass picker and jump straight to the wing (corridor) or room.
    console.log(`   compass -> ${await clickText(["palace ›", "palace >", "palace"])}`);
    await sleep(2500);
    const dest = t.id === "corridor" ? ["roots"] : ["me, over time", "sunday", "roots"];
    console.log(`   pick -> ${await clickText(dest)}`);
    await sleep(5000);
  }

  const waited = await waitForScene(page, { settleMs: 3500, capMs: 60000 });
  if (t.needsDome && !(await modelsLoaded(page))) { console.log("   models not ready, waiting more"); await sleep(8000); }
  await hideOverlays(page);
  await sleep(600);

  // Refuse to save a frame that is plainly not the 3D scene. Two runs already
  // shipped the wrong thing silently (landing page, then the intro video); a
  // capture pipeline that cannot tell is worse than one that stops.
  const bad = await page.evaluate(() => {
    const body = document.body?.innerText || "";
    if (/Create Your Palace|Turn a lifetime of memories/i.test(body)) return "landing page";
    if (document.querySelector("video") && !document.querySelector("canvas")) return "intro video";
    // The Atrium dashboard ALSO renders a canvas, so "has canvas" is not enough —
    // that is exactly how two App Store screenshots got overwritten with it.
    if (/Kept warm|Suggested for you|Enter Your Palace|journeys/i.test(body)) return "atrium dashboard";
    if (!document.querySelector("canvas")) return "no 3D canvas";
    return null;
  }).catch(() => null);
  if (bad) { console.log(`   SKIPPED — ${bad}`); continue; }

  const png = resolve(OUT, `${t.id}.png`);
  await page.screenshot({ path: png, type: "png" });
  console.log(`   settled ${waited}s -> ${png.replace(REPO, ".")}`);
  saved.push({ ...t, png });
}

await browser.close();

// ⚠️ This script NO LONGER writes to the deliverable paths.
//
// It used to fan out straight into public/landing/shots/ and the socials-kit ASO
// folder. When a capture came out wrong (it photographed the Atrium — which also
// has a canvas, so the guard passed) it overwrote two real App Store screenshots.
// The landing ones were recoverable from git; the ASO ones were NOT, because
// socials-kit/ is gitignored in that worktree. They were only recovered because
// stale copies happened to exist in aso/landing-apple/.
//
// Captures now stop here, in a scratch directory. Publishing is a separate,
// deliberate step after the shots have been eyeballed:
//     node scripts/marketing/publish-app-screens.mjs
const plan = saved.map((s) => ({ source: s.png.replace(REPO, "."), targets: s.targets }));
writeFileSync(resolve(OUT, "publish-plan.json"), JSON.stringify(plan, null, 2));

console.log(`\n${saved.length}/${TARGETS.length} captured to ${OUT.replace(REPO, ".")}`);
if (saved.length < TARGETS.length) console.log("Some were SKIPPED — see above; nothing was published.");
console.log("Review them, then publish with:\n  node scripts/marketing/publish-app-screens.mjs\n");
