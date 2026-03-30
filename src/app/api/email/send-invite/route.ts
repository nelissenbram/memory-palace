import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { WINGS } from "@/lib/constants/wings";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { shareId } = body;

  if (!shareId) {
    return NextResponse.json({ error: "Missing shareId" }, { status: 400 });
  }

  // Fetch share details
  const { data: share } = await supabase
    .from("room_shares")
    .select("id, room_id, owner_id, shared_with_email, permission, invite_message, email_sent")
    .eq("id", shareId)
    .eq("owner_id", user.id)
    .single();

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // Get inviter profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Get room + wing info
  const { data: room } = await supabase
    .from("rooms")
    .select("name, wing_id")
    .eq("id", share.room_id)
    .single();

  let wingName = "";
  if (room?.wing_id) {
    const { data: wing } = await supabase
      .from("wings")
      .select("slug")
      .eq("id", room.wing_id)
      .single();
    if (wing?.slug) {
      const wingDef = WINGS.find(w => w.id === wing.slug);
      if (wingDef) wingName = wingDef.name;
    }
  }

  // Send the email
  const result = await sendInviteEmail({
    inviterName: profile?.display_name || user.email?.split("@")[0] || "Someone",
    recipientEmail: share.shared_with_email,
    roomName: room?.name || "A Memory Room",
    wingName,
    shareId: share.id,
    permission: share.permission,
    personalMessage: share.invite_message,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Mark as sent
  await supabase
    .from("room_shares")
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
