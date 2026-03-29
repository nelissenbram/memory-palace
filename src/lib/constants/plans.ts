export type PlanId = "free" | "keeper" | "guardian";

export interface PlanDefinition {
  id: PlanId;
  nameKey: string;
  taglineKey: string;
  price: number; // EUR per month, 0 for free
  stripePriceId: string | null; // null for free plan
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
    stripePriceId: null,
    limits: {
      wings: 2,
      rooms: 5,
      memories: 100,
      storageMb: 1024,
    },
    featureKeys: [
      "feat2Wings",
      "feat5Rooms",
      "feat50Memories",
      "featBasicUpload",
      "featBasicExport",
    ],
  },
  keeper: {
    id: "keeper",
    nameKey: "keeperName",
    taglineKey: "keeperTagline",
    price: 4.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID || "",
    limits: {
      wings: 3,
      rooms: 10,
      memories: 500,
      storageMb: 5120,
    },
    featureKeys: [
      "feat4Wings",
      "feat10Rooms",
      "feat500Memories",
      "featAllUpload",
      "featCloudImport",
      "featInterviews",
      "featSharing",
    ],
    trial: 14,
  },
  guardian: {
    id: "guardian",
    nameKey: "guardianName",
    taglineKey: "guardianTagline",
    price: 9.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID || "",
    limits: {
      wings: -1,
      rooms: -1,
      memories: -1,
      storageMb: 51200,
    },
    featureKeys: [
      "featUnlimitedWings",
      "featUnlimitedRooms",
      "featUnlimitedMemories",
      "featAllMedia",
      "featFamilySharing",
      "featLegacy",
      "featTimeCapsules",
      "featPrioritySupport",
      "featAdvancedExport",
    ],
    highlighted: true,
    trial: 14,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "keeper", "guardian"];
