# App Review Notes — The Memory Palace · v1.3.0 (build 45)
(Paste into App Store Connect › App Review Information › Notes)

## ⚠️ THIS VERSION IS FREE — NO IN-APP PURCHASES ARE ACTIVE
This build ships with **no active in-app purchases or subscriptions**. Our Paid Apps
Agreement is still being finalized (tax form + banking verification in progress), so **no
StoreKit products are live**. Every feature in the app is available **at no cost** in this
version. Subscriptions will be introduced in a later update once the agreement is active.

Please review the **entire app as a free app**. There is no purchase flow to test in this
build; any subscription/pricing screen is informational only and does not charge.

## Demo account (REQUIRED)
The app requires an account; email sign-up needs email confirmation a reviewer can't complete
in-app, so use this **pre-confirmed demo account with sample data**:
- Email: `apple-review@thememorypalace.ai`
- Password: `AppleReview2026!`
- (Verify before submitting: confirmed in Supabase auth — not "Waiting for verification" — and
  that these exact credentials log in on a physical device.)

## How to review
1. Log in with the demo account above (email + password — not Sign in with Apple, which makes a
   fresh empty account).
2. The onboarding walkthrough plays once; tap **Skip** (top-right) anytime to enter the palace.
3. Core experience is a 3D "memory palace": tap a wing → a room → a memory. Rotate the device —
   the app supports portrait and landscape.
4. **No purchase step.** The app is fully usable for free; nothing is paywalled in this build.

## Notes for the reviewer
- **AI features are opt-in** (Settings › Profile). Memory tagging + interview transcription only
  run after the user enables AI consent. Voice transcription uses OpenAI Whisper; other AI uses
  Anthropic. Both disclosed in the privacy policy.
- **Microphone** is used only for optional guided voice interviews / voice notes (the system
  prompt appears on first use).
- **WhatsApp "Kep" capture is optional** and not required; "WhatsApp" is referenced nominatively.
- **Cloud photo import** (Google Photos/Dropbox/OneDrive) is web-only and hidden in the iOS app.
- **User-generated content**: public profiles/palaces support Report (works logged-out) and
  Block; reports are actioned within 24h via an internal moderation queue.
- **Account deletion** is in-app at Settings › Profile › Delete Account.

## Privacy / support
- Privacy: https://www.thememorypalace.ai/privacy · Data deletion: https://www.thememorypalace.ai/data-deletion
- Support: support@thememorypalace.ai

## What changed in 1.3.0 (for the "What's New" field)
- Major mobile redesign: the app now feels native in portrait on iPhone and iPad — corrected
  safe-area spacing (Dynamic Island / home indicator), larger touch targets, responsive layouts.
- Landscape / auto-rotate support.
- Clearer, more legible navigation, menus, and footers; refined typography and spacing.
- Fixes to media viewing, the guided interviews, family tree, and account/settings screens.
- Numerous stability and accessibility improvements.

## Pre-submission checklist
- [ ] Demo account created, pre-confirmed, seeded, verified on a physical device
- [ ] **iOS purchase entry points hidden/disabled** (recommended) OR confirmed that any pricing
      screen does not open a non-functional StoreKit sheet and nothing is paywalled
- [ ] App Privacy labels: Email, Photos, Audio (voice), Coarse/Precise Location (photo EXIF),
      Usage, Device ID (push) — all "Not used to track you". **Remove "Purchases"** for this
      free build (no IAP active).
- [ ] Age rating questionnaire answered for user-to-user + AI-generated content
- [ ] Screenshots from the real app (not the web landing), portrait — 6.9"/6.7" + iPad
- [ ] "What's New" set to the 1.3.0 summary above
- [ ] Web deploy frozen during the review window (live-load app — a deploy rotates chunk hashes)
- [ ] Build 1.3.0 (45) selected for review in ASC
