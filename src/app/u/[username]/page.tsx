import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileCached } from "@/lib/social/profile-cache";
import { getUserActivities } from "@/lib/social/feed-actions";
import { getPublishedWings } from "@/lib/social/visit-actions";
import { createClient } from "@/lib/supabase/server";
import ProfilePageClient from "./ProfilePageClient";

interface Props {
  params: Promise<{ username: string }>;
}

// UUID pattern to detect user ID vs username
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const by = UUID_RE.test(username) ? "id" : "username";
  const profile = await getProfileCached(username, by);
  if (!profile || !profile.is_public) return { title: "Not Found" };

  const name = profile.display_name || username;
  const description = profile.bio || `Walk through ${name}'s Memory Palace — rooms of photos, voices and stories in a 3D palace.`;
  return {
    title: `${name}'s Memory Palace`,
    description,
    alternates: { canonical: `https://thememorypalace.ai/u/${encodeURIComponent(username)}` },
    openGraph: {
      title: `${name}'s Memory Palace`,
      description,
      url: `https://thememorypalace.ai/u/${encodeURIComponent(username)}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(name)}&type=profile&subtitle=${encodeURIComponent((profile.bio || "").slice(0, 120))}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const by = UUID_RE.test(username) ? "id" : "username";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = await getProfileCached(username, by);
  if (!profile || !profile.is_public) notFound();

  const [{ items: activities, nextCursor }, publishedWings] = await Promise.all([
    getUserActivities(profile.id, undefined, 10),
    getPublishedWings(profile.id),
  ]);

  return (
    <ProfilePageClient
      profile={profile}
      activities={activities}
      activitiesCursor={nextCursor}
      publishedWings={publishedWings}
      isAuthenticated={!!user}
    />
  );
}
