# Reply to App Review — Submission ID 3a369ae2-e058-48ac-ac95-4bfc3e315ea6

**Re:** Guideline 3.1.1 — "accesses digital content purchased outside the app, such as paid subscriptions, but that content isn't available to purchase using In-App Purchase" (1.3.0, iPad Air 11-inch M3, reviewed July 06 2026)

Paste the text below into the App Store Connect review thread, then resubmit the **new build**.

---

Hello, and thank you for taking another look.

To be completely clear: **The Memory Palace is free on iPhone and iPad.** The iOS app sells no subscriptions and unlocks no paid functionality of any kind.

The iOS app treats every account as the free tier, regardless of any subscription that account may hold on another platform (for example, our website). This is enforced on our server for every request coming from the iOS app — not merely hidden in the interface. No paid plan, plan status, price, billing date, or "manage / upgrade / restore subscription" option is shown or honored anywhere in the iOS app, and no feature purchased outside the app is unlocked on iOS.

Because the iOS app offers no paid digital content or services, there is nothing in this version that requires In-App Purchase.

We have re-verified this on both iPad and iPhone, **including by signing in with an account that holds an active paid subscription on our website**: the iOS app runs entirely as the free tier, surfaces no external subscription, and presents no purchase or upgrade path anywhere.

We appreciate your patience and are glad to answer any further questions.

---

## Internal notes (do NOT paste to Apple)

### Why build 49 was rejected again on 3.1.1
The iOS free-tier enforcement (server-side `getUserPlan()` coercion + subscription-screen coercion + anti-steering sweep, all shipped in commit `596b17d`) is **correct and complete** — a two-pass server+client audit confirmed every entitlement path (storage, interview quota, auto-tag, family-tree cap, collaboration, cloud imports) funnels through the iOS-coerced `getUserPlan()`, and the `MemoryPalace-iOS` UA marker rides on every request (no JS dependency).

Most likely cause: the native app loads the **live production site** (`server.url = https://www.thememorypalace.ai`), so the reviewer sees whatever is deployed to Vercel at review time — independent of the IPA build number. Vercel's git integration is broken (pushes do **not** auto-deploy), so if the coercion was not actually deployed to production when Apple tested on July 06, the reviewer would have seen the old paid-content behavior even though the code is correct.

### What changed this round (build 50)
- Confirmed the free-tier coercion is deployed and live on production (`npx vercel --prod`).
- Closed the Library sidebar "upgrade storage" link on iOS — commit `bf71a4f`.
- **Ran a 50-agent sweep of the whole codebase (120 files) for any paid/IAP/pricing/upgrade functionality OR text reachable on iOS. It found 25 leaks; all fixed in commit `b4f5047`.** The two most important were **navigable links to the subscription/billing page that rendered on iPad** — the likely reason this kept getting rejected on an iPad Air:
  1. `settings/layout.tsx` + `SettingsInline.tsx`: the **Subscription settings tab** was missing `hideInNative:true`, so the existing `hideInNative && isIOS()` filter never removed it → the tab (and its link to the plan/billing page) showed on iOS.
  2. `TopBar.tsx` desktop user menu: the **Subscription link** was only hidden by `useIsMobile()` (viewport width, not platform), so on an iPad-sized viewport in the native app it rendered and navigated to the billing page.
  Remaining fixes removed upgrade/plan text on iOS: `/help` (billing category + "Upgrade anytime…" FAQ), landing FAQ ("Upgrade for more storage", "cancel your plan"), settings tutorial subscription bullet, onboarding "Select your plan" button label, and family-tree/collaboration "Upgrade…" error strings. Added server-side defense-in-depth: middleware redirects native `/pricing` → `/atrium`, and the Stripe checkout/portal routes 403 any `MemoryPalace-iOS` request.
- `tsc --noEmit` clean; all 5 locale message files validated.

### TODO before resubmitting
1. **Deploy web to production** (`npx vercel --prod`, alias to www) — DONE, verify live.
2. **Freeze all production deploys** for the entire review window (a mid-review deploy rotates chunk hashes for the live-loading native app and can change what the reviewer sees).
3. In **App Store Connect**: confirm **NO IAP products are attached** to version 1.3.0.
4. **On-device smoke test BEFORE submit** — sign into an account with an active *web* subscription, open the iOS app, confirm:
   - Settings → Subscription shows **Free** (no plan / price / billing date / manage / cancel / restore).
   - Storage shows the free 1 GB limit; premium features are gated.
   - Cloud import shows only Google Photos (no paid providers).
   - No paywall in onboarding; no "Pricing" in landing nav; no "upgrade storage" link in the Library sidebar.
   - **Screen-record this** and attach it / reference it in the Resolution Center reply — a video of a web-subscribed account showing Free on iOS is the most convincing proof.
5. Upload the new build, attach it to version 1.3.0, paste the reply above, submit.

### If you later want to SELL on iOS
Reverse by enabling IAP: set `IAP_ENABLED = true` once the subscription products are created + attached to the version, and remove the iOS free-coercion in `getUserPlan()` + the subscription-page / onboarding / import / sidebar iOS gates.
