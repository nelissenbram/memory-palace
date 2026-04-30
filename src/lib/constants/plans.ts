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
      wings: 2,
      rooms: 5,
      memories: 100,
      storageMb: 2048,
    },
    featureKeys: [
      "feat2Wings",
      "feat5Rooms",
      "feat100Memories",
      "featBasicUpload",
      "feat2gbStorage",
      "featBasicExport",
    ],
  },
  keeper: {
    id: "keeper",
    nameKey: "keeperName",
    taglineKey: "keeperTagline",
    price: 9.99,
    monthlyPrice: 12.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID || "",
    monthlyStripePriceId: process.env.NEXT_PUBLIC_STRIPE_KEEPER_MONTHLY_PRICE_ID || "",
    limits: {
      wings: 3,
      rooms: 10,
      memories: 500,
      storageMb: 20480,
    },
    featureKeys: [
      "feat4Wings",
      "feat10Rooms",
      "feat500Memories",
      "featAllUpload",
      "feat20gbStorage",
      "featCloudImport",
      "featInterviews",
      "featSharing",
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID || "",
    monthlyStripePriceId: process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_MONTHLY_PRICE_ID || "",
    limits: {
      wings: -1,
      rooms: -1,
      memories: -1,
      storageMb: 102400,
    },
    featureKeys: [
      "featUnlimitedWings",
      "featUnlimitedRooms",
      "featUnlimitedMemories",
      "featAllMedia",
      "feat100gbStorage",
      "featFamilySharing",
      "featLegacy",
      "featTimeCapsules",
      "featPrioritySupport",
      "featAdvancedExport",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "keeper", "guardian"];
