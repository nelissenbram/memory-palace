"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

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

  // Verify ownership of the wing/room
  if (input.wingId) {
    const { data: wing } = await supabase
      .from("wings")
      .select("id")
      .eq("id", input.wingId)
      .eq("user_id", user.id)
      .single();
    if (!wing) return { ok: false, error: "Wing not found or not owned by you" };
  }

  if (input.roomId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id, wing_id")
      .eq("id", input.roomId)
      .eq("user_id", user.id)
      .single();
    if (!room) return { ok: false, error: "Room not found or not owned by you" };
  }

  const passcode = (input.passcode?.trim() || generatePasscode()).toLowerCase();
  if (passcode.length < 4 || passcode.length > 20) {
    return { ok: false, error: "Passcode must be between 4 and 20 characters" };
  }

  const slug = generateSlug();
  const expiresAt = new Date(
    Date.now() + input.expiresInHours * 60 * 60 * 1000
  ).toISOString();

  const { data: share, error } = await supabase
    .from("public_shares")
    .insert({
      wing_id: input.wingId || null,
      room_id: input.roomId || null,
      slug,
      created_by: user.id,
      is_active: true,
      passcode,
      expires_at: expiresAt,
      scope: "passcode",
    })
    .select("id, slug, passcode, expires_at, wing_id, room_id, created_at")
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    share: {
      id: share.id,
      slug: share.slug,
      passcode: share.passcode || passcode,
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
  const supabase = await createClient();
  const normalizedCode = code.trim().toLowerCase();

  if (!normalizedCode) return { ok: false, error: "Passcode is required" };

  // Passcodes are not guaranteed globally unique among active shares, so a
  // collision must not surface as "Invalid passcode". Deterministically take
  // the most-recent active match instead of failing on multi-row via .single().
  const { data: shares } = await supabase
    .from("public_shares")
    .select(
      "id, slug, wing_id, room_id, created_by, expires_at, is_active, scope"
    )
    .eq("passcode", normalizedCode)
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

  const { data: shares, error } = await supabase
    .from("public_shares")
    .select("id, slug, passcode, expires_at, wing_id, room_id, created_at")
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
        passcode: s.passcode || "",
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
  wingId: string | null;
  roomId: string | null;
  ownerName: string;
  ownerUsername: string | null;
  wingName: string | null;
  roomName: string | null;
  expiresAt: string | null;
}
