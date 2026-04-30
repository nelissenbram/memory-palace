import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await rateLimit(`family-invite:${user.id}`, 20, 3_600_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const body = await request.json();
  const { email, permission, personName } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Get inviter profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const inviterName = profile?.display_name || user.email?.split("@")[0] || "Someone";

  // Create or get family tree share link
  const { data: existingShare } = await supabase
    .from("family_tree_shares")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  let shareToken: string;
  if (existingShare) {
    shareToken = existingShare.share_token;
  } else {
    const { data: newShare, error: shareErr } = await supabase
      .from("family_tree_shares")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (shareErr || !newShare) {
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }
    shareToken = newShare.share_token;
  }

  // Send the invite email via the email API (reuse existing infrastructure)
  try {
    const { sendInviteEmail } = await import("@/lib/email/send-invite");
    const treeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://thememorypalace.ai"}/family-tree/shared/${shareToken}`;

    const result = await sendInviteEmail({
      inviterName,
      recipientEmail: email.trim().toLowerCase(),
      roomName: personName ? `Family Tree (${personName})` : "Family Tree",
      wingName: "Family",
      shareId: shareToken,
      permission: permission || "view",
      personalMessage: personName
        ? `${inviterName} has invited you to collaborate on their family tree. You are connected as ${personName}.`
        : `${inviterName} has invited you to view and collaborate on their family tree.`,
    });

    if (!result.success) {
      console.error("[family-tree/invite] Email send failed:", result.error);
      return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, shareToken }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[family-tree/invite] Error:", err);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
