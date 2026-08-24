// Shared helpers for the palace-population scripts.
// Reads .env.local manually (no dotenv dependency assumed).
import fs from "fs";
import path from "path";

export const ROOT = path.resolve(process.cwd());
export const POP_DIR = path.resolve(ROOT, "scripts/populate");
export const MEDIA_DIR = path.resolve(POP_DIR, "media");
export const PERSONAS_PATH = path.resolve(POP_DIR, "personas.json");

export function loadEnv() {
  const envPath = path.resolve(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

export function readPersonas() {
  return JSON.parse(fs.readFileSync(PERSONAS_PATH, "utf8"));
}

// Deterministic media key for a memory so generate + seed agree on file names.
export function memKey(wingSlug, roomIdx, memIdx) {
  return `${wingSlug}-r${roomIdx}-m${memIdx}`;
}

export function personaMediaDir(username) {
  return path.resolve(MEDIA_DIR, username);
}

// Simple bounded-concurrency pool.
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (e) {
        results[idx] = { error: e?.message || String(e) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
