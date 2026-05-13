import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/kep/view/[code] — Public endpoint to view a virtual room by invite code.
 * No auth required. Uses service role to bypass RLS.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createAdminClient();

  // Look up invite code
  const { data: link, error: linkErr } = await supabase
    .from("whatsapp_links")
    .select("id, target_room_id")
    .eq("invite_code", code)
    .single();

  if (linkErr || !link || !link.target_room_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get room
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, name, virtual_title, is_virtual, expires_at, grounded_at")
    .eq("id", link.target_room_id)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow viewing virtual rooms (not palace rooms)
  if (!room.is_virtual && !room.grounded_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get memories
  const { data: memories } = await supabase
    .from("memories")
    .select("id, title, type, file_url, created_at")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    name: room.virtual_title || room.name,
    expires_at: room.expires_at,
    grounded_at: room.grounded_at,
    memories: memories || [],
  });
}
