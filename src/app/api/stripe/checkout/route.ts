import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/constants/plans";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    maxNetworkRetries: 2,
    timeout: 10000,
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { plan } = (await req.json()) as { plan: PlanId };

    if (!plan || !PLANS[plan] || plan === "free") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planDef = PLANS[plan];
    if (!planDef.stripePriceId) {
      return NextResponse.json({ error: "Plan has no price configured" }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: planDef.stripePriceId.trim(),
          quantity: 1,
        },
      ],
      subscription_data: planDef.trial
        ? { trial_period_days: planDef.trial }
        : undefined,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      success_url: `${siteUrl}/settings/subscription?success=true`,
      cancel_url: `${siteUrl}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const details = err instanceof Error ? err.stack : String(err);
    const stripeCode = (err as { code?: string })?.code;
    const stripeType = (err as { type?: string })?.type;
    console.error("Checkout error:", { message, stripeCode, stripeType, details });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
