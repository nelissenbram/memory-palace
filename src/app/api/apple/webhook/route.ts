import { NextRequest, NextResponse } from "next/server";

/**
 * Apple App Store Server Notifications V2.
 * Configure in App Store Connect > App > App Information > App Store Server Notifications.
 * URL: https://www.thememorypalace.ai/api/apple/webhook
 *
 * SECURITY (Apple Guideline 1.6 / 3.1.2): Apple signs each notification as a JWS.
 * This endpoint is public and unauthenticated, so a forged POST must NEVER be able to
 * change a subscriber's entitlement. Verifying the JWS requires validating the x5c
 * certificate chain up to Apple's root CA and the ES256 signature
 * (see @apple/app-store-server-library SignedDataVerifier). Until that verification is
 * implemented, we do NOT write entitlement state here — we only log the (unverified)
 * notification for observability and acknowledge it. Authoritative entitlement state is
 * written solely by the authenticated /api/apple/verify-receipt path, which the app calls
 * on launch and purchase, so renewals/expirations/refunds are reconciled there.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const signedPayload = body.signedPayload;
    if (!signedPayload) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Decode (NOT verify) the JWS payload purely for logging.
    const parts = signedPayload.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Invalid JWS" }, { status: 400 });
    }

    let notificationType = "?";
    let subtype = "-";
    let originalTransactionId = "";
    let productId = "";
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      notificationType = payload.notificationType || "?";
      subtype = payload.subtype || "-";
      const sti = payload.data?.signedTransactionInfo;
      if (sti) {
        const tx = sti.split(".");
        if (tx.length === 3) {
          const txInfo = JSON.parse(Buffer.from(tx[1], "base64url").toString("utf8"));
          originalTransactionId = txInfo.originalTransactionId || "";
          productId = txInfo.productId || "";
        }
      }
    } catch {
      /* malformed inner JWS — still acknowledge so Apple doesn't retry forever */
    }

    // Log only — do not trust this unverified payload to mutate any entitlement.
    console.log(
      `[Apple Webhook] (unverified, not applied) ${notificationType}/${subtype} ${originalTransactionId} ${productId}`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Apple Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
