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

  try {
    const [
      captures,
      audioCaptures,
      activeRoom,
      profile,
      following,
      followers,
      comments,
      visits,
    ] = await Promise.all([
      supabase.from("kep_captures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("kep_captures").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("media_type", "audio"),
      supabase.from("keps").select("active_room_id").eq("user_id", user.id).not("active_room_id", "is", null).limit(1),
      supabase.from("profiles").select("is_public").eq("id", user.id).single(),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("palace_visits").select("owner_id", { count: "exact", head: true }).eq("visitor_id", user.id),
    ]);

    return {
      kepCaptureCount: captures.count ?? 0,
      kepAudioCaptures: audioCaptures.count ?? 0,
      kepHasSetRoom: (activeRoom.data?.length ?? 0) > 0,
      hasPublishedPalace: profile.data?.is_public ?? false,
      followingCount: following.count ?? 0,
      followerCount: followers.count ?? 0,
      commentsLeft: comments.count ?? 0,
      palacesVisited: visits.count ?? 0,
    };
  } catch {
    return EMPTY;
  }
}
