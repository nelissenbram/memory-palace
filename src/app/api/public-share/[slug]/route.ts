import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

// Public endpoint — no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ip = getClientIp(request);
  const rl = await rateLimit(`public-share:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    .select("id, room_id, wing_id, slug, created_by, is_active, expires_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (shareError || !share) {
    return NextResponse.json({ error: "Share not found or inactive" }, { status: 404 });
  }

  // Check expiry for time-limited shares
  if (share.expires_at) {
    const expiresAt = new Date(share.expires_at);
    if (expiresAt < new Date()) {
      // Auto-deactivate
      await supabase.from("public_shares").update({ is_active: false }).eq("id", share.id);
      return NextResponse.json({ error: "This share has expired" }, { status: 410 });
    }
  }

  // Wing-level share (no room_id): return every room's memories in the wing as
  // one flattened gallery under the wing name, so a shared wing link works the
  // same as a shared room link instead of dead-ending on a null room lookup.
  if (!share.room_id) {
    if (!share.wing_id) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }
    const [wingResult, roomsResult, ownerResult] = await Promise.all([
      supabase.from("wings").select("id, slug, name").eq("id", share.wing_id).single(),
      supabase.from("rooms").select("id").eq("wing_id", share.wing_id),
      supabase.from("public_profiles").select("display_name").eq("id", share.created_by).single(),
    ]);
    const wing = wingResult.data;
    if (!wing) {
      return NextResponse.json({ error: "Wing not found" }, { status: 404 });
    }
    const roomIds = (roomsResult.data || []).map((r) => r.id);
    const { data: wingMemories } = roomIds.length
      ? await supabase
          .from("memories")
          .select("id, title, description, type, hue, saturation, lightness, file_url, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: true })
      : { data: [] };
    return NextResponse.json({
      room: null,
      wing: { slug: wing.slug, name: wing.name },
      memories: (wingMemories || []).map((m) => ({
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
      owner: { displayName: ownerResult.data?.display_name || "Someone" },
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
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
      .from("public_profiles")
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
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
