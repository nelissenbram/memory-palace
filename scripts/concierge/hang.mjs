// Concierge fulfillment tool (SUCCESS_PLAYBOOK 1.7, Pillar 1 §5).
//
// The founder's daily concierge promise is "reply with 3 photos and I'll hang
// them in your palace for you". This service-key admin script fulfils that for
// ANY user WITHOUT ever logging in as them:
//   1. resolves the user by email or username,
//   2. finds (or creates) the named room in their first/named wing,
//   3. uploads each photo to R2 (memory-palace-memories) and inserts a
//      `memories` row exactly the way the app does (storage_backend='r2',
//      file_url '/api/media/memories/<key>'),
//   4. fires the server-side PostHog `memory_created {source:"concierge"}`
//      milestone per memory,
//   5. renders a Tuscan-styled proof card PNG (puppeteer) the founder can
//      attach to his reply email, and prints the palace deep link.
//
// Requires in .env.local: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_MEMORIES.
// Optional: NEXT_PUBLIC_POSTHOG_KEY (analytics silently skipped when absent —
// it lives in Vercel prod env; `npx vercel env pull` or paste it locally).
//
// Usage:
//   node scripts/concierge/hang.mjs --user <email-or-username> \
//     --room "<room name>" --dir <folder-with-images> \
//     [--titles "t1|t2|t3"] [--wing <slug>] [--dry]
//
// Examples:
//   node scripts/concierge/hang.mjs --user maria@example.com --room "Summer 1987" --dir ~/Downloads/maria
//   node scripts/concierge/hang.mjs --user sol-alvarez --room "Concierge Test" --dir ./photos --titles "The lake|Grandpa's boat|First catch" --wing nest --dry

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { loadEnv } from "../populate/lib.mjs";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const R2_BUCKET = (process.env.R2_BUCKET_MEMORIES || "memory-palace-memories").trim();
if (!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)) {
  console.error("Missing R2 credentials in .env.local (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  process.exit(1);
}

// ── args ────────────────────────────────────────────────────────────────────
function argVal(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
const USER = argVal("user");
const ROOM = argVal("room");
const DIR = argVal("dir");
const TITLES = (argVal("titles") || "").split("|").map((t) => t.trim()).filter(Boolean);
const WING = argVal("wing");
const DRY = process.argv.includes("--dry");
if (!USER || !ROOM || !DIR) {
  console.error('Usage: node scripts/concierge/hang.mjs --user <email-or-username> --room "<name>" --dir <folder> [--titles "t1|t2|t3"] [--wing <slug>] [--dry]');
  process.exit(1);
}

const KNOWN_WINGS = ["roots", "nest", "craft", "travel", "passions", "attic"];
const IMG_EXT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});

// ── server-side analytics (captureServer pattern from src/lib/analytics-server.ts;
//    scripts can't import src/ TS, so the fetch is replicated here) ──────────
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
async function captureServer(distinctId, event, properties = {}) {
  try {
    if (!PH_KEY || !distinctId || process.env.POSTHOG_SERVER_CAPTURE === "0") return false;
    await fetch(`${PH_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: PH_KEY,
        event,
        distinct_id: distinctId,
        // NB: caller's `source` (here "concierge") must win over the generic "server"
        properties: { $lib: "mp-server", source: "server", ...properties },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(2500),
    });
    return true;
  } catch {
    return false; // best-effort — analytics must never break fulfillment
  }
}

// ── user resolution (email OR username) — never logs in as the user ─────────
async function resolveUser(handle) {
  if (handle.includes("@")) {
    const wanted = handle.toLowerCase();
    let page = 1;
    while (true) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(`listUsers: ${error.message}`);
      const hit = (data.users || []).find((u) => (u.email || "").toLowerCase() === wanted);
      if (hit) {
        const { data: prof } = await db.from("profiles").select("id, username, display_name, first_wing").eq("id", hit.id).maybeSingle();
        return { id: hit.id, email: hit.email, username: prof?.username || null, displayName: prof?.display_name || null, firstWing: prof?.first_wing || null };
      }
      if ((data.users || []).length < 200) return null;
      page++;
    }
  }
  const { data: prof } = await db.from("profiles").select("id, username, display_name, first_wing").eq("username", handle).maybeSingle();
  return prof ? { id: prof.id, email: null, username: prof.username, displayName: prof.display_name, firstWing: prof.first_wing } : null;
}

// ── wing + room (ensureRoom conventions from src/lib/auth/memory-actions.ts:
//    room looked up by user_id+name across the palace; created in the target
//    wing when absent) ────────────────────────────────────────────────────────
async function pickWing(userId, firstWing) {
  const { data: wings, error } = await db.from("wings").select("id, slug, sort_order").eq("user_id", userId).order("sort_order");
  if (error) throw new Error(`wings: ${error.message}`);
  const all = wings || [];
  if (WING) {
    const hit = all.find((w) => w.slug === WING);
    if (hit) return { wing: hit, created: false };
    if (!KNOWN_WINGS.includes(WING)) throw new Error(`Unknown wing slug "${WING}" (expected one of ${KNOWN_WINGS.join(", ")})`);
    if (DRY) return { wing: { id: null, slug: WING }, created: true };
    const { data: nw, error: werr } = await db.from("wings")
      .insert({ user_id: userId, slug: WING, sort_order: all.length ? Math.max(...all.map((w) => w.sort_order ?? 0)) + 1 : 0 })
      .select("id, slug").single();
    if (werr) throw new Error(`create wing: ${werr.message}`);
    return { wing: nw, created: true };
  }
  // named wing from the profile, else the user's first wing, else create "roots"
  const named = firstWing && all.find((w) => w.slug === firstWing);
  if (named) return { wing: named, created: false };
  if (all.length) return { wing: all[0], created: false };
  const slug = KNOWN_WINGS.includes(firstWing) ? firstWing : "roots";
  if (DRY) return { wing: { id: null, slug }, created: true };
  const { data: nw, error: werr } = await db.from("wings").insert({ user_id: userId, slug, sort_order: 0 }).select("id, slug").single();
  if (werr) throw new Error(`create wing: ${werr.message}`);
  return { wing: nw, created: true };
}

async function ensureRoom(userId, wing) {
  const { data: existing } = await db.from("rooms")
    .select("id, name, cover_hue, wing_id").eq("user_id", userId).eq("name", ROOM).maybeSingle();
  if (existing) return { room: existing, created: false };
  if (DRY) return { room: { id: null, name: ROOM, cover_hue: 30 }, created: true };
  const { data: sibs } = await db.from("rooms").select("sort_order").eq("wing_id", wing.id).order("sort_order", { ascending: false }).limit(1);
  const { data: room, error } = await db.from("rooms")
    .insert({ wing_id: wing.id, user_id: userId, name: ROOM, icon: "🖼️", cover_hue: 30, sort_order: (sibs?.[0]?.sort_order ?? -1) + 1 })
    .select("id, name, cover_hue, wing_id").single();
  if (error) throw new Error(`create room: ${error.message}`);
  return { room, created: true };
}

// ── helpers ─────────────────────────────────────────────────────────────────
function listImages(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`--dir not found or not a directory: ${dir}`);
    process.exit(1);
  }
  return fs.readdirSync(dir)
    .filter((f) => IMG_EXT[path.extname(f).toLowerCase()])
    .sort()
    .map((f) => path.join(dir, f))
    .filter((p) => fs.statSync(p).size >= 2000);
}

function titleFromFilename(file) {
  const base = path.basename(file, path.extname(file)).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return base.replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled photo";
}

// ── proof card (self-contained HTML → puppeteer screenshot; no 3D, no login) ─
async function renderProofCard({ username, roomName, photos: items, ts }) {
  const { default: puppeteer } = await import("puppeteer");
  const outDir = path.resolve("scripts/concierge/out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${username}-${ts}.png`);

  const markPath = path.resolve("public/email/palace-ember.png");
  const mark = fs.existsSync(markPath)
    ? `data:image/png;base64,${fs.readFileSync(markPath).toString("base64")}`
    : null;
  const photos = items.map((it) => {
    const mime = IMG_EXT[path.extname(it.localPath).toLowerCase()] || "image/jpeg";
    return `data:${mime};base64,${fs.readFileSync(it.localPath).toString("base64")}`;
  });
  const cols = photos.length <= 2 ? photos.length : 3;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1200px; height: 900px; background: #FCFAF5; color: #403B36;
           font-family: Georgia, 'Times New Roman', serif; overflow: hidden;
           display: flex; flex-direction: column; align-items: center; padding: 44px 64px; }
    .mark { width: 64px; height: 64px; object-fit: contain; margin-bottom: 10px; }
    .brand { font-size: 15px; letter-spacing: 0.28em; text-transform: uppercase; color: #B85C38; }
    h1 { font-size: 42px; font-weight: normal; margin: 14px 0 6px; text-align: center; }
    .rule { width: 120px; height: 3px; background: #B85C38; border-radius: 2px; margin: 10px 0 26px; }
    .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 22px;
            width: 100%; flex: 1; min-height: 0; align-content: center; }
    .frame { background: #fff; border: 1px solid #E6DFD3; border-radius: 6px; padding: 12px 12px 16px;
             box-shadow: 0 8px 22px rgba(64,59,54,0.12); display: flex; flex-direction: column; min-height: 0; }
    .frame img { width: 100%; flex: 1; min-height: 0; object-fit: cover; border-radius: 3px; }
    .cap { font-size: 16px; font-style: italic; text-align: center; margin-top: 10px;
           color: #403B36; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .foot { font-size: 22px; margin-top: 26px; color: #403B36; }
    .foot em { color: #B85C38; font-style: normal; }
  </style></head><body>
    ${mark ? `<img class="mark" src="${mark}" alt="">` : ""}
    <div class="brand">The Memory Palace</div>
    <h1>${roomName.replace(/</g, "&lt;")}</h1>
    <div class="rule"></div>
    <div class="grid">${photos.map((src, i) => `
      <div class="frame"><img src="${src}"><div class="cap">${(items[i].title || "").replace(/</g, "&lt;")}</div></div>`).join("")}
    </div>
    <div class="foot">Hung in your palace — <em>walk in to see them</em></div>
  </body></html>`;

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1200, height: 900 } });
  } finally {
    await browser.close();
  }
  return outPath;
}

// ── main ────────────────────────────────────────────────────────────────────
(async () => {
  const user = await resolveUser(USER);
  if (!user) { console.error(`User not found: ${USER}`); process.exit(1); }
  const label = user.username || (user.email ? user.email.split("@")[0] : user.id.slice(0, 8));
  console.log(`User: ${user.displayName || label} (@${label}, ${user.id})${DRY ? " — DRY RUN" : ""}`);

  const { wing, created: wingCreated } = await pickWing(user.id, user.firstWing);
  console.log(`Wing: ${wing.slug}${wingCreated ? " (will create)" : ""}`);
  const { room, created: roomCreated } = await ensureRoom(user.id, wing);
  console.log(`Room: "${room.name}"${roomCreated ? " (will create)" : ` (exists, hue ${room.cover_hue ?? 30})`}`);

  const imagePaths = listImages(DIR);
  if (!imagePaths.length) { console.error(`No images (jpg/jpeg/png/webp) found in ${DIR}`); process.exit(1); }
  const ts = Date.now();
  const plan = imagePaths.map((p, i) => ({
    localPath: p,
    title: TITLES[i] || titleFromFilename(p),
    key: `${user.id}/concierge-${ts}-${i + 1}${path.extname(p).toLowerCase() === ".jpeg" ? ".jpg" : path.extname(p).toLowerCase()}`,
    contentType: IMG_EXT[path.extname(p).toLowerCase()],
  }));

  console.log(`\nHanging ${plan.length} photo(s):`);
  for (const it of plan) console.log(`  "${it.title}"  <-  ${path.basename(it.localPath)}  ->  r2:${R2_BUCKET}/${it.key}`);
  if (DRY) {
    console.log("\nDRY RUN — nothing written. Proof card, uploads, DB rows and analytics skipped.");
    return;
  }

  const hue = room.cover_hue ?? 30;
  const { data: lastMem } = await db.from("memories").select("sort_order").eq("room_id", room.id).order("sort_order", { ascending: false }).limit(1);
  let sortOrder = (lastMem?.[0]?.sort_order ?? -1) + 1;

  const hung = [];
  let analyticsOk = 0;
  for (const it of plan) {
    const buf = fs.readFileSync(it.localPath);
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: it.key, Body: buf, ContentType: it.contentType }));
    const fileUrl = `/api/media/memories/${it.key}`;
    const { data: mem, error } = await db.from("memories").insert({
      room_id: room.id,
      user_id: user.id,
      title: it.title,
      type: "photo",
      file_path: it.key,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      file_size: buf.length,
      storage_backend: "r2",
      hue,
      sort_order: sortOrder++,
      metadata: {},
    }).select("id").single();
    if (error) { console.error(`  ! memory "${it.title}": ${error.message}`); continue; }
    // Milestone: activation signal, attributed to the USER (concierge-touched cohort).
    if (await captureServer(user.id, "memory_created", { source: "concierge", memoryType: "photo", hasMedia: true })) analyticsOk++;
    hung.push({ ...it, memoryId: mem.id });
    console.log(`  + hung "${it.title}" (${mem.id})`);
  }
  if (!hung.length) { console.error("Nothing was hung — aborting proof card."); process.exit(1); }
  console.log(`Analytics: memory_created {source:"concierge"} fired for ${analyticsOk}/${hung.length}${PH_KEY ? "" : " (NEXT_PUBLIC_POSTHOG_KEY not set — skipped)"}`);

  const proof = await renderProofCard({ username: label, roomName: room.name, photos: hung, ts });

  console.log("\n──────── for the reply email ────────");
  console.log(`Proof card:  ${proof}`);
  console.log(`Deep link:   https://www.thememorypalace.ai/palace`);
  console.log(`Room:        "${room.name}" (${wing.slug} wing)`);
  console.log(`Hung:        ${hung.length} photo(s)`);
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
