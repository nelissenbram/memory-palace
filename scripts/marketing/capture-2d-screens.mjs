#!/usr/bin/env node
/**
 * Capture the 2D app screens (Library, Explore, Achievements) at App Store sizes.
 *
 * These are product UI, so the login-free /staging viewers cannot provide them —
 * and the store sets carried Library screenshots from 16 July and 2 September
 * that no longer match the shipped interface.
 *
 * ⚠️ Signs in as the APPLE REVIEW demo account, never the owner's. An earlier run
 * used the owner's session and produced screenshots containing real personal data
 * ("Good evening, Bram", real memories) — not something to ship to an app store.
 * Its own browser profile keeps the two sessions apart.
 *
 * Credentials are read at runtime from store-assets/APP_REVIEW_NOTES.md (the file
 * Apple reviewers are given) so nothing is hardcoded here.
 *
 * Usage: node scripts/marketing/capture-2d-screens.mjs [ios69|ipad13|both]
 */
import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureDir, GPU_ARGS, EDGE, REPO } from "./kit.mjs";

const BASE = process.env.MP_APP_BASE || "http://localhost:3002";
const PROFILE = resolve(REPO, "store-assets/review/_reviewacct-profile");
const which = (process.argv[2] || "both").toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── credentials ──────────────────────────────────────────────────────────────
const notes = readFileSync(resolve(REPO, "store-assets/APP_REVIEW_NOTES.md"), "utf8");
const EMAIL = (notes.match(/Email:\s*`([^`]+)`/i) || [])[1];
const PASS = (notes.match(/Password:\s*`([^`]+)`/i) || [])[1];
if (!EMAIL || !PASS) {
  console.error("Could not read demo credentials from store-assets/APP_REVIEW_NOTES.md");
  process.exit(1);
}
console.log(`Signing in as ${EMAIL}`);

const DEVICES = [
  { id: "ios69", w: 440, h: 956, dsf: 3, out: "store-assets/ios69" },     // 1320x2868
  { id: "ios65", w: 428, h: 926, dsf: 3, out: "store-assets/ios65" },     // 1284x2778
  { id: "ipad13", w: 1032, h: 1376, dsf: 2, out: "store-assets/ipad13" }, // 2064x2752
].filter((d) => which === "both" || which === d.id);

/** Route -> output name. Navigate by URL, not by clicking the tab bar: the tabs
 *  sit at the bottom on phone but the TOP on iPad, and a click that silently
 *  fails leaves you on the previous screen — which produced three identical
 *  Library shots. A goto either lands on the route or it does not. */
const SCREENS = [
  { path: "/library", tab: "library", file: "7-library" },
  { path: "/explore", tab: "explore", file: "6-explore" },
  { path: "/me", tab: "me", file: "8-achievements" },
];

const browser = await puppeteer.launch({
  headless: false, executablePath: EDGE, userDataDir: PROFILE,
  args: [...GPU_ARGS, "--window-size=1150,1050"],
  protocolTimeout: 240000, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();

const clickText = (words) => page.evaluate((ws) => {
  const vis = [...document.querySelectorAll("button,a")].filter((b) => b.offsetParent !== null && !b.disabled);
  for (const w of ws) {
    const hit = vis.find((b) => (b.textContent || "").trim().toLowerCase() === w
      || (b.getAttribute("aria-label") || "").trim().toLowerCase() === w);
    if (hit) { hit.click(); return hit.textContent.trim().slice(0, 30) || w; }
  }
  return null;
}, words);

// ⚠️ The session lives in a COOKIE here, not localStorage — checking only
// localStorage reported "sign-in failed" on a run that had in fact signed in.
// Belt and braces: token in either store, or /login redirected us away.
const loggedIn = () => page.evaluate(() =>
  Object.keys(localStorage).some((k) => /auth-token/.test(k))
  || /sb-[^=]*auth-token/.test(document.cookie)
  || !/\/login|\/register/.test(location.pathname)).catch(() => false);

async function clean() {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("nextjs-portal,[data-nextjs-toast],[data-next-badge-root]")) el.remove();
    for (const el of document.querySelectorAll("div,section,aside")) {
      const t = el.textContent || "";
      if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400
          && getComputedStyle(el).position === "fixed") el.style.setProperty("display", "none", "important");
    }
  }).catch(() => {});
}

// ── sign in (only if this profile is not already authenticated) ──────────────
await page.setViewport({ width: 440, height: 956, deviceScaleFactor: 2 });
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
await sleep(4000);

if (!(await loggedIn())) {
  await page.evaluate(({ email, pass }) => {
    const set = (el, v) => {
      const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      d.set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const e = document.querySelector('input[type=email],input[name=email],input[autocomplete="email"]');
    const p = document.querySelector('input[type=password]');
    if (e) set(e, email);
    if (p) set(p, pass);
  }, { email: EMAIL, pass: PASS });
  await sleep(700);
  await clickText(["sign in", "log in", "inloggen", "continue"]);
  for (let i = 0; i < 40 && !(await loggedIn()); i++) await sleep(1500);
}
if (!(await loggedIn())) { console.error("Sign-in failed."); await browser.close(); process.exit(1); }
console.log("Signed in.\n");

for (const dev of DEVICES) {
  const out = ensureDir(resolve(REPO, dev.out));
  await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: dev.dsf });
  await page.goto(`${BASE}/atrium`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await sleep(6000);
  for (let i = 0; i < 8; i++) {
    const c = await clickText(["i'll explore on my own", "skip intro", "accept", "skip tutorial"]);
    if (!c) break;
    await sleep(1800);
  }

  console.log(`== ${dev.id} (${dev.w * dev.dsf}x${dev.h * dev.dsf}) ==`);
  for (const s of SCREENS) {
    // Prefer clicking the in-app tab over a fresh goto: a hard navigation to
    // /library re-triggers the reading-comfort wizard, whose buttons this loop
    // cannot clear, whereas moving within the already-settled session does not.
    // Fall back to the URL when the tab is missing or the click does nothing.
    const before = await page.evaluate(() => location.pathname).catch(() => "");
    await clickText([s.tab]);
    await sleep(4000);
    const moved = await page.evaluate((p2) => location.pathname.startsWith(p2), s.path).catch(() => false);
    if (!moved) {
      console.log(`   ${s.file}: tab click did not land (was ${before}) — using URL`);
      await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
    }
    // The reading-comfort wizard reappears PER ROUTE, so dismissing it once before
    // the loop is not enough — it was captured as the Library twice.
    // ⚠️ PREFIX match, not exact. The wizard is multi-step and its second card's
    // button is labelled "Continue →" — an exact compare against "continue"
    // missed it, so the wizard was still on screen and got captured as Library.
    for (let i = 0; i < 10; i++) {
      const c = await page.evaluate(() => {
        const vis = [...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null && !b.disabled);
        const hit = vis.find((b) => /^(i'll explore on my own|skip intro|skip tutorial|accept|continue|got it|done)/i
          .test((b.textContent || "").trim()));
        if (hit) { hit.click(); return (hit.textContent || "").trim().slice(0, 30); }
        return null;
      }).catch(() => null);
      if (!c) break;
      await sleep(2000);
    }
    // Wait for CONTENT, not a fixed delay. /library sits on a logo-only splash for
    // a while; a 6 s wait captured that splash instead of the grid. Poll until the
    // page carries real text and images, then let it settle.
    const t0 = Date.now();
    for (;;) {
      const ready = await page.evaluate(() => {
        const txt = (document.body.innerText || "").replace(/\s+/g, " ").trim();
        const imgs = [...document.querySelectorAll("img,canvas")].filter((i) => i.getBoundingClientRect().width > 40).length;
        return txt.length > 240 || imgs >= 4;
      }).catch(() => false);
      if (ready || Date.now() - t0 > 40000) break;
      await sleep(800);
    }
    await sleep(3500);
    for (let i = 0; i < 4; i++) { if (!(await clickText(["skip tutorial", "next", "got it"]))) break; await sleep(1500); }
    await clean();
    await sleep(800);
    // Confirm we are actually on the intended route before saving.
    const at = await page.evaluate(() => location.pathname).catch(() => "");
    if (!at.startsWith(s.path)) { console.log(`   ${s.file}: landed on ${at} — SKIPPED`); continue; }
    const bad = await page.evaluate(() => {
      const t = document.body.innerText || "";
      if (/make this comfortable to read/i.test(t)) return "onboarding wizard";
      if (t.replace(/\s+/g, " ").trim().length < 120) return "loading splash";
      return null;
    }).catch(() => null);
    if (bad) { console.log(`   ${s.file}: ${bad} — SKIPPED`); continue; }
    await page.screenshot({ path: resolve(out, `${s.file}.png`), type: "png" });
    console.log(`   ${s.file}.png  (${at})`);
  }
  console.log("");
}

await browser.close();
console.log("Review before shipping.\n");
