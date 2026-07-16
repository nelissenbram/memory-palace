# Landing v2 — Design Direction (Decision Document)

Owner: design-direction lead · 2026-07-16 · Basis: confirmed audit + 103-source inspiration sweep.
These are decisions, not options. Constraint carried throughout: Apple 3.1.1 seal (SSR `initialIosApp`, iosCta, `_ios` keys) is untouched by everything below — this direction is purely visual/structural.

## 1. Palette: a 4-step warm tonal ladder + rationed dual-mode accents

Ship these as ADD-only tokens in `src/lib/theme.ts` (`T.land`):

- **canvas** `#FCFAF5` (existing cream) — page base for light sections.
- **surface** `#F2EDE4` (linen) — lifted cards/bands on canvas; every card gets a 1px hairline `#E3D6BC` border (no drop shadows; Linear/Raycast surface-lift model).
- **mid** `#EFE6D4` (new "parchment") — the missing intermediate step so dark sections are approached via a ramp, never a 14:1 cliff.
- **dark** `#241C15` (new "umber", replaces ad-hoc `#1a1a18`/`#3D3D3A`) — exactly TWO dark sections: hero and one full-bleed "This is a palace" showcase. Dark sections always host the page's *brightest* imagery (golden-hour renders glow against them; content is never darker than its ground).

**Accent discipline (the fix for beige-on-beige):**
- **Gold `#D4AF37` = dark-mode-only text accent** (8.1:1 on umber) + light-mode *graphic-only* accent (divider rules, 2px card top-borders, icon strokes — non-text needs only 3:1). Gold text on linen is banned (1.8:1).
- **rustDeep `#9A4F2A` = the light-background text accent** (5.1:1 on linen) — eyebrows, links, stat numerals. Terracotta `#C66B3D` is demoted to hover/glow only; it never carries text again.
- **CTA = one gradient, everywhere:** `rustDeep → rustDarker (#6B3318)`, white 600 label (5.7–8.9:1, passes AA). Gold appears on at most one CTA-adjacent halo. One accent per viewport; strip gold/terracotta from chips, icons, stats.
- **Text inks:** body on light = `inkSoft #403B36`; muted on light = `MUTED_ON_LIGHT #716A5E` promoted into theme.ts; muted on dark = `#B5ADA3`. **Walnut `#8B7355` is reclassified non-text ink** (borders/decoration only) — this single sweep clears ~30 AA failures.

## 2. Section rhythm: light-dominant, two dark anchors

Sequence (post-restructure): **dark hero → canvas proof strip → linen Tier-1 feature bands (alternating canvas/linen) → parchment "why a palace" band → dark full-bleed showcase (walkthrough + "This is a palace") → canvas comparison → linen FAQ/testimonials → dark final CTA + footer** (final CTA reuses the hero render, bright — the page ends on a peak, not a beige whisper). Rules: every boundary ≥1.3:1 apart; no two adjacent sections share a background; dark never touches dark; bands (stats, micro-CTA) inherit the background above them. All content SSR-visible; entrance animation is opacity 0.4→1, ≤300ms, no stagger, `prefers-reduced-motion` = none.

## 3. Typography: one 8-step scale, weight up, files down

- **Display = Cormorant Garamond 500** (600 for the gold italic word), reserved for ≥1.75rem. Weight 300 is retired; second text-shadow crutch deleted. **Body/UI = Manrope 400/600.** Card titles = Manrope 600, never Cormorant at card size. Fix `T.font.*` to `var(--font-display)/var(--font-body)` (mirror overhaul branch) and trim the load to 5 WOFF2 (Cormorant 500/600 + 500-italic; Manrope 400/600).
- **Scale (ratio ~1.2, base 1.125rem for 60+ eyes), tokenized as `T.land.type`:** micro `0.75rem` (uppercase eyebrows, tracking `0.14em`) · body-s `1rem` (floor for ALL functional text — the 62 sub-1rem declarations die) · body `1.125rem`/1.6 · lead `1.3125rem`/1.5 · h4 `1.5rem` · h3 `1.875rem` · h2 `clamp(2rem, 3.5vw, 3rem)`/1.15 · h1 `clamp(2.75rem, 5.5vw, 4.25rem)`/1.08, `textWrap: 'balance'`, no `<br/>`, maxWidth 60rem. Tracking in em only. Seven styles total; nothing else ships.

## 4. Iconography & illustration: the product is the illustration

Thin-line icons are **retired from Tier-1**. Every major claim is proven by a real asset: fresh 2×-retina, UI-free renders from the actual R3F scenes (exterior dusk, entrance hall, a *lived-in* memory room with licensed period photos in frames), framed in one signature component — **"palace window": 16px radius, linen fill, 1px `#E3D6BC` hairline, HTML captions (i18n), real alt text.** Tier-2 features keep a compact chip strip with small duotone glyphs (rustDeep stroke on linen, one style family, ≥24px). LandingIllustrations survives only as section-divider motifs (arch/column line-work at low opacity); LandingPalacePreview is deleted or rebuilt as the hero artifact.

## 5. Imagery strategy: show the palace BIG, bright, first

- **Hero:** re-encode `hero-bg-original.mp4` → 1080p H.264 ~2Mbps + AV1, golden-hour grade **baked in** (CSS filter deleted), opacity 0.65, ONE scrim (rgba(36,28,21,0.65) behind the text block only), `poster=/video/hero-poster.jpg` preloaded, static poster on mobile/save-data/reduced-motion. Paused frame zero must answer "what is this?".
- **Tier-1 = 4 alternating image+text bands** (3D Palace flyover loop, WhatsApp→wall vignette, AI-interview transcript, co-creation/time-capsule), each render 1100–1400px wide.
- **Dark showcase:** full-bleed interior render pays off "This is a palace."; hero-ob.mp4 (person touching framed photos) gets its emotional moment here. Phone screenshots survive only as one "also on your phone" beat — carousel deleted, static grid.

## 6. Spacing & containers

`T.land.space`: 8px-base ladder; **sectionY `clamp(5rem, 8vw, 7.5rem)`**, bandY `3rem`, headingGap = label →0.75rem→ H2 →1rem→ intro →3rem→ content. **Two containers only: wide `72rem`, prose `42rem`** (~70ch). Card padding `1.5rem`, grid gutter `1.5rem`. No other values permitted; CSS-first responsiveness on one breakpoint set (480/768/1024).

**Verification gates:** every text/background pair ≥4.5:1 at 200% zoom; hero legible in a 300px thumbnail; zero blank paint >150ms; scroll CLS = 0.
