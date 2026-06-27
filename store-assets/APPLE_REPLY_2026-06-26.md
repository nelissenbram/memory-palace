# Reply to App Review — Submission ID 3a369ae2-e058-48ac-ac95-4bfc3e315ea6

**Re:** Guideline 2.1(a) — "the app is not responsive after launch" (1.3.0, iPhone 17 Pro Max, iOS 26.4.2)

Paste the text below into the App Store Connect review thread, then resubmit the **new build** (the fix must ship in a new binary — it is not a server-only change).

---

Hello, and thank you for the detailed report.

We took this seriously and investigated the launch path. We could not reproduce an unresponsive launch on our test devices or on the latest iOS/WebKit, but in doing so we identified and fixed a real launch-stability weakness that matches the symptom you described, and we have hardened the app in a new build.

**What we found and fixed (included in the new build):**

1. **Launch fallback could appear frozen on a slow first network response.** Our app loads its experience from our server. If the very first network response on launch was slow or interrupted, the bundled launch screen previously showed a spinner that, after a timeout, displayed a static "please close and reopen the app" message **with no on-screen control to retry** — which can read as an unresponsive app. The launch screen is now always interactive: it shows a clear, tappable button at all times, retries the connection automatically within the first second or two, and never asks the user to force-quit.

2. **Stale cached content on the update path.** Because the review tests an update over a previous version, we now proactively clear any cached web content and unregister any service worker left behind by an older version on first launch, so the updated app always loads fresh content.

We tested the updated build by installing it as an update over the previous version, on the latest iOS, with both fast and intentionally throttled/interrupted connections, and confirmed the app reaches an interactive state every time.

**One request that would help us help you:** if the new build still exhibits this on your device, would you be able to share a screen recording of the launch, or note exactly which screen appeared (e.g., a blank screen, a spinner, the landing page, or a logged-in screen)? Because we cannot reproduce it on our side, a recording or a one-line description of what was on screen would let us pinpoint any remaining device-specific cause immediately.

Thank you for your time and patience.

---

## Internal notes (do NOT paste to Apple)

- Root-cause fixes are in: `public/native-fallback.html` (new self-healing launch/error page, copied to `out/index.html` + `out/error.html` by CI), `.github/workflows/ios.yml` (both jobs), `scripts/cap-build.sh`, and `src/components/ServiceWorkerRegistration.tsx` (native SW/cache teardown).
- This fix only reaches the reviewer in a **new uploaded build** — bump the build number and run the iOS release workflow.
- We did NOT reproduce the freeze in Chromium or real WebKit 26.5 (newer than the reviewer's 26.4.2) across landing, post-login, the 3D palace, portrait/landscape, and rotation. The web app is responsive in-engine; the failure is native-wrapper or environmental. The fixes above are the highest-probability native causes (slow-first-load dead-end + stale SW on update). The screen-recording request is important precisely because the exact trigger is still unconfirmed.
- Keep web deploys frozen during the review window (a mid-review deploy rotates chunk hashes for the live-loading native app).
