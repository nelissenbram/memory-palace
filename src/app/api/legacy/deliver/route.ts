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

const ACCESS_TOKEN_EXPIRY_DAYS = 90;
const DELIVERY_TIMEOUT_MS = 50_000;

/** Vercel serverless max execution time (seconds). */
export const maxDuration = 60;

export async function POST(request: Request) {
  // Verify cron secret — fail-closed if not configured
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const userId = body?.userId;
  // Optional: only deliver specific messages (for scheduled/immediate delivery mode)
  const filterMessageIds: string[] | null = Array.isArray(body?.messageIds) ? body.messageIds : null;
  // Retry mode: only deliver to contacts who don't have existing delivery records
  const retryMode = body?.retry === true;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const deliveryStart = Date.now();

  // ── Idempotency lock: atomically claim this delivery ──
  // Only proceed if we can transition from 'triggered' or 'partially_delivered'
  // to 'delivering'. If another process is already delivering, return early.
  if (!filterMessageIds) {
    const { data: locked, error: lockError } = await supabase
      .from("legacy_settings")
      .update({ status: "delivering" })
      .eq("id", userId)
      .in("status", ["triggered", "partially_delivered"])
      .select("id");

    if (lockError) {
      console.error(`[Legacy Deliver] Failed to acquire delivery lock for user ${userId}:`, lockError.message);
      return NextResponse.json({ error: "Failed to acquire delivery lock" }, { status: 500 });
    }

    if (!locked || locked.length === 0) {
      return NextResponse.json(
        { error: "Delivery already in progress or not in deliverable state" },
        { status: 409 }
      );
    }
  }

  // ── 1. Get user profile + auth email ──
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_locale")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error(`[Legacy Deliver] Failed to fetch profile for user ${userId}:`, profileError.message);
  }

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const senderEmail = authData?.user?.email;
  const senderName = profile.display_name || senderEmail?.split("@")[0] || "Someone";
  const userLocale = profile.preferred_locale || "en";

  // ── 2. Get active legacy contacts ──
  const { data: contacts, error: contactsError } = await supabase
    .from("legacy_contacts")
    .select("id, contact_name, contact_email, access_level, wing_access, room_access")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (contactsError) {
    console.error(`[Legacy Deliver] Failed to fetch contacts for user ${userId}:`, contactsError.message);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: "No active legacy contacts" }, { status: 404 });
  }

  // ── Retry mode: filter out contacts that already have delivery records ──
  let deliverContacts = contacts;
  if (retryMode) {
    const contactIds = contacts.map((c: { id: string }) => c.id);
    const { data: existingDeliveries } = await supabase
      .from("legacy_deliveries")
      .select("contact_id")
      .eq("user_id", userId)
      .in("contact_id", contactIds);

    const deliveredContactIds = new Set(
      (existingDeliveries || []).map((d: { contact_id: string }) => d.contact_id)
    );
    deliverContacts = contacts.filter((c: { id: string }) => !deliveredContactIds.has(c.id));

    if (deliverContacts.length === 0) {
      return NextResponse.json({ sent: 0, errors: 0, message: "All contacts already delivered" });
    }
  }

  // ── 3. Get legacy messages ──
  let messagesQuery = supabase
    .from("legacy_messages")
    .select("id, recipient_email, subject, message_body")
    .eq("user_id", userId);

  // If specific message IDs provided, only fetch those (scheduled/immediate delivery)
  if (filterMessageIds && filterMessageIds.length > 0) {
    messagesQuery = messagesQuery.in("id", filterMessageIds);
  }

  const { data: messages, error: messagesError } = await messagesQuery;

  if (messagesError) {
    console.error(`[Legacy Deliver] Failed to fetch messages for user ${userId}:`, messagesError.message);
  }

  // Build a map of messages by recipient email
  const messagesByEmail = new Map<string, Array<{ id: string; subject: string; message_body: string }>>();
  if (messages) {
    for (const msg of messages) {
      const email = (msg.recipient_email || "").toLowerCase();
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

  // ── 4. Send to each contact and persist delivery records atomically ──
  // Records are inserted immediately after each successful email send so that
  // a later DB failure cannot cause the cron to re-deliver already-sent emails.
  let timedOut = false;
  try {
  for (const contact of deliverContacts) {
    // ── Timeout guard: stop before Vercel kills the function ──
    if (Date.now() - deliveryStart > DELIVERY_TIMEOUT_MS) {
      timedOut = true;
      console.warn(`[Legacy Deliver] Approaching timeout after ${sent} sends, stopping early.`);
      break;
    }

    const contactEmail = (contact.contact_email || "").toLowerCase();
    if (!contactEmail) {
      console.error(`[Legacy Deliver] Skipping contact ${contact.id}: no email address`);
      // Insert a failed delivery record so retry logic knows this contact was attempted
      const skipToken = randomBytes(32).toString("hex");
      await supabase.from("legacy_deliveries").insert({
        user_id: userId,
        contact_id: contact.id,
        message_id: null,
        access_token: skipToken,
        delivered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
      errors++;
      continue;
    }
    const contactName = contact.contact_name || "Friend";
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
      const fallbackMessages: Record<string, string> = {
        en: `${senderName} wanted you to have access to their Memory Palace.`,
        nl: `${senderName} wilde dat je toegang hebt tot hun Memory Palace.`,
      };
      allBodies.push(fallbackMessages[userLocale] || fallbackMessages.en);
    }

    const combinedBody = allBodies.join("\n\n─────\n\n");

    // Send the email with all messages combined
    const result = await sendDeliveryEmail({
      recipientEmail: contactEmail,
      recipientName: contactName,
      senderName,
      messageSubject: combinedSubject,
      messageBody: combinedBody,
      accessToken,
      expiresAt: expiresAt.toISOString(),
      locale: userLocale,
    });

    if (result.success) {
      sent++;

      // ── Atomic insert: persist delivery records immediately after send ──
      // This prevents double delivery if a later step fails.
      const records: Array<{
        user_id: string;
        contact_id: string;
        message_id: string | null;
        access_token: string;
        delivered_at: string;
        expires_at: string;
      }> = [];

      if (messageIds.length > 0) {
        for (let i = 0; i < messageIds.length; i++) {
          // First record uses the real accessToken (sent in the email).
          // Additional records get unique derived tokens to satisfy the
          // access_token UNIQUE constraint — they exist only for tracking.
          const token = i === 0 ? accessToken : randomBytes(32).toString("hex");
          records.push({
            user_id: userId,
            contact_id: contact.id,
            message_id: messageIds[i],
            access_token: token,
            delivered_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });
        }
      } else {
        records.push({
          user_id: userId,
          contact_id: contact.id,
          message_id: null,
          access_token: accessToken,
          delivered_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });
      }

      // Retry insert up to 3 times on unique constraint violation (token collision)
      let insertSuccess = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: insertError } = await supabase
          .from("legacy_deliveries")
          .insert(records);

        if (!insertError) {
          insertSuccess = true;
          break;
        }

        // PostgreSQL unique violation code
        if (insertError.code === "23505" && attempt < 2) {
          console.warn(
            `[Legacy Deliver] Token collision for contact ${contact.id} (attempt ${attempt + 1}), regenerating tokens…`
          );
          // Regenerate all tokens in the records
          for (let r = 0; r < records.length; r++) {
            records[r].access_token = randomBytes(32).toString("hex");
          }
          continue;
        }

        // Non-retryable error or final attempt exhausted
        console.error(
          `[Legacy Deliver] DB insert failed for contact ${contact.id}:`,
          insertError.message,
          insertError.code === "23505"
            ? "— token collision after 3 attempts, giving up."
            : "— email was already sent, skipping re-delivery."
        );
        break;
      }
    } else {
      console.error(`[Legacy Deliver] Email failed for ${contactEmail}:`, result.error);
      errors++;
    }
  }
  } finally {
    // ── 5. Mark legacy status ──
    // Always update status, even if the loop was interrupted by timeout or error.
    if (!filterMessageIds) {
      const allDone = errors === 0 && !timedOut;
      if (retryMode && allDone) {
        // Retry succeeded for all remaining contacts -> upgrade to transferred
        await supabase
          .from("legacy_settings")
          .update({ status: "transferred" })
          .eq("id", userId);
      } else if (retryMode && !allDone) {
        // Retry had errors or timed out -> revert to partially_delivered
        await supabase
          .from("legacy_settings")
          .update({ status: "partially_delivered" })
          .eq("id", userId);
      } else if (!retryMode) {
        const newStatus = allDone ? "transferred" : "partially_delivered";
        await supabase
          .from("legacy_settings")
          .update({
            status: newStatus,
            verification_sent_at: null,
            verification_token: null,
          })
          .eq("id", userId);
      }
    }
  }

  return NextResponse.json({
    sent,
    errors,
    totalContacts: contacts.length,
    timedOut,
    status: filterMessageIds ? "partial" : (errors === 0 && !timedOut ? "transferred" : "partially_delivered"),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
