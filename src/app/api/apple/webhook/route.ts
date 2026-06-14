import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Apple App Store Server Notifications V2.
 * Configure in App Store Connect > App > App Information > App Store Server Notifications.
 * URL: https://www.thememorypalace.ai/api/apple/webhook
 */

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PRODUCT_TO_PLAN: Record<string, string> = {
  "ai.thememorypalace.keeper.monthly": "keeper",
  "ai.thememorypalace.keeper.annual": "keeper",
  "ai.thememorypalace.guardian.monthly": "guardian",
  "ai.thememorypalace.guardian.annual": "guardian",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Apple sends a signed JWS (JSON Web Signature) payload
    // For V2 notifications, the payload is in signedPayload
    const signedPayload = body.signedPayload;
    if (!signedPayload) {
      console.error("[Apple Webhook] No signedPayload");
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Decode the JWS payload (base64url-encoded JSON in the middle part)
    // In production, you should verify the JWS signature using Apple's certificates
    const parts = signedPayload.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Invalid JWS" }, { status: 400 });
    }

    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);

    const notificationType = payload.notificationType;
    const subtype = payload.subtype;

    // Decode the transaction info
    const signedTransactionInfo = payload.data?.signedTransactionInfo;
    const signedRenewalInfo = payload.data?.signedRenewalInfo;

    let transactionInfo: Record<string, unknown> = {};
    if (signedTransactionInfo) {
      const txParts = signedTransactionInfo.split(".");
      if (txParts.length === 3) {
        transactionInfo = JSON.parse(
          Buffer.from(txParts[1], "base64url").toString("utf8")
        );
      }
    }

    let renewalInfo: Record<string, unknown> = {};
    if (signedRenewalInfo) {
      const rnParts = signedRenewalInfo.split(".");
      if (rnParts.length === 3) {
        renewalInfo = JSON.parse(
          Buffer.from(rnParts[1], "base64url").toString("utf8")
        );
      }
    }

    const originalTransactionId =
      (transactionInfo.originalTransactionId as string) || "";
    const productId = (transactionInfo.productId as string) || "";
    const expiresDate = transactionInfo.expiresDate as number | undefined;

    console.log(
      `[Apple Webhook] ${notificationType}/${subtype || "-"} for ${originalTransactionId} (${productId})`
    );

    if (!originalTransactionId) {
      return NextResponse.json({ ok: true }); // nothing to update
    }

    const supabase = getAdminClient();

    // Find the user by their apple_original_transaction_id
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("user_id, plan")
      .eq("apple_original_transaction_id", originalTransactionId)
      .single();

    if (!subscription) {
      console.warn(
        `[Apple Webhook] No subscription found for transaction: ${originalTransactionId}`
      );
      return NextResponse.json({ ok: true });
    }

    const plan = PRODUCT_TO_PLAN[productId] || subscription.plan;
    const expiresAt = expiresDate
      ? new Date(expiresDate).toISOString()
      : null;

    switch (notificationType) {
      case "DID_RENEW":
      case "SUBSCRIBED":
        await supabase
          .from("subscriptions")
          .update({
            plan,
            status: "active",
            current_period_end: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("apple_original_transaction_id", originalTransactionId);
        break;

      case "DID_FAIL_TO_RENEW":
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("apple_original_transaction_id", originalTransactionId);
        break;

      case "EXPIRED":
      case "REVOKE":
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            current_period_end: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("apple_original_transaction_id", originalTransactionId);
        break;

      case "DID_CHANGE_RENEWAL_STATUS":
        if (subtype === "AUTO_RENEW_DISABLED") {
          // User turned off auto-renew — still active until period end
          // No status change needed, they keep access until expiry
        }
        break;

      case "OFFER_REDEEMED":
      case "PRICE_INCREASE":
      case "GRACE_PERIOD_EXPIRED":
        // Log but don't change status
        break;

      default:
        console.log(
          `[Apple Webhook] Unhandled notification: ${notificationType}`
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Apple Webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
