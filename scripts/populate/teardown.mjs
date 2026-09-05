// Removes every seeded demo palace: deletes auth users whose email is
// <username>@demo.thememorypalace.ai (cascades to profiles/wings/rooms/memories/
// palace_visits/featured_palaces via ON DELETE CASCADE), and cleans their R2
// objects + profile-photos avatars.
//
// Usage: node scripts/populate/teardown.mjs [--dry]
import { createClient } from "@supabase/supabase-js";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { loadEnv } from "./lib.mjs";

loadEnv();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_BUCKET = (process.env.R2_BUCKET_MEMORIES || "memory-palace-memories").trim();
const AVATAR_BUCKET = "profile-photos";
const DOMAIN = "@demo.thememorypalace.ai";
const DRY = process.argv.includes("--dry");

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() },
});

async function listDemoUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error("listUsers:", error.message); break; }
    const batch = data.users || [];
    for (const u of batch) if ((u.email || "").endsWith(DOMAIN)) users.push(u);
    if (batch.length < 200) break;
    page++;
  }
  return users;
}

async function deleteR2Prefix(prefix) {
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token }));
    const objs = (res.Contents || []).map((o) => ({ Key: o.Key }));
    if (objs.length) await s3.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: objs } }));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

(async () => {
  const users = await listDemoUsers();
  console.log(`Found ${users.length} demo users (${DOMAIN})${DRY ? " — DRY RUN" : ""}`);
  if (DRY) { users.slice(0, 50).forEach((u) => console.log("  would delete", u.email)); return; }
  let ok = 0;
  for (const u of users) {
    try {
      await deleteR2Prefix(`${u.id}/`);
      await db.storage.from(AVATAR_BUCKET).remove([`avatars/${u.id}.jpg`]).catch(() => {});
      const { error } = await db.auth.admin.deleteUser(u.id);
      if (error) { console.warn(`  ! ${u.email}: ${error.message}`); continue; }
      ok++;
      if (ok % 10 === 0) console.log(`  deleted ${ok}/${users.length}`);
    } catch (e) { console.warn(`  ! ${u.email}: ${e.message}`); }
  }
  console.log(`DONE. deleted ${ok}/${users.length} demo palaces (DB cascade + R2 + avatars).`);
})().catch((e) => console.log("ERR", e.message));
