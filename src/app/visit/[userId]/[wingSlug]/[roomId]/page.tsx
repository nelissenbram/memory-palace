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

  // Get the room. Visibility model (consistent with getPublishedRooms): if the
  // wing is published, ALL of its rooms are public by design, so there is no
  // per-room published_at gate here — the wing gate above is the sole check.
  const { data: room } = await admin
    .from("rooms")
    .select("id, name, icon, cover_hue, wing_id, user_id")
    .eq("id", roomId)
    .eq("wing_id", wing.id)
    .single();
  if (!room) notFound();

  const [profile, memories, comments, reactions, ownerProfileRow] = await Promise.all([
    getProfile(userId),
    getPublishedMemories(roomId),
    getComments("room", roomId),
    getReactions("room", roomId),
    admin.from("profiles").select("local_settings").eq("id", userId).single(),
  ]);

  // Resolve the room's display name + icon. rooms.name in the DB stores the
  // LOCAL room id (e.g. "ro1"/"ne2"), not a human name — mirror getPublishedRooms:
  // load owner custom rooms from profiles.local_settings.mp_custom_rooms, fall back
  // to WING_ROOMS defaults, and map by id so the header reads e.g. "Me, Over Time".
  const { WING_ROOMS } = await import("@/lib/constants/wings");
  let ownerCustomRooms: Record<string, { id: string; name: string; icon: string }[]> = {};
  try {
    const ls = ownerProfileRow.data?.local_settings as Record<string, unknown> | null;
    if (ls) {
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        try { ownerCustomRooms = JSON.parse(rawRooms); } catch { /* ignore */ }
      } else if (rawRooms && typeof rawRooms === "object") {
        ownerCustomRooms = rawRooms as typeof ownerCustomRooms;
      }
    }
  } catch { /* ignore */ }
  const effectiveRooms = ownerCustomRooms[wing.slug] || WING_ROOMS[wing.slug] || [];
  const roomNameMap = new Map<string, { name: string; icon: string }>();
  for (const er of effectiveRooms) {
    roomNameMap.set(er.id, { name: er.name, icon: er.icon });
  }
  const resolvedRoom = roomNameMap.get(room.name);

  const {
    data: { user: currentUser },
  } = await userClient.auth.getUser();
  // Await so the visit is reliably recorded before the response is sent
  // (recordVisit already dedups and self-suppresses its own errors).
  await recordVisit({ ownerId: userId, wingId: wing.id, roomId }).catch(() => {});

  return (
    <RoomVisitClient
      userId={userId}
      room={{
        id: room.id,
        name: resolvedRoom?.name || room.name,
        icon: resolvedRoom?.icon || room.icon,
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
