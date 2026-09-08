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

/**
 * Family-tree people. Three generations, because a tree only reads as a tree
 * once it has more than one node — a single box looks worse than the empty
 * state it replaced.
 */
const PEOPLE = [
  { first: "Elena", last: "Marchetti", born: "1954" },
  { first: "Giulia", last: "Marchetti", born: "1981" },
  { first: "Tomas", last: "Marchetti", born: "1984" },
  { first: "Rosa", last: "Marchetti", born: "1928" },
];
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

/**
 * ⚠️ No eval(). The first version passed the visibility test in as a string and
 * called eval() inside the page — and the app ships
 * `script-src 'self' 'unsafe-inline'` with no 'unsafe-eval', so every call threw
 * silently and the script reported "no button" for buttons that were plainly
 * there ("Create Group", "+ Add your first contact"). The helper is inlined in
 * each evaluate instead.
 */
const clickText = (words) => page.evaluate((ws) => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.1;
  };
  const norm = (s) => (s || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  const hit = [...document.querySelectorAll("button,a[role=button]")]
    .filter((b) => vis(b) && !b.disabled)
    .find((b) => norm(b.textContent) !== "skip to content" && ws.some((w) => norm(b.textContent).includes(w)));
  if (hit) { hit.click(); return hit.textContent.trim().slice(0, 40); }
  return null;
}, words);

/**
 * ⚠️ EXACT match, for buttons whose label is a prefix of another button's.
 *
 * The add-person dialog saves with a button labelled just "Add", while the
 * toolbar above it carries "+ Add Person". A substring match finds the toolbar
 * one first and reopens the form instead of saving it — every person came back
 * as "save=+ Add Person" and nothing was written.
 */
const clickExact = (words) => page.evaluate((ws) => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.1;
  };
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const hit = [...document.querySelectorAll("button,a[role=button]")]
    .filter((b) => vis(b) && !b.disabled)
    .find((b) => ws.includes(norm(b.textContent)));
  if (hit) { hit.click(); return hit.textContent.trim().slice(0, 40); }
  return null;
}, words);

const fill = (selector, value) => page.evaluate((sel, val) => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden";
  };
  const el = [...document.querySelectorAll(sel)].filter(vis)[0];
  if (!el) return false;
  // React tracks its own value; a plain assignment is ignored on submit.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, val);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}, selector, value);

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
  // 5 s, not 2.5: the settings and tree pages hydrate slowly enough that the
  // first run found no form at all and reported "no button" for a page that was
  // simply not finished.
  await sleep(5000);
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

/**
 * Fill by PLACEHOLDER, not by position. The add-person form has six text inputs
 * in a row (names, two dates, two places) and indexing into them would silently
 * put a surname in a birthplace the moment the form gains a field.
 */
const fillByPlaceholder = (ph, value) => page.evaluate((phText, val) => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden";
  };
  const el = [...document.querySelectorAll("input")].filter(vis)
    .find((i) => (i.placeholder || "").toLowerCase().includes(phText.toLowerCase()));
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, val);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}, ph, value);

// -- 3. family tree ---------------------------------------------------------
for (const person of PEOPLE) {
  await goto("/family-tree");
  const full = `${person.first} ${person.last}`;
  const exists = await page.evaluate((n) => (document.body.innerText || "").includes(n), full);
  if (exists) { report.push(`tree: ${full} already there - skipped`); continue; }
  if (DRY) { report.push(`WOULD add ${full} to the family tree`); continue; }

  if (!(await clickText(["add person"]))) { report.push(`FAILED ${full}: no add-person button`); continue; }
  await sleep(2200);
  const okFirst = await fillByPlaceholder("first name", person.first);
  const okLast = await fillByPlaceholder("last name", person.last);
  await fillByPlaceholder("1850 or", person.born);
  await sleep(400);
  const saved = await clickExact(["add", "save", "create"]);
  await sleep(2600);
  const there = await page.evaluate((n) => (document.body.innerText || "").includes(n), full);
  report.push(there ? `tree: added ${full}`
    : `FAILED ${full} (first=${okFirst}, last=${okLast}, save=${saved})`);
}

// -- 4. life-story chapter --------------------------------------------------
/**
 * Attaching is THREE accordions deep, which is why an earlier attempt found
 * nothing and then reported success anyway. LifeStoryPanel renders
 * "Attach memories" as an expander; inside it a tree of wings; inside those,
 * rooms; and only inside a room are the memories, as checkboxes in labels whose
 * onChange calls toggleMemory(id). Clicking the expander alone reveals no
 * checkbox at all, so the first version hunted for "cards with an image", found
 * four in the ATRIUM BEHIND the panel and logged "attached 4 memories" while the
 * screen still read "No memories attached yet".
 *
 * Expand everything, then tick. Verified by reading the panel back.
 */
if (DRY) {
  report.push("WOULD attach memories to a Life Story chapter");
} else {
  await goto("/atrium");
  const opened = await clickText(["life story", "record your story"]);
  await sleep(3600);
  if (!opened) {
    report.push("FAILED life story: panel would not open");
  } else {
    await clickText(["attach memories"]);
    await sleep(2200);
    // Open every collapsed level until checkboxes exist. Bounded, because a
    // tree that never yields them should fail rather than spin.
    let boxes = 0;
    for (let round = 0; round < 6 && boxes === 0; round++) {
      await page.evaluate(() => {
        const vis = (e) => {
          const r = e.getBoundingClientRect();
          if (r.width < 20 || r.height < 10) return false;
          const s = getComputedStyle(e);
          return s.display !== "none" && s.visibility !== "hidden";
        };
        // Wing and room rows are buttons carrying a ▸/▾ affordance; the panel's
        // own controls (Weave, Record, Delete) are not, so match on the marker.
        for (const b of [...document.querySelectorAll("button")].filter(vis)) {
          const txt = (b.textContent || "");
          if (/[▸▾▴▹]/.test(txt) && b.getAttribute("aria-expanded") !== "true") b.click();
        }
      }).catch(() => {});
      await sleep(1200);
      boxes = await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]').length).catch(() => 0);
    }

    let ticked = 0;
    if (boxes) {
      ticked = await page.evaluate((want) => {
        const all = [...document.querySelectorAll('input[type="checkbox"]')].filter((c) => !c.checked);
        let n = 0;
        for (const c of all.slice(0, want)) { c.click(); n++; }
        return n;
      }, 5).catch(() => 0);
      await sleep(3000);
    }
    /**
     * ⚠️ Verify by looking for "N memories attached", NOT for the ABSENCE of
     * "No memories attached yet". The panel lists every chapter, so the empty
     * phrase is still on screen for the chapters we did not fill — the previous
     * check read that and reported failure while twenty memories were in fact
     * attached to the first chapter.
     */
    const got = await page.evaluate(() =>
      (document.body.innerText || "").match(/(\d+)\s*memor\w*\s*attached/i)?.[1] || null,
    ).catch(() => null);
    report.push(got
      ? `life story: chapter now has ${got} memories attached (ticked ${ticked} this run)`
      : `FAILED life story: ${boxes} checkbox(es) found, ${ticked} ticked, none stuck`);
  }
}

await browser.close();
console.log(`\n${DRY ? "DRY RUN" : "SEED"} — ${report.length} step(s)`);
for (const r of report) console.log(`   ${r}`);
console.log("\nRe-capture afterwards: node scripts/marketing/build-screen-library.mjs");
