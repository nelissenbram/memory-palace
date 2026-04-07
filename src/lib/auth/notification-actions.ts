"use server";

import { createClient } from "@/lib/supabase/server";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  message: string;
  room_id: string | null;
  room_name: string | null;
  wing_id: string | null;
  from_user_id: string | null;
  from_user_name: string | null;
  read: boolean;
  created_at: string;
}

// ── Create a notification for the room owner when a contributor adds a memory ──
export async function createContributionNotification(data: {
  roomDbId: string;
  contributorId: string;
  memoryTitle: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const supabase = await createClient();

  // Find the room owner
  const { data: room } = await supabase
    .from("rooms")
    .select("id, user_id, name, wing_id")
    .eq("id", data.roomDbId)
    .single();

  if (!room) return;

  // Don't notify if the contributor IS the owner
  if (room.user_id === data.contributorId) return;

  // Get contributor display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.contributorId)
    .single();

  const fromName = profile?.display_name || "Someone";
  const roomName = room.name || "a room";
  const message = `${fromName} added a memory to ${roomName}`;

  // Try inserting into notifications table.
  // If the table doesn't exist yet, silently fail — the client uses localStorage fallback.
  try {
    await supabase.from("notifications").insert({
      user_id: room.user_id,
      type: "new_contribution",
      message,
      room_id: room.id,
      room_name: room.name,
      wing_id: room.wing_id,
      from_user_id: data.contributorId,
      from_user_name: fromName,
      read: false,
    });
  } catch {
    // Table may not exist — client falls back to localStorage
  }
}

// ── Generic: create a notification row (silently ignores missing table) ──
export async function createNotification(input: {
  userId: string;
  type: string;
  message: string;
  roomId?: string | null;
  roomName?: string | null;
  wingId?: string | null;
  fromUserId?: string | null;
  fromUserName?: string | null;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      message: input.message,
      room_id: input.roomId ?? null,
      room_name: input.roomName ?? null,
      wing_id: input.wingId ?? null,
      from_user_id: input.fromUserId ?? null,
      from_user_name: input.fromUserName ?? null,
      read: false,
    });
  } catch {
    // Table may not exist — client falls back to localStorage
  }
}

// ── Milestone check after a memory is created ──
const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];
const MILESTONE_COPY: Record<number, string> = {
  1: "🎉 Your very first memory is in the palace!",
  10: "🏆 10 memories preserved — you're off to a beautiful start.",
  25: "✨ 25 memories — the palace is taking shape.",
  50: "🌟 50 memories! You're officially an Archivist.",
  100: "👑 100 memories preserved — welcome to the Centurion club.",
  250: "📚 250 memories — your palace is becoming a living archive.",
  500: "🏛️ 500 memories! Incredible legacy.",
  1000: "💫 1000 memories — a truly remarkable palace.",
};

export async function checkAndNotifyMilestone(opts: {
  userId: string;
  totalMemories: number;
}) {
  if (!MILESTONES.includes(opts.totalMemories)) return;
  const msg = MILESTONE_COPY[opts.totalMemories];
  if (!msg) return;
  await createNotification({ userId: opts.userId, type: "achievement", message: msg });
}

// ── First memory in a room ──
export async function notifyFirstInRoom(opts: {
  userId: string;
  roomId: string;
  roomName: string;
}) {
  await createNotification({
    userId: opts.userId,
    type: "achievement",
    message: `🎨 First memory in "${opts.roomName}" — this room just came alive.`,
    roomId: opts.roomId,
    roomName: opts.roomName,
  });
}

// ── Family: member joined / accepted invite ──
export async function notifyFamilyJoined(opts: {
  ownerId: string;
  joinedName: string;
}) {
  await createNotification({
    userId: opts.ownerId,
    type: "family_invite",
    message: `👋 ${opts.joinedName} joined your family palace.`,
    fromUserName: opts.joinedName,
  });
}

// ── Fetch notifications for the current user ──
export async function fetchNotifications(): Promise<{ notifications: NotificationRow[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { notifications: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [] };

  // Last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { notifications: [] };
    return { notifications: (data || []) as NotificationRow[] };
  } catch {
    return { notifications: [] };
  }
}

// ── Mark a single notification as read ──
export async function markNotificationRead(notificationId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);
  } catch {
    // Silently fail
  }
}

// ── Mark all notifications as read ──
export async function markAllNotificationsRead() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  } catch {
    // Silently fail
  }
}
