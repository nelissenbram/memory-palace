import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendDeliveryEmail } from "@/lib/email/send-legacy";

/**
 * POST /api/legacy/deliver
 *
 * Triggered by the legacy-check cron when verification expires.
 * Sends legacy messages + access links to each contact.
 *
 * Body: { userId: string }
 * Secured via CRON_SECRET header.
 */

const CRON_SECRET = process.env.CRON_SECRET || "";
const ACCESS_TOKEN_EXPIRY_DAYS = 90;

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const userId = body?.userId;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── 1. Get user profile + auth email ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const senderEmail = authData?.user?.email;
  const senderName = profile.display_name || senderEmail?.split("@")[0] || "Someone";

  // ── 2. Get active legacy contacts ──
  const { data: contacts } = await supabase
    .from("legacy_contacts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: "No active legacy contacts" }, { status: 404 });
  }

  // ── 3. Get legacy messages ──
  const { data: messages } = await supabase
    .from("legacy_messages")
    .select("*")
    .eq("user_id", userId);

  // Build a map of messages by recipient email
  const messagesByEmail = new Map<string, Array<{ id: string; subject: string; message_body: string }>>();
  if (messages) {
    for (const msg of messages) {
      const email = (msg.recipient_email as string).toLowerCase();
      if (!messagesByEmail.has(email)) messagesByEmail.set(email, []);
      messagesByEmail.get(email)!.push({
        id: msg.id,
        subject: msg.subject,
        message_body: msg.message_body,
      });
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  let sent = 0;
  let errors = 0;

  // ── 4. Send to each contact ──
  for (const contact of contacts) {
    const contactEmail = (contact.contact_email as string).toLowerCase();
    const contactMessages = messagesByEmail.get(contactEmail) || [];

    // Generate a unique access token for this contact
    const accessToken = randomBytes(32).toString("hex");

    // Find the primary message for this contact (or use a default)
    const primaryMessage = contactMessages[0] || {
      id: null,
      subject: "",
      message_body: `${senderName} wanted you to have access to their Memory Palace.`,
    };

    // Create the delivery record
    const { error: insertError } = await supabase
      .from("legacy_deliveries")
      .insert({
        user_id: userId,
        contact_id: contact.id,
        message_id: primaryMessage.id,
        access_token: accessToken,
        delivered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error(`[Legacy Deliver] DB insert failed for contact ${contact.id}:`, insertError.message);
      errors++;
      continue;
    }

    // Send the email
    const result = await sendDeliveryEmail({
      recipientEmail: contactEmail,
      recipientName: contact.contact_name as string,
      senderName,
      messageSubject: primaryMessage.subject,
      messageBody: primaryMessage.message_body,
      accessToken,
      expiresAt: expiresAt.toISOString(),
    });

    if (result.success) {
      sent++;
    } else {
      console.error(`[Legacy Deliver] Email failed for ${contactEmail}:`, result.error);
      errors++;
    }
  }

  // ── 5. Mark legacy as transferred ──
  await supabase
    .from("legacy_settings")
    .update({
      status: "transferred",
      verification_sent_at: null,
      verification_token: null,
    })
    .eq("id", userId);

  return NextResponse.json({
    sent,
    errors,
    totalContacts: contacts.length,
    status: "transferred",
  });
}
