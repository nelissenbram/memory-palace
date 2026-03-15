"use server";

import { createClient } from "@/lib/supabase/server";
import { WINGS } from "@/lib/constants/wings";

// ── Public: get invite details for the landing page (no auth required) ──
export async function getInviteDetails(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const supabase = await createClient();

  const { data: share, error } = await supabase
    .from("room_shares")
    .select("id, room_id, owner_id, shared_with_email, permission, status, invite_message, created_at")
    .eq("id", shareId)
    .single();

  if (error || !share) return { error: "Invitation not found" };

  // Check status
  if (share.status === "declined") return { error: "This invitation was declined" };
  if (share.status === "expired") return { error: "This invitation has expired" };

  // Get inviter profile
  const { data: inviter } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", share.owner_id)
    .single();

  // Get room details
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, wing_id")
    .eq("id", share.room_id)
    .single();

  // Get wing info
  let wingName = "";
  let wingIcon = "";
  if (room?.wing_id) {
    const { data: wing } = await supabase
      .from("wings")
      .select("slug")
      .eq("id", room.wing_id)
      .single();
    if (wing?.slug) {
      const wingDef = WINGS.find(w => w.id === wing.slug);
      if (wingDef) {
        wingName = wingDef.name;
        wingIcon = wingDef.icon;
      }
    }
  }

  // Get memory count in the room
  const { count } = await supabase
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

// ── Accept an invite (requires auth) ──
export async function acceptInvite(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the share
  const { data: share } = await supabase
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
    share.shared_with_email.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: "This invitation was sent to a different email address" };
  }

  // Accept
  const { error } = await supabase
    .from("room_shares")
    .update({
      accepted: true,
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

  // Verify the invite belongs to this user before declining
  const userEmail = user.email?.toLowerCase();
  const { data: share } = await supabase
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

  const { error } = await supabase
    .from("room_shares")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Get pending invites for the current user (by email) ──
export async function getPendingInvites() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { invites: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { invites: [] };

  const { data: shares } = await supabase
    .from("room_shares")
    .select("id, room_id, owner_id, permission, status, invite_message, created_at")
    .or(`shared_with_email.eq."${user.email.toLowerCase()}",shared_with_id.eq."${user.id}"`)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });

  if (!shares || shares.length === 0) return { invites: [] };

  // Enrich each invite with inviter + room info
  const enriched = await Promise.all(
    shares.map(async (share) => {
      const { data: inviter } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", share.owner_id)
        .single();

      const { data: room } = await supabase
        .from("rooms")
        .select("name, wing_id")
        .eq("id", share.room_id)
        .single();

      let wingName = "";
      let wingIcon = "";
      if (room?.wing_id) {
        const { data: wing } = await supabase
          .from("wings")
          .select("slug")
          .eq("id", room.wing_id)
          .single();
        if (wing?.slug) {
          const wingDef = WINGS.find(w => w.id === wing.slug);
          if (wingDef) {
            wingName = wingDef.name;
            wingIcon = wingDef.icon;
          }
        }
      }

      return {
        id: share.id,
        permission: share.permission,
        message: share.invite_message,
        createdAt: share.created_at,
        inviterName: inviter?.display_name || "Someone",
        inviterAvatar: inviter?.avatar_url || null,
        roomName: room?.name || "A room",
        wingName,
        wingIcon,
      };
    })
  );

  return { invites: enriched };
}

// ── Get accepted shares for "Shared with me" panel ──
export async function getAcceptedShares() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { shares: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { shares: [] };

  const { data: shares } = await supabase
    .from("room_shares")
    .select("id, room_id, owner_id, permission, status, accepted_at")
    .or(`shared_with_email.eq."${user.email?.toLowerCase()}",shared_with_id.eq."${user.id}"`)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false });

  if (!shares || shares.length === 0) return { shares: [] };

  const enriched = await Promise.all(
    shares.map(async (share) => {
      const { data: inviter } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", share.owner_id)
        .single();

      const { data: room } = await supabase
        .from("rooms")
        .select("name, wing_id")
        .eq("id", share.room_id)
        .single();

      let wingName = "";
      let wingIcon = "";
      if (room?.wing_id) {
        const { data: wing } = await supabase
          .from("wings")
          .select("slug")
          .eq("id", room.wing_id)
          .single();
        if (wing?.slug) {
          const wingDef = WINGS.find(w => w.id === wing.slug);
          if (wingDef) {
            wingName = wingDef.name;
            wingIcon = wingDef.icon;
          }
        }
      }

      const { count } = await supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("room_id", share.room_id);

      return {
        id: share.id,
        roomId: share.room_id,
        permission: share.permission,
        acceptedAt: share.accepted_at,
        ownerName: inviter?.display_name || "Someone",
        ownerAvatar: inviter?.avatar_url || null,
        roomName: room?.name || "A room",
        wingName,
        wingIcon,
        memoryCount: count || 0,
      };
    })
  );

  return { shares: enriched };
}

// ── Auto-match invites after registration (called from auth callback) ──
export async function autoMatchInvites(userId: string, email: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const supabase = await createClient();

  // Find all pending shares for this email that don't have a shared_with_id yet
  const { data: pendingShares } = await supabase
    .from("room_shares")
    .select("id")
    .eq("shared_with_email", email.toLowerCase())
    .is("shared_with_id", null);

  if (pendingShares && pendingShares.length > 0) {
    await supabase
      .from("room_shares")
      .update({ shared_with_id: userId })
      .eq("shared_with_email", email.toLowerCase())
      .is("shared_with_id", null);
  }
}
