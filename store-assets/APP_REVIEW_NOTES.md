# App Review Notes — The Memory Palace · v1.3.0 (build 46)
(Paste into App Store Connect › App Review Information › Notes)

## Re: Guideline 2.1(a) — "not responsive after launch" (previous rejection)
Thank you for the report. We could not reproduce an unresponsive launch on our devices
or on the latest iOS, but we identified and fixed several launch-path issues and verified
the app reaches an interactive state on every launch. In this build (46):
- The launch splash no longer hides before the app's first screen has painted (it could
  previously reveal a blank view on a slow/cold-start network).
- The initial loading overlay can no longer intercept the first taps.
- A slow server response on launch no longer withholds the screen (added a timeout fallback).
- Any service worker left by a previous version is cleared on launch (prevented a stale-cache
  reload loop on the update path).
- Sign-in returns reliably to the app via a registered URL scheme.
If anything still appears unresponsive on your device, a short screen recording or a note of
which screen appeared would let us pinpoint it immediately — thank you.

## THIS VERSION IS FREE — NO IN-APP PURCHASES ARE ACTIVE
This build ships with **no active in-app purchases or subscriptions**. Our Paid Apps Agreement
is still being finalized (tax + banking), so **no StoreKit products are live**. Every feature is
available **at no cost**. In this build, **all subscription/upgrade buttons are hidden on iOS** —
the app is cleanly free; nothing is paywalled and there is no purchase step to complete.

## Demo account (REQUIRED)
The app requires an account; email sign-up needs a confirmation a reviewer can't complete
in-app, so use this **pre-confirmed demo account with sample data**:
- Email: `apple-review@thememorypalace.ai`
- Password: `AppleReview2026!`
- (Verify before submitting: the account is confirmed in auth — not "Waiting for verification" —
  and these exact credentials log in on a physical device.)

## How to review
1. Log in with the demo account above (email + password — Sign in with Apple creates a fresh
   empty account; on iOS, Sign in with Apple is offered first, alongside Google).
2. The onboarding walkthrough plays once; tap **Skip** (top-right) to enter the palace.
3. Core experience is a 3D "memory palace": tap a wing → a room → a memory. The app supports
   both portrait and landscape.
4. **No purchase step** — the app is fully usable for free; nothing is paywalled.

## User-generated content & safety (Guideline 1.2)
- **Report**: open any public profile (tap a creator, or Explore › a palace) → the "⋯" safety
  menu → **Report** (works while logged out too). Comments have the same Report menu.
- **Block**: the same safety menu on a profile has **Block user**.
- **Manage blocks**: Settings › Security › **Blocked accounts**.
- Text content is screened, and reports are actioned within 24h via an internal queue.

## Other notes
- **AI features are opt-in** (Settings › Profile). Voice transcription uses OpenAI Whisper;
  other AI uses Anthropic. Both disclosed in the privacy policy.
- **Microphone** is used only for optional guided voice interviews / voice notes.
- **WhatsApp "Kep" capture is optional**; "WhatsApp" is referenced nominatively.
- **Cloud photo import** is web-only and hidden in the iOS app.
- **Account deletion** is in-app at Settings › Profile › Delete Account.

## Privacy / support
- Privacy: https://www.thememorypalace.ai/privacy · Data deletion: https://www.thememorypalace.ai/data-deletion
- Support: support@thememorypalace.ai

## What's New (1.3.0)
- Resolved a launch-stability issue and hardened the startup path.
- Major mobile redesign: native feel in portrait on iPhone and iPad, corrected safe-area
  spacing (Dynamic Island / home indicator), larger touch targets, responsive layouts.
- Landscape / auto-rotate support.
- Fixes across media viewing, guided interviews, family tree, and account/settings.
- Numerous stability and accessibility improvements.

## Pre-submission checklist
- [ ] Demo account confirmed, seeded, and verified on a physical device
- [ ] Add the native OAuth redirect `ai.thememorypalace.app://auth/callback` to Supabase ›
      Authentication › URL Configuration › Redirect URLs (done — required for social login)
- [ ] App Privacy labels accurate; **remove "Purchases"** for this free build (no IAP active)
- [ ] Age rating questionnaire answered for user-to-user + AI-generated content
- [ ] Real-app screenshots uploaded (1284×2778, 6.5") — not the web landing
- [ ] Build 1.3.0 (46) selected for review
- [ ] Freeze web deploys during the review window (live-load app)
