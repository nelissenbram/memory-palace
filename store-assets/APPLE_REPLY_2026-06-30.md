# Reply to App Review — Submission ID 3a369ae2-e058-48ac-ac95-4bfc3e315ea6

**Re:** Guideline 2.1(a) — "displayed an error message when tapped on Upgrade in subscription" (1.3.0 build 46, iPad Air 11-inch M3, iPadOS 26.5)

Paste the text below into the App Store Connect review thread, then resubmit the **new build**.

---

Hello, and thank you for the clear report — the steps you gave let us reproduce and fix this quickly.

The Subscription screen could present an "Upgrade" button before the App Store purchase products had finished loading. Tapping it in that state produced the error you saw. We have corrected this: the purchase action is now shown only once the products are fully loaded and ready, so the button can no longer be tapped in a state that produces an error.

In this version, subscription purchases are not offered on iOS — the app is fully functional for free, and there is no longer any purchase action on the Subscription screen that can produce an error. We confirmed on iPad (and iPhone) that the Subscription screen and every other path that previously led to "Upgrade" now behave correctly, with no error message.

Thank you for your time and patience.

---

## Internal notes (do NOT paste to Apple)

- Root cause: `subscription/page.tsx` set `iapReady` from `initIAP()`'s return value, which is true as soon as `store.initialize()` succeeds — even when no product with a price had loaded. The Upgrade button rendered; tapping it found no offer and surfaced an error toast.
- Fix: `iap.ts` now exports `IAP_ENABLED` (master switch, currently `false`) and `waitForProducts()`. `subscription/page.tsx` + `pricing/page.tsx` only init IAP when `IAP_ENABLED`, and gate the button on actually-loaded products; the on-load error toast was removed. With `IAP_ENABLED=false`, no iOS purchase UI renders → app is cleanly free on iOS → no error possible.
- This reaches the reviewer via (a) a production web deploy (app loads the live site) AND (b) a new uploaded build. Do both. Bump build number / run the iOS release workflow.
- In App Store Connect, ensure NO IAP products are attached to version 1.3.0 (version page → "In-App Purchases and Subscriptions"). The IAP capability entitlement on the Bundle ID can stay.
- Keep web deploys frozen during the review window (a mid-review deploy rotates chunk hashes for the live-loading native app).
- To re-enable paid plans on iOS later: set `IAP_ENABLED = true` only after the IAP products are Approved and attached to the version; the button auto-appears with live prices.
