# App Review Notes — The Memory Palace (paste into App Store Connect › App Review Information)

## Demo account (REQUIRED — fill in before submitting)
The app requires an account. Email sign-up needs email confirmation, which a reviewer
cannot complete in-app, so a **pre-confirmed demo account with sample data** must be
provided here.

- Email: `review@thememorypalace.ai`   ← create + pre-confirm this, seed with sample memories
- Password: `__________`               ← set a password and put it here
- (Verify the reviewer can log in with email/password inside the app, reach the full
  palace, and that the paywall opens the StoreKit sheet in the sandbox.)

## How to use the app (review walkthrough)
1. Log in with the demo account above (email + password — do NOT use Sign in with Apple,
   which creates a fresh empty account).
2. The onboarding walkthrough plays once. Tap **Skip** at any time (top-right) to jump
   straight into the palace.
3. The main experience is a 3D "memory palace": tap a wing → a room → a memory.
4. Subscriptions are **Apple In-App Purchase only** on iOS. Tap a plan on the Pricing
   screen to open the StoreKit sheet; use a sandbox Apple ID. "Restore Purchases" and
   "Manage or Cancel Subscription" are in Settings › Subscription.

## Notes for the reviewer
- **AI features are opt-in.** Memory tagging, interview transcription, and bust generation
  only run after the user enables AI consent in Settings › Profile. Voice transcription
  uses OpenAI Whisper; other AI uses Anthropic. Both are disclosed in the privacy policy.
- **WhatsApp "Kep" capture is optional** and not required to use the app. It links to
  WhatsApp only if the user opts in; "WhatsApp" is referenced nominatively (not a partnership).
- **Cloud photo import (Google Photos/Dropbox/OneDrive)** is a web-only feature and is
  hidden in the iOS app.
- **User-generated content**: public profiles/palaces support Report (works logged-out)
  and Block. Reports are actioned within 24h via an internal moderation queue.
- **Account deletion** is available in-app at Settings › Profile › Delete Account.

## Privacy
- Privacy policy: https://www.thememorypalace.ai/privacy
- Data deletion: https://www.thememorypalace.ai/data-deletion
- Support: support@thememorypalace.ai

## Pre-submission checklist (see also docs/twinkly-floating-corbato plan)
- [ ] Demo account created, pre-confirmed, seeded, and verified on a physical device
- [ ] StoreKit subscription products (keeper/guardian monthly+annual) live in ASC; sandbox-tested
- [ ] App Privacy labels updated: Email, Photos, Audio (voice), Coarse/Precise Location
      (photo EXIF), Usage, Purchases, Device ID (push) — all "Not used to track you"
- [ ] Age rating questionnaire answered for user-to-user content + AI-generated content
- [ ] Screenshots: native 6.9" (iPhone 17 Pro Max) + 6.7"/6.5"/iPad, from the real app
      (not the web landing page), portrait
- [ ] "What's New" version matches the build (1.3.0)
- [ ] Web deploy frozen during the review window (live-load app: a deploy rotates chunk hashes)
