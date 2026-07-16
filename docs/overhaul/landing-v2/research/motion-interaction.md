# Landing v2 — Motion & Interaction Spec (Decisions)

Owner: motion-interaction lead · 2026-07-16 · Status: DECIDED — implement as written.

## 0. Foundations

1. **Port `T.motion` from `overhaul/design-perf` to staging before any landing work** (ADD-only): `fast: 100ms`, `base: 160ms`, `slow: 400ms`, `ignite: 520ms`, `ease: cubic-bezier(0.22,1,0.36,1)`. Add one landing-only token: `reveal: 280ms` (entrance fades) — nothing on the page animates longer than `ignite` except video crossfades.
2. **The document scrolls.** Delete the `#landing-scroll` 100dvh inner scroller. Native body scroll = keyboard, scrollbar, restoration, iOS URL-bar collapse for free. All scroll logic reads `window.scrollY` via IntersectionObserver sentinels, never numeric scroll state (no per-frame re-renders).
3. **Global law: motion never takes input away from the user.** No `scroll-snap: mandatory`, no wheel/touch preventDefault, no scroll-jacking, no exit-intent modal (delete it). Every animated element is fully painted, at final layout size, within 150ms of entering the viewport. CLS during scroll = 0.

## 1. Hero entrance

- **LCP (H1) is never animated from opacity 0.** Headline, sub, and CTAs render visible in SSR HTML. Reserve entrances for secondary elements only.
- Sequence on load: poster image painted at t=0 (preloaded, `fetchpriority=high`); trust microcopy + scroll hint fade/rise in with `translateY(8px)→0`, `opacity .0→1`, `T.motion.ignite` (520ms) `T.motion.ease`, delay 150ms — one group, no per-chip stagger.
- Hero video: `poster` + bright regraded loop crossfades in over the poster (`opacity 400ms linear`) only after `canplay`. Delete the document-wide click/touch forced-`.play()` listeners. Add a visible pause/play toggle (44px, WCAG 2.2.2). Skip video entirely on `saveData`, `2g/3g`, and reduced-motion — poster only.
- One signature micro-moment, budgeted and cheap: gentle light-bloom in the villa doorway on the poster (CSS opacity pulse, 4s loop, `aria-hidden`, killed under reduced motion). No cursor-parallax on the hero — 60+ vestibular safety.

## 2. Scroll reveals (never blank)

- Replace `LazySection` + `ScrollFadeIn` with SSR-rendered sections + `content-visibility: auto` + `contain-intrinsic-size` for paint savings. Text is always in the DOM (SEO + no-JS).
- Reveal recipe (one shared component): default state **visible**; a post-hydration class sets `opacity: .001; translateY(12px)` only when JS is live, then IntersectionObserver with `rootMargin: '0px 0px 250px 0px'` (elements finish animating *before* entering view) transitions to final over `T.motion.reveal` (280ms) `T.motion.ease`.
- **No per-item stagger.** Whole section animates as one block; max one delay tier (media +80ms after copy). If JS fails, nothing is ever hidden.
- Anchors: real `<section id>` with `scroll-margin-top: 5rem`; `scrollIntoView` uses `behavior: 'auto'` under reduced motion.

## 3. Phone-carousel replacement (exact interaction)

The section 7 strip is **rebuilt, not fixed**:

- **Desktop (≥768px): static 3-up grid** of large frameless screenshots, no carousel, no snap. Hover lifts a card `translateY(-4px)` + shadow, `T.motion.base` (160ms).
- **Touch (<768px): native `overflow-x: auto` swipe strip** with `scroll-snap-type: x proximity` (never mandatory), `overscroll-behavior-x: contain`, `-webkit-overflow-scrolling: touch`. Vertical pans always chain to the page.
- Affordances: two 44px prev/next buttons calling `scrollBy({left: ±cardWidth, behavior: 'smooth'})` (auto under reduced motion), dot indicators bound to scroll position, `tabIndex=0`, arrow-key handling, `role="region" aria-roledescription="carousel"`, full-opacity scrollbar. Zero wheel-event listeners.
- Acceptance test (blocking): hero→footer traversal via mouse wheel, trackpad, **End/PageDown/Space**, and touch with no stall. Verify on deployed prod (drift history).

## 4. Video treatment

- **Hero loop:** ≤15s, muted, brightness baked into the encode (delete CSS `filter`), H.264 ~1.5–3Mbps 1080p + AV1/WebM, single uniform scrim behind text only. Loops but pausable; not downloaded on saveData/reduced-motion.
- **Walkthrough (Guillaume):** stays click-to-play, poster-first, opened from the hero secondary link "Watch the 90-second tour" in a **lightbox** (`role=dialog`, focus-trapped, Esc closes, backdrop 200ms fade, panel scale `.97→1` over `T.motion.base`). Click gesture grants sound. Ship WebVTT captions ×5 locales; remove the dead volume control until audio exists.
- No scroll-scrubbed video anywhere in v2 — too costly for old iPads; revisit post-launch.

## 5. Hover & press states

- Primary CTA: fill darkens (rustDeep→rustDarker), `translateY(-1px)`, warm shadow — `T.motion.fast` (100ms) in, `T.motion.base` out. Press: `translateY(0)` + shadow collapse (tactile, Duolingo-style).
- Links/nav: underline slides in via `background-size`, `T.motion.fast`. Cards: lift + hairline brightens, `T.motion.base`. FAQ accordion: height via grid-rows trick, `T.motion.slow` (400ms) `T.motion.ease`, chevron rotates 180°.
- All hover effects have visible `:focus-visible` twins (2px terracotta outline). Nothing is hover-only; touch gets the pressed state.

## 6. Reduced-motion & degradation ladder

`matchMedia('(prefers-reduced-motion: reduce)')` checked in JS (a `useReducedMotion` hook) **and** CSS:

- Video: poster still, `.play()` never called.
- Reveals/hover lifts/lightbox scale: rendered in final state; opacity-only fades ≤120ms permitted; all translateY removed.
- Carousel: buttons use `behavior:'auto'`; doorway bloom, sticky-CTA slide, and smooth anchor scroll disabled.
- Same ladder applies automatically to saveData/slow connections for media. No JS → everything visible, CTAs are real `<a href>` links that work pre-hydration.

**Definition of done:** zero blank viewports at any scroll speed; keyboard-only full traversal; Lighthouse CLS 0; total motion JS < 3KB.
