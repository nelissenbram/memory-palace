import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/keps/[id]/captures — List captures for a kep
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:captures:${user.id}`, 60, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  // Parse query params for filtering
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Verify kep belongs to user
  const { data: kep } = await supabase
    .from("keps")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!kep) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let query = supabase
    .from("kep_captures")
    .select("*", { count: "exact" })
    .eq("kep_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ captures: data, total: count });
}
