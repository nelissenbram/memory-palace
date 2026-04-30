import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { sendRenewalEmail, getRenewalPushCopy } from "@/lib/email/send-renewal";
import { sendPush, type PushSubscriptionJSON } from "@/lib/push";

/**
 * GET /api/cron/pre-renewal
 *
 * Daily cron that sends pre-renewal value summary emails to paid subscribers
 * whose subscription renews in exactly 14 or 7 days.
 *
 * At 7 days: also sends a push notification reminder.
 *
 * Secured via CRON_SECRET header.
 * Vercel cron: daily at 10:00 AM — "0 10 * * *"
 */

export const maxDuration = 30;

const MAX_EMAILS_PER_RUN = 50;

// Locale date formatting per locale
const localeDateFormats: Record<string, string> = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
};

function formatDate(date: Date, locale: string): string {
  const code = localeDateFormats[locale] || "en-US";
  return date.toLocaleDateString(code, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function GET(request: Request) {
  // Verify cron secret — fail-closed if not configured.
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
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const now = new Date();

  // Calculate date windows: exactly 14 days and 7 days from now
  const day14 = new Date(now);
  day14.setDate(day14.getDate() + 14);
  const day7 = new Date(now);
  day7.setDate(day7.getDate() + 7);

  // We match subscriptions whose current_period_end falls on those dates (same calendar day)
  const day14Start = new Date(day14.getFullYear(), day14.getMonth(), day14.getDate()).toISOString();
  const day14End = new Date(day14.getFullYear(), day14.getMonth(), day14.getDate() + 1).toISOString();
  const day7Start = new Date(day7.getFullYear(), day7.getMonth(), day7.getDate()).toISOString();
  const day7End = new Date(day7.getFullYear(), day7.getMonth(), day7.getDate() + 1).toISOString();

  // Fetch paid, active subscriptions renewing in 14 or 7 days
  const { data: subs14, error: err14 } = await supabase
    .from("subscriptions")
    .select("user_id, plan, current_period_end")
    .in("plan", ["keeper", "guardian"])
    .eq("status", "active")
    .gte("current_period_end", day14Start)
    .lt("current_period_end", day14End)
    .limit(MAX_EMAILS_PER_RUN);

  const { data: subs7, error: err7 } = await supabase
    .from("subscriptions")
    .select("user_id, plan, current_period_end")
    .in("plan", ["keeper", "guardian"])
    .eq("status", "active")
    .gte("current_period_end", day7Start)
    .lt("current_period_end", day7End)
    .limit(MAX_EMAILS_PER_RUN);

  if (err14 || err7) {
    console.error("[PreRenewal] Query error:", err14?.message, err7?.message);
    return NextResponse.json(
      { error: "Failed to query subscriptions" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Merge into a map with daysUntilRenewal flag
  type SubEntry = { user_id: string; plan: string; current_period_end: string; daysUntilRenewal: 14 | 7 };
  const subMap = new Map<string, SubEntry>();

  for (const s of subs14 || []) {
    subMap.set(s.user_id, { ...s, daysUntilRenewal: 14 });
  }
  // 7-day entries override 14-day (edge case: shouldn't happen, but be safe)
  for (const s of subs7 || []) {
    subMap.set(s.user_id, { ...s, daysUntilRenewal: 7 });
  }

  if (subMap.size === 0) {
    return NextResponse.json(
      { message: "No renewals upcoming", emailsSent: 0, pushSent: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const userIds = Array.from(subMap.keys());

  // Batch fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_locale")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p: { id: string; display_name: string | null; preferred_locale: string | null }) => [p.id, p]),
  );

  // Batch fetch auth emails
  const emailMap = new Map<string, string>();
  let authPage = 1;
  while (true) {
    const { data: authListData, error: authListError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
      page: authPage,
    });
    if (authListError || !authListData?.users?.length) break;
    for (const authUser of authListData.users) {
      if (subMap.has(authUser.id) && authUser.email) {
        emailMap.set(authUser.id, authUser.email);
      }
    }
    if (authListData.users.length < 1000) break;
    authPage++;
  }

  // Batch fetch stats: memories count per user
  const { data: memoryCounts } = await supabase
    .from("memories")
    .select("user_id")
    .in("user_id", userIds);

  const memoryCountMap = new Map<string, number>();
  for (const m of memoryCounts || []) {
    memoryCountMap.set(m.user_id, (memoryCountMap.get(m.user_id) || 0) + 1);
  }

  // Batch fetch stats: rooms count per user
  const { data: roomCounts } = await supabase
    .from("rooms")
    .select("user_id")
    .in("user_id", userIds);

  const roomCountMap = new Map<string, number>();
  for (const r of roomCounts || []) {
    roomCountMap.set(r.user_id, (roomCountMap.get(r.user_id) || 0) + 1);
  }

  // Batch fetch stats: family members per user
  const { data: familyCounts } = await supabase
    .from("family_members")
    .select("user_id")
    .in("user_id", userIds);

  const familyCountMap = new Map<string, number>();
  for (const f of familyCounts || []) {
    familyCountMap.set(f.user_id, (familyCountMap.get(f.user_id) || 0) + 1);
  }

  // Batch fetch storage: sum of file_size per user from memories
  const { data: storageData } = await supabase
    .from("memories")
    .select("user_id, file_size")
    .in("user_id", userIds);

  const storageMap = new Map<string, number>();
  for (const m of storageData || []) {
    storageMap.set(m.user_id, (storageMap.get(m.user_id) || 0) + (m.file_size || 0));
  }

  let emailsSent = 0;
  let pushSent = 0;
  let errors = 0;

  // Cap plan name for display (capitalize first letter)
  const planLabel = (plan: string) => plan.charAt(0).toUpperCase() + plan.slice(1);

  for (const [userId, sub] of Array.from(subMap.entries())) {
    if (emailsSent >= MAX_EMAILS_PER_RUN) break;

    const email = emailMap.get(userId);
    if (!email) continue;

    const profile = profileMap.get(userId);
    const displayName = profile?.display_name || email.split("@")[0];
    const locale = profile?.preferred_locale || "en";
    const renewalDate = formatDate(new Date(sub.current_period_end), locale);
    const plan = planLabel(sub.plan);
    const storageMb = Math.round((storageMap.get(userId) || 0) / (1024 * 1024));

    const result = await sendRenewalEmail({
      recipientEmail: email,
      displayName,
      locale,
      planName: plan,
      renewalDate,
      stats: {
        memories: memoryCountMap.get(userId) || 0,
        rooms: roomCountMap.get(userId) || 0,
        familyMembers: familyCountMap.get(userId) || 0,
        storageMb,
      },
    });

    if (result.success) {
      emailsSent++;
    } else {
      const redacted = `***@${email.split("@")[1]}`;
      console.error(`[PreRenewal] Email failed for ${redacted}:`, result.error);
      errors++;
    }

    // At 7 days: also send push notification
    if (sub.daysUntilRenewal === 7) {
      try {
        const { data: pushSubs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, keys_p256dh, keys_auth")
          .eq("user_id", userId);

        if (pushSubs && pushSubs.length > 0) {
          const pushCopy = getRenewalPushCopy(plan, renewalDate, locale);
          for (const ps of pushSubs) {
            try {
              const subscription: PushSubscriptionJSON = {
                endpoint: ps.endpoint,
                keys: { p256dh: ps.keys_p256dh, auth: ps.keys_auth },
              };
              const ok = await sendPush(subscription, {
                title: pushCopy.title,
                body: pushCopy.body,
                icon: "/apple-touch-icon.png",
                badge: "/favicon.svg",
                tag: `renewal-reminder-${userId}`,
                url: "/palace/settings/subscription",
              });
              if (ok) pushSent++;
            } catch {
              // Ignore individual push failures
            }
          }
        }
      } catch {
        // Push infrastructure may not be configured
      }
    }
  }

  return NextResponse.json(
    {
      emailsSent,
      pushSent,
      errors,
      totalCandidates: subMap.size,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Vercel Cron sends GET requests. POST delegates to GET for manual/testing use. */
export async function POST(request: Request) {
  return GET(request);
}
