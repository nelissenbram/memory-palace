import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/keps/stats?kep_id=xxx — Statistics for a kep
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:stats:${user.id}`, 60, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const url = new URL(request.url);
  const kepId = url.searchParams.get("kep_id");

  if (!kepId) {
    return NextResponse.json({ error: "kep_id required" }, { status: 400 });
  }

  // Verify ownership
  const { data: kep } = await supabase
    .from("keps")
    .select("id")
    .eq("id", kepId)
    .eq("user_id", user.id)
    .single();

  if (!kep) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Count captures by status
  const { data: captures } = await supabase
    .from("kep_captures")
    .select("status, created_at")
    .eq("kep_id", kepId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const stats = {
    total_captures: captures?.length || 0,
    pending_captures: captures?.filter((c) => c.status === "pending" || c.status === "processed").length || 0,
    routed_captures: captures?.filter((c) => c.status === "routed").length || 0,
    rejected_captures: captures?.filter((c) => c.status === "rejected").length || 0,
    failed_captures: captures?.filter((c) => c.status === "failed").length || 0,
    last_capture_at: captures && captures.length > 0
      ? captures.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
      : null,
    captures_today: captures?.filter((c) => c.created_at >= todayStart).length || 0,
    captures_this_week: captures?.filter((c) => c.created_at >= weekStart).length || 0,
  };

  return NextResponse.json(stats);
}
