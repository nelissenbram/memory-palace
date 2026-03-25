import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email/send-legacy";

/**
 * GET /api/cron/legacy-check
 *
 * Daily cron that checks for inactive users with legacy contacts.
 * - If inactive past their threshold and no verification sent yet: send verification email.
 * - If verification was sent 30+ days ago with no response: trigger legacy delivery.
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

  const now = new Date();
  let verificationsSent = 0;
  let deliveriesTriggered = 0;
  let errors = 0;

  // ── 1. Get all users who have legacy contacts configured ──
  const { data: legacyUsers } = await supabase
    .from("legacy_contacts")
    .select("user_id")
    .eq("is_active", true);

  if (!legacyUsers || legacyUsers.length === 0) {
    return NextResponse.json({ message: "No users with active legacy contacts", verificationsSent: 0, deliveriesTriggered: 0 });
  }

  // Unique user IDs
  const userIds = [...new Set(legacyUsers.map((c: { user_id: string }) => c.user_id))];

  // ── 2. Get profiles with last_seen_at ──
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, last_seen_at")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No matching profiles", verificationsSent: 0, deliveriesTriggered: 0 });
  }

  // ── 3. Get legacy settings for these users ──
  const { data: settingsRows } = await supabase
    .from("legacy_settings")
    .select("id, inactivity_trigger_months, status, verification_sent_at, verification_token")
    .in("id", userIds);

  const settingsMap = new Map(
    (settingsRows || []).map((s: {
      id: string;
      inactivity_trigger_months: number;
      status: string;
      verification_sent_at: string | null;
      verification_token: string | null;
    }) => [s.id, s])
  );

  // ── 4. Get auth user emails ──
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (authUsers?.users || []).map((u: { id: string; email?: string }) => [u.id, u.email])
  );

  // ── 5. Process each user ──
  for (const profile of profiles) {
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
      // No verification sent yet — send one now
      const token = randomBytes(32).toString("hex");

      const result = await sendVerificationEmail({
        recipientEmail: email,
        displayName: profile.display_name || email.split("@")[0],
        inactiveDays: daysSinceLastSeen,
        verificationToken: token,
      });

      if (result.success) {
        // Store verification token and timestamp
        await supabase
          .from("legacy_settings")
          .upsert(
            {
              id: userId,
              verification_sent_at: now.toISOString(),
              verification_token: token,
              status: "triggered",
            },
            { onConflict: "id" }
          );

        verificationsSent++;
      } else {
        console.error(`[Legacy] Verification email failed for ${email}:`, result.error);
        errors++;
      }
    }
  }

  return NextResponse.json({
    verificationsSent,
    deliveriesTriggered,
    errors,
    usersChecked: profiles.length,
  });
}

// Support POST as well (Vercel cron can use either)
export async function POST(request: Request) {
  return GET(request);
}
