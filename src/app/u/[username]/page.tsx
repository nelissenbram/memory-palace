import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/social/profile-actions";
import { getUserActivities } from "@/lib/social/feed-actions";
import { getPublishedWings } from "@/lib/social/visit-actions";
import ProfilePageClient from "./ProfilePageClient";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username, "username");
  if (!profile || !profile.is_public) return { title: "Not Found" };

  return {
    title: `${profile.display_name || username} | Memory Palace`,
    description: profile.bio || `Visit ${profile.display_name || username}'s Memory Palace`,
    openGraph: {
      title: `${profile.display_name || username}'s Palace`,
      description: profile.bio || undefined,
      images: [{ url: `/api/og?title=${encodeURIComponent(profile.display_name || username)}&type=profile` }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfile(username, "username");
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
    />
  );
}
