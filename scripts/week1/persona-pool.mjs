// Build a pool of ALL unique photo memories across the seeded personas, then
// assign a UNIQUE photo to each clip that needs a hearth (owner 2026-08-31: no two
// clips may share a photo). Copies picks into public/demo/pool/ for /flythrough
// heroUrl capture, and writes an assignment manifest.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MEDIA = path.join(ROOT, "scripts", "populate", "media");
const PUB = path.join(ROOT, "public", "demo", "pool");
const OUTDIR = "C:/Users/nelis/memory-palace/socials-kit/clips/work/pool";
fs.mkdirSync(PUB, { recursive: true });
fs.mkdirSync(OUTDIR, { recursive: true });
const personas = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "populate", "personas.json"), "utf8"));
const memKey = (slug, ri, mi) => `${slug}-r${ri}-m${mi}`;

// era year per lifeStage (approx, for the plaque)
const YEAR = { parent: "2021", "young-adult": "2018", thirties: "2016", "mid-life": "2004", elder: "1968" };

// collect every photo memory whose file exists
const pool = [];
for (const p of personas) {
  for (const w of p.wings) {
    (w.rooms || []).forEach((room, ri) => {
      (room.memories || []).forEach((m, mi) => {
        if (m.type !== "photo") return;
        const file = `${memKey(w.slug, ri, mi)}.jpg`;
        const abs = path.join(MEDIA, p.username, file);
        if (fs.existsSync(abs)) pool.push({ persona: p.username, lifeStage: p.lifeStage, file, title: m.title, year: YEAR[p.lifeStage] || "2010", abs });
      });
    });
  }
}
// Clips that need a UNIQUE hearth photo (hearth beat), in order. Restore clips use
// restored portraits (separate) and are excluded here.
const HEARTH_CLIPS = [
  "GRAVE-01a","GRAVE-04a","GRAVE-04b","GRAVE-06a","GRAVE-07a","GRAVE-09a","GRAVE-10a","GRAVE-02a","GRAVE-03a",
  "NATIVE-01a","NATIVE-02a","NATIVE-04a","NATIVE-05a",
  "LEGACY-01a","LEGACY-02a","LEGACY-03a","LEGACY-05a","LEGACY-06a","LEGACY-07a",
  "PARENT-01a","PARENT-02a","PARENT-03a","PARENT-05a","PARENT-06a","PARENT-07a",
];
// deterministic spread: step through the pool so consecutive picks come from
// DIFFERENT personas (avoid clustering); guarantee uniqueness.
const byPersona = {};
for (const e of pool) (byPersona[e.persona] ||= []).push(e);
const personaKeys = Object.keys(byPersona).sort();
const picks = []; const used = new Set(); let pi = 0, guard = 0;
while (picks.length < HEARTH_CLIPS.length && guard < 5000) {
  const pk = personaKeys[pi % personaKeys.length]; pi++; guard++;
  const cand = byPersona[pk].find((e) => !used.has(e.abs));
  if (cand) { used.add(cand.abs); picks.push(cand); }
}
const manifest = HEARTH_CLIPS.map((code, i) => {
  const e = picks[i];
  const dest = path.join(PUB, `${code}.jpg`);
  fs.copyFileSync(e.abs, dest);
  return { code, url: `/demo/pool/${code}.jpg`, title: e.title, year: e.year, persona: e.persona };
});
fs.writeFileSync(path.join(OUTDIR, "assignment.json"), JSON.stringify(manifest, null, 2));
console.log(`pool: ${pool.length} unique photos across ${personaKeys.length} personas`);
console.log(`assigned ${manifest.length} unique hearths (all distinct: ${new Set(manifest.map(m=>m.url)).size === manifest.length})`);
manifest.forEach((m) => console.log(`  ${m.code}: "${m.title}" (${m.persona})`));
