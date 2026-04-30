"use server";

import { createClient } from "@/lib/supabase/server";
import { serverError } from "@/lib/i18n/server-errors";

/**
 * Check if the invite code is valid and whether a room already exists.
 */
export async function checkKepInvite(inviteCode: string): Promise<{
  valid: boolean;
  existingRoomId: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { const t = await serverError(); return { valid: false, existingRoomId: null, error: t("notAuthenticated") }; }

    const { data: link } = await supabase
      .from("whatsapp_links")
      .select("id, kep_id, target_room_id")
      .eq("invite_code", inviteCode)
      .single();

    if (!link) { const t = await serverError(); return { valid: false, existingRoomId: null, error: t("invalidInviteCode") }; }

    if (link.target_room_id) {
      return { valid: true, existingRoomId: link.target_room_id };
    }

    return { valid: true, existingRoomId: null };
  } catch (e) {
    console.error("[Kep checkInvite]", e);
    const t = await serverError(); return { valid: false, existingRoomId: null, error: t("somethingWentWrong") };
  }
}

/**
 * Create a virtual room (no palace wing) linked to a Kep invite code.
 */
export async function createVirtualRoom(
  inviteCode: string,
  roomName?: string,
): Promise<{ roomId: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { const t = await serverError(); return { roomId: null, error: t("notAuthenticated") }; }

    // Get link
    const { data: link, error: linkErr } = await supabase
      .from("whatsapp_links")
      .select("id, kep_id, target_room_id")
      .eq("invite_code", inviteCode)
      .single();

    if (linkErr || !link) { const t = await serverError(); return { roomId: null, error: t("invalidInviteCode") }; }

    if (link.target_room_id) return { roomId: link.target_room_id };

    // Get kep
    const { data: kep } = await supabase
      .from("keps")
      .select("id, name, user_id")
      .eq("id", link.kep_id)
      .single();

    if (!kep) { const t = await serverError(); return { roomId: null, error: t("kepNotFound") }; }

    const name = roomName?.trim() || kep.name || "Kep Room";
    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .insert({
        user_id: kep.user_id,
        name,
        wing_id: null,
        is_virtual: true,
        virtual_title: name,
        source_kep_id: kep.id,
      })
      .select("id")
      .single();

    if (roomErr || !room) {
      console.error("[Kep createVirtualRoom] room insert:", roomErr?.message);
      { const t = await serverError(); return { roomId: null, error: roomErr?.message || t("failedToCreateRoom") }; }
    }

    await supabase.from("whatsapp_links").update({ target_room_id: room.id }).eq("id", link.id);
    return { roomId: room.id };
  } catch (e) {
    console.error("[Kep createVirtualRoom]", e);
    { const t = await serverError(); return { roomId: null, error: t("somethingWentWrong") }; }
  }
}

/**
 * Create a palace room (attached to a wing) linked to a Kep invite code.
 */
export async function createPalaceRoom(
  inviteCode: string,
  wingSlug: string,
  roomName: string,
): Promise<{ roomId: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { const t = await serverError(); return { roomId: null, error: t("notAuthenticated") }; }

    // Get link
    const { data: link, error: linkErr } = await supabase
      .from("whatsapp_links")
      .select("id, kep_id, palace_room_created, target_room_id")
      .eq("invite_code", inviteCode)
      .single();

    if (linkErr || !link) { const t = await serverError(); return { roomId: null, error: t("invalidInviteCode") }; }

    // If room already exists, return it
    if (link.target_room_id) return { roomId: link.target_room_id };

    // Get kep
    const { data: kep } = await supabase
      .from("keps")
      .select("id, user_id")
      .eq("id", link.kep_id)
      .single();

    if (!kep) { const t = await serverError(); return { roomId: null, error: t("kepNotFound") }; }

    // Only the kep owner can create a palace room
    if (kep.user_id !== user.id) {
      { const t = await serverError(); return { roomId: null, error: t("onlyPalaceOwnerCanCreateRoom") }; }
    }

    if (link.palace_room_created) {
      { const t = await serverError(); return { roomId: null, error: t("palaceRoomAlreadyCreated") }; }
    }

    // Find wing by slug
    const { data: wing, error: wingErr } = await supabase
      .from("wings")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", wingSlug)
      .single();

    if (wingErr || !wing) {
      console.error("[Kep createPalaceRoom] wing lookup:", wingSlug, wingErr?.message);
      { const t = await serverError(); return { roomId: null, error: t("wingNotFound") }; }
    }

    // Create room
    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .insert({
        user_id: user.id,
        wing_id: wing.id,
        name: roomName.trim(),
        source_kep_id: kep.id,
      })
      .select("id")
      .single();

    if (roomErr || !room) {
      console.error("[Kep createPalaceRoom] room insert:", roomErr?.message);
      { const t = await serverError(); return { roomId: null, error: roomErr?.message || t("failedToCreateRoom") }; }
    }

    // Link it
    await supabase
      .from("whatsapp_links")
      .update({ palace_room_created: true, target_room_id: room.id })
      .eq("id", link.id);

    return { roomId: room.id };
  } catch (e) {
    console.error("[Kep createPalaceRoom]", e);
    { const t = await serverError(); return { roomId: null, error: t("somethingWentWrong") }; }
  }
}

/**
 * Allocate a virtual room to a wing (convert virtual → palace room).
 */
export async function allocateVirtualRoom(
  roomId: string,
  wingSlug: string,
  roomName: string,
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, user_id, is_virtual")
      .eq("id", roomId)
      .single();

    const t = await serverError();
    if (!room) return { error: t("roomNotFound") };
    if (room.user_id !== user.id) return { error: t("notYourRoom") };
    if (!room.is_virtual) return { error: t("roomAlreadyAllocated") };

    const { data: wing } = await supabase
      .from("wings")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", wingSlug)
      .single();

    if (!wing) return { error: t("wingNotFound") };

    await supabase
      .from("rooms")
      .update({
        wing_id: wing.id,
        name: roomName.trim(),
        is_virtual: false,
        allocated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    return {};
  } catch (e) {
    console.error("[Kep allocateVirtualRoom]", e);
    { const t2 = await serverError(); return { error: t2("somethingWentWrong") }; }
  }
}
