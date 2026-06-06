import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getPublishedWings, getPublishedRooms, recordVisit } from "@/lib/social/visit-actions";
import { getProfile } from "@/lib/social/profile-actions";
import { getComments, getReactions } from "@/lib/social/comment-actions";
import PalaceOverviewClient from "./PalaceOverviewClient";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PalaceOverviewPage({ params }: Props) {
  const { userId } = await params;

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const [profile, wings] = await Promise.all([
    getProfile(userId),
    getPublishedWings(userId),
  ]);

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
        name: w.custom_name || w.slug,
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
    />
  );
}
