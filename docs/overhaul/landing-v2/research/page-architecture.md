# Landing v2 — Page Architecture (Decision Document)

**Lead:** page-architecture. **Status:** DECIDED. Base for all copy/visual/build workstreams.

## Global structural decisions (non-negotiable, from 3/3-confirmed findings)

1. **Native document scroll.** Kill `#landing-scroll` (100dvh inner scroller) and the snap carousel entirely. No section ever captures wheel/keyboard input. Nav reads `window.scrollY`; hero uses `100svh`.
2. **Everything SSR'd.** Remove LazySection — all copy in served HTML (SEO + JSON-LD parity). `content-visibility:auto` for paint savings. Reveal animations visible-by-default, ≤300ms, no per-item stagger, honor `prefers-reduced-motion`.
3. **One CTA string everywhere:** **"Create Your Palace"** as a real `<a href="/register">` (works pre-hydration). Web microcopy under it: "Free forever · No credit card · No tech skills needed"; iOS microcopy via explicit `*_ios` keys: "Ready in minutes · No tech skills needed". Retire `iosCta()` dash-stripping. Nav/footer: "Get Started".
4. **iOS seal preserved verbatim:** `page.tsx` dynamic SSR + `initialIosApp` plumbing carried through the new tree. CI grep fails on `/free|gratis|kostenlos|gratuit|credit card/i` in iOS-path keys; post-deploy `curl -A MemoryPalace-iOS` check.
5. **No unprovable claims ship.** E2EE / bank-grade / fabricated testimonials / "Forever Plan" / false comparison rows removed before this IA ships. Supabase Frankfurt region verification is a ship-gate for every EU-storage claim.

## Persuasion arc

Promise → Show → Prove → Explain → Handle objections → Close on legacy.

## Section order (final)

1. **Hero — Promise + Product.** Bright golden-hour palace interior (re-encoded from hero-bg-original, poster-first, reduced-motion/save-data still, no CSS dimming stack). Headline visible at first paint, no `<br/>`, `text-wrap:balance`; current line is control in a PostHog 4-arm test (O1/E2/I1). Sub carries category + SEO: "A 3D family home for your photos, voices and life stories — built together, passed on." Primary CTA + demoted text-link secondary "▶ Watch the 90-second tour" (opens walkthrough **lightbox** — never scrolls to text). Trust chips: three TRUE claims only — GDPR · EU data storage · Encrypted at Rest & in Transit — each linking /security. **iOS:** `*_ios` microcopy, price-free aria-labels.
2. **Proof strip (thin).** Honest facts, no counts until real and above a vanity floor: "Free plan, no time limit · 5 languages · Export everything, anytime." Replaces the old stats bar; kills "Forever Plan"/"256-bit Bank-Grade"/"E2EE". **iOS:** "Free plan" chip → "Unlimited wings & rooms".
3. **Show the product — "Step inside a real palace." (#tour)** Full-width attributed walkthrough (narrated + captioned cut of Guillaume's palace, named with consent) + 2–3 featured-palace cards from `getFeatured()` → /explore, "No account needed." This slot is BOTH the product demonstration and the social proof — real walkable palaces replace the fabricated testimonials, which are **CUT everywhere** (landing + /pricing) until consented quotes exist; if quotes land later, they slot in here, never as a fake wall.
4. **Flagship features — 4 alternating image+text bands (#features)** — replaces the 12-card wall:
   - **WhatsApp Capture (Kep)** — simplicity objection killer: "If you can send a WhatsApp message, you can build a palace." (Meta go-live confirmed first.) Upload/Receive-Shared fold in as bullets.
   - **Cinematic 3D Palace + Voice** — "Photos show what happened. Your voice tells why it mattered." Full-bleed interior render, one audible voice moment.
   - **AI does the sorting** — effort objection: "You bring the photos. AI does the sorting." Footnote on every AI band: "AI is opt-in and never trains on your memories."
   - **Together & onward** — Co-Creation + Time Capsules + Legacy ("Choose who gets the keys" — corrected copy, no video-message claim). **iOS:** no plan badges.
   Each band: one 6–10-word benefit headline, one sentence ≥1.0625rem, one inline action.
5. **Everything-else strip.** Memory Map, Family Tree, Journeys, Cloud Import, Sharing as a compact icon-chip row linking to /features/[slug]. **CUT from landing:** "Explore & Connect" card (privacy-dissonant), all false copy (pedigree views, tree-"integrated in your palace", record-video legacy).
6. **How it works — "Three steps. Five minutes." (#how-it-works)** Real screenshot per step; step 1 renamed "Add Your Memories"; **"For yourself / As a gift"** persona toggle (Storyworth pattern) — gift path is the adult-child lane. **iOS:** toggle hidden, single free path.
7. **Why a palace? (new band).** Method-of-loci story, 4 sentences + "Read the 2,500-year story →" blog link. Category noun coined and repeated: **"a memory home."** Product-organization framing only; no memory-improvement/health claims.
8. **Comparison — reframed as elevation.** "Keep Google Photos. It's the drive. This is the home." 4–5 truthful rows (false rows 3/4/7 rewritten per research), one row competitors win (backup/sync), real `<table>` semantics, brand column visibly elevated, import reassurance line beneath. Memoir-services frame ("A book ends. A palace grows.") lives in FAQ. Placed here — after demo, while the objection is fresh.
9. **Pricing strip (web only).** "Free forever — unlimited rooms, 1 GB, full export. Upgrade from €9.99/mo only if you outgrow it. Trial never auto-charges." **iOS: section omitted entirely, server-side** (a4_ios pattern).
10. **The Forever Promise + Founder.** Named permanence block ("Export everything as a ZIP anytime, on every plan — if we ever shut down, 90 days and your complete archive," linked to the ToS clause) + signed founder note with photo: small independent EU team, no ads, no data sales. The emotional/legacy close.
11. **FAQ (visible accordion, #faq).** Existing translated keys + exact JSON-LD parity. Adds: q0 "What is a memory palace?", StoryWorth/Remento, "What happens to my palace when I'm gone?", AI privacy, corrected free-plan answer, device/motion comfort. **iOS:** `a{n}_ios` variants; store badges hidden.
12. **Final CTA — visual peak.** Full-bleed bright palace render, hero-scale headline, invitation not fear: "Begin with one memory. The rest will follow." Single CTA. **Exit-intent modal: deleted on all platforms.**
13. **Footer (shared MarketingFooter).** Legal entity + address (Impressum), /security, /explore, /about, real store badges or none, 3–5 cornerstone blog links, populated sameAs.

## Anchor nav (shared MarketingHeader, adopted on /pricing /blog /security)

Logo · **Tour** (#tour) · **How it works** (#how-it-works) · **Features** (#features) · **FAQ** (#faq) · **Pricing** (/pricing, web only) · Sign in · **Get Started**. All ids on real `<section>` with `scroll-margin-top: 5rem`; fragment links work because the document scrolls.

## iOS (Apple 3.1.1) — sections that differ

| Section | iOS behavior |
|---|---|
| Hero CTA/microcopy/aria | `*_ios` keys, zero price words |
| Proof strip | "Free plan" chip → neutral |
| How-it-works | gift toggle hidden |
| Pricing strip (9) | **omitted entirely, server-side** |
| FAQ | `a{n}_ios`, badges hidden |
| Nav/footer pricing links | hidden (existing gates) |

## Kill list

`#landing-scroll` scroller · snap carousel · LazySection · exit-intent modal · mid-page "Store Your Memories Now" CTA · 12-card grid · fabricated testimonials (landing + /pricing) · E2EE/bank-grade/SSL chips · "Free Forever Plan" stat · duplicate Organization JSON-LD + fabricated aggregateRating.
