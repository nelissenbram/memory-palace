export type PlanId = "free" | "keeper" | "guardian";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  price: number; // EUR per month, 0 for free
  stripePriceId: string | null; // null for free plan
  limits: PlanLimits;
  features: string[];
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
    name: "Free",
    tagline: "Start preserving your memories",
    price: 0,
    stripePriceId: null,
    limits: {
      wings: 1,
      rooms: 3,
      memories: 50,
      storageMb: 500,
    },
    features: [
      "1 wing",
      "3 rooms",
      "50 memories",
      "500 MB storage",
      "Basic sharing",
    ],
  },
  keeper: {
    id: "keeper",
    name: "Keeper",
    tagline: "For dedicated memory keepers",
    price: 4.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID || "",
    limits: {
      wings: 3,
      rooms: 10,
      memories: 500,
      storageMb: 5120,
    },
    features: [
      "3 wings",
      "10 rooms",
      "500 memories",
      "5 GB storage",
      "Public sharing",
      "AI features",
    ],
    trial: 14,
  },
  guardian: {
    id: "guardian",
    name: "Guardian",
    tagline: "The complete legacy experience",
    price: 9.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID || "",
    limits: {
      wings: -1,
      rooms: -1,
      memories: -1,
      storageMb: 51200,
    },
    features: [
      "Unlimited wings",
      "Unlimited rooms",
      "Unlimited memories",
      "50 GB storage",
      "Legacy features",
      "Priority support",
      "Family sharing",
    ],
    highlighted: true,
    trial: 14,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "keeper", "guardian"];
