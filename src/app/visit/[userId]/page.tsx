import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getPublishedWings, getPublishedRooms, recordVisit } from "@/lib/social/visit-actions";
import { getProfileCached } from "@/lib/social/profile-cache";
import { getComments, getReactions } from "@/lib/social/comment-actions";
import { getBlockedUserIds } from "@/lib/social/safety-actions";
import { WINGS } from "@/lib/constants/wings";
import PalaceOverviewClient from "./PalaceOverviewClient";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getProfileCached(userId, "id");
  if (!profile || !profile.is_public) return { title: "Not Found" };

  const name = profile.display_name || profile.username || "A Memory Keeper";
  const description = profile.bio || `Walk through ${name}'s Memory Palace — rooms of photos, voices and stories in a 3D palace.`;
  return {
    title: `${name}'s Memory Palace`,
    description,
    alternates: {
      canonical: profile.username
        ? `https://thememorypalace.ai/u/${encodeURIComponent(profile.username)}`
        : `https://thememorypalace.ai/visit/${userId}`,
    },
    openGraph: {
      title: `${name}'s Memory Palace`,
      description,
      url: `https://thememorypalace.ai/visit/${userId}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(name)}&type=palace&subtitle=${encodeURIComponent((profile.bio || "").slice(0, 120))}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PalaceOverviewPage({ params }: Props) {
  const { userId } = await params;

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const [profile, wings] = await Promise.all([
    getProfileCached(userId, "id"),
    getPublishedWings(userId),
  ]);

  // Respect privacy: a non-public profile is not visitable by URL (mirror /u/[username]).
  if (!profile || !profile.is_public) notFound();
  // Respect blocks: a blocked relationship hides the palace entirely.
  if (currentUser) {
    const blocked = await getBlockedUserIds(supabase, currentUser.id);
    if (blocked.has(userId)) notFound();
  }

  if (!wings || wings.length === 0) notFound();

  // Fetch rooms for each wing + palace-level guestbook comments in parallel
  const [wingsWithRooms, comments, reactions] = await Promise.all([
    Promise.all(
      wings.map(async (w) => ({
        ...w,
        rooms: await getPublishedRooms(w.id),
      }))
    ),
    getComments("palace", userId),
    getReactions("palace", userId),
  ]);

  // Record visit (fire & forget)
  recordVisit({ ownerId: userId }).catch(() => {});

  return (
    <PalaceOverviewClient
      owner={
        profile
          ? {
              id: profile.id,
              name: profile.display_name,
              username: profile.username,
              avatarUrl: profile.avatar_url,
              bio: profile.bio,
            }
          : null
      }
      wings={wingsWithRooms.map((w) => ({
        id: w.id,
        slug: w.slug,
        name: w.custom_name || WINGS.find(dw => dw.id === w.slug)?.name || w.slug,
        accentColor: w.accent_color,
        description: w.publish_description,
        roomCount: w.rooms.length,
        visitCount: w.visit_count,
        rooms: w.rooms.map((r) => ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          coverHue: r.cover_hue,
          memoryCount: r.memory_count,
        })),
      }))}
      initialComments={comments}
      initialReactions={reactions}
      currentUserId={currentUser?.id}
      isAuthenticated={!!currentUser}
      isFollowing={profile?.is_following ?? false}
    />
  );
}
