// Week-4 action 4.1 (pulled forward) — EXIF event_date backfill.
// Reads the first 256KB of every real-user photo from R2 / Supabase storage,
// parses the actual EXIF DateTimeOriginal (proper TIFF IFD walk, with
// DateTimeDigitized → DateTime → strict-ASCII-pattern fallbacks), sanity-checks
// 1900 < year <= now, and writes memories.event_date.
//
// Usage:
//   node scripts/week4/backfill-event-dates.mjs           # dry-run (default): report only
//   node scripts/week4/backfill-event-dates.mjs --apply   # write event_date (needs migration applied)
//
// Prerequisite for --apply: supabase/migrations/20260825150000_memory_event_date.sql
// Demo users (@demo.thememorypalace.ai) are skipped. Kep photos have EXIF
// stripped by WhatsApp — they simply parse to null and stay untouched.
//
// NOTE: the parser is a JS port of src/lib/utils/exif-date.ts — keep in sync.
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { loadEnv, pool } from "../populate/lib.mjs";

const APPLY = process.argv.includes("--apply");
const RANGE_BYTES = 256 * 1024;

loadEnv();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() },
});
const R2_BUCKET = (process.env.R2_BUCKET_MEMORIES || "memory-palace-memories").trim();

/* ── EXIF parser (port of src/lib/utils/exif-date.ts) ── */
const EXIF_ANCHOR = Buffer.from("Exif\0\0", "latin1");
const u16 = (b, o, le) => (o + 2 > b.length ? -1 : le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
const u32 = (b, o, le) => (o + 4 > b.length ? -1 : le
  ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
  : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0);
function readAscii(b, off, len) {
  if (off < 0 || len <= 0 || off + len > b.length) return null;
  let s = "";
  for (let i = 0; i < len; i++) { const c = b[off + i]; if (c === 0) break; s += String.fromCharCode(c); }
  return s;
}
function sanitize(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const year = +m[1], month = +m[2], day = +m[3];
  if (!(year > 1900 && year <= new Date().getUTCFullYear())) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  if (iso > new Date().toISOString().slice(0, 10)) return null;
  return iso;
}
function walkIfd(buf, tiff, ifdOff, le, wantAscii, wantPointer) {
  const ascii = new Map(), pointers = new Map();
  const base = tiff + ifdOff;
  const count = u16(buf, base, le);
  if (count < 0 || count > 512) return { ascii, pointers };
  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (entry + 12 > buf.length) break;
    const tag = u16(buf, entry, le), type = u16(buf, entry + 2, le), num = u32(buf, entry + 4, le);
    if (wantPointer.has(tag) && (type === 4 || type === 3)) pointers.set(tag, u32(buf, entry + 8, le));
    else if (wantAscii.has(tag) && type === 2 && num > 0 && num <= 64) {
      const valOff = num <= 4 ? entry + 8 : tiff + u32(buf, entry + 8, le);
      const s = readAscii(buf, valOff, num);
      if (s) ascii.set(tag, s);
    }
  }
  return { ascii, pointers };
}
function extractExifDate(buf) {
  try {
    if (!buf || buf.length < 16) return null;
    let anchor = buf.indexOf(EXIF_ANCHOR);
    while (anchor >= 0) {
      const tiff = anchor + 6;
      const bo = u16(buf, tiff, false);
      const le = bo === 0x4949, be = bo === 0x4d4d;
      if ((le || be) && u16(buf, tiff + 2, le) === 42) {
        const ifd0 = u32(buf, tiff + 4, le);
        if (ifd0 >= 8 && tiff + ifd0 < buf.length) {
          const { ascii: ifd0Ascii, pointers } = walkIfd(buf, tiff, ifd0, le, new Set([0x0132]), new Set([0x8769]));
          let dto, dtd;
          const exifIfd = pointers.get(0x8769);
          if (exifIfd !== undefined && tiff + exifIfd < buf.length) {
            const { ascii } = walkIfd(buf, tiff, exifIfd, le, new Set([0x9003, 0x9004]), new Set());
            dto = ascii.get(0x9003); dtd = ascii.get(0x9004);
          }
          const picked = sanitize(dto) || sanitize(dtd) || sanitize(ifd0Ascii.get(0x0132));
          if (picked) return picked;
        }
      }
      anchor = buf.indexOf(EXIF_ANCHOR, anchor + 1);
    }
    const s = buf.toString("latin1", 0, Math.min(buf.length, RANGE_BYTES));
    const m = s.match(/(19|20)\d{2}:(0[1-9]|1[0-2]):(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):[0-5]\d:[0-5]\d/);
    return m ? sanitize(m[0]) : null;
  } catch { return null; }
}

/* ── demo users ── */
const demoIds = new Set();
{
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error("listUsers:", error.message); process.exit(1); }
    for (const u of data.users) if ((u.email || "").endsWith("@demo.thememorypalace.ai")) demoIds.add(u.id);
    if (data.users.length < 200) break;
    page++;
  }
}

/* ── photo memories (defensive event_date select: dry-run works pre-migration) ── */
let hasEventDateColumn = true;
async function fetchMemories(withEventDate) {
  const cols = "id, user_id, created_at, type, file_path, storage_backend" + (withEventDate ? ", event_date" : "");
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await db.from("memories").select(cols).range(from, from + 999);
    if (error) return { error };
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return { rows };
}
let res = await fetchMemories(true);
if (res.error) {
  hasEventDateColumn = false;
  res = await fetchMemories(false);
  if (res.error) { console.error("memories:", res.error.message); process.exit(1); }
}
if (!hasEventDateColumn) {
  console.warn("⚠ memories.event_date does not exist yet (migration 20260825150000 not applied).");
  if (APPLY) { console.error("--apply requires the migration. Aborting."); process.exit(1); }
}

const candidates = res.rows.filter((m) =>
  m.type === "photo" && m.file_path && !demoIds.has(m.user_id) &&
  (!hasEventDateColumn || m.event_date == null)
);
console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN (pass --apply to write)"}`);
console.log(`Total memories: ${res.rows.length}; demo users: ${demoIds.size}`);
console.log(`Backfill candidates (real-user photos with a file, event_date null): ${candidates.length}`);

/* ── scan files ── */
let readable = 0, unreadable = 0;
const found = []; // { id, user_id, eventDate, createdAt }
await pool(candidates, 8, async (m) => {
  let buf = null;
  try {
    if (m.storage_backend === "r2") {
      const r = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: m.file_path, Range: `bytes=0-${RANGE_BYTES - 1}` }));
      buf = Buffer.from(await r.Body.transformToByteArray());
    } else {
      const { data, error } = await db.storage.from("memories").download(m.file_path);
      if (error) throw new Error(error.message);
      buf = Buffer.from(await data.arrayBuffer()).subarray(0, RANGE_BYTES);
    }
  } catch { unreadable++; return; }
  readable++;
  const eventDate = extractExifDate(buf);
  if (eventDate) found.push({ id: m.id, user_id: m.user_id, eventDate, createdAt: m.created_at });
});

const differs = found.filter((f) => f.eventDate !== f.createdAt.slice(0, 10));
console.log(`\n=== SCAN RESULT ===`);
console.log(`files readable:            ${readable} (unreadable/missing: ${unreadable})`);
console.log(`EXIF taken-date found:     ${found.length} (${readable ? Math.round((found.length / readable) * 100) : 0}% of readable)`);
console.log(`taken-date ≠ upload date:  ${differs.length}  ← these unlock real anniversaries`);
console.log(`distinct users gaining an event_date: ${new Set(found.map((f) => f.user_id)).size}`);
console.log(`\nSample (memory_id,event_date,created_at):`);
for (const f of found.slice(0, 15)) console.log(`  ${f.id},${f.eventDate},${f.createdAt.slice(0, 10)}`);

if (!APPLY) {
  console.log(`\nDry-run only — would write event_date on ${found.length} rows. Re-run with --apply after applying the migration.`);
  process.exit(0);
}

/* ── apply ── */
let updated = 0, failed = 0;
await pool(found, 8, async (f) => {
  const { error } = await db.from("memories").update({ event_date: f.eventDate }).eq("id", f.id);
  if (error) { failed++; console.error(`  update ${f.id}: ${error.message}`); }
  else updated++;
});
console.log(`\n=== APPLIED === updated ${updated} rows, ${failed} failures.`);
console.log("Spot-check 5 by eye, then hit the digest cron with ?dryRun to confirm otdUsers > 0.");
