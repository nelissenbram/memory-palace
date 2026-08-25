export type PlanId = "free" | "keeper" | "guardian";
export type BillingInterval = "monthly" | "annual";

/* ── SUCCESS_PLAYBOOK Pillar 2 §2: €49/€79 annual-default reprice ──
 *
 * Annual is THE plan (Keeper €49/yr, Guardian €79/yr); monthly (€9.99/€14.99)
 * stays visible purely as the decoy anchor. The new Stripe prices live in NEW
 * env vars so the reprice can ship code-first and activate the moment the owner
 * pastes the IDs:
 *
 *   NEXT_PUBLIC_STRIPE_KEEPER_ANNUAL49_PRICE_ID     → Keeper  €49/year
 *   NEXT_PUBLIC_STRIPE_GUARDIAN_ANNUAL79_PRICE_ID   → Guardian €79/year
 *   NEXT_PUBLIC_STRIPE_KEEPER_MONTHLY999_PRICE_ID   → Keeper  €9.99/month (decoy)
 *   NEXT_PUBLIC_STRIPE_GUARDIAN_MONTHLY1499_PRICE_ID → Guardian €14.99/month (decoy)
 *
 * Graceful fallback: while a new env var is absent we fall back to the legacy
 * price ID (NEXT_PUBLIC_STRIPE_*_PRICE_ID / *_MONTHLY_PRICE_ID) AND keep
 * displaying the legacy price for that interval — the shown price always
 * matches the price Stripe will actually charge. If neither env exists the
 * tier has no checkout price and the pricing page hides its purchase path.
 *
 * NOTE (Next.js): NEXT_PUBLIC_* vars are statically inlined per full literal
 * `process.env.NAME` reference — never build the names dynamically.
 */

/** Strip the CR/LF + escaped-newline debris that copy-pasted Vercel envs carry. */
const cleanEnv = (v: string | undefined): string =>
  (v || "").replace(/[\r\n]/g, "").replace("\\n", "").trim();

// New reprice env vars (empty string = not configured yet)
const KEEPER_ANNUAL49_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_KEEPER_ANNUAL49_PRICE_ID);
const GUARDIAN_ANNUAL79_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_ANNUAL79_PRICE_ID);
const KEEPER_MONTHLY999_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_KEEPER_MONTHLY999_PRICE_ID);
const GUARDIAN_MONTHLY1499_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_MONTHLY1499_PRICE_ID);

// Legacy env vars (current production prices)
const KEEPER_ANNUAL_LEGACY_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_KEEPER_PRICE_ID);
const GUARDIAN_ANNUAL_LEGACY_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_PRICE_ID);
const KEEPER_MONTHLY_LEGACY_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_KEEPER_MONTHLY_PRICE_ID);
const GUARDIAN_MONTHLY_LEGACY_ID = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_GUARDIAN_MONTHLY_PRICE_ID);

/** Trial length in days (Stripe checkout `trial_period_days`). Shared so the
 *  onboarding paywall and any trial copy never hardcode the number. */
export const TRIAL_DAYS = 14;

export interface PlanDefinition {
  id: PlanId;
  nameKey: string;
  taglineKey: string;
  /** EUR per month — the per-month EQUIVALENT of the annual price (annualTotal/12). */
  price: number;
  /** EUR per year actually billed on the annual interval, 0 for free. */
  annualTotal: number;
  /** EUR per month on the monthly (decoy) interval, 0 for free. */
  monthlyPrice: number;
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

const round2 = (n: number) => Math.round(n * 100) / 100;

// Displayed prices follow whichever Stripe price is actually wired (see header).
const keeperAnnualTotal = KEEPER_ANNUAL49_ID ? 49 : 119.88;
const guardianAnnualTotal = GUARDIAN_ANNUAL79_ID ? 79 : 239.88;
const keeperMonthly = KEEPER_MONTHLY999_ID ? 9.99 : 12.99;
const guardianMonthly = GUARDIAN_MONTHLY1499_ID ? 14.99 : 24.99;

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    nameKey: "freeName",
    taglineKey: "freeTagline",
    price: 0,
    annualTotal: 0,
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
      "featPhotoRestore10",
      "featFamilyTree25",
      "featFullExport",
    ],
  },
  keeper: {
    id: "keeper",
    nameKey: "keeperName",
    taglineKey: "keeperTagline",
    price: round2(keeperAnnualTotal / 12), // €4.08/mo on the €49 annual
    annualTotal: keeperAnnualTotal,
    monthlyPrice: keeperMonthly,
    stripePriceId: (KEEPER_ANNUAL49_ID || KEEPER_ANNUAL_LEGACY_ID) || null,
    monthlyStripePriceId:
      (KEEPER_MONTHLY999_ID || KEEPER_MONTHLY_LEGACY_ID || KEEPER_ANNUAL_LEGACY_ID) || null,
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
      "featPhotoRestore50",
      "featCollab5",
      "featUnlimitedFamilyTree",
      "featFullExport",
    ],
    highlighted: true,
    trial: TRIAL_DAYS,
  },
  guardian: {
    id: "guardian",
    nameKey: "guardianName",
    taglineKey: "guardianTagline",
    price: round2(guardianAnnualTotal / 12), // €6.58/mo on the €79 annual
    annualTotal: guardianAnnualTotal,
    monthlyPrice: guardianMonthly,
    stripePriceId: (GUARDIAN_ANNUAL79_ID || GUARDIAN_ANNUAL_LEGACY_ID) || null,
    monthlyStripePriceId:
      (GUARDIAN_MONTHLY1499_ID || GUARDIAN_MONTHLY_LEGACY_ID || GUARDIAN_ANNUAL_LEGACY_ID) || null,
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
      "featPhotoRestore200",
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

/* ── Shared price-copy helpers (paywall / pricing / emails) ──
 * The onboarding paywall (OnboardingWizard, owned by another workstream) and
 * every other money surface should read price copy from here, never hardcode
 * "€49" — so a future price change is a one-file edit. Web/Stripe copy only:
 * iOS surfaces must keep showing the localized StoreKit price (Apple 3.1.1). */

/** Format a EUR amount for copy: whole euros drop the cents ("€49", "€9.99"). */
export function formatEur(amount: number): string {
  return Number.isInteger(amount) ? `€${amount}` : `€${amount.toFixed(2)}`;
}

/** "€49" — the yearly total billed for a paid plan's annual interval. */
export function annualTotalCopy(planId: Exclude<PlanId, "free">): string {
  return formatEur(PLANS[planId].annualTotal);
}

/** "€4.08" — the per-month equivalent of the annual price. */
export function annualPerMonthCopy(planId: Exclude<PlanId, "free">): string {
  return formatEur(PLANS[planId].price);
}

/** Percent saved choosing annual over 12× the monthly decoy (e.g. 59). */
export function annualSavingsPercent(planId: Exclude<PlanId, "free">): number {
  const p = PLANS[planId];
  if (!p.monthlyPrice) return 0;
  return Math.max(0, Math.round((1 - p.annualTotal / (p.monthlyPrice * 12)) * 100));
}

/** Highest annual saving across paid tiers — for the "Save up to N%" badge. */
export function maxAnnualSavingsPercent(): number {
  return Math.max(annualSavingsPercent("keeper"), annualSavingsPercent("guardian"));
}
