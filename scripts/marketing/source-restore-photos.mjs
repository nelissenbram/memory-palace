#!/usr/bin/env node
/**
 * Source damaged/faded ARCHIVE PORTRAITS for the RESTORE family (and LEGACY-07).
 *
 * Those clips need a genuine before/after pair: a photograph with real damage —
 * creases, foxing, silvering, a tear — that the app's GFPGAN restore can repair
 * on camera. None existed in the repo, which is why RESTORE was skipped and
 * LEGACY-07 could not be built.
 *
 * Wikimedia Commons rather than the Library of Congress: loc.gov answers 403 to
 * anything automated, while Commons has a documented API that returns the
 * LICENCE alongside the file. That matters more than convenience here — an
 * advert built on a photograph whose rights nobody checked is a liability, so
 * this refuses anything that is not public domain or CC0 and records provenance
 * for every file it keeps.
 *
 * It downloads ORIGINALS only. It does not restore them: that costs Replicate
 * credits against the owner's key, so the restore step stays a deliberate,
 * separate decision.
 *
 * Usage:
 *   node scripts/marketing/source-restore-photos.mjs --dry
 *   node scripts/marketing/source-restore-photos.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO, ensureDir } from "./kit.mjs";

const OUT = ensureDir(resolve(REPO, "socials-kit/restore-src"));
const DRY = process.argv.includes("--dry");
const WANT = 10;
const UA = "MemoryPalace-AssetSourcing/1.0 (bram@elyphont.com)";

/**
 * Only these. "No restrictions" is the Flickr Commons statement the catalogue
 * names; PD-old and CC0 are unambiguous. Anything requiring attribution in the
 * clip itself (CC BY, CC BY-SA) is excluded — a 20-second vertical video has
 * nowhere honest to put a credit line, and burying it is worse than not using
 * the photo.
 */
const OK_LICENCE = /^(public domain|no restrictions|cc0|pd-)/i;

/**
 * ⚠️ Search by PHOTOGRAPHIC PROCESS, not by the word "portrait".
 *
 * A first pass asked for "damaged photograph portrait woman" and came back with
 * Holbein, Vermeyen and Lorenzo di Credi — painted portraits, correctly
 * licensed and completely useless: you cannot restore a painting and claim it
 * was someone's grandmother. Naming the process (tintype, ambrotype, cabinet
 * card, carte de visite) selects photographs by construction, and those formats
 * are old enough to be public domain and fragile enough to be damaged.
 */
const QUERIES = [
  "tintype portrait unidentified",
  "ambrotype portrait unidentified",
  "cabinet card portrait unidentified woman",
  "carte de visite portrait unidentified",
  "daguerreotype portrait unidentified",
  "unidentified soldier tintype damaged",
];

/**
 * Reject painted or drawn works even when they slip through the search, and
 * reject NAMED subjects. A clip that says "your grandmother" over a recognisable
 * public figure is a lie about a real person, which no licence makes acceptable.
 * Titles like "Portrait of a Woman" or "Unidentified" are what we want; a proper
 * name in the title is a disqualification.
 */
const NOT_A_PHOTO = /painting|portrait of a lady by|oil on|engraving|lithograph|drawing|etching|sculpture|miniature/i;
const NAMED_PERSON = /(?:[A-Z][a-z]{2,}\s+){1,2}[A-Z][a-z]{2,}/;
const ANONYMOUS = /unidentified|unknown|portrait of a (?:wo)?man|an? (?:young )?(?:wo)?man|group of/i;

const api = (params) => {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams(params);
  const raw = execSync(`curl -s -A "${UA}" "${url}"`, { maxBuffer: 1 << 26 }).toString();
  return JSON.parse(raw);
};

const seen = new Set();
const picks = [];

for (const q of QUERIES) {
  if (picks.length >= WANT) break;
  const d = api({
    action: "query", format: "json", generator: "search",
    gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "24",
    prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "1600",
  });
  const pages = Object.values(d?.query?.pages || {});
  for (const p of pages) {
    if (picks.length >= WANT) break;
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const em = ii.extmetadata || {};
    const licence = em.LicenseShortName?.value || "";
    if (!OK_LICENCE.test(licence)) continue;
    // Portraits are taller than they are wide, or close to square. A 3:1
    // panorama is a landscape however damaged it looks.
    if (!ii.width || !ii.height || ii.width / ii.height > 1.4) continue;
    if (ii.width < 700) continue;
    const title = p.title.replace(/^File:/, "");
    if (NOT_A_PHOTO.test(title)) continue;
    /**
     * ⚠️ A NAME disqualifies, full stop — it used to be excused when the title
     * also said "unidentified" somewhere, which let through a portrait of a
     * named sergeant standing beside an unidentified woman. He is still a real,
     * named person, and no licence makes it acceptable to caption him as
     * somebody's grandfather.
     */
    if (NAMED_PERSON.test(title.replace(/\.[a-z]+$/i, ""))) continue;
    if (!ANONYMOUS.test(title)) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    picks.push({
      title,
      licence,
      credit: (em.Artist?.value || "unknown").replace(/<[^>]*>/g, "").trim().slice(0, 90),
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      file: ii.url,
      w: ii.width, h: ii.height,
      query: q,
    });
  }
}

console.log(`${picks.length} candidate(s) under an acceptable licence\n`);
for (const p of picks) console.log(`   ${p.licence.padEnd(16)} ${p.w}x${p.h}  ${p.title.slice(0, 62)}`);

if (DRY) {
  console.log("\n(dry run — nothing downloaded)");
  process.exit(0);
}

const kept = [];
for (const [i, p] of picks.entries()) {
  const name = `rs-${String(i + 1).padStart(2, "0")}.jpg`;
  const dest = resolve(OUT, name);
  if (!existsSync(dest)) {
    execSync(`curl -s -L -A "${UA}" "${p.file}" -o "${dest}"`, { stdio: "inherit" });
  }
  kept.push({ file: name, ...p });
}

/**
 * Provenance beside the pixels. Six months from now nobody will remember where
 * rs-04.jpg came from, and "we found it online" is not a licence.
 */
writeFileSync(resolve(OUT, "SOURCES.json"), JSON.stringify(kept, null, 2));
const md = ["# Restore source photographs", "",
  "Downloaded by scripts/marketing/source-restore-photos.mjs from Wikimedia Commons.",
  "Only public-domain / CC0 / no-restrictions files are accepted — anything needing",
  "attribution inside the clip is rejected, because a vertical 20-second video has",
  "nowhere honest to put a credit line.", "",
  "| file | licence | credit | source |", "|---|---|---|---|",
  ...kept.map((k) => `| ${k.file} | ${k.licence} | ${k.credit || "—"} | ${k.source} |`)].join("\n");
writeFileSync(resolve(OUT, "SOURCES.md"), md);
console.log(`\n${kept.length} file(s) -> ${OUT.replace(REPO, ".")}  (+ SOURCES.md)`);
console.log("Next: restore each through the app's GFPGAN flow to make the before/after pair.");
