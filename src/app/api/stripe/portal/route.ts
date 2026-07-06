import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { maxNetworkRetries: 2, timeout: 10000 });
}

export async function POST() {
  const stripe = getStripe();
  try {
    // iOS is free-tier only (Apple Guideline 3.1.1) — never open a Stripe billing
    // portal (manage/cancel subscription) for a native iOS request.
    const ua = (await headers()).get("user-agent") || "";
    const platform = (await cookies()).get("mp_platform")?.value;
    if (ua.includes("MemoryPalace-iOS") || platform === "ios") {
      return NextResponse.json({ error: "Not available" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await rateLimit(`portal:${user.id}`, 10, 3_600_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/settings/subscription`,
    });

    return NextResponse.json({ url: session.url }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Portal error:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
