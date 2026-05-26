import { notFound } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getPublishedMemories, recordVisit } from "@/lib/social/visit-actions";
import { getProfile } from "@/lib/social/profile-actions";
import { getComments, getReactions } from "@/lib/social/comment-actions";
import RoomVisitClient from "./RoomVisitClient";

interface Props {
  params: Promise<{ userId: string; wingSlug: string; roomId: string }>;
}

export default async function RoomVisitPage({ params }: Props) {
  const { userId, wingSlug, roomId } = await params;
  const admin = createAdminClient();
  const userClient = await createClient();

  // Verify wing is published
  const { data: wing } = await admin
    .from("wings")
    .select("id, slug, custom_name")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .not("published_at", "is", null)
    .single();
  if (!wing) notFound();

  // Get the room
  const { data: room } = await admin
    .from("rooms")
    .select("id, name, icon, cover_hue, wing_id, user_id")
    .eq("id", roomId)
    .eq("wing_id", wing.id)
    .single();
  if (!room) notFound();

  const [profile, memories, comments, reactions] = await Promise.all([
    getProfile(userId),
    getPublishedMemories(roomId),
    getComments("room", roomId),
    getReactions("room", roomId),
  ]);

  const {
    data: { user: currentUser },
  } = await userClient.auth.getUser();
  recordVisit({ ownerId: userId, wingId: wing.id, roomId }).catch(() => {});

  return (
    <RoomVisitClient
      room={{
        id: room.id,
        name: room.name,
        icon: room.icon,
        coverHue: room.cover_hue,
      }}
      wing={{
        id: wing.id,
        slug: wing.slug,
        name: wing.custom_name || wing.slug,
      }}
      owner={
        profile
          ? {
              id: profile.id,
              name: profile.display_name,
              username: profile.username,
            }
          : null
      }
      memories={memories}
      initialComments={comments}
      initialReactions={reactions}
      currentUserId={currentUser?.id}
    />
  );
}
