import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/notifications/subscribe
 * Save or update a push subscription for the authenticated user.
 *
 * Body: { subscription: PushSubscriptionJSON }
 *
 * -- Supabase migration (run once in SQL editor): --
 * CREATE TABLE IF NOT EXISTS push_subscriptions (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   endpoint TEXT NOT NULL,
 *   keys_p256dh TEXT NOT NULL,
 *   keys_auth TEXT NOT NULL,
 *   on_this_day BOOLEAN DEFAULT true,
 *   time_capsule BOOLEAN DEFAULT true,
 *   memory_milestones BOOLEAN DEFAULT true,
 *   family_activity BOOLEAN DEFAULT true,
 *   interview_reminders BOOLEAN DEFAULT true,
 *   weekly_summary_push BOOLEAN DEFAULT false,
 *   system_updates BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(user_id, endpoint)
 * );
 *
 * ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can manage own push subscriptions"
 *   ON push_subscriptions FOR ALL
 *   USING (auth.uid() = user_id)
 *   WITH CHECK (auth.uid() = user_id);
 *
 * -- The service role bypasses RLS and can read all rows for sending
 * -- notifications. No broad USING(true) SELECT policy is needed.
 *
 * -- Migration to add new columns to existing table:
 * -- ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS memory_milestones BOOLEAN DEFAULT true;
 * -- ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS family_activity BOOLEAN DEFAULT true;
 * -- ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS interview_reminders BOOLEAN DEFAULT true;
 * -- ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS weekly_summary_push BOOLEAN DEFAULT false;
 * -- ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS system_updates BOOLEAN DEFAULT true;
 *
 * -- For email preferences on profiles table:
 * -- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_highlights BOOLEAN DEFAULT true;
 * -- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_updates_email BOOLEAN DEFAULT true;
 * ---
 */

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await rateLimit(`push-sub:${user.id}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const body = await request.json();
  const { subscription } = body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Upsert: if same user+endpoint already exists, update keys
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys.p256dh,
        keys_auth: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("[subscribe] Upsert failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * DELETE /api/notifications/subscribe
 * Remove the user's push subscription.
 */
export async function DELETE(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint } = body;

  if (endpoint) {
    // Remove specific subscription
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
  } else {
    // Remove all subscriptions for this user
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PATCH /api/notifications/subscribe
 * Update notification preferences (which types to receive).
 *
 * Push prefs (stored on push_subscriptions table):
 *   onThisDay, timeCapsule, memoryMilestones, familyActivity,
 *   interviewReminders, weeklySummaryPush, systemUpdates
 *
 * Email prefs (stored on profiles table):
 *   emailDigest, monthlyHighlights, familyUpdatesEmail
 */
export async function PATCH(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await rateLimit(`push-sub:${user.id}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const body = await request.json();

  // Handle push subscription preferences (camelCase -> snake_case mapping)
  const pushFieldMap: Record<string, string> = {
    onThisDay: "on_this_day",
    timeCapsule: "time_capsule",
    memoryMilestones: "memory_milestones",
    familyActivity: "family_activity",
    interviewReminders: "interview_reminders",
    weeklySummaryPush: "weekly_summary_push",
    systemUpdates: "system_updates",
  };

  const pushUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let hasPushUpdates = false;

  for (const [camel, snake] of Object.entries(pushFieldMap)) {
    if (typeof body[camel] === "boolean") {
      pushUpdates[snake] = body[camel];
      hasPushUpdates = true;
    }
  }

  if (hasPushUpdates) {
    const { error } = await supabase
      .from("push_subscriptions")
      .update(pushUpdates)
      .eq("user_id", user.id);

    if (error) {
      console.error("[subscribe] Push update failed:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  // Handle email preferences (stored on profiles table)
  const emailFieldMap: Record<string, string> = {
    emailDigest: "email_digest",
    monthlyHighlights: "monthly_highlights",
    familyUpdatesEmail: "family_updates_email",
  };

  const profileUpdates: Record<string, unknown> = {};
  let hasProfileUpdates = false;

  for (const [camel, snake] of Object.entries(emailFieldMap)) {
    if (typeof body[camel] === "boolean") {
      profileUpdates[snake] = body[camel];
      hasProfileUpdates = true;
    }
  }

  if (hasProfileUpdates) {
    const { error } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id);

    if (error) {
      console.error("[subscribe] Profile update failed:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
