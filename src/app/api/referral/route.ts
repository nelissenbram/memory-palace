import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    maxNetworkRetries: 2,
    timeout: 10000,
  });
}

/**
 * GET /api/referral
 * Returns the current user's referral code and referral count.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch referral info
    const { data: profile, error } = await admin
      .from("profiles")
      .select("referral_code, referral_count, referral_rewards")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Generate referral code if not yet set
    let referralCode = profile.referral_code;
    if (!referralCode) {
      referralCode = user.id.substring(0, 8).toUpperCase();
      await admin
        .from("profiles")
        .update({ referral_code: referralCode })
        .eq("id", user.id);
    }

    return NextResponse.json({
      referralCode,
      referralCount: profile.referral_count ?? 0,
      rewards: profile.referral_rewards ?? [],
    });
  } catch (err) {
    console.error("[referral] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/referral
 * Applies a referral code to the current user.
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const code = (body.code as string || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check if user has already been referred
    const { data: currentProfile } = await admin
      .from("profiles")
      .select("referred_by, referral_code")
      .eq("id", user.id)
      .single();

    if (currentProfile?.referred_by) {
      return NextResponse.json({ error: "Already referred" }, { status: 400 });
    }

    // Prevent self-referral
    if (currentProfile?.referral_code === code) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Validate referral code exists
    const { data: referrer, error: referrerError } = await admin
      .from("profiles")
      .select("id, referral_count")
      .eq("referral_code", code)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Apply referral: set referred_by on current user
    const { error: updateError } = await admin
      .from("profiles")
      .update({ referred_by: code })
      .eq("id", user.id);

    if (updateError) {
      console.error("[referral] Update referred_by error:", updateError);
      return NextResponse.json({ error: "Could not apply referral" }, { status: 500 });
    }

    // Increment referrer's count
    const { error: countError } = await admin
      .from("profiles")
      .update({ referral_count: (referrer.referral_count ?? 0) + 1 })
      .eq("id", referrer.id);

    if (countError) {
      console.error("[referral] Increment count error:", countError);
    }

    // Create Stripe coupon reward for the REFERRER: 1 free month of Guardian (EUR 24.99)
    try {
      const stripe = getStripe();

      const coupon = await stripe.coupons.create({
        duration: "once",
        amount_off: 2499, // EUR 24.99 in cents
        currency: "eur",
        name: "Referral Reward — 1 Free Month Guardian",
        metadata: {
          referrer_id: referrer.id,
          referred_user_id: user.id,
          type: "referral_reward",
        },
      });

      const promotionCode = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        max_redemptions: 1,
        metadata: {
          referrer_id: referrer.id,
          type: "referral_reward",
        },
      });

      // Store the promotion code in the referrer's profile rewards array
      const { data: referrerProfile } = await admin
        .from("profiles")
        .select("referral_rewards")
        .eq("id", referrer.id)
        .single();

      const existingRewards = referrerProfile?.referral_rewards ?? [];
      const newReward = {
        promo_code: promotionCode.code,
        promo_id: promotionCode.id,
        coupon_id: coupon.id,
        created_at: new Date().toISOString(),
        redeemed: false,
      };

      await admin
        .from("profiles")
        .update({
          referral_rewards: [...existingRewards, newReward],
        })
        .eq("id", referrer.id);

      console.log(`[referral] Created promo code ${promotionCode.code} for referrer ${referrer.id}`);
    } catch (stripeErr) {
      // Log but don't fail the referral — the referral itself succeeded
      console.error("[referral] Stripe coupon creation error:", stripeErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[referral] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
