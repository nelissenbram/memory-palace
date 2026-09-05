"use server";

import { createClient } from "@/lib/supabase/server";

export interface KepSocialStats {
  kepCaptureCount: number;
  kepAudioCaptures: number;
  kepHasSetRoom: boolean;
  hasPublishedPalace: boolean;
  followingCount: number;
  followerCount: number;
  commentsLeft: number;
  palacesVisited: number;
}

const EMPTY: KepSocialStats = {
  kepCaptureCount: 0, kepAudioCaptures: 0, kepHasSetRoom: false,
  hasPublishedPalace: false, followingCount: 0, followerCount: 0, commentsLeft: 0, palacesVisited: 0,
};

export async function getKepSocialStats(): Promise<KepSocialStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  // Use allSettled so one bad query cannot reject the whole batch and zero every
  // unrelated stat. Each field falls back to its EMPTY default independently.
  const [
    captures,
    audioCaptures,
    activeRoom,
    profile,
    following,
    followers,
    comments,
    visits,
  ] = await Promise.allSettled([
    supabase.from("kep_captures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("kep_captures").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("media_type", "audio"),
    supabase.from("keps").select("active_room_id").eq("user_id", user.id).not("active_room_id", "is", null).limit(1),
    supabase.from("profiles").select("is_public").eq("id", user.id).single(),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("palace_visits").select("owner_id", { count: "exact", head: true }).eq("visitor_id", user.id),
  ]);

  const countOf = (r: PromiseSettledResult<unknown>): number =>
    r.status === "fulfilled"
      ? ((r.value as { count?: number | null } | null)?.count ?? 0)
      : 0;

  const activeRoomRows =
    activeRoom.status === "fulfilled"
      ? ((activeRoom.value.data as unknown[] | null)?.length ?? 0)
      : 0;
  const isPublic =
    profile.status === "fulfilled"
      ? ((profile.value.data as { is_public?: boolean } | null)?.is_public ?? false)
      : false;

  return {
    kepCaptureCount: countOf(captures),
    kepAudioCaptures: countOf(audioCaptures),
    kepHasSetRoom: activeRoomRows > 0,
    hasPublishedPalace: isPublic,
    followingCount: countOf(following),
    followerCount: countOf(followers),
    commentsLeft: countOf(comments),
    palacesVisited: countOf(visits),
  };
}
