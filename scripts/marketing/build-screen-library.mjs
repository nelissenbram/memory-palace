#!/usr/bin/env node
/**
 * Capture the app-screen library the clip phone-inlays draw from.
 *
 * A clip's inlay should show the feature that clip is selling — an upload clip
 * showing the achievements sheet is noise. So each screen carries USP tags, and
 * build-clips picks three matching ones, never repeating within a clip.
 *
 * Shot 9:16 at phone size from the APPLE REVIEW demo account (never the owner's:
 * an earlier capture run produced screenshots full of real personal data).
 *
 * Usage:
 *   node scripts/marketing/build-screen-library.mjs            # all
 *   node scripts/marketing/build-screen-library.mjs upload     # by USP tag
 */
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir, GPU_ARGS, EDGE } from "./kit.mjs";

const BASE = process.env.MP_APP_BASE || "http://localhost:3002";
const PROFILE = resolve(REPO, "store-assets/review/_reviewacct-profile");
const OUT = ensureDir(resolve(REPO, "socials-kit/screens"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The library. `usp` drives per-clip selection; a screen may serve several.
 * Tags: upload, organise, restore, interview, family, share, discover, progress,
 *       capture, palace, memory.
 */
/**
 * The library. `usp` drives per-clip selection; a screen may serve several.
 * Tags: upload, organise, restore, interview, family, share, discover, progress,
 *       capture, palace, memory.
 *
 * `expect` is a fingerprint that PROVES the right page is on screen, and it is
 * the load-bearing field. Four capture rounds were lost to a growing list of
 * overlays to dismiss — the capture modal, the wing intro, a tutorial, a tour —
 * each round fixing one and revealing the next, every failure producing a
 * plausible-looking screenshot of the wrong thing. Enumerating what must NOT be
 * there is unbounded; asserting what MUST be there is not. A screen that cannot
 * show its fingerprint is skipped loudly instead of shipped quietly.
 */
const SCREENS = [
  // ⚠️ /atrium and /library are both intercepted by the 3D walkthrough
  // onboarding on the review account, which is why they kept coming back as the
  // wing-intro card. They will SKIP until that account has finished (or been
  // opted out of) the walkthrough — deliberately, rather than shipping the
  // intro card labelled as the Library.
  { id: "atrium",        path: "/atrium",   usp: ["palace", "organise"],
    expect: /Palace Visitors|Enter Your Palace|Your Atrium/i },
  { id: "library-grid",  path: "/library",  usp: ["upload", "organise", "memory"],
    expect: /Your Library|All Memories|Add memories|Upload/i },
  { id: "explore",       path: "/explore",  usp: ["discover", "share"],
    expect: /Explore Palaces/i },
  { id: "me",            path: "/me",       usp: ["progress", "family"],
    expect: /Edit profile/i },
  { id: "keps",          path: "/palace/keps",     usp: ["capture", "upload"],
    expect: /Meet Kep|Kep Capture/i },
  { id: "kep-new",       path: "/palace/keps/new", usp: ["capture", "upload"],
    expect: /Create a Kep|Choose source/i },
  // Every /settings/* route shares the same tab strip, so each fingerprint must
  // be the PAGE-specific heading — matching "Settings" would pass on all of them.
  { id: "settings-family", path: "/settings/family", usp: ["family", "share"],
    expect: /Your family group/i },
  { id: "settings-connections", path: "/settings/connections", usp: ["share", "upload"],
    expect: /PHOTO & FILE SOURCES/i },
  { id: "settings-sharing", path: "/settings/sharing", usp: ["share"],
    expect: /PUBLIC PALACE/i },
  { id: "settings-subscription", path: "/settings/subscription", usp: ["progress"],
    expect: /YOUR PLAN/i },
  // /legacy is a 404 — that directory holds only [token]/ and verified/, with no
  // page of its own. The real screen is /settings/legacy.
  { id: "legacy",        path: "/settings/legacy", usp: ["family", "memory"],
    expect: /There is no rush|Legacy contact/i },
  { id: "pricing",       path: "/pricing",  usp: ["progress"],
    expect: /SIMPLE, HONEST PRICING/i },
  { id: "help",          path: "/help",     usp: ["organise"],
    expect: /Help Center/i },
];


/**
 * Screens that are IMPORTED rather than captured, because the review account
 * cannot produce them. Owner decision: reuse the family-tree shot already
 * shipped as a store screenshot — that account has a populated tree, this one
 * has none, and seeding people into the review account would change what Apple
 * sees. Normalised to 1080x1920 so it drops into the carousel like the rest.
 */
const IMPORTED = [
  { id: "family-tree", usp: ["family"],
    from: "store-assets/ios69/4-family-tree.png",
    // Source is 1320x2868 (0.460) against the library's 0.5625, so filling the
    // frame crops ~18% of the height. Biased upward (0.35, not 0.5) to keep the
    // toolbar and the top generations rather than the empty pan area below.
    crop: 0.35 },
];

const only = (process.argv[2] || "").toLowerCase();
const todo = only ? SCREENS.filter((s) => s.usp.includes(only)) : SCREENS;
if (!todo.length) { console.error(`No screens tagged "${only}"`); process.exit(1); }

const browser = await puppeteer.launch({
  headless: false, executablePath: EDGE, userDataDir: PROFILE,
  args: [...GPU_ARGS, "--window-size=560,1040"],
  protocolTimeout: 240000, ignoreDefaultArgs: ["--enable-automation"],
});
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 }); // 1080x1920

/**
 * Dismiss-button matcher. Matches on SUBSTRING, not prefix: an earlier pass used
 * startsWith and so missed "I'll add photos later" whenever the apostrophe came
 * back as a typographic U+2019, and missed "Continue →" for the trailing arrow.
 * Apostrophes are normalised for the same reason.
 */
const clickText = (words) => page.evaluate((ws, nc) => {
  const norm = (s) => (s || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  // ⚠️ NOT offsetParent. offsetParent is null for every position:fixed element,
  // which is exactly what a modal is — so this filter used to hide precisely the
  // overlays it was meant to find. That one line is why four capture rounds each
  // "fixed" an overlay and then met the next one: the capture modal, the wing
  // intro, the tutorial and the tour were all invisible to the clicker.
  const shown = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const st = getComputedStyle(e);
    return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.1;
  };
  const vis = [...document.querySelectorAll("button,a[role=button]")]
    .filter((b) => shown(b) && !b.disabled);
  const hit = vis.find((b) => !nc.includes(norm(b.textContent))
    && ws.some((w) => norm(b.textContent).includes(w)));
  if (hit) { hit.click(); return hit.textContent.trim().slice(0, 28); }
  return null;
}, words, NEVER_CLICK);

/**
 * ⚠️ "add photos later" is the one that mattered. The onboarding wizard's capture
 * card ("Pick 3 photos to hang in your palace") is a MODAL: it covers whatever
 * route you navigated to. Without this entry the run photographed the modal over
 * and over, so /atrium and /library came out byte-identical, as did /palace/keps
 * and /kep — four screens, two pictures, all with plausible names and fresh
 * timestamps. Nothing downstream could tell.
 */
const DISMISS = [
  "add photos later", "explore on my own", "skip intro", "skip tutorial",
  "maybe later", "not now", "accept", "continue", "got it",
  // bare "skip" for the family-tree tutorial, whose button says only that.
  // "Skip to content" is the a11y skip-link and must survive: it is an <a>
  // without role=button, so the selector already excludes it — but it is also
  // filtered by name below, because that link becoming a button one day would
  // send every capture to the page footer.
  "skip",
  // The wing-intro card ("Apple Review's Roots Wing"). Like the capture modal it
  // sits over whatever route you asked for, and it appears in two variants:
  // "Skip intro" early, "Enter The Room" once the 3D scene has settled. Matching
  // only the first let the second through.
  "enter the room",
];
const NEVER_CLICK = ["skip to content"];

/**
 * Click every dismiss button that appears, until the screen stops offering any.
 * Returns what it clicked: a dismiss matcher that is too greedy will happily
 * press a NAVIGATION button, and then the run photographs the wrong page while
 * reporting success. Logging the presses is what makes that visible.
 */
const clearOverlays = async () => {
  const hits = [];
  for (let i = 0; i < 12; i++) {
    const c = await clickText(DISMISS);
    if (!c) break;
    hits.push(c);
    await sleep(1600);
  }
  return hits;
};

const manifest = [];
for (const s of todo) {
  await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  const clicked = await clearOverlays();
  /**
   * Wait for the page to actually BE the page.
   *
   * The old check was `text.length > 240 || imgs >= 3`, which settings/connections
   * satisfied with its static privacy note while every provider card was still a
   * grey placeholder — so the screenshot showed a page mid-load and read, as the
   * owner put it, as being about nothing.
   *
   * Three conditions now, all required:
   *   - no skeleton left. Matched on shimmer|skeleton ONLY: several *-pulse
   *     classes (ft-branch-pulse, mp-tour-pulse) are decorative, and waiting on
   *     those would never return.
   *   - no onboarding modal over the top.
   *   - real content present.
   */
  const t0 = Date.now();
  let ready = false, last = null;
  while (Date.now() - t0 < 40000) {
    const st = await page.evaluate((src, dv) => {
      // Same fixed-position trap as in clickText — see the note there.
      const vis = (e) => {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        const st = getComputedStyle(e);
        return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.1;
      };
      // shimmer|skeleton ONLY: several *-pulse classes (ft-branch-pulse,
      // mp-tour-pulse) are decorative, and waiting on those never returns.
      // ⚠️ Spinners count too. settings/sharing was captured showing "Loading
      // wings…" twice: its loader is a spinner component, not a shimmer block,
      // so a class-name check alone waved it straight through.
      const skel = [...document.querySelectorAll('[class*="shimmer" i],[class*="skeleton" i],[class*="spinner" i],[role="progressbar"]')].filter(vis).length
        + (/Loading[.…]|Loading \w+[.…]/i.test(document.body.innerText || "") ? 1 : 0);
      const t = (document.body.innerText || "").replace(/\s+/g, " ").trim();
      // ⚠️ A fingerprint proves the right page is UNDERNEATH — not that nothing
      // is on top of it. /explore matched "Explore Palaces" while a tutorial
      // card ("Skip tutorial / Next") sat over the middle of the frame. So also
      // require that no dismiss-vocabulary button is still on screen.
      const norm = (x) => (x || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
      const tour = [...document.querySelectorAll("button,a[role=button]")]
        .filter(vis)
        .map((b) => norm(b.textContent))
        .filter((x) => x !== "skip to content" && dv.some((w) => x.includes(w)));
      return { skel, tour, hit: new RegExp(src.slice(1, src.lastIndexOf("/")), "i").test(t), head: t.slice(0, 90) };
    }, String(s.expect), DISMISS).catch(() => null);
    if (st) last = st;
    if (st && !st.skel && st.hit && !st.tour.length) { ready = true; break; }
    // Overlays can appear LATE (the 3D tour only starts once the scene is up),
    // so keep dismissing throughout the wait rather than once before it.
    await clearOverlays();
    await sleep(700);
  }
  if (!ready) {
    const at = await page.evaluate(() => location.pathname).catch(() => "?");
    console.log(`   ${s.id}: SKIPPED — never showed ${s.expect} (at ${at})`);
    if (last) {
      console.log(`      saw: "${last.head}"`
        + (last.skel ? ` + ${last.skel} loader(s)` : "")
        + (last.tour?.length ? ` + overlay button(s): ${last.tour.join(", ")}` : ""));
    }
    continue;
  }
  await sleep(900);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("nextjs-portal,[data-nextjs-toast],[data-next-badge-root]")) el.remove();
    for (const el of document.querySelectorAll("div,section,aside")) {
      const t = el.textContent || "";
      if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400
          && getComputedStyle(el).position === "fixed") el.style.setProperty("display", "none", "important");
    }
  }).catch(() => {});
  await sleep(700);

  // (the old landing-page/splash heuristic lived here; the fingerprint covers it)

  /**
   * ⚠️ Re-verify AT THE SHUTTER. The readiness loop can pass and the tour can
   * then appear during the ~1.6 s of cleanup that follows — which is exactly how
   * /explore shipped with a "Skip tutorial / Next" card over its middle while
   * every check upstream reported success. Whatever is true two seconds before
   * the screenshot is not what the screenshot contains.
   */
  for (let i = 0; i < 6; i++) {
    const late = await page.evaluate((dv) => {
      const norm = (x) => (x || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
      const shown = (e) => {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        const st = getComputedStyle(e);
        return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.1;
      };
      return [...document.querySelectorAll("button,a[role=button]")].filter(shown)
        .map((b) => norm(b.textContent))
        .filter((x) => x !== "skip to content" && dv.some((w) => x.includes(w)));
    }, DISMISS).catch(() => []);
    if (!late.length) break;
    console.log(`   ${s.id}: late overlay (${late.join(", ")}) — dismissing`);
    await clearOverlays();
    await sleep(1200);
  }

  const png = resolve(OUT, `${s.id}.png`);
  await page.screenshot({ path: png, type: "png" });
  manifest.push({ id: s.id, usp: s.usp, file: `${s.id}.png` });
  console.log(`   ${s.id}  [${s.usp.join(",")}]`);
}
await browser.close();

// Imported screens: scale to fill 1080x1920 and crop with the configured bias.
for (const im of IMPORTED) {
  if (only && !im.usp.includes(only)) continue;
  const src = resolve(REPO, im.from);
  if (!existsSync(src)) { console.log(`   ${im.id}: missing ${im.from} — SKIPPED`); continue; }
  const dst = resolve(OUT, `${im.id}.png`);
  execSync(`ffmpeg -y -v error -i "${src}" -vf `
    + `"scale=1080:-1,crop=1080:1920:0:(ih-1920)*${im.crop}" "${dst}"`, { stdio: "inherit" });
  manifest.push({ id: im.id, usp: im.usp, file: `${im.id}.png` });
  console.log(`   ${im.id}  [${im.usp.join(",")}]  (imported from ${im.from})`);
}

// Sweep screens that are no longer in the library. The viewer lists the
// DIRECTORY, so a dropped entry would otherwise sit there looking current —
// which is how the retired kep-landing and family-tree shots kept showing up.
if (!only) {
  const keep = new Set(manifest.map((m) => m.file));
  for (const f of readdirSync(OUT).filter((f) => f.endsWith(".png"))) {
    if (!keep.has(f)) { unlinkSync(resolve(OUT, f)); console.log(`   swept stale ${f}`); }
  }
}
writeFileSync(resolve(OUT, "screens.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length}/${todo.length} captured -> ${OUT.replace(REPO, ".")}`);

/**
 * ⚠️ Fail LOUDLY on duplicates — PERCEPTUALLY, not byte-wise.
 *
 * md5 caught the first round (four screens, two pictures, because an overlay was
 * never dismissed). It then missed the second round completely: /atrium and
 * /library were both photographed showing the same wing-intro card over a live
 * 3D canvas, so the two files differed by one animation frame and roughly a
 * kilobyte. Identical to the eye, distinct to a hash.
 *
 * So compare an average hash: scale to 8x8 grey via ffmpeg (already required by
 * this pipeline), threshold each pixel against the mean, and call two screens
 * the same picture when the 64-bit codes are within HAMMING_MAX.
 */
// 3, not 6. At 8x8 every /settings/* page is the same tab strip over the same
// card over the same bottom nav, so a loose threshold called "Create a Group"
// and "Manage Published Content" the same picture. The fingerprint check above
// now proves each page's identity, which leaves this as a backstop against
// genuinely identical frames — the atrium/library pair differed by about one.
const HAMMING_MAX = 3;
const aHash = (file) => {
  const raw = execSync(
    `ffmpeg -v error -i "${file}" -vf scale=8:8,format=gray -f rawvideo -`,
    { maxBuffer: 1 << 20, encoding: "buffer" },
  );
  const px = [...raw.subarray(0, 64)];
  const mean = px.reduce((a, b) => a + b, 0) / 64;
  return px.map((v) => (v > mean ? 1 : 0));
};
const hamming = (a, b) => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0);

const hashes = manifest.map((m) => ({ id: m.id, h: aHash(resolve(OUT, m.file)) }));
const pairs = [];
for (let i = 0; i < hashes.length; i++) {
  for (let j = i + 1; j < hashes.length; j++) {
    const d = hamming(hashes[i].h, hashes[j].h);
    if (d <= HAMMING_MAX) pairs.push(`${hashes[i].id}  ~=  ${hashes[j].id}  (distance ${d})`);
  }
}
if (pairs.length) {
  console.error(`
✗ ${pairs.length} pair(s) look like the SAME screen:`);
  for (const p of pairs) console.error(`    ${p}`);
  console.error("  Causes seen so far: an overlay that was never dismissed, or a");
  console.error("  route that redirects onto another one. Review /staging/screens.");
  process.exit(1);
}
console.log(`✓ all ${manifest.length} screens visually distinct`);
