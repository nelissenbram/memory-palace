import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Transcription is now handled client-side via the Web Speech API.
// This route is kept as a stub for backwards compatibility.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Transcription is handled client-side via Web Speech API." },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
