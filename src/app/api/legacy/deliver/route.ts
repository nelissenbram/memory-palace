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
  // Optional: only deliver specific messages (for scheduled/immediate delivery mode)
  const filterMessageIds: string[] | null = Array.isArray(body?.messageIds) ? body.messageIds : null;

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
  let messagesQuery = supabase
    .from("legacy_messages")
    .select("*")
    .eq("user_id", userId);

  // If specific message IDs provided, only fetch those (scheduled/immediate delivery)
  if (filterMessageIds && filterMessageIds.length > 0) {
    messagesQuery = messagesQuery.in("id", filterMessageIds);
  }

  const { data: messages } = await messagesQuery;

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

  // Collect delivery records for batch insert (only for successfully sent emails)
  const deliveryRecords: Array<{
    user_id: string;
    contact_id: string;
    message_id: string | null;
    access_token: string;
    delivered_at: string;
    expires_at: string;
  }> = [];

  // ── 4. Send to each contact ──
  for (const contact of contacts) {
    const contactEmail = (contact.contact_email as string).toLowerCase();
    const contactMessages = messagesByEmail.get(contactEmail) || [];

    // Generate a unique access token for this contact (for palace access)
    const accessToken = randomBytes(32).toString("hex");

    // Combine all messages for this contact into one delivery email
    const allBodies: string[] = [];
    const messageIds: string[] = [];
    let combinedSubject = "";

    if (contactMessages.length > 0) {
      combinedSubject = contactMessages[0].subject;
      for (const msg of contactMessages) {
        messageIds.push(msg.id);
        if (msg.subject && msg.subject !== combinedSubject) {
          allBodies.push(`── ${msg.subject} ──\n\n${msg.message_body}`);
        } else {
          allBodies.push(msg.message_body);
        }
      }
    } else {
      allBodies.push(`${senderName} wanted you to have access to their Memory Palace.`);
    }

    const combinedBody = allBodies.join("\n\n─────\n\n");

    // Send the email with all messages combined
    const result = await sendDeliveryEmail({
      recipientEmail: contactEmail,
      recipientName: contact.contact_name as string,
      senderName,
      messageSubject: combinedSubject,
      messageBody: combinedBody,
      accessToken,
      expiresAt: expiresAt.toISOString(),
    });

    if (result.success) {
      sent++;
      // Create a delivery record for EVERY message sent to this contact so
      // the cron's "already delivered" check (which looks up by message_id)
      // correctly skips all of them on subsequent runs.
      if (messageIds.length > 0) {
        for (let i = 0; i < messageIds.length; i++) {
          // First record uses the real accessToken (sent in the email).
          // Additional records get unique derived tokens to satisfy the
          // access_token UNIQUE constraint — they exist only for tracking.
          const token = i === 0 ? accessToken : randomBytes(32).toString("hex");
          deliveryRecords.push({
            user_id: userId,
            contact_id: contact.id,
            message_id: messageIds[i],
            access_token: token,
            delivered_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });
        }
      } else {
        // No specific messages — still record the delivery for this contact
        deliveryRecords.push({
          user_id: userId,
          contact_id: contact.id,
          message_id: null,
          access_token: accessToken,
          delivered_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });
      }
    } else {
      console.error(`[Legacy Deliver] Email failed for ${contactEmail}:`, result.error);
      errors++;
    }
  }

  // ── 5. Batch insert delivery records for all successful sends ──
  if (deliveryRecords.length > 0) {
    const { error: batchInsertError } = await supabase
      .from("legacy_deliveries")
      .insert(deliveryRecords);

    if (batchInsertError) {
      console.error(`[Legacy Deliver] Batch DB insert failed:`, batchInsertError.message);
      // Records failed to persist but emails were already sent
    }
  }

  // ── 6. Mark legacy status (only for full delivery, not partial scheduled) ──
  if (!filterMessageIds) {
    const newStatus = errors === 0 ? "transferred" : "partially_delivered";
    await supabase
      .from("legacy_settings")
      .update({
        status: newStatus,
        verification_sent_at: null,
        verification_token: null,
      })
      .eq("id", userId);
  }

  return NextResponse.json({
    sent,
    errors,
    totalContacts: contacts.length,
    status: filterMessageIds ? "partial" : (errors === 0 ? "transferred" : "partially_delivered"),
  });
}
