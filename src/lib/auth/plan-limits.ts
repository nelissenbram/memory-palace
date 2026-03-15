"use server";

import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId, type PlanLimits } from "@/lib/constants/plans";

export interface UserSubscription {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export async function getUserPlan(userId?: string): Promise<UserSubscription> {
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

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan].limits;
}

export type ResourceType = "wings" | "rooms" | "memories" | "storageMb";

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
  const limits = getPlanLimits(subscription.plan);
  const limit = limits[resource];

  // Unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, plan: subscription.plan };
  }

  let current = 0;

  switch (resource) {
    case "wings": {
      const { count } = await supabase
        .from("wings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      current = count || 0;
      break;
    }
    case "rooms": {
      const { count } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      current = count || 0;
      break;
    }
    case "memories": {
      const { count } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      current = count || 0;
      break;
    }
    case "storageMb": {
      // Estimate from memories file_size column if available
      const { data } = await supabase
        .from("memories")
        .select("file_size")
        .eq("user_id", userId);
      if (data) {
        const totalBytes = data.reduce((sum, m) => sum + (m.file_size || 0), 0);
        current = Math.round(totalBytes / (1024 * 1024));
      }
      break;
    }
  }

  return {
    allowed: current < limit,
    current,
    limit,
    plan: subscription.plan,
  };
}
