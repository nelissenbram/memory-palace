/**
 * Server-safe, dependency-free EXIF taken-date extraction (week-4 resurface
 * repair, SUCCESS_PLAYBOOK Pillar 1 §8). Given the first ~256KB of an image
 * file, walks the real EXIF/TIFF IFD structure for DateTimeOriginal (0x9003),
 * falling back to DateTimeDigitized (0x9004), DateTime (0x0132), and finally
 * a strict ASCII-pattern scan (covers HEIC containers where the Exif payload
 * sits inside an item box but the TIFF walk anchor still matches).
 *
 * Returns a date-only ISO string ("YYYY-MM-DD") or null. Best-effort by
 * design: never throws.
 *
 * NOTE: scripts/week4/backfill-event-dates.mjs carries a JS port of this
 * parser — keep the two in sync.
 */

const EXIF_ANCHOR = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

function findSequence(buf: Uint8Array, seq: number[], from = 0): number {
  outer: for (let i = from; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (buf[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function readU16(buf: Uint8Array, off: number, le: boolean): number {
  if (off + 2 > buf.length) return -1;
  return le ? buf[off] | (buf[off + 1] << 8) : (buf[off] << 8) | buf[off + 1];
}

function readU32(buf: Uint8Array, off: number, le: boolean): number {
  if (off + 4 > buf.length) return -1;
  return le
    ? (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
    : ((buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]) >>> 0;
}

function readAscii(buf: Uint8Array, off: number, len: number): string | null {
  if (off < 0 || len <= 0 || off + len > buf.length) return null;
  let s = "";
  for (let i = 0; i < len; i++) {
    const c = buf[off + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/** Validate an EXIF datetime string ("YYYY:MM:DD HH:MM:SS") → "YYYY-MM-DD" or null. */
function sanitizeExifDateTime(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const nowYear = new Date().getUTCFullYear();
  // Sanity: 1900 < year <= now; plausible calendar values (scanners/cameras
  // with dead clocks emit "0000:00:00" or absurd future dates).
  if (!(year > 1900 && year <= nowYear)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject dates in the future (allow today).
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  if (iso > new Date().toISOString().slice(0, 10)) return null;
  return iso;
}

/** Walk one IFD collecting requested ASCII tags. Returns tag → value-string. */
function walkIfd(
  buf: Uint8Array,
  tiff: number,
  ifdOff: number,
  le: boolean,
  wantAscii: Set<number>,
  wantPointer: Set<number>,
): { ascii: Map<number, string>; pointers: Map<number, number> } {
  const ascii = new Map<number, string>();
  const pointers = new Map<number, number>();
  const base = tiff + ifdOff;
  const count = readU16(buf, base, le);
  if (count < 0 || count > 512) return { ascii, pointers };
  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (entry + 12 > buf.length) break;
    const tag = readU16(buf, entry, le);
    const type = readU16(buf, entry + 2, le);
    const num = readU32(buf, entry + 4, le);
    if (wantPointer.has(tag) && (type === 4 || type === 3)) {
      pointers.set(tag, readU32(buf, entry + 8, le));
    } else if (wantAscii.has(tag) && type === 2 && num > 0 && num <= 64) {
      const valOff = num <= 4 ? entry + 8 : tiff + readU32(buf, entry + 8, le);
      const s = readAscii(buf, valOff, num);
      if (s) ascii.set(tag, s);
    }
  }
  return { ascii, pointers };
}

/**
 * Extract the taken-date from an image buffer (first ~256KB is enough — EXIF
 * lives in the APP1 segment near the file start / early HEIC item boxes).
 */
export function extractExifDate(buf: Uint8Array): string | null {
  try {
    if (!buf || buf.length < 16) return null;

    // 1. Proper TIFF walk anchored at "Exif\0\0"
    let anchor = findSequence(buf, EXIF_ANCHOR);
    while (anchor >= 0) {
      const tiff = anchor + 6;
      const bo = readU16(buf, tiff, false);
      const le = bo === 0x4949; // "II"
      const be = bo === 0x4d4d; // "MM"
      if ((le || be) && readU16(buf, tiff + 2, le) === 42) {
        const ifd0 = readU32(buf, tiff + 4, le);
        if (ifd0 >= 8 && tiff + ifd0 < buf.length) {
          const { ascii: ifd0Ascii, pointers } = walkIfd(
            buf, tiff, ifd0, le,
            new Set([0x0132]),          // DateTime (modification) — last resort
            new Set([0x8769]),          // ExifIFDPointer
          );
          let dto: string | undefined;
          let dtd: string | undefined;
          const exifIfd = pointers.get(0x8769);
          if (exifIfd !== undefined && tiff + exifIfd < buf.length) {
            const { ascii } = walkIfd(
              buf, tiff, exifIfd, le,
              new Set([0x9003, 0x9004]), // DateTimeOriginal, DateTimeDigitized
              new Set(),
            );
            dto = ascii.get(0x9003);
            dtd = ascii.get(0x9004);
          }
          const picked =
            sanitizeExifDateTime(dto ?? null) ||
            sanitizeExifDateTime(dtd ?? null) ||
            sanitizeExifDateTime(ifd0Ascii.get(0x0132) ?? null);
          if (picked) return picked;
        }
      }
      anchor = findSequence(buf, EXIF_ANCHOR, anchor + 1);
    }

    // 2. Fallback: strict ASCII "YYYY:MM:DD HH:MM:SS" scan (latin1).
    let s = "";
    const scanLen = Math.min(buf.length, 256 * 1024);
    for (let i = 0; i < scanLen; i++) s += String.fromCharCode(buf[i]);
    const m = s.match(/(19|20)\d{2}:(0[1-9]|1[0-2]):(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):[0-5]\d:[0-5]\d/);
    if (m) return sanitizeExifDateTime(m[0]);

    return null;
  } catch {
    return null;
  }
}
