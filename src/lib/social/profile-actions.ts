"use server";

import { createClient } from "@/lib/supabase/server";

export interface SocialProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_own: boolean;
}

/** Get a user's social profile by user ID or username */
export async function getProfile(
  identifier: string,
  by: "id" | "username" = "id"
): Promise<SocialProfile | null> {
  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  // Use public_profiles view for cross-user lookups (profiles RLS restricts to own row)
  const isOwnLookup = me && by === "id" && identifier === me.id;
  const table = isOwnLookup ? "profiles" : "public_profiles";

  const { data: profile } = await supabase
    .from(table)
    .select("id, username, display_name, bio, avatar_url, is_public, created_at")
    .eq(by === "id" ? "id" : "username", identifier)
    .single();

  if (!profile) return null;

  // For non-own lookups, respect is_public
  const isOwn = me?.id === profile.id;
  if (!isOwn && !profile.is_public) {
    // Return limited info for private profiles
    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      bio: null,
      avatar_url: profile.avatar_url,
      is_public: false,
      created_at: profile.created_at,
      follower_count: 0,
      following_count: 0,
      is_following: false,
      is_own: false,
    };
  }

  // Counts + follow check in parallel
  const [followerRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ]);

  let isFollowing = false;
  if (me && !isOwn) {
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", me.id)
      .eq("following_id", profile.id);
    isFollowing = (count || 0) > 0;
  }

  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    is_public: profile.is_public,
    created_at: profile.created_at,
    follower_count: followerRes.count || 0,
    following_count: followingRes.count || 0,
    is_following: isFollowing,
    is_own: isOwn,
  };
}

/** Update the current user's social profile */
export async function updateProfile(input: {
  username?: string;
  is_public?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Validate username format
  if (input.username !== undefined) {
    const clean = input.username.toLowerCase().trim();
    if (clean.length < 3 || clean.length > 30) {
      return { ok: false, error: "Username must be 3-30 characters" };
    }
    if (!/^[a-z0-9_-]+$/.test(clean)) {
      return { ok: false, error: "Username can only contain letters, numbers, hyphens, and underscores" };
    }
    input.username = clean;
  }

  const update: Record<string, unknown> = {};
  if (input.username !== undefined) update.username = input.username;
  if (input.is_public !== undefined) update.is_public = input.is_public;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Username already taken" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Toggle follow/unfollow a user */
export async function toggleFollow(
  targetUserId: string
): Promise<{ following: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === targetUserId) return { following: false };

  // Check existing
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return { following: false };
  }

  await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: targetUserId,
  });

  // Record activity
  try {
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "followed",
      targetType: "user",
      targetId: targetUserId,
      targetUserId,
    });
  } catch {
    // Feed may not exist yet
  }

  // Notify the followed user
  try {
    const { createNotification } = await import("@/lib/auth/notification-actions");
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const myName = myProfile?.display_name || "Someone";
    await createNotification({
      userId: targetUserId,
      type: "new_follower",
      message: `${myName} started following you`,
      fromUserId: user.id,
      fromUserName: myName,
    });
  } catch {
    // Notifications may not be available
  }

  return { following: true };
}

/** Get a user's followers (paginated) */
export async function getFollowers(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{ users: SocialProfile[]; nextCursor: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: follows } = await query;
  if (!follows || follows.length === 0)
    return { users: [], nextCursor: null };

  const hasMore = follows.length > limit;
  const slice = hasMore ? follows.slice(0, limit) : follows;
  const nextCursor = hasMore ? slice[slice.length - 1].created_at : null;

  // Batch profile lookup (avoids N+1)
  const userIds = slice.map((f) => f.follower_id);
  const { data: profileRows } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, avatar_url, is_public, created_at")
    .in("id", userIds);

  const profileMap = new Map((profileRows || []).map((p) => [p.id, p]));

  const users: SocialProfile[] = userIds
    .map((uid) => {
      const p = profileMap.get(uid);
      if (!p) return null;
      return {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        bio: null,
        avatar_url: p.avatar_url,
        is_public: p.is_public,
        created_at: p.created_at,
        follower_count: 0,
        following_count: 0,
        is_following: false,
        is_own: false,
      };
    })
    .filter(Boolean) as SocialProfile[];

  return { users, nextCursor };
}

/** Get users that a user is following (paginated) */
export async function getFollowing(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{ users: SocialProfile[]; nextCursor: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: follows } = await query;
  if (!follows || follows.length === 0)
    return { users: [], nextCursor: null };

  const hasMore = follows.length > limit;
  const slice = hasMore ? follows.slice(0, limit) : follows;
  const nextCursor = hasMore ? slice[slice.length - 1].created_at : null;

  // Batch profile lookup (avoids N+1)
  const userIds = slice.map((f) => f.following_id);
  const { data: profileRows } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, avatar_url, is_public, created_at")
    .in("id", userIds);

  const profileMap = new Map((profileRows || []).map((p) => [p.id, p]));

  const users: SocialProfile[] = userIds
    .map((uid) => {
      const p = profileMap.get(uid);
      if (!p) return null;
      return {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        bio: null,
        avatar_url: p.avatar_url,
        is_public: p.is_public,
        created_at: p.created_at,
        follower_count: 0,
        following_count: 0,
        is_following: false,
        is_own: false,
      };
    })
    .filter(Boolean) as SocialProfile[];

  return { users, nextCursor };
}
