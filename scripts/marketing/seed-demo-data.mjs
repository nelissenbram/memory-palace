#!/usr/bin/env node
/**
 * Seed the review account with the content four screens need to stop being empty.
 *
 * `legacy` ("No legacy contacts yet"), `settings-family` (an empty Create-a-Group
 * form), `family-tree` (grey avatars, no names) and `interview` (the graceful
 * empty-chapter prose) all render perfectly and contain nothing. Every check in
 * the capture pipeline asked whether a screen had LOADED; none asked whether it
 * had DATA, so they led carousels in shipped clips. This fills them.
 *
 * Driven through the REAL UI rather than the database: the app's validation and
 * side effects then behave exactly as they do for a user, and no service key has
 * to exist on this machine.
 *
 * SAFETY
 *  - Creating a legacy contact is a plain insert (lib/auth/track-actions.ts).
 *    Outbound mail lives in /api/legacy/deliver and the legacy-check cron, both
 *    of which fire on a trigger, never on creation. Verified before writing this.
 *  - No invitations are sent. A family GROUP is created; nobody is invited.
 *  - Every address uses example.com, which RFC 2606 reserves precisely so it can
 *    never reach a real person.
 *  - This writes to the account Apple signs into for review. The data is
 *    deliberately neutral and obviously fictional.
 *
 * Usage: node scripts/marketing/seed-demo-data.mjs [--dry]
 */
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { REPO, GPU_ARGS, EDGE } from "./kit.mjs";

const BASE = process.env.MP_APP_BASE || "http://localhost:3002";
const PROFILE = resolve(REPO, "store-assets/review/_reviewacct-profile");
const DRY = process.argv.includes("--dry");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GROUP_NAME = "The Marchetti Family";
const CONTACTS = [
  { name: "Giulia Marchetti", email: "giulia@example.com", relationship: "Daughter" },
  { name: "Tomas Marchetti", email: "tomas@example.com", relationship: "Son" },
];

const browser = await puppeteer.launch({
  headless: false, executablePath: EDGE, userDataDir: PROFILE,
  args: [...GPU_ARGS, "--window-size=560,1040"],
  protocolTimeout: 240000, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });

/** Same fixed-position-safe visibility test the capture scripts use. */
const shown = `(e) => {
  const r = e.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const st = getComputedStyle(e);
  return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.1;
}`;

const clickText = (words) => page.evaluate((ws, shownSrc) => {
  const vis = eval(shownSrc);
  const norm = (s) => (s || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  const hit = [...document.querySelectorAll("button,a[role=button]")]
    .filter((b) => vis(b) && !b.disabled)
    .find((b) => norm(b.textContent) !== "skip to content" && ws.some((w) => norm(b.textContent).includes(w)));
  if (hit) { hit.click(); return hit.textContent.trim().slice(0, 40); }
  return null;
}, words, shown);

const fill = (selector, value) => page.evaluate((sel, val, shownSrc) => {
  const vis = eval(shownSrc);
  const el = [...document.querySelectorAll(sel)].filter(vis)[0];
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, val);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}, selector, value, shown);

const goto = async (path) => {
  // ?onboarding=off — every non-production host force-shows the walkthrough,
  // which otherwise sits over the form we are trying to fill.
  await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}onboarding=off`,
    { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  for (let i = 0; i < 8; i++) {
    const c = await clickText(["accept", "got it", "skip intro", "skip tutorial", "skip tour", "add photos later"]);
    if (!c) break;
    await sleep(1200);
  }
  await sleep(2500);
};

const report = [];

// ── 1. family group ─────────────────────────────────────────────────────────
await goto("/settings/family");
const hasGroup = await page.evaluate((name) => (document.body.innerText || "").includes(name), GROUP_NAME);
if (hasGroup) {
  report.push(`family group "${GROUP_NAME}" already exists — skipped`);
} else if (DRY) {
  report.push(`WOULD create family group "${GROUP_NAME}"`);
} else {
  const typed = await fill('input[type="text"], input:not([type])', GROUP_NAME);
  await sleep(400);
  const hit = typed ? await clickText(["create group"]) : null;
  await sleep(3000);
  const ok = await page.evaluate((name) => (document.body.innerText || "").includes(name), GROUP_NAME);
  report.push(ok ? `created family group "${GROUP_NAME}"`
    : `FAILED to create family group (typed=${typed}, button=${hit})`);
}

// ── 2. legacy contacts ──────────────────────────────────────────────────────
for (const c of CONTACTS) {
  await goto("/settings/legacy");
  const exists = await page.evaluate((n) => (document.body.innerText || "").includes(n), c.name);
  if (exists) { report.push(`legacy contact ${c.name} already exists — skipped`); continue; }
  if (DRY) { report.push(`WOULD add legacy contact ${c.name} <${c.email}>`); continue; }

  const opened = await clickText(["add your first contact", "add contact"]);
  if (!opened) { report.push(`FAILED ${c.name}: no add-contact button`); continue; }
  await sleep(1800);

  const okName = await fill('input[type="text"]:not([readonly]), input:not([type])', c.name);
  const okMail = await fill('input[type="email"]', c.email);
  await sleep(400);
  const saved = await clickText(["add contact", "save", "create"]);
  await sleep(3000);
  const there = await page.evaluate((n) => (document.body.innerText || "").includes(n), c.name);
  report.push(there ? `added legacy contact ${c.name}`
    : `FAILED ${c.name} (name=${okName}, email=${okMail}, save=${saved})`);
}

await browser.close();
console.log(`\n${DRY ? "DRY RUN" : "SEED"} — ${report.length} step(s)`);
for (const r of report) console.log(`   ${r}`);
console.log("\nRe-capture afterwards: node scripts/marketing/build-screen-library.mjs");
