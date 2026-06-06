import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/keps/[id]/active-room
 * Set or clear the active room for a Kep's WhatsApp link.
 * Body: { roomId: string | null }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: kepId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const roomId: string | null = body.roomId ?? null;

  // Verify user owns the kep
  const { data: kep } = await supabase
    .from("keps")
    .select("id, user_id")
    .eq("id", kepId)
    .eq("user_id", user.id)
    .single();

  if (!kep) {
    return NextResponse.json({ error: "Kep not found" }, { status: 404 });
  }

  // Verify user owns the room (if roomId provided)
  let activeRoom: { id: string; name: string; wingName: string } | null = null;
  if (roomId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id, name, wing_id, wings(custom_name, name, slug)")
      .eq("id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const wing = room.wings as unknown as Record<string, unknown> | null;
    activeRoom = {
      id: room.id,
      name: room.name,
      wingName: (wing?.custom_name || wing?.name || wing?.slug || "Palace") as string,
    };
  }

  // Update the whatsapp_link
  const { error: updateError } = await supabase
    .from("whatsapp_links")
    .update({ active_room_id: roomId })
    .eq("kep_id", kepId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, activeRoom });
}
