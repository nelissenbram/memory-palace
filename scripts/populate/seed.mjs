// Seeds 42 fictional PUBLIC palaces into Supabase + R2, matching how the app
// stores media in production:
//   - memory images  -> Cloudflare R2 bucket (memory-palace-memories), served
//     via the /api/media/memories/<key> proxy; row carries storage_backend='r2'
//   - avatars         -> Supabase Storage public bucket 'profile-photos'
// Creates auth users + public profiles, wings (published), rooms (published),
// memories, then seeds palace_visits (Trending) + featured_palaces (Featured).
//
// Requires in .env.local: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_MEMORIES.
// Run generate-media.mjs first so images exist in scripts/populate/media/<username>/.
// Idempotent by username (skips personas whose username already exists).
//
// Usage: node scripts/populate/seed.mjs [--limit N] [--dry]
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { loadEnv, readPersonas, memKey, personaMediaDir } from "./lib.mjs";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const R2_BUCKET = (process.env.R2_BUCKET_MEMORIES || "memory-palace-memories").trim();
const r2Ready = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
if (!r2Ready) {
  console.error("Missing R2 credentials in .env.local (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  process.exit(1);
}
const AVATAR_BUCKET = "profile-photos";
const EMAIL_DOMAIN = "demo.thememorypalace.ai";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const li = args.indexOf("--limit");
const LIMIT = li !== -1 && args[li + 1] ? parseInt(args[li + 1], 10) : 0;

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});

let avatarBucketReady = false;
async function ensureAvatarBucket() {
  if (avatarBucketReady) return;
  const { data } = await db.storage.getBucket(AVATAR_BUCKET);
  if (!data) await db.storage.createBucket(AVATAR_BUCKET, { public: true }).catch(() => {});
  avatarBucketReady = true;
}

function randPw() {
  return "Demo!" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase();
}
function isoDaysAgo(days) {
  return new Date(Date.now() - Math.floor(days * 86400000)).toISOString();
}

// memory image -> R2. Returns { fileUrl, filePath } (proxy path the app serves).
async function uploadMemoryImage(userId, localPath, name) {
  if (!fs.existsSync(localPath) || fs.statSync(localPath).size < 2000) return null;
  const buf = fs.readFileSync(localPath);
  const key = `${userId}/${name}`;
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: "image/jpeg" }));
  return { fileUrl: `/api/media/memories/${key}`, filePath: key };
}

// avatar -> Supabase public bucket. Returns a public URL.
async function uploadAvatar(userId, localPath) {
  if (!fs.existsSync(localPath) || fs.statSync(localPath).size < 2000) return null;
  await ensureAvatarBucket();
  const buf = fs.readFileSync(localPath);
  const key = `avatars/${userId}.jpg`;
  const { error } = await db.storage.from(AVATAR_BUCKET).upload(key, buf, { contentType: "image/jpeg", upsert: true });
  if (error) { console.warn(`    avatar upload failed: ${error.message}`); return null; }
  return db.storage.from(AVATAR_BUCKET).getPublicUrl(key).data.publicUrl;
}

async function usernameExists(username) {
  const { data } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
  return data?.id || null;
}

async function seedPersona(p) {
  const existing = await usernameExists(p.username);
  if (existing) { console.log(`  = skip @${p.username} (exists)`); return { userId: existing, skipped: true }; }
  if (DRY) {
    const mems = p.wings.reduce((a, w) => a + w.rooms.reduce((b, r) => b + r.memories.length, 0), 0);
    console.log(`  + would create @${p.username} (${p.displayName}) — ${p.wings.length} wings, ${mems} memories`);
    return { skipped: true };
  }

  const { data: created, error: uerr } = await db.auth.admin.createUser({
    email: `${p.username}@${EMAIL_DOMAIN}`,
    password: randPw(),
    email_confirm: true,
    user_metadata: { display_name: p.displayName },
  });
  if (uerr) { console.warn(`  ! createUser @${p.username}: ${uerr.message}`); return { error: uerr.message }; }
  const userId = created.user.id;
  const dir = personaMediaDir(p.username);

  const avatarUrl = await uploadAvatar(userId, path.join(dir, "avatar.jpg"));
  await db.from("profiles").update({
    display_name: p.displayName,
    username: p.username,
    bio: p.bio,
    avatar_url: avatarUrl,
    is_public: true,
    onboarded: true,
    goal: "share",
    first_wing: p.wings[0]?.slug || "roots",
  }).eq("id", userId);

  let wingOrder = 0, memCount = 0;
  for (const w of p.wings) {
    const { data: wing, error: werr } = await db.from("wings").insert({
      user_id: userId, slug: w.slug, custom_name: w.customName || null,
      accent_color: w.accentColor || p.accentColor || null, sort_order: wingOrder++,
      published_at: new Date().toISOString(), publish_visibility: "public",
      publish_description: w.customName || null,
    }).select("id").single();
    if (werr) { console.warn(`    wing ${w.slug}: ${werr.message}`); continue; }

    let roomOrder = 0;
    for (let ri = 0; ri < w.rooms.length; ri++) {
      const room = w.rooms[ri];
      const { data: roomRow, error: rerr } = await db.from("rooms").insert({
        wing_id: wing.id, user_id: userId, name: room.name, icon: room.icon || "📁",
        cover_hue: room.coverHue ?? 30, sort_order: roomOrder++,
        published_at: new Date().toISOString(), publish_visibility: "public",
      }).select("id").single();
      if (rerr) { console.warn(`    room ${room.name}: ${rerr.message}`); continue; }

      let memOrder = 0;
      for (let mi = 0; mi < room.memories.length; mi++) {
        const m = room.memories[mi];
        let up = null;
        if (m.type === "photo") {
          up = await uploadMemoryImage(userId, path.join(dir, `${memKey(w.slug, ri, mi)}.jpg`), `${memKey(w.slug, ri, mi)}.jpg`);
        }
        const { error: merr } = await db.from("memories").insert({
          room_id: roomRow.id, user_id: userId, title: m.title, description: m.description || null,
          type: up ? "photo" : "journal",
          file_path: up ? up.filePath : null,
          file_url: up ? up.fileUrl : null,
          thumbnail_url: up ? up.fileUrl : null,
          storage_backend: up ? "r2" : "supabase",
          hue: room.coverHue ?? 30, sort_order: memOrder++, metadata: {},
        });
        if (merr) console.warn(`    memory ${m.title}: ${merr.message}`);
        else memCount++;
      }
    }
  }
  console.log(`  + @${p.username} (${p.displayName}) — ${p.wings.length} wings, ${memCount} memories`);
  return { userId, memCount };
}

(async () => {
  let personas = readPersonas();
  if (LIMIT > 0) personas = personas.slice(0, LIMIT);
  console.log(`Seeding ${personas.length} palaces${DRY ? " (DRY RUN)" : ""} -> R2 bucket '${R2_BUCKET}', avatars '${AVATAR_BUCKET}'`);

  const owners = [];
  for (const p of personas) {
    const r = await seedPersona(p);
    if (r?.userId && !r.skipped) owners.push({ username: p.username, userId: r.userId, category: p.featuredCategory });
  }

  if (!DRY && owners.length > 1) {
    console.log("Seeding palace_visits (trending)...");
    const visits = [];
    for (const owner of owners) {
      const n = 3 + Math.floor(Math.random() * 12);
      for (let i = 0; i < n; i++) {
        const visitor = owners[Math.floor(Math.random() * owners.length)];
        if (visitor.userId === owner.userId) continue;
        visits.push({ visitor_id: visitor.userId, owner_id: owner.userId, visited_at: isoDaysAgo(Math.random() * 6.9) });
      }
    }
    for (let i = 0; i < visits.length; i += 500) {
      const { error } = await db.from("palace_visits").insert(visits.slice(i, i + 500));
      if (error) console.warn("  visits insert:", error.message);
    }
    console.log(`  ${visits.length} visits`);

    console.log("Seeding featured_palaces...");
    const featured = owners.filter((_, i) => i % 6 === 0).slice(0, 8);
    for (const f of featured) {
      const { error } = await db.from("featured_palaces").insert({ user_id: f.userId, category: f.category || "Discover" });
      if (error) console.warn(`  feature @${f.username}:`, error.message);
    }
    console.log(`  ${featured.length} featured`);
  }

  console.log(`DONE. created owners: ${owners.length}`);
})();
