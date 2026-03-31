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
const VERIFICATION_GRACE_MS = VERIFICATION_GRACE_DAYS * 24 * 60 * 60 * 1000;
const VERIFICATION_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const CRON_TIMEOUT_MS = 50_000;

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
  const { data: scheduledMessages, error: scheduledError } = await supabase
    .from("legacy_messages")
    .select("id, user_id, recipient_email, subject, message_body, deliver_on, deliver_date")
    .or(`deliver_on.eq.immediately,and(deliver_on.eq.specific_date,deliver_date.lte.${todayISO})`);

  if (scheduledError) {
    console.error("[Legacy Cron] Failed to fetch scheduled messages:", scheduledError.message);
  }

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
  const { data: legacyUsers, error: legacyUsersError } = await supabase
    .from("legacy_contacts")
    .select("user_id")
    .eq("is_active", true);

  if (legacyUsersError) {
    console.error("[Legacy Cron] Failed to fetch legacy users:", legacyUsersError.message);
    return NextResponse.json({
      error: "Failed to fetch legacy users",
      scheduledDeliveries,
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  if (!legacyUsers || legacyUsers.length === 0) {
    return NextResponse.json({
      message: "No users with active legacy contacts",
      verificationsSent,
      deliveriesTriggered,
      scheduledDeliveries,
      errors,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Unique user IDs
  const userIds = [...new Set(legacyUsers.map((c: { user_id: string }) => c.user_id))];

  // ── 2. Get profiles with last_seen_at ──
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, last_seen_at, preferred_locale")
    .in("id", userIds);

  if (profilesError) {
    console.error("[Legacy Cron] Failed to fetch profiles:", profilesError.message);
    return NextResponse.json({
      error: "Failed to fetch profiles",
      scheduledDeliveries,
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({
      message: "No matching profiles",
      verificationsSent,
      deliveriesTriggered,
      scheduledDeliveries,
      errors,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // ── 3. Get legacy settings for these users ──
  const { data: settingsRows, error: settingsError } = await supabase
    .from("legacy_settings")
    .select("id, inactivity_trigger_months, status, verification_sent_at, verification_token, trusted_verifier_email, trusted_verifier_name")
    .in("id", userIds);

  if (settingsError) {
    console.error("[Legacy Cron] Failed to fetch legacy settings:", settingsError.message);
  }

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

  // ── 4. Get auth user emails (only for users that need processing) ──
  const emailMap = new Map<string, string | undefined>();
  for (const userId of userIds) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError) {
      console.error("[Legacy Cron] Failed to fetch auth user", userId, ":", authError.message);
      continue;
    }
    emailMap.set(userId, authData?.user?.email);
  }

  // ── 5. Process each user for inactivity ──
  for (const profile of profiles) {
    // ── Timeout detection: bail before Vercel kills us ──
    if (Date.now() - startTime > CRON_TIMEOUT_MS) {
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

    // Calculate how long the user has been inactive using proper month arithmetic
    const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at) : null;
    if (!lastSeen) continue; // Never seen — skip (they just signed up)

    const inactivityDate = new Date(lastSeen);
    inactivityDate.setMonth(inactivityDate.getMonth() + inactivityMonths);

    if (now <= inactivityDate) continue; // Still within threshold

    const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));

    // ── User is inactive past their threshold ──

    if (settings?.verification_sent_at) {
      // Verification was already sent — check if grace period expired (exact timestamp)
      const verificationSent = new Date(settings.verification_sent_at);

      if (verificationSent.getTime() + VERIFICATION_GRACE_MS <= now.getTime()) {
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
      // No verification sent yet — generate TWO tokens and persist BEFORE sending email
      const userToken = randomBytes(32).toString("hex");
      const verifierToken = randomBytes(32).toString("hex");
      const verificationExpiresAt = new Date(now.getTime() + VERIFICATION_LINK_EXPIRY_MS).toISOString();
      const displayName = profile.display_name || email.split("@")[0];
      const userLocale = profile.preferred_locale || "en";

      // Persist tokens to DB first so they exist when the user clicks the link
      const { error: upsertError } = await supabase
        .from("legacy_settings")
        .upsert({
          id: userId,
          verification_sent_at: now.toISOString(),
          verification_token: userToken,
          verifier_confirmation_token: verifierToken,
          verification_expires_at: verificationExpiresAt,
          status: "triggered",
        }, { onConflict: "id" });

      if (upsertError) {
        console.error(`[Legacy] Settings upsert failed for user ${userId}:`, upsertError.message);
        errors++;
        continue; // Don't send email if tokens aren't persisted
      }

      const result = await sendVerificationEmail({
        recipientEmail: email,
        displayName,
        inactiveDays: daysSinceLastSeen,
        verificationToken: userToken,
        locale: userLocale,
      });

      if (result.success) {
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
              locale: userLocale,
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

  // ══════════════════════════════════════════════════════
  // PART C: Auto-retry partial deliveries
  // ══════════════════════════════════════════════════════
  // Find users stuck in "partially_delivered" and retry once per day (max 1 per cron run).
  let partialRetried = 0;

  if (!timedOut) {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: partialUsers } = await supabase
      .from("legacy_settings")
      .select("id")
      .eq("status", "partially_delivered")
      .limit(1);

    if (partialUsers && partialUsers.length > 0) {
      const candidate = partialUsers[0];
      // Check legacy_deliveries for the most recent delivery attempt
      const { data: recentDelivery } = await supabase
        .from("legacy_deliveries")
        .select("delivered_at")
        .eq("user_id", candidate.id)
        .order("delivered_at", { ascending: false })
        .limit(1);

      const lastDeliveryAt = recentDelivery?.[0]?.delivered_at
        ? new Date(recentDelivery[0].delivered_at)
        : null;

      // Only retry if no deliveries exist or the most recent is >24h ago
      if (!lastDeliveryAt || lastDeliveryAt < oneDayAgo) {
        try {
          const deliverUrl = new URL("/api/legacy/deliver", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
          const res = await fetch(deliverUrl.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CRON_SECRET}`,
            },
            body: JSON.stringify({ userId: candidate.id, retry: true }),
          });

          if (res.ok) {
            partialRetried++;
          } else {
            console.error(`[Legacy] Partial retry failed for user ${candidate.id}:`, await res.text());
            errors++;
          }
        } catch (e) {
          console.error(`[Legacy] Partial retry error for user ${candidate.id}:`, e);
          errors++;
        }
      }
    }
  }

  return NextResponse.json({
    verificationsSent,
    deliveriesTriggered,
    scheduledDeliveries,
    partialRetried,
    errors,
    usersChecked: profiles.length,
    timedOut,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// Support POST as well (Vercel cron can use either)
export async function POST(request: Request) {
  return GET(request);
}
