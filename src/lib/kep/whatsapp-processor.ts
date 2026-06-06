/**
 * WhatsApp message processor — 1:1 DM only.
 * Handles incoming messages: commands, media capture, active room routing, AI fallback.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppMessage } from "@/types/kep";
import { downloadAndStoreMedia } from "./whatsapp-media";
import { autoRouteToRoom } from "./auto-route";
import { suggestRouting } from "./ai-route";
import {
  sendWelcomeMessage,
  sendTextMessage,
  sendRoomConfirmation,
  sendRoomPicker,
  sendLinkAccountMessage,
  sendRoomSwitchConfirmation,
  sendStatusMessage,
  sendHelpMessage,
  sendRoomPickerForSwitch,
  sendPausedReminder,
} from "./whatsapp-disclosure";

/**
 * Process a single WhatsApp message (1:1 DM only).
 */
export async function processWhatsAppMessage(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  phoneNumberId: string,
): Promise<void> {
  // Handle interactive responses (button taps, list selections)
  if (message.type === "interactive" && message.interactive) {
    await handleInteractiveResponse(supabase, message, phoneNumberId);
    return;
  }

  // Check if this is a text command (parse before stopped check — HELP/STATUS always work)
  if (message.type === "text" && message.text?.body) {
    const raw = message.text.body.trim();
    const upper = raw.toUpperCase();

    // Always-available commands (even when stopped)
    if (upper === "HELP") {
      await handleCommand(supabase, message.from, phoneNumberId, "HELP");
      return;
    }
    if (upper === "STATUS") {
      await handleCommand(supabase, message.from, phoneNumberId, "STATUS");
      return;
    }
    if (upper === "START") {
      await handleCommand(supabase, message.from, phoneNumberId, "START");
      return;
    }
    if (upper === "STOP") {
      await handleCommand(supabase, message.from, phoneNumberId, "STOP");
      return;
    }
    if (upper === "ROOMS") {
      await handleCommand(supabase, message.from, phoneNumberId, "ROOMS");
      return;
    }
    if (upper === "CLEAR") {
      await handleCommand(supabase, message.from, phoneNumberId, "CLEAR");
      return;
    }
    if (upper.startsWith("ROOM ")) {
      await handleRoomCommand(supabase, message.from, phoneNumberId, raw.slice(5).trim());
      return;
    }
  }

  // Look up the WhatsApp link
  const link = await lookupLink(supabase, phoneNumberId, message.from);

  if (!link) {
    console.log("[WhatsApp] No link found for DM from", message.from);
    const newLink = await autoCreateDMLink(supabase, phoneNumberId, message.from);
    if (newLink) {
      await processMessageWithLink(supabase, message, newLink);
    }
    return;
  }

  await processMessageWithLink(supabase, message, link);
}

/**
 * Look up a whatsapp_link for a 1:1 DM.
 */
async function lookupLink(
  supabase: SupabaseClient,
  phoneNumberId: string,
  senderPhone: string,
): Promise<Record<string, unknown> | null> {
  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("*, keps(*)")
    .eq("verified", true)
    .eq("phone_number_id", phoneNumberId)
    .eq("wa_sender_phone", senderPhone)
    .single();

  return link || null;
}

/**
 * Normalize a phone number to digits-only.
 */
function normalizePhone(phone: string): string {
  let digits = phone.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

/**
 * Look up a Palace user by their registered WhatsApp phone number.
 */
async function lookupUserByPhone(
  supabase: SupabaseClient,
  senderPhone: string,
): Promise<string | null> {
  const normalized = normalizePhone(senderPhone);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, whatsapp_phone")
    .not("whatsapp_phone", "is", null);

  if (!profiles || profiles.length === 0) return null;

  for (const p of profiles) {
    if (normalizePhone(p.whatsapp_phone) === normalized) {
      return p.id;
    }
  }

  return null;
}

/**
 * Auto-create a Kep + whatsapp_link when a 1:1 DM arrives with no existing link.
 */
async function autoCreateDMLink(
  supabase: SupabaseClient,
  phoneNumberId: string,
  senderPhone: string,
): Promise<Record<string, unknown> | null> {
  const matchedUserId = await lookupUserByPhone(supabase, senderPhone);

  if (!matchedUserId) {
    console.log(`[WhatsApp] No profile found for phone +${senderPhone}, sending link-account message`);
    await sendLinkAccountMessage(senderPhone);
    return null;
  }

  try {
    // Create the Kep
    const { data: kep, error: kepError } = await supabase
      .from("keps")
      .insert({
        user_id: matchedUserId,
        name: `Kep`,
        icon: "\uD83D\uDCAC",
        source_type: "whatsapp",
        source_config: { sender_phone: senderPhone },
        status: "active",
        auto_route_enabled: false,
        routing_rules: [],
        is_private: true,
        memories_captured: 0,
      })
      .select("id")
      .single();

    if (kepError) {
      console.error("[WhatsApp] Failed to auto-create DM Kep:", kepError.message);
      return null;
    }

    // Create the whatsapp_link
    const { data: link, error: linkError } = await supabase
      .from("whatsapp_links")
      .insert({
        kep_id: kep.id,
        user_id: matchedUserId,
        wa_sender_phone: senderPhone,
        phone_number_id: phoneNumberId,
        verified: true,
        verified_at: new Date().toISOString(),
        stopped: false,
      })
      .select("*, keps(*)")
      .single();

    if (linkError) {
      if (linkError.code === "23505") {
        console.log("[WhatsApp] DM link already exists (race condition), re-fetching");
        return await lookupLink(supabase, phoneNumberId, senderPhone);
      }
      console.error("[WhatsApp] Failed to auto-create DM link:", linkError.message);
      return null;
    }

    // Load user's rooms for welcome picker
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, wing_id, wings(id, slug, custom_name, name)")
      .eq("user_id", matchedUserId);

    // Send welcome message + room picker
    await sendWelcomeMessage(senderPhone);
    if (rooms && rooms.length > 0) {
      await sendRoomPickerForSwitch(senderPhone, rooms as any[]);
    }

    console.log(`[WhatsApp] Auto-created DM link for +${senderPhone} (user: ${matchedUserId})`);
    return link;
  } catch (err) {
    console.error("[WhatsApp] autoCreateDMLink error:", err);
    return null;
  }
}

/**
 * Process a message once we have a valid link.
 */
async function processMessageWithLink(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  link: Record<string, unknown>,
): Promise<void> {
  const kep = link.keps as Record<string, unknown>;
  if (!kep) return;

  // Check if kep is active
  if (kep.status !== "active") return;

  // Check if link-level stop is active
  if (link.stopped) {
    await sendPausedReminder(message.from);
    return;
  }

  // Detect forwarded messages
  const isForwarded = message.context?.forwarded || message.context?.frequently_forwarded;

  // Determine media type and handle accordingly
  const mediaType = getMediaType(message);
  if (!mediaType) return;

  let mediaUrl: string | null = null;
  let mediaSize: number | null = null;
  let payloadPreview: Record<string, unknown> = {};

  // Download media if applicable
  if (mediaType !== "text") {
    const mediaObj = getMediaObject(message);
    if (mediaObj) {
      try {
        const result = await downloadAndStoreMedia(
          supabase,
          mediaObj.id,
          kep.user_id as string,
          kep.id as string,
        );
        mediaUrl = result.url;
        mediaSize = result.size;
        if (mediaObj.caption) payloadPreview.caption = mediaObj.caption;
      } catch (err) {
        console.error(`[WhatsApp] Media download failed:`, err);
        await createCapture(supabase, {
          kep_id: kep.id as string,
          user_id: kep.user_id as string,
          source_message_id: message.id,
          source_sender: message.from,
          source_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
          media_type: mediaType,
          status: "failed",
          payload_preview: { error: `Media download failed: ${err instanceof Error ? err.message : String(err)}` },
        });
        await sendTextMessage(message.from, "Couldn't download that file. Please try again.");
        return;
      }
    }
  } else {
    payloadPreview = { text: message.text?.body || "" };
  }

  if (isForwarded) {
    payloadPreview.forwarded = true;
  }

  // Create capture record
  const captureId = await createCapture(supabase, {
    kep_id: kep.id as string,
    user_id: kep.user_id as string,
    source_message_id: message.id,
    source_sender: message.from,
    source_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    media_type: mediaType,
    media_url: mediaUrl,
    media_size: mediaSize,
    status: "pending",
    payload_preview: payloadPreview,
  });

  if (!captureId) return;

  // Update last_message_at on the link
  await supabase
    .from("whatsapp_links")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", link.id as string);

  // If link has an active room, auto-route directly
  if (link.active_room_id) {
    await autoRouteToRoom(
      supabase,
      { media_url: mediaUrl, media_type: mediaType, media_size: mediaSize, payload_preview: payloadPreview, source_sender: message.from },
      captureId,
      link.active_room_id as string,
      kep.id as string,
      kep.user_id as string,
    );
    // Send confirmation
    const { data: room } = await supabase
      .from("rooms")
      .select("name, wing_id, wings(custom_name, name, slug)")
      .eq("id", link.active_room_id as string)
      .single();
    const roomName = room?.name || "Room";
    const wing = room?.wings as unknown as Record<string, unknown> | null;
    const wingName = (wing?.custom_name || wing?.name || wing?.slug || "Palace") as string;
    await sendRoomConfirmation(message.from, roomName, wingName, captureId);
    return;
  }

  // No active room — use inline AI routing
  await inlineAiRoute(supabase, message, kep, captureId, mediaType, mediaUrl, mediaSize, payloadPreview);
}

/**
 * Inline AI routing — suggests a room or shows a picker.
 */
async function inlineAiRoute(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  kep: Record<string, unknown>,
  captureId: string,
  mediaType: string,
  mediaUrl: string | null,
  mediaSize: number | null,
  payloadPreview: Record<string, unknown>,
): Promise<void> {
  const userId = kep.user_id as string;
  const kepId = kep.id as string;

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, wing_id, wings(id, slug, custom_name, name)")
    .eq("user_id", userId);

  if (!rooms || rooms.length === 0) {
    await sendTextMessage(
      message.from,
      "You don't have any rooms yet. Create your first room at thememorypalace.ai",
    );
    await supabase
      .from("kep_captures")
      .update({ status: "processed" })
      .eq("id", captureId);
    return;
  }

  const roomContext = rooms.map((r: any) => ({
    wing_id: r.wings?.id || r.wing_id,
    wing_name: r.wings?.custom_name || r.wings?.name || r.wings?.slug || "",
    room_id: r.id,
    room_name: r.name,
  }));

  const suggestion = await suggestRouting(
    {
      media_type: mediaType,
      transcription: null,
      caption: (payloadPreview.caption as string) || (payloadPreview.text as string) || null,
      sender: message.from,
      timestamp: new Date().toISOString(),
      payload_preview: payloadPreview,
    },
    roomContext,
    (kep.routing_rules as any[]) || [],
  );

  if (suggestion && suggestion.confidence >= 0.8) {
    await autoRouteToRoom(
      supabase,
      {
        media_url: mediaUrl,
        media_type: mediaType,
        media_size: mediaSize,
        payload_preview: payloadPreview,
        source_sender: message.from,
      },
      captureId,
      suggestion.room_id,
      kepId,
      userId,
    );
    await sendRoomConfirmation(
      message.from,
      suggestion.room_name,
      suggestion.wing_name,
      captureId,
    );
  } else {
    await sendRoomPicker(message.from, rooms as any[], captureId);
    await supabase
      .from("kep_captures")
      .update({ status: "processed", ai_suggestion: suggestion })
      .eq("id", captureId);
  }
}

/**
 * Handle text commands.
 */
async function handleCommand(
  supabase: SupabaseClient,
  senderPhone: string,
  phoneNumberId: string,
  command: string,
): Promise<void> {
  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("id, kep_id, user_id, stopped, active_room_id")
    .eq("phone_number_id", phoneNumberId)
    .eq("wa_sender_phone", senderPhone)
    .single();

  if (!link) {
    if (command === "HELP") {
      await sendHelpMessage(senderPhone);
    }
    return;
  }

  switch (command) {
    case "STOP":
      await supabase
        .from("whatsapp_links")
        .update({ stopped: true, stopped_at: new Date().toISOString() })
        .eq("id", link.id);
      await sendTextMessage(senderPhone, "Kep paused. Send START to resume.");
      break;

    case "START":
      await supabase
        .from("whatsapp_links")
        .update({ stopped: false, stopped_at: null })
        .eq("id", link.id);
      await sendTextMessage(senderPhone, "Kep resumed! Send me photos, videos, or messages.");
      break;

    case "HELP":
      await sendHelpMessage(senderPhone);
      break;

    case "STATUS":
      await sendStatusMessage(senderPhone, link, supabase);
      break;

    case "ROOMS": {
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name, wing_id, wings(id, slug, custom_name, name)")
        .eq("user_id", link.user_id)
        .order("name");

      if (!rooms || rooms.length === 0) {
        await sendTextMessage(senderPhone, "You don't have any rooms yet. Create your first room at thememorypalace.ai");
      } else {
        await sendRoomPickerForSwitch(senderPhone, rooms as any[]);
      }
      break;
    }

    case "CLEAR":
      await supabase
        .from("whatsapp_links")
        .update({ active_room_id: null })
        .eq("id", link.id);
      await sendTextMessage(senderPhone, "Active room cleared. AI will now route your messages automatically.");
      break;
  }
}

/**
 * Handle ROOM <name> command — fuzzy match room name, set active_room_id.
 */
async function handleRoomCommand(
  supabase: SupabaseClient,
  senderPhone: string,
  phoneNumberId: string,
  searchTerm: string,
): Promise<void> {
  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("id, user_id")
    .eq("phone_number_id", phoneNumberId)
    .eq("wa_sender_phone", senderPhone)
    .single();

  if (!link) return;

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, wing_id, wings(id, slug, custom_name, name)")
    .eq("user_id", link.user_id);

  if (!rooms || rooms.length === 0) {
    await sendTextMessage(senderPhone, "You don't have any rooms yet. Create your first room at thememorypalace.ai");
    return;
  }

  const search = searchTerm.toLowerCase();
  const matches = rooms.filter((r: any) => r.name.toLowerCase().includes(search));

  if (matches.length === 1) {
    const room = matches[0] as any;
    await supabase
      .from("whatsapp_links")
      .update({ active_room_id: room.id })
      .eq("id", link.id);

    const wing = room.wings as Record<string, unknown> | null;
    const wingName = (wing?.custom_name || wing?.name || wing?.slug || "Palace") as string;
    await sendRoomSwitchConfirmation(senderPhone, wingName, room.name);
  } else if (matches.length > 1) {
    await sendRoomPickerForSwitch(senderPhone, matches as any[]);
  } else {
    await sendTextMessage(senderPhone, `No room found matching "${searchTerm}". Text ROOMS to see your rooms.`);
  }
}

/**
 * Handle interactive responses — button taps and list selections.
 */
async function handleInteractiveResponse(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  phoneNumberId: string,
): Promise<void> {
  const interactive = message.interactive!;
  const replyId = interactive.button_reply?.id || interactive.list_reply?.id;
  if (!replyId) return;

  const parts = replyId.split(":");

  if (parts[0] === "confirm") {
    return;
  }

  if (parts[0] === "setroom" && parts[1]) {
    // Room switch from interactive picker
    const roomId = parts[1];
    const { data: link } = await supabase
      .from("whatsapp_links")
      .select("id, user_id")
      .eq("phone_number_id", phoneNumberId)
      .eq("wa_sender_phone", message.from)
      .single();

    if (!link) return;

    // Verify user owns the room
    const { data: room } = await supabase
      .from("rooms")
      .select("id, name, wing_id, wings(custom_name, name, slug)")
      .eq("id", roomId)
      .eq("user_id", link.user_id)
      .single();

    if (!room) return;

    await supabase
      .from("whatsapp_links")
      .update({ active_room_id: roomId })
      .eq("id", link.id);

    const wing = room.wings as unknown as Record<string, unknown> | null;
    const wingName = (wing?.custom_name || wing?.name || wing?.slug || "Palace") as string;
    await sendRoomSwitchConfirmation(message.from, wingName, room.name);
    return;
  }

  if (parts[0] === "delete" && parts[1]) {
    const captureId = parts[1];
    const { data: capture } = await supabase
      .from("kep_captures")
      .select("memory_id, kep_id")
      .eq("id", captureId)
      .single();

    if (capture?.memory_id) {
      await supabase.from("memories").delete().eq("id", capture.memory_id);
    }
    await supabase
      .from("kep_captures")
      .update({ status: "rejected", rejection_reason: "user_deleted", memory_id: null })
      .eq("id", captureId);

    await sendTextMessage(message.from, "Deleted");
    return;
  }

  if (parts[0] === "move" && parts[1]) {
    const captureId = parts[1];
    const { data: capture } = await supabase
      .from("kep_captures")
      .select("user_id")
      .eq("id", captureId)
      .single();

    if (!capture) return;

    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, wing_id, wings(id, slug, custom_name, name)")
      .eq("user_id", capture.user_id);

    if (rooms && rooms.length > 0) {
      await sendRoomPicker(message.from, rooms as any[], captureId);
    }
    return;
  }

  if (parts[0] === "route" && parts[1] && parts[2]) {
    const captureId = parts[1];
    const roomId = parts[2];

    const { data: capture } = await supabase
      .from("kep_captures")
      .select("*, keps(id, user_id)")
      .eq("id", captureId)
      .single();

    if (!capture) return;

    const kep = capture.keps as Record<string, unknown>;
    const userId = (kep?.user_id || capture.user_id) as string;
    const kepId = (kep?.id || capture.kep_id) as string;

    if (capture.memory_id) {
      await supabase
        .from("memories")
        .update({ room_id: roomId })
        .eq("id", capture.memory_id);
      await supabase
        .from("kep_captures")
        .update({ status: "routed" })
        .eq("id", captureId);
    } else {
      await autoRouteToRoom(
        supabase,
        {
          media_url: capture.media_url,
          media_type: capture.media_type,
          media_size: capture.media_size,
          payload_preview: capture.payload_preview,
          source_sender: capture.source_sender,
          transcription: capture.transcription,
        },
        captureId,
        roomId,
        kepId,
        userId,
      );
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("name, wing_id, wings(custom_name, name, slug)")
      .eq("id", roomId)
      .single();

    const roomName = room?.name || "Room";
    const wing = room?.wings as unknown as Record<string, unknown> | null;
    const wingName = (wing?.custom_name || wing?.name || wing?.slug || "Palace") as string;

    const movedText = capture.memory_id
      ? `Moved to ${wingName} / ${roomName}`
      : `Saved to ${wingName} / ${roomName}`;
    await sendTextMessage(message.from, movedText);
    return;
  }
}

async function createCapture(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
): Promise<string | null> {
  const { data: capture, error } = await supabase
    .from("kep_captures")
    .insert(data)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.log(`[WhatsApp] Duplicate message ignored: ${data.source_message_id}`);
      return null;
    }
    console.error(`[WhatsApp] Failed to create capture:`, error.message);
    return null;
  }

  return capture.id;
}

function getMediaType(message: WhatsAppMessage): string | null {
  switch (message.type) {
    case "text": return "text";
    case "image": return "image";
    case "video": return "video";
    case "audio": return "audio";
    case "document": return "document";
    default: return null;
  }
}

function getMediaObject(message: WhatsAppMessage) {
  switch (message.type) {
    case "image": return message.image;
    case "video": return message.video;
    case "audio": return message.audio;
    case "document": return message.document;
    default: return null;
  }
}
