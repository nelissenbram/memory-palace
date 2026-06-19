import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveStorageLimit, getUserPlan } from "@/lib/auth/plan-limits";

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

    const [limitMb, subscription, storageRes] = await Promise.all([
      getEffectiveStorageLimit(user.id),
      getUserPlan(user.id),
      supabase.from("memories").select("file_size").eq("user_id", user.id),
    ]);

    const totalBytes = (storageRes.data || []).reduce(
      (sum: number, m: { file_size: number }) => sum + (m.file_size || 0),
      0,
    );
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
