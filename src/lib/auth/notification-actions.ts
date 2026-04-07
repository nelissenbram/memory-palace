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
// Also fires a real-time web push to all of the user's subscribed devices.
export async function createNotification(input: {
  userId: string;
  type: string;
  message: string;
  roomId?: string | null;
  roomName?: string | null;
  wingId?: string | null;
  fromUserId?: string | null;
  fromUserName?: string | null;
  pushTitle?: string;
  pushUrl?: string;
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

  // Fire real-time web push (best-effort; silent on failure)
  try {
    await pushToUserDevices({
      userId: input.userId,
      title: input.pushTitle || "Memory Palace",
      body: input.message,
      url: input.pushUrl || "/palace?notifications=1",
      tag: `activity-${input.type}-${Date.now()}`,
    });
  } catch {
    // Push infrastructure may not be configured
  }
}

// ── Real-time web push to all of a user's subscribed devices ──
async function pushToUserDevices(opts: {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("user_id", opts.userId);
  if (!subs || subs.length === 0) return;

  const { sendPush } = await import("@/lib/push");
  for (const sub of subs) {
    try {
      await sendPush(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        {
          title: opts.title,
          body: opts.body,
          icon: "/apple-touch-icon.png",
          badge: "/favicon.svg",
          tag: opts.tag || "activity",
          url: opts.url || "/palace",
        },
      );
    } catch {
      // Ignore individual failures
    }
  }
}

// ── Milestone check after a memory is created ──
const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];
const MILESTONE_COPY: Record<number, string> = {
  1: "✦ Your very first memory is in the palace.",
  10: "✦ Ten memories preserved — you're off to a beautiful start.",
  25: "✦ Twenty-five memories — the palace is taking shape.",
  50: "⚜ Fifty memories. You're officially an Archivist.",
  100: "⚜ One hundred memories — welcome to the Centurion club.",
  250: "❦ Two hundred and fifty — your palace is becoming a living archive.",
  500: "⚜ Five hundred memories. An extraordinary legacy.",
  1000: "❖ One thousand memories. A truly remarkable palace.",
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
    message: `❀ First memory in "${opts.roomName}" — this room just came alive.`,
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
    message: `❦ ${opts.joinedName} joined your family palace.`,
    fromUserName: opts.joinedName,
  });
}

const TEST_ACTIVITY_SAMPLES: { type: string; message: string }[] = [
  { type: "welcome",          message: "✧ Welcome to your Memory Palace — let's preserve something beautiful." },
  { type: "achievement",      message: "⚜ Ten memories preserved — you're off to a beautiful start." },
  { type: "achievement",      message: "❀ First memory in \"Atrium\" — this room just came alive." },
  { type: "family_invite",    message: "❦ Sofia joined your family palace." },
  { type: "new_contribution", message: "✎ Marcus added a memory to \"Living Room\"." },
  { type: "on_this_day",      message: "❧ On this day, 3 years ago — \"Grandpa's 80th birthday\"." },
  { type: "reminder",         message: "⧗ A quiet nudge: the Library has been patient. Want to add a story?" },
  { type: "system",           message: "⚜ A new feature has arrived in your palace. Explore the Atrium." },
];

// ── Seed one of each Activity type for the current user (test helper) ──
// Returns detailed diagnostics so the caller can surface what happened.
export async function seedTestActivities(): Promise<{
  ok: boolean;
  dbInserted: number;
  pushSent: number;
  subscriptionCount: number;
  vapidConfigured: boolean;
  dbError?: string;
  pushError?: string;
  samples: { type: string; message: string }[];
}> {
  const result = {
    ok: false,
    dbInserted: 0,
    pushSent: 0,
    subscriptionCount: 0,
    vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    dbError: undefined as string | undefined,
    pushError: undefined as string | undefined,
    samples: TEST_ACTIVITY_SAMPLES,
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    result.dbError = "Supabase not configured";
    return result;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.dbError = "Not authenticated";
    return result;
  }

  // How many subscribed devices does this user have?
  try {
    const { count } = await supabase
      .from("push_subscriptions")
      .select("endpoint", { count: "exact", head: true })
      .eq("user_id", user.id);
    result.subscriptionCount = count || 0;
  } catch { /* ignore */ }

  // Insert rows + push
  for (const s of TEST_ACTIVITY_SAMPLES) {
    // DB insert with real error capture
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        type: s.type,
        message: s.message,
        read: false,
      });
      if (error) {
        if (!result.dbError) result.dbError = error.message;
      } else {
        result.dbInserted++;
      }
    } catch (e) {
      if (!result.dbError) result.dbError = (e as Error).message;
    }

    // Push to devices (best-effort)
    if (result.vapidConfigured && result.subscriptionCount > 0) {
      try {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, keys_p256dh, keys_auth")
          .eq("user_id", user.id);
        if (subs) {
          const { sendPushDetailed } = await import("@/lib/push");
          for (const sub of subs) {
            const r = await sendPushDetailed(
              { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
              {
                title: "Memory Palace",
                body: s.message,
                icon: "/apple-touch-icon.png",
                badge: "/favicon.svg",
                tag: `activity-test-${s.type}-${Date.now()}`,
                url: "/palace?notifications=1",
              },
            );
            if (r.ok) result.pushSent++;
            else if (!result.pushError) result.pushError = r.error;
          }
        }
      } catch (e) {
        if (!result.pushError) result.pushError = (e as Error).message;
      }
    }
  }

  result.ok = true;
  return result;
}

// ── Fetch notifications for the current user ──
export async function fetchNotifications(): Promise<{ notifications: NotificationRow[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { notifications: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [] };

  // Last 365 days — activities persist; mark as read instead of deleting
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

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
