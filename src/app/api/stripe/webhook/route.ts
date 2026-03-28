import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { maxNetworkRetries: 2, timeout: 10000 });
}

// Use service-role client for webhook (no user context)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPeriodEnd(sub: Stripe.Subscription): string | null {
  // Handle both old and new Stripe SDK shapes
  const raw = (sub as unknown as Record<string, unknown>).current_period_end;
  if (typeof raw === "number") return new Date(raw * 1000).toISOString();
  if (typeof raw === "string") return raw;
  return null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) break;

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            plan,
            status: subscription.status === "trialing" ? "trialing" : "active",
            current_period_end: getPeriodEnd(subscription),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Map Stripe status to our status
        let status: string;
        switch (subscription.status) {
          case "active":
            status = "active";
            break;
          case "trialing":
            status = "trialing";
            break;
          case "past_due":
            status = "past_due";
            break;
          case "canceled":
          case "unpaid":
            status = "canceled";
            break;
          default:
            status = subscription.status;
        }

        // Determine plan from price
        const priceId = subscription.items.data[0]?.price?.id;
        let plan = "free";
        if (priceId === process.env.STRIPE_KEEPER_PRICE_ID) plan = "keeper";
        if (priceId === process.env.STRIPE_GUARDIAN_PRICE_ID) plan = "guardian";

        await supabase
          .from("subscriptions")
          .update({
            plan,
            status,
            current_period_end: getPeriodEnd(subscription),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook handler error:", message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
