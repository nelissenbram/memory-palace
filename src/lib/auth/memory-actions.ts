"use server";

import { createClient } from "@/lib/supabase/server";
import { r2Remove, isR2Configured } from "@/lib/storage/r2";
import { serverError } from "@/lib/i18n/server-errors";

// Ensure a room exists in the DB, creating it if needed.
// Maps local room IDs (like "ro1") to Supabase UUIDs.
async function ensureRoom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  localRoomId: string,
  wingSlug: string
) {
  // Check if room already exists by looking up via name = localRoomId
  const { data: existing } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", userId)
    .eq("name", localRoomId)
    .single();

  if (existing) return existing.id;

  // Find the user's wing
  const { data: wing } = await supabase
    .from("wings")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .single();

  if (!wing) return null;

  // Create the room
  const { data: room } = await supabase
    .from("rooms")
    .insert({ wing_id: wing.id, user_id: userId, name: localRoomId })
    .select("id")
    .single();

  return room?.id || null;
}

// Map wing slug from local room ID prefix
function wingSlugFromRoomId(localRoomId: string): string {
  const prefix = localRoomId.slice(0, 2);
  const map: Record<string, string> = {
    ro: "roots",
    ne: "nest",
    cf: "craft",
    tv: "travel",
    pa: "passions",
    at: "attic",
  };
  return map[prefix] || "roots";
}

export async function createMemory(data: {
  roomId: string;
  title: string;
  description?: string;
  type: string;
  hue: number;
  saturation: number;
  lightness: number;
  fileUrl?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  storageBackend?: string | null;
  thumbnailUrl?: string | null;
  locationName?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const t = await serverError();
  // Resolve local room ID to a DB UUID
  const wingSlug = wingSlugFromRoomId(data.roomId);
  const dbRoomId = await ensureRoom(supabase, user.id, data.roomId, wingSlug);
  if (!dbRoomId) return { error: t("couldNotResolveRoom") };

  const { data: memory, error } = await supabase
    .from("memories")
    .insert({
      room_id: dbRoomId,
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      type: data.type,
      hue: data.hue,
      saturation: data.saturation,
      lightness: data.lightness,
      file_url: data.fileUrl || null,
      file_path: data.filePath || null,
      file_size: data.fileSize || 0,
      storage_backend: data.storageBackend || "supabase",
      ...(data.thumbnailUrl ? { thumbnail_url: data.thumbnailUrl } : {}),
      ...(data.locationName ? { location_name: data.locationName } : {}),
      ...(data.lat != null ? { lat: data.lat } : {}),
      ...(data.lng != null ? { lng: data.lng } : {}),
    })
    .select()
    .single();

  if (error) {
    // Cleanup orphaned storage file on DB insert failure
    if (data.filePath) {
      try {
        if (data.storageBackend === "r2" && isR2Configured()) {
          await r2Remove("memories", [data.filePath]);
        } else {
          await supabase.storage.from("memories").remove([data.filePath]);
        }
      } catch { /* best-effort cleanup */ }
    }
    return { error: error.message };
  }

  // ── Notify room owner if this is a shared room contribution ──
  try {
    const { data: shareRecord } = await supabase
      .from("room_shares")
      .select("owner_id")
      .eq("room_id", dbRoomId)
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .limit(1)
      .single();

    if (shareRecord && shareRecord.owner_id !== user.id) {
      // Dynamically import to avoid circular deps
      const { createContributionNotification } = await import(
        "@/lib/auth/notification-actions"
      );
      await createContributionNotification({
        roomDbId: dbRoomId,
        contributorId: user.id,
        memoryTitle: data.title,
      });
    }
  } catch {
    // Non-critical — don't block memory creation if notification fails
  }

  // ── Milestone + first-in-room activity notifications (for the creator) ──
  try {
    const { checkAndNotifyMilestone, notifyFirstInRoom } = await import(
      "@/lib/auth/notification-actions"
    );
    // Fetch total count, room count, and room name in parallel (independent queries)
    const [totalCountResult, roomCountResult, roomRowResult] = await Promise.all([
      supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("memories")
        .select("id", { count: "exact", head: false })
        .eq("room_id", dbRoomId)
        .limit(2),
      supabase
        .from("rooms")
        .select("name")
        .eq("id", dbRoomId)
        .single(),
    ]);
    const totalCount = totalCountResult.count;
    if (typeof totalCount === "number") {
      await checkAndNotifyMilestone({ userId: user.id, totalMemories: totalCount });
    }
    // First memory in this room (by this user) — count === 1 means this one is first
    const roomCount = roomCountResult.count;
    if (roomCount === 1 && roomRowResult.data?.name) {
      await notifyFirstInRoom({ userId: user.id, roomId: dbRoomId, roomName: roomRowResult.data.name });
    }
  } catch {
    // Non-critical
  }

  return { memory };
}

export async function updateMemoryAction(
  memoryId: string,
  updates: { title?: string; description?: string; type?: string; file_url?: string; file_path?: string; storage_backend?: string; thumbnail_url?: string; location_name?: string; lat?: number; lng?: number; displayed?: boolean | null; display_unit?: string | null }
) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Strip undefined values to avoid nullifying existing columns
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  const { data: memory, error } = await supabase
    .from("memories")
    .update(cleanUpdates)
    .eq("id", memoryId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { memory };
}

export async function deleteMemoryAction(memoryId: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Get memory to find file_path and storage_backend for cleanup
  const { data: memory } = await supabase
    .from("memories")
    .select("file_path, storage_backend")
    .eq("id", memoryId)
    .eq("user_id", user.id)
    .single();

  // Delete from the correct storage backend
  if (memory?.file_path) {
    if (memory.storage_backend === "r2" && isR2Configured()) {
      try { await r2Remove("memories", [memory.file_path]); } catch { /* best-effort */ }
    } else {
      await supabase.storage.from("memories").remove([memory.file_path]);
    }
  }

  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function moveMemoryAction(memoryId: string, toLocalRoomId: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const tMove = await serverError();
  const wingSlug = wingSlugFromRoomId(toLocalRoomId);
  const dbRoomId = await ensureRoom(supabase, user.id, toLocalRoomId, wingSlug);
  if (!dbRoomId) return { error: tMove("couldNotResolveTargetRoom") };

  const { error } = await supabase
    .from("memories")
    .update({ room_id: dbRoomId })
    .eq("id", memoryId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function fetchMemories(localRoomId: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { memories: [] };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { memories: [] };

  // Find the room by local ID
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", localRoomId)
    .single();

  if (!room) return { memories: [] };

  const { data: memories, error } = await supabase
    .from("memories")
    .select("*")
    .eq("room_id", room.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { memories: [], error: error.message };
  return { memories: memories || [] };
}

/** Fetch ALL memories for the current user, grouped by local room ID */
export async function fetchAllMemories() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { roomMemories: {} as Record<string, any[]> };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { roomMemories: {} as Record<string, any[]> };

  // Fetch all rooms for this user
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("user_id", user.id);
  if (!rooms || rooms.length === 0) return { roomMemories: {} as Record<string, any[]> };

  // Fetch all memories for all rooms in one query
  const roomIds = rooms.map((r: any) => r.id);
  const { data: memories, error } = await supabase
    .from("memories")
    .select("*")
    .in("room_id", roomIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { roomMemories: {} as Record<string, any[]>, error: error.message };

  // Build room UUID → local name map
  const roomIdToName: Record<string, string> = {};
  for (const r of rooms) roomIdToName[r.id] = r.name;

  // Group memories by local room name
  const roomMemories: Record<string, any[]> = {};
  for (const m of (memories || [])) {
    const localName = roomIdToName[m.room_id];
    if (!localName) continue;
    if (!roomMemories[localName]) roomMemories[localName] = [];
    roomMemories[localName].push(m);
  }
  return { roomMemories };
}
