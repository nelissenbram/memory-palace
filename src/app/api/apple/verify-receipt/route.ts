import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// App Store Server API v2 (uses JWT + App Store Server API)
// For simplicity, we use the verifyReceipt endpoint (deprecated but simpler)
// TODO: migrate to App Store Server API v2 with JWT when Apple deprecates this

const APPLE_VERIFY_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map Apple product IDs to our plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "ai.thememorypalace.keeper.monthly": "keeper",
  "ai.thememorypalace.keeper.annual": "keeper",
  "ai.thememorypalace.guardian.monthly": "guardian",
  "ai.thememorypalace.guardian.annual": "guardian",
};

interface AppleReceiptInfo {
  product_id: string;
  original_transaction_id: string;
  expires_date_ms?: string;
  is_trial_period?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await rateLimit(`apple-verify:${user.id}`, 30, 3_600_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await req.json();
    const receiptData =
      body.receipt?.transactions?.[0]?.appStoreReceipt ||
      body.receipt?.nativeData?.appStoreReceipt ||
      body.receiptData;

    if (!receiptData) {
      return NextResponse.json(
        { error: "No receipt data provided" },
        { status: 400 }
      );
    }

    // Verify with Apple
    const verifyPayload = {
      "receipt-data": receiptData,
      password: process.env.APPLE_SHARED_SECRET,
      "exclude-old-transactions": true,
    };

    let appleRes = await fetch(APPLE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyPayload),
    });
    let appleData = await appleRes.json();

    // Status 21007 = sandbox receipt sent to production — retry against sandbox
    if (appleData.status === 21007) {
      appleRes = await fetch(APPLE_SANDBOX_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyPayload),
      });
      appleData = await appleRes.json();
    }

    if (appleData.status !== 0) {
      console.error("[Apple] Verification failed, status:", appleData.status);
      return NextResponse.json(
        { ok: false, error: `Apple verification failed (${appleData.status})` },
        { status: 400 }
      );
    }

    // Find the latest subscription receipt
    const latestReceipts: AppleReceiptInfo[] =
      appleData.latest_receipt_info || [];
    const activeReceipt = latestReceipts
      .filter((r: AppleReceiptInfo) => PRODUCT_TO_PLAN[r.product_id])
      .sort(
        (a: AppleReceiptInfo, b: AppleReceiptInfo) =>
          Number(b.expires_date_ms || 0) - Number(a.expires_date_ms || 0)
      )[0];

    if (!activeReceipt) {
      return NextResponse.json(
        { ok: false, error: "No valid subscription found in receipt" },
        { status: 400 }
      );
    }

    const plan = PRODUCT_TO_PLAN[activeReceipt.product_id] || "free";
    const expiresAt = activeReceipt.expires_date_ms
      ? new Date(Number(activeReceipt.expires_date_ms)).toISOString()
      : null;
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    const isTrial = activeReceipt.is_trial_period === "true";

    const admin = getAdminClient();
    const otxid = activeReceipt.original_transaction_id;

    // ── Ownership guard: one Apple transaction may only entitle ONE account. ──
    // Reject if this original_transaction_id is already linked to a DIFFERENT
    // user (family sharing / leaked-receipt entitlement theft). The service-role
    // client bypasses RLS, so this check must be enforced here in code.
    const { data: existingLink } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("apple_original_transaction_id", otxid)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingLink) {
      console.warn(
        `[Apple] Rejecting receipt: transaction ${otxid} already linked to user ${existingLink.user_id}, requested by ${user.id}`
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "This purchase is already linked to another account.",
        },
        { status: 409 }
      );
    }

    // ── Reconcile any terminating webhook notifications that arrived before the
    // transaction was linked to this user (see /api/apple/webhook). If Apple has
    // already revoked/refunded/expired this transaction, honor that now so the
    // link cannot resurrect a dead entitlement. ──
    const { data: pending } = await admin
      .from("apple_pending_notifications")
      .select("terminated")
      .eq("apple_original_transaction_id", otxid)
      .maybeSingle();
    const revoked = pending?.terminated === true;

    // Update subscription in DB
    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan: isExpired || revoked ? "free" : plan,
        status: isExpired
          ? "canceled"
          : revoked
          ? "canceled"
          : isTrial
          ? "trialing"
          : "active",
        current_period_end: expiresAt,
        subscription_source: "apple",
        apple_original_transaction_id: otxid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    console.log(
      `[Apple] Subscription verified for user ${user.id}: ${plan} (expires: ${expiresAt})`
    );

    return NextResponse.json({
      ok: true,
      id: activeReceipt.original_transaction_id,
      transaction: {
        type: "application",
        id: activeReceipt.product_id,
      },
    });
  } catch (err) {
    console.error("[Apple] Verify receipt error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
