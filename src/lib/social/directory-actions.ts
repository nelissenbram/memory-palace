"use server";

import { unstable_cache } from "next/cache";
import { createClient, createAdminOrAnonClient, hasServiceRoleKey } from "@/lib/supabase/server";

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

export interface FollowingPalace extends DirectoryPalace {
  latest_published_at: string | null;
}

export interface ExploreRails {
  featured: DirectoryPalace[];
  trending: DirectoryPalace[];
  newest: DirectoryPalace[];
}

const TRENDING_DAYS = 7;
const RAIL_LIMIT = 12;

type AdminClient = ReturnType<typeof createAdminOrAnonClient>;

function recentCutoffIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - TRENDING_DAYS);
  return d.toISOString();
}

/**
 * Top visited owners in the last 7 days as an ordered Map (owner_id -> count).
 * Prefers the SQL aggregate RPC (supabase/migrations/20260728_explore_trending_rpc.sql);
 * falls back to a bounded scan + JS count until that migration is applied.
 */
async function fetchTrendingCounts(
  supabase: AdminClient,
  limit: number
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("explore_trending_owners", {
    days_back: TRENDING_DAYS,
    max_rows: limit,
  });
  if (!error && Array.isArray(data)) {
    return new Map(
      (data as { owner_id: string; visit_count: number }[]).map((r) => [
        r.owner_id,
        Number(r.visit_count),
      ])
    );
  }

  // Graceful fallback: RPC not deployed yet on this schema.
  const { data: visits, error: scanError } = await supabase
    .from("palace_visits")
    .select("owner_id")
    .gte("visited_at", recentCutoffIso())
    .limit(2000);
  if (scanError) throw new Error(`Explore trending query failed: ${scanError.message}`);

  const countMap = new Map<string, number>();
  for (const v of visits || []) {
    countMap.set(v.owner_id, (countMap.get(v.owner_id) || 0) + 1);
  }
  return new Map(
    [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  );
}

/** 7-day visit counts for a bounded set of owners (uniform card stats). */
async function fetchVisitCounts(
  supabase: AdminClient,
  userIds: string[]
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("explore_visit_counts", {
    owner_ids: userIds,
    days_back: TRENDING_DAYS,
  });
  if (!error && Array.isArray(data)) {
    return new Map(
      (data as { owner_id: string; visit_count: number }[]).map((r) => [
        r.owner_id,
        Number(r.visit_count),
      ])
    );
  }

  // Graceful fallback: RPC not deployed yet — bounded scan for these ids only.
  const { data: visits, error: scanError } = await supabase
    .from("palace_visits")
    .select("owner_id")
    .in("owner_id", userIds)
    .gte("visited_at", recentCutoffIso())
    .limit(2000);
  if (scanError) throw new Error(`Explore visit counts failed: ${scanError.message}`);

  const countMap = new Map<string, number>();
  for (const v of visits || []) {
    countMap.set(v.owner_id, (countMap.get(v.owner_id) || 0) + 1);
  }
  return countMap;
}

interface RailEntry {
  user_id: string;
  category?: string | null;
  featured_at?: string | null;
  latest_published_at?: string | null;
}

/**
 * Enrich rail entries with profile data + UNIFORM stats (published wing count,
 * 7-day visit count, first wing slug) so cards never lie differently per rail.
 * Drops entries whose profile is missing or opted out of the directory
 * (is_public — the admin client bypasses RLS, so this filter is load-bearing).
 * With `requireWing` (default true), also drops entries without a published
 * wing so no card promises a visit that goes nowhere.
 */
async function enrichPalaces(
  supabase: AdminClient,
  entries: RailEntry[],
  opts: { requireWing?: boolean } = {}
): Promise<FollowingPalace[]> {
  const { requireWing = true } = opts;
  if (entries.length === 0) return [];
  const userIds = [...new Set(entries.map((e) => e.user_id))];

  const { data: profiles, error: profileError } = await supabase
    .from("public_profiles")
    .select("id, display_name, username, avatar_url, bio")
    .eq("is_public", true) // never surface opted-out profiles
    .in("id", userIds);
  if (profileError) throw new Error(`Explore profiles failed: ${profileError.message}`);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const { data: userWings, error: wingsError } = await supabase
    .from("wings")
    .select("user_id, slug")
    .in("user_id", userIds)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(400);
  if (wingsError) throw new Error(`Explore wings failed: ${wingsError.message}`);

  const wingCountMap = new Map<string, number>();
  const firstWingSlug = new Map<string, string>();
  for (const w of userWings || []) {
    wingCountMap.set(w.user_id, (wingCountMap.get(w.user_id) || 0) + 1);
    if (!firstWingSlug.has(w.user_id) && w.slug) firstWingSlug.set(w.user_id, w.slug);
  }

  const visitCounts = await fetchVisitCounts(supabase, userIds);

  return entries
    .map((e) => {
      const p = profileMap.get(e.user_id);
      if (!p) return null;
      const slug = firstWingSlug.get(p.id) || null;
      if (requireWing && !slug) return null;
      return {
        user_id: p.id,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        bio: p.bio,
        published_wing_count: wingCountMap.get(p.id) || 0,
        total_visit_count: visitCounts.get(p.id) || 0,
        category: e.category || null,
        featured_at: e.featured_at || null,
        latest_published_at: e.latest_published_at || null,
      };
    })
    .filter(Boolean) as FollowingPalace[];
}

/**
 * Fetch the three shared rails in one pass: featured (admin-curated),
 * trending (7-day SQL aggregate) and newest publishers. One enrichment pass
 * across the union of user ids keeps stats uniform and queries bounded.
 * No auth/cookies here — this function is wrapped in unstable_cache; blocked-
 * user filtering is applied per-request by the caller (Apple Guideline 1.2).
 */
async function fetchExploreRailsUncached(): Promise<ExploreRails> {
  const supabase = createAdminOrAnonClient();

  const { data: featuredRows, error: featuredError } = await supabase
    .from("featured_palaces")
    .select("user_id, category, featured_at")
    .order("featured_at", { ascending: false })
    .limit(RAIL_LIMIT);
  if (featuredError) throw new Error(`Explore featured failed: ${featuredError.message}`);

  const trendingCounts = await fetchTrendingCounts(supabase, RAIL_LIMIT);

  const { data: recentWings, error: recentError } = await supabase
    .from("wings")
    .select("user_id, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);
  if (recentError) throw new Error(`Explore newest failed: ${recentError.message}`);

  const newestIds: string[] = [];
  const latestPublished = new Map<string, string>();
  for (const w of recentWings || []) {
    if (!latestPublished.has(w.user_id)) {
      latestPublished.set(w.user_id, w.published_at);
      if (newestIds.length < RAIL_LIMIT) newestIds.push(w.user_id);
    }
  }

  // Merge all rail memberships into one entry per user (featured metadata wins).
  const entryMap = new Map<string, RailEntry>();
  const upsert = (id: string, patch: Partial<RailEntry>) => {
    const cur = entryMap.get(id) || { user_id: id };
    entryMap.set(id, { ...cur, ...patch });
  };
  for (const id of newestIds) upsert(id, { latest_published_at: latestPublished.get(id) || null });
  for (const id of trendingCounts.keys()) upsert(id, {});
  for (const f of featuredRows || []) {
    upsert(f.user_id, { category: f.category || null, featured_at: f.featured_at || null });
  }

  const enriched = await enrichPalaces(supabase, [...entryMap.values()]);
  const byId = new Map(enriched.map((p) => [p.user_id, p]));
  const pick = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter(Boolean) as DirectoryPalace[];

  return {
    featured: pick((featuredRows || []).map((f) => f.user_id)),
    trending: pick([...trendingCounts.keys()]),
    newest: pick(newestIds),
  };
}

const getExploreRailsCached = unstable_cache(
  fetchExploreRailsUncached,
  ["explore-rails-v2"],
  { revalidate: 300 }
);

/**
 * Cached (300s) featured/trending/newest rails. The payload is viewer-agnostic:
 * the caller must apply blocked-user filtering per request.
 */
export async function getExploreRails(): Promise<ExploreRails> {
  try {
    return await getExploreRailsCached();
  } catch (e) {
    // Preview deploys have no service-role key: degrade to empty rails
    // (RLS may hide the underlying tables) instead of the error boundary.
    // In Production real errors still surface.
    if (!hasServiceRoleKey()) {
      console.warn("[explore] rails degraded — no service-role key (preview deploy?):", e);
      return { featured: [], trending: [], newest: [] };
    }
    throw e;
  }
}

/** Search public palaces by name or username */
export async function searchPalaces(
  query: string,
  limit = 20
): Promise<DirectoryPalace[]> {
  const supabase = createAdminOrAnonClient();
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  // Sanitize for a PostgREST .or() string built on an RLS-BYPASSING admin
  // client. Two distinct classes of dangerous characters:
  //  1. PostgREST structural metacharacters — comma, period/dot, parentheses,
  //     colon, quotes, backslash — let an attacker smuggle sibling filter
  //     clauses into .or(...) (e.g. `),is_public.is.false` to exfiltrate
  //     opted-out profiles). Since RLS is bypassed this is a data-leak
  //     primitive, so we STRIP them entirely rather than escape.
  //  2. LIKE wildcards (% and _) — escaped so they match literally.
  const sanitized = q.replace(/[,.():"'\\*]/g, "").trim();
  if (sanitized.length < 2) return []; // nothing safely searchable left

  const escaped = sanitized.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // Search profiles by display_name or username (case-insensitive LIKE)
  const { data: profiles, error } = await supabase
    .from("public_profiles")
    .select("id")
    .eq("is_public", true)
    .or(`display_name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
    .limit(limit);
  if (error) throw new Error(`Explore search failed: ${error.message}`);
  if (!profiles || profiles.length === 0) return [];

  // Search keeps profiles without published wings visible (their /u/ page still
  // exists); rails require a wing, so pass requireWing: false here only.
  const enriched = await enrichPalaces(
    supabase,
    profiles.map((p) => ({ user_id: p.id })),
    { requireWing: false }
  );
  return excludeBlocked(enriched);
}

/**
 * Get palaces from users the current user follows. Per-request (never cached).
 * `blockedIds` is the hoisted per-request blocked set from the caller; when
 * omitted (e.g. direct invocation) it falls back to fetching it here.
 */
export async function getFollowingPalaces(
  limit = 12,
  blockedIds?: string[]
): Promise<FollowingPalace[]> {
  try {
    return await getFollowingPalacesInner(limit, blockedIds);
  } catch (e) {
    // Preview deploys (no service key): degrade to empty instead of erroring
    if (!hasServiceRoleKey()) {
      console.warn("[explore] following degraded — no service-role key (preview deploy?):", e);
      return [];
    }
    throw e;
  }
}

async function getFollowingPalacesInner(
  limit: number,
  blockedIds?: string[]
): Promise<FollowingPalace[]> {
  // Need user-scoped client for auth, admin client for cross-user reads
  const userClient = await createClient();
  const supabase = createAdminOrAnonClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return [];

  // Get followed user IDs
  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .limit(200);
  if (followsError) throw new Error(`Explore follows failed: ${followsError.message}`);
  if (!follows || follows.length === 0) return [];

  const followedIds = follows.map((f) => f.following_id);

  // Get those who have published wings
  const { data: wings, error: wingsError } = await supabase
    .from("wings")
    .select("user_id, published_at")
    .in("user_id", followedIds)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(200);
  if (wingsError) throw new Error(`Explore following wings failed: ${wingsError.message}`);
  if (!wings || wings.length === 0) return [];

  // Deduplicate by user, keep latest published_at
  const userLatest = new Map<string, string>();
  for (const w of wings) {
    if (!userLatest.has(w.user_id)) userLatest.set(w.user_id, w.published_at);
  }

  const userIds = [...userLatest.keys()].slice(0, limit);

  const enriched = await enrichPalaces(
    supabase,
    userIds.map((id) => ({
      user_id: id,
      latest_published_at: userLatest.get(id) || null,
    }))
  );
  const sorted = enriched.sort((a, b) => {
    const da = a.latest_published_at || "";
    const db = b.latest_published_at || "";
    return db.localeCompare(da);
  });

  if (blockedIds) {
    const blocked = new Set(blockedIds);
    return sorted.filter((p) => !blocked.has(p.user_id));
  }
  return excludeBlocked(sorted);
}

/**
 * Remove palaces owned by users blocked in either direction with the current
 * viewer (Guideline 1.2). No-op for signed-out visitors. These directory
 * functions use the admin client, so blocking must be applied in code.
 * Page-level callers hoist this to ONE blocked-ids fetch per request
 * (see src/app/explore/page.tsx); this helper remains for client-invoked
 * actions like searchPalaces. Never remove.
 */
async function excludeBlocked<T extends { user_id: string }>(
  rows: T[]
): Promise<T[]> {
  if (!rows || rows.length === 0) return rows;
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return rows;
  const { getBlockedUserIds } = await import("./safety-actions");
  const blocked = await getBlockedUserIds(userClient, user.id);
  if (blocked.size === 0) return rows;
  return rows.filter((r) => !blocked.has(r.user_id));
}
