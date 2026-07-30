import crypto from "crypto";

/**
 * Synchronous passcode crypto helpers.
 *
 * These live OUTSIDE the "use server" module (passcode-actions.ts) because a
 * "use server" file may only export async functions. They are server-only
 * (import `crypto`) — never import this from a client component.
 */

/**
 * Deterministic SHA-256 of a normalized passcode. The DB stores this hash
 * (never the cleartext), so a table/RLS leak can no longer reveal usable
 * passcodes. Normalization (trim + lowercase) mirrors the case-insensitive UX.
 */
export function hashPasscode(raw: string): string {
  return crypto.createHash("sha256").update(raw.trim().toLowerCase(), "utf8").digest("hex");
}

/**
 * Secret used to sign short-lived passcode-access tokens. Server-only.
 * SUPABASE_SERVICE_ROLE_KEY is present in every server runtime that serves
 * these routes; fall back only so local dev without the key doesn't crash
 * (tokens are still unforgeable per-deploy).
 */
function passcodeTokenSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "mp-passcode-fallback-secret"
  );
}

const PASSCODE_TOKEN_TTL_MS = 30 * 60_000; // 30 minutes

/**
 * Mint a signed, short-lived token proving a valid passcode was entered for a
 * specific share id. Format: base64url(payload).hexHmac. Verified server-side
 * before a scope='passcode' share is served — the slug alone no longer grants
 * access.
 */
export function signPasscodeToken(shareId: string): string {
  const payload = JSON.stringify({ sid: shareId, exp: Date.now() + PASSCODE_TOKEN_TTL_MS });
  const body = Buffer.from(payload, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", passcodeTokenSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

/**
 * Verify a passcode-access token. Returns true only when the token is a valid,
 * unexpired signature for exactly this share id. Uses a constant-time
 * signature comparison.
 */
export function verifyPasscodeToken(token: string | null | undefined, shareId: string): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", passcodeTokenSecret()).update(body).digest("hex");
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(sig, "hex");
    b = Buffer.from(expected, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      sid?: string;
      exp?: number;
    };
    if (!payload.sid || payload.sid !== shareId) return false;
    if (!payload.exp || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}
