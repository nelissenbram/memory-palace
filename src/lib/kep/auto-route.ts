/**
 * Auto-route: directly create a memory in a target room (skip job queue).
 * Used when a WhatsApp link has a target_room_id set.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface CaptureData {
  media_url: string | null;
  media_type: string | null;
  media_size: number | null;
  payload_preview: Record<string, unknown> | null;
  source_sender: string | null;
  transcription?: string | null;
}

function mapMediaTypeToMemoryType(mediaType: string | null): string {
  switch (mediaType) {
    case "image": return "photo";
    case "video": return "video";
    case "audio": return "audio";
    case "document": return "document";
    case "text": return "note";
    default: return "note";
  }
}

function buildTitle(capture: CaptureData): string {
  if (capture.payload_preview?.text) return (capture.payload_preview.text as string).slice(0, 100);
  if (capture.transcription) return capture.transcription.slice(0, 100);
  if (capture.payload_preview?.filename) return capture.payload_preview.filename as string;
  const type = capture.media_type || "memory";
  return `${type.charAt(0).toUpperCase() + type.slice(1)} capture`;
}

/**
 * Create a memory directly in the target room and update the capture status.
 * Returns the memory ID.
 */
export async function autoRouteToRoom(
  supabase: SupabaseClient,
  capture: CaptureData,
  captureId: string,
  targetRoomId: string,
  kepId: string,
  userId: string,
): Promise<string | null> {
  // Get room name for notification
  const { data: room } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", targetRoomId)
    .single();

  const roomName = room?.name || "Kep Room";

  // Create memory directly
  const { data: memory, error: memError } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      room_id: targetRoomId,
      title: buildTitle(capture),
      type: mapMediaTypeToMemoryType(capture.media_type),
      file_url: capture.media_url,
      description: capture.transcription || (capture.payload_preview?.text as string) || null,
      source_kep_id: kepId,
      source_type: "whatsapp",
      source_sender: capture.source_sender,
    })
    .select("id")
    .single();

  if (memError) {
    console.error(`[Kep AutoRoute] Failed to create memory: ${memError.message}`);
    return null;
  }

  // Update capture as routed
  await supabase
    .from("kep_captures")
    .update({ status: "routed", memory_id: memory.id })
    .eq("id", captureId);

  // Increment kep counter
  await supabase.rpc("increment_kep_captures", { kep_id: kepId });

  // Create notification (best-effort)
  try {
    const mediaLabel = capture.media_type || "item";
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "kep_capture",
      message: `New ${mediaLabel} captured → "${roomName}"`,
      room_id: targetRoomId,
      room_name: roomName,
      read: false,
    });
  } catch {
    // Notification table may not exist
  }

  // Push notification (best-effort)
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (subs && subs.length > 0 && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const { sendPush } = await import("@/lib/push");
      for (const sub of subs) {
        try {
          await sendPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
            {
              title: "Memory Palace Kep",
              body: `New ${capture.media_type || "item"} captured → "${roomName}"`,
              icon: "/apple-touch-icon.png",
              badge: "/favicon.svg",
              tag: `kep-capture-${Date.now()}`,
              url: `/palace?room=${targetRoomId}`,
            },
          );
        } catch { /* ignore individual push failures */ }
      }
    }
  } catch {
    // Push infrastructure may not be configured
  }

  return memory.id;
}
