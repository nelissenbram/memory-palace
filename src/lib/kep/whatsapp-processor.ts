/**
 * WhatsApp message processor.
 * Handles incoming messages: commands, media capture, exclusion checks.
 * Supports both group chats (chat_id ending @g.us) and 1:1 messages.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppMessage } from "@/types/kep";
import { downloadAndStoreMedia } from "./whatsapp-media";
import { enqueueJob } from "@/lib/queue";
import { autoRouteToRoom } from "./auto-route";
import { suggestRouting } from "./ai-route";
import {
  sendWelcomeMessage,
  sendGroupWelcomeMessage,
  sendTextMessage,
  sendRoomConfirmation,
  sendRoomPicker,
} from "./whatsapp-disclosure";

const COMMANDS = {
  STOP: "STOP",
  INFO: "INFO",
  START: "START",
  STOP_KEP: "STOP KEP",
  START_KEP: "START KEP",
} as const;

/**
 * Check if a message comes from a WhatsApp group.
 */
function isGroupMessage(message: WhatsAppMessage): boolean {
  return !!message.chat_id && message.chat_id.endsWith("@g.us");
}

/**
 * Generate a random invite code for a Kep link.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "KEP-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Process a single WhatsApp message.
 */
export async function processWhatsAppMessage(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  phoneNumberId: string,
): Promise<void> {
  const chatId = isGroupMessage(message) ? message.chat_id! : null;

  // Handle interactive responses (button taps, list selections)
  if (message.type === "interactive" && message.interactive) {
    await handleInteractiveResponse(supabase, message, phoneNumberId);
    return;
  }

  // Check if this is a text command
  if (message.type === "text" && message.text?.body) {
    const command = message.text.body.trim().toUpperCase();
    if (
      command === COMMANDS.STOP || command === COMMANDS.INFO || command === COMMANDS.START ||
      command === COMMANDS.STOP_KEP || command === COMMANDS.START_KEP
    ) {
      await handleCommand(supabase, message.from, phoneNumberId, command, chatId);
      return;
    }
  }

  // Look up the WhatsApp link
  const link = await lookupLink(supabase, phoneNumberId, chatId, message.from);

  if (!link) {
    console.log("[WhatsApp] No link found for", chatId ? `group ${chatId}` : `DM from ${message.from}`);
    // No link found — auto-create for groups and 1:1 DMs
    let newLink: Record<string, unknown> | null = null;
    if (chatId) {
      newLink = await autoCreateGroupLink(supabase, phoneNumberId, chatId);
    } else {
      newLink = await autoCreateDMLink(supabase, phoneNumberId, message.from);
    }
    if (newLink) {
      await processMessageWithLink(supabase, message, newLink);
    }
    return;
  }

  await processMessageWithLink(supabase, message, link);
}

/**
 * Look up a whatsapp_link — branching by group vs 1:1.
 */
async function lookupLink(
  supabase: SupabaseClient,
  phoneNumberId: string,
  chatId: string | null,
  senderPhone?: string,
): Promise<Record<string, unknown> | null> {
  let query = supabase
    .from("whatsapp_links")
    .select("*, keps(*)")
    .eq("verified", true);

  if (chatId) {
    // Group: lookup by group ID
    query = query.eq("wa_group_id", chatId);
  } else {
    // 1:1: lookup by phone number + sender phone where no group is set
    query = query
      .eq("phone_number_id", phoneNumberId)
      .is("wa_group_id", null)
      .eq("wa_sender_phone", senderPhone ?? "");
  }

  const { data: link } = await query.single();
  return link || null;
}

/**
 * Auto-create a Kep + whatsapp_link when a group message arrives with no existing link.
 */
async function autoCreateGroupLink(
  supabase: SupabaseClient,
  phoneNumberId: string,
  chatId: string,
): Promise<Record<string, unknown> | null> {
  const defaultUserId = process.env.KEP_DEFAULT_USER_ID;
  if (!defaultUserId) {
    console.error("[WhatsApp] KEP_DEFAULT_USER_ID not configured — cannot auto-create group link");
    return null;
  }

  const inviteCode = generateInviteCode();

  try {
    // Create the Kep
    const { data: kep, error: kepError } = await supabase
      .from("keps")
      .insert({
        user_id: defaultUserId,
        name: "WhatsApp Group",
        icon: "📱",
        source_type: "whatsapp",
        source_config: { chat_id: chatId },
        status: "active",
        auto_route_enabled: false,
        routing_rules: [],
        is_private: true,
        memories_captured: 0,
      })
      .select("id")
      .single();

    if (kepError) {
      console.error("[WhatsApp] Failed to auto-create Kep:", kepError.message);
      return null;
    }

    // Create the whatsapp_link
    const { data: link, error: linkError } = await supabase
      .from("whatsapp_links")
      .insert({
        kep_id: kep.id,
        user_id: defaultUserId,
        wa_group_id: chatId,
        phone_number_id: phoneNumberId,
        verified: true,
        verified_at: new Date().toISOString(),
        invite_code: inviteCode,
        stopped: false,
      })
      .select("*, keps(*)")
      .single();

    if (linkError) {
      // Unique constraint violation → another request already created it
      if (linkError.code === "23505") {
        console.log("[WhatsApp] Group link already exists (race condition), re-fetching");
        return await lookupLink(supabase, phoneNumberId, chatId);
      }
      console.error("[WhatsApp] Failed to auto-create link:", linkError.message);
      return null;
    }

    // Send welcome message TO THE GROUP
    await sendGroupWelcomeMessage(chatId, inviteCode);

    console.log(`[WhatsApp] Auto-created group link for ${chatId} with invite ${inviteCode}`);
    return link;
  } catch (err) {
    console.error("[WhatsApp] autoCreateGroupLink error:", err);
    return null;
  }
}

/**
 * Auto-create a Kep + whatsapp_link when a 1:1 DM arrives with no existing link.
 */
async function autoCreateDMLink(
  supabase: SupabaseClient,
  phoneNumberId: string,
  senderPhone: string,
): Promise<Record<string, unknown> | null> {
  const defaultUserId = process.env.KEP_DEFAULT_USER_ID;
  if (!defaultUserId) {
    console.error("[WhatsApp] KEP_DEFAULT_USER_ID not configured — cannot auto-create DM link");
    return null;
  }

  const inviteCode = generateInviteCode();

  try {
    // Create the Kep
    const { data: kep, error: kepError } = await supabase
      .from("keps")
      .insert({
        user_id: defaultUserId,
        name: `DM +${senderPhone}`,
        icon: "💬",
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
        user_id: defaultUserId,
        wa_group_id: null,
        wa_sender_phone: senderPhone,
        phone_number_id: phoneNumberId,
        verified: true,
        verified_at: new Date().toISOString(),
        invite_code: inviteCode,
        stopped: false,
      })
      .select("*, keps(*)")
      .single();

    if (linkError) {
      // Unique constraint violation → another request already created it
      if (linkError.code === "23505") {
        console.log("[WhatsApp] DM link already exists (race condition), re-fetching");
        return await lookupLink(supabase, phoneNumberId, null, senderPhone);
      }
      console.error("[WhatsApp] Failed to auto-create DM link:", linkError.message);
      return null;
    }

    // Send welcome message to the sender
    await sendWelcomeMessage(senderPhone, inviteCode);

    console.log(`[WhatsApp] Auto-created DM link for +${senderPhone} with invite ${inviteCode}`);
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
  if (link.stopped) return;

  const isGroupMsg = isGroupMessage(message);

  // First-message detection (1:1 only — for groups, welcome is sent on auto-create)
  if (!isGroupMsg) {
    const { count: priorCount } = await supabase
      .from("kep_captures")
      .select("id", { count: "exact", head: true })
      .eq("kep_id", kep.id as string)
      .eq("source_sender", message.from);

    if (priorCount === 0) {
      await sendWelcomeMessage(message.from, link.invite_code as string | null);
    }
  }

  // Check exclusions (STOP list)
  const { data: exclusion } = await supabase
    .from("kep_exclusions")
    .select("id")
    .eq("kep_id", kep.id as string)
    .eq("phone_number", message.from)
    .single();

  if (exclusion) {
    // Sender has opted out — skip
    return;
  }

  // Detect forwarded messages
  const isForwarded = message.context?.forwarded || message.context?.frequently_forwarded;

  // Determine media type and handle accordingly
  const mediaType = getMediaType(message);
  if (!mediaType) {
    // Unsupported message type (sticker, reaction, etc.) — skip
    return;
  }

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

  // If link has a target room, auto-route directly (skip job queue)
  if (link.target_room_id) {
    await autoRouteToRoom(
      supabase,
      { media_url: mediaUrl, media_type: mediaType, media_size: mediaSize, payload_preview: payloadPreview, source_sender: message.from },
      captureId,
      link.target_room_id as string,
      kep.id as string,
      kep.user_id as string,
    );
    return;
  }

  // 1:1 messages: inline AI routing with interactive room picker
  // Group messages: use job queue (no interactive response possible)
  if (!isGroupMsg) {
    await inlineAiRoute(supabase, message, kep, captureId, mediaType, mediaUrl, mediaSize, payloadPreview);
    return;
  }

  // Enqueue processing job for group messages
  await enqueueJob(supabase, "kep_capture", {
    captureId,
    kepId: kep.id as string,
    userId: kep.user_id as string,
  });
}

/**
 * Inline AI routing for 1:1 messages — suggests a room or shows a picker.
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

  // Load user's rooms
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, wing_id, wings(id, slug, custom_name, name)")
    .eq("user_id", userId);

  if (!rooms || rooms.length === 0) {
    await sendTextMessage(
      message.from,
      "You don't have any rooms yet. Create your first wing at thememorypalace.ai",
    );
    await supabase
      .from("kep_captures")
      .update({ status: "processed" })
      .eq("id", captureId);
    return;
  }

  // Build room context for AI
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
    // High confidence: auto-route + send confirmation with buttons
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
    // Low confidence: send room picker list
    await sendRoomPicker(message.from, rooms as any[], captureId);
    await supabase
      .from("kep_captures")
      .update({ status: "processed", ai_suggestion: suggestion })
      .eq("id", captureId);
  }
}

/**
 * Handle text commands — group-aware.
 */
async function handleCommand(
  supabase: SupabaseClient,
  senderPhone: string,
  phoneNumberId: string,
  command: string,
  chatId: string | null,
): Promise<void> {
  // Find link(s) — scoped to group if applicable
  let query = supabase
    .from("whatsapp_links")
    .select("kep_id, id, stopped_by, user_id");

  if (chatId) {
    query = query.eq("wa_group_id", chatId);
  } else {
    query = query
      .eq("phone_number_id", phoneNumberId)
      .is("wa_group_id", null)
      .eq("wa_sender_phone", senderPhone);
  }

  const { data: links } = await query;
  if (!links || links.length === 0) return;

  for (const link of links) {
    if (command === "STOP" || command === "STOP KEP") {
      if (command === "STOP KEP") {
        // Group-level stop: deactivate the entire link
        await supabase
          .from("whatsapp_links")
          .update({ stopped: true, stopped_by: senderPhone, stopped_at: new Date().toISOString() })
          .eq("id", link.id);
      }
      // Also add sender to exclusion list
      await supabase
        .from("kep_exclusions")
        .upsert(
          { kep_id: link.kep_id, phone_number: senderPhone, reason: "stop_command" },
          { onConflict: "kep_id,phone_number" },
        );
    } else if (command === "START" || command === "START KEP") {
      if (command === "START KEP") {
        // Reactivate link (only if this sender stopped it or is the kep owner)
        if (link.stopped_by === senderPhone || link.user_id === senderPhone) {
          await supabase
            .from("whatsapp_links")
            .update({ stopped: false, stopped_by: null, stopped_at: null })
            .eq("id", link.id);
        }
      }
      // Remove sender from exclusion list
      await supabase
        .from("kep_exclusions")
        .delete()
        .eq("kep_id", link.kep_id)
        .eq("phone_number", senderPhone);
    }
    // INFO command — could send a reply message (future enhancement)
  }
}

/**
 * Handle interactive responses — button taps and list selections from room picker.
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
    // User tapped "OK" — already routed, nothing to do
    return;
  }

  if (parts[0] === "delete" && parts[1]) {
    const captureId = parts[1];
    // Delete the capture's memory and mark as rejected
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
    // Look up the capture to find the user, then send room picker
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

    // Load capture data
    const { data: capture } = await supabase
      .from("kep_captures")
      .select("*, keps(id, user_id)")
      .eq("id", captureId)
      .single();

    if (!capture) return;

    const kep = capture.keps as Record<string, unknown>;
    const userId = (kep?.user_id || capture.user_id) as string;
    const kepId = (kep?.id || capture.kep_id) as string;

    // If already routed to a different room, move the memory
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
      // Route to selected room
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

    // Send confirmation
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
