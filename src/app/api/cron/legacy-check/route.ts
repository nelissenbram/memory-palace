import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendVerificationEmail, sendTrustedVerifierEmail } from "@/lib/email/send-legacy";

/**
 * GET /api/cron/legacy-check
 *
 * Daily cron that handles legacy delivery in three modes:
 *
 * 1. **Inactivity (deliver_on = "death")**: Detect inactive users → send verification
 *    email → 30-day grace period → deliver. Also notifies trusted verifier if configured.
 *
 * 2. **Scheduled (deliver_on = "specific_date")**: Deliver messages whose deliver_date
 *    has arrived, directly (no inactivity check needed).
 *
 * 3. **Immediate (deliver_on = "immediately")**: Deliver as soon as the cron next runs
 *    (within ~24h of message creation).
 *
 * Secured via CRON_SECRET header.
 * Vercel cron: daily at 9:00 AM — "0 9 * * *"
 */

const CRON_SECRET = process.env.CRON_SECRET || "";
const VERIFICATION_GRACE_DAYS = 30;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const startTime = Date.now();
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  let verificationsSent = 0;
  let deliveriesTriggered = 0;
  let scheduledDeliveries = 0;
  let errors = 0;
  let timedOut = false;

  // ══════════════════════════════════════════════════════
  // PART A: Scheduled & immediate messages (date-based)
  // ══════════════════════════════════════════════════════

  // Get messages with deliver_on = "immediately" or "specific_date" where date has arrived
  const { data: scheduledMessages } = await supabase
    .from("legacy_messages")
    .select("id, user_id, recipient_email, subject, message_body, deliver_on, deliver_date")
    .or(`deliver_on.eq.immediately,and(deliver_on.eq.specific_date,deliver_date.lte.${todayISO})`);

  if (scheduledMessages && scheduledMessages.length > 0) {
    // Check which messages have already been delivered (via legacy_deliveries)
    const msgIds = scheduledMessages.map((m: { id: string }) => m.id);
    const { data: existingDeliveries } = await supabase
      .from("legacy_deliveries")
      .select("message_id")
      .in("message_id", msgIds);

    const deliveredMsgIds = new Set((existingDeliveries || []).map((d: { message_id: string }) => d.message_id));

    // Group undelivered messages by user_id
    const pendingByUser = new Map<string, typeof scheduledMessages>();
    for (const msg of scheduledMessages) {
      if (deliveredMsgIds.has(msg.id)) continue; // already delivered
      const list = pendingByUser.get(msg.user_id) || [];
      list.push(msg);
      pendingByUser.set(msg.user_id, list);
    }

    // Deliver each user's pending scheduled messages
    for (const [userId, msgs] of pendingByUser) {
      try {
        const deliverUrl = new URL("/api/legacy/deliver", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
        const res = await fetch(deliverUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CRON_SECRET}`,
          },
          body: JSON.stringify({ userId, messageIds: msgs.map((m: { id: string }) => m.id) }),
        });

        if (res.ok) {
          scheduledDeliveries += msgs.length;
        } else {
          console.error(`[Legacy] Scheduled delivery failed for user ${userId}:`, await res.text());
          errors++;
        }
      } catch (e) {
        console.error(`[Legacy] Scheduled delivery error for user ${userId}:`, e);
        errors++;
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // PART B: Inactivity-based delivery (deliver_on = "death")
  // ══════════════════════════════════════════════════════

  // ── 1. Get all users who have legacy contacts configured ──
  const { data: legacyUsers } = await supabase
    .from("legacy_contacts")
    .select("user_id")
    .eq("is_active", true);

  if (!legacyUsers || legacyUsers.length === 0) {
    return NextResponse.json({
      message: "No users with active legacy contacts",
      verificationsSent,
      deliveriesTriggered,
      scheduledDeliveries,
      errors,
    });
  }

  // Unique user IDs
  const userIds = [...new Set(legacyUsers.map((c: { user_id: string }) => c.user_id))];

  // ── 2. Get profiles with last_seen_at ──
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, last_seen_at")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({
      message: "No matching profiles",
      verificationsSent,
      deliveriesTriggered,
      scheduledDeliveries,
      errors,
    });
  }

  // ── 3. Get legacy settings for these users ──
  const { data: settingsRows } = await supabase
    .from("legacy_settings")
    .select("id, inactivity_trigger_months, status, verification_sent_at, verification_token, trusted_verifier_email, trusted_verifier_name")
    .in("id", userIds);

  const settingsMap = new Map(
    (settingsRows || []).map((s: {
      id: string;
      inactivity_trigger_months: number;
      status: string;
      verification_sent_at: string | null;
      verification_token: string | null;
      trusted_verifier_email: string | null;
      trusted_verifier_name: string | null;
    }) => [s.id, s])
  );

  // ── 4. Get auth user emails (paginated) ──
  const emailMap = new Map<string, string | undefined>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: authPage } = await supabase.auth.admin.listUsers({ page, perPage });
    const users = authPage?.users || [];
    for (const u of users) {
      emailMap.set(u.id, u.email);
    }
    if (users.length < perPage) break;
    page++;
  }

  // ── 5. Process each user for inactivity ──
  // Collect settings upserts for batch operation at the end
  const settingsUpserts: Array<{
    id: string;
    verification_sent_at: string;
    verification_token: string;
    verifier_confirmation_token: string;
    verification_expires_at: string;
    status: string;
  }> = [];

  for (const profile of profiles) {
    // ── Timeout detection: bail before Vercel kills us ──
    if (Date.now() - startTime > 50000) {
      timedOut = true;
      break;
    }

    const userId = profile.id;
    const settings = settingsMap.get(userId);
    const email = emailMap.get(userId);

    if (!email) continue;

    // Skip already-transferred users
    if (settings?.status === "transferred") continue;

    // Determine inactivity threshold (default 12 months)
    const inactivityMonths = settings?.inactivity_trigger_months ?? 12;
    const inactivityDays = inactivityMonths * 30; // approximate

    // Calculate how long the user has been inactive
    const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at) : null;
    if (!lastSeen) continue; // Never seen — skip (they just signed up)

    const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastSeen < inactivityDays) continue; // Still within threshold

    // ── User is inactive past their threshold ──

    if (settings?.verification_sent_at) {
      // Verification was already sent — check if grace period expired
      const verificationSent = new Date(settings.verification_sent_at);
      const daysSinceVerification = Math.floor((now.getTime() - verificationSent.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceVerification >= VERIFICATION_GRACE_DAYS) {
        // Grace period expired — trigger delivery
        try {
          const deliverUrl = new URL("/api/legacy/deliver", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
          const res = await fetch(deliverUrl.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CRON_SECRET}`,
            },
            body: JSON.stringify({ userId }),
          });

          if (res.ok) {
            deliveriesTriggered++;
          } else {
            console.error(`[Legacy] Delivery failed for user ${userId}:`, await res.text());
            errors++;
          }
        } catch (e) {
          console.error(`[Legacy] Delivery error for user ${userId}:`, e);
          errors++;
        }
      }
      // else: still within grace period, do nothing
    } else {
      // No verification sent yet — generate TWO tokens and send
      const userToken = randomBytes(32).toString("hex");
      const verifierToken = randomBytes(32).toString("hex");
      const verificationExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      const displayName = profile.display_name || email.split("@")[0];

      const result = await sendVerificationEmail({
        recipientEmail: email,
        displayName,
        inactiveDays: daysSinceLastSeen,
        verificationToken: userToken,
      });

      if (result.success) {
        // Queue settings upsert for batch operation
        settingsUpserts.push({
          id: userId,
          verification_sent_at: now.toISOString(),
          verification_token: userToken,
          verifier_confirmation_token: verifierToken,
          verification_expires_at: verificationExpiresAt,
          status: "triggered",
        });

        verificationsSent++;

        // ── Notify trusted verifier if configured ──
        if (settings?.trusted_verifier_email) {
          try {
            await sendTrustedVerifierEmail({
              recipientEmail: settings.trusted_verifier_email,
              recipientName: settings.trusted_verifier_name || "Trusted Verifier",
              userName: displayName,
              inactiveDays: daysSinceLastSeen,
              verificationToken: verifierToken,
            });
          } catch (e) {
            console.error(`[Legacy] Trusted verifier email failed for ${settings.trusted_verifier_email}:`, e);
            // Don't increment errors — verifier notification is best-effort
          }
        }
      } else {
        console.error(`[Legacy] Verification email failed for ${email}:`, result.error);
        errors++;
      }
    }
  }

  // ── 6. Batch upsert all settings updates ──
  if (settingsUpserts.length > 0) {
    const { error: upsertError } = await supabase
      .from("legacy_settings")
      .upsert(settingsUpserts, { onConflict: "id" });

    if (upsertError) {
      console.error(`[Legacy] Batch settings upsert failed:`, upsertError.message);
      errors++;
    }
  }

  return NextResponse.json({
    verificationsSent,
    deliveriesTriggered,
    scheduledDeliveries,
    errors,
    usersChecked: profiles.length,
    timedOut,
  });
}

// Support POST as well (Vercel cron can use either)
export async function POST(request: Request) {
  return GET(request);
}
