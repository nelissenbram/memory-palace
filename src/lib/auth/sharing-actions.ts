"use server";

import { createClient } from "@/lib/supabase/server";

// Map local room ID prefix to wing slug
function wingSlugFromRoomId(localRoomId: string): string {
  const prefix = localRoomId.slice(0, 2);
  const map: Record<string, string> = {
    fr: "family", tr: "travel", cr: "childhood", kr: "career", rr: "creativity",
  };
  return map[prefix] || "family";
}

// Resolve local room ID to DB UUID (reused from memory-actions pattern)
async function resolveRoomId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  localRoomId: string
) {
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", userId)
    .eq("name", localRoomId)
    .single();
  if (room) return room.id;

  // Create room if it doesn't exist
  const wingSlug = wingSlugFromRoomId(localRoomId);
  const { data: wing } = await supabase
    .from("wings")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .single();
  if (!wing) return null;

  const { data: newRoom } = await supabase
    .from("rooms")
    .insert({ wing_id: wing.id, user_id: userId, name: localRoomId })
    .select("id")
    .single();
  return newRoom?.id || null;
}

export async function fetchRoomShares(localRoomId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { shares: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { shares: [] };

  const { data: room } = await supabase
    .from("rooms")
    .select("id, is_shared")
    .eq("user_id", user.id)
    .eq("name", localRoomId)
    .single();
  if (!room) return { shares: [], isShared: false };

  const { data: shares } = await supabase
    .from("room_shares")
    .select("id, shared_with_email, permission, accepted, status, email_sent, invite_message, created_at")
    .eq("room_id", room.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  return {
    shares: shares || [],
    isShared: room.is_shared,
  };
}

export async function shareRoomWithEmail(localRoomId: string, email: string, permission: string = "view", inviteMessage?: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (email.toLowerCase() === user.email?.toLowerCase()) return { error: "Cannot share with yourself" };

  const dbRoomId = await resolveRoomId(supabase, user.id, localRoomId);
  if (!dbRoomId) return { error: "Could not resolve room" };

  // Check if already shared with this email
  const { data: existing } = await supabase
    .from("room_shares")
    .select("id")
    .eq("room_id", dbRoomId)
    .eq("shared_with_email", email.toLowerCase())
    .single();
  if (existing) return { error: "Already shared with this person" };

  // Check if the invitee has an account — link their user ID if so
  const { data: inviteeProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  const validPermission = ["view", "contribute", "admin"].includes(permission) ? permission : "view";

  const { data: share, error } = await supabase
    .from("room_shares")
    .insert({
      room_id: dbRoomId,
      owner_id: user.id,
      shared_with_email: email.toLowerCase(),
      shared_with_id: inviteeProfile?.id || null,
      permission: validPermission,
      status: "pending",
      invite_message: inviteMessage || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Mark room as shared
  await supabase.from("rooms").update({ is_shared: true }).eq("id", dbRoomId);

  return { share };
}

export async function removeRoomShare(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the share to find room_id before deleting
  const { data: share } = await supabase
    .from("room_shares")
    .select("room_id")
    .eq("id", shareId)
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase
    .from("room_shares")
    .delete()
    .eq("id", shareId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  // Check if room still has shares — if not, mark as unshared
  if (share) {
    const { data: remaining } = await supabase
      .from("room_shares")
      .select("id")
      .eq("room_id", share.room_id)
      .limit(1);
    if (!remaining || remaining.length === 0) {
      await supabase.from("rooms").update({ is_shared: false }).eq("id", share.room_id);
    }
  }

  return { success: true };
}

// ═══ WING-LEVEL FAMILY SHARING ═══

const VALID_WINGS = ["family", "travel", "childhood", "career", "creativity"];

export async function shareWing(
  wingId: string,
  sharedWithEmail: string,
  permission: "view" | "contribute" = "view"
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!VALID_WINGS.includes(wingId)) return { error: "Invalid wing" };
  if (!sharedWithEmail.trim() || !sharedWithEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  const normalizedEmail = sharedWithEmail.trim().toLowerCase();

  if (normalizedEmail === user.email?.toLowerCase()) {
    return { error: "You cannot share a wing with yourself" };
  }

  // Verify the target user is a family member in the same group
  const { data: myMembership } = await supabase
    .from("family_members")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!myMembership) return { error: "You must be in a family group to share wings" };

  const { data: targetMember } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("group_id", myMembership.group_id)
    .eq("email", normalizedEmail)
    .eq("status", "active")
    .single();

  if (!targetMember || !targetMember.user_id) {
    return { error: "This person is not an active member of your family group" };
  }

  const validPermission = ["view", "contribute"].includes(permission) ? permission : "view";

  const { data: share, error } = await supabase
    .from("wing_shares")
    .upsert(
      {
        owner_id: user.id,
        shared_with_id: targetMember.user_id,
        wing_id: wingId,
        permission: validPermission,
      },
      { onConflict: "owner_id,shared_with_id,wing_id" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { share };
}

export async function unshareWing(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("wing_shares")
    .delete()
    .eq("id", shareId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getMyWingShares() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { shares: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { shares: [] };

  const { data: shares } = await supabase
    .from("wing_shares")
    .select("id, wing_id, permission, shared_with_id, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (!shares || shares.length === 0) return { shares: [] };

  // Resolve shared_with emails from profiles
  const userIds = [...new Set(shares.map((s) => s.shared_with_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const emailMap: Record<string, string> = {};
  (profiles || []).forEach((p: { id: string; email: string }) => {
    emailMap[p.id] = p.email || "Unknown";
  });

  const enrichedShares = shares.map((s) => ({
    ...s,
    shared_with_email: emailMap[s.shared_with_id] || "Unknown",
  }));

  return { shares: enrichedShares };
}

export async function getWingsSharedWithMe() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { shares: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { shares: [] };

  const { data: shares } = await supabase
    .from("wing_shares")
    .select("id, wing_id, permission, owner_id, created_at")
    .eq("shared_with_id", user.id)
    .order("created_at", { ascending: false });

  if (!shares || shares.length === 0) return { shares: [] };

  // Resolve owner emails from profiles
  const ownerIds = [...new Set(shares.map((s) => s.owner_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", ownerIds);

  const emailMap: Record<string, string> = {};
  (profiles || []).forEach((p: { id: string; email: string }) => {
    emailMap[p.id] = p.email || "Unknown";
  });

  const enrichedShares = shares.map((s) => ({
    ...s,
    owner_email: emailMap[s.owner_id] || "Unknown",
  }));

  return { shares: enrichedShares };
}

export async function toggleRoomSharing(localRoomId: string, enabled: boolean) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const dbRoomId = await resolveRoomId(supabase, user.id, localRoomId);
  if (!dbRoomId) return { error: "Could not resolve room" };

  await supabase.from("rooms").update({ is_shared: enabled }).eq("id", dbRoomId);

  // If disabling, remove all shares
  if (!enabled) {
    await supabase.from("room_shares").delete().eq("room_id", dbRoomId).eq("owner_id", user.id);
  }

  return { success: true };
}
