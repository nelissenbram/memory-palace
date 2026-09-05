# Font System — FINAL (round 9)

**Final pairing: Fraunces (display) + Source Sans 3 (body) — drop Caveat. Eyebrows become letter-spaced small-caps Source Sans 3; pull-quotes/margin-notes use Fraunces italic.**

Two families, one voice. Both are humanist, old-style-rooted designs that share warm calligraphic DNA, so headline and body read as *designed together* rather than assembled. This is the convergent, best-grounded answer across all three judge panels (legibility, availability, brand-fit).

---

## Why this system

- **Cohesion:** three unrelated voices (high-contrast display serif + geometric-ish sans + casual script) is the root of the "too many fonts / inconsistent" feeling. Collapsing to two humanist families that share proportions and warmth is the single biggest cohesion win — and it also removes one webfont request (LCP win for 60+ users on modest connections).
- **60+ legibility (the decisive factor):**
  - Cormorant Garamond has hairline strokes and a low x-height that thin, shimmer, and drop out at sub-hero sizes and on non-retina screens — exactly the failure mode reduced-contrast-sensitivity (60+) vision struggles with. **Fraunces** keeps the heritage warmth but has a taller x-height, sturdier strokes, and an optical-size axis, so headlines and subheads stay solid.
  - **Source Sans 3** is the most legibility-proven humanist sans on Google Fonts: tall x-height, open apertures, unambiguous letterforms (distinct `I` / `l` / `1`, two-story `a`/`g`). It out-reads the cooler, tighter Manrope for aging eyes at paragraph and UI sizes.
- **Warm / heritage / premium:** Fraunces is a soft "old-style" serif (soft brackets, gentle contrast, expressive italic) purpose-built for warm editorial/heritage brands — squarely on-brand for a Tuscan family memory palace and the existing terracotta/parchment/gold palette. Source Sans 3 stays quiet and neutral so the serif carries the emotion.
- **Drop Caveat:** universal agreement across every submitted system and all three judge panels. A handwriting script is the least legible face for the core 60+ audience at the tiny eyebrow sizes it's used, and it reads casual/greeting-card against a premium heritage tone. Its "personal margin note" role is reassigned inside the two-family system (see below), so no content is lost.

---

## Font roles + weights

### Display — Fraunces
`next/font/google` name: `Fraunces`. Weights **400, 500, 600, 700**, styles **normal + italic**.

Used for: all headlines (H1–H4), hero lines, section titles, palace/wing/room names, and pull-quotes. Default headline weight **600** upright; **500** for quieter section leads; **700** for the heaviest hero. **Italic 500** is reserved for pull-quotes and the "margin note" flourish that Caveat vacated.

**60+ usage rule:** never set Fraunces below **~1.25rem**, and never use it for running text. Everything ≤ 1.125rem is Source Sans 3.

Enable optical sizing in CSS (not in the import — see note): `font-optical-sizing: auto;` so large headings get the fuller display cut while smaller serif accents stay sturdy.

### Body / UI — Source Sans 3
`next/font/google` name: `Source_Sans_3`. Weights **400, 500, 600, 700**.

Used for: all paragraphs, leads, UI labels, buttons (600/700), captions, micro text, and **eyebrows/kickers**. Body ships at **≥ 1.125rem / line-height 1.6** (already in `theme.ts`).

### Accent — none (Caveat retired)
- **Eyebrows / kickers:** Source Sans 3 **600**, `text-transform: uppercase`, `letter-spacing: 0.12em`, size ~0.75rem, in the rust accent `rustDeep #9A4F2A` (gold `#D4AF37` on dark). Reads as an engraved plaque label — refined, legible, cohesive.
- **Warm margin notes / pull-quotes** (the intimate "hand-annotated" feeling Caveat reached for): **Fraunces italic 500**, small, in the accent color.

---

## Exact `next/font/google` config

Replace the three imports in `src/app/layout.tsx` (lines 3, 15–36) with two:

```ts
import { Fraunces, Source_Sans_3 } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
```

Then on `<html>`, swap `${caveat.variable}` out and keep only `${fraunces.variable} ${sourceSans.variable}` (drop the Manrope/Cormorant/Caveat instances).

**Technical caveat (from the availability judge — important):** `next/font/google` does NOT accept arbitrary variable-axis values (`opsz`/`SOFT`/`WONK`) in the import config. When you pass a static `weight[]` array you load fixed instances and control optical sizing in CSS afterward via `font-optical-sizing: auto` (or `font-variation-settings`). Do **not** try to set `opsz`/soft/wonky in the `Fraunces({...})` call — the axis tuning happens in CSS after load. The config above is correct and ships cleanly.

---

## Where each font is used

| Slot | Font | Weight(s) |
|------|------|-----------|
| Headlines H1–H4, hero, section titles, palace/wing/room names | Fraunces | 600 (default), 500 (leads), 700 (hero) |
| Pull-quotes, warm margin notes | Fraunces italic | 500 |
| Body paragraphs, leads | Source Sans 3 | 400 |
| UI labels, captions, micro text | Source Sans 3 | 400 / 500 |
| Buttons, CTAs, emphasis | Source Sans 3 | 600 / 700 |
| Eyebrows / kickers | Source Sans 3, uppercase + 0.12em tracking | 600 |

---

## Migration note

**`src/app/layout.tsx`**
- Line 3: `import { Caveat, Cormorant_Garamond, Manrope } from "next/font/google";` → `import { Fraunces, Source_Sans_3 } from "next/font/google";`
- Lines 15–36: replace the `cormorant` / `manrope` / `caveat` instances with the `fraunces` + `sourceSans` instances above. **Keep the CSS variable names `--font-display` and `--font-body`** so all downstream consumers are untouched. Delete `--font-note`.
- Remove `caveat.variable` from the `<html>` className. Update the comment on line 30.
- The `#mp-loading` veil fallback already reads `var(--font-display, Georgia, serif)` — still valid, no change.

**`src/lib/theme.ts`** (lines 27–30)
```ts
font: {
  display: "'Fraunces', Georgia, serif",
  body: "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
},
```
(No `note` key exists here today — nothing to remove in theme.ts.)

**`var(--font-note)` sites — repoint the 3 landing usages before deleting the variable, so no eyebrow silently falls back:**
- `src/components/landing/WhyPalaceVisual.tsx:30` — `fontNote: "var(--font-note, cursive)"` → repoint to the eyebrow treatment: `var(--font-body)` uppercase + `letter-spacing: 0.12em`, or `var(--font-display)` with `fontStyle: "italic"` for a genuine margin-note.
- `src/components/landing/TourPlayer.tsx:28`
- `src/app/LandingV2Client.tsx` (margin-note span, ~line 1217)

Migration is low-risk: everything consumes the CSS variables, so the whole job is two `next/font` import swaps + two `theme.ts` strings + deleting `--font-note` + repointing the 3 Caveat sites. Body already ships ≥ 1.125rem / line-height 1.6.

*(Optional unification, out of scope for the landing: `scripts/generate-store-assets.*` already uses Source Sans 3; swapping its Cormorant → Fraunces would fully align store assets with the web system.)*
