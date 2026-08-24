# RevenueCat Integration & Revenue-Analytics Plan

_Memory Palace — plan to unify subscriptions across iOS / Android / Web behind RevenueCat, and to actually understand user behaviour and measure the revenue uptick._

Status: **proposal** (no code changes yet). Grounded in the current implementation as of 2026-08.

---

## 1. Why RevenueCat, and what it changes

Today monetisation is three hand-rolled systems that each write to one `subscriptions` row:

| Surface | How it bills now | Source of truth |
|---|---|---|
| **Web** | Stripe Checkout + Portal + webhook (`/api/stripe/*`) | `subscriptions` (`subscription_source='stripe'`) |
| **iOS** | `cordova-plugin-purchase` → `/api/apple/verify-receipt` + App Store Server Notifications V2 (`/api/apple/webhook`) | `subscriptions` (`subscription_source='apple'`) |
| **Android** | Opens **Stripe web checkout in an external browser** — no Play Billing | `subscriptions` (`stripe`) |

This works but has three real costs:
1. **No Play Billing** → Android in-app conversion is poor and arguably non-compliant for a subscription app; we leave money on the table.
2. **Two bespoke webhook state-machines** (Apple V2 + Stripe) that we maintain, test, and worry about on every Apple review.
3. **No revenue analytics.** PostHog tracks `paywall_trial_clicked`, `paywall_skipped` and cancel reasons — but there is **no `purchase_completed`, no `trial_started`, no revenue, no MRR/LTV/churn**. We are flying blind on the exact thing this task asks about.

RevenueCat (RC) solves all three:
- **One entitlement API** across StoreKit (iOS), Play Billing (Android), and Stripe/Web Billing.
- **Server-authoritative webhook** with one normalised event shape → feeds our `subscriptions` table and PostHog.
- **Charts out of the box**: MRR, active subs, trials, trial→paid conversion, churn, refund rate, realised revenue, LTV, cohort retention — plus **Experiments** (paywall A/B tests) to *causally* attribute an uptick.

**Design principle for this plan: RevenueCat becomes the billing + analytics layer, but `subscriptions` + `getUserPlan()` stay the app's runtime entitlement cache.** Nothing in the app reads RC synchronously on the hot path; RC's webhook keeps our existing table fresh. This keeps the blast radius small and preserves the iOS free-tier seal and the Stripe/Apple ownership segregation we already trust.

---

## 2. Current architecture (what we must not break)

Key facts the plan is built on (file references for the implementer):

- **Wrapper**: Capacitor v8.2.0, `capacitor.config.ts` — the native app is a webview pointing at `https://www.thememorypalace.ai`; `appendUserAgent: 'MemoryPalace-iOS'`.
- **Entitlement read**: `src/lib/auth/plan-limits.ts` → `getUserPlan(userId)` reads one row from `subscriptions`. Tiers `free | keeper | guardian` in `src/lib/constants/plans.ts` (limits + `featureKeys`, keeper 7-day trial).
- **iOS free-tier seal**: `isIOSRequest()` (cookie `mp_platform=ios` set in `NativeInit.tsx`, or UA `MemoryPalace-iOS`). Used by `/api/stripe/checkout` and `/api/stripe/portal` to **403 web purchases on iOS**. This is our Apple 3.1.1 guardrail and MUST survive.
- **Ownership segregation**: Stripe webhook only touches rows where `subscription_source in (null,'stripe')` (`STRIPE_OWNED_FILTER`); Apple webhook only touches `'apple'`. One store can never revoke the other's entitlement.
- **Schema**: `subscriptions(user_id unique, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, subscription_source check('stripe','apple'), apple_original_transaction_id)`. Plus `apple_pending_notifications` for out-of-order webhook reconciliation.
- **Stable user id**: Supabase `auth.users.id` (UUID), identical on web and native → this is our RevenueCat `app_user_id`.
- **Analytics**: PostHog (`src/lib/analytics.ts`), consent-gated, `person_profiles: identified_only`, and **disabled entirely when `isNative()`** (Apple 5.1.2(i)). Important consequence in §7.

---

## 3. Target architecture

```
                    ┌─────────────────────────────────────────┐
   iOS (StoreKit) ─▶│                                         │
 Android (Play)  ─▶│            RevenueCat                    │──▶ RC Charts (MRR/LTV/churn/…)
   Web (Stripe)  ─▶│  entitlements: "keeper", "guardian"     │──▶ PostHog (revenue events)
                    │  app_user_id = Supabase auth uid        │──▶ (optional) Slack / S3 / BigQuery
                    └───────────────┬─────────────────────────┘
                                    │  RC Webhook (normalised events)
                                    ▼
                     POST /api/revenuecat/webhook
                                    │  upsert
                                    ▼
                   subscriptions (existing table)  ──▶  getUserPlan()  ──▶  app feature gating
```

- **Purchases** happen through the RC SDK on native (StoreKit / Play Billing) and through RC's Stripe integration on web.
- **RC webhook** is the single write-path into `subscriptions` (eventually replacing the two bespoke webhooks).
- **`getUserPlan()` is unchanged** — it still reads the local row. Zero hot-path dependency on RC uptime.
- **RC → PostHog** integration streams `INITIAL_PURCHASE / TRIAL_STARTED / RENEWAL / CANCELLATION / EXPIRATION / REFUND` with revenue, so behavioural funnels can join product events + money.

### Entitlement mapping
RC "entitlements" are the durable capability; our tiers map 1:1:

| RC Entitlement | Grants app plan | Products (identifiers) |
|---|---|---|
| `keeper` | `plan='keeper'` | iOS `ai.thememorypalace.keeper.monthly/annual`, Play `keeper_monthly/annual`, Stripe `KEEPER_*_PRICE_ID` |
| `guardian` | `plan='guardian'` | iOS `ai.thememorypalace.guardian.monthly/annual`, Play `guardian_*`, Stripe `GUARDIAN_*` |

The existing iOS product IDs in `src/lib/native/iap.ts` are reused verbatim as RC products, so no new App Store Connect SKUs are needed — we just register them in RC.

---

## 4. Data-model changes (small, additive)

Extend `subscriptions` so the RC webhook can write a normalised row without losing store context:

```sql
-- migration: 20260825_revenuecat.sql
alter table public.subscriptions
  add column if not exists rc_app_user_id text,               -- = auth uid (redundant but explicit)
  add column if not exists store text                          -- 'app_store' | 'play_store' | 'stripe'
    check (store in ('app_store','play_store','stripe','promotional')),
  add column if not exists rc_entitlement text,                -- 'keeper' | 'guardian'
  add column if not exists rc_product_id text,
  add column if not exists rc_period_type text,                -- 'trial' | 'intro' | 'normal'
  add column if not exists will_renew boolean;

-- widen the source enum so RC-managed rows are distinguishable during migration
alter table public.subscriptions drop constraint if exists subscriptions_subscription_source_check;
alter table public.subscriptions
  add constraint subscriptions_subscription_source_check
  check (subscription_source in ('stripe','apple','revenuecat'));

create index if not exists idx_subscriptions_rc_user
  on public.subscriptions(rc_app_user_id) where rc_app_user_id is not null;
```

`getUserPlan()` needs **no change** — it keeps reading `plan/status/current_period_end`. The RC webhook simply becomes another writer of those columns (with `subscription_source='revenuecat'`, `store=…`).

---

## 5. Phased rollout (low-risk → high-value)

Each phase is independently shippable and reversible. Ordered so we get **analytics value first** (Phase 1 is pure config, zero app risk) and **new revenue** mid-way (Android).

### Phase 0 — RevenueCat project setup (no code)
- Create RC project; add **App Store**, **Play Store**, and **Stripe** apps under one project (shared entitlements).
- Define entitlements `keeper`, `guardian`; attach the existing store products + Stripe prices.
- Configure **Offerings/Packages** (monthly/annual for each tier) — this is what the SDK/paywall renders.
- Set `app_user_id` policy = our Supabase uid (never anonymous for signed-in users).
- Turn on the **PostHog integration** and (optional) Slack for live purchase pings.

### Phase 1 — Connect Stripe → RC (analytics only, ship immediately)
- Add RC's Stripe integration so **existing web subscriptions flow into RC Charts + PostHog** without touching checkout code.
- Backfill historical Stripe subs into RC (RC import).
- **Outcome:** we get MRR/churn/LTV/trial-conversion for the web business on day one, and a measured **baseline** to compare the uptick against — with no release and no Apple risk.

### Phase 2 — Instrument the funnel in PostHog (small web change)
Fill the glaring gaps (we currently only have paywall *clicks*). Add events (web layer, respects existing consent + native guard):
- `paywall_viewed` (impression, with `{source, plan, variant}`)
- `checkout_started` (`{plan, interval, store}`)
- `purchase_completed` / `trial_started` / `trial_converted` / `subscription_cancelled` — **emit these from the RC webhook → PostHog** (server-side, so native users are covered even though the in-app PostHog is disabled — see §7).
- Keep existing `signup_completed`, `onboarding_completed` (activation), `cancel_reason_selected`.

### Phase 3 — RC SDK on iOS (replace cordova-plugin-purchase)
- Add `@revenuecat/purchases-capacitor` (native StoreKit; **Apple-compliant IAP**, so the free-tier seal + anti-steering logic is unaffected — iOS still never sees Stripe).
- On login, `Purchases.logIn(supabaseUid)`; on logout, `Purchases.logOut()`.
- Replace the client purchase call in `src/lib/native/iap.ts` with RC `purchasePackage()`.
- Stand up `POST /api/revenuecat/webhook` (verify RC `Authorization` header secret) → upsert `subscriptions` with `subscription_source='revenuecat', store='app_store'`, honouring the same **ownership guard** (an RC row for a user must not be clobbered by the legacy Apple webhook and vice-versa — run them in parallel first, RC as shadow-writer, then cut over).
- Migration for existing iOS subscribers: RC picks them up on first `logIn` + receipt refresh; the legacy `apple_pending_notifications` path stays as a safety net during overlap.
- Keep `/api/apple/webhook` running in parallel for one release as a fallback; compare RC vs legacy rows in a reconciliation job before deprecating.

### Phase 4 — RC + Play Billing on Android (**new revenue**)
- Same SDK, add Play products in RC.
- Switch Android from "open Stripe in browser" to in-app Play Billing purchase.
- This is the biggest **revenue uptick lever**: proper in-app Android subscriptions + Play compliance.

### Phase 5 — Web on RC (optional) + decommission bespoke webhooks
- Either keep Stripe checkout (already connected to RC in Phase 1) **or** migrate to **RC Web Billing** for one unified paywall/experiment surface.
- Once RC has been the shadow source of truth long enough with zero drift, retire `/api/apple/webhook` and `/api/stripe/webhook` write-paths (keep Stripe webhook only for tax/invoice side-effects if needed).

---

## 6. iOS/Play compliance (must-hold invariants)
- **RC on iOS uses StoreKit** = Apple-sanctioned IAP. The `mp_platform=ios` seal that 403s `/api/stripe/checkout|portal` **stays exactly as is** — iOS must still never reach web billing.
- **Anti-steering**: no Stripe prices/links on iOS; `/pricing` keeps routing iOS→IAP/free. RC's paywall renders StoreKit products only on iOS.
- **No behavioural tracking inside the native binary** (Apple 5.1.2(i)) — RC SDK is *billing*, not tracking, and is fine; PostHog stays disabled in native. Revenue events reach PostHog **server-side via RC webhook**, which is compliant.
- **One transaction ⇒ one account**: keep the ownership guard (RC's `app_user_id` = uid enforces this; add the same defensive check in the RC webhook).

---

## 7. Understanding user behaviour + measuring the revenue uptick

This is the half of the task that today has **no answer**, because purchases aren't in analytics and mobile behaviour isn't tracked at all.

### 7a. The gap to close
- PostHog is **off in the native app** (`isNative()` early-return). So we have **no in-app behavioural data from iOS/Android** — only web.
- We have **no purchase/revenue events anywhere**.

RC fixes the revenue half for *all* platforms (server-side webhook → PostHog, no native SDK needed). The native *behavioural* gap needs a deliberate choice (see 7d).

### 7b. The funnel to instrument (north-star = activated, paying, retained)
```
signup_completed
  → activation: onboarding_completed / first memory uploaded
    → paywall_viewed            (impression)
      → checkout_started        (intent)
        → trial_started         (RC)
          → trial_converted     (RC, +revenue)
            → renewal / retained (RC, cohort)
   ↘ subscription_cancelled / expiration / refund (RC, with reason where web)
```
Measure conversion at **every** arrow. The two arrows we cannot currently see — `paywall_viewed→checkout_started` and `trial_started→trial_converted` — are exactly where pricing/paywall wins hide.

### 7c. Where each metric comes from
| Question | Source |
|---|---|
| MRR, active subs, trials, **trial→paid %**, churn %, refund %, **LTV**, realised revenue, renewal cohorts | **RC Charts** (native, no build needed) |
| Signup→activation→paywall→checkout funnel, per-segment (locale, referral, cohort) | **PostHog funnels** (needs Phase 2 events) |
| "Did feature X drive upgrades?" e.g. Restore-a-Photo quota hit → upgrade | **PostHog** (join product event + RC `purchase_completed`) |
| Paywall copy/price A/B, *causal* uptick | **RC Experiments** and/or PostHog experiments + feature flags |
| Revenue by store (iOS vs Android vs Web) | **RC Charts** (store dimension) |

### 7d. Native behavioural data — decision needed
To understand *behaviour* (not just revenue) on mobile, pick one:
1. **Server-side product events** (recommended, compliant): emit key milestones (memory_created, interview_completed, quota_hit, upgrade) from our **backend** into PostHog keyed by uid — works for native without an in-app tracker, keeps Apple happy.
2. **Re-enable PostHog in native behind explicit ATT/consent** — more work, Apple-sensitive, not recommended given the current seal posture.

RC revenue events are server-side regardless, so **option 1 gives us a complete cross-platform picture** (behaviour + money) without touching the native tracking stance.

### 7e. How we prove the uptick (experiment design)
1. **Baseline** (from Phase 1, ~2–4 weeks): current web trial-start %, trial→paid %, MRR, churn. This is the control.
2. **Instrument** (Phase 2) so future changes are measurable end-to-end.
3. **Ship levers as experiments, not guesses:**
   - Android Play Billing (Phase 4) — measure incremental Android MRR vs the near-zero baseline (this is the clean, large win).
   - Paywall price/plan/copy tests via **RC Experiments** — RC reports revenue-per-experiment with significance.
   - Trial length (3 vs 7 vs 14 days), annual-default vs monthly-default — measure trial→paid and 60-day retained revenue, not just conversion.
4. **Report** a single weekly scorecard: `activation %, paywall_view→trial %, trial→paid %, blended MRR, net revenue churn, LTV:CAC`. RC feeds the money columns; PostHog feeds the behaviour columns.

**Definition of "uptick" done:** we can attribute a change in blended MRR to a specific shipped lever with a control cohort — instead of the current situation where we couldn't even see trial→paid conversion.

---

## 8. Effort & sequencing (rough)
| Phase | Scope | Eng effort | Risk | Value |
|---|---|---|---|---|
| 0 | RC project/products/entitlements/offerings | ~0.5 day config | none | enables all |
| 1 | Stripe→RC + PostHog integration, import history | ~0.5 day config | none | **baseline analytics now** |
| 2 | Funnel events (web + RC-webhook→PostHog) | ~1–2 days | low | see the funnel |
| 3 | RC SDK on iOS, `/api/revenuecat/webhook`, shadow-write + reconcile | ~3–5 days | med (Apple review) | maintainability, unified data |
| 4 | Play Billing via RC on Android | ~2–3 days | med (Play review) | **new revenue** |
| 5 | Web-on-RC (optional) + retire bespoke webhooks | ~2–4 days | med | one paywall/experiment surface |

Recommended order to start: **0 → 1 → 2** (all low/no risk, delivers the analytics the business is missing), then **4 (Android)** for the clearest revenue win, then **3 (iOS)**, then **5**.

---

## 9. Risks & mitigations
- **Double-writes during migration** → run RC webhook as *shadow writer* first; reconcile RC vs legacy rows nightly; cut over only at zero drift.
- **Breaking the Apple seal** → no change to `isIOSRequest()` guards; add a test that `/api/stripe/checkout` still 403s for `mp_platform=ios` after the RC changes.
- **Entitlement flapping** if RC webhook and Apple/Stripe webhooks both write → gate legacy webhooks behind a flag once RC is authoritative; enforce `subscription_source` ownership in the RC webhook too.
- **Existing subscribers not recognised in RC** → RC restore/`logIn` picks up StoreKit/Play; import Stripe via RC; keep `apple_pending_notifications` fallback during overlap.
- **Native analytics/Apple 5.1.2(i)** → keep PostHog off in-native; use server-side product events + RC server webhook (no ATT prompt needed).
- **RC as hot-path dependency** → avoided by design: `getUserPlan()` reads our own table; RC only writes via webhook.

---

## 10. Concrete first PR (proposal)
1. `supabase/migrations/20260825_revenuecat.sql` (§4).
2. `src/app/api/revenuecat/webhook/route.ts` — verify `Authorization` secret, map RC event → upsert `subscriptions` (shadow mode behind `RC_WEBHOOK_ENABLED`).
3. RC dashboard: entitlements + offerings + Stripe integration + PostHog integration (Phases 0–1).
4. PostHog: add `paywall_viewed`, `checkout_started`; wire RC→PostHog for `purchase/trial/cancel`.
5. Env: `REVENUECAT_PUBLIC_SDK_KEY` (native), `REVENUECAT_WEBHOOK_AUTH`, `RC_WEBHOOK_ENABLED`.

_No app-visible behaviour changes until Phase 3; Phases 0–2 are analytics/config only._
