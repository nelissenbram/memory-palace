import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Log to server console for now — can forward to PostHog or other service later
    if (process.env.NODE_ENV === "development") {
      console.log("[Web Vitals]", body);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
