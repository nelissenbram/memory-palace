import { NextResponse } from "next/server";

// Transcription is now handled client-side via the Web Speech API.
// This route is kept as a stub for backwards compatibility.
export async function POST() {
  return NextResponse.json(
    { error: "Transcription is handled client-side via Web Speech API." },
    { status: 410 }
  );
}
