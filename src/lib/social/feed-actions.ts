"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionType =
  | "shared_room"
  | "shared_wing"
  | "commented"
  | "reacted"
  | "followed"
  | "visited"
  | "published"
  | "achieved"
  | "grounded_memory";

export interface FeedItem {
  id: string;
  actor_id: string;
  actor_name: string | null;
  actor_avatar: string | null;
  action_type: ActionType;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Record a social activity */
export async function recordActivity(input: {
  actionType: ActionType;
  targetType?: string;
  targetId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase.from("activity_feed").insert({
      actor_id: user.id,
      target_user_id: input.targetUserId || null,
      action_type: input.actionType,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      metadata: input.metadata || {},
    });
  } catch {
    // Table may not exist yet
  }
}

/** Get the current user's social feed (activities from followed users + own) */
export async function getFeed(
  cursor?: string,
  limit = 20
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], nextCursor: null };

  // Get list of users the current user follows (capped at 500 to avoid unbounded IN)
  const { data: followData } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .limit(500);

  const followingIds = (followData || []).map((f) => f.following_id);
  const feedUserIds = [user.id, ...followingIds];

  // Batch IN clause to avoid PostgREST limits
  let query = supabase
    .from("activity_feed")
    .select("*")
    .in("actor_id", feedUserIds.slice(0, 100))
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: activities } = await query;
  if (!activities || activities.length === 0)
    return { items: [], nextCursor: null };

  const hasMore = activities.length > limit;
  const slice = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore ? slice[slice.length - 1].created_at : null;

  // Enrich with actor profiles (use public_profiles view for cross-user access)
  const actorIds = [...new Set(slice.map((a) => a.actor_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", actorIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  const items: FeedItem[] = slice.map((a) => {
    const actor = profileMap.get(a.actor_id);
    return {
      id: a.id,
      actor_id: a.actor_id,
      actor_name: actor?.display_name || null,
      actor_avatar: actor?.avatar_url || null,
      action_type: a.action_type as ActionType,
      target_type: a.target_type,
      target_id: a.target_id,
      metadata: (a.metadata as Record<string, unknown>) || {},
      created_at: a.created_at,
    };
  });

  return { items, nextCursor };
}

/** Get activities for a specific user's profile page */
export async function getUserActivities(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("activity_feed")
    .select("*")
    .eq("actor_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: activities } = await query;
  if (!activities || activities.length === 0)
    return { items: [], nextCursor: null };

  const hasMore = activities.length > limit;
  const slice = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore ? slice[slice.length - 1].created_at : null;

  // Get actor profile (use public_profiles view for cross-user access)
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .single();

  const items: FeedItem[] = slice.map((a) => ({
    id: a.id,
    actor_id: a.actor_id,
    actor_name: profile?.display_name || null,
    actor_avatar: profile?.avatar_url || null,
    action_type: a.action_type as ActionType,
    target_type: a.target_type,
    target_id: a.target_id,
    metadata: (a.metadata as Record<string, unknown>) || {},
    created_at: a.created_at,
  }));

  return { items, nextCursor };
}
