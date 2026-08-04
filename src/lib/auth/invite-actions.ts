"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { serverT, getServerLocale } from "@/lib/i18n/server";
import { serverError } from "@/lib/i18n/server-errors";
import {
  loadOwnerNameMaps,
  loadOwnerNameMapsBulk,
  resolveRoomDisplay,
  resolveWingDisplayName,
  type OwnerNameMaps,
} from "@/lib/auth/share-display-names";

const EMPTY_MAPS: OwnerNameMaps = { customRooms: {}, customWings: {}, extraWings: [] };

// ── Helper: merge two share result sets by id (dedupe) and sort newest-first ──
// Used to replace injectable .or(shared_with_email/shared_with_id) filters with
// two safe parameterized .eq() queries.
function mergeById<T extends { id: string }>(
  a: T[] | null | undefined,
  b: T[] | null | undefined,
  sortKey: "created_at" | "accepted_at" = "created_at"
): T[] {
  const map = new Map<string, T>();
  for (const row of a || []) map.set(row.id, row);
  for (const row of b || []) if (!map.has(row.id)) map.set(row.id, row);
  return Array.from(map.values()).sort((x, y) => {
    const xk = ((x as Record<string, unknown>)[sortKey] as string | null) || "";
    const yk = ((y as Record<string, unknown>)[sortKey] as string | null) || "";
    return xk < yk ? 1 : xk > yk ? -1 : 0;
  });
}

// ── Helper: resolve wing name/icon through the OWNER's tailored maps ──
// (mp_custom_wings/mp_extra_wings in the owner's local_settings, then WINGS
// defaults — see share-display-names.ts.)
function resolveWingDisplay(slug: string, customName?: string | null, maps: OwnerNameMaps = EMPTY_MAPS) {
  return resolveWingDisplayName(maps, slug, customName);
}

// ── Helper: get wing slug + tailored name/icon from a room's wing_id ──
async function getWingDisplayForRoom(
  client: ReturnType<typeof createAdminClient>,
  wingId: string,
  maps: OwnerNameMaps = EMPTY_MAPS
) {
  const { data: wing } = await client
    .from("wings")
    .select("slug, custom_name")
    .eq("id", wingId)
    .single();
  if (!wing) return { name: "", icon: "", slug: "" };
  return { ...resolveWingDisplayName(maps, wing.slug, wing.custom_name), slug: wing.slug };
}

// ── Public: get invite details for a ROOM share landing page (no auth required) ──
export async function getInviteDetails(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("notConfigured") }; }
  }
  const admin = createAdminClient();
  const t = await serverError();

  const { data: share, error } = await admin
    .from("room_shares")
    .select("id, room_id, owner_id, shared_with_email, permission, status, invite_message, created_at")
    .eq("id", shareId)
    .single();

  if (error || !share) return { error: t("invitationNotFound") };

  // Check status
  if (share.status === "declined") return { error: t("invitationDeclined") };
  if (share.status === "expired") return { error: t("invitationExpired") };

  // Get inviter profile, room details, and the OWNER's tailored-name maps
  // (rooms.name in the DB is the local room id like "ro1"; the tailored name
  // lives in the owner's profiles.local_settings — admin client is required
  // because the visitor can't read another user's profiles row under RLS).
  const [{ data: inviter }, { data: room }, ownerMaps] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", share.owner_id)
      .single(),
    admin
      .from("rooms")
      .select("id, name, icon, wing_id")
      .eq("id", share.room_id)
      .single(),
    loadOwnerNameMaps(admin, share.owner_id),
  ]);

  // Get wing info
  let wingName = "";
  let wingIcon = "";
  let wingSlug = "";
  if (room?.wing_id) {
    const wingDisplay = await getWingDisplayForRoom(admin, room.wing_id, ownerMaps);
    wingName = wingDisplay.name;
    wingIcon = wingDisplay.icon;
    wingSlug = wingDisplay.slug;
  }

  // Get memory count in the room
  const { count } = await admin
    .from("memories")
    .select("id", { count: "exact", head: true })
    .eq("room_id", share.room_id);

  const locale = await getServerLocale();
  const roomDisplay = room ? resolveRoomDisplay(ownerMaps, room.name, wingSlug) : { name: null, icon: "" };
  return {
    invite: {
      id: share.id,
      permission: share.permission,
      status: share.status || "pending",
      message: share.invite_message,
      createdAt: share.created_at,
      recipientEmail: share.shared_with_email,
    },
    inviter: {
      name: inviter?.display_name || serverT("someone", locale),
      avatarUrl: inviter?.avatar_url || null,
    },
    room: {
      // Tailored (owner-renamed) name; never the raw local id ("ro1").
      name: roomDisplay.name || serverT("aMemoryRoom", locale),
      // Raw local id ("ro1") — lets the client resolve the crafted SVG icon.
      localId: room?.name || "",
      icon: roomDisplay.icon || room?.icon || "",
    },
    wing: {
      slug: wingSlug,
      name: wingName,
      icon: wingIcon,
    },
    memoryCount: count || 0,
  };
}

// ── Public: get invite details for a WING share landing page (no auth required) ──
export async function getWingInviteDetails(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("notConfigured") }; }
  }
  const admin = createAdminClient();
  const t = await serverError();

  const { data: share, error } = await admin
    .from("wing_shares")
    .select("id, wing_id, owner_id, shared_with_email, permission, status, invite_message, can_add, can_edit, can_delete, created_at")
    .eq("id", shareId)
    .single();

  if (error || !share) return { error: t("invitationNotFound") };

  if (share.status === "declined") return { error: t("invitationDeclined") };
  if (share.status === "expired") return { error: t("invitationExpired") };

  // Get inviter profile, wing row (join via slug + owner_id), and the OWNER's
  // tailored-name maps (wing renames live in the owner's local_settings).
  const [{ data: inviter }, { data: wing }, ownerMaps] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", share.owner_id)
      .single(),
    admin
      .from("wings")
      .select("id, slug, custom_name, accent_color")
      .eq("slug", share.wing_id)
      .eq("user_id", share.owner_id)
      .single(),
    loadOwnerNameMaps(admin, share.owner_id),
  ]);

  const wingDisplay = resolveWingDisplay(share.wing_id, wing?.custom_name, ownerMaps);

  // Get room count for this wing
  let roomCount = 0;
  let memoryCount = 0;
  if (wing) {
    const { count: rCount } = await admin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("wing_id", wing.id)
      .eq("user_id", share.owner_id);
    roomCount = rCount || 0;

    // Get total memories across all rooms in this wing
    const { data: rooms } = await admin
      .from("rooms")
      .select("id")
      .eq("wing_id", wing.id)
      .eq("user_id", share.owner_id);

    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map((r: { id: string }) => r.id);
      const { count: mCount } = await admin
        .from("memories")
        .select("id", { count: "exact", head: true })
        .in("room_id", roomIds);
      memoryCount = mCount || 0;
    }
  }

  const locale2 = await getServerLocale();
  return {
    invite: {
      id: share.id,
      permission: share.permission,
      status: share.status || "pending",
      message: share.invite_message,
      createdAt: share.created_at,
      recipientEmail: share.shared_with_email,
      canAdd: share.can_add,
      canEdit: share.can_edit,
      canDelete: share.can_delete,
    },
    inviter: {
      name: inviter?.display_name || serverT("someone", locale2),
      avatarUrl: inviter?.avatar_url || null,
    },
    wing: {
      slug: share.wing_id,
      name: wingDisplay.name,
      icon: wingDisplay.icon,
      accentColor: wing?.accent_color || null,
    },
    roomCount,
    memoryCount,
  };
}

// ── Accept a ROOM invite (requires auth) ──
export async function acceptInvite(shareId: string, placedInWingId?: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("notConfigured") }; }
  }
  const supabase = await createClient();
  const t = await serverError();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const admin = createAdminClient();

  // Fetch the share
  const { data: share } = await admin
    .from("room_shares")
    .select("id, shared_with_email, status, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: t("invitationNotFound") };
  if (share.status === "accepted") return { error: t("alreadyAccepted"), alreadyAccepted: true };
  if (share.status === "declined") return { error: t("invitationDeclined") };
  if (share.status === "expired") return { error: t("invitationExpired") };

  // Verify the email matches (or shared_with_id was already linked)
  const userEmail = user.email?.toLowerCase();
  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: t("invitationWrongEmail") };
  }

  // Accept (use admin client to bypass RLS update policy)
  const updatePayload: Record<string, unknown> = {
    accepted: true,
    status: "accepted",
    shared_with_id: user.id,
    accepted_at: new Date().toISOString(),
  };
  if (placedInWingId) {
    updatePayload.placed_in_wing_id = placedInWingId;
  }

  const { error } = await admin
    .from("room_shares")
    .update(updatePayload)
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Accept a WING invite (requires auth) ──
export async function acceptWingInvite(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("notConfigured") }; }
  }
  const supabase = await createClient();
  const t = await serverError();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const admin = createAdminClient();

  // Fetch the share
  const { data: share } = await admin
    .from("wing_shares")
    .select("id, shared_with_email, status, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: t("invitationNotFound") };
  if (share.status === "accepted") return { error: t("alreadyAccepted"), alreadyAccepted: true };
  if (share.status === "declined") return { error: t("invitationDeclined") };
  if (share.status === "expired") return { error: t("invitationExpired") };

  // Verify the email matches or shared_with_id was already linked
  const userEmail = user.email?.toLowerCase();
  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: t("invitationWrongEmail") };
  }

  const { error } = await admin
    .from("wing_shares")
    .update({
      status: "accepted",
      shared_with_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Decline an invite (requires auth) ──
export async function declineInvite(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("notConfigured") }; }
  }
  const supabase = await createClient();
  const t = await serverError();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const admin = createAdminClient();

  // Verify the invite belongs to this user before declining
  const userEmail = user.email?.toLowerCase();
  const { data: share } = await admin
    .from("room_shares")
    .select("id, shared_with_email, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: t("invitationNotFound") };

  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: t("notAuthorizedDecline") };
  }

  const { error } = await admin
    .from("room_shares")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Decline a WING invite (requires auth) ──
export async function declineWingInvite(shareId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("notConfigured") }; }
  }
  const supabase = await createClient();
  const t = await serverError();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const admin = createAdminClient();

  // Verify the invite belongs to this user before declining
  const userEmail = user.email?.toLowerCase();
  const { data: share } = await admin
    .from("wing_shares")
    .select("id, shared_with_email, shared_with_id")
    .eq("id", shareId)
    .single();

  if (!share) return { error: t("invitationNotFound") };

  if (
    share.shared_with_email?.toLowerCase() !== userEmail &&
    share.shared_with_id !== user.id
  ) {
    return { error: t("notAuthorizedDecline") };
  }

  const { error } = await admin
    .from("wing_shares")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Get pending invites for the current user (both wing and room) ──
export async function getPendingInvites() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { invites: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { invites: [] };

  const admin = createAdminClient();
  const userEmail = user.email.toLowerCase();

  // Fetch pending room shares and wing shares in parallel.
  // NOTE: we run separate .eq() queries per match column and merge in JS
  // instead of building a .or() string with the user's email — interpolating
  // an email into a PostgREST filter allows injection (quotes/commas/parens
  // are valid in the local part) under the RLS-bypassing admin client.
  const [
    { data: roomByEmail },
    { data: roomById },
    { data: wingByEmail },
    { data: wingById },
  ] = await Promise.all([
    admin
      .from("room_shares")
      .select("id, room_id, owner_id, permission, status, invite_message, created_at")
      .eq("shared_with_email", userEmail)
      .eq("status", "pending"),
    admin
      .from("room_shares")
      .select("id, room_id, owner_id, permission, status, invite_message, created_at")
      .eq("shared_with_id", user.id)
      .eq("status", "pending"),
    admin
      .from("wing_shares")
      .select("id, wing_id, owner_id, permission, status, invite_message, can_add, can_edit, can_delete, created_at")
      .eq("shared_with_email", userEmail)
      .eq("status", "pending"),
    admin
      .from("wing_shares")
      .select("id, wing_id, owner_id, permission, status, invite_message, can_add, can_edit, can_delete, created_at")
      .eq("shared_with_id", user.id)
      .eq("status", "pending"),
  ]);

  const roomShares = mergeById(roomByEmail, roomById);
  const wingShares = mergeById(wingByEmail, wingById);

  // Collect all owner IDs for profile lookup
  const ownerIds = new Set<string>();
  (roomShares || []).forEach((s) => ownerIds.add(s.owner_id));
  (wingShares || []).forEach((s) => ownerIds.add(s.owner_id));

  const loc = await getServerLocale();
  const nameMap: Record<string, { name: string; avatar: string | null }> = {};
  // Each OWNER's tailored wing/room names (their local_settings, admin read).
  const ownerMapsById = await loadOwnerNameMapsBulk(admin, Array.from(ownerIds));
  const mapsFor = (ownerId: string) => ownerMapsById[ownerId] || EMPTY_MAPS;
  if (ownerIds.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(ownerIds));
    (profiles || []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
      nameMap[p.id] = {
        name: p.display_name || serverT("someone", loc),
        avatar: p.avatar_url || null,
      };
    });
  }

  // Enrich room invites
  const enrichedRooms = await Promise.all(
    (roomShares || []).map(async (share) => {
      const { data: room } = await admin
        .from("rooms")
        .select("name, icon, wing_id")
        .eq("id", share.room_id)
        .single();

      let wingName = "";
      let wingIcon = "";
      let wingSlug = "";
      if (room?.wing_id) {
        const wingDisplay = await getWingDisplayForRoom(admin, room.wing_id, mapsFor(share.owner_id));
        wingName = wingDisplay.name;
        wingIcon = wingDisplay.icon;
        wingSlug = wingDisplay.slug;
      }

      const inviter = nameMap[share.owner_id] || { name: serverT("someone", loc), avatar: null };
      // Tailored room name — rooms.name holds the local id ("ro1"); never show it raw.
      const rd = room ? resolveRoomDisplay(mapsFor(share.owner_id), room.name, wingSlug) : { name: null, icon: "" };

      return {
        id: share.id,
        type: "room" as const,
        permission: share.permission,
        message: share.invite_message,
        createdAt: share.created_at,
        inviterName: inviter.name,
        inviterAvatar: inviter.avatar,
        roomName: rd.name || serverT("aRoom", loc),
        roomLocalId: room?.name || "",
        roomIcon: rd.icon || room?.icon || "",
        wingId: wingSlug,
        wingName,
        wingIcon,
      };
    })
  );

  // Enrich wing invites
  const enrichedWings = (wingShares || []).map((share) => {
    const wingDisplay = resolveWingDisplay(share.wing_id, null, mapsFor(share.owner_id));
    const inviter = nameMap[share.owner_id] || { name: serverT("someone", loc), avatar: null };

    return {
      id: share.id,
      type: "wing" as const,
      permission: share.permission,
      message: share.invite_message,
      createdAt: share.created_at,
      inviterName: inviter.name,
      inviterAvatar: inviter.avatar,
      wingId: share.wing_id,
      wingName: wingDisplay.name,
      wingIcon: wingDisplay.icon,
      canAdd: share.can_add,
      canEdit: share.can_edit,
      canDelete: share.can_delete,
    };
  });

  return { invites: [...enrichedWings, ...enrichedRooms] };
}

// ── Get accepted shares for "Shared with me" panel ──
export async function getAcceptedShares() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { shares: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { shares: [] };

  const admin = createAdminClient();
  const userEmail = user.email?.toLowerCase();

  // Fetch both room and wing accepted shares in parallel.
  // room_shares can be matched by shared_with_id OR shared_with_email — run
  // separate parameterized .eq() queries and merge in JS rather than
  // interpolating the email into a .or() filter (injection under admin client).
  const roomSelect = "id, room_id, owner_id, permission, status, accepted_at, can_add, can_edit, can_delete, placed_in_wing_id";
  const [
    { data: roomById },
    { data: roomByEmail },
    { data: wingShares },
  ] = await Promise.all([
    admin
      .from("room_shares")
      .select(roomSelect)
      .eq("shared_with_id", user.id)
      .eq("status", "accepted"),
    userEmail
      ? admin
          .from("room_shares")
          .select(roomSelect)
          .eq("shared_with_email", userEmail)
          .eq("status", "accepted")
      : Promise.resolve({ data: [] as { id: string }[] }),
    admin
      .from("wing_shares")
      .select("id, wing_id, owner_id, permission, status, accepted_at, can_add, can_edit, can_delete")
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false }),
  ]);

  const roomShares = mergeById(roomById, (roomByEmail ?? []) as typeof roomById, "accepted_at");

  // Collect all owner IDs
  const ownerIds = new Set<string>();
  (roomShares || []).forEach((s) => ownerIds.add(s.owner_id));
  (wingShares || []).forEach((s) => ownerIds.add(s.owner_id));

  const loc2 = await getServerLocale();
  const nameMap: Record<string, { name: string; avatar: string | null }> = {};
  // Each OWNER's tailored wing/room names (their local_settings, admin read).
  const ownerMapsById = await loadOwnerNameMapsBulk(admin, Array.from(ownerIds));
  const mapsFor = (ownerId: string) => ownerMapsById[ownerId] || EMPTY_MAPS;
  if (ownerIds.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(ownerIds));
    (profiles || []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
      nameMap[p.id] = {
        name: p.display_name || serverT("someone", loc2),
        avatar: p.avatar_url || null,
      };
    });
  }

  // Enrich room shares
  const enrichedRooms = await Promise.all(
    (roomShares || []).map(async (share) => {
      const { data: room } = await admin
        .from("rooms")
        .select("name, icon, wing_id")
        .eq("id", share.room_id)
        .single();

      let wingName = "";
      let wingIcon = "";
      let wingSlug = "";
      if (room?.wing_id) {
        const wingDisplay = await getWingDisplayForRoom(admin, room.wing_id, mapsFor(share.owner_id));
        wingName = wingDisplay.name;
        wingIcon = wingDisplay.icon;
        wingSlug = wingDisplay.slug;
      }

      const { count } = await admin
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("room_id", share.room_id);

      const owner = nameMap[share.owner_id] || { name: serverT("someone", loc2), avatar: null };
      // Tailored room name — rooms.name holds the local id ("ro1"); never show it raw.
      const rd = room ? resolveRoomDisplay(mapsFor(share.owner_id), room.name, wingSlug) : { name: null, icon: "" };

      return {
        id: share.id,
        type: "room" as const,
        roomId: share.room_id,
        permission: share.permission,
        acceptedAt: share.accepted_at,
        ownerName: owner.name,
        ownerAvatar: owner.avatar,
        roomName: rd.name || serverT("aRoom", loc2),
        roomLocalId: room?.name || "",
        roomIcon: rd.icon || room?.icon || "",
        wingId: wingSlug,
        wingName,
        wingIcon,
        memoryCount: count || 0,
        canAdd: share.can_add,
        canEdit: share.can_edit,
        canDelete: share.can_delete,
        placedInWingId: share.placed_in_wing_id,
      };
    })
  );

  // Enrich wing shares (fetch rooms for each shared wing)
  const enrichedWings = await Promise.all(
    (wingShares || []).map(async (share) => {
      const wingDisplay = resolveWingDisplay(share.wing_id, null, mapsFor(share.owner_id));
      const owner = nameMap[share.owner_id] || { name: serverT("someone", loc2), avatar: null };

      // Fetch the owner's wing UUID from slug + owner_id
      const { data: wing } = await admin
        .from("wings")
        .select("id")
        .eq("slug", share.wing_id)
        .eq("user_id", share.owner_id)
        .single();

      // Fetch rooms in the wing
      let rooms: { id: string; name: string; localId: string; icon: string; memoryCount: number }[] = [];
      if (wing) {
        const { data: wingRooms } = await admin
          .from("rooms")
          .select("id, name, icon")
          .eq("wing_id", wing.id)
          .eq("user_id", share.owner_id)
          .order("sort_order", { ascending: true });

        if (wingRooms && wingRooms.length > 0) {
          // Fetch memory counts for each room
          const roomIds = wingRooms.map((r: { id: string }) => r.id);
          const { data: memCounts } = await admin
            .from("memories")
            .select("room_id")
            .in("room_id", roomIds);

          const countMap: Record<string, number> = {};
          (memCounts || []).forEach((m: { room_id: string }) => {
            countMap[m.room_id] = (countMap[m.room_id] || 0) + 1;
          });

          rooms = wingRooms.map((r: { id: string; name: string; icon: string }) => {
            // Tailored room name via the owner's maps — r.name is the local id.
            const rd = resolveRoomDisplay(mapsFor(share.owner_id), r.name, share.wing_id);
            return {
              id: r.id,
              name: rd.name || serverT("aRoom", loc2),
              localId: r.name,
              icon: rd.icon || r.icon || "",
              memoryCount: countMap[r.id] || 0,
            };
          });
        }
      }

      const totalMemories = rooms.reduce((n, r) => n + r.memoryCount, 0);

      return {
        id: share.id,
        type: "wing" as const,
        wingId: share.wing_id,
        permission: share.permission,
        acceptedAt: share.accepted_at,
        ownerName: owner.name,
        ownerAvatar: owner.avatar,
        wingName: wingDisplay.name,
        wingIcon: wingDisplay.icon,
        canAdd: share.can_add,
        canEdit: share.can_edit,
        canDelete: share.can_delete,
        rooms,
        memoryCount: totalMemories,
      };
    })
  );

  return { shares: [...enrichedWings, ...enrichedRooms] };
}

// ── Auto-match invites after registration (called from auth callback) ──
export async function autoMatchInvites(userId: string, email: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  // Match both room_shares and wing_shares in parallel
  await Promise.all([
    admin
      .from("room_shares")
      .update({ shared_with_id: userId })
      .eq("shared_with_email", normalizedEmail)
      .is("shared_with_id", null),
    admin
      .from("wing_shares")
      .update({ shared_with_id: userId })
      .eq("shared_with_email", normalizedEmail)
      .is("shared_with_id", null),
  ]);
}
