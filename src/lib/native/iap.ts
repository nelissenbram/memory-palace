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

  store = getStore();
  if (!store) {
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

  // Auto-finish verified transactions
  store.when().verified((receipt: any) => {
    receipt.finish();
  });

  await store.initialize([cdv.Platform.APPLE_APPSTORE]);
  initialized = true;
  console.log("[IAP] Initialized successfully");
  return true;
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

/** Purchase a subscription product. Returns true on success. */
export async function purchase(productId: string): Promise<boolean> {
  if (!store) {
    console.error("[IAP] Store not initialized");
    return false;
  }

  const cdv = getCdv();
  const offer = store
    .get(productId, cdv?.Platform.APPLE_APPSTORE)
    ?.getOffer?.();
  if (!offer) {
    console.error("[IAP] Product not found:", productId);
    return false;
  }

  return new Promise((resolve) => {
    store.when().approved((transaction: any) => {
      if (transaction.products.some((p: any) => p.id === productId)) {
        transaction.verify();
      }
    });

    store.when().verified((receipt: any) => {
      if (receipt.sourceReceipt.products.some((p: any) => p.id === productId)) {
        receipt.finish();
        resolve(true);
      }
    });

    store.error((error: any) => {
      console.error("[IAP] Purchase error:", error);
      resolve(false);
    });

    store.order(offer).then((error: any) => {
      if (error) {
        console.error("[IAP] Order error:", error);
        resolve(false);
      }
    });
  });
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
