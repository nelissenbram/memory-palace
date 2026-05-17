"use server";

import { createClient } from "@/lib/supabase/server";

export interface DirectoryPalace {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  published_wing_count: number;
  total_visit_count: number;
  category: string | null;
  featured_at: string | null;
}

/** Get featured palaces (admin-curated) */
export async function getFeatured(
  limit = 12
): Promise<DirectoryPalace[]> {
  const supabase = await createClient();

  const { data: featured } = await supabase
    .from("featured_palaces")
    .select("user_id, category, featured_at")
    .order("featured_at", { ascending: false })
    .limit(limit);

  if (!featured || featured.length === 0) return [];

  return enrichPalaces(supabase, featured);
}

/** Get trending palaces (most visited in last 7 days) */
export async function getTrending(
  limit = 12
): Promise<DirectoryPalace[]> {
  const supabase = await createClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get top visited owners in last 7 days (limit query to avoid loading all visits)
  const { data: visits } = await supabase
    .from("palace_visits")
    .select("owner_id")
    .gte("visited_at", weekAgo.toISOString())
    .limit(2000);

  if (!visits || visits.length === 0) return [];

  // Count visits per owner
  const countMap = new Map<string, number>();
  for (const v of visits) {
    countMap.set(v.owner_id, (countMap.get(v.owner_id) || 0) + 1);
  }

  // Sort by visit count, take top N
  const sorted = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const userIds = sorted.map(([id]) => id);

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .in("id", userIds)
    .eq("is_public", true);

  if (!profiles) return [];

  return profiles.map((p) => ({
    user_id: p.id,
    display_name: p.display_name,
    username: p.username,
    avatar_url: p.avatar_url,
    bio: p.bio,
    published_wing_count: 0,
    total_visit_count: countMap.get(p.id) || 0,
    category: null,
    featured_at: null,
  }));
}

/** Search public palaces by name or username */
export async function searchPalaces(
  query: string,
  limit = 20
): Promise<DirectoryPalace[]> {
  const supabase = await createClient();
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  // Escape special LIKE characters to prevent filter injection
  const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // Search profiles by display_name or username (case-insensitive LIKE)
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .eq("is_public", true)
    .or(`display_name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
    .limit(limit);

  if (!profiles || profiles.length === 0) return [];

  return profiles.map((p) => ({
    user_id: p.id,
    display_name: p.display_name,
    username: p.username,
    avatar_url: p.avatar_url,
    bio: p.bio,
    published_wing_count: 0,
    total_visit_count: 0,
    category: null,
    featured_at: null,
  }));
}

/** Get newly published palaces */
export async function getNewPalaces(
  limit = 12
): Promise<DirectoryPalace[]> {
  const supabase = await createClient();

  // Find users who recently published a wing
  const { data: wings } = await supabase
    .from("wings")
    .select("user_id, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);

  if (!wings || wings.length === 0) return [];

  // Deduplicate by user
  const seen = new Set<string>();
  const uniqueUserIds: string[] = [];
  for (const w of wings) {
    if (!seen.has(w.user_id)) {
      seen.add(w.user_id);
      uniqueUserIds.push(w.user_id);
      if (uniqueUserIds.length >= limit) break;
    }
  }

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .in("id", uniqueUserIds)
    .eq("is_public", true);

  if (!profiles) return [];

  return profiles.map((p) => ({
    user_id: p.id,
    display_name: p.display_name,
    username: p.username,
    avatar_url: p.avatar_url,
    bio: p.bio,
    published_wing_count: 0,
    total_visit_count: 0,
    category: null,
    featured_at: null,
  }));
}

// Helper to enrich featured entries with profile data
async function enrichPalaces(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: { user_id: string; category?: string | null; featured_at?: string | null }[]
): Promise<DirectoryPalace[]> {
  const userIds = entries.map((e) => e.user_id);

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .in("id", userIds);

  if (!profiles) return [];

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return entries
    .map((e) => {
      const p = profileMap.get(e.user_id);
      if (!p) return null;
      return {
        user_id: p.id,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        bio: p.bio,
        published_wing_count: 0,
        total_visit_count: 0,
        category: e.category || null,
        featured_at: e.featured_at || null,
      };
    })
    .filter(Boolean) as DirectoryPalace[];
}
