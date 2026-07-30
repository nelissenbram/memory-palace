import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { maxNetworkRetries: 2, timeout: 10000 });
}

/**
 * Syncs the local subscription record with Stripe's actual state.
 * Called when the subscription page detects a potential mismatch
 * (e.g. stripe_customer_id exists but plan shows "free").
 */
export async function POST() {
  const stripe = getStripe();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await rateLimit(`stripe-sync:${user.id}`, 5, 3_600_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, plan, status, subscription_source")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ synced: false, reason: "no_customer" });
    }

    // If this row is now owned by an Apple IAP entitlement, a Stripe sync must not
    // touch it — otherwise a user with a stale Stripe customer could downgrade their
    // live Apple entitlement to free by triggering a sync. Only reconcile Stripe-owned
    // (or legacy NULL-source) rows.
    if (sub.subscription_source === "apple") {
      return NextResponse.json({ synced: false, reason: "apple_owned" });
    }

    // Fetch active subscriptions from Stripe for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: sub.stripe_customer_id,
      status: "all",
      limit: 5,
    });

    const active = subscriptions.data.find(s =>
      ["active", "trialing", "past_due"].includes(s.status)
    );

    if (active) {
      // Determine plan from price ID
      const priceId = active.items.data[0]?.price?.id;
      const keeperPrices = [
        process.env.STRIPE_KEEPER_PRICE_ID,
        process.env.STRIPE_KEEPER_MONTHLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_KEEPER_MONTHLY_PRICE_ID,
      ].filter(Boolean);
      const guardianPrices = [
        process.env.STRIPE_GUARDIAN_PRICE_ID,
        process.env.STRIPE_GUARDIAN_MONTHLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_MONTHLY_PRICE_ID,
      ].filter(Boolean);

      let plan = "free";
      if (keeperPrices.includes(priceId!)) plan = "keeper";
      if (guardianPrices.includes(priceId!)) plan = "guardian";

      // If plan is still "free" but there's an active subscription, default to keeper
      if (plan === "free") plan = "keeper";

      const status = active.status === "trialing" ? "trialing" : active.status === "past_due" ? "past_due" : "active";

      const periodEnd = typeof (active as unknown as Record<string, unknown>).current_period_end === "number"
        ? new Date(((active as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString()
        : null;

      await supabase
        .from("subscriptions")
        .update({
          plan,
          status,
          stripe_subscription_id: active.id,
          current_period_end: periodEnd,
          // A verified active Stripe subscription claims this row for Stripe.
          subscription_source: "stripe",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .or("subscription_source.is.null,subscription_source.eq.stripe");

      return NextResponse.json({ synced: true, plan, status });
    } else {
      // No active subscription in Stripe — ensure local record reflects that
      if (sub.plan !== "free") {
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .or("subscription_source.is.null,subscription_source.eq.stripe");
      }

      return NextResponse.json({ synced: true, plan: "free", status: "canceled" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Stripe sync error:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
