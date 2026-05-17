import { Metadata } from "next";
import ExplorePageClient from "./ExplorePageClient";
import {
  getFeatured,
  getTrending,
  getNewPalaces,
} from "@/lib/social/directory-actions";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Explore Palaces | Memory Palace",
  description: "Discover and explore published Memory Palaces from creators around the world.",
  openGraph: {
    images: [{ url: "/api/og?title=Explore%20Palaces&type=palace" }],
  },
};

export default async function ExplorePage() {
  const [featured, trending, newest] = await Promise.all([
    getFeatured(8),
    getTrending(8),
    getNewPalaces(8),
  ]);

  return (
    <ExplorePageClient
      featured={featured}
      trending={trending}
      newest={newest}
    />
  );
}
