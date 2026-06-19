import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkInterviewQuota } from "@/lib/auth/plan-limits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const quota = await checkInterviewQuota(user.id);
  return NextResponse.json(quota);
}
