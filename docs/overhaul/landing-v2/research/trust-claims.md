# Trust Architecture — Landing v2 Decisions (trust-claims lead)

Status: DECIDED. These are decisions, not options. All copy changes apply to all 5 locales (EN/NL/DE/ES/FR) and must preserve the iOS 3.1.1 seal (initialIosApp SSR plumbing verbatim; no pricing words on the iOS path).

## 1. Corrected claims (blocking — ship before any redesign)

1. **E2EE is dead.** Replace `landing.trustBadges.encrypted` everywhere with:
   - EN "Encrypted at Rest & in Transit" · NL "Versleuteld bij opslag & verzending" · DE "Verschlüsselt bei Speicherung & Übertragung" · ES "Cifrado en reposo y en tránsito" · FR "Chiffré au repos et en transit".
   - Fix `src/app/security/layout.tsx` (lines 5/8/25) to: "AES-256 encryption at rest, TLS in transit, and GDPR compliance." Drop "enterprise-grade."
   - Sweep every file matching `end-to-end|E2EE` (messages/*.json, blog en.ts/nl.ts, security/layout.tsx). Never soften to "Fully Encrypted".
2. **"Bank-grade" / "256-bit" is dead.** Stats bar stat4 → **"AES-256 / Encrypted at Rest"**. Footer → "AES-256 at rest · TLS in transit". FAQ a2 rewrite (feeds JSON-LD): "Encrypted in transit (TLS) and at rest (AES-256) on EU servers — and you can export everything at any time." Mirror faq5a. Never claim "256-bit" for the connection. Fix DE "Bankverschlüsselung" / NL "Bankwaardige encryptie" calques.
3. **"SSL Encrypted" chip is dead.** Hero chip trio becomes three distinct true claims: **GDPR Compliant · EU Data Storage · Encrypted at Rest & in Transit** — every chip links to /security.
4. **EU hosting is scoped to storage.** Wording: "Your memories stored in Frankfurt, Germany — GDPR compliant." Never "EU-hosted" unqualified (edge/CDN/AI processors are not EU). FAQ: "Stored on EU servers in Frankfurt, encrypted at rest. Optional AI features use vetted processors under GDPR data-processing agreements — you can skip them entirely." Drop "Protected by GDPR" phrasing. **Precondition: verify the Supabase project region (dashboard, 1 minute) before deploy. If not eu-central-1: migrate or strip every Frankfurt claim.** Privacy policy must list OpenAI, Anthropic, Resend, Stripe, Meta as sub-processors.
5. **Free-claim honesty.** Drop "Forever": stat2 → "€0 / Free plan — no time limit, no card" (iOS: "Unlimited / Wings & Rooms"). Replace "no catch" with "Your palace starts free — 1 GB of memories, unlimited rooms, no credit card. Upgrade only if you outgrow it." Add `midCta.text_ios` / `cta.description_ios` keys (no credit-card mentions on iOS); gate the exit-intent modal with `if (isIosApp) return;`. Fix Help Center faq2a (5 rooms/50 memories is false) to match plans.ts. Delete the dead "grandfathering" comment in plan-limits.ts:138 or reinstate the behavior.
6. **Trust-adjacent feature-claim fixes.** Legacy card: no "record video messages" (text-only in code) → "Write the letters you keep meaning to write, and decide exactly when they arrive." AI Interviews: drop "transcribes, tags, and places". Family Tree: drop "walk through the memories of each generation" and "pedigree views" (4 keys × 5 locales). **Verify Meta go-live for Kep with a non-test number before keeping the WhatsApp card.**
7. **CI grep gate** (pre-deploy): fail on `end-to-end|E2EE|bank-grade|bankwaardig|Bankversch|256-bit` in src/messages + src/app; fail on `/free|gratis|kostenlos|gratuit|credit card/i` in iOS-path keys.

## 2. Trust modules

- **/security is the proof surface.** Every trust chip, stat, and footer claim links to it. One hero-adjacent line: "Read exactly how we protect your memories →".
- **"The Forever Promise" block** (named, near final CTA): "Export everything as a ZIP anytime, on every plan — and if we ever shut down, you get 90 days and your complete archive." Both claims are backed (plans.ts featFullExport; ToS §5). Link the ToS clause.
- **Legacy module** (top third): "When a Google account goes quiet, the photos vanish with it. A palace has heirs." Promise only what exists: legacy contacts + time capsules.
- **AI reassurance footnote** on every AI card: "AI is opt-in and never trains on your memories." Verify against current Anthropic commercial terms before ship.
- **Surface the FAQ visibly** (today it's JSON-LD + trapped below the carousel). Add data-export and "what happens when I'm gone" questions.
- **Footer identity:** legal entity, address, contact email; founder name. Required for DE (Impressum) and disqualifying to omit for an heirloom product.

## 3. Honest social proof — deployable NOW

- **Remove all four fabricated testimonials** (en.json 1273-1289) + /pricing "Maria S."/"Thomas K." + "Join thousands" (en.json 4436) in all locales. Per-se banned under EU Omnibus. No replacement until real, written-consented quotes exist (ask Guillaume, Android testers, featured-palace owners; first name + last initial, real age, no performance numbers, no prices).
- **Delete aggregateRating (4.8/12) from JSON-LD** and the 30-day money-back badge on /pricing (no ToS clause — replace with "Free forever plan — no credit card"; EU 14-day withdrawal right may be cited).
- **Ship module A: "See a real palace"** — 2-3 featured palace cards from getFeatured(), "Don't take our word for it. Step inside a real palace — no account needed." → /explore. This is our Trustpilot-substitute: interactive, verifiable, live today.
- **Ship module B: founder note** near final CTA — Bram, photo, "small, independent European team. No big-tech backing, no ads, no selling your data."
- **Ship module C: attribute the walkthrough** — "Guillaume's palace — a real member's home for three generations of memories" (with his consent).
- Start Trustpilot collection now. No user counts, stars, or press until real and above a vanity floor (10k memories / 1k palaces).

## 4. Comparison table v2

- **Frame: complement, not replacement.** Title: "Keep Google Photos. It's the drive. This is the home." Subtitle: "A folder stores your photos. A palace remembers your life."
- **Five rows max** (merge old 1/2/5): Organization; Storytelling (machine montage vs your voice); Sharing — FIX false "links expire" claim (left: "Shared albums: a grid with likes and comments"); Legacy — FIX both columns (left: "heirs inherit a raw archive of 40,000 unlabeled files"; right: only time capsules + legacy contacts); Capture (our strongest row: WhatsApp + import FROM Google Photos/Dropbox). **One concession row: "Backup & camera sync: excellent — keep using it. Connect it and your photos move in; originals stay untouched."** Cheapest credibility on the page.
- **Placement:** directly after the walkthrough video / "Three steps" — where the objection forms. Real `<table>/<th scope>` semantics; brand column visibly elevated; mobile = stacked cards; one animation for the whole table or none.
- **Add the memoir frame** as one line + FAQ ("How is this different from StoryWorth or Remento?" — "A book ends. A palace grows."; in NL/DE/FR lead with the language advantage), and genealogy-as-feeder ("Bring your Ancestry or MyHeritage tree with you — GEDCOM import/export"). Fix "pedigree views" (doesn't exist) in all 4 keys.
