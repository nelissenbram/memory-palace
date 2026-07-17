# Landing mobile-hardening — round 9d (115-agent audit)

Fan-out audit: 9 sections x 6 mobile dimensions = 54 finders, adversarially
verified (skeptic per finding), synthesized. 100 raw -> 40 confirmed. This file
records what shipped.

## Root cause of the reported USP portrait overflow
Two layers: (a) no root-level clip backstop, so any one overshooting child
scrolled the whole page; (b) real overshooting children. Fixed BOTH:
- WhyPalaceVisual icon grid `repeat(3,1fr)` -> `repeat(3,minmax(0,1fr))` + item
  `minWidth:0` + label `overflowWrap/hyphens` (long ES/DE tokens blew the track).
- PalaceCard 3rd door-chip (left:82%, nowrap): `maxWidth:min(11rem,44cqw)` +
  label ellipsis/minWidth:0 + `@container(max-width:22rem)` pulls chips 1/3 to
  24%/76%.
- InterviewsCard recorder pill: `flexWrap:wrap` + status `minWidth:0`/ellipsis +
  waveform `minWidth:0`.
- Nav burger breakpoint 768/769 -> 899/900 (DE/FR nav row was ~900px, overflowed
  the 769-899px band).
- Backstop: root landing div `overflowX:clip` (clip, not hidden, preserves the
  sticky USP rail) + hero CTA `maxWidth:100%` + shrink-safe padding.

## Tap targets (Apple 44 / Google 48)
- TourPlayer "Watch again": bare ~18px link -> inline-flex, minHeight 2.75rem.
- Mobile-menu language pills 36px -> T.touch (44px).
- Self/Gift chips 40px -> T.touch + inline-flex centering.

## iOS parity (do before any new App Store build)
- backdrop-filter got its `-webkit-` prefix: nav header + TourPlayer controls
  pill + idle ring (frosted glass was silently dropping on iOS = wrapped-site
  tell).
- Safe-area insets on the fixed header (paddingTop env(top), horizontal
  max(clamp, env(left/right))) + mobile-menu panel (notch/Dynamic Island).
- Hero video: preload auto->metadata, dropped eager v.load(),
  connectionIsConstrained() now defaults to constrained on small/touch viewports
  when the Network API is absent (always the case on iOS) -> no full-MP4 cellular
  pull, less LCP contention.
- Language <select> 14px -> 16px (WebKit input-zoom threshold).

## Typography / legibility (60+)
- Footer legal + Why icon labels + Watch-again lifted to 16px.
- theme lead tier made fluid: clamp(1.125rem,1rem+0.9vw,1.3125rem).

## Reflow / a11y / perf
- TourPlayer minHeight clamp(30rem..) -> min(clamp(24rem,56vw,44rem),88svh) so
  landscape controls stay on-screen; controls pill bottom max(1.25rem,env(bottom)).
- Side-caption maxWidth capped to the lane; center scene gets a radial scrim
  (contrast floor over bright frames).
- Self/Gift tabs now have tabpanel association; burger has aria-controls + menu id.
- WhyPalaceVisual rise() short-circuits under reduced-motion.
- PERF: one IntersectionObserver toggles `.usp-live` on each [data-usp-idx]
  wrapper; globals.css pauses ALL `lv2u-*` + `.lv2-usp-logo*` infinite loops
  off-screen via animation-play-state (was ~26+ always-on loops). Still inside
  the reduced-motion guard.

## Deferred (noted, low value / higher risk)
- TourPlayer playing overlay focus move/restore (P2, non-modal, skipped).
- content-visibility:auto on cards (CLS risk without exact intrinsic sizes).
- TreeCard ripple animating SVG `r` -> transform:scale micro-opt.

## Google/Apple readout after fixes
Content-wider-than-screen: resolved. LCP cellular contention: resolved. INP/
battery off-screen loops: gated. Tap targets, safe-area, backdrop parity,
input-zoom: fixed. iOS price-seal: still verified clean (no price under iOS UA).
