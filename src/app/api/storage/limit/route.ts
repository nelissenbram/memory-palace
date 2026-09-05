import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveStorageLimit, getUserPlan, getUserStorageBytes } from "@/lib/auth/plan-limits";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Exact total via SQL aggregate (paginated fallback) — an unpaginated
    // select would cap at PostgREST max-rows and under-report for heavy users.
    const [limitMb, subscription, totalBytes] = await Promise.all([
      getEffectiveStorageLimit(user.id),
      getUserPlan(user.id),
      getUserStorageBytes(user.id),
    ]);

    const storageMb = Math.round(totalBytes / (1024 * 1024));

    return NextResponse.json({
      limitMb,
      storageMb,
      plan: subscription.plan,
    });
  } catch (err) {
    console.error("[storage/limit] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
