import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendLinkAccountMessage } from "@/lib/kep/whatsapp-disclosure";

/**
 * POST /api/keps/test-welcome — Send the first-contact message to a phone number.
 * Admin-only test endpoint.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await request.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const result = await sendLinkAccountMessage(phone);
  return NextResponse.json({ sent: result });
}
