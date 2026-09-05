# Landing v2 — A11y / i18n / iOS-Seal / Performance Guardrails (DECISIONS)

Status: binding for all landing-v2 implementation work. These are decisions, not options. Violations block deploy.

## 1. WCAG AA — palette rules (enforced per background)

- **Body/muted ink:** `C.walnut #8B7355` is banned as text ink (3.3–4.3:1 everywhere). Use `MUTED_ON_LIGHT #716A5E` on linen/cream; use `#5E574C` on warmStone; `MUTED_ON_DARK #B5ADA3` on charcoal. Mark walnut "non-text ink" in theme.ts.
- **Eyebrows/labels:** terracotta `#C66B3D` never carries text on light (2.8–3.3:1). Light backgrounds → `rustDeep #9A4F2A` (5.1:1). Dark backgrounds → `gold #D4AF37` (8.1:1).
- **Gold:** text accent on dark only. On light it is graphic-only (rules, icon strokes, 2px borders — 3:1 non-text is fine). Never gold text on linen.
- **CTAs:** gradient darkens to `rustDeep #9A4F2A → rustDarker #6B3318` (5.7:1/8.9:1 with white 1rem/600 label). Terracotta becomes hover glow only. Secondary/outline buttons: border ≥3:1 against its actual background (no 50%-alpha hairlines on video).
- **Hero-over-media:** one uniform scrim only, derived from `C.charcoal` (no #2A2218 mismatch), yielding ≥4.5:1 at the text block at every video frame.
- **Every text/background pair ≥4.5:1** (large text ≥24px/19px-bold may use 3:1). Stats-bar numbers: rustDeep or charcoal, labels ≥4.5:1. Verify at 200% zoom (WCAG 1.4.4) and 400% reflow. Scrollbar thumbs/carousel affordances full-opacity. Focus: 2px terracotta `:focus-visible` retained on every interactive element, ≥3:1 on both modes.

## 2. 60+ readability rules

- **Floors (rem):** functional text ≥1rem; body/feature copy ≥1.125rem; hero-CTA microcopy ≥0.875rem; uppercase eyebrows ≥0.75rem, tracking in em (0.18em wide / 0.08em micro), never px. All 62 existing sub-1rem declarations re-audited; nothing below 0.75rem ships. Trust/reassurance copy is never the smallest text on the page.
- **Measure:** all paragraphs `maxWidth: 34em` (~50–75ch, 80ch hard max). Line-height ≥1.5 body, ≤1.15 display. Card interiors never force <45ch lines. Paragraphs >3 lines become bullets.
- **Type scale:** one modular scale (base 1.125rem, ratio ~1.2) in theme.ts; 7–9 styles total. Cormorant only ≥1.75rem at weight ≥500 (600 for italic accents); Manrope 600 for card titles. `textWrap:'balance'` on all h1–h3, `'pretty'` on paragraphs; no hardcoded `<br/>` in headlines — wrap points locale-tested at 1280/1440/1920.
- **Targets & motion:** interactive targets ≥44×44px (close buttons included). Content visible by default — ScrollFadeIn starts opaque or uses ≥200px positive rootMargin, ≤300ms, no per-item stagger; honor `prefers-reduced-motion` for JS motion, video autoplay, and smooth scroll (static poster, no forced `.play()` listeners; visible pause control on any autoplaying video — WCAG 2.2.2). No blank pixel >150ms after entering viewport; scroll-time CLS = 0.
- **Structural:** document scrolls (no 100dvh inner scroller); no `scroll-snap-type: x mandatory` anywhere; any carousel gets 44px prev/next buttons, dots, `tabIndex=0`, arrow keys, `aria-roledescription="carousel"`, `overscroll-behavior-x: contain`. Comparison table = real `<table>/<th scope>/<td>`. Videos ship WebVTT captions in 5 locales; every image gets descriptive alt + width/height. Exit-intent modal is removed; any future dialog needs role/aria-modal/focus trap/Escape and focus restore.

## 3. i18n process

- **EN is master.** Every new/changed landing key lands in all 5 locales (en/nl/de/es/fr) in the same PR — no partial merges. Drop the ~61 inline `?? "..."` fallbacks and `as any` casts so TS enforces key existence. Aria-labels, metadata, and alt text come from `landing.a11y.*`/message keys, never literals. FAQ JSON-LD is built from the same keys as the visible FAQ.
- **Register (documented, final):** DE = **Sie** with native rewrite; FR = vous + full native rewrite (restore diacritics, fix calques — "où l'on se sent chez soi", "parcours thématiques"); NL = je, de-anglicized (no "streaks/badges", sentence case, "Maak je Paleis"); ES imperative closers fixed ("No esperes tú tampoco").
- **Length tolerance:** translators get budgets; layouts must survive +50% string length (DE/FR). No `whiteSpace:'nowrap'` on nav links; per-locale short nav labels allowed (DE "Ablauf", FR "Fonctions"). QA landing at 768/1280/1440px in DE and FR before merge.
- **CI gates:** (a) key-parity diff across 5 files; (b) FR accent-density lint (<1 accented char/100 chars in any string >40 chars fails); (c) **truth grep** — build fails on `/end-to-end|E2EE|bank-grade|256-bit|forever plan/i` in src/messages and src/app (approved security vocabulary only: "Encrypted at rest & in transit", "AES-256 at rest, TLS in transit", "GDPR", "EU-hosted" only after Supabase region is verified); (d) no user counts / star ratings / "thousands" until DB-queried and above a vanity floor; no "improves memory"/dementia/therapeutic claims; (e) locale bundles never statically imported into the client — server passes only the active locale's `landing` slice.

## 4. iOS-seal DO-NOT-BREAK list (Apple 3.1.1)

1. `page.tsx` keeps `cookies()/headers()` → route stays **dynamic**; `initialIosApp` prop plumbing carried verbatim. Never force-static/ISR/client-only detection.
2. `middleware.ts` `/pricing → /atrium` redirect untouched.
3. Retire `iosCta()` dash-stripping: primary label is price-free everywhere ("Create Your Palace"); iOS-divergent copy uses explicit `*_ios` keys (a4_ios pattern) — midCta, cta.description, trust stat2 ("Unlimited / Wings & Rooms"), FAQ, store badges. Web-only microcopy "Free forever · No credit card" gated `!isIosApp`; iOS microcopy "Ready in minutes · No tech skills needed".
4. Exit-intent (or any successor overlay): `if (isIosApp) return;` — no exceptions, including iPad hover/trackpad.
5. Any new pricing strip, gift flow, or plan badge sits behind the same gate. App-store badges hidden on iOS (existing pattern).
6. aria-labels = visible labels; no "free/plan/credit card" in any accessible name on the iOS path.
7. CI grep fails the build if `/free|gratis|kostenlos|gratuit|crédit|credit card|plan|prijs|preis|precio|upgrade/i` appears in any key rendered when `isIosApp` (all 5 locales).
8. Post-deploy: `curl -A MemoryPalace-iOS` + `mp_platform=ios` cookie against prod; SSR HTML must contain zero pricing strings. Deploy only from committed master (2026-07-12 drift lesson).

## 5. Performance budgets

- **LCP:** ≤2.5s on 4G/mid-tier device; target ≤1.5s desktop. LCP element = static hero poster (`<link rel=preload as=image fetchpriority=high>`, 40–80KB graded JPEG/WebP). Headline never animates from opacity 0.
- **Client JS:** <100KB gzip for the landing (currently ~580KB). Server components by default; client islands only for carousel/FAQ/lang-switcher. Delete LazySection — SSR all sections, `content-visibility:auto` + `contain-intrinsic-size` for paint savings. Hero CTAs are real `<a href>` (work pre-hydration).
- **Video:** hero loop ≤1.5MB (1080p H.264 + AV1/WebM, grade baked in, no CSS filters), skipped entirely on `saveData`/2g-3g/reduced-motion (poster shown). Walkthrough ≤4MB 720p (or adaptive stream) + captions. Delete unused masters from `public/`.
- **Fonts:** ≤5 WOFF2 (Cormorant 400/500 + one italic, Manrope 400/600); `T.font.*` → `var(--font-display/--font-body)`; remove googleapis preconnect.
- **Scroll perf:** zero full-page re-renders during scroll (threshold booleans / IO sentinels only). CLS budget 0 during scroll; images always sized (next/image or explicit width/height).
- **Acceptance gates:** Lighthouse a11y ≥95, mobile perf ≥90; and a 68-year-old reaches and clicks the final CTA unassisted via wheel, keyboard (End/PageDown/Space), and touch — hero to footer in one uninterrupted scroll, in DE and FR as well as EN.
