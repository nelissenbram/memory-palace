import { Metadata } from "next";
import ExplorePageClient from "./ExplorePageClient";
import {
  getFeatured,
  getTrending,
  getNewPalaces,
  getFollowingPalaces,
} from "@/lib/social/directory-actions";
import { createClient } from "@/lib/supabase/server";

// No ISR cache — always fetch fresh data so newly published palaces appear immediately
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

  const [featured, trending, newest, followingPalaces] = await Promise.all([
    getFeatured(12),
    getTrending(12),
    getNewPalaces(12),
    user ? getFollowingPalaces(12) : Promise.resolve([]),
  ]);

  return (
    <ExplorePageClient
      featured={featured}
      trending={trending}
      newest={newest}
      following={followingPalaces}
      isAuthenticated={!!user}
    />
  );
}
