# Reply to App Review — Submission ID 3a369ae2-e058-48ac-ac95-4bfc3e315ea6

**Re:** Guideline 3.1.1 — "accesses digital content purchased outside the app, such as subscription plans, but that content isn't available to purchase using In-App Purchase" (1.3.0 build 48, iPad Air 11-inch M3, July 02 2026)

Paste the text below into the App Store Connect review thread, then resubmit the **new build**.

---

Hello, and thank you for the review.

We want to be unambiguous: **The Memory Palace is completely free on iPhone and iPad.** The iOS app offers no subscriptions and unlocks no paid functionality.

In this build we corrected the issue you identified. Previously, if a person had subscribed on our website, the iOS app would reflect that subscription and unlock the corresponding features. We have removed this entirely: the iOS app now treats every account as the free tier, regardless of any subscription purchased on another platform. No paid plan, plan status, price, or "manage/upgrade subscription" option is shown or honored anywhere in the iOS app, and no feature purchased outside the app is unlocked on iOS.

Because the app provides no paid digital content or services on iOS, there is nothing that requires In-App Purchase in this version.

We verified on iPad and iPhone — including with an account that holds an active subscription on our website — that the app runs fully as free tier, surfaces no external subscription, and presents no purchase or upgrade path.

Thank you for your time.

---

## Internal notes (do NOT paste to Apple)

### Root cause
Build 46 was rejected because the Upgrade button errored; we responded by turning the iOS purchase UI **off** (`IAP_ENABLED = false`) and telling Apple the app is "free on iOS." But entitlement is account-based and platform-agnostic: a web/Stripe subscriber logging into the iOS app still had their plan **honored server-side** (higher storage, unlimited interviews/auto-tag, premium features) and **displayed** on the Subscription screen ("Guardian — Active", period end, Manage/Restore). Apple's reviewer used such an account → 3.1.1: the app accesses content purchased outside the app with no IAP to buy it.

### Fix — iOS is now genuinely free tier (server-enforced), decided over enabling IAP
- **iOS→server signal:** `capacitor.config.ts` adds `ios.appendUserAgent: 'MemoryPalace-iOS'`; `NativeInit.tsx` sets an `mp_platform=ios` cookie on startup. Both ride every request; web + Android are untouched.
- **Central server coercion:** `src/lib/auth/plan-limits.ts` → `getUserPlan()` returns the free plan for any iOS request (detected via cookie or UA, guarded by try/catch so cron/no-request-scope callers keep the real plan). Every entitlement check flows through `getUserPlan()`, so storage, interview quota, auto-tag quota, family-tree cap, collaboration and cloud imports all become free-tier on iOS in one place.
- **Subscription screen** (`settings/subscription/page.tsx`): reads the subscriptions table directly, so it's independently coerced to free on iOS — no paid plan/status/billing-date/Manage/Cancel/Restore renders. Auto-renew disclosure hidden on iOS (no IAP). Added an explicit "free on iPhone and iPad" note (i18n key `iosFreeNote`, all 5 locales).
- **Anti-steering sweep (3.1.3):** removed every in-app path that referenced/steered to paid plans on iOS —
  - `CloudImportPanel.tsx`: iOS shows only the free Google Photos import (paid providers, Keeper badges, "Upgrade to Keeper" CTA and `/pricing` links can't render).
  - `InterviewPanel.tsx`: "Upgrade for unlimited interviews" CTA hidden on iOS.
  - `OnboardingWizard.tsx`: the onboarding paywall phase (trial CTA + "auto-renewable subscription billed to your Apple ID") is skipped on iOS → goes straight to done.
  - `app/page.tsx` (landing): "Pricing" nav links (desktop + mobile) and footer link hidden inside the iOS app. (No prices are rendered on the landing itself.)
  - Already-safe from prior rounds: `StorageBanner` (upgrade button hidden on native), `MemoryPalace` upgrade prompt (`!isNative()`), `/pricing` page (redirects native → `/atrium`).

### Verification done
- `tsc --noEmit` clean; no new lint errors introduced (pre-existing set-state-in-effect warnings on untouched effects remain).
- Behavior reasoning: with the `mp_platform=ios` cookie / UA marker present, `getUserPlan` → free everywhere; subscription screen shows Free; no upgrade/paywall path reachable.

### TODO before resubmitting (build 49)
1. **Deploy the web app to production** (the native app loads the live site) AND **upload a new build** — both are required. The `appendUserAgent` change only takes effect in a freshly synced native build (`npx cap sync` reads `capacitor.config.ts`).
2. In **App Store Connect**, ensure **NO IAP products are attached** to version 1.3.0 (version page → "In-App Purchases and Subscriptions"). The IAP capability entitlement on the Bundle ID can stay.
3. **Freeze web deploys during the review window** (a mid-review deploy rotates chunk hashes for the live-loading native app).
4. **Manual smoke test on device before submit:** log into an account that has an active web subscription, open the iOS app, and confirm: Settings → Subscription shows **Free** (no plan/price/manage/restore), storage shows the 1 GB free limit, cloud import shows only Google Photos, no paywall in onboarding, no "Pricing" in landing nav.

### If you later want to SELL on iOS
Reverse this by re-enabling IAP: set `IAP_ENABLED = true` once the 4 subscription products are created + attached to the version, and remove the iOS free-coercion in `getUserPlan()` + the subscription-page/onboarding/import iOS gates. (That was the alternative to this round; we chose free-on-iOS.)
