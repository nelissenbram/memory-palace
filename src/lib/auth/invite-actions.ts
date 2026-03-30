"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

// ── Helper: resolve local room ID to display name ──
function roomDisplayName(dbName: string): string {
  for (const rooms of Object.values(WING_ROOMS)) {
    const match = rooms.find((r: { id: string; name: string }) => r.id === dbName);
    if (match) return match.name;
  }
  return dbName;
}

// ── Helper: resolve wing name/icon from a wing row ──
function resolveWingDisplay(slug: string, customName?: string | null) {
  const wingDef = WINGS.find(w => w.id === slug);
  if (wingDef) {
    return { name: wingDef.name, icon: wingDef.icon };
  }
  return {
    name: customName || slug.charAt(0).toUpperCase() + slug.slice(1),
    icon: "",
  };
}

// ── Helper: get wing name/icon from a room's wing_id ──
async function getWingDisplayForRoom(
  client: ReturnType<typeof createAdminClient>,
  wingId: string
) {
  const { data: wing } = await client
    .from("wings")
    .select("slug, custom_name")
    .eq("id", wingId)
    .single();
  if (!wing) return { name: "", icon: "" };
  return resolveWingDisplay(wing.slug, wing.custom_name);
}

// ── Public: get invite details for a ROOM share landing page (no auth required) ──
export async function getInviteDetails(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const admin = createAdminClient();

  const { data: share, error } = await admin
    .from("room_shares")
    .select("id, room_id, owner_id, shared_with_email, permission, status, invite_message, created_at")
    .eq("id", shareId)
    .single();

  if (error || !share) return { error: "Invitation not found" };

  // Check status
  if (share.status === "declined") return { error: "This invitation was declined" };
  if (share.status === "expired") return { error: "This invitation has expired" };

  // Get inviter profile
  const { data: inviter } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", share.owner_id)
    .single();

  // Get room details
  const { data: room } = await admin
    .from("rooms")
    .select("id, name, wing_id")
    .eq("id", share.room_id)
    .single();

  // Get wing info
  let wingName = "";
  let wingIcon = "";
  if (room?.wing_id) {
    const wingDisplay = await getWingDisplayForRoom(admin, room.wing_id);
    wingName = wingDisplay.name;
    wingIcon = wingDisplay.icon;
  }

  // Get memory count in the room
  const { count } = await admin
    .from("memories")
    .select("id", { count: "exact", head: true })
    .eq("room_id", share.room_id);

  return {
    invite: {
      id: share.id,
      permission: share.permission,
      status: share.status || "pending",
      message: share.invite_message,
      createdAt: share.created_at,
      recipientEmail: share.shared_with_email,
    },
    inviter: {
      name: inviter?.display_name || "Someone",
      avatarUrl: inviter?.avatar_url || null,
    },
    room: {
      name: room?.name || "A Memory Room",
    },
    wing: {
      name: wingName,
      icon: wingIcon,
    },
    memoryCount: count || 0,
  };
}

// ── Public: get invite details for a WING share landing page (no auth required) ──
export async function getWingInviteDetails(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const admin = createAdminClient();

  const { data: share, error } = await admin
    .from("wing_shares")
    .select("id, wing_id, owner_id, shared_with_email, permission, status, invite_message, can_add, can_edit, can_delete, created_at")
    .eq("id", shareId)
    .single();

  if (error || !share) return { error: "Invitation not found" };

  if (share.status === "declined") return { error: "This invitation was declined" };
  if (share.status === "expired") return { error: "This invitation has expired" };

  // Get inviter profile
  const { data: inviter } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", share.owner_id)
    .single();

  // Get wing info (join via slug + owner_id)
  const { data: wing } = await admin
    .from("wings")
    .select("id, slug, custom_name, accent_color")
    .eq("slug", share.wing_id)
    .eq("user_id", share.owner_id)
    .single();

  const wingDisplay = resolveWingDisplay(share.wing_id, wing?.custom_name);

  // Get room count for this wing
  let roomCount = 0;
  let memoryCount = 0;
  if (wing) {
    const { count: rCount } = await admin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("wing_id", wing.id)
      .eq("user_id", share.owner_id);
    roomCount = rCount || 0;

    // Get total memories across all rooms in this wing
    const { data: rooms } = await admin
      .from("rooms")
      .select("id")
      .eq("wing_id", wing.id)
      .eq("user_id", share.owner_id);

    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map((r: { id: string }) => r.id);
      const { count: mCount } = await admin
        .from("memories")
        .select("id", { count: "exact", head: true })
        .in("room_id", roomIds);
      memoryCount = mCount || 0;
    }
  }

  return {
    invite: {
      id: share.id,
      permission: share.permission,
      status: share.status || "pending",
      message: share.invite_message,
      createdAt: share.created_at,
      recipientEmail: share.shared_with_email,
      canAdd: share.can_add,
      canEdit: share.can_edit,
      canDelete: share.can_delete,
    },
    inviter: {
      name: inviter?.display_name || "Someone",
      avatarUrl: inviter?.avatar_url || null,
    },
    wing: {
      name: wingDisplay.name,
      icon: wingDisplay.icon,
      accentColor: wing?.accent_color || null,
    },
    roomCount,
    memoryCount,
  };
}

// ── Accept a ROOM invite (requires auth) ──
export async function acceptInvite(shareId: string, placedInWingId?: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Fetch the share
  const { data: share } = await admin
    .from("room_shares")
    .select("id, shared_with_email, status, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: "Invitation not found" };
  if (share.status === "accepted") return { error: "Already accepted", alreadyAccepted: true };
  if (share.status === "declined") return { error: "This invitation was declined" };
  if (share.status === "expired") return { error: "This invitation has expired" };

  // Verify the email matches (or shared_with_id was already linked)
  const userEmail = user.email?.toLowerCase();
  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: "This invitation was sent to a different email address" };
  }

  // Accept (use admin client to bypass RLS update policy)
  const updatePayload: Record<string, unknown> = {
    accepted: true,
    status: "accepted",
    shared_with_id: user.id,
    accepted_at: new Date().toISOString(),
  };
  if (placedInWingId) {
    updatePayload.placed_in_wing_id = placedInWingId;
  }

  const { error } = await admin
    .from("room_shares")
    .update(updatePayload)
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Accept a WING invite (requires auth) ──
export async function acceptWingInvite(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Fetch the share
  const { data: share } = await admin
    .from("wing_shares")
    .select("id, shared_with_email, status, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: "Invitation not found" };
  if (share.status === "accepted") return { error: "Already accepted", alreadyAccepted: true };
  if (share.status === "declined") return { error: "This invitation was declined" };
  if (share.status === "expired") return { error: "This invitation has expired" };

  // Verify the email matches or shared_with_id was already linked
  const userEmail = user.email?.toLowerCase();
  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: "This invitation was sent to a different email address" };
  }

  const { error } = await admin
    .from("wing_shares")
    .update({
      status: "accepted",
      shared_with_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Decline an invite (requires auth) ──
export async function declineInvite(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify the invite belongs to this user before declining
  const userEmail = user.email?.toLowerCase();
  const { data: share } = await admin
    .from("room_shares")
    .select("id, shared_with_email, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: "Invitation not found" };

  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: "Not authorized to decline this invitation" };
  }

  const { error } = await admin
    .from("room_shares")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Get pending invites for the current user (both wing and room) ──
export async function getPendingInvites() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { invites: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { invites: [] };

  const admin = createAdminClient();
  const userEmail = user.email.toLowerCase();

  // Fetch pending room shares and wing shares in parallel
  const [{ data: roomShares }, { data: wingShares }] = await Promise.all([
    admin
      .from("room_shares")
      .select("id, room_id, owner_id, permission, status, invite_message, created_at")
      .or(`shared_with_email.eq.${userEmail},shared_with_id.eq.${user.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    admin
      .from("wing_shares")
      .select("id, wing_id, owner_id, permission, status, invite_message, can_add, can_edit, can_delete, created_at")
      .or(`shared_with_email.eq.${userEmail},shared_with_id.eq.${user.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  // Collect all owner IDs for profile lookup
  const ownerIds = new Set<string>();
  (roomShares || []).forEach((s) => ownerIds.add(s.owner_id));
  (wingShares || []).forEach((s) => ownerIds.add(s.owner_id));

  const nameMap: Record<string, { name: string; avatar: string | null }> = {};
  if (ownerIds.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(ownerIds));
    (profiles || []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
      nameMap[p.id] = {
        name: p.display_name || "Someone",
        avatar: p.avatar_url || null,
      };
    });
  }

  // Enrich room invites
  const enrichedRooms = await Promise.all(
    (roomShares || []).map(async (share) => {
      const { data: room } = await admin
        .from("rooms")
        .select("name, wing_id")
        .eq("id", share.room_id)
        .single();

      let wingName = "";
      let wingIcon = "";
      if (room?.wing_id) {
        const wingDisplay = await getWingDisplayForRoom(admin, room.wing_id);
        wingName = wingDisplay.name;
        wingIcon = wingDisplay.icon;
      }

      const inviter = nameMap[share.owner_id] || { name: "Someone", avatar: null };

      return {
        id: share.id,
        type: "room" as const,
        permission: share.permission,
        message: share.invite_message,
        createdAt: share.created_at,
        inviterName: inviter.name,
        inviterAvatar: inviter.avatar,
        roomName: room?.name || "A room",
        wingName,
        wingIcon,
      };
    })
  );

  // Enrich wing invites
  const enrichedWings = (wingShares || []).map((share) => {
    const wingDisplay = resolveWingDisplay(share.wing_id);
    const inviter = nameMap[share.owner_id] || { name: "Someone", avatar: null };

    return {
      id: share.id,
      type: "wing" as const,
      permission: share.permission,
      message: share.invite_message,
      createdAt: share.created_at,
      inviterName: inviter.name,
      inviterAvatar: inviter.avatar,
      wingId: share.wing_id,
      wingName: wingDisplay.name,
      wingIcon: wingDisplay.icon,
      canAdd: share.can_add,
      canEdit: share.can_edit,
      canDelete: share.can_delete,
    };
  });

  return { invites: [...enrichedWings, ...enrichedRooms] };
}

// ── Get accepted shares for "Shared with me" panel ──
export async function getAcceptedShares() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { shares: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { shares: [] };

  const admin = createAdminClient();
  const userEmail = user.email?.toLowerCase();

  // Fetch both room and wing accepted shares in parallel
  const [{ data: roomShares }, { data: wingShares }] = await Promise.all([
    admin
      .from("room_shares")
      .select("id, room_id, owner_id, permission, status, accepted_at, can_add, can_edit, can_delete, placed_in_wing_id")
      .or(`shared_with_id.eq.${user.id}${userEmail ? `,shared_with_email.eq.${userEmail}` : ""}`)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false }),
    admin
      .from("wing_shares")
      .select("id, wing_id, owner_id, permission, status, accepted_at, can_add, can_edit, can_delete")
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false }),
  ]);

  // Collect all owner IDs
  const ownerIds = new Set<string>();
  (roomShares || []).forEach((s) => ownerIds.add(s.owner_id));
  (wingShares || []).forEach((s) => ownerIds.add(s.owner_id));

  const nameMap: Record<string, { name: string; avatar: string | null }> = {};
  if (ownerIds.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(ownerIds));
    (profiles || []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
      nameMap[p.id] = {
        name: p.display_name || "Someone",
        avatar: p.avatar_url || null,
      };
    });
  }

  // Enrich room shares
  const enrichedRooms = await Promise.all(
    (roomShares || []).map(async (share) => {
      const { data: room } = await admin
        .from("rooms")
        .select("name, wing_id")
        .eq("id", share.room_id)
        .single();

      let wingName = "";
      let wingIcon = "";
      if (room?.wing_id) {
        const wingDisplay = await getWingDisplayForRoom(admin, room.wing_id);
        wingName = wingDisplay.name;
        wingIcon = wingDisplay.icon;
      }

      const { count } = await admin
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("room_id", share.room_id);

      const owner = nameMap[share.owner_id] || { name: "Someone", avatar: null };

      return {
        id: share.id,
        type: "room" as const,
        roomId: share.room_id,
        permission: share.permission,
        acceptedAt: share.accepted_at,
        ownerName: owner.name,
        ownerAvatar: owner.avatar,
        roomName: room ? roomDisplayName(room.name) : "A room",
        wingName,
        wingIcon,
        memoryCount: count || 0,
        canAdd: share.can_add,
        canEdit: share.can_edit,
        canDelete: share.can_delete,
        placedInWingId: share.placed_in_wing_id,
      };
    })
  );

  // Enrich wing shares (fetch rooms for each shared wing)
  const enrichedWings = await Promise.all(
    (wingShares || []).map(async (share) => {
      const wingDisplay = resolveWingDisplay(share.wing_id);
      const owner = nameMap[share.owner_id] || { name: "Someone", avatar: null };

      // Fetch the owner's wing UUID from slug + owner_id
      const { data: wing } = await admin
        .from("wings")
        .select("id")
        .eq("slug", share.wing_id)
        .eq("user_id", share.owner_id)
        .single();

      // Fetch rooms in the wing
      let rooms: { id: string; name: string; icon: string; memoryCount: number }[] = [];
      if (wing) {
        const { data: wingRooms } = await admin
          .from("rooms")
          .select("id, name, icon")
          .eq("wing_id", wing.id)
          .eq("user_id", share.owner_id)
          .order("sort_order", { ascending: true });

        if (wingRooms && wingRooms.length > 0) {
          // Fetch memory counts for each room
          const roomIds = wingRooms.map((r: { id: string }) => r.id);
          const { data: memCounts } = await admin
            .from("memories")
            .select("room_id")
            .in("room_id", roomIds);

          const countMap: Record<string, number> = {};
          (memCounts || []).forEach((m: { room_id: string }) => {
            countMap[m.room_id] = (countMap[m.room_id] || 0) + 1;
          });

          rooms = wingRooms.map((r: { id: string; name: string; icon: string }) => ({
            id: r.id,
            name: r.name,
            icon: r.icon || "",
            memoryCount: countMap[r.id] || 0,
          }));
        }
      }

      const totalMemories = rooms.reduce((n, r) => n + r.memoryCount, 0);

      return {
        id: share.id,
        type: "wing" as const,
        wingId: share.wing_id,
        permission: share.permission,
        acceptedAt: share.accepted_at,
        ownerName: owner.name,
        ownerAvatar: owner.avatar,
        wingName: wingDisplay.name,
        wingIcon: wingDisplay.icon,
        canAdd: share.can_add,
        canEdit: share.can_edit,
        canDelete: share.can_delete,
        rooms,
        memoryCount: totalMemories,
      };
    })
  );

  return { shares: [...enrichedWings, ...enrichedRooms] };
}

// ── Auto-match invites after registration (called from auth callback) ──
export async function autoMatchInvites(userId: string, email: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  // Match both room_shares and wing_shares in parallel
  await Promise.all([
    admin
      .from("room_shares")
      .update({ shared_with_id: userId })
      .eq("shared_with_email", normalizedEmail)
      .is("shared_with_id", null),
    admin
      .from("wing_shares")
      .update({ shared_with_id: userId })
      .eq("shared_with_email", normalizedEmail)
      .is("shared_with_id", null),
  ]);
}
