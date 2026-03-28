import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Temporary diagnostic endpoint — remove after debugging
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-test-secret");
  if (secret !== "mp-stripe-test-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyPrefix = process.env.STRIPE_SECRET_KEY?.slice(0, 12) || "NOT_SET";
  const keyLength = process.env.STRIPE_SECRET_KEY?.length || 0;
  const keeperPrice = process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID || "NOT_SET";
  const guardianPrice = process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID || "NOT_SET";

  const diagnostics: Record<string, unknown> = {
    keyPrefix,
    keyLength,
    keeperPrice,
    guardianPrice,
  };

  // Test 1: Direct fetch to Stripe API (bypasses SDK)
  try {
    const directRes = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!.trim()}`,
      },
    });
    const directBody = await directRes.json();
    diagnostics.directFetch = { status: directRes.status, ok: directRes.ok, currency: directBody.available?.[0]?.currency };
  } catch (err: unknown) {
    diagnostics.directFetch = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test 2: Stripe SDK
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
      maxNetworkRetries: 1,
      timeout: 15000,
    });
    const balance = await stripe.balance.retrieve();
    diagnostics.sdkConnected = true;
    diagnostics.currency = balance.available?.[0]?.currency || "unknown";
  } catch (err: unknown) {
    diagnostics.sdkConnected = false;
    diagnostics.sdkError = err instanceof Error ? err.message : String(err);
    diagnostics.sdkErrorType = (err as { type?: string })?.type;
  }

  return NextResponse.json(diagnostics);
}
