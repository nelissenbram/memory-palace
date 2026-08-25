import crypto from "crypto";

/* ── Signed tokens for /api/billing/pm-update (SUCCESS_PLAYBOOK Pillar 2 §1) ──
 *
 * Stripe Billing-Portal sessions are short-lived and server-minted, so an email
 * can never carry a live portal URL. Instead the trial-ending email links to
 * /api/billing/pm-update?token=<uid.exp.hmac>, which mints the portal session at
 * CLICK time and 302s there — working signed-out (the token authenticates the
 * redirect). Same HMAC pattern + secret as signUnsubscribeToken (shared.ts).
 */

function getSecret(): string {
  const secret = process.env.CRON_SECRET || process.env.UNSUBSCRIBE_SECRET || "";
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Missing CRON_SECRET or UNSUBSCRIBE_SECRET environment variable");
  }
  return secret;
}

/** Default token lifetime: covers the trial_will_end (~day 11 of 14) email
 *  through trial end plus a grace week for late openers. */
export const PM_UPDATE_TOKEN_TTL_MS = 21 * 24 * 60 * 60 * 1000;

function hmacFor(userId: string, expiresAtMs: number): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`pm-update:${userId}.${expiresAtMs}`)
    .digest("hex");
}

/** Sign `userId` + expiry into a tamper-proof token: `userId.expMs.hmacHex`. */
export function signPmUpdateToken(
  userId: string,
  expiresAtMs: number = Date.now() + PM_UPDATE_TOKEN_TTL_MS,
): string {
  return `${userId}.${expiresAtMs}.${hmacFor(userId, expiresAtMs)}`;
}

/** Verify a pm-update token. Returns the userId if valid and unexpired, else null. */
export function verifyPmUpdateToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, providedHmac] = parts;
  const expiresAtMs = Number(expRaw);
  if (!userId || !Number.isFinite(expiresAtMs)) return null;
  if (Date.now() > expiresAtMs) return null;

  const expectedHmac = hmacFor(userId, expiresAtMs);
  if (providedHmac.length !== expectedHmac.length) return null;
  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedHmac, "utf8"),
    Buffer.from(expectedHmac, "utf8"),
  );
  return isValid ? userId : null;
}
