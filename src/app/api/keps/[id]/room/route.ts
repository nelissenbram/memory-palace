import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/keps/[id]/room — Get the linked room (virtual or palace) for a kep.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: kepId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find room linked to this kep via whatsapp_links or source_kep_id
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, is_virtual, virtual_title, wing_id")
    .eq("source_kep_id", kepId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!room) return NextResponse.json(null, { status: 404 });

  // Fetch memories in this room
  const { data: memories } = await supabase
    .from("memories")
    .select("id, title, type, file_url, created_at")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Map wing_id UUID to slug for frontend
  let wingSlug: string | null = null;
  if (room.wing_id) {
    const { data: wing } = await supabase
      .from("wings")
      .select("slug")
      .eq("id", room.wing_id)
      .single();
    wingSlug = wing?.slug || null;
  }

  return NextResponse.json({
    id: room.id,
    name: room.virtual_title || room.name,
    is_virtual: room.is_virtual,
    wing_id: wingSlug,
    memories: memories || [],
  });
}
