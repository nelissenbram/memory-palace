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

    // Fetch referral info — try with referral_rewards first, fall back without
    // (the column may not exist yet if migration hasn't run)
    let profile: Record<string, unknown> | null = null;
    let hasRewardsColumn = true;

    const { data: fullProfile, error: fullError } = await admin
      .from("profiles")
      .select("referral_code, referral_count, referral_rewards")
      .eq("id", user.id)
      .single();

    if (fullError) {
      // If the error is about the referral_rewards column, retry without it
      const errMsg = fullError.message ?? "";
      if (errMsg.includes("referral_rewards") || fullError.code === "PGRST204") {
        hasRewardsColumn = false;
        const { data: basicProfile, error: basicError } = await admin
          .from("profiles")
          .select("referral_code, referral_count")
          .eq("id", user.id)
          .single();

        if (basicError || !basicProfile) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        profile = basicProfile as Record<string, unknown>;
      } else {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
    } else {
      profile = fullProfile as Record<string, unknown>;
    }

    if (!profile) {
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
      referralCount: (profile.referral_count as number) ?? 0,
      rewards: hasRewardsColumn ? ((profile.referral_rewards as unknown[]) ?? []) : [],
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

    // Read the caller's own referral_code so we can reject self-referral before
    // taking the atomic gate. (referred_by is checked atomically below, not here,
    // to avoid a read-then-write TOCTOU race.)
    const { data: currentProfile } = await admin
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    // Prevent self-referral
    if (currentProfile?.referral_code === code) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Validate referral code exists
    const { data: referrer, error: referrerError } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Belt-and-suspenders self-referral guard by id (in case code lookup differs)
    if (referrer.id === user.id) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // ── ATOMIC GATE ──
    // The WRITE — not a prior read — is the gate. This conditional UPDATE only
    // succeeds when referred_by is currently NULL. Two concurrent POSTs cannot
    // both win: exactly one row is updated; the other returns zero rows and
    // aborts BEFORE minting any Stripe coupon. Eliminates duplicate-coupon and
    // lost-update races.
    const { data: gated, error: gateError } = await admin
      .from("profiles")
      .update({ referred_by: code })
      .eq("id", user.id)
      .is("referred_by", null)
      .select("id");

    if (gateError) {
      console.error("[referral] Update referred_by error:", gateError);
      return NextResponse.json({ error: "Could not apply referral" }, { status: 500 });
    }

    // Zero rows → another request already set referred_by (or it was already set).
    // Do NOT mint a reward.
    if (!gated || gated.length === 0) {
      return NextResponse.json({ error: "Already referred" }, { status: 400 });
    }

    // Atomically increment the referrer's count (server-side SQL, no stale read).
    const { error: countError } = await admin.rpc("increment_referral_count", {
      p_referrer_id: referrer.id,
    });

    if (countError) {
      console.error("[referral] Increment count error:", countError);
    }

    // Create Stripe coupon reward for the REFERRER: 1 free month of Guardian (EUR 24.99).
    // Only reached AFTER the atomic gate above won, so it runs at most once per
    // referred user. A deterministic idempotency key protects against client
    // retries / at-least-once delivery re-creating the coupon in Stripe.
    try {
      const stripe = getStripe();
      const idempotencyKey = `referral_${user.id}`;

      const coupon = await stripe.coupons.create(
        {
          duration: "once",
          amount_off: 2499, // EUR 24.99 in cents
          currency: "eur",
          name: "Referral Reward — 1 Free Month Guardian",
          metadata: {
            referrer_id: referrer.id,
            referred_user_id: user.id,
            type: "referral_reward",
          },
        },
        { idempotencyKey: `${idempotencyKey}_coupon` }
      );

      const promotionCode = await stripe.promotionCodes.create(
        {
          promotion: { type: "coupon", coupon: coupon.id },
          max_redemptions: 1,
          metadata: {
            referrer_id: referrer.id,
            type: "referral_reward",
          },
        },
        { idempotencyKey: `${idempotencyKey}_promo` }
      );

      // Append the reward to the referrer's rewards array atomically (jsonb append
      // in SQL — no read-modify-write lost-update race).
      const newReward = {
        promo_code: promotionCode.code,
        promo_id: promotionCode.id,
        coupon_id: coupon.id,
        created_at: new Date().toISOString(),
        redeemed: false,
      };

      const { error: appendError } = await admin.rpc("append_referral_reward", {
        p_referrer_id: referrer.id,
        p_reward: newReward,
      });

      if (appendError) {
        console.error("[referral] Append reward error:", appendError);
      }

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
