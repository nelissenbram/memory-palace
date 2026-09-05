"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportTargetType =
  | "user"
  | "comment"
  | "wing"
  | "room"
  | "memory"
  | "palace";

/**
 * Return the set of user IDs that are invisible to `userId` because of a block
 * in either direction (users they blocked, and users who blocked them).
 * Used to filter feeds, directory, comments and visits (Apple Guideline 1.2).
 */
export async function getBlockedUserIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  // RLS on blocked_users only exposes rows where auth.uid() = blocker_id, so a
  // user-scoped client silently misses the "users who blocked me" direction and
  // enforcement became one-way. Server-only code: prefer the admin client for
  // this read (never returned to the client raw — only the merged id set), so
  // both directions enforce without a policy that would reveal WHO blocked you.
  let reader: SupabaseClient = supabase;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try { reader = createAdminClient() as unknown as SupabaseClient; } catch { /* fall back to session client */ }
  }
  const { data } = await reader
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const ids = new Set<string>();
  for (const row of data || []) {
    ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
  }
  return ids;
}

/** File a report against objectionable content or an abusive user. */
export async function reportContent(input: {
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string;
  reason: string;
  details?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const reason = (input.reason || "other").slice(0, 100);
  const details = input.details?.trim().slice(0, 2000) || null;

  const { error } = await supabase.from("content_reports").insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    target_user_id: input.targetUserId || null,
    reason,
    details,
  });

  // Duplicate pending report → treat as success (already reported)
  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }

  // Notify moderators (best-effort; never blocks the user)
  try {
    const { notifyModerators } = await import("./moderation-notify");
    await notifyModerators({
      reporterId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      targetUserId: input.targetUserId,
      reason,
      details,
    });
  } catch {
    // moderation notification is optional
  }

  return { ok: true };
}

/** Block a user — their content is filtered out of all shared surfaces. */
export async function blockUser(
  targetUserId: string
): Promise<{ blocked: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { blocked: false, error: "Not authenticated" };
  if (user.id === targetUserId)
    return { blocked: false, error: "You cannot block yourself" };

  const { error } = await supabase.from("blocked_users").insert({
    blocker_id: user.id,
    blocked_id: targetUserId,
  });
  if (error && error.code !== "23505") {
    return { blocked: false, error: error.message };
  }

  // Remove any follow relationship in both directions
  await supabase
    .from("follows")
    .delete()
    .or(
      `and(follower_id.eq.${user.id},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${user.id})`
    );

  revalidatePath("/explore");
  return { blocked: true };
}

/** Unblock a previously blocked user. */
export async function unblockUser(
  targetUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/explore");
  return { ok: true };
}

/** Whether the current user has blocked the given user. */
export async function isUserBlocked(
  targetUserId: string
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase
    .from("blocked_users")
    .select("*", { count: "exact", head: true })
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);
  return (count || 0) > 0;
}

/** List the users the current user has blocked (for a settings screen). */
export async function getBlockedUsers(): Promise<
  { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: blocks } = await supabase
    .from("blocked_users")
    .select("blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });
  if (!blocks || blocks.length === 0) return [];

  const ids = blocks.map((b) => b.blocked_id);
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);

  const map = new Map((profiles || []).map((p) => [p.id, p]));
  return ids
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p!.id,
      username: p!.username,
      display_name: p!.display_name,
      avatar_url: p!.avatar_url,
    }));
}
