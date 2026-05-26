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
  first_wing_slug: string | null;
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
    .in("id", userIds);

  if (!profiles) return [];

  // Get first wing slug for each user
  const { data: userWings } = await supabase
    .from("wings")
    .select("user_id, slug")
    .in("user_id", userIds)
    .not("published_at", "is", null)
    .limit(200);

  const wingSlugMap = new Map<string, string>();
  for (const w of userWings || []) {
    if (!wingSlugMap.has(w.user_id)) wingSlugMap.set(w.user_id, w.slug);
  }

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
    first_wing_slug: wingSlugMap.get(p.id) || null,
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

  // Get first wing slug for each user
  const profileIds = profiles.map((p) => p.id);
  const { data: userWings } = await supabase
    .from("wings")
    .select("user_id, slug")
    .in("user_id", profileIds)
    .not("published_at", "is", null)
    .limit(200);

  const wingSlugMap = new Map<string, string>();
  for (const w of userWings || []) {
    if (!wingSlugMap.has(w.user_id)) wingSlugMap.set(w.user_id, w.slug);
  }

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
    first_wing_slug: wingSlugMap.get(p.id) || null,
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
    .select("user_id, published_at, slug")
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

  // Users with published wings should appear — don't filter by is_public
  // since ensureProfilePublic may not have run yet
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .in("id", uniqueUserIds);

  if (!profiles) return [];

  // Count published wings per user, track first wing slug
  const wingCountMap = new Map<string, number>();
  const firstWingSlug = new Map<string, string>();
  for (const w of wings) {
    wingCountMap.set(w.user_id, (wingCountMap.get(w.user_id) || 0) + 1);
    if (!firstWingSlug.has(w.user_id) && w.slug) {
      firstWingSlug.set(w.user_id, w.slug);
    }
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  return uniqueUserIds
    .map((uid) => {
      const p = profileMap.get(uid);
      if (!p) return null;
      return {
        user_id: p.id,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        bio: p.bio,
        published_wing_count: wingCountMap.get(p.id) || 0,
        total_visit_count: 0,
        category: null,
        featured_at: null,
        first_wing_slug: firstWingSlug.get(p.id) || null,
      };
    })
    .filter(Boolean) as DirectoryPalace[];
}

/** Get palaces from users the current user follows */
export async function getFollowingPalaces(
  limit = 12
): Promise<(DirectoryPalace & { latest_published_at: string | null })[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get followed user IDs
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .limit(200);

  if (!follows || follows.length === 0) return [];

  const followedIds = follows.map((f) => f.following_id);

  // Get those who have published wings
  const { data: wings } = await supabase
    .from("wings")
    .select("user_id, published_at, slug")
    .in("user_id", followedIds)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(200);

  if (!wings || wings.length === 0) return [];

  // Deduplicate by user, keep latest published_at and first slug
  const userLatest = new Map<string, string>();
  const userWingCount = new Map<string, number>();
  const userFirstSlug = new Map<string, string>();
  for (const w of wings) {
    if (!userLatest.has(w.user_id)) {
      userLatest.set(w.user_id, w.published_at);
      if (w.slug) userFirstSlug.set(w.user_id, w.slug);
    }
    userWingCount.set(w.user_id, (userWingCount.get(w.user_id) || 0) + 1);
  }

  const userIds = [...userLatest.keys()].slice(0, limit);

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .in("id", userIds);

  if (!profiles) return [];

  return profiles
    .map((p) => ({
      user_id: p.id,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
      bio: p.bio,
      published_wing_count: userWingCount.get(p.id) || 0,
      total_visit_count: 0,
      category: null,
      featured_at: null,
      first_wing_slug: userFirstSlug.get(p.id) || null,
      latest_published_at: userLatest.get(p.id) || null,
    }))
    .sort((a, b) => {
      const da = a.latest_published_at || "";
      const db = b.latest_published_at || "";
      return db.localeCompare(da);
    });
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

  // Get first wing slug for each user
  const { data: userWings } = await supabase
    .from("wings")
    .select("user_id, slug")
    .in("user_id", userIds)
    .not("published_at", "is", null)
    .limit(200);

  const wingSlugMap = new Map<string, string>();
  for (const w of userWings || []) {
    if (!wingSlugMap.has(w.user_id)) wingSlugMap.set(w.user_id, w.slug);
  }

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
        first_wing_slug: wingSlugMap.get(p.id) || null,
      };
    })
    .filter(Boolean) as DirectoryPalace[];
}
