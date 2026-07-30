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

// A Stripe webhook may only write rows that Stripe owns. The shared single-row
// `subscriptions` table also holds Apple IAP entitlements (subscription_source='apple');
// Stripe events must never clobber those. Legacy / placeholder Stripe rows created
// before this column existed have subscription_source = NULL, so "Stripe-owned" means
// source is 'stripe' OR NULL (i.e. explicitly NOT 'apple'). These are static literals,
// so this .or() carries no injection risk.
const STRIPE_OWNED_FILTER = "subscription_source.is.null,subscription_source.eq.stripe";

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
            // Claim this row for Stripe. A completed Stripe checkout is an explicit,
            // user-driven purchase, so it is the one Stripe event allowed to take
            // ownership of the shared single-row subscription from any prior source.
            subscription_source: "stripe",
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

        // Determine plan from price (check both annual and monthly price IDs)
        const priceId = subscription.items.data[0]?.price?.id;
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

        let plan: string | null = null;
        if (keeperPrices.includes(priceId!)) plan = "keeper";
        if (guardianPrices.includes(priceId!)) plan = "guardian";

        // If the price ID matches no known plan (missing/rotated/typo'd env var, or a
        // newly created Stripe price), DO NOT write plan:'free' — that would silently
        // revoke a paying customer's keeper/guardian features. Update only status +
        // period, leave the existing plan untouched, and log the unmatched price loudly.
        const isEntitled = status === "active" || status === "trialing" || status === "past_due";
        const updatePayload: Record<string, unknown> = {
          status,
          current_period_end: getPeriodEnd(subscription),
          updated_at: new Date().toISOString(),
        };
        if (plan !== null) {
          updatePayload.plan = plan;
        } else if (!isEntitled) {
          // Non-entitled (canceled/unpaid) + no plan match: safe to drop to free.
          updatePayload.plan = "free";
        } else {
          console.error(
            `[Stripe Webhook] subscription.updated: unmatched priceId "${priceId}" for active/trialing customer ${customerId} — preserving existing plan (check STRIPE_*_PRICE_ID env vars).`
          );
        }

        // Only Stripe-owned rows may be mutated by Stripe events. An Apple IAP
        // entitlement (subscription_source='apple') must not be clobbered by a stale
        // Stripe customer's subscription events.
        await supabase
          .from("subscriptions")
          .update(updatePayload)
          .eq("stripe_customer_id", customerId)
          .or(STRIPE_OWNED_FILTER);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Only downgrade a Stripe-owned row. Prevents a stale Stripe customer's
        // subscription.deleted from revoking a live Apple IAP entitlement that now
        // owns the shared single-row subscription.
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .or(STRIPE_OWNED_FILTER);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only mark a Stripe-owned row past_due; never touch an Apple-owned row.
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .or(STRIPE_OWNED_FILTER);

        break;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook handler error:", message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
