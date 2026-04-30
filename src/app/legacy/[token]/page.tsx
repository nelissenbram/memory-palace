import { cache } from "react";
import type { Metadata } from "next";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import LegacyView from "./LegacyView";
import { serverT, getServerLocale } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getDeliveryData(token: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "not_configured" as const };
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Find the delivery record
  const { data: delivery, error } = await supabase
    .from("legacy_deliveries")
    .select("*")
    .eq("access_token", token)
    .single();

  if (error || !delivery) {
    return { error: "not_found" as const };
  }

  // Check expiry
  if (new Date(delivery.expires_at) < new Date()) {
    return { error: "expired" as const };
  }

  // Mark as accessed (first visit only)
  if (!delivery.accessed_at) {
    await supabase
      .from("legacy_deliveries")
      .update({ accessed_at: new Date().toISOString() })
      .eq("id", delivery.id);
  }

  // Get the sender profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", delivery.user_id)
    .single();

  // Get the contact info
  const { data: contact } = await supabase
    .from("legacy_contacts")
    .select("contact_name, access_level, wing_access, room_access")
    .eq("id", delivery.contact_id)
    .single();

  // Get the message if one is linked
  let message = null;
  if (delivery.message_id) {
    const { data: msg } = await supabase
      .from("legacy_messages")
      .select("subject, message_body")
      .eq("id", delivery.message_id)
      .single();
    message = msg;
  }

  // Get shared memories based on access level
  const accessLevel = contact?.access_level || "full";
  const wingAccess = (contact?.wing_access as string[]) || [];
  const roomAccess = (contact?.room_access as string[]) || [];

  let wings: Array<{ id: string; name: string; description: string | null }> = [];
  let rooms: Array<{ id: string; name: string; wing_id: string; description: string | null }> = [];
  let memories: Array<{ id: string; title: string; description: string | null; room_id: string; media_url: string | null; media_type: string | null; created_at: string }> = [];

  if (accessLevel === "full") {
    // Full access: all wings, rooms, and memories
    const { data: w } = await supabase
      .from("wings")
      .select("id, name, description")
      .eq("user_id", delivery.user_id)
      .order("sort_order", { ascending: true });
    wings = w || [];

    if (wings.length > 0) {
      const wingIds = wings.map((w) => w.id);
      const { data: r } = await supabase
        .from("rooms")
        .select("id, name, wing_id, description")
        .in("wing_id", wingIds)
        .order("sort_order", { ascending: true });
      rooms = r || [];

      const roomIds = rooms.map((r) => r.id);
      if (roomIds.length > 0) {
        const { data: m } = await supabase
          .from("memories")
          .select("id, title, description, room_id, media_url, media_type, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: true });
        memories = m || [];
      }
    }
  } else if (accessLevel === "wings_only" && wingAccess.length > 0) {
    const { data: w } = await supabase
      .from("wings")
      .select("id, name, description")
      .in("id", wingAccess)
      .order("sort_order", { ascending: true });
    wings = w || [];

    if (wings.length > 0) {
      const wingIds = wings.map((w) => w.id);
      const { data: r } = await supabase
        .from("rooms")
        .select("id, name, wing_id, description")
        .in("wing_id", wingIds)
        .order("sort_order", { ascending: true });
      rooms = r || [];

      const roomIds = rooms.map((r) => r.id);
      if (roomIds.length > 0) {
        const { data: m } = await supabase
          .from("memories")
          .select("id, title, description, room_id, media_url, media_type, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: true });
        memories = m || [];
      }
    }
  } else if (accessLevel === "specific_rooms" && roomAccess.length > 0) {
    const { data: r } = await supabase
      .from("rooms")
      .select("id, name, wing_id, description")
      .in("id", roomAccess)
      .order("sort_order", { ascending: true });
    rooms = r || [];

    // Get parent wings for context
    const wingIds = [...new Set(rooms.map((r) => r.wing_id))];
    if (wingIds.length > 0) {
      const { data: w } = await supabase
        .from("wings")
        .select("id, name, description")
        .in("id", wingIds);
      wings = w || [];
    }

    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length > 0) {
      const { data: m } = await supabase
        .from("memories")
        .select("id, title, description, room_id, media_url, media_type, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });
      memories = m || [];
    }
  }

  const locale = await getServerLocale();
  return {
    error: null,
    senderName: profile?.display_name || serverT("someone", locale),
    contactName: contact?.contact_name || serverT("friend", locale),
    message,
    wings,
    rooms,
    memories,
    expiresAt: delivery.expires_at,
  };
}

const getCachedDeliveryData = cache(getDeliveryData);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getCachedDeliveryData(token);

  if (data.error) {
    return {
      title: "Legacy — The Memory Palace",
      description: "View shared memories from a loved one.",
      other: { referrer: "no-referrer" },
    };
  }

  return {
    title: `Memories from ${data.senderName} — The Memory Palace`,
    description: `${data.senderName} shared their Memory Palace with you.`,
    other: { referrer: "no-referrer" },
  };
}

export default async function LegacyPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getCachedDeliveryData(token);

  return <LegacyView data={data} />;
}
