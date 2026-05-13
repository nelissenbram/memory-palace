import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/keps/rooms?wing=<wingSlug>
 * Returns the current user's rooms grouped by wing.
 * If ?wing= is provided, only that wing's rooms are returned.
 * Response: { wings: [{ slug, name, rooms: [{ id, name, memories_count }] }] }
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wingFilter = req.nextUrl.searchParams.get("wing");

  // Query wings for current user
  let wingsQuery = supabase
    .from("wings")
    .select("id, slug, name")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (wingFilter) {
    wingsQuery = wingsQuery.eq("slug", wingFilter);
  }

  const { data: wings, error: wingsErr } = await wingsQuery;
  if (wingsErr) return NextResponse.json({ error: wingsErr.message }, { status: 500 });
  if (!wings || wings.length === 0) return NextResponse.json({ wings: [] });

  // For each wing, query rooms with a count of memories
  const result: {
    slug: string;
    name: string;
    rooms: { id: string; name: string; memories_count: number }[];
  }[] = [];

  for (const wing of wings) {
    const { data: rooms, error: roomsErr } = await supabase
      .from("rooms")
      .select("id, name, memories(count)")
      .eq("wing_id", wing.id)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (roomsErr) {
      console.error("[keps/rooms] rooms query error:", roomsErr.message);
      continue;
    }

    if (!rooms || rooms.length === 0) continue;

    const mappedRooms = rooms.map((r: Record<string, unknown>) => {
      // Supabase returns count as [{ count: N }] when using select("memories(count)")
      const memoriesData = r.memories as { count: number }[] | null;
      const count = Array.isArray(memoriesData) && memoriesData.length > 0
        ? memoriesData[0].count
        : 0;
      return {
        id: r.id as string,
        name: r.name as string,
        memories_count: count,
      };
    });

    result.push({
      slug: wing.slug,
      name: wing.name,
      rooms: mappedRooms,
    });
  }

  return NextResponse.json({ wings: result });
}
