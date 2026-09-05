# RevenueCat — step-by-step setup (owner checklist)

Companion to `REVENUECAT_INTEGRATION_PLAN.md`. Do the steps in order. Steps 1–6 are
**analytics-only, zero risk** (nothing in the app changes). Step 7 is the go-live
switch — only flip it after 1–6 are done and the migration is applied.

The app-side code is already shipped and **dormant**:
- Webhook endpoint (live, returns 401 until you set the secret, no-op until enabled):
  **`https://www.thememorypalace.ai/api/revenuecat/webhook`**
- Master switch env var: `RC_WEBHOOK_ENABLED` (currently unset → treated as `false`).
- Shared secret env var: `REVENUECAT_WEBHOOK_AUTH`.

Suggested secret (or generate your own): `mprc_2eeb1cac385772132f96a7eb46d0c32565c0c4ede9e9df59`

---

## 1. Add your platform apps (RevenueCat dashboard → Project settings → Apps)
You already created the project. Under it, add:
- **App Store** app → bundle id `ai.thememorypalace.app`. Upload the App Store Connect **in-app purchase key** (.p8) so RC can verify StoreKit + receive Apple Server Notifications.
- **Stripe** app → connect your Stripe account (this powers Phase 1 web analytics).
- **Play Store** app → package `ai.thememorypalace.app` (needed later for Android; can skip until Phase 4).

## 2. Create Entitlements (dashboard → Entitlements)
Create exactly two, identifiers must match our code:
- `keeper`
- `guardian`

## 3. Register Products and attach them to entitlements (dashboard → Products)
Add these (identifiers already exist in App Store Connect + Stripe):

| Entitlement | App Store product id | Stripe price |
|---|---|---|
| keeper | `ai.thememorypalace.keeper.monthly` | your `KEEPER_MONTHLY` price |
| keeper | `ai.thememorypalace.keeper.annual` | your `KEEPER` (annual) price |
| guardian | `ai.thememorypalace.guardian.monthly` | your `GUARDIAN_MONTHLY` price |
| guardian | `ai.thememorypalace.guardian.annual` | your `GUARDIAN` (annual) price |

Attach each product to its entitlement (keeper products → `keeper`, guardian → `guardian`).

## 4. Create an Offering (dashboard → Offerings)
- One offering (e.g. `default`) with 4 packages: keeper-monthly, keeper-annual,
  guardian-monthly, guardian-annual. This is what the SDK/paywall will render later.

## 5. Connect Stripe for analytics + import history  ← **biggest immediate win**
- In the Stripe app you added in step 1, enable the integration and **import existing
  subscriptions**. Within minutes RC Charts show MRR, active subs, trials,
  trial→paid %, churn, LTV for the web business — your **baseline** to measure the
  uptick against. No app change, no release.

## 6. Turn on the PostHog integration (dashboard → Integrations → PostHog)
- Paste your PostHog project API key + host (`https://eu.i.posthog.com`).
- This streams `INITIAL_PURCHASE / TRIAL_STARTED / RENEWAL / CANCELLATION /
  EXPIRATION / REFUND` (with revenue) into PostHog — including **native** purchases,
  which the in-app tracker can't see. Combined with the new `paywall_viewed` /
  `checkout_started` events (already live on web), you now have the full funnel.

## 7. Go-live switch for the webhook (do LAST, only when 1–6 are done)
This makes RC keep our `subscriptions` table in sync. Order matters:

1. **Apply the DB migration** (Supabase dashboard → SQL editor → paste the contents of
   `supabase/migrations/20260825_revenuecat.sql` → Run). Additive columns only.
2. **Set the two env vars in Vercel** (Project → Settings → Environment Variables →
   Production):
   - `REVENUECAT_WEBHOOK_AUTH` = the secret above (exactly).
   - `RC_WEBHOOK_ENABLED` = `true`
   Then redeploy prod (or tell me and I'll `vercel --prod`).
3. **Add the webhook in RC** (dashboard → Integrations → Webhooks):
   - URL: `https://www.thememorypalace.ai/api/revenuecat/webhook`
   - Authorization header: the same secret value.
   - Send a **test event** → RC should get `200 {ok:true}`; a `TEST` event is a safe no-op.
4. Watch one real (sandbox) purchase flow through: RC event → our `subscriptions` row
   updates with `subscription_source='revenuecat'`. The ownership-guard means it will
   NOT touch existing Apple/Stripe rows, so nothing breaks during migration.

## SDK keys (only needed for the native phases 3–4, later)
When we do the iOS/Android SDK swap I'll need the **public** SDK keys from
dashboard → API keys:
- iOS public key → `NEXT_PUBLIC_REVENUECAT_IOS_KEY`
- Android public key → `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`

## What stays true (compliance guardrails — unchanged)
- iOS still never sees Stripe (the `mp_platform=ios` seal is untouched); RC on iOS
  uses StoreKit = Apple-compliant.
- `getUserPlan()` still reads our own table; RC only writes via the webhook, so there's
  no runtime dependency on RC uptime.

---

### TL;DR order
1–4 setup → **5 (Stripe→RC = baseline analytics now)** → 6 (PostHog) → 7 (flip webhook
on when you're ready). Steps 1–6 change nothing user-facing; do them today for the
analytics, flip step 7 whenever.
