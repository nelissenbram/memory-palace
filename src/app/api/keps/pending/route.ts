import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/keps/pending — All pending captures across user's keps
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:pending:${user.id}`, 60, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { data, error, count } = await supabase
    .from("kep_captures")
    .select("*, keps!inner(name, icon)", { count: "exact" })
    .eq("user_id", user.id)
    .in("status", ["pending", "processed"])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten kep info into each capture
  const captures = (data || []).map((c: Record<string, unknown>) => {
    const kep = c.keps as Record<string, unknown>;
    return {
      ...c,
      kep_name: kep?.name || "Unknown",
      kep_icon: kep?.icon || "📥",
      keps: undefined,
    };
  });

  return NextResponse.json({ captures, total: count });
}

/**
 * PATCH /api/keps/pending — Batch route/reject captures
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:pending:action:${user.id}`, 30, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  let body: { action: "route" | "reject"; capture_ids: string[]; room_id?: string; wing_id?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.capture_ids || body.capture_ids.length === 0) {
    return NextResponse.json({ error: "capture_ids required" }, { status: 400 });
  }

  if (body.capture_ids.length > 50) {
    return NextResponse.json({ error: "Max 50 captures per batch" }, { status: 400 });
  }

  if (body.action === "route") {
    if (!body.room_id) {
      return NextResponse.json({ error: "room_id required for routing" }, { status: 400 });
    }

    // Create memories for each capture
    const results = [];
    for (const captureId of body.capture_ids) {
      const { data: capture } = await supabase
        .from("kep_captures")
        .select("*")
        .eq("id", captureId)
        .eq("user_id", user.id)
        .in("status", ["pending", "processed"])
        .single();

      if (!capture) continue;

      // Create memory
      const { data: memory } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          room_id: body.room_id,
          wing_id: body.wing_id || null,
          title: (capture.payload_preview as Record<string, unknown>)?.text as string || capture.transcription || `${capture.media_type || "Memory"} capture`,
          type: capture.media_type === "image" ? "photo" : capture.media_type === "video" ? "video" : capture.media_type === "audio" ? "audio" : "note",
          data_url: capture.media_url,
          description: capture.transcription || null,
          source_kep_id: capture.kep_id,
          source_type: "whatsapp",
          source_sender: capture.source_sender,
        })
        .select("id")
        .single();

      if (memory) {
        await supabase
          .from("kep_captures")
          .update({ status: "routed", memory_id: memory.id })
          .eq("id", captureId);
        results.push({ id: captureId, status: "routed" });
      }
    }

    return NextResponse.json({ results });
  } else if (body.action === "reject") {
    await supabase
      .from("kep_captures")
      .update({ status: "rejected", rejection_reason: body.reason || null })
      .in("id", body.capture_ids)
      .eq("user_id", user.id);

    return NextResponse.json({ results: body.capture_ids.map((id) => ({ id, status: "rejected" })) });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
