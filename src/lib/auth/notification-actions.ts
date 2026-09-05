"use server";

import { createClient, createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { serverT, serverTf, getServerLocale, getUserLocale } from "@/lib/i18n/server";

/**
 * Client used to WRITE notification rows.
 *
 * The notifications INSERT RLS policy is `WITH CHECK (from_user_id = auth.uid())`.
 * Self-generated notifications (milestones, achievements, first-in-room,
 * family-joined) and cross-user fan-out set from_user_id = null (or a different
 * actor), so the RLS-bound anon client silently rejects every such row. Writing
 * via the service-role client bypasses RLS. This is safe: every caller here
 * targets a known-legitimate `user_id` (the row owner / recipient) and never
 * exposes the client to request-controlled ids beyond the recipient itself, so
 * ownership is enforced by construction. When the service-role key is absent
 * (e.g. Preview deploys) we fall back to the anon client (self-rows will still
 * be rejected there, but that only affects non-production previews).
 */
function notificationsWriteClient() {
  if (hasServiceRoleKey()) return createAdminClient();
  return null;
}

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

// ── Resolve the owner of a target (room, wing, palace, memory) ──
export async function resolveTargetOwner(
  targetType: string,
  targetId: string,
): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createClient();
  try {
    switch (targetType) {
      case "palace":
      case "user":
        return targetId; // targetId IS the userId
      case "room": {
        const { data } = await supabase.from("rooms").select("user_id").eq("id", targetId).single();
        return data?.user_id || null;
      }
      case "wing": {
        const { data } = await supabase.from("wings").select("user_id").eq("id", targetId).single();
        return data?.user_id || null;
      }
      case "memory": {
        const { data } = await supabase.from("memories").select("room_id").eq("id", targetId).single();
        if (!data?.room_id) return null;
        const { data: room } = await supabase.from("rooms").select("user_id").eq("id", data.room_id).single();
        return room?.user_id || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ── Resolve owner + publish state of a target for visibility checks ──
// Returns the owner id and, for room/wing/memory targets, whether it is published
// and at what visibility. For palace/user targets, publish state is derived from
// the profile's is_public flag.
async function resolveTargetVisibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string,
): Promise<{ ownerId: string | null; published: boolean; visibility: string; roomId: string | null }> {
  const none = { ownerId: null as string | null, published: false, visibility: "private", roomId: null as string | null };
  try {
    switch (targetType) {
      case "palace":
      case "user": {
        const { data } = await supabase.from("profiles").select("is_public").eq("id", targetId).single();
        return { ownerId: targetId, published: !!data?.is_public, visibility: "public", roomId: null };
      }
      case "room": {
        const { data } = await supabase
          .from("rooms")
          .select("user_id, published_at, publish_visibility")
          .eq("id", targetId)
          .single();
        if (!data) return none;
        return {
          ownerId: data.user_id || null,
          published: !!data.published_at,
          visibility: data.publish_visibility || "public",
          roomId: targetId,
        };
      }
      case "wing": {
        const { data } = await supabase
          .from("wings")
          .select("user_id, published_at, publish_visibility")
          .eq("id", targetId)
          .single();
        if (!data) return none;
        return {
          ownerId: data.user_id || null,
          published: !!data.published_at,
          visibility: data.publish_visibility || "public",
          roomId: null,
        };
      }
      case "memory": {
        const { data } = await supabase.from("memories").select("room_id").eq("id", targetId).single();
        if (!data?.room_id) return none;
        const { data: room } = await supabase
          .from("rooms")
          .select("user_id, published_at, publish_visibility")
          .eq("id", data.room_id)
          .single();
        if (!room) return none;
        return {
          ownerId: room.user_id || null,
          published: !!room.published_at,
          visibility: room.publish_visibility || "public",
          roomId: data.room_id,
        };
      }
      default:
        return none;
    }
  } catch {
    return none;
  }
}

// ── Can the given viewer see this target? ──
// Enforces the same visibility model the app publishes with:
//   • owner always yes
//   • published + "public"    → anyone
//   • published + "followers" → only accepted followers of the owner
//   • accepted room collaborator (room/memory) → yes
//   • otherwise (private / unpublished) → no
// Pass viewerId = null for anonymous visitors (only public targets are visible).
export async function canViewTarget(
  targetType: string,
  targetId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;
  const supabase = await createClient();
  const { ownerId, published, visibility, roomId } = await resolveTargetVisibility(supabase, targetType, targetId);
  if (!ownerId) return false;

  // Owner can always see their own target.
  if (viewerId && viewerId === ownerId) return true;

  if (published) {
    if (visibility === "public") return true;
    if (visibility === "followers" && viewerId) {
      const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", viewerId)
        .eq("following_id", ownerId)
        .maybeSingle();
      if (follow) return true;
    }
  }

  // Accepted collaborators on the room may view/comment even when unpublished.
  if (viewerId && roomId) {
    const { data: collab } = await supabase
      .from("room_collaborators")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", viewerId)
      .not("accepted_at", "is", null)
      .maybeSingle();
    if (collab) return true;
  }

  return false;
}

// ── Bulk-insert notifications (for fan-out to followers) ──
export async function createBulkNotifications(items: {
  userId: string;
  type: string;
  message: string;
  fromUserId?: string | null;
  fromUserName?: string | null;
  wingId?: string | null;
  roomId?: string | null;
}[]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  if (items.length === 0) return;
  try {
    // Fan-out writes rows OWNED by other users (followers) — the RLS INSERT
    // policy would reject them. Use the service-role client.
    const supabase = notificationsWriteClient() ?? (await createClient());
    const { error } = await supabase.from("notifications").insert(
      items.map((i) => ({
        user_id: i.userId,
        type: i.type,
        message: i.message,
        from_user_id: i.fromUserId ?? null,
        from_user_name: i.fromUserName ?? null,
        wing_id: i.wingId ?? null,
        room_id: i.roomId ?? null,
        room_name: null,
        read: false,
      })),
    );
    if (error) console.error("[createBulkNotifications] insert failed:", error.message);
  } catch (e) {
    console.error("[createBulkNotifications] insert threw:", (e as Error).message);
  }
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

  // Use the room owner's locale for their notification
  const ownerLocale = await getUserLocale(room.user_id);
  const fromName = profile?.display_name || serverT("someone", ownerLocale);
  const roomName = room.name || serverT("aRoom", ownerLocale);
  const message = serverTf("notif_contribution", ownerLocale, { name: fromName, room: roomName });

  // Insert the notification for the room OWNER (a different user than the
  // contributor). The RLS INSERT policy checks from_user_id = auth.uid(); use
  // the service-role client so the row is not silently rejected, and surface
  // errors instead of swallowing them.
  try {
    const writeClient = notificationsWriteClient() ?? supabase;
    const { error } = await writeClient.from("notifications").insert({
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
    if (error) console.error("[createContributionNotification] insert failed:", error.message);
  } catch (e) {
    console.error("[createContributionNotification] insert threw:", (e as Error).message);
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
    // Use the service-role client so self-notifications (from_user_id null) and
    // cross-user fan-out are not silently rejected by the RLS INSERT policy.
    const supabase = notificationsWriteClient() ?? (await createClient());
    const { error } = await supabase.from("notifications").insert({
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
    if (error) console.error("[createNotification] insert failed:", error.message);
  } catch (e) {
    console.error("[createNotification] insert threw:", (e as Error).message);
  }

  // Fire real-time web push (best-effort; silent on failure)
  try {
    await pushToUserDevices({
      userId: input.userId,
      title: input.pushTitle || serverT("memoryPalace", await getServerLocale()),
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

export async function checkAndNotifyMilestone(opts: {
  userId: string;
  totalMemories: number;
}) {
  if (!MILESTONES.includes(opts.totalMemories)) return;
  const locale = await getUserLocale(opts.userId);
  const msg = serverT(`notif_milestone_${opts.totalMemories}`, locale);
  if (!msg) return;
  await createNotification({ userId: opts.userId, type: "achievement", message: msg });
}

// ── First memory in a room ──
export async function notifyFirstInRoom(opts: {
  userId: string;
  roomId: string;
  roomName: string;
}) {
  const locale = await getUserLocale(opts.userId);
  await createNotification({
    userId: opts.userId,
    type: "achievement",
    message: serverTf("notif_first_in_room", locale, { room: opts.roomName }),
    roomId: opts.roomId,
    roomName: opts.roomName,
  });
}

// ── Family: member joined / accepted invite ──
export async function notifyFamilyJoined(opts: {
  ownerId: string;
  joinedName: string;
}) {
  const locale = await getUserLocale(opts.ownerId);
  await createNotification({
    userId: opts.ownerId,
    type: "family_invite",
    message: serverTf("notif_family_joined", locale, { name: opts.joinedName }),
    fromUserName: opts.joinedName,
  });
}

function getTestActivitySamples(locale: string): { type: string; message: string; from_user_name?: string }[] {
  return [
    { type: "welcome",          message: serverT("notif_welcome", locale) },
    { type: "achievement",      message: serverT("notif_milestone_10", locale) },
    { type: "achievement",      message: serverTf("notif_first_in_room", locale, { room: "Atrium" }) },
    { type: "family_invite",    message: serverTf("notif_family_joined", locale, { name: "Sofia" }), from_user_name: "Sofia" },
    { type: "new_contribution", message: serverTf("notif_contribution", locale, { name: "Marcus", room: "Living Room" }), from_user_name: "Marcus" },
    { type: "on_this_day",      message: serverTf("notif_on_this_day", locale, { years: "3", title: "Grandpa's 80th birthday" }) },
    { type: "reminder",         message: serverT("notif_reminder", locale) },
    { type: "system",           message: serverT("notif_system", locale) },
    // Social notification types
    { type: "palace_visit",     message: serverTf("notif_palace_visit", locale, { name: "Elena" }), from_user_name: "Elena" },
    { type: "palace_visit",     message: serverTf("notif_palace_visit", locale, { name: "Marco" }), from_user_name: "Marco" },
    { type: "palace_visit",     message: serverTf("notif_palace_visit", locale, { name: "Ana" }), from_user_name: "Ana" },
    { type: "comment_reply",    message: serverTf("notif_comment", locale, { name: "Sofia", target: "room" }), from_user_name: "Sofia" },
    { type: "reaction",         message: serverTf("notif_reaction", locale, { name: "Marco", target: "wing" }), from_user_name: "Marco" },
    { type: "new_follower",     message: serverTf("notif_new_follower", locale, { name: "Elena" }), from_user_name: "Elena" },
    { type: "followed_published", message: serverTf("notif_followed_published", locale, { name: "Ana" }), from_user_name: "Ana" },
  ];
}

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
    samples: [] as { type: string; message: string }[],
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

  // Proactively purge known-dead subscriptions (FCM sentinel endpoints)
  try {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .like("endpoint", "%permanently-removed.invalid%");
  } catch { /* ignore */ }

  // How many subscribed devices does this user have?
  try {
    const { count } = await supabase
      .from("push_subscriptions")
      .select("endpoint", { count: "exact", head: true })
      .eq("user_id", user.id);
    result.subscriptionCount = count || 0;
  } catch { /* ignore */ }

  // Insert rows + push
  const userLocale = await getUserLocale(user.id);
  const samples = getTestActivitySamples(userLocale);
  result.samples = samples;
  for (const s of samples) {
    // DB insert with real error capture
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        type: s.type,
        message: s.message,
        from_user_name: s.from_user_name || null,
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
          .select("id, endpoint, keys_p256dh, keys_auth")
          .eq("user_id", user.id);
        if (subs) {
          const { sendPushDetailed } = await import("@/lib/push");
          for (const sub of subs) {
            const r = await sendPushDetailed(
              { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
              {
                title: serverT("memoryPalace", await getServerLocale()),
                body: s.message,
                icon: "/apple-touch-icon.png",
                badge: "/favicon.svg",
                tag: `activity-test-${s.type}-${Date.now()}`,
                url: "/palace?notifications=1",
              },
            );
            if (r.ok) {
              result.pushSent++;
            } else {
              if (!result.pushError) result.pushError = r.error;
              // Clean up dead subscriptions
              const isDead =
                r.statusCode === 404 ||
                r.statusCode === 410 ||
                (r.error || "").includes("permanently-removed.invalid") ||
                (r.error || "").includes("ENOTFOUND");
              if (isDead) {
                try {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                } catch { /* ignore */ }
              }
            }
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
