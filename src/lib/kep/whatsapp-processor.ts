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
import { sendWelcomeMessage, sendGroupWelcomeMessage } from "./whatsapp-disclosure";

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
  const link = await lookupLink(supabase, phoneNumberId, chatId);

  if (!link) {
    // No link found — for groups, auto-create one
    if (chatId) {
      const newLink = await autoCreateGroupLink(supabase, phoneNumberId, chatId);
      if (newLink) {
        // Process the message with the new link
        await processMessageWithLink(supabase, message, newLink);
      }
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
): Promise<Record<string, unknown> | null> {
  let query = supabase
    .from("whatsapp_links")
    .select("*, keps(*)")
    .eq("verified", true);

  if (chatId) {
    // Group: lookup by group ID
    query = query.eq("wa_group_id", chatId);
  } else {
    // 1:1: lookup by phone number where no group is set
    query = query.eq("phone_number_id", phoneNumberId).is("wa_group_id", null);
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

  const isGroup = isGroupMessage(message);

  // First-message detection (1:1 only — for groups, welcome is sent on auto-create)
  if (!isGroup) {
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
          payload_preview: { error: "Media download failed" },
        });
        return;
      }
    }
  } else {
    payloadPreview = { text: message.text?.body || "" };
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

  // Enqueue processing job (no target room yet — use AI routing queue)
  await enqueueJob(supabase, "kep_capture", {
    captureId,
    kepId: kep.id as string,
    userId: kep.user_id as string,
  });
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
    query = query.eq("phone_number_id", phoneNumberId).is("wa_group_id", null);
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
