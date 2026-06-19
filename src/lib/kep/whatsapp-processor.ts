/**
 * WhatsApp message processor — 1:1 DM only.
 * Handles incoming messages: commands, media capture, active room routing, AI fallback.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppMessage } from "@/types/kep";
import { WING_ROOMS } from "@/lib/constants/wings";
import { getEffectiveStorageLimit } from "@/lib/auth/plan-limits";
import { downloadAndStoreMedia } from "./whatsapp-media";
import { autoRouteToRoom } from "./auto-route";
import { suggestRouting } from "./ai-route";
import {
  sendWelcomeMessage,
  sendTextMessage,
  sendRoomConfirmation,
  sendRoomPicker,
  sendLinkAccountMessage,
  sendLinkAccountIntro,
  sendRoomSwitchConfirmation,
  sendStatusMessage,
  sendHelpMessage,
  sendRoomPickerForSwitch,
  sendPausedReminder,
  sendWingPicker,
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

  // Check for pending action (e.g. waiting for room name)
  if (message.type === "text" && message.text?.body) {
    const pending = await checkPendingAction(supabase, phoneNumberId, message.from);
    if (pending === "create_room") {
      await finishCreateRoom(supabase, message.from, phoneNumberId, message.text.body.trim());
      return;
    }
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
    if (upper.startsWith("NEW ")) {
      await handleNewRoomCommand(supabase, message.from, phoneNumberId, raw.slice(4).trim());
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
    const rooms = await fetchRoomsWithWings(supabase, matchedUserId);

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
 * Check user's storage usage as a percentage of their plan limit.
 * Returns { storageMb, limitMb, pct } or null on error.
 */
async function checkStorageUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ storageMb: number; limitMb: number; pct: number } | null> {
  try {
    const storageRes = await supabase
      .from("memories")
      .select("file_size")
      .eq("user_id", userId);
    const totalBytes = (storageRes.data || []).reduce(
      (sum: number, m: any) => sum + (m.file_size || 0),
      0,
    );
    const storageMb = Math.round(totalBytes / (1024 * 1024));

    // Use getEffectiveStorageLimit for grandfathering support
    const limitMb = await getEffectiveStorageLimit(userId);
    const pct = limitMb > 0 ? (storageMb / limitMb) * 100 : 0;

    return { storageMb, limitMb, pct };
  } catch (err) {
    console.error("[WhatsApp] Storage check failed:", err);
    return null;
  }
}

/**
 * Send a storage warning message if usage is at 80%+.
 * Does nothing if usage is below 80% or if the check fails.
 */
async function sendStorageWarningIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  recipientPhone: string,
): Promise<void> {
  try {
    const usage = await checkStorageUsage(supabase, userId);
    if (!usage) return;

    if (usage.pct >= 100) {
      await sendTextMessage(
        recipientPhone,
        "⚠️ Your storage is full. New memories can't be saved until you upgrade or free up space. Visit thememorypalace.ai/pricing",
      );
    } else if (usage.pct >= 80) {
      await sendTextMessage(
        recipientPhone,
        `📦 Storage notice: you've used ${Math.round(usage.pct)}% of your storage. Upgrade at thememorypalace.ai/pricing for more space.`,
      );
    }
  } catch (err) {
    // Don't block the main flow
    console.error("[WhatsApp] Storage warning send failed:", err);
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

  // Block media download if storage is full
  if (mediaType !== "text") {
    try {
      const usage = await checkStorageUsage(supabase, kep.user_id as string);
      if (usage && usage.pct >= 100) {
        await sendTextMessage(
          message.from,
          "⚠️ Your storage is full. New memories can't be saved until you upgrade or free up space. Visit thememorypalace.ai/pricing",
        );
        return;
      }
    } catch (err) {
      // Don't block on storage check failure — proceed with download
      console.error("[WhatsApp] Pre-download storage check failed:", err);
    }
  }

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
    const roomInfo = await fetchRoomWithWing(supabase, link.active_room_id as string);
    await sendRoomConfirmation(message.from, roomInfo?.name || "Room", roomInfo?.wingName || "Palace", captureId);
    // Warn if storage is running low
    await sendStorageWarningIfNeeded(supabase, kep.user_id as string, message.from);
    return;
  }

  // No active room — use inline AI routing
  await inlineAiRoute(supabase, message, kep, captureId, mediaType, mediaUrl, mediaSize, payloadPreview);
}

/**
 * Build a map of room short IDs → display names from WING_ROOMS constants
 * and user's custom rooms (stored in profiles.local_settings).
 */
function buildRoomNameMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const rooms of Object.values(WING_ROOMS)) {
    for (const r of rooms) {
      map[r.id] = r.name; // e.g. "ro1" → "Me, Over Time"
    }
  }
  return map;
}

const DEFAULT_ROOM_NAMES = buildRoomNameMap();

/**
 * Resolve the display name for a room. Checks custom rooms first,
 * then falls back to WING_ROOMS constants, then humanizes slug IDs.
 */
function resolveRoomDisplayName(
  dbName: string,
  customRooms: Record<string, Array<{ id: string; name: string }>> | null,
): string {
  // Check custom rooms (user renamed or created rooms)
  if (customRooms) {
    for (const rooms of Object.values(customRooms)) {
      const match = rooms.find(r => r.id === dbName);
      if (match) return match.name;
    }
  }
  // Check default room constants
  if (DEFAULT_ROOM_NAMES[dbName]) return DEFAULT_ROOM_NAMES[dbName];
  // If it looks like a slug ID (e.g. "kr2", "ro5"), show as "Room N"
  const slugMatch = dbName.match(/^[a-z]{2,3}(\d+)$/);
  if (slugMatch) return `Room ${slugMatch[1]}`;
  // Fallback: use the DB name as-is
  return dbName;
}

/**
 * Fetch rooms with wing info for a user. Uses separate queries to avoid
 * PostgREST join issues after schema changes. Resolves display names
 * from WING_ROOMS constants and custom room settings.
 */
async function fetchRoomsWithWings(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data: rooms, error: roomsErr } = await supabase
    .from("rooms")
    .select("id, name, wing_id")
    .eq("user_id", userId)
    .order("name");

  if (roomsErr || !rooms || rooms.length === 0) {
    if (roomsErr) console.error("[WhatsApp] Rooms query failed:", roomsErr.message);
    return [];
  }

  // Fetch wings separately
  const wingIds = [...new Set(rooms.map((r: any) => r.wing_id).filter(Boolean))];
  let wingsMap: Record<string, Record<string, unknown>> = {};
  if (wingIds.length > 0) {
    const { data: wings } = await supabase
      .from("wings")
      .select("id, slug, custom_name")
      .in("id", wingIds);
    if (wings) {
      for (const w of wings) {
        wingsMap[w.id] = w;
      }
    }
  }

  // Fetch custom room names from user's local_settings
  let customRooms: Record<string, Array<{ id: string; name: string }>> | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("local_settings")
    .eq("id", userId)
    .single();
  if (profile?.local_settings?.mp_custom_rooms) {
    try {
      customRooms = typeof profile.local_settings.mp_custom_rooms === "string"
        ? JSON.parse(profile.local_settings.mp_custom_rooms)
        : profile.local_settings.mp_custom_rooms;
    } catch { /* ignore parse errors */ }
  }

  return rooms.map((r: any) => ({
    ...r,
    name: resolveRoomDisplayName(r.name, customRooms),
    wings: wingsMap[r.wing_id] || null,
  }));
}

/**
 * Fetch a single room with resolved display name and wing info.
 */
async function fetchRoomWithWing(
  supabase: SupabaseClient,
  roomId: string,
  userId?: string,
): Promise<{ name: string; wingName: string } | null> {
  const query = supabase.from("rooms").select("name, wing_id, user_id").eq("id", roomId);
  if (userId) query.eq("user_id", userId);
  const { data: room } = await query.single();
  if (!room) return null;

  // Resolve wing name
  let wingName = "Palace";
  if (room.wing_id) {
    const { data: wing } = await supabase
      .from("wings")
      .select("slug, custom_name")
      .eq("id", room.wing_id)
      .single();
    if (wing) wingName = (wing.custom_name || wing.slug) as string;
  }

  // Resolve room display name
  let customRooms: Record<string, Array<{ id: string; name: string }>> | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("local_settings")
    .eq("id", room.user_id)
    .single();
  if (profile?.local_settings?.mp_custom_rooms) {
    try {
      customRooms = typeof profile.local_settings.mp_custom_rooms === "string"
        ? JSON.parse(profile.local_settings.mp_custom_rooms)
        : profile.local_settings.mp_custom_rooms;
    } catch { /* ignore */ }
  }

  return {
    name: resolveRoomDisplayName(room.name, customRooms),
    wingName,
  };
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

  const rooms = await fetchRoomsWithWings(supabase, userId);

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
    wing_name: r.wings?.custom_name || r.wings?.slug || "",
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
    // Warn if storage is running low
    await sendStorageWarningIfNeeded(supabase, userId, message.from);
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
      const rooms = await fetchRoomsWithWings(supabase, link.user_id as string);

      if (rooms.length === 0) {
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

  const rooms = await fetchRoomsWithWings(supabase, link.user_id as string);

  if (rooms.length === 0) {
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
    const wingName = (wing?.custom_name || wing?.slug || "Palace") as string;
    await sendRoomSwitchConfirmation(senderPhone, wingName, room.name);
  } else if (matches.length > 1) {
    await sendRoomPickerForSwitch(senderPhone, matches as any[]);
  } else {
    await sendTextMessage(senderPhone, `No room found matching "${searchTerm}". Text ROOMS to see your rooms.`);
  }
}

/**
 * Create a new room in the user's first wing, save display name,
 * set as active room, and send confirmation.
 */
async function createRoomForUser(
  supabase: SupabaseClient,
  senderPhone: string,
  linkId: string,
  userId: string,
  roomName: string,
  targetWingId?: string,
): Promise<void> {
  // Get the target wing or default to first wing
  let wingQuery = supabase.from("wings").select("id, slug, custom_name").eq("user_id", userId);
  if (targetWingId) {
    wingQuery = wingQuery.eq("id", targetWingId);
  } else {
    wingQuery = wingQuery.order("sort_order").limit(1);
  }
  const { data: wing } = await wingQuery.single();

  if (!wing) {
    await sendTextMessage(senderPhone, "No wings found. Visit thememorypalace.ai to set up your palace first.");
    return;
  }

  // Generate room slug ID: wing prefix (first 2 chars of slug) + next number
  const prefix = (wing.slug as string).slice(0, 2);
  const { data: existingRooms } = await supabase
    .from("rooms")
    .select("name")
    .eq("user_id", userId)
    .eq("wing_id", wing.id);

  let maxNum = 0;
  if (existingRooms) {
    for (const r of existingRooms) {
      const m = (r.name as string).match(/^[a-z]{2,3}(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    }
  }
  const roomSlugId = `${prefix}${maxNum + 1}`;

  // Create room in DB
  const { data: newRoom, error: roomErr } = await supabase
    .from("rooms")
    .insert({
      wing_id: wing.id,
      user_id: userId,
      name: roomSlugId,
      icon: "📁",
      cover_hue: Math.floor(Math.random() * 360),
    })
    .select("id")
    .single();

  if (roomErr) {
    console.error("[WhatsApp] Failed to create room:", roomErr.message);
    await sendTextMessage(senderPhone, "Couldn't create the room. Please try again.");
    return;
  }

  // Save display name to user's custom rooms in local_settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("local_settings")
    .eq("id", userId)
    .single();

  let localSettings = profile?.local_settings || {};
  let customRooms: Record<string, Array<Record<string, unknown>>> = {};
  if (localSettings.mp_custom_rooms) {
    try {
      customRooms = typeof localSettings.mp_custom_rooms === "string"
        ? JSON.parse(localSettings.mp_custom_rooms)
        : localSettings.mp_custom_rooms;
    } catch { /* ignore */ }
  }

  const wingSlug = wing.slug as string;
  if (!customRooms[wingSlug]) {
    customRooms[wingSlug] = (WING_ROOMS[wingSlug] || []).map(r => ({ ...r }));
  }
  customRooms[wingSlug].push({
    id: roomSlugId,
    name: roomName,
    icon: "📁",
    shared: false,
    sharedWith: [],
    coverHue: Math.floor(Math.random() * 360),
  });

  await supabase
    .from("profiles")
    .update({
      local_settings: {
        ...localSettings,
        mp_custom_rooms: JSON.stringify(customRooms),
      },
    })
    .eq("id", userId);

  // Set as active room
  await supabase
    .from("whatsapp_links")
    .update({ active_room_id: newRoom.id, pending_action: null })
    .eq("id", linkId);

  const wingName = (wing.custom_name || wing.slug) as string;
  await sendRoomSwitchConfirmation(senderPhone, wingName, roomName);
}

/**
 * Handle NEW <name> command — create a new room and set it as active.
 */
async function handleNewRoomCommand(
  supabase: SupabaseClient,
  senderPhone: string,
  phoneNumberId: string,
  roomName: string,
): Promise<void> {
  if (!roomName) {
    await sendTextMessage(senderPhone, "Please provide a name: NEW My Vacation Photos");
    return;
  }

  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("id, user_id")
    .eq("phone_number_id", phoneNumberId)
    .eq("wa_sender_phone", senderPhone)
    .single();

  if (!link) return;

  await createRoomForUser(supabase, senderPhone, link.id, link.user_id, roomName);
}

/**
 * Check if user has a pending action (e.g. waiting for room name input).
 */
async function checkPendingAction(
  supabase: SupabaseClient,
  phoneNumberId: string,
  senderPhone: string,
): Promise<string | null> {
  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("pending_action")
    .eq("phone_number_id", phoneNumberId)
    .eq("wa_sender_phone", senderPhone)
    .single();

  return link?.pending_action || null;
}

/**
 * Complete the "create room" flow — user's text is the room name.
 * Shows a wing picker so user can choose where to create the room.
 */
async function finishCreateRoom(
  supabase: SupabaseClient,
  senderPhone: string,
  phoneNumberId: string,
  roomName: string,
): Promise<void> {
  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("id, user_id")
    .eq("phone_number_id", phoneNumberId)
    .eq("wa_sender_phone", senderPhone)
    .single();

  if (!link) return;

  if (!roomName || roomName.length < 1) {
    await supabase
      .from("whatsapp_links")
      .update({ pending_action: null })
      .eq("id", link.id);
    await sendTextMessage(senderPhone, "Room creation cancelled.");
    return;
  }

  // Store the room name in pending_action for the next step
  await supabase
    .from("whatsapp_links")
    .update({ pending_action: `create_room_wing:${roomName}` })
    .eq("id", link.id);

  // Show wing picker
  const { data: wings } = await supabase
    .from("wings")
    .select("id, slug, custom_name")
    .eq("user_id", link.user_id)
    .order("sort_order");

  if (!wings || wings.length === 0) {
    await supabase
      .from("whatsapp_links")
      .update({ pending_action: null })
      .eq("id", link.id);
    await sendTextMessage(senderPhone, "No wings found. Visit thememorypalace.ai to set up your palace first.");
    return;
  }

  await sendWingPicker(senderPhone, wings, roomName);
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

  if (parts[0] === "lang" && parts[1]) {
    // Language selection from first-contact message
    const locale = parts[1];
    await sendLinkAccountIntro(message.from, locale);
    return;
  }

  if (parts[0] === "newroom") {
    // User tapped "New room" in picker — ask for the name
    const { data: link } = await supabase
      .from("whatsapp_links")
      .select("id")
      .eq("phone_number_id", phoneNumberId)
      .eq("wa_sender_phone", message.from)
      .single();

    if (!link) return;

    await supabase
      .from("whatsapp_links")
      .update({ pending_action: "create_room" })
      .eq("id", link.id);

    await sendTextMessage(message.from, "What should the room be called?");
    return;
  }

  if (parts[0] === "newroom_wing" && parts[1]) {
    // User picked a wing for the new room
    const wingId = parts[1];
    const { data: link } = await supabase
      .from("whatsapp_links")
      .select("id, user_id, pending_action")
      .eq("phone_number_id", phoneNumberId)
      .eq("wa_sender_phone", message.from)
      .single();

    if (!link) return;

    // Extract room name from pending_action
    const pendingAction = link.pending_action as string || "";
    if (!pendingAction.startsWith("create_room_wing:")) {
      await sendTextMessage(message.from, "Something went wrong. Try again with ROOMS.");
      await supabase.from("whatsapp_links").update({ pending_action: null }).eq("id", link.id);
      return;
    }

    const roomName = pendingAction.slice("create_room_wing:".length);
    await createRoomForUser(supabase, message.from, link.id, link.user_id, roomName, wingId);
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
    const { data: roomCheck } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("user_id", link.user_id)
      .single();

    if (!roomCheck) return;

    await supabase
      .from("whatsapp_links")
      .update({ active_room_id: roomId })
      .eq("id", link.id);

    const roomInfo = await fetchRoomWithWing(supabase, roomId);
    await sendRoomSwitchConfirmation(message.from, roomInfo?.wingName || "Palace", roomInfo?.name || "Room");
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

    const rooms = await fetchRoomsWithWings(supabase, capture.user_id as string);

    if (rooms.length > 0) {
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

    const roomInfo = await fetchRoomWithWing(supabase, roomId);
    const roomName = roomInfo?.name || "Room";
    const wingName = roomInfo?.wingName || "Palace";

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
