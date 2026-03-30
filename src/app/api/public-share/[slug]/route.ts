import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Public endpoint — no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Use service role key if available for bypassing RLS, otherwise anon key
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  // Find the public share by slug
  const { data: share, error: shareError } = await supabase
    .from("public_shares")
    .select("id, room_id, wing_id, slug, created_by, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (shareError || !share) {
    return NextResponse.json({ error: "Share not found or inactive" }, { status: 404 });
  }

  // Fetch room info
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, wing_id")
    .eq("id", share.room_id)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Fetch wing, memories, and owner in parallel (all independent after room fetch)
  const [wingResult, memoriesResult, ownerResult] = await Promise.all([
    room.wing_id
      ? supabase
          .from("wings")
          .select("id, slug, name")
          .eq("id", room.wing_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("memories")
      .select("id, title, description, type, hue, saturation, lightness, file_url, created_at")
      .eq("room_id", share.room_id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", share.created_by)
      .single(),
  ]);

  const wing = wingResult.data;
  const memories = memoriesResult.data;
  const owner = ownerResult.data;

  return NextResponse.json({
    room: {
      name: room.name,
      localId: room.name, // local room ID is stored as 'name'
    },
    wing: wing ? {
      slug: wing.slug,
      name: wing.name,
    } : null,
    memories: (memories || []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      hue: m.hue,
      saturation: m.saturation,
      lightness: m.lightness,
      fileUrl: m.file_url,
      createdAt: m.created_at,
    })),
    owner: {
      displayName: owner?.display_name || "Someone",
    },
  });
}
