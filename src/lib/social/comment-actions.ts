"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/auth/plan-limits";

export interface Comment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  body: string;
  parent_id: string | null;
  created_at: string;
  replies: Comment[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean;
}

/** Get the palace-themed reaction set */
export async function getReactionEmojis() {
  return [
    { emoji: "candle", label: "Candle" },
    { emoji: "key", label: "Key" },
    { emoji: "scroll", label: "Scroll" },
    { emoji: "heart", label: "Heart" },
    { emoji: "star", label: "Star" },
    { emoji: "amphora", label: "Amphora" },
  ] as const;
}

/** Add a comment to a target (room, wing, memory, etc.) */
export async function addComment(input: {
  targetType: string;
  targetId: string;
  body: string;
  parentId?: string;
}): Promise<{ ok: boolean; comment?: Comment; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Subscription gate: free users cannot comment
  const sub = await getUserPlan(user.id);
  if (sub.plan === "free") {
    return { ok: false, error: "Upgrade to comment" };
  }

  const body = input.body.trim().slice(0, 2000);
  if (!body) return { ok: false, error: "Comment cannot be empty" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      target_type: input.targetType,
      target_id: input.targetId,
      body,
      parent_id: input.parentId || null,
    })
    .select("id, user_id, body, parent_id, created_at")
    .single();

  if (error) return { ok: false, error: error.message };

  // Get user profile for display
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Record activity
  try {
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "commented",
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: { bodyPreview: body.slice(0, 100) },
    });
  } catch {
    // Feed may not exist yet
  }

  return {
    ok: true,
    comment: {
      id: data.id,
      user_id: data.user_id,
      user_name: profile?.display_name || null,
      user_avatar: profile?.avatar_url || null,
      body: data.body,
      parent_id: data.parent_id,
      created_at: data.created_at,
      replies: [],
    },
  };
}

/** Delete own comment */
export async function deleteComment(
  commentId: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  return { ok: true };
}

/** Get threaded comments for a target */
export async function getComments(
  targetType: string,
  targetId: string
): Promise<Comment[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("comments")
    .select("id, user_id, body, parent_id, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  if (!rows || rows.length === 0) return [];

  // Enrich with profiles (use public_profiles view for cross-user access)
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  // Build tree
  const commentMap = new Map<string, Comment>();
  const topLevel: Comment[] = [];

  for (const row of rows) {
    const profile = profileMap.get(row.user_id);
    const comment: Comment = {
      id: row.id,
      user_id: row.user_id,
      user_name: profile?.display_name || null,
      user_avatar: profile?.avatar_url || null,
      body: row.body,
      parent_id: row.parent_id,
      created_at: row.created_at,
      replies: [],
    };
    commentMap.set(row.id, comment);

    if (!row.parent_id) {
      topLevel.push(comment);
    }
  }

  // Attach replies to parents
  for (const row of rows) {
    if (row.parent_id) {
      const parent = commentMap.get(row.parent_id);
      const child = commentMap.get(row.id);
      if (parent && child) {
        parent.replies.push(child);
      }
    }
  }

  return topLevel;
}

const VALID_REACTION_EMOJIS = ["candle", "key", "scroll", "heart", "star", "amphora"];

/** Toggle a reaction on a target */
export async function toggleReaction(input: {
  targetType: string;
  targetId: string;
  emoji: string;
}): Promise<{ reacted: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { reacted: false };

  // Validate emoji against allowlist
  if (!VALID_REACTION_EMOJIS.includes(input.emoji)) {
    return { reacted: false };
  }

  // Check existing
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .eq("emoji", input.emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return { reacted: false };
  }

  await supabase.from("reactions").insert({
    user_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    emoji: input.emoji,
  });

  // Record activity
  try {
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "reacted",
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: { emoji: input.emoji },
    });
  } catch {
    // Feed may not exist yet
  }

  return { reacted: true };
}

/** Get reaction summaries for a target */
export async function getReactions(
  targetType: string,
  targetId: string
): Promise<ReactionSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("reactions")
    .select("emoji, user_id")
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (!rows || rows.length === 0) return [];

  // Group by emoji
  const groups = new Map<string, { count: number; reacted: boolean }>();
  for (const row of rows) {
    const group = groups.get(row.emoji) || { count: 0, reacted: false };
    group.count++;
    if (user && row.user_id === user.id) group.reacted = true;
    groups.set(row.emoji, group);
  }

  return Array.from(groups.entries()).map(([emoji, g]) => ({
    emoji,
    count: g.count,
    reacted: g.reacted,
  }));
}
