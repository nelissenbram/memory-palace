// Week-1 action 1.1 — canonical dataset verify + EXIF sample.
// Read-only. Recounts the SUCCESS_PLAYBOOK §1 canonical numbers and samples 10
// real-user photos to check whether EXIF capture-dates survive the upload
// pipeline (decides the resurface backfill scope, action 4.1).
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { loadEnv } from "../populate/lib.mjs";

loadEnv();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() },
});
const R2_BUCKET = (process.env.R2_BUCKET_MEMORIES || "memory-palace-memories").trim();

// -- demo users (email domain) --
const demoIds = new Set();
let page = 1;
let totalAuth = 0;
while (true) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("listUsers:", error.message); break; }
  totalAuth += data.users.length;
  for (const u of data.users) if ((u.email || "").endsWith("@demo.thememorypalace.ai")) demoIds.add(u.id);
  if (data.users.length < 200) break;
  page++;
}

// -- memories by real users --
const all = [];
let from = 0;
while (true) {
  const { data, error } = await db.from("memories").select("user_id, created_at, type, file_path, storage_backend").range(from, from + 999);
  if (error) { console.error("memories:", error.message); break; }
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
const real = all.filter((m) => !demoIds.has(m.user_id));
const byUser = {};
for (const m of real) (byUser[m.user_id] ||= []).push(m);
const users1 = Object.keys(byUser).length;
const users3 = Object.values(byUser).filter((l) => l.length >= 3).length;
const cutoff30 = Date.now() - 30 * 86400000;
const last30 = real.filter((m) => new Date(m.created_at).getTime() > cutoff30);
const last30Users = new Set(last30.map((m) => m.user_id)).size;

console.log("=== CANONICAL DATASET (verified " + new Date().toISOString().slice(0, 10) + ") ===");
console.log("auth users total:        " + totalAuth);
console.log("demo users:              " + demoIds.size);
console.log("real accounts:           " + (totalAuth - demoIds.size));
console.log("real memories total:     " + real.length);
console.log("users ever ≥1 memory:    " + users1);
console.log("users ever ≥3 memories:  " + users3);
console.log("memories last 30d:       " + last30.length + " (by " + last30Users + " users)");

// -- EXIF sample: 10 real photo files, look for an EXIF-style datetime in the first 128KB --
const photos = real.filter((m) => m.type === "photo" && m.file_path).slice(-40);
const sample = [];
for (let i = 0; i < photos.length && sample.length < 10; i += Math.max(1, Math.floor(photos.length / 10))) sample.push(photos[i]);
let withDate = 0, checked = 0;
for (const m of sample) {
  try {
    let buf;
    if (m.storage_backend === "r2") {
      const res = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: m.file_path, Range: "bytes=0-131071" }));
      buf = Buffer.from(await res.Body.transformToByteArray());
    } else {
      const { data, error } = await db.storage.from("memories").download(m.file_path);
      if (error) continue;
      buf = Buffer.from(await data.arrayBuffer()).subarray(0, 131072);
    }
    checked++;
    const ascii = buf.toString("latin1");
    if (/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/.test(ascii)) withDate++;
  } catch { /* skip unreadable */ }
}
console.log("\n=== EXIF SAMPLE ===");
console.log(`checked ${checked} real photos; EXIF datetime present in ${withDate} (${checked ? Math.round((withDate / checked) * 100) : 0}%)`);
console.log(withDate === 0 ? "→ recompression strips EXIF: backfill must use fallbacks (filename dates / metadata jsonb / user prompt)" : "→ EXIF survives: event_date backfill viable for ~" + Math.round((withDate / Math.max(1, checked)) * real.filter((m) => m.type === "photo").length) + " photos");
