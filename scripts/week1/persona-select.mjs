// Persona-footage selection: map seeded demo-palace media (scripts/populate/media)
// to memory titles from personas.json, copy picks into public/demo/personas/ so the
// dev server can feed them to /flythrough hero/cp params, and write a manifest.
// The public/demo/personas copy is capture-scaffolding only — do not commit.
// Usage: node scripts/week1/persona-select.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MEDIA = path.join(ROOT, "scripts", "populate", "media");
const PUBDIR = path.join(ROOT, "public", "demo", "personas");
const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/personas";

const PICKS = [
  "sol-alvarez",          // parent · First years
  "kenji-tanaka",         // parent · A boy and his trains
  "rafa-chases-waves",    // young-adult · Salt & film
  "fatima-weaves",        // mid-life · Threads
  "mercedes-cocina",      // mid-life · La fonda
  "eleanor-remembers",    // elder · A life in chapters
  "giovanni-del-mare",    // elder · By the sea
  "margit-garden",        // elder · Garden & thread
];

const memKey = (wingSlug, ri, mi) => `${wingSlug}-r${ri}-m${mi}`;

const personas = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "populate", "personas.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const manifest = [];
for (const username of PICKS) {
  const p = personas.find((x) => x.username === username);
  if (!p) { console.warn("persona not found:", username); continue; }
  const dir = path.join(MEDIA, username);
  // Collect every photo memory whose file exists, walking wings/rooms in order.
  const photos = [];
  for (const w of p.wings) {
    (w.rooms || []).forEach((room, ri) => {
      (room.memories || []).forEach((m, mi) => {
        if (m.type !== "photo") return;
        const file = `${memKey(w.slug, ri, mi)}.jpg`;
        if (fs.existsSync(path.join(dir, file))) {
          photos.push({ file, title: m.title, room: room.name, wing: w.customName || w.slug });
        }
      });
    });
  }
  if (photos.length < 5) { console.warn(`${username}: only ${photos.length} photos, skipping`); continue; }

  // Hero = the very first memory (persona's anchor moment); corridor = 4 spread
  // across the rest of the palace so the walls show range, not one room.
  const hero = photos[0];
  const rest = photos.slice(1);
  const step = Math.max(1, Math.floor(rest.length / 4));
  const corridor = [0, 1, 2, 3].map((i) => rest[Math.min(i * step, rest.length - 1)]);

  const destDir = path.join(PUBDIR, username);
  fs.mkdirSync(destDir, { recursive: true });
  for (const ph of [hero, ...corridor]) {
    fs.copyFileSync(path.join(dir, ph.file), path.join(destDir, ph.file));
    ph.url = `/demo/personas/${username}/${ph.file}`;
  }

  manifest.push({
    username,
    displayName: p.displayName,
    lifeStage: p.lifeStage,
    category: p.featuredCategory,
    bio: p.bio,
    hero,
    corridor,
    photoCount: photos.length,
  });
  console.log(`${username}: hero="${hero.title}" + corridor [${corridor.map((c) => c.title).join(" | ")}]`);
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nmanifest: ${OUT}/manifest.json (${manifest.length} personas)`);
