#!/usr/bin/env node
/**
 * Publish reviewed app screenshots to their deliverable paths.
 *
 * Split out of capture-app-screens.mjs after that script overwrote two real App
 * Store screenshots with a mis-captured screen. The landing ones were recoverable
 * from git; the socials-kit ones were NOT (that folder is gitignored there) and
 * survived only because stale copies happened to exist elsewhere.
 *
 * So: capture writes to a scratch dir, a human looks, and only then does this run.
 * It also backs up every destination it is about to overwrite, because some of
 * them have no version history at all.
 *
 * Usage:
 *   node scripts/marketing/publish-app-screens.mjs --dry   # show what would happen
 *   node scripts/marketing/publish-app-screens.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, copyFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { REPO, ensureDir, stamp } from "./kit.mjs";

const OUT = resolve(REPO, "store-assets/review/_appshots");
const PLAN = resolve(OUT, "publish-plan.json");
const BACKUP = resolve(REPO, "store-assets/review/_appshots-backup");
const DRY = process.argv.includes("--dry");

if (!existsSync(PLAN)) {
  console.error(`No publish plan at ${PLAN.replace(REPO, ".")}\nRun capture-app-screens.mjs first.`);
  process.exitCode = 1;
} else {
  const plan = JSON.parse(readFileSync(PLAN, "utf8"));
  ensureDir(BACKUP);
  let n = 0;

  for (const item of plan) {
    const src = resolve(REPO, item.source);
    if (!existsSync(src)) { console.log(`skip (no capture): ${item.source}`); continue; }

    for (const dest of item.targets) {
      const abs = dest.startsWith("public/") ? resolve(REPO, dest) : dest;
      if (DRY) { console.log(`would publish ${item.source} -> ${dest}`); continue; }

      // Back up whatever is there — assume it cannot be recovered any other way.
      if (existsSync(abs)) {
        const keep = resolve(BACKUP, `${Date.now()}-${basename(abs)}`);
        copyFileSync(abs, keep);
        console.log(`   backed up ${basename(abs)} -> ${keep.replace(REPO, ".")}`);
      }

      ensureDir(dirname(abs));
      const q = abs.endsWith(".webp") ? "-quality 82" : "";
      execSync(`ffmpeg -y -v error -i "${src}" ${q} "${abs}"`, { stdio: "inherit" });
      if (abs.startsWith(resolve(REPO))) stamp(abs, { source: item.source, publishedBy: "publish-app-screens" });
      console.log(`   published -> ${dest}`);
      n++;
    }
  }
  if (!DRY) console.log(`\n${n} file(s) published. Backups in ${BACKUP.replace(REPO, ".")}\n`);
}
