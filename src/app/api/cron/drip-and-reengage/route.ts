import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { sendDripEmail, getDripEmailConfig } from "@/lib/email/send-drip";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { sendPush, type PushSubscriptionJSON, type NotificationPayload } from "@/lib/push";
import { serverT, serverTf } from "@/lib/i18n/server";
import type { Locale } from "@/i18n/config";

/**
 * GET /api/cron/drip-and-reengage
 *
 * Daily cron that handles two lifecycle email flows:
 *
 * **Drip sequence** (new users):
 * - Day 1:  "Add your first memory" tutorial nudge
 * - Day 3:  "Meet your AI interviewer" feature highlight
 * - Day 7:  "Share with family" invite CTA
 * - Day 14: "Your palace is waiting" (only if <5 memories)
 *
 * **Re-engagement** (inactive users):
 * - 7 days inactive:  push notification
 * - 14 days inactive: re-engagement email (via send-reminder.ts)
 * - 30 days inactive: second re-engagement email
 *
 * Secured via CRON_SECRET header.
 * Vercel cron: daily at 9:30 AM — "30 9 * * *"
 */

const DRIP_DAYS = [1, 3, 7, 14] as const;
type DripDay = (typeof DRIP_DAYS)[number];
const MAX_EMAILS_PER_RUN = 100;
const MAX_PUSHES_PER_RUN = 200;

export async function GET(request: Request) {
  // ── Auth ──
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

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  const stats = {
    drip: { sent: 0, skipped: 0, errors: 0 },
    reengage: { pushSent: 0, emailSent: 0, errors: 0 },
  };

  // ══════════════════════════════════════════════════════
  // PART A: Drip emails for new users
  // ══════════════════════════════════════════════════════

  // Build date boundaries for each drip day
  // e.g., day 1 → users who signed up exactly 1 day ago (same calendar day)
  const dripTargets: { day: DripDay; dateStart: string; dateEnd: string }[] = [];
  for (const day of DRIP_DAYS) {
    const target = new Date(now);
    target.setDate(target.getDate() - day);
    const dateStart = target.toISOString().slice(0, 10) + "T00:00:00.000Z";
    const dateEnd = target.toISOString().slice(0, 10) + "T23:59:59.999Z";
    dripTargets.push({ day, dateStart, dateEnd });
  }

  // Fetch all candidate profiles for drip emails in a single query
  // We get users created on any of the drip days who are onboarded and not unsubscribed
  const oldestDate = dripTargets[dripTargets.length - 1].dateStart;
  const newestDate = dripTargets[0].dateEnd;

  const { data: dripProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_locale, created_at, email_digest")
    .eq("onboarded", true)
    .gte("created_at", oldestDate)
    .lte("created_at", newestDate)
    .limit(500);

  // Fetch auth emails for drip candidates
  const dripUserIds = (dripProfiles || []).map((p: { id: string }) => p.id);
  const dripEmailMap = new Map<string, string>();

  if (dripUserIds.length > 0) {
    let authPage = 1;
    while (true) {
      const { data: authListData, error: authListError } = await supabase.auth.admin.listUsers({ perPage: 1000, page: authPage });
      if (authListError || !authListData?.users?.length) break;
      for (const authUser of authListData.users) {
        if (dripUserIds.includes(authUser.id) && authUser.email) {
          dripEmailMap.set(authUser.id, authUser.email);
        }
      }
      if (authListData.users.length < 1000) break;
      authPage++;
    }
  }

  // For day 14, we need memory counts — batch-fetch for those users
  const day14Start = dripTargets.find((d) => d.day === 14)?.dateStart;
  const day14End = dripTargets.find((d) => d.day === 14)?.dateEnd;
  const day14UserIds = (dripProfiles || [])
    .filter((p: { created_at: string }) => p.created_at >= day14Start! && p.created_at <= day14End!)
    .map((p: { id: string }) => p.id);

  const lowMemoryUsers = new Set<string>();
  if (day14UserIds.length > 0) {
    // Get memory counts for day-14 candidates
    const { data: memoryCounts } = await supabase
      .from("memories")
      .select("user_id")
      .in("user_id", day14UserIds);

    const countByUser = new Map<string, number>();
    for (const m of memoryCounts || []) {
      countByUser.set(m.user_id, (countByUser.get(m.user_id) || 0) + 1);
    }
    for (const uid of day14UserIds) {
      if ((countByUser.get(uid) || 0) < 5) {
        lowMemoryUsers.add(uid);
      }
    }
  }

  // Send drip emails
  const dripPromises: Promise<void>[] = [];
  let dripCount = 0;

  for (const profile of dripProfiles || []) {
    if (dripCount >= MAX_EMAILS_PER_RUN) break;

    // Skip unsubscribed users
    if (profile.email_digest === false) {
      stats.drip.skipped++;
      continue;
    }

    const email = dripEmailMap.get(profile.id);
    if (!email) continue;

    // Determine which drip day this user matches
    const matchingDrip = dripTargets.find(
      (d) => profile.created_at >= d.dateStart && profile.created_at <= d.dateEnd
    );
    if (!matchingDrip) continue;

    const config = getDripEmailConfig(matchingDrip.day);

    // Day 14: only send if user has <5 memories
    if (config.requiresLowMemories && !lowMemoryUsers.has(profile.id)) {
      stats.drip.skipped++;
      continue;
    }

    dripCount++;
    dripPromises.push(
      sendDripEmail({
        recipientEmail: email,
        displayName: profile.display_name || email.split("@")[0],
        locale: profile.preferred_locale || "en",
        dripDay: matchingDrip.day,
        userId: profile.id,
      }).then((result) => {
        if (result.success) stats.drip.sent++;
        else stats.drip.errors++;
      })
    );
  }

  // ══════════════════════════════════════════════════════
  // PART B: Re-engagement for inactive users
  // ══════════════════════════════════════════════════════

  const reengageDays = [7, 14, 30] as const;
  const reengageTargets: { days: number; dateStart: string; dateEnd: string }[] = [];

  for (const days of reengageDays) {
    const target = new Date(now);
    target.setDate(target.getDate() - days);
    const dateStart = target.toISOString().slice(0, 10) + "T00:00:00.000Z";
    const dateEnd = target.toISOString().slice(0, 10) + "T23:59:59.999Z";
    reengageTargets.push({ days, dateStart, dateEnd });
  }

  const reOldest = reengageTargets[reengageTargets.length - 1].dateStart;
  const reNewest = reengageTargets[0].dateEnd;

  const { data: inactiveProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_locale, last_seen_at, email_digest")
    .not("last_seen_at", "is", null)
    .gte("last_seen_at", reOldest)
    .lte("last_seen_at", reNewest)
    .limit(500);

  // Map inactive profiles to their re-engagement tier
  const reengagePromises: Promise<void>[] = [];

  // For email re-engagement (14d, 30d), fetch auth emails
  const reengageUserIds = (inactiveProfiles || []).map((p: { id: string }) => p.id);
  const reengageEmailMap = new Map<string, string>();

  if (reengageUserIds.length > 0) {
    let authPage = 1;
    while (true) {
      const { data: authListData, error: authListError } = await supabase.auth.admin.listUsers({ perPage: 1000, page: authPage });
      if (authListError || !authListData?.users?.length) break;
      for (const authUser of authListData.users) {
        if (reengageUserIds.includes(authUser.id) && authUser.email) {
          reengageEmailMap.set(authUser.id, authUser.email);
        }
      }
      if (authListData.users.length < 1000) break;
      authPage++;
    }
  }

  // Get memory counts for re-engagement emails
  const reengageMemoryCount = new Map<string, number>();
  if (reengageUserIds.length > 0) {
    const { data: memoryCounts } = await supabase
      .from("memories")
      .select("user_id")
      .in("user_id", reengageUserIds);

    for (const m of memoryCounts || []) {
      reengageMemoryCount.set(m.user_id, (reengageMemoryCount.get(m.user_id) || 0) + 1);
    }
  }

  // ── 7-day inactive: push notification ──
  const push7dTarget = reengageTargets.find((t) => t.days === 7)!;
  const push7dUsers = (inactiveProfiles || []).filter(
    (p: { last_seen_at: string }) =>
      p.last_seen_at >= push7dTarget.dateStart && p.last_seen_at <= push7dTarget.dateEnd
  );

  if (push7dUsers.length > 0) {
    const push7dUserIds = push7dUsers.map((p: { id: string }) => p.id);

    const { data: pushSubs } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, keys_p256dh, keys_auth")
      .in("user_id", push7dUserIds);

    let pushCount = 0;
    for (const sub of pushSubs || []) {
      if (pushCount >= MAX_PUSHES_PER_RUN) break;

      const profile = push7dUsers.find((p: { id: string }) => p.id === sub.user_id);
      if (!profile) continue;

      const locale = (profile.preferred_locale as Locale) || "en";
      const displayName = profile.display_name || "there";

      const pushSub: PushSubscriptionJSON = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      };

      const payload: NotificationPayload = {
        title: serverT("push_reengage_title", locale),
        body: serverTf("push_reengage_body", locale, { name: displayName }),
        icon: "/apple-touch-icon.png",
        badge: "/favicon.svg",
        tag: `reengage-7d-${new Date().toISOString().slice(0, 10)}`,
        url: "/palace",
      };

      pushCount++;
      reengagePromises.push(
        sendPush(pushSub, payload).then((ok) => {
          if (ok) stats.reengage.pushSent++;
          else stats.reengage.errors++;
        })
      );
    }
  }

  // ── 14-day & 30-day inactive: re-engagement emails ──
  for (const days of [14, 30] as const) {
    const target = reengageTargets.find((t) => t.days === days)!;
    const users = (inactiveProfiles || []).filter(
      (p: { last_seen_at: string }) =>
        p.last_seen_at >= target.dateStart && p.last_seen_at <= target.dateEnd
    );

    for (const profile of users) {
      if (dripCount + stats.reengage.emailSent >= MAX_EMAILS_PER_RUN) break;

      // Skip unsubscribed users
      if (profile.email_digest === false) continue;

      const email = reengageEmailMap.get(profile.id);
      if (!email) continue;

      const memCount = reengageMemoryCount.get(profile.id) || 0;

      reengagePromises.push(
        sendReminderEmail({
          type: "re_engagement",
          recipientEmail: email,
          displayName: profile.display_name || email.split("@")[0],
          locale: profile.preferred_locale || "en",
          daysSinceLogin: days,
          memoryCount: memCount,
        }).then((result) => {
          if (result.success) stats.reengage.emailSent++;
          else stats.reengage.errors++;
        })
      );
    }
  }

  // ── Execute all sends in parallel ──
  await Promise.allSettled([...dripPromises, ...reengagePromises]);

  return NextResponse.json({
    drip: stats.drip,
    reengage: stats.reengage,
    timestamp: now.toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

/** Vercel Cron sends GET requests. POST delegates to GET for manual/testing use. */
export async function POST(request: Request) {
  return GET(request);
}
