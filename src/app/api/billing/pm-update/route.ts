import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { verifyPmUpdateToken } from "@/lib/billing/pm-update-token";
import { captureServer } from "@/lib/analytics-server";
import { rateLimit } from "@/lib/rate-limit";

/* ── /api/billing/pm-update?token=<hmac(uid,exp)> ──
 *
 * Trial-close click target (SUCCESS_PLAYBOOK Pillar 2 §1): the trial-ending
 * email cannot carry a live Billing-Portal URL (portal sessions are short-lived
 * and server-minted), so it links here instead. The signed token authenticates
 * the user WITHOUT a session — this route mints a fresh portal session focused
 * on payment-method update and 302s straight into it.
 */

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!.replace(/[\r\n]/g, "").replace("\\n", "").trim(), {
    maxNetworkRetries: 2,
    timeout: 10000,
  });
}

// Signed-out flow → service-role client (no user cookie context).
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const fallbackUrl = `${siteUrl}/settings/subscription`;

  try {
    // iOS is free-tier only (Apple Guideline 3.1.1) — never open a Stripe
    // billing surface for a native iOS request. Mirrors /api/stripe/portal.
    // (Email links opened in mobile Safari are NOT the native shell and pass.)
    const ua = req.headers.get("user-agent") || "";
    if (ua.includes("MemoryPalace-iOS") || req.cookies.get("mp_platform")?.value === "ios") {
      return NextResponse.json({ error: "Not available" }, { status: 403 });
    }

    const token = req.nextUrl.searchParams.get("token") || "";
    const userId = token ? verifyPmUpdateToken(token) : null;
    if (!userId) {
      // Invalid/expired token: land on the subscription page (auth wall takes
      // over) instead of a bare error — the user can still add a card there.
      return NextResponse.redirect(fallbackUrl, 302);
    }

    // Brute-force guard on the minting path (token is already HMAC-verified;
    // this only caps how often one user's link can mint portal sessions).
    const rl = await rateLimit(`pm-update:${userId}`, 10, 3_600_000);
    if (!rl.success) {
      return NextResponse.redirect(fallbackUrl, 302);
    }

    const supabase = getAdminClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, subscription_source")
      .eq("user_id", userId)
      .maybeSingle();

    // Only Stripe-owned rows may open the Stripe portal (never Apple IAP rows).
    if (
      !subscription?.stripe_customer_id ||
      (subscription.subscription_source && subscription.subscription_source !== "stripe")
    ) {
      return NextResponse.redirect(fallbackUrl, 302);
    }

    const stripe = getStripe();
    let session: Stripe.BillingPortal.Session;
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: fallbackUrl,
        flow_data: { type: "payment_method_update" },
      });
    } catch {
      // Portal config may not allow the focused flow yet (owner enables
      // payment-method update in Dashboard → Billing portal settings) — fall
      // back to the general portal rather than dead-ending the click.
      session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: fallbackUrl,
      });
    }

    // Funnel: the trial-close email's CTA was clicked and a portal session minted.
    await captureServer(userId, "trial_pm_update_clicked", { source: "email" });

    return NextResponse.redirect(session.url, 302);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[pm-update] error:", message);
    return NextResponse.redirect(fallbackUrl, 302);
  }
}
