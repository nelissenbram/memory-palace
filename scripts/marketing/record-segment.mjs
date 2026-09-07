#!/usr/bin/env node
/**
 * Record ONE tour segment: drive a scene URL, capture the WebGL canvas, transcode
 * to a consistently-graded mp4, and stamp it.
 *
 * This exists because the old tour chain had a hole: build_tour.mjs consumes seven
 * "graded" segments (scripts/hero_rec2/seg2/s0..s6.mp4) but NOTHING in the repo
 * produced them from the raw takes — that step was done by hand and never written
 * down, so the tour could not be rebuilt reproducibly. Now it can.
 *
 * Usage:
 *   node scripts/marketing/record-segment.mjs <outName> "<query>" [seconds] [w] [h]
 * Example:
 *   node scripts/marketing/record-segment.mjs s2 "scene=corridor&walk=1&wing=roots" 13 1920 1080
 */
import puppeteer from "puppeteer";
import { execSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE, ensureDir, stamp, assertStagingServer, GPU_ARGS, REPO } from "./kit.mjs";

const [, , outName, query = "", secsRaw = "13", wRaw = "1920", hRaw = "1080"] = process.argv;
if (!outName) { console.error("usage: record-segment.mjs <outName> \"<query>\" [secs] [w] [h]"); process.exitCode = 1; }

const SECS = Number(secsRaw), W = Number(wRaw), H = Number(hRaw);
const OUT_DIR = ensureDir(resolve(REPO, "scripts/hero_rec2/seg3"));
const webm = resolve(OUT_DIR, `${outName}.webm`);
const mp4 = resolve(OUT_DIR, `${outName}.mp4`);

/**
 * One shared grade for every segment so the xfade joins cannot show a colour
 * jump — the reason we re-record all seven rather than only the stale ones.
 * Gentle: the scene is already graded in-engine (NeutralToneMapping at canon
 * EXPOSURE); this only normalises contrast/saturation across takes.
 */
const GRADE = "eq=contrast=1.04:saturation=1.03:gamma=0.99,unsharp=5:5:0.4:5:5:0.0";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await assertStagingServer();
  const url = `${BASE}/flythrough?${query}`;
  console.log(`[${outName}] ${url}  (${SECS}s @ ${W}x${H})`);

  const browser = await puppeteer.launch({
    headless: false,          // a backgrounded tab pauses rAF -> black canvas
    args: [...GPU_ARGS, `--window-size=${W / 2 + 40},${H / 2 + 120}`, "--autoplay-policy=no-user-gesture-required"],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    protocolTimeout: 240000,
    ignoreDefaultArgs: ["--enable-automation"],
  });

  try {
    const page = await browser.newPage();
    page.on("console", (m) => { const t = m.text(); if (t.startsWith("[rec]") || t.includes("reveal")) console.log("   ", t); });

    let saved = null;
    await page.exposeFunction("saveSegment", (b64) => { saved = Buffer.from(b64, "base64"); });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});

    // Wait for a STABLE canvas before arming. The first attempt armed early and
    // lost everything on scene=exterior: that scene logs "reveal (assembled)"
    // twice — it remounts — and a remount replaces the canvas the MediaRecorder
    // was bound to, so the stream ends and no data is ever produced. Arming only
    // once the same canvas element has persisted for a while avoids the race and
    // also removes the need to guess a fixed assembly wait per scene.
    const stableFor = 2500, capMs = 45000, t0 = Date.now();
    let lastKey = "", stableSince = 0;
    for (;;) {
      const key = await page.evaluate(() => {
        const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
        if (!c || !c.width) return "";
        if (!c.dataset.recId) c.dataset.recId = String(Math.floor(performance.now()));
        return `${c.dataset.recId}:${c.width}x${c.height}`;
      }).catch(() => "");
      const now = Date.now();
      if (key && key === lastKey) {
        if (!stableSince) stableSince = now;
        if (now - stableSince >= stableFor) break;
      } else { lastKey = key; stableSince = 0; }
      if (now - t0 > capMs) { if (key) break; throw new Error("no canvas appeared within 45s"); }
      await sleep(400);
    }
    console.log(`    canvas stable after ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    // Hide dev/consent chrome, arm on the settled canvas, reset any scripted move.
    const armed = await page.evaluate(() => {
      document.getElementById("staging-dev-panel")?.style.setProperty("display", "none", "important");
      for (const el of document.querySelectorAll("div,section,aside")) {
        const t = el.textContent || "";
        if (/cookies?|Privacy Policy|Accept|Reject/i.test(t) && t.length < 400 && getComputedStyle(el).position === "fixed") {
          el.style.setProperty("display", "none", "important");
        }
      }
      const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (!c) return false;
      try {
        const rec = new MediaRecorder(c.captureStream(30), { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 16_000_000 });
        const chunks = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          const buf = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
          const bytes = new Uint8Array(buf); let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          window.saveSegment(btoa(bin));
        };
        window.__rec = rec;
        window.__walkReset = true;   // scripted moves restart on frame 1
        rec.start(500);
        console.log("[rec] armed " + c.width + "x" + c.height);
        return true;
      } catch (e) { console.log("[rec] arm failed " + String(e)); return false; }
    });
    if (!armed) throw new Error("could not arm recorder on the scene canvas");

    await sleep(SECS * 1000);
    await page.evaluate(() => { try { window.__rec?.stop(); } catch {} });

    for (let i = 0; i < 40 && !saved; i++) await sleep(500);
    if (!saved) throw new Error("recorder produced no data (canvas never armed?)");
    writeFileSync(webm, saved);
    console.log(`   webm ${(saved.length / 1e6).toFixed(1)} MB`);
  } finally {
    await browser.close();
  }

  execSync(
    `ffmpeg -y -v error -i "${webm}" -vf "${GRADE},scale=${W}:${H}:flags=lanczos,fps=30" ` +
    `-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -an "${mp4}"`,
    { stdio: "inherit" },
  );
  if (existsSync(mp4)) rmSync(webm, { force: true });
  stamp(mp4, { segment: outName, url, seconds: SECS, size: [W, H], grade: GRADE });
  console.log(`   -> ${mp4.replace(REPO, ".")}`);
}

main().catch((e) => { console.error(`\n${e.message}\n`); process.exitCode = 1; });
