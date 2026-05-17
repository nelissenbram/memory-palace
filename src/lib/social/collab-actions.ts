"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/auth/plan-limits";

export interface Collaborator {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "viewer" | "editor" | "admin";
  invited_at: string;
  accepted_at: string | null;
}

/** Invite a collaborator to a room */
export async function inviteCollaborator(input: {
  roomId: string;
  targetUserId: string;
  role?: "viewer" | "editor";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Prevent self-invite
  if (user.id === input.targetUserId) {
    return { ok: false, error: "Cannot invite yourself" };
  }

  // Verify room ownership
  const { data: room } = await supabase
    .from("rooms")
    .select("id, user_id")
    .eq("id", input.roomId)
    .eq("user_id", user.id)
    .single();

  if (!room) return { ok: false, error: "Room not found or not owned by you" };

  // Subscription gate: check collaborator limits
  const sub = await getUserPlan(user.id);
  if (sub.plan === "free") {
    return { ok: false, error: "Upgrade to add collaborators" };
  }

  if (sub.plan === "keeper") {
    const { count } = await supabase
      .from("room_collaborators")
      .select("*", { count: "exact", head: true })
      .eq("room_id", input.roomId);
    if ((count || 0) >= 3) {
      return { ok: false, error: "Keeper plan allows up to 3 collaborators per room" };
    }
  }

  const { error } = await supabase.from("room_collaborators").insert({
    room_id: input.roomId,
    user_id: input.targetUserId,
    role: input.role || "viewer",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Already a collaborator" };
    }
    return { ok: false, error: error.message };
  }

  // Send notification to invitee (with i18n)
  try {
    const { createNotification } = await import("@/lib/auth/notification-actions");
    const { serverTf, getUserLocale } = await import("@/lib/i18n/server");
    const { data: ownerProfile } = await supabase
      .from("public_profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const { data: roomData } = await supabase
      .from("rooms")
      .select("name")
      .eq("id", input.roomId)
      .single();

    const locale = await getUserLocale(input.targetUserId);
    const ownerName = ownerProfile?.display_name || "Someone";
    const roomName = roomData?.name || "a room";

    await createNotification({
      userId: input.targetUserId,
      type: "collab_invite",
      message: serverTf("notif_collab_invite", locale, { name: ownerName, room: roomName }),
      roomId: input.roomId,
      roomName: roomData?.name || null,
      fromUserId: user.id,
      fromUserName: ownerProfile?.display_name || null,
    });
  } catch {
    // Notification system may not be ready
  }

  return { ok: true };
}

/** Accept a collaboration invite */
export async function acceptInvite(
  roomId: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("room_collaborators")
    .update({ accepted_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  return { ok: true };
}

/** Remove a collaborator from a room (room owner only) */
export async function removeCollaborator(input: {
  roomId: string;
  userId: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // Verify ownership
  const { data: room } = await supabase
    .from("rooms")
    .select("user_id")
    .eq("id", input.roomId)
    .eq("user_id", user.id)
    .single();

  if (!room) return { ok: false };

  await supabase
    .from("room_collaborators")
    .delete()
    .eq("room_id", input.roomId)
    .eq("user_id", input.userId);

  return { ok: true };
}

/** Get collaborators for a room */
export async function getCollaborators(
  roomId: string
): Promise<Collaborator[]> {
  const supabase = await createClient();

  const { data: collabs } = await supabase
    .from("room_collaborators")
    .select("id, user_id, role, invited_at, accepted_at")
    .eq("room_id", roomId)
    .order("invited_at", { ascending: true });

  if (!collabs || collabs.length === 0) return [];

  const userIds = collabs.map((c) => c.user_id);
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  return collabs.map((c) => {
    const p = profileMap.get(c.user_id);
    return {
      id: c.id,
      user_id: c.user_id,
      display_name: p?.display_name || null,
      avatar_url: p?.avatar_url || null,
      role: c.role as "viewer" | "editor" | "admin",
      invited_at: c.invited_at,
      accepted_at: c.accepted_at,
    };
  });
}
