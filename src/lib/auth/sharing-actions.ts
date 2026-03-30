"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

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
    .select("id, shared_with_email, permission, accepted, status, email_sent, invite_message, can_add, can_edit, can_delete, created_at")
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

// ═══ WING-LEVEL SHARING ═══

const VALID_WINGS = ["family", "travel", "childhood", "career", "creativity"];

export async function shareWing(
  wingId: string,
  sharedWithEmail: string,
  permission: "view" | "contribute" = "view",
  options?: {
    inviteMessage?: string;
    canAdd?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  }
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

  // Verify the caller actually owns a wing with this slug
  const { data: ownedWing } = await supabase
    .from("wings")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", wingId)
    .single();
  if (!ownedWing) return { error: "Wing not found or not owned by you" };

  // Check if the invitee has an account — link their user ID if so
  const admin = createAdminClient();
  const { data: inviteeProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  // Check if already shared with this email
  const { data: existing } = await admin
    .from("wing_shares")
    .select("id")
    .eq("wing_id", wingId)
    .eq("owner_id", user.id)
    .eq("shared_with_email", normalizedEmail)
    .single();
  if (existing) return { error: "Already shared with this person" };

  const validPermission = ["view", "contribute"].includes(permission) ? permission : "view";

  const { data: share, error } = await admin
    .from("wing_shares")
    .insert({
      owner_id: user.id,
      shared_with_id: inviteeProfile?.id || null,
      shared_with_email: normalizedEmail,
      wing_id: wingId,
      permission: validPermission,
      status: "pending",
      invite_message: options?.inviteMessage || null,
      can_add: options?.canAdd ?? false,
      can_edit: options?.canEdit ?? false,
      can_delete: options?.canDelete ?? false,
    })
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

  const admin = createAdminClient();
  const { error } = await admin
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

  const admin = createAdminClient();
  const { data: shares } = await admin
    .from("wing_shares")
    .select("id, wing_id, permission, shared_with_id, shared_with_email, status, can_add, can_edit, can_delete, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (!shares || shares.length === 0) return { shares: [] };

  // Resolve shared_with display names from profiles
  const userIds = [...new Set(shares.map((s) => s.shared_with_id).filter(Boolean))];
  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    (profiles || []).forEach((p: { id: string; display_name: string | null; email: string | null }) => {
      nameMap[p.id] = p.display_name || p.email || "Unknown";
    });
  }

  const enrichedShares = shares.map((s) => ({
    ...s,
    shared_with_name: s.shared_with_id ? (nameMap[s.shared_with_id] || s.shared_with_email || "Unknown") : (s.shared_with_email || "Unknown"),
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

  const admin = createAdminClient();
  const { data: shares } = await admin
    .from("wing_shares")
    .select("id, wing_id, permission, owner_id, can_add, can_edit, can_delete, status, created_at")
    .eq("shared_with_id", user.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (!shares || shares.length === 0) return { shares: [] };

  // Resolve owner display names from profiles
  const ownerIds = [...new Set(shares.map((s) => s.owner_id))];
  const nameMap: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds);
    (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
      nameMap[p.id] = p.display_name || "Someone";
    });
  }

  const enrichedShares = shares.map((s) => ({
    ...s,
    owner_name: nameMap[s.owner_id] || "Someone",
  }));

  return { shares: enrichedShares };
}

export async function leaveWingShare(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify the share belongs to the current user as recipient
  const { data: share } = await admin
    .from("wing_shares")
    .select("id, shared_with_id")
    .eq("id", shareId)
    .eq("shared_with_id", user.id)
    .single();

  if (!share) return { error: "Share not found or not authorized" };

  const { error } = await admin
    .from("wing_shares")
    .delete()
    .eq("id", shareId)
    .eq("shared_with_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function leaveRoomShare(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify the share belongs to the current user as recipient
  const { data: share } = await admin
    .from("room_shares")
    .select("id, shared_with_id")
    .eq("id", shareId)
    .eq("shared_with_id", user.id)
    .single();

  if (!share) return { error: "Share not found or not authorized" };

  const { error } = await admin
    .from("room_shares")
    .delete()
    .eq("id", shareId)
    .eq("shared_with_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateSharePermissions(
  shareId: string,
  table: "wing_shares" | "room_shares",
  permissions: Partial<{ canAdd: boolean; canEdit: boolean; canDelete: boolean }>
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify the caller is the owner of this share
  const { data: share } = await admin
    .from(table)
    .select("id, owner_id")
    .eq("id", shareId)
    .eq("owner_id", user.id)
    .single();

  if (!share) return { error: "Share not found or not authorized" };

  const updatePayload: Record<string, boolean> = {};
  if (permissions.canAdd !== undefined) updatePayload.can_add = permissions.canAdd;
  if (permissions.canEdit !== undefined) updatePayload.can_edit = permissions.canEdit;
  if (permissions.canDelete !== undefined) updatePayload.can_delete = permissions.canDelete;

  const { error } = await admin
    .from(table)
    .update(updatePayload)
    .eq("id", shareId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getSharedWingData(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify the caller has an accepted wing_share
  const { data: share } = await admin
    .from("wing_shares")
    .select("id, wing_id, owner_id, permission, can_add, can_edit, can_delete, status")
    .eq("id", shareId)
    .eq("shared_with_id", user.id)
    .eq("status", "accepted")
    .single();

  if (!share) return { error: "Share not found or not accepted" };

  // Fetch the owner's wing details using the slug + owner_id join
  const { data: wing } = await admin
    .from("wings")
    .select("id, slug, custom_name, accent_color")
    .eq("slug", share.wing_id)
    .eq("user_id", share.owner_id)
    .single();

  if (!wing) return { error: "Wing not found" };

  // Fetch rooms for this wing
  const { data: rooms } = await admin
    .from("rooms")
    .select("id, name, icon, sort_order, is_shared, created_at")
    .eq("wing_id", wing.id)
    .eq("user_id", share.owner_id)
    .order("sort_order", { ascending: true });

  return {
    wing: {
      slug: wing.slug,
      customName: wing.custom_name,
      accentColor: wing.accent_color,
    },
    rooms: rooms || [],
    permission: share.permission,
    canAdd: share.can_add,
    canEdit: share.can_edit,
    canDelete: share.can_delete,
  };
}

export async function getSharedRoomMemories(
  roomId: string,
  shareContext: "wing" | "room",
  shareId: string
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  if (shareContext === "wing") {
    // Verify the caller has an accepted wing_share and the room belongs to that wing
    const { data: share } = await admin
      .from("wing_shares")
      .select("id, wing_id, owner_id, status")
      .eq("id", shareId)
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .single();

    if (!share) return { error: "Wing share not found or not accepted" };

    // Verify the room belongs to the shared wing (join via slug + owner_id)
    const { data: wing } = await admin
      .from("wings")
      .select("id")
      .eq("slug", share.wing_id)
      .eq("user_id", share.owner_id)
      .single();

    if (!wing) return { error: "Wing not found" };

    const { data: room } = await admin
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("wing_id", wing.id)
      .single();

    if (!room) return { error: "Room does not belong to the shared wing" };
  } else {
    // Room-level share: verify the room_id matches the share
    const { data: share } = await admin
      .from("room_shares")
      .select("id, room_id, status")
      .eq("id", shareId)
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .single();

    if (!share) return { error: "Room share not found or not accepted" };
    if (share.room_id !== roomId) return { error: "Room does not match the share" };
  }

  // Fetch memories for the room
  const { data: memories } = await admin
    .from("memories")
    .select("id, title, content, image_url, position_index, tags, created_at, updated_at")
    .eq("room_id", roomId)
    .order("position_index", { ascending: true });

  return { memories: memories || [] };
}

export async function getAllMyShares() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { sent: { wings: [], rooms: [] }, received: { wings: [], rooms: [] } };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sent: { wings: [], rooms: [] }, received: { wings: [], rooms: [] } };

  const admin = createAdminClient();
  const userEmail = user.email?.toLowerCase();

  // Fetch all shares in parallel
  const [
    { data: sentWings },
    { data: sentRooms },
    { data: receivedWings },
    { data: receivedRooms },
  ] = await Promise.all([
    admin
      .from("wing_shares")
      .select("id, wing_id, permission, shared_with_id, shared_with_email, status, can_add, can_edit, can_delete, invite_message, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("room_shares")
      .select("id, room_id, permission, shared_with_id, shared_with_email, status, can_add, can_edit, can_delete, invite_message, placed_in_wing_id, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("wing_shares")
      .select("id, wing_id, permission, owner_id, status, can_add, can_edit, can_delete, created_at")
      .eq("shared_with_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("room_shares")
      .select("id, room_id, permission, owner_id, status, can_add, can_edit, can_delete, placed_in_wing_id, created_at")
      .or(`shared_with_id.eq.${user.id}${userEmail ? `,shared_with_email.eq.${userEmail}` : ""}`)
      .order("created_at", { ascending: false }),
  ]);

  // Collect all user IDs for profile resolution
  const allUserIds = new Set<string>();
  (sentWings || []).forEach((s) => s.shared_with_id && allUserIds.add(s.shared_with_id));
  (sentRooms || []).forEach((s) => s.shared_with_id && allUserIds.add(s.shared_with_id));
  (receivedWings || []).forEach((s) => allUserIds.add(s.owner_id));
  (receivedRooms || []).forEach((s) => allUserIds.add(s.owner_id));

  const nameMap: Record<string, string> = {};
  if (allUserIds.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", Array.from(allUserIds));
    (profiles || []).forEach((p: { id: string; display_name: string | null; email: string | null }) => {
      nameMap[p.id] = p.display_name || p.email || "Unknown";
    });
  }

  // Collect room IDs for room name/icon resolution
  const allRoomIds = new Set<string>();
  (sentRooms || []).forEach((s) => allRoomIds.add(s.room_id));
  (receivedRooms || []).forEach((s) => allRoomIds.add(s.room_id));

  const roomInfoMap: Record<string, { name: string; icon: string; wing_id: string }> = {};
  if (allRoomIds.size > 0) {
    const { data: rooms } = await admin
      .from("rooms")
      .select("id, name, icon, wing_id")
      .in("id", Array.from(allRoomIds));
    (rooms || []).forEach((r: { id: string; name: string; icon: string; wing_id: string }) => {
      roomInfoMap[r.id] = { name: r.name, icon: r.icon || "", wing_id: r.wing_id };
    });
  }

  // Resolve room display name: check WING_ROOMS constants first, fall back to DB name
  function roomDisplayName(dbName: string): string {
    for (const rooms of Object.values(WING_ROOMS)) {
      const match = rooms.find((r: { id: string; name: string }) => r.id === dbName);
      if (match) return match.name;
    }
    return dbName;
  }
  function roomDisplayIcon(dbName: string, dbIcon: string): string {
    if (dbIcon) return dbIcon;
    for (const rooms of Object.values(WING_ROOMS)) {
      const match = rooms.find((r: { id: string; icon: string }) => r.id === dbName);
      if (match) return match.icon;
    }
    return "";
  }

  // Resolve wing display (slug → name + icon)
  function wingDisplay(slug: string): { name: string; icon: string } {
    const def = WINGS.find(w => w.id === slug);
    return def ? { name: def.name, icon: def.icon } : { name: slug.charAt(0).toUpperCase() + slug.slice(1), icon: "" };
  }

  // Resolve wing name for a room's wing_id (UUID → slug lookup)
  const wingIdToSlug: Record<string, string> = {};
  const wingUuids = new Set<string>();
  Object.values(roomInfoMap).forEach((r) => wingUuids.add(r.wing_id));
  if (wingUuids.size > 0) {
    const { data: wingRows } = await admin
      .from("wings")
      .select("id, slug, custom_name")
      .in("id", Array.from(wingUuids));
    (wingRows || []).forEach((w: { id: string; slug: string; custom_name: string | null }) => {
      wingIdToSlug[w.id] = w.slug;
    });
  }

  return {
    sent: {
      wings: (sentWings || []).map((s) => {
        const wd = wingDisplay(s.wing_id);
        return {
          ...s,
          type: "wing" as const,
          recipientName: s.shared_with_id ? (nameMap[s.shared_with_id] || s.shared_with_email || "Unknown") : (s.shared_with_email || "Unknown"),
          wingName: wd.name,
          wingIcon: wd.icon,
        };
      }),
      rooms: (sentRooms || []).map((s) => {
        const ri = roomInfoMap[s.room_id];
        const wingSlug = ri ? wingIdToSlug[ri.wing_id] || "" : "";
        const wd = wingSlug ? wingDisplay(wingSlug) : { name: "", icon: "" };
        return {
          ...s,
          type: "room" as const,
          recipientName: s.shared_with_id ? (nameMap[s.shared_with_id] || s.shared_with_email || "Unknown") : (s.shared_with_email || "Unknown"),
          roomName: ri ? roomDisplayName(ri.name) : "Unknown room",
          roomIcon: ri ? roomDisplayIcon(ri.name, ri.icon) : "",
          wingName: wd.name,
        };
      }),
    },
    received: {
      wings: (receivedWings || []).map((s) => {
        const wd = wingDisplay(s.wing_id);
        return {
          ...s,
          type: "wing" as const,
          ownerName: nameMap[s.owner_id] || "Someone",
          wingName: wd.name,
          wingIcon: wd.icon,
        };
      }),
      rooms: (receivedRooms || []).map((s) => {
        const ri = roomInfoMap[s.room_id];
        const wingSlug = ri ? wingIdToSlug[ri.wing_id] || "" : "";
        const wd = wingSlug ? wingDisplay(wingSlug) : { name: "", icon: "" };
        return {
          ...s,
          type: "room" as const,
          ownerName: nameMap[s.owner_id] || "Someone",
          roomName: ri ? roomDisplayName(ri.name) : "Unknown room",
          roomIcon: ri ? roomDisplayIcon(ri.name, ri.icon) : "",
          placedInWingName: wd.name,
        };
      }),
    },
  };
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
