import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** DEV-ONLY: Reset onboarding state for the current user */
export async function POST() {
  // Temporarily enabled for production testing

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded: false })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "Onboarding reset. Clear localStorage and refresh." });
}
