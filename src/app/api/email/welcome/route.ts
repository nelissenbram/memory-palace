import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

export async function POST(request: Request) {
  // Validate request has required internal header (simple protection against external calls)
  const authHeader = request.headers.get("x-internal-secret");
  const internalSecret = process.env.INTERNAL_API_SECRET;

  // If an internal secret is configured, enforce it
  if (internalSecret && authHeader !== internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, displayName } = body;

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const result = await sendWelcomeEmail({
    recipientEmail: email,
    displayName: displayName || email.split("@")[0],
  });

  if (!result.success) {
    console.error("[Welcome Email] Failed:", result.error);
    // Return 200 anyway — we don't want email failure to surface as an error to the user
    return NextResponse.json({ success: false, error: result.error }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
