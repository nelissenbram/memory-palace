# Resubmission Checklist — build 46 (1.3.0), Apple 2.1(a) rejection

## ✅ Done in code (committed on `feature/library-navigation`)
Launch-freeze cluster, 3.1.1 anti-steering + iOS CTA hiding, 4.8 Apple-first,
2.1 OAuth no-dead-spinner, 2.3.10 logo gating, 5.1.4 photo redaction, privacy
manifest embed, custom-scheme OAuth return. (Commits `673a606`, `262e48b`.)

## ⚠️ YOU MUST DO before the next build — or things regress

### 1. Supabase: allowlist the native OAuth redirect (2 min, do this FIRST)
The native app now returns from Google/Apple sign-in via a custom scheme. Supabase
rejects redirects that aren't allowlisted, so **without this, native social login
fails** (it will show a clear error now, not a freeze — but it still won't log in).

- Supabase dashboard → your project (`cpmcbodklvpvvgimzbfj`) →
  **Authentication → URL Configuration → Redirect URLs** → **Add URL**:
  ```
  ai.thememorypalace.app://auth/callback
  ```
- Leave the existing `https://www.thememorypalace.ai/auth/callback` entry in place
  (web still uses it). This change is **additive and safe** — it does not affect web.

### 2. Screenshots (2.3) — recapture real in-app screens
6 of 8 iOS 6.7" screenshots + the iPad set are the marketing landing page with
overlays, not the actual app. Recapture from a **seeded, logged-in** account
(`review@thememorypalace.ai`) showing the real 3D exterior, a room, family tree,
library, achievements. Replace in App Store Connect. (Independently rejectable.)

## Resubmit flow
1. Do step 1 (Supabase) and step 2 (screenshots).
2. Confirm **GitHub `ios.yml`** is the pipeline you trigger (you were "pretty sure").
   `codemagic.yaml` is fixed identically as a safety net.
3. Trigger the iOS release build → new build number (= CI run number, auto-increments).
4. In App Store Connect, also clean up:
   - Remove the **"Purchases"** App Privacy label (StoreKit is inactive; iOS is free now).
   - Keep web deploys **frozen** during review (a mid-review deploy rotates chunk
     hashes for the live-loading native app).
5. Reply to the reviewer using `store-assets/APPLE_REPLY_2026-06-26.md`, and request
   a screen recording if it recurs.

## Verify on a real device before submitting (the conditions Apple tested)
Install build 46 **as an update over the previous version** on an iPhone + iOS 26,
on a normal network, and confirm:
- App reaches an interactive screen every launch (no blank/spinner-only).
- Tapping works immediately (no dead first taps).
- Google AND Apple sign-in complete and return to the app (after step 1).
- No upgrade/subscribe buttons appear anywhere on iOS.

## Still open (lower priority / deferred — not blockers for this resubmit)
- OAuth: if sign-in still misbehaves, the deeper fix is cold-start `App.getLaunchUrl()`
  + extending the AASA file. The current change covers the in-session sheet flow.
- 3D launch perf (ExteriorScene eager-mounts at launch, bypasses the renderer pool,
  no WebGL context-loss handler). Real but risky to change blind — do isolated, with
  device testing.
- Privacy manifest data-type accuracy (audio/name/location/device-ID under-declared)
  and the CI embed both want one real macOS build-log check to confirm they took.
