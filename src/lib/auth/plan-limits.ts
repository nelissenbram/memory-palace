"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId, type PlanLimits } from "@/lib/constants/plans";

export interface UserSubscription {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const FREE_SUBSCRIPTION: UserSubscription = {
  plan: "free",
  status: "active",
  currentPeriodEnd: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

/**
 * True when the current request originates from the iOS app. On iOS the app is
 * free-tier only — subscriptions purchased on the web (or any other platform)
 * are never unlocked (Apple Guideline 3.1.1 / 3.1.3). Detected via the
 * `mp_platform=ios` cookie set in NativeInit and the `MemoryPalace-iOS` UA
 * marker from capacitor.config.ts. Wrapped in try/catch because cookies()/
 * headers() throw outside a request scope (e.g. cron jobs), where we correctly
 * fall back to the real plan.
 */
export async function isIOSRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("mp_platform")?.value === "ios") return true;
  } catch { /* not in a request scope */ }
  try {
    const h = await headers();
    if ((h.get("user-agent") || "").includes("MemoryPalace-iOS")) return true;
  } catch { /* not in a request scope */ }
  return false;
}

export async function getUserPlan(userId?: string): Promise<UserSubscription> {
  // iOS now honors the real entitlement (multiplatform model): a plan bought via
  // Apple IAP (subscription_source='apple') OR on the web (Stripe) unlocks the
  // same features everywhere — Apple permits honoring cross-platform subscriptions
  // because the iOS app ALSO offers In-App Purchase. Anti-steering (Guideline
  // 3.1.1) is enforced at the UI layer: iOS shows the IAP paywall only, never
  // web/Stripe pricing or external purchase links. No coercion here anymore.
  const supabase = await createClient();

  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }

  if (!uid) {
    return {
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", uid)
    .single();

  if (!data) {
    return {
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  return {
    plan: data.plan as PlanId,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
  };
}

export async function getPlanLimits(plan: PlanId): Promise<PlanLimits> {
  return PLANS[plan].limits;
}

export async function getEffectiveStorageLimit(userId: string): Promise<number> {
  const subscription = await getUserPlan(userId);
  return PLANS[subscription.plan].limits.storageMb;
}

export type ResourceType = "wings" | "rooms" | "memories" | "storageMb" | "familyTreePersons";

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number; // -1 = unlimited
  plan: PlanId;
}

export async function checkLimit(
  userId: string,
  resource: ResourceType
): Promise<LimitCheckResult> {
  const supabase = await createClient();
  const subscription = await getUserPlan(userId);
  const limits = await getPlanLimits(subscription.plan);

  // Wings, rooms, memories are now unlimited for all plans
  if (resource === "wings" || resource === "rooms" || resource === "memories") {
    return { allowed: true, current: 0, limit: -1, plan: subscription.plan };
  }

  if (resource === "familyTreePersons") {
    const familyTreeLimit = subscription.plan === "free" ? 25 : -1;
    if (familyTreeLimit === -1) {
      return { allowed: true, current: 0, limit: -1, plan: subscription.plan };
    }
    const { count } = await supabase
      .from("family_tree_persons")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const current = count || 0;
    return { allowed: current < familyTreeLimit, current, limit: familyTreeLimit, plan: subscription.plan };
  }

  // storageMb — apply grandfathering for legacy free users
  const effectiveLimit = await getEffectiveStorageLimit(userId);
  if (effectiveLimit === -1) {
    return { allowed: true, current: 0, limit: -1, plan: subscription.plan };
  }

  const { data } = await supabase
    .from("memories")
    .select("file_size")
    .eq("user_id", userId);
  let current = 0;
  if (data) {
    const totalBytes = data.reduce((sum, m) => sum + (m.file_size || 0), 0);
    current = Math.round(totalBytes / (1024 * 1024));
  }

  return {
    allowed: current < effectiveLimit,
    current,
    limit: effectiveLimit,
    plan: subscription.plan,
  };
}

// ── Interview quota ──
export interface InterviewQuotaResult {
  allowed: boolean;
  unlimited: boolean;
  used: number;
  limit: number;
  nextRespawnDate: string | null;
}

export async function checkInterviewQuota(userId: string): Promise<InterviewQuotaResult> {
  const subscription = await getUserPlan(userId);

  if (subscription.plan === "keeper" || subscription.plan === "guardian") {
    return { allowed: true, unlimited: true, used: 0, limit: -1, nextRespawnDate: null };
  }

  const supabase = await createClient();

  // Count completed interview sessions
  const { count } = await supabase
    .from("interview_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const used = count || 0;

  // Get account creation date for respawn calculation
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .single();

  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const now = new Date();
  const monthsSinceSignup = Math.floor(
    (now.getTime() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
  );

  // 2 base + 1 per month, capped at 14
  const quota = Math.min(2 + monthsSinceSignup, 14);

  let nextRespawnDate: string | null = null;
  if (used >= quota && monthsSinceSignup < 12) {
    const nextMonth = new Date(createdAt);
    nextMonth.setDate(nextMonth.getDate() + (monthsSinceSignup + 1) * 30);
    nextRespawnDate = nextMonth.toISOString();
  }

  return {
    allowed: used < quota,
    unlimited: false,
    used,
    limit: quota,
    nextRespawnDate,
  };
}

// ── Auto-tag quota ──
// Persistent daily counter stored in Supabase `usage_counters` table.

export interface AutoTagQuotaResult {
  allowed: boolean;
  unlimited: boolean;
  used: number;
  limit: number;
}

export async function checkAutoTagQuota(userId: string): Promise<AutoTagQuotaResult> {
  const subscription = await getUserPlan(userId);

  if (subscription.plan === "keeper" || subscription.plan === "guardian") {
    return { allowed: true, unlimited: true, used: 0, limit: -1 };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("usage_counters")
    .select("counter_value")
    .eq("user_id", userId)
    .eq("counter_key", "ai_tag")
    .eq("counter_date", today)
    .maybeSingle();

  const used = data?.counter_value ?? 0;
  const limit = 5;

  return { allowed: used < limit, unlimited: false, used, limit };
}

export async function incrementAutoTagCount(userId: string, batchSize: number): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Read current value then upsert (atomic enough for per-user daily counters)
  const { data } = await supabase
    .from("usage_counters")
    .select("counter_value")
    .eq("user_id", userId)
    .eq("counter_key", "ai_tag")
    .eq("counter_date", today)
    .maybeSingle();

  const current = data?.counter_value ?? 0;

  await supabase
    .from("usage_counters")
    .upsert(
      {
        user_id: userId,
        counter_key: "ai_tag",
        counter_date: today,
        counter_value: current + batchSize,
      },
      { onConflict: "user_id,counter_key,counter_date" }
    );
}

// ── Photo-restore quota ──
// free: 10 total (lifetime, never resets) · keeper: 50/month · guardian: 200/month.
// Stored in usage_counters under counter_key "photo_restore", always keyed to the
// first-of-month row; free sums every month (lifetime), paid checks the current month.
const RESTORE_KEY = "photo_restore";

export interface PhotoRestoreQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  period: "lifetime" | "month";
}

function firstOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function checkPhotoRestoreQuota(userId: string): Promise<PhotoRestoreQuotaResult> {
  const subscription = await getUserPlan(userId);
  const supabase = await createClient();

  if (subscription.plan === "free") {
    // Lifetime total across every month's counter row.
    const { data } = await supabase
      .from("usage_counters")
      .select("counter_value")
      .eq("user_id", userId)
      .eq("counter_key", RESTORE_KEY);
    const used = (data || []).reduce((n, r) => n + ((r as { counter_value?: number }).counter_value ?? 0), 0);
    return { allowed: used < 10, used, limit: 10, period: "lifetime" };
  }

  const limit = subscription.plan === "guardian" ? 200 : 50;
  const { data } = await supabase
    .from("usage_counters")
    .select("counter_value")
    .eq("user_id", userId)
    .eq("counter_key", RESTORE_KEY)
    .eq("counter_date", firstOfMonthISO())
    .maybeSingle();
  const used = data?.counter_value ?? 0;
  return { allowed: used < limit, used, limit, period: "month" };
}

export async function incrementPhotoRestore(userId: string): Promise<void> {
  const supabase = await createClient();
  const month = firstOfMonthISO();
  const { data } = await supabase
    .from("usage_counters")
    .select("counter_value")
    .eq("user_id", userId)
    .eq("counter_key", RESTORE_KEY)
    .eq("counter_date", month)
    .maybeSingle();
  const current = data?.counter_value ?? 0;
  await supabase
    .from("usage_counters")
    .upsert(
      { user_id: userId, counter_key: RESTORE_KEY, counter_date: month, counter_value: current + 1 },
      { onConflict: "user_id,counter_key,counter_date" }
    );
}
