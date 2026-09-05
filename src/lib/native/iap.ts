/**
 * Apple In-App Purchase module using cordova-plugin-purchase.
 * Only active on iOS — returns null/no-op on other platforms.
 *
 * CdvPurchase is a global injected by the Cordova plugin at runtime.
 * We use `any` typing since it's only available inside the native app.
 */

import { isIOS } from "./platform";

// Product IDs — must match App Store Connect configuration
export const IAP_PRODUCTS = {
  keeper_monthly: "ai.thememorypalace.keeper.monthly",
  keeper_annual: "ai.thememorypalace.keeper.annual",
  guardian_monthly: "ai.thememorypalace.guardian.monthly",
  guardian_annual: "ai.thememorypalace.guardian.annual",
} as const;

export type IAPProductId = (typeof IAP_PRODUCTS)[keyof typeof IAP_PRODUCTS];

/**
 * Master switch for iOS In-App Purchases. Defined in the dependency-free
 * ./iap-flags module (so the Edge middleware can import it without pulling in
 * Capacitor) and re-exported here for existing client imports.
 */
export { IAP_ENABLED } from "./iap-flags";

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceMicros: number;
  currency: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null;
let initialized = false;
let initError: string | null = null;
let purchaseHandlersBound = false;

/**
 * In-flight purchase promises keyed by productId. The store's approved/verified/
 * error handlers are bound ONCE at init (see bindPurchaseHandlers) and route
 * results back to the correct pending order via this map, so retries never
 * accumulate duplicate global listeners on the singleton store.
 */
const pendingPurchases = new Map<string, (ok: boolean) => void>();

function settlePurchase(productId: string, ok: boolean) {
  const resolve = pendingPurchases.get(productId);
  if (resolve) {
    pendingPurchases.delete(productId);
    resolve(ok);
  }
}

/** Returns the last initialization error message, or null if init succeeded. */
export function getIAPError(): string | null { return initError; }

function getCdv(): any {
  if (typeof window !== "undefined" && (window as any).CdvPurchase) {
    return (window as any).CdvPurchase;
  }
  return null;
}

function getStore(): any {
  if (!isIOS()) return null;
  const cdv = getCdv();
  return cdv?.store ?? null;
}

/** Initialize the IAP store. Call once on app start. */
export async function initIAP(): Promise<boolean> {
  if (initialized) return true;
  if (!isIOS()) return false;

  initError = null;
  store = getStore();
  if (!store) {
    initError = "IAP store not available. Please restart the app.";
    console.warn("[IAP] CdvPurchase.store not available");
    return false;
  }

  const cdv = getCdv();

  // Register products
  store.register([
    {
      id: IAP_PRODUCTS.keeper_monthly,
      type: cdv.ProductType.PAID_SUBSCRIPTION,
      platform: cdv.Platform.APPLE_APPSTORE,
    },
    {
      id: IAP_PRODUCTS.keeper_annual,
      type: cdv.ProductType.PAID_SUBSCRIPTION,
      platform: cdv.Platform.APPLE_APPSTORE,
    },
    {
      id: IAP_PRODUCTS.guardian_monthly,
      type: cdv.ProductType.PAID_SUBSCRIPTION,
      platform: cdv.Platform.APPLE_APPSTORE,
    },
    {
      id: IAP_PRODUCTS.guardian_annual,
      type: cdv.ProductType.PAID_SUBSCRIPTION,
      platform: cdv.Platform.APPLE_APPSTORE,
    },
  ]);

  // Set up receipt validation via our server
  store.validator = async (receipt: any) => {
    try {
      const res = await fetch("/api/apple/verify-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt }),
      });
      const data = await res.json();
      if (data.ok) {
        return {
          ok: true,
          data: {
            id: data.id || "",
            latest_receipt: true,
            transaction: data.transaction || {},
          },
        };
      }
      return { ok: false, message: data.error || "Verification failed" };
    } catch (err) {
      console.error("[IAP] Validation error:", err);
      return { ok: false, message: "Network error during validation" };
    }
  };

  // Bind approved/verified/error handlers exactly once (see bindPurchaseHandlers).
  // This also auto-finishes verified transactions.
  bindPurchaseHandlers();

  try {
    await store.initialize([cdv.Platform.APPLE_APPSTORE]);
    initialized = true;
    console.log("[IAP] Initialized successfully");
    return true;
  } catch (err) {
    initError = "Could not connect to the App Store. Check your internet connection.";
    console.error("[IAP] Initialization failed:", err);
    return false;
  }
}

/** True once the store is initialized and at least one product's price has loaded. */
export function isIAPReady(): boolean {
  return initialized && !!store && getAllProducts().length > 0;
}

/**
 * Resolves true once at least one product with a real price has loaded from the
 * App Store, or false after `timeoutMs`. cordova-plugin-purchase populates
 * products asynchronously AFTER store.initialize() resolves, so a successful
 * init alone does NOT mean anything is purchasable. Gate purchase UI on this —
 * never on initIAP()'s return value — so we never show an Upgrade button that
 * errors on tap when products aren't actually available (Apple Guideline 2.1).
 */
export async function waitForProducts(timeoutMs = 10000): Promise<boolean> {
  if (!isIOS()) return false;
  if (isIAPReady()) return true;
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (isIAPReady()) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, 300);
    };
    tick();
  });
}

/** Get product info (price, title, etc.) */
export function getProduct(productId: string): IAPProduct | null {
  if (!store) return null;
  const cdv = getCdv();
  const product = store.get(productId, cdv?.Platform.APPLE_APPSTORE);
  if (!product) return null;

  const offer = product.getOffer?.();
  const pricing = offer?.pricingPhases?.[0];

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: pricing?.price || product.pricing?.price || "—",
    priceMicros: pricing?.priceMicros || product.pricing?.priceMicros || 0,
    currency: pricing?.currency || product.pricing?.currency || "USD",
  };
}

/** Get all registered products with their pricing */
export function getAllProducts(): IAPProduct[] {
  if (!store) return [];
  return Object.values(IAP_PRODUCTS)
    .map((id) => getProduct(id))
    .filter((p): p is IAPProduct => p !== null);
}

/**
 * Bind the store's approved/verified/error listeners exactly once. Repeated
 * purchase attempts route through the pendingPurchases map instead of stacking
 * fresh global listeners on the singleton store (which would let a later verify
 * resolve stale promises, or an unrelated error resolve(false) a live order).
 */
function bindPurchaseHandlers() {
  if (purchaseHandlersBound || !store) return;
  purchaseHandlersBound = true;

  store.when().approved((transaction: any) => {
    // Verify every approved transaction so the receipt validator runs and the
    // subscription is finished even when no order() is in flight (restores).
    transaction.verify();
  });

  store.when().verified((receipt: any) => {
    receipt.finish();
    const products = receipt.sourceReceipt?.products ?? [];
    for (const p of products) {
      settlePurchase(p.id, true);
    }
  });

  store.error((error: any) => {
    console.error("[IAP] Purchase error:", error);
    // Correlate the error to a specific in-flight order when the plugin
    // surfaces a productId; otherwise fail the most recent pending order.
    const errProductId: string | undefined = error?.productId;
    if (errProductId && pendingPurchases.has(errProductId)) {
      settlePurchase(errProductId, false);
    } else if (pendingPurchases.size > 0) {
      const lastKey = Array.from(pendingPurchases.keys()).pop()!;
      settlePurchase(lastKey, false);
    }
  });
}

/** Purchase a subscription product. Returns true on success. */
export async function purchase(productId: string): Promise<boolean> {
  if (!store) {
    console.error("[IAP] Store not initialized");
    return false;
  }

  bindPurchaseHandlers();

  const cdv = getCdv();
  const offer = store
    .get(productId, cdv?.Platform.APPLE_APPSTORE)
    ?.getOffer?.();
  if (!offer) {
    console.error("[IAP] Product not found:", productId);
    return false;
  }

  // If an attempt for this product is already in flight, fail the stale one so
  // its promise never dangles, then start fresh.
  settlePurchase(productId, false);

  return new Promise<boolean>((resolve) => {
    pendingPurchases.set(productId, resolve);

    store.order(offer).then((error: any) => {
      if (error) {
        console.error("[IAP] Order error:", error);
        settlePurchase(productId, false);
      }
    });
  });
}

/** Open the iOS system "Manage Subscriptions" UI (Apple Guideline 3.1.2). */
export async function manageSubscriptions(): Promise<void> {
  const cdv = getCdv();
  try {
    if (cdv?.store?.manageSubscriptions) {
      await cdv.store.manageSubscriptions();
      return;
    }
  } catch {
    /* fall through to the App Store subscriptions URL */
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: "https://apps.apple.com/account/subscriptions" });
  } catch {
    try { window.open("https://apps.apple.com/account/subscriptions", "_blank"); } catch {}
  }
}

/** Restore previous purchases (e.g., after reinstall) */
export async function restorePurchases(): Promise<boolean> {
  if (!store) return false;
  try {
    await store.restorePurchases();
    return true;
  } catch {
    return false;
  }
}

/** Map our plan+interval to IAP product ID */
export function getIAPProductId(
  plan: "keeper" | "guardian",
  interval: "monthly" | "annual"
): string {
  return IAP_PRODUCTS[`${plan}_${interval}`];
}
