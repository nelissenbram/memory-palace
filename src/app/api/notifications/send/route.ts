import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { sendPush, type PushSubscriptionJSON, type NotificationPayload } from "@/lib/push";
import { serverT, serverTf } from "@/lib/i18n/server";
import type { Locale } from "@/i18n/config";

/**
 * POST /api/notifications/send
 *
 * Cron-triggered endpoint that:
 * 1. Finds memories with "On This Day" anniversaries
 * 2. Finds time capsules with revealDate === today
 * 3. Sends web push to all subscribed users
 *
 * Secured via CRON_SECRET header (set as env var, same as Vercel cron secret).
 *
 * Vercel cron config (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/notifications/send",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

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

  // Use service role client to read all users' data
  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const today = new Date();
  const month = today.getMonth() + 1; // 1-indexed for SQL
  const day = today.getDate();
  const todayISO = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

  let sent = 0;
  let expired = 0;

  // ── 1. "On This Day" memories ──
  // Find memories created before this year (only prior years can have "on this day" matches).
  // Filter to exclude current year since we only want anniversaries, and cap at 10,000 rows
  // as a safety limit to prevent unbounded reads.
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();
  const { data: otdMemories } = await supabase
    .from("memories")
    .select("id, title, user_id, created_at")
    .not("created_at", "is", null)
    .lt("created_at", startOfYear)
    .limit(10000);

  // Group anniversaries by user
  const otdByUser: Record<string, { title: string; yearsAgo: number }[]> = {};
  if (otdMemories) {
    for (const mem of otdMemories) {
      const created = new Date(mem.created_at);
      if (
        created.getMonth() + 1 === month &&
        created.getDate() === day &&
        created.getFullYear() < today.getFullYear()
      ) {
        if (!otdByUser[mem.user_id]) otdByUser[mem.user_id] = [];
        otdByUser[mem.user_id].push({
          title: mem.title,
          yearsAgo: today.getFullYear() - created.getFullYear(),
        });
      }
    }
  }

  // ── 2. Time capsule reveals ──
  // Find memories with reveal_date matching today
  // The reveal_date is stored as an ISO date string in the mem JSON.
  // Since memories table stores it as a column or in the JSON...
  // Check if there's a reveal_date column:
  const { data: capsuleMemories } = await supabase
    .from("memories")
    .select("id, title, user_id")
    .eq("reveal_date", todayISO);

  const capsuleByUser: Record<string, string[]> = {};
  if (capsuleMemories) {
    for (const mem of capsuleMemories) {
      if (!capsuleByUser[mem.user_id]) capsuleByUser[mem.user_id] = [];
      capsuleByUser[mem.user_id].push(mem.title);
    }
  }

  // ── 3. Get all push subscriptions ──
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, keys_p256dh, keys_auth, on_this_day, time_capsule");

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, expired: 0, message: "No subscriptions" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // ── 3b. Fetch user locales for i18n push content ──
  const allUserIds = [...new Set(subscriptions.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, preferred_locale")
    .in("id", allUserIds);

  const userLocaleMap: Record<string, Locale> = {};
  if (profiles) {
    for (const p of profiles) {
      userLocaleMap[p.id] = (p.preferred_locale as Locale) || "en";
    }
  }

  // ── 4. Send notifications ──
  const expiredEndpoints: string[] = [];

  for (const sub of subscriptions) {
    const locale = userLocaleMap[sub.user_id] || "en";
    const pushSub: PushSubscriptionJSON = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
    };

    // "On This Day" notification
    if (sub.on_this_day && otdByUser[sub.user_id]?.length) {
      const memories = otdByUser[sub.user_id];
      const count = memories.length;
      const first = memories[0];
      const yearWord = serverT(first.yearsAgo === 1 ? "push_year_singular" : "push_year_plural", locale);
      const payload: NotificationPayload = {
        title: serverT("push_otd_title", locale),
        body:
          count === 1
            ? serverTf("push_otd_single", locale, { title: first.title, years: String(first.yearsAgo), yearWord })
            : serverTf("push_otd_multi", locale, { count: String(count), title: first.title }),
        icon: "/apple-touch-icon.png",
        badge: "/favicon.svg",
        tag: `otd-${todayISO}`,
        url: "/palace",
      };

      const ok = await sendPush(pushSub, payload);
      if (ok) sent++;
      else expiredEndpoints.push(sub.endpoint);
    }

    // Time capsule notification
    if (sub.time_capsule && capsuleByUser[sub.user_id]?.length) {
      const titles = capsuleByUser[sub.user_id];
      const payload: NotificationPayload = {
        title: serverT("push_capsule_title", locale),
        body:
          titles.length === 1
            ? serverTf("push_capsule_single", locale, { title: titles[0] })
            : serverTf("push_capsule_multi", locale, { count: String(titles.length) }),
        icon: "/apple-touch-icon.png",
        badge: "/favicon.svg",
        tag: `capsule-${todayISO}`,
        url: "/palace",
      };

      const ok = await sendPush(pushSub, payload);
      if (ok) sent++;
      else if (!expiredEndpoints.includes(sub.endpoint)) {
        expiredEndpoints.push(sub.endpoint);
      }
    }
  }

  // ── 5. Clean up expired subscriptions ──
  if (expiredEndpoints.length > 0) {
    for (const endpoint of expiredEndpoints) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint);
      expired++;
    }
  }

  return NextResponse.json({
    sent,
    expired,
    otdUsers: Object.keys(otdByUser).length,
    capsuleUsers: Object.keys(capsuleByUser).length,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// Also support GET — intentional for Vercel Cron compatibility (cron sends GET)
export async function GET(request: Request) {
  return POST(request);
}
