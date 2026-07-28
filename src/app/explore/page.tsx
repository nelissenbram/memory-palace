import { Metadata } from "next";
import ExplorePageClient from "./ExplorePageClient";
import {
  getExploreRails,
  getFollowingPalaces,
} from "@/lib/social/directory-actions";
import type { DirectoryPalace } from "@/lib/social/directory-actions";
import { getBlockedUserIds } from "@/lib/social/safety-actions";
import { createClient } from "@/lib/supabase/server";

// Per-request so the viewer's auth + blocked filtering stay fresh; the shared
// rails themselves are cached 300s inside getExploreRails.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore Palaces | Memory Palace",
  description: "Discover and explore published Memory Palaces from creators around the world.",
  openGraph: {
    images: [{ url: "/api/og?title=Explore%20Palaces&type=palace" }],
  },
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Apple Guideline 1.2: ONE blocked-ids fetch per request, applied to every
  // viewer-facing list. The cached rails are viewer-agnostic — filter them
  // here, never inside the cache.
  const blocked = user
    ? await getBlockedUserIds(supabase, user.id)
    : new Set<string>();

  const [rails, following] = await Promise.all([
    getExploreRails(),
    user ? getFollowingPalaces(12, [...blocked]) : Promise.resolve([]),
  ]);

  const visible = <P extends { user_id: string }>(rows: P[]) =>
    rows.filter((r) => !blocked.has(r.user_id));
  const featured = visible(rails.featured);
  const trending = visible(rails.trending);
  const newest = visible(rails.newest);

  // ONE deduped grid: precedence featured > trending > newest. Default
  // ordering = recency-weighted visits (7-day count) — "Warmly visited".
  const seen = new Set<string>();
  const merged: DirectoryPalace[] = [];
  for (const p of [...featured, ...trending, ...newest]) {
    if (seen.has(p.user_id)) continue;
    seen.add(p.user_id);
    merged.push(p);
  }
  merged.sort(
    (a, b) =>
      b.total_visit_count - a.total_visit_count ||
      (b.featured_at ? 1 : 0) - (a.featured_at ? 1 : 0)
  );

  return (
    <ExplorePageClient
      palaces={merged}
      newestIds={newest.map((p) => p.user_id)}
      following={following}
      isAuthenticated={!!user}
    />
  );
}
