import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  SignedDataVerifier,
  Environment,
  NotificationTypeV2,
} from "@apple/app-store-server-library";
import {
  appleRootCertificates,
  APP_APPLE_ID,
  APP_BUNDLE_ID,
} from "@/lib/apple/root-certs";
import { captureServer } from "@/lib/analytics-server";

/**
 * Apple App Store Server Notifications V2.
 * Configure in App Store Connect > App > App Information > App Store Server Notifications
 * (Production + Sandbox) → URL: https://www.thememorypalace.ai/api/apple/webhook
 *
 * SECURITY (Apple Guideline 1.6): this endpoint is public and unauthenticated, so a
 * forged POST must never change a subscriber's entitlement. Every notification is a
 * JWS signed by Apple; we validate the x5c certificate chain to Apple's Root CA and
 * the ES256 signature via SignedDataVerifier BEFORE touching the database. Only the
 * verified, decoded transaction drives entitlement changes.
 *
 * This reconciles renewals, cancellations, refunds, expirations and grace periods
 * server-to-server. The authenticated /api/apple/verify-receipt path remains the
 * source of truth at purchase/launch and links a transaction to a user.
 */

export const dynamic = "force-dynamic";

const PRODUCT_TO_PLAN: Record<string, "keeper" | "guardian"> = {
  "ai.thememorypalace.keeper.monthly": "keeper",
  "ai.thememorypalace.keeper.annual": "keeper",
  "ai.thememorypalace.guardian.monthly": "guardian",
  "ai.thememorypalace.guardian.annual": "guardian",
};

// Notification types that END entitlement (downgrade to free).
const TERMINATING = new Set<string>([
  NotificationTypeV2.EXPIRED,
  NotificationTypeV2.GRACE_PERIOD_EXPIRED,
  NotificationTypeV2.REVOKE,
  NotificationTypeV2.REFUND,
]);

// Notification types that (re)ACTIVATE or extend entitlement.
const ACTIVATING = new Set<string>([
  NotificationTypeV2.SUBSCRIBED,
  NotificationTypeV2.DID_RENEW,
  NotificationTypeV2.OFFER_REDEEMED,
  NotificationTypeV2.RENEWAL_EXTENDED,
  NotificationTypeV2.REFUND_REVERSED,
  NotificationTypeV2.PRICE_INCREASE,
  NotificationTypeV2.MIGRATION,
]);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Peek the (unverified) environment purely to choose the correct verifier; the
// signature is still fully validated afterward, so this cannot be spoofed into
// bypassing verification.
function peekEnvironment(signedPayload: string): Environment {
  try {
    const parts = signedPayload.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.data?.environment === "Sandbox"
      ? Environment.SANDBOX
      : Environment.PRODUCTION;
  } catch {
    return Environment.PRODUCTION;
  }
}

const verifierCache: Partial<Record<Environment, SignedDataVerifier>> = {};
function getVerifier(env: Environment): SignedDataVerifier {
  if (!verifierCache[env]) {
    verifierCache[env] = new SignedDataVerifier(
      appleRootCertificates(),
      true, // enableOnlineChecks (OCSP)
      env,
      APP_BUNDLE_ID,
      // appAppleId is required for Production; harmless for Sandbox.
      env === Environment.PRODUCTION ? APP_APPLE_ID : undefined
    );
  }
  return verifierCache[env]!;
}

export async function POST(req: NextRequest) {
  let body: { signedPayload?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const signedPayload = body.signedPayload;
  if (!signedPayload) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  // ── Verify the JWS signature + cert chain BEFORE trusting anything ──
  let notification;
  try {
    const verifier = getVerifier(peekEnvironment(signedPayload));
    notification = await verifier.verifyAndDecodeNotification(signedPayload);
  } catch (err) {
    // Verification failure = forged/tampered/misconfigured. Do NOT mutate state.
    console.error("[Apple Webhook] JWS verification failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const type = notification.notificationType as string;
  const subtype = notification.subtype || "-";

  // TEST notifications (App Store Connect "Send Test Notification") just confirm reachability.
  if (type === NotificationTypeV2.TEST) {
    console.log("[Apple Webhook] TEST notification verified OK");
    return NextResponse.json({ ok: true });
  }

  // Decode the signed transaction (already inside the verified envelope).
  const signedTx = notification.data?.signedTransactionInfo;
  if (!signedTx) {
    // Notifications without a transaction (e.g. some renewal-pref changes) — ack.
    console.log(`[Apple Webhook] ${type}/${subtype} (no transaction) — ack`);
    return NextResponse.json({ ok: true });
  }

  let tx;
  try {
    const verifier = getVerifier(peekEnvironment(signedPayload));
    tx = await verifier.verifyAndDecodeTransaction(signedTx);
  } catch (err) {
    console.error("[Apple Webhook] Transaction verification failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Invalid transaction" }, { status: 401 });
  }

  const originalTransactionId = tx.originalTransactionId;
  const productId = tx.productId || "";
  const plan = PRODUCT_TO_PLAN[productId];
  const expiresAt = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;

  if (!originalTransactionId || !plan) {
    console.log(`[Apple Webhook] ${type}/${subtype} — unmapped product ${productId} — ack`);
    return NextResponse.json({ ok: true });
  }

  // Map the transaction to the user linked at purchase time (verify-receipt).
  const admin = adminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("user_id, current_period_end")
    .eq("apple_original_transaction_id", originalTransactionId)
    .maybeSingle<{ user_id: string; current_period_end: string | null }>();

  if (!row) {
    // No linked user yet — verify-receipt hasn't run for this transaction (or the
    // link row was lost). Apple treats any 2xx as delivered and will NOT retry, so
    // silently acking would permanently drop terminating events (REVOKE / REFUND /
    // EXPIRED) for churned users who never relaunch — leaving a refunded user
    // entitled forever. Persist the verified outcome keyed by original_transaction_id
    // so verify-receipt can reconcile it when it later links the user.
    const isTerminating = TERMINATING.has(type);
    const isActivating = ACTIVATING.has(type);
    if (isTerminating || isActivating) {
      const { error: pendErr } = await admin
        .from("apple_pending_notifications")
        .upsert(
          {
            apple_original_transaction_id: originalTransactionId,
            product_id: productId,
            plan,
            // `terminated` is the authoritative flag verify-receipt reads: once a
            // terminating event lands it stays true and a later link cannot resurrect
            // the entitlement. Activating events only set it back to false.
            terminated: isTerminating,
            notification_type: type,
            notification_subtype: subtype,
            current_period_end: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "apple_original_transaction_id" }
        );
      if (pendErr) {
        // If we cannot durably record this, return non-2xx so Apple retries later
        // rather than dropping a terminating entitlement change.
        console.error(
          `[Apple Webhook] Failed to persist pending ${type} for ${originalTransactionId}:`,
          pendErr.message
        );
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      console.log(
        `[Apple Webhook] ${type}/${subtype} — no linked user for ${originalTransactionId} — queued for reconciliation (terminated=${isTerminating})`
      );
      return NextResponse.json({ ok: true });
    }
    console.log(`[Apple Webhook] ${type}/${subtype} — no linked user for ${originalTransactionId} — ack`);
    return NextResponse.json({ ok: true });
  }

  // ── Staleness guard (OPS-012) ──
  // Apple notifications can arrive late or be re-delivered out of order. Applying
  // a delayed/replayed EXPIRED that was emitted BEFORE a DID_RENEW would downgrade
  // a paying user. Only apply (de)activating events whose period end (falling back
  // to the signed transaction date) is >= the current_period_end already on file.
  // Equality must still apply: a legit EXPIRED carries exactly the stored period
  // end. Events without a comparable date, or rows without a stored period end,
  // pass through unchanged. Verification/idempotency logic above is untouched.
  if (TERMINATING.has(type) || ACTIVATING.has(type)) {
    const eventMs = tx.expiresDate ?? tx.signedDate ?? null;
    const storedMs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
    if (eventMs != null && storedMs != null && !Number.isNaN(storedMs) && eventMs < storedMs) {
      console.warn(
        `[Apple Webhook] STALE ${type}/${subtype} ignored for user ${row.user_id}: ` +
          `event date ${new Date(eventMs).toISOString()} < stored current_period_end ${row.current_period_end}`
      );
      return NextResponse.json({ ok: true });
    }
  }

  // ── Decide the new entitlement from the VERIFIED notification type ──
  let update: { plan: string; status: string; current_period_end: string | null } | null = null;
  if (TERMINATING.has(type)) {
    update = { plan: "free", status: "canceled", current_period_end: expiresAt };
  } else if (ACTIVATING.has(type)) {
    const isTrial = subtype === "INITIAL_BUY" && !!tx.offerType; // trial/intro offer
    update = { plan, status: isTrial ? "trialing" : "active", current_period_end: expiresAt };
  } else if (type === NotificationTypeV2.DID_FAIL_TO_RENEW) {
    // Billing retry: keep access (grace) but flag past_due; EXPIRED will downgrade later.
    update = { plan, status: "past_due", current_period_end: expiresAt };
  } else {
    // DID_CHANGE_RENEWAL_STATUS / _PREF, PRICE_CHANGE, METADATA_UPDATE, etc. —
    // no immediate entitlement change. Acknowledge without mutating.
    console.log(`[Apple Webhook] ${type}/${subtype} — no entitlement change — ack`);
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("subscriptions")
    .update({
      ...update,
      subscription_source: "apple",
      apple_original_transaction_id: originalTransactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id);

  if (error) {
    console.error("[Apple Webhook] DB update failed:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Funnel: purchase completed (iOS IAP). SUBSCRIBED only = first activation
  // (incl. resubscribe after a lapse) — DID_RENEW and the other ACTIVATING
  // types are renewals/extensions and must not re-fire the purchase milestone.
  // Fire-and-forget after the successful entitlement write; minimal, non-PII
  // props by design.
  if (type === NotificationTypeV2.SUBSCRIBED) {
    void captureServer(row.user_id, "purchase_completed", { plan, platform: "ios" });
  }

  console.log(
    `[Apple Webhook] ${type}/${subtype} applied for user ${row.user_id}: ${update.plan}/${update.status} (expires ${expiresAt})`
  );
  return NextResponse.json({ ok: true });
}
