export type PlanId = "free" | "keeper" | "guardian";
export type BillingInterval = "monthly" | "annual";

export interface PlanDefinition {
  id: PlanId;
  nameKey: string;
  taglineKey: string;
  price: number; // EUR per month (annual rate)
  monthlyPrice: number; // EUR per month (monthly rate), 0 for free
  stripePriceId: string | null; // annual Stripe price ID, null for free plan
  monthlyStripePriceId: string | null; // monthly Stripe price ID
  limits: PlanLimits;
  featureKeys: string[];
  highlighted?: boolean;
  trial?: number; // trial days
}

export interface PlanLimits {
  wings: number;       // -1 = unlimited
  rooms: number;       // -1 = unlimited
  memories: number;    // -1 = unlimited
  storageMb: number;   // -1 = unlimited
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    nameKey: "freeName",
    taglineKey: "freeTagline",
    price: 0,
    monthlyPrice: 0,
    stripePriceId: null,
    monthlyStripePriceId: null,
    limits: {
      wings: -1,
      rooms: -1,
      memories: -1,
      storageMb: 1024,
    },
    featureKeys: [
      "feat1gbStorage",
      "featAllMedia",
      "featGoogleImport",
      "feat2Interviews",
      "featAutoTag5",
      "featFamilyTree25",
      "featFullExport",
    ],
  },
  keeper: {
    id: "keeper",
    nameKey: "keeperName",
    taglineKey: "keeperTagline",
    price: 9.99,
    monthlyPrice: 12.99,
    stripePriceId: (process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID || "").replace(/[\r\n]/g, "").replace("\\n", "").trim(),
    monthlyStripePriceId: (process.env.NEXT_PUBLIC_STRIPE_KEEPER_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID || "").replace(/[\r\n]/g, "").replace("\\n", "").trim(),
    limits: {
      wings: -1,
      rooms: -1,
      memories: -1,
      storageMb: 25600,
    },
    featureKeys: [
      "feat25gbStorage",
      "featAllMedia",
      "featAllCloudImport",
      "featUnlimitedInterviews",
      "featUnlimitedAutoTag",
      "featCollab5",
      "featUnlimitedFamilyTree",
      "featFullExport",
    ],
    highlighted: true,
    trial: 7,
  },
  guardian: {
    id: "guardian",
    nameKey: "guardianName",
    taglineKey: "guardianTagline",
    price: 19.99,
    monthlyPrice: 24.99,
    stripePriceId: (process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID || "").replace(/[\r\n]/g, "").replace("\\n", "").trim(),
    monthlyStripePriceId: (process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID || "").replace(/[\r\n]/g, "").replace("\\n", "").trim(),
    limits: {
      wings: -1,
      rooms: -1,
      memories: -1,
      storageMb: 102400,
    },
    featureKeys: [
      "feat100gbStorage",
      "featAllMedia",
      "featAllCloudImport",
      "featUnlimitedInterviews",
      "featUnlimitedAutoTag",
      "featUnlimitedCollab",
      "featUnlimitedFamilyTree",
      "featLegacy",
      "featTimeCapsules",
      "featPrioritySupport",
      "featAdvancedExport",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "keeper", "guardian"];
