#!/usr/bin/env node
/**
 * Marketing render entrypoint — drives marketing/shots.manifest.json.
 *
 * Every render is guarded (assertStagingServer) and stamped (provenance sidecar),
 * so we cannot repeat the failure that made the asset library stale: rendering
 * against an old checkout and never noticing.
 *
 * Usage:
 *   node scripts/marketing/render.mjs --list
 *   node scripts/marketing/render.mjs --id showcase-room-velario
 *   node scripts/marketing/render.mjs --scenes corridor            # everything a corridor change invalidates
 *   node scripts/marketing/render.mjs --phase 2
 *   node scripts/marketing/render.mjs --scenes room,corridor --dry
 *
 * Notes:
 *  - Only kind:"still" is rendered here. kind:"video"/"assemble" entries print the
 *    recorder command to run (those drive multi-step flows; see 'renderer').
 *  - Requires a dev server for THIS worktree:  npx next dev -p 3002
 */
import { readFileSync, rmSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import {
  REPO, BASE, paths, ensureDir, stamp, sceneCommit,
  assertStagingServer, GPU_ARGS, EDGE, ASSEMBLY_WAIT_MS, waitForScene,
} from "./kit.mjs";

const MANIFEST = resolve(REPO, "marketing", "shots.manifest.json");

function parseArgs(argv) {
  const a = { ids: [], scenes: [], phases: [], list: false, dry: false, wait: ASSEMBLY_WAIT_MS };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--list") a.list = true;
    else if (k === "--dry") a.dry = true;
    else if (k === "--id") a.ids.push(argv[++i]);
    else if (k === "--scenes") a.scenes.push(...argv[++i].split(",").map((s) => s.trim()));
    else if (k === "--phase") a.phases.push(Number(argv[++i]));
    else if (k === "--wait") a.wait = Number(argv[++i]);
    else throw new Error(`Unknown arg: ${k}`);
  }
  return a;
}

function select(shots, a) {
  let out = shots;
  if (a.ids.length) out = out.filter((s) => a.ids.includes(s.id));
  if (a.scenes.length) out = out.filter((s) => (s.scenes || []).some((x) => a.scenes.includes(x)));
  if (a.phases.length) out = out.filter((s) => a.phases.includes(s.phase));
  return out;
}

const qs = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : "";
};

async function renderStill(page, shot, args) {
  const url = `${BASE}${shot.route}${qs(shot.params)}`;
  const [w, h] = shot.viewport || [1600, 900];
  const out = resolve(REPO, shot.out);
  ensureDir(dirname(out));

  await page.setViewport({ width: w, height: h, deviceScaleFactor: shot.dsf || 2 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  // Wait for the scene to settle rather than guessing: a fixed 18s wait shot the
  // first batch mid-reveal-veil and desaturated everything (grey runner).
  const waited = await waitForScene(page);
  process.stdout.write(`(settled ${waited}s) `);

  // Hide dev chrome + any fixed consent overlay so it never lands in a deliverable.
  await page.evaluate(() => {
    document.getElementById("staging-dev-panel")?.style.setProperty("display", "none", "important");
    // Next.js dev-tools badge — an "N" circle bottom-left. It lives in a
    // <nextjs-portal> web component, so a normal selector sweep misses it and it
    // silently ended up in every shot.
    for (const el of document.querySelectorAll("nextjs-portal,[data-nextjs-toast],[data-next-badge-root],#__next-build-watcher")) {
      el.remove();
    }
    for (const el of document.querySelectorAll("div,section,aside")) {
      const t = el.textContent || "";
      if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400
          && getComputedStyle(el).position === "fixed") {
        el.style.setProperty("display", "none", "important");
      }
    }
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 400));

  // ⚠️ Encode by EXTENSION. This used to map .jpg -> jpeg and everything else to
  // png, then write to whatever path was asked for — so shot-*.webp were PNGs
  // wearing a .webp name. Puppeteer cannot emit WebP, so shoot PNG and transcode.
  const ext = extname(out).toLowerCase();
  if (ext === ".webp") {
    const tmp = `${out}.tmp.png`;
    await page.screenshot({ path: tmp, type: "png" });
    // q95, not lossless. Lossless ran 1.4-2 MB per image — on a landing-page
    // carousel that is a real cost. At 1:1 on the compass-bar text q95 is
    // indistinguishable from lossless at roughly a fifth of the size.
    execSync(`ffmpeg -y -v error -i "${tmp}" -quality 95 "${out}"`, { stdio: "inherit" });
    rmSync(tmp, { force: true });
  } else {
    const type = ext === ".jpg" ? "jpeg" : "png";
    await page.screenshot({ path: out, type, ...(type === "jpeg" ? { quality: 92 } : {}) });
  }
  stamp(out, { shotId: shot.id, url, viewport: [w, h], dsf: shot.dsf || 2, scenes: shot.scenes });
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const shots = select(manifest.shots, args);

  if (!shots.length) {
    console.error("No shots matched. Try --list.");
    process.exit(1);
  }

  if (args.list) {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`\n${pad("ID", 30)}${pad("PH", 4)}${pad("KIND", 10)}${pad("SCENES", 20)}OUT`);
    console.log("-".repeat(110));
    for (const s of shots) {
      console.log(`${pad(s.id, 30)}${pad(s.phase, 4)}${pad(s.kind, 10)}${pad((s.scenes || []).join(","), 20)}${s.out}`);
    }
    console.log(`\n${shots.length} shot(s). scene-commit would be: ${sceneCommit()}\n`);
    return;
  }

  const stills = shots.filter((s) => s.kind === "still");
  const others = shots.filter((s) => s.kind !== "still");

  if (args.dry) {
    console.log(`DRY RUN — ${stills.length} still(s), ${others.length} delegated`);
    for (const s of stills) console.log(`  still  ${s.id} -> ${s.out}\n         ${BASE}${s.route}${qs(s.params)}`);
    for (const s of others) console.log(`  ${s.kind}  ${s.id} -> ${s.out}\n         renderer: ${s.renderer}`);
    return;
  }

  if (stills.length) {
    await assertStagingServer();
    console.log(`Rendering ${stills.length} still(s) from ${BASE}  [scene-commit ${sceneCommit()}]`);
    const browser = await puppeteer.launch({
      headless: false,           // headful: a backgrounded tab pauses rAF -> black canvas
      executablePath: EDGE,
      args: [...GPU_ARGS, "--window-size=1700,1100"],
      protocolTimeout: 180000,
      ignoreDefaultArgs: ["--enable-automation"],
    });
    try {
      const page = await browser.newPage();
      for (const s of stills) {
        process.stdout.write(`  ${s.id} ... `);
        const out = await renderStill(page, s, args);
        console.log(`ok -> ${out.replace(REPO, ".")}`);
      }
    } finally {
      await browser.close();
    }
  }

  if (others.length) {
    console.log(`\n${others.length} entr(y/ies) need their recorder (multi-step flows, run manually):`);
    for (const s of others) {
      console.log(`  ${s.id}  [${s.kind}] -> ${s.out}`);
      console.log(`     node ${s.renderer}`);
      if (s.dependsOn) console.log(`     depends on: ${s.dependsOn.join(", ")}`);
    }
  }
}

// Set exitCode rather than process.exit(): a hard exit while a fetch socket is
// still in flight trips a libuv assertion on Windows.
main().catch((e) => { console.error(`\n${e.message}\n`); process.exitCode = 1; });
