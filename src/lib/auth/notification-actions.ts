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
