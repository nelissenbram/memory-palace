"use server";

import { createClient, createAdminOrAnonClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { hashPasscode, signPasscodeToken } from "./passcode-crypto";
import crypto from "crypto";

/** Best-effort client IP inside a server action (no NextRequest available). */
async function getActionClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

/** Generate a random 6-character alphanumeric passcode */
function generatePasscode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/1/O/0 for clarity
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/** Generate a URL-safe slug */
function generateSlug(): string {
  return crypto.randomBytes(8).toString("base64url");
}

/**
 * Create a passcode-protected share for a wing or room.
 */
export async function createPasscode(input: {
  wingId?: string;
  roomId?: string;
  passcode?: string;
  expiresInHours: number;
}): Promise<{ ok: boolean; share?: PasscodeShare; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.wingId && !input.roomId) {
    return { ok: false, error: "Must specify a wing or room to share" };
  }

  // Callers pass LOCAL identifiers (wing slug e.g. "roots"; room local id stored in
  // rooms.name), but public_shares.wing_id/room_id (and every reader) use the DB uuid.
  // Resolve the local id -> uuid here so a slug no longer fails as "not found" and the
  // stored value stays a real uuid. Try the local column first, then the uuid column
  // only when the value actually looks like a uuid (avoids an invalid-uuid cast error).
  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  let wingUuid: string | null = null;
  if (input.wingId) {
    const bySlug = await supabase
      .from("wings").select("id").eq("slug", input.wingId).eq("user_id", user.id).maybeSingle();
    const wing = bySlug.data
      ?? (isUuid(input.wingId)
        ? (await supabase.from("wings").select("id").eq("id", input.wingId).eq("user_id", user.id).maybeSingle()).data
        : null);
    if (!wing) return { ok: false, error: "Wing not found or not owned by you" };
    wingUuid = wing.id;
  }

  let roomUuid: string | null = null;
  if (input.roomId) {
    const byName = await supabase
      .from("rooms").select("id").eq("name", input.roomId).eq("user_id", user.id).maybeSingle();
    const room = byName.data
      ?? (isUuid(input.roomId)
        ? (await supabase.from("rooms").select("id").eq("id", input.roomId).eq("user_id", user.id).maybeSingle()).data
        : null);
    if (!room) return { ok: false, error: "Room not found or not owned by you" };
    roomUuid = room.id;
  }

  const passcode = (input.passcode?.trim() || generatePasscode()).toLowerCase();
  // Raised minimum length (was 4) to shrink the brute-force search space.
  if (passcode.length < 6 || passcode.length > 20) {
    return { ok: false, error: "Passcode must be between 6 and 20 characters" };
  }

  // Store ONLY the sha256 hash — never cleartext — so a table/RLS leak cannot
  // reveal usable passcodes. The cleartext is returned to the owner in-memory
  // this one time so they can share it.
  const passcodeHash = hashPasscode(passcode);

  const slug = generateSlug();
  const expiresAt = new Date(
    Date.now() + input.expiresInHours * 60 * 60 * 1000
  ).toISOString();

  const { data: share, error } = await supabase
    .from("public_shares")
    .insert({
      wing_id: wingUuid,
      room_id: roomUuid,
      slug,
      created_by: user.id,
      is_active: true,
      passcode: passcodeHash,
      expires_at: expiresAt,
      scope: "passcode",
    })
    .select("id, slug, expires_at, wing_id, room_id, created_at")
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    share: {
      id: share.id,
      slug: share.slug,
      passcode, // cleartext, shown to the owner only at creation time
      expiresAt: share.expires_at!,
      wingId: share.wing_id,
      roomId: share.room_id,
      createdAt: share.created_at,
    },
  };
}

/**
 * Validate a passcode and return share details if valid.
 */
export async function validatePasscode(
  code: string
): Promise<{ ok: boolean; share?: ValidatedShare; error?: string }> {
  // Service-role client: a passcode visitor is NOT the share owner, so the
  // owner-scoped RLS policy would hide the row. This action enforces the
  // passcode check itself and never returns the stored hash, so using the
  // admin client here is safe. Falls back to anon on Preview (no key).
  const supabase = createAdminOrAnonClient();
  const normalizedCode = code.trim().toLowerCase();

  if (!normalizedCode) return { ok: false, error: "Passcode is required" };

  // Brute-force throttle: this server action is the passcode-guessing entry
  // point and was previously unlimited. Rate-limit per-IP AND per-guessed-code
  // (10 attempts / 10 min). Fails closed on trip. rateLimit() fails open only
  // when Redis is entirely unavailable (same posture as other public routes).
  const ip = await getActionClientIp();
  const attemptHash = hashPasscode(normalizedCode);
  const [ipRl, codeRl] = await Promise.all([
    rateLimit(`passcode-validate:ip:${ip}`, 10, 10 * 60_000),
    rateLimit(`passcode-validate:code:${attemptHash.slice(0, 16)}`, 10, 10 * 60_000),
  ]);
  if (!ipRl.success || !codeRl.success) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  // Compare against the stored SHA-256 hash — the cleartext is never persisted.
  const codeHash = attemptHash;

  // Passcodes are not guaranteed globally unique among active shares, so a
  // collision must not surface as "Invalid passcode". Deterministically take
  // the most-recent active match instead of failing on multi-row via .single().
  const { data: shares } = await supabase
    .from("public_shares")
    .select(
      "id, slug, wing_id, room_id, created_by, expires_at, is_active, scope"
    )
    .eq("passcode", codeHash)
    .eq("is_active", true)
    .eq("scope", "passcode")
    .order("created_at", { ascending: false })
    .limit(1);

  const share = shares?.[0];
  if (!share) return { ok: false, error: "Invalid passcode" };

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    // Auto-deactivate expired share
    await supabase
      .from("public_shares")
      .update({ is_active: false })
      .eq("id", share.id);
    return { ok: false, error: "This passcode has expired" };
  }

  // Fetch owner info
  const { data: owner } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", share.created_by)
    .single();

  // Fetch wing/room names
  let wingName: string | null = null;
  let roomName: string | null = null;

  if (share.wing_id) {
    const { data: wing } = await supabase
      .from("wings")
      .select("slug, custom_name")
      .eq("id", share.wing_id)
      .single();
    wingName = wing?.custom_name || wing?.slug || null;
  }

  if (share.room_id) {
    const { data: room } = await supabase
      .from("rooms")
      .select("name")
      .eq("id", share.room_id)
      .single();
    roomName = room?.name || null;
  }

  return {
    ok: true,
    share: {
      id: share.id,
      slug: share.slug,
      // Signed proof the passcode was entered — the public route requires this
      // for scope='passcode' shares so knowing the slug alone is not enough.
      accessToken: signPasscodeToken(share.id),
      wingId: share.wing_id,
      roomId: share.room_id,
      ownerName: owner?.display_name || "Someone",
      ownerUsername: owner?.username || null,
      wingName,
      roomName,
      expiresAt: share.expires_at,
    },
  };
}

/**
 * Get all active passcode shares for the current user.
 */
export async function getMyPasscodes(): Promise<{
  ok: boolean;
  shares: PasscodeShare[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, shares: [], error: "Not authenticated" };

  // Note: `passcode` is now stored as a one-way sha256 hash, so it CANNOT be
  // shown back to the owner for previously-created codes. We don't select it —
  // returning the hash would render a meaningless string in the UI. The
  // cleartext is only ever available at creation time (createPasscode).
  const { data: shares, error } = await supabase
    .from("public_shares")
    .select("id, slug, expires_at, wing_id, room_id, created_at")
    .eq("created_by", user.id)
    .eq("scope", "passcode")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, shares: [], error: error.message };

  // Filter out expired ones client-side and deactivate them
  const now = new Date();
  const active: PasscodeShare[] = [];
  const expiredIds: string[] = [];

  for (const s of shares || []) {
    if (s.expires_at && new Date(s.expires_at) < now) {
      expiredIds.push(s.id);
    } else {
      active.push({
        id: s.id,
        slug: s.slug,
        passcode: "", // hash is never surfaced; cleartext only exists at creation
        expiresAt: s.expires_at || "",
        wingId: s.wing_id,
        roomId: s.room_id,
        createdAt: s.created_at,
      });
    }
  }

  // Clean up expired shares in background
  if (expiredIds.length > 0) {
    supabase
      .from("public_shares")
      .update({ is_active: false })
      .in("id", expiredIds)
      .then(() => {});
  }

  return { ok: true, shares: active };
}

/**
 * Delete (deactivate) a passcode share.
 */
export async function deletePasscode(
  shareId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("public_shares")
    .update({ is_active: false })
    .eq("id", shareId)
    .eq("created_by", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ── Types ── */

export interface PasscodeShare {
  id: string;
  slug: string;
  passcode: string;
  expiresAt: string;
  wingId: string | null;
  roomId: string | null;
  createdAt: string;
}

export interface ValidatedShare {
  id: string;
  slug: string;
  /** Signed, short-lived proof of passcode entry; required by the public route. */
  accessToken: string;
  wingId: string | null;
  roomId: string | null;
  ownerName: string;
  ownerUsername: string | null;
  wingName: string | null;
  roomName: string | null;
  expiresAt: string | null;
}
