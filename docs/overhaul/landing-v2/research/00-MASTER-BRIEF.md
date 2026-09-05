# LANDING V2 — MASTER DESIGN BRIEF (00)

Creative director synthesis · 2026-07-16 · Status: **FINAL — implement section by section as written.**
Inputs: design-direction.md, copy-messaging.md, page-architecture.md, motion-interaction.md, trust-claims.md, assets-plan.md, a11y-i18n-guardrails.md. Confirmed audit: confirmed-findings.json (same folder).

**Authority order when this brief is silent:** page-architecture (structure) → copy-messaging (words) → design-direction (visuals) → motion-interaction (behavior) → trust-claims (claims) → assets-plan (media) → a11y-i18n-guardrails (always binding, overrides everything on compliance).

---

## 0. Conflict resolutions (binding)

Seven conflicts existed between briefs. Resolutions:

1. **Section order.** design-direction §2 sketched its own sequence (dark showcase mid-page, "FAQ/testimonials" late). **page-architecture's 13-section order wins** — it implements the confirmed "show the product early" findings. The tonal ladder is re-mapped onto that order (see §3).
2. **Showcase placement.** design-direction put the dark "This is a palace" showcase after the why-a-palace band; page-architecture puts product demonstration at position 3. **Position 3 wins.** The dark showcase, the walkthrough lightbox source, the featured-palace cards, and the "This is not a photo album / This is a palace" copy moment are ONE section (#tour, section 3).
3. **Testimonials.** design-direction's sequence mentioned "FAQ/testimonials"; trust-claims cuts all testimonials (fabricated, EU Omnibus per-se ban). **Cut everywhere (landing + /pricing), all locales.** If real written-consented quotes land later, they slot into section 3, never as a wall.
4. **Hero sub-headline.** page-architecture proposed "A 3D family home for your photos, voices and life stories — built together, passed on."; copy-messaging decided a different sub. **copy-messaging wins** (it is the copy authority); page-architecture's line survives as the SEO support sentence under the hero (§3.1).
5. **Dark-section count.** design-direction said "exactly TWO dark sections" but also listed a dark final CTA. Resolution: **two flat-umber sections (hero, showcase #tour).** The final CTA is a full-bleed **bright** golden-hour render (S2 entrance hall) that transitions into the dark footer — it reads warm, not umber, and satisfies "the page ends on a peak."
6. **Reveal animation recipe.** design-direction said "opacity 0.4→1, ≤300ms"; motion-interaction specified opacity .001 + translateY(12px), 280ms, rootMargin 250px. **motion-interaction's recipe wins verbatim** (motion authority): visible-by-default SSR, post-hydration hidden class, one block per section, max one +80ms media tier.
7. **Font files.** design-direction: Cormorant 500/600 + 500-italic; a11y-guardrails: Cormorant 400/500 + one italic. **Ship exactly 5 WOFF2: Cormorant Garamond 500, 600, 500-italic + Manrope 400, 600.** Weight 300 and 400 Cormorant are retired (weight ≥500 is a legibility decision for 60+ eyes; 600 is required for the gold italic accent).
8. **Trust chip 3 wording.** "Stored in the EU" (copy) vs "EU Data Storage" (trust). **"Stored in the EU"** — one string, one key. Ships ONLY after Supabase Frankfurt region is verified in the dashboard; until then the third chip is **"Export Anytime"**.
9. **DE register.** "Erstelle deinen Palast" (du) appeared in older findings. **Sie register is final** (copy + a11y agree): "Erstellen Sie Ihren Palast", full native DE rewrite.

---

## 1. Non-negotiables (violations block deploy)

1. **Apple 3.1.1 seal preserved verbatim.** `page.tsx` keeps `cookies()/headers()` (route stays dynamic); `initialIosApp` prop plumbing carried through the new tree; `middleware.ts` `/pricing → /atrium` untouched. `iosCta()` dash-stripping is RETIRED — the primary CTA label is price-free by construction; all iOS-divergent copy uses explicit `*_ios` keys (a4_ios pattern). Exit-intent modal deleted (all platforms). Pricing strip, gift toggle, store badges, credit-card copy: server-gated off on iOS. aria-labels = visible labels, no price words on iOS path. CI grep fails on `/free|gratis|kostenlos|gratuit|crédit|credit card|plan|prijs|preis|precio|upgrade/i` in any iOS-path key, all 5 locales. Post-deploy: `curl -A MemoryPalace-iOS` + `mp_platform=ios` cookie against prod — zero pricing strings in SSR HTML. Deploy only from committed master.
2. **Truth gate.** These strings never ship again: "End-to-End Encrypted", "256-bit", "Bank-Grade" (+ DE/NL calques), "SSL Encrypted", "Free Forever Plan", "no catch", "Join thousands", all four fabricated testimonials, /pricing "Maria S."/"Thomas K.", "30-day money-back" (no ToS clause), aggregateRating 4.8/12, "record video messages" (legacy), "pedigree views" (4 keys), family-tree "integrated in your palace", comparison rows 3/4/7 as written. Fix `src/app/security/layout.tsx:5/8/25`. CI grep: `/end-to-end|E2EE|bank-grade|bankwaardig|Bankversch|256-bit|forever plan/i` fails the build in src/messages + src/app.
3. **Ship-gates requiring verification first:** (a) Supabase project region = eu-central-1 (else strip every Frankfurt/EU-storage claim); (b) Meta go-live for Kep — send a photo from a non-test number (else WhatsApp band relabels "rolling out" or is pulled); (c) Guillaume's written consent for name + walkthrough attribution; (d) Anthropic commercial terms still support "never trains on your memories".
4. **Structural laws.** The DOCUMENT scrolls — `#landing-scroll` (100dvh inner scroller) is deleted; hero uses `100svh`. No `scroll-snap-type: x mandatory` anywhere; no wheel/touch preventDefault; no scroll-jacking. LazySection deleted — every section SSR-renders full content (`content-visibility:auto` + `contain-intrinsic-size` for paint). Both hero CTAs are real `<a href>` working pre-hydration. Locale JSONs never statically imported into the client — server passes only the active locale's `landing` slice. Zero full-page re-renders on scroll (IO sentinels / threshold booleans only).
5. **Budgets.** Client JS <100KB gzip. LCP ≤2.5s 4G (element = preloaded hero poster; headline never animates from opacity 0). Hero loop ≤1.5MB; walkthrough ≤4MB 720p rendition; above-fold media ≤1.8MB desktop / ≤400KB mobile (still only); full-scroll ≤6MB. Fonts: the 5 WOFF2 of §0.7, `T.font.*` → `var(--font-display)/var(--font-body)`, googleapis preconnect removed. Lighthouse a11y ≥95, mobile perf ≥90. CLS during scroll = 0; no blank pixel >150ms in-viewport.

---

## 2. Design system (ADD-only tokens in `src/lib/theme.ts` as `T.land`; port `T.motion` from overhaul/design-perf first)

### 2.1 Palette — 4-step warm tonal ladder
- **canvas** `#FCFAF5` · **surface/linen** `#F2EDE4` (cards get 1px `#E3D6BC` hairline, no drop shadows) · **mid/parchment** `#EFE6D4` (new — the ramp into dark) · **dark/umber** `#241C15` (replaces all ad-hoc `#1a1a18`/`#3D3D3A`; scrims derived from it, never `#2A2218`).
- Rules: every section boundary ≥1.3:1; no two adjacent sections share a background; dark never touches dark; bands inherit the background above them; dark sections always host the page's brightest imagery.

### 2.2 Accents & inks
- **Gold `#D4AF37`:** text accent on dark ONLY (8.1:1). On light: graphic-only (divider rules, 2px card top-borders, icon strokes). Gold text on linen is banned.
- **rustDeep `#9A4F2A`:** the light-background text accent (eyebrows, links, stat numerals). **Terracotta `#C66B3D`:** hover/glow only — never carries text again (retains its role as 2px `:focus-visible` outline).
- **CTA gradient, one everywhere:** `rustDeep #9A4F2A → rustDarker #6B3318`, white 600 label (5.7–8.9:1).
- **Inks:** body-on-light `inkSoft #403B36`; muted-on-light `#716A5E` (MUTED_ON_LIGHT, promoted to token); muted-on-warmStone `#5E574C`; muted-on-dark `#B5ADA3`. **Walnut `#8B7355` is reclassified non-text ink** (borders/decoration only).

### 2.3 Typography — 8 styles total, nothing else
- Display = Cormorant Garamond **500** (600 for the gold italic accent), reserved ≥1.75rem. Body/UI = Manrope 400/600. Card titles = Manrope 600 (never Cormorant at card size). Second text-shadow crutch deleted.
- Scale (base 1.125rem, ratio ~1.2), tokenized `T.land.type`: micro `0.75rem` (uppercase eyebrows, tracking `0.14em`, em only) · body-s `1rem` (floor for ALL functional text) · body `1.125rem`/1.6 · lead `1.3125rem`/1.5 · h4 `1.5rem` · h3 `1.875rem` · h2 `clamp(2rem,3.5vw,3rem)`/1.15 · h1 `clamp(2.75rem,5.5vw,4.25rem)`/1.08.
- `textWrap:'balance'` on h1–h3, `'pretty'` on paragraphs; NO hard `<br/>` in any headline; h1 maxWidth 60rem; paragraphs maxWidth 34em. All 62 sub-1rem declarations die; nothing below 0.75rem ships.

### 2.4 Spacing & containers
`T.land.space`: 8px ladder; sectionY `clamp(5rem,8vw,7.5rem)`; bandY `3rem`; headingGap = eyebrow →0.75rem→ H2 →1rem→ intro →3rem→ content. **Two containers only:** wide `72rem`, prose `42rem`. Card padding `1.5rem`, gutter `1.5rem`. CSS-first responsiveness on ONE breakpoint set: 480/768/1024.

### 2.5 Motion tokens
`T.motion`: fast 100ms · base 160ms · slow 400ms · ignite 520ms · ease `cubic-bezier(0.22,1,0.36,1)` + landing-only `reveal: 280ms`. Global law: motion never takes input from the user. Reveal recipe (one shared component): SSR visible → post-hydration class `opacity:.001; translateY(12px)` → IO with `rootMargin '0px 0px 250px 0px'` → final over 280ms. No per-item stagger; max one +80ms media tier. Reduced-motion: final state rendered, opacity-only ≤120ms permitted, video never plays, poster shown, smooth scroll → auto. Hover: CTA darkens + `translateY(-1px)` + warm shadow (100ms in / 160ms out); cards lift −4px (160ms); FAQ accordion grid-rows trick 400ms; links underline via background-size. Everything has a `:focus-visible` twin.

### 2.6 Imagery language
The product is the illustration. Thin-line icons retired from Tier-1; every major claim proven by a fresh 2×-retina UI-free render from the staged demo palace, framed in the signature **"palace window"** component: 16px radius, linen fill, 1px `#E3D6BC` hairline, HTML captions (i18n), real alt text from `landing.a11y.*`. Tier-2 keeps small duotone glyphs (rustDeep stroke, ≥24px, one family). LandingIllustrations survives only as low-opacity section-divider arch/column motifs. All renders share one baked-in golden-hour grade — CSS dimming filters are deleted everywhere.

---

## 3. Final page — section by section

Persuasion arc: **Promise → Show → Prove → Explain → Handle objections → Close on legacy.**
Tonal ladder mapping: 1 dark(umber) · 2 canvas · 3 dark(umber) · 4 alternating canvas/linen · 5 linen · 6 canvas · 7 parchment · 8 canvas · 9 linen band · 10 parchment · 11 linen · 12 bright full-bleed render · 13 dark footer.

Anchor nav (shared **MarketingHeader**, adopted on /pricing, /blog, /security): Logo · Tour (#tour) · How it works (#how-it-works) · Features (#features) · FAQ (#faq) · Pricing (/pricing, web only) · Sign in · **Get Started**. All ids on real `<section>` with `scroll-margin-top:5rem`. No `whiteSpace:nowrap` on nav links; per-locale short labels (DE "Ablauf", FR "Fonctions").

### 3.1 Hero — Promise + Product (umber, 100svh)
- **Eyebrow:** `A 3D HOME FOR YOUR FAMILY'S MEMORIES` (micro style, gold on dark; short-string fallback fixed).
- **H1 (visible at first paint, never animated):** `Turn a lifetime of photos into a place your family can visit.` — text-wrap balance, no `<br/>`. PostHog 4-arm test (control · O1 ships as default · E2 `The cloud stores your photos. It doesn't tell your story.` · I1 `Become the keeper of your family's story.`); metric = signup start, guardrail = tour-video plays.
- **Sub (web):** `A beautiful 3D palace for your photos, voice recordings, and life stories — explore it together with your family. Free to start, no credit card needed.`
- **Sub (iOS, `*_ios` key):** same, ending `…together with your family. Ready in minutes — no tech skills needed.`
- **SEO support line (small, under sub or sr-adjacent):** `A 3D family home for your photos, voices and life stories — built together, passed on.`
- **Primary CTA:** `Create Your Palace` — real `<a href="/register">`, one message key `landing.cta.primary`, the single highest-contrast element at first paint. Microcopy under it — web: `Free forever · No credit card · No tech skills needed` (gated `!isIosApp`); iOS: `Ready in minutes · No tech skills needed`.
- **Secondary (demoted text link, ~60% visual mass):** `▶ Watch the 90-Second Tour` → opens walkthrough **lightbox** (role=dialog, focus-trapped, Esc, 200ms backdrop, panel scale .97→1). Never scrolls to a text section.
- **Trust chips (three TRUE claims, each links /security):** `GDPR Compliant` · `Encrypted at Rest & in Transit` · `Stored in the EU`* (*Frankfurt-verified; fallback `Export Anytime`). Plus one quiet line: `Read exactly how we protect your memories →`.
- **Visual:** re-encoded golden-hour exterior (S1) from hero-bg-original.mp4 — 1080p H.264 ~1.5Mbps + AV1/WebM, grade baked in, opacity 0.65, ONE uniform scrim rgba(36,28,21,0.65) behind the text block only, `poster=/video/hero-poster.jpg` (40–80KB, `<link rel=preload as=image fetchpriority=high>`). Mobile / saveData / 2g-3g / reduced-motion: poster still, `.play()` never called; forced-play document listeners deleted. Visible 44px pause toggle. Loop ≤15s. Frame-zero test: paused at second zero it must read "beautiful walkable 3D home."
- **Motion:** headline/sub/CTA static; chips + scroll hint rise 8px over 520ms, one group, 150ms delay. One signature micro-moment: 4s CSS light-bloom in the villa doorway (aria-hidden, killed under reduced motion). No cursor parallax.

### 3.2 Proof strip (canvas band, bandY)
Four honest stats, rustDeep numerals, labels ≥4.5:1, ≥1rem:
`€0 — Free plan, no time limit, no card` (iOS: `Unlimited — Wings & Rooms`) · `5 — Languages` · `AES-256 — Encrypted at rest` · `100% — Yours, export anytime`.
No counts, stars, or press until real and above the vanity floor (10k memories / 1k palaces).

### 3.3 #tour — "Step inside a real palace." (umber, full-bleed — the SHOW + PROVE section)
- **Copy moment:** eyebrow `This is not a photo album.` (micro, gold — not shouted) / H2 `This is a palace.` / intro `Step inside. This is what a memory looks like when it has a home.`
- **Full-bleed payoff:** S4 photo-wall close-up render glowing against umber; hero-ob.mp4 (hands touching framed photos, sunlit arcade — our best emotional clip) gets its moment here as a muted lazy loop ≤2MB.
- **Walkthrough:** narrated 45–60s cut of Guillaume's palace, poster-first click-to-play (also the lightbox target from the hero). Attribution (consented): `Guillaume's palace — a real member's home for three generations of memories.` WebVTT captions ×5 locales; 720p ~3–4MB rendition; if narration slips, ship score + captions and remove the dead volume control.
- **Real-palace proof (Trustpilot substitute):** 2–3 featured-palace cards from `getFeatured()` → /explore: `Don't take our word for it. Step inside a real palace — no account needed.`
- **Phone moment:** ONE "also on your phone" beat — frameless portrait capture (S11), HTML caption. Desktop ≥768px: static 3-up grid, hover lift −4px. Touch <768px: native swipe strip, `scroll-snap-type: x proximity` (NEVER mandatory), `overscroll-behavior-x: contain`, 44px prev/next buttons via `scrollBy`, dots, `tabIndex=0`, arrow keys, `role=region aria-roledescription=carousel`, full-opacity scrollbar, zero wheel listeners. Old snap carousel and all baked-caption store screenshots are dead.

### 3.4 #features — Four flagship bands (alternating canvas/linen image+text, palace-window frames)
Each band: one 6–10-word benefit headline (h3), one sentence ≥1.0625rem, one inline action, one real render. Order:
1. **Send it on WhatsApp** (ship only after Meta go-live verified) — H: `If you can send a WhatsApp message, you can build a palace.` Body: `Send a photo or voice message on WhatsApp — it appears in your palace, sorted and ready. No new app for mom; she already knows WhatsApp.` (Second mention: "our WhatsApp assistant, Kep.") Visual: S5 chat-bubble→framed-on-wall sequence + ≤1MB muted WebM loop. Upload & Receive-Shared fold in as two bullets. Action: `See how it works →`.
2. **A home you can walk through — with voice** — H: `Photos show what happened. Your voice tells why it mattered.` Body: `Your photos, voices and stories live in rooms — walk past them, together.` Visual: S3 filled memory room (signature shot), one audible press-to-play voice moment (photo card + waveform; deliberate press is part of the emotion). Action: `▶ Watch the 90-second tour`.
3. **You bring the photos. AI does the sorting.** — Body: `Connect Google Photos, Dropbox or OneDrive — what would take you months happens while you have coffee. Your originals stay untouched.` Plus interviews: **The questions your grandchildren would ask** — `A gentle interviewer asks, then follows up on what you actually said. Speak your stories aloud — they're captured, titled, and kept in the right part of your palace.` Footnote on every AI band: `AI is optional and never trains on your memories.` Visual: shoebox→palace split composite (S10) or transcript animation.
4. **Together & onward** — Co-creation + Time Capsules + Legacy. H: `You don't have to do this alone.` Lines: `Share one room or a whole chapter of your palace — like Childhood, or Travels.` · Time Capsules: `Seal a letter or a memory to open on a date you choose — a wedding day, a birthday in 2040.` · Legacy — **Choose who gets the keys**: `Write the letters you keep meaning to write, and decide exactly when they arrive.` (No video-message claim.) Adult-child line (one card, not hero): `One day you'll want to hear her voice again. Make sure you can.` Visual: S9 two avatars co-visiting + S8 capsule seal. No plan badges on iOS.

### 3.5 Everything-else strip (linen)
Kicker: `Your memories, given a home.` Compact chip row (duotone glyphs, ≥24px): Memory Map · Family Tree (`Map your lineage with fan charts — and bring the tree you already built on Ancestry or MyHeritage, no retyping.`) · Journeys (`Your life story, one gentle question at a time — start with your childhood street; end with the wisdom you want to pass on.`) · Cloud Import · Sharing — each chip links to /features/[slug]. **CUT:** "Explore & Connect" card, all pedigree/integration/streaks/Duolingo copy. Banned words in first reading layer: Kep (unexplained), GEDCOM (parenthetical in one FAQ line only), pedigree, streaks/badges, "transcribes/tags/opt-in", unexplained "wings", "cinematic", "Store" as verb.

### 3.6 #how-it-works — "Three steps. Five minutes." (canvas)
Steps with a real annotated screenshot per step (sign-up, first room, first memory placed): 1 **Add Your Memories** · 2 **Watch your palace grow** · 3 **Walk through it together**. **"For yourself / As a gift"** persona toggle (StoryWorth pattern; gift path = adult-child lane; hidden on iOS, single free path). Web microcopy under imagery: free-plan reassurance.

### 3.7 Why a palace? (parchment band, prose container)
H2: `Why a palace? Because your brain thinks in places.` Body: `For 2,500 years, people remembered what mattered by placing it in imagined rooms. We recall places far better than files. (Prefer a simple list? The Library shows everything as a classic gallery too.)` CTA: `Read the 2,500-year story →` (existing loci blog post). Coin and repeat the category noun: **"a memory home."** Couplet available for reuse: `Feeds scroll past. Folders bury. A palace keeps.` NEVER "improves memory", no dementia/therapeutic framing — product-organization framing only.

### 3.8 Comparison — elevation, not war (canvas)
H2: `Keep Google Photos. It's the drive. This is the home.` Sub: `A folder stores your photos. A palace remembers your life.` Real `<table>/<th scope>/<td>`; brand column visibly elevated (full-opacity card, 2px gold top-border, wordmark header, 20–24px solid checks); mobile = stacked cards (them muted one-liner, us dominant ≥0.875rem); one animation for the whole table or none. **Five rows max:**
1. Organization · 2. Storytelling (machine montage vs your voice) · 3. Sharing — left: `Shared albums: a grid with likes and comments` / right: `A shared palace your family builds together — rooms, voice recordings, and stories` · 4. Legacy — left: `Legacy access exists, but heirs inherit a raw archive of 40,000 unlabeled files` / right: `Time capsules that unseal on a date you choose, plus legacy contacts who receive your palace intact` · 5. **Concession row:** `Backup & camera sync: excellent — keep using it.`
Under the table: `Connect Google Photos, Dropbox or OneDrive and your photos move in — nothing to re-upload. Your originals stay untouched.` Memoir frame lives in FAQ (`A book ends. A palace grows.`).

### 3.9 Pricing strip (linen band — WEB ONLY, section omitted server-side on iOS)
`Your palace starts free — 1 GB of memories, unlimited rooms, no credit card. Upgrade from €9.99/month only if you outgrow it. Cancel anytime — and the trial never auto-charges.` Compact 3-tier glance → /pricing.

### 3.10 The Forever Promise + Founder (parchment)
- **Forever Promise (named block, linked to the ToS clause):** `Export everything as a ZIP anytime, on every plan — and if we ever shut down, you get 90 days and your complete archive.`
- **Legacy beat:** `When a Google account goes quiet, the photos vanish with it. A palace has heirs.`
- **Founder note:** Bram, real photo, signed: small independent European team, no big-tech backing, no ads, no selling your data.

### 3.11 #faq — visible accordion (linen)
Existing translated keys, corrected, with exact JSON-LD parity (built from the same keys). Adds: q0 `What is a memory palace?` (technique-first, links loci post) · `How is this different from StoryWorth or Remento?` → `A book ends. A palace grows.` (NL/DE/FR lead with the language advantage) · `What happens to my palace when I'm gone?` · AI privacy (`Nothing happens without your permission, and your memories are never used to train anything.`) · corrected free-plan a4 (matches plans.ts; Help Center faq2a fixed too) · device/motion comfort. FAQ a2: `Yes. Your memories are encrypted in transit (TLS) and at rest (AES-256), stored on EU servers — and you can export everything at any time.` iOS: `a{n}_ios` variants, store badges hidden.

### 3.12 Final CTA — the visual peak
Full-bleed **bright** S2 entrance-hall render (light spilling through open doors), hero-scale H2: `Begin with one memory. The rest will follow.` Single CTA `Create Your Palace` + microcopy (web/iOS variants as §3.1). Invitation, never mortality pressure. **Exit-intent modal: deleted.** Mobile sticky bar survives: near-solid bar, CTA in full gradient fill + shadow, footerInView hide + safe-area padding, slide suppressed under reduced motion.

### 3.13 Footer (shared MarketingFooter, umber)
Legal entity + registered address + contact email (Impressum — DE legal requirement) · founder name ("Built by Bram in [city]") · /security /explore /about /privacy /terms · real store badges or none (hidden on iOS) · 3–5 cornerstone blog links · social links + populated JSON-LD sameAs.

---

## 4. Voice charter — The Loving Archivist (every string tested against this)
Second person; concrete family nouns (kitchen table, wedding day, your mother's voice); unhurried verbs (keep, place, seal, walk, hand down). No all-caps shouting, no deadlines or mortality pressure on Keeper surfaces (urgency lives only on /gift + ads), no competitor names on-page (comparison column headers excepted), no invented numbers. Test: cover the logo — if it could be Dropbox or a bank, rewrite.
**CTA labels, final:** primary `Create Your Palace` everywhere (NL `Maak je Paleis` · DE `Erstellen Sie Ihren Palast` (Sie) · ES `Crea tu palacio` · FR `Créez votre palais`); nav/footer `Get Started`; secondary `Watch the 90-Second Tour`. "Store Your Memories Now" and all label variants die.

## 5. i18n process
EN is master; every key lands in all 5 locales in the same PR. Full native re-translation of the landing namespace: FR (restore all diacritics, fix calques — "où l'on se sent chez soi", "parcours thématiques"), DE (Sie, no calques), NL (de-anglicized, sentence case), ES (fix dangling imperatives). Drop inline `?? "..."` fallbacks and `as any` casts. Layouts survive +50% string length; QA at 768/1280/1440 in DE + FR. CI: key-parity diff · FR accent-density lint · truth grep (§1.2) · iOS-path grep (§1.1) · no static locale imports.

## 6. SEO & metadata (ships with v2)
Title: `The Memory Palace — Your Family's Memories in a 3D Home You Can Walk Through`. Description: `The ancient memory-palace technique, rebuilt in 3D — preserve photos, voices and life stories in rooms you can walk through. Free, EU-hosted*, GDPR.` (*claim gated per §1.3). `metadataBase` + canonical; ONE server-rendered JSON-LD @graph (Organization w/ existing `/brand/alt-social-512.png` logo + populated sameAs, WebSite, WebApplication + free Offer, VideoObject, FAQPage from visible keys); **aggregateRating deleted**; new 1200×630 OG card (S3 render + wordmark). H2s pair emotion with category terms; keyword-rich subhead under hero. hreflang: SSR path locales (/nl /de /es /fr) or drop the block entirely — never ?lang= pointing at identical English HTML. sitemap + robots verified; footer links 3–5 blog posts. Follow-up (not blocking v2): /features/[slug] + /compare/* pages, /gift landing + gift SKU.

## 7. Asset pipeline (execution order)
1. Stage the lived-in demo palace (public/demo photos + licensed period photos, "Oma's keuken, 1962" labels) → 2. Capture S1–S4 (unblocks hero + #tour) → 3. Hero loop + poster re-encode → 4. S5 Kep sequence + S6–S9 UI crops → 5. S10/S11 composites → 6. Walkthrough narration + WebVTT ×5 → 7. OG image → 8. public/ cleanup (delete hero-bg/-slow/-fast, palace-hero.jpg, Schermopname PNGs, debug/PDFs ~40MB; move masters out of public/). All via Puppeteer pipeline + camera-debug tool, HUD hidden, DPR 2, one golden-hour grade. Serve via next/image (AVIF/WebP, widths 800/1200/1600/2400, explicit dimensions).

## 8. Definition of done
1. A 68-year-old traverses hero→footer in one uninterrupted scroll via wheel, keyboard (End/PageDown/Space), and touch — in EN, DE, and FR — and clicks the final CTA unassisted.
2. `curl -A MemoryPalace-iOS` on deployed prod: zero pricing strings in SSR HTML; /pricing redirects to /atrium.
3. Truth greps pass; no fabricated proof anywhere; Frankfurt/Meta/consent/Anthropic gates verified and recorded.
4. Lighthouse: a11y ≥95, mobile perf ≥90, CLS 0 during scroll; LCP = hero poster ≤2.5s on 4G; client JS <100KB gzip.
5. Every text/background pair ≥4.5:1 at 200% zoom; JS disabled → full page readable, CTAs work.
6. Verified against DEPLOYED prod, from committed master (2026-07-12 drift lesson).
