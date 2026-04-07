import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/fix-painting-type
 * One-time migration: convert all memories with type='painting' to type='photo'.
 * Secured with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase
    .from("memories")
    .update({ type: "photo" })
    .eq("type", "painting")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    migratedCount: data?.length || 0,
  });
}
