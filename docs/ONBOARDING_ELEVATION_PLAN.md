# ONBOARDING ELEVATION PLAN — Consolidated Masterplan

Status: IMPLEMENTABLE. Synthesizes DEEP 1–10 design specs, revised against three adversarial
critique passes (contract review, canon review, mobile review). Every valid critique point is
applied inline; rejected/superseded points are listed at the bottom with reasons.

All line references verified against the working tree at `C:/Users/nelis/memory-palace-staging`
(branch `staging`) on 2026-08-21.

---

## 0. HARD CONTRACTS (unchanged, restated — every workstream is bound by these)

1. **Trigger contract**: first-login-only tri-state. No file in this plan touches it.
2. **Persistence**: `mp_onboarding_phase` localStorage + server flags stay compatible.
   `loadPhase()` (OnboardingWizard.tsx L56–68) checks `PHASE_ORDER.includes(v)` **before**
   `RETIRED_PHASE_MAP` — therefore **no retired phase name (`cinematic`, `walk_exterior`,
   `walk_entrance`, …) may ever be re-added to `PHASE_ORDER`**. The one new phase in this plan
   (`wing_orient`) is a brand-new name that no stale save can contain — safe by construction.
   The iOS paywall remap (L63) is untouched.
3. **3D choreography sealed**: ExteriorScene WP1-pause/flyover contract and EntranceHallScene
   look-around camera code (L2869–3016) are consumed, never edited. UI-overlay JSX only.
4. **/flythrough prod-404** (`flythrough/page.tsx` L13) — the onboarding viewer lives behind it.
5. **Provisioned-account truth**: roots wing + `ro1` = "Me, Over Time" + 5 demo memories exist.
   All copy below was checked against that reality.
6. **iOS SEAL**: zero pricing/upgrade surfaces anywhere in this plan except the existing
   paywall/celebration web branches, which are kept byte-compatible in routing.

---

## 1. SYNTHESIS FLOW (final phase map)

```
video_intro ─→ lang_a11y ─→ name ─→ style_era ─→ wing_orient ─→ upload ─→ celebration ─→ paywall(web)/done(iOS) ─→ done
 (Overture)    (step 1/4)  (2/4)     (3/4)         (4/4 NEW)    (ceremonial) (ceremonial)      (existing)
```

- `PHASE_ORDER` gains `"wing_orient"` between `"style_era"` and `"upload"`; `SETUP_PHASES`
  gains it too (StepDots grammar only — the "video backdrop" rationale from DEEP 5 is false:
  setup cards render on opaque CREAM, the `<video>` exists only inside the `video_intro`
  branch; the L228 `SETUP_PHASES` video effect is dead code and MAY be deleted in the same
  commit as a comment-documented cleanup, or left — it is a no-op either way).
- **Step count is 4 everywhere.** DEEP 2's "2 of 3" and DEEP 6's "3 dots" are stale; the
  StepDots totals become lang_a11y 1/4, name 2/4, style_era 3/4, wing_orient 4/4.
- **The exterior cinematic (DEEP 7) is DESCOPED from the shipping wizard.** No mount point
  exists (`OnboardingSceneHost` is only ever mounted with `scene="room"`, L867/973/1061) and
  resurrecting an exterior phase would violate contract 2. The pause-prompt overlay ships
  **only inside the /flythrough viewer** (§10), where `scene="exterior" onboardingMode` is
  mounted deliberately.
- **The entrance-hall look-around (DEEP 8) overlay restyle ships**, but it is reachable only
  via the viewer's `hall` phase (nothing in the app passes `onboardingMode` to
  EntranceHallScene). It is styled as latent + viewer-visible; no app mount point is added.

---

## 2. GLOBAL RESOLUTIONS (conflict ledger — binding for all sections)

| # | Conflict | Resolution |
|---|----------|------------|
| R1 | Reduced-motion on `video_intro` (DEEP 1 static-arrival vs DEEP 3/6 keep-skip) | **KEEP existing behavior**: RM users skip straight to `lang_a11y` (L168). DEEP 1's static state is rejected — it is self-contradictory (the L218–233 play-effect + `VideoAutoAdvance` would fire `beginOutro` timers into the "no timers" state) and conflicts with two other specs. |
| R2 | Outro subline (`welcomeSub` vs `welcomeSubline`) | ONE key: **`welcomeSub`**, copy "Let's make it yours — it takes about two minutes." (no account-content claims, satisfies DEEP 3's own seal-check). Timing 0.8s ease @0.6s (`onb-subtitleReveal`). |
| R3 | Video-phase text lockups (DEEP 1 persistent bottom lockup vs DEEP 3 timed tagline) | ONE lockup: **DEEP 3's centered timed tagline beat** (in @1.2s, out @6s), key `videoTagline`. DEEP 1's bottom lockup is dropped (would collide with the progress hairline and, at 360px, produce text soup). |
| R4 | Intro Skip button (linen glass / warm-ink / bottom-right) | **Keep existing warm-ink chrome, top-right** (L501–508, matches code), add `minWidth: 2.75rem`. Bottom-right rejected (gesture-zone + lockup collision); linen-glass restyle rejected (needless churn on an approved control). |
| R5 | GOLD ledger | Final canon, exhaustive: (a) existing focus rings are **recolored to EMBER** (GOLD @ ~1.9:1 on CREAM fails WCAG non-text contrast); (b) welcome-outro title (existing); (c) celebration gold tick (existing); (d) entrance-hall title shimmer (existing). **No new GOLD anywhere**: DEEP 1's arrival tick is gone with R3; DEEP 2's plaque overline becomes EMBER. |
| R6 | `nameHint` + disabled CTA | Keep MUTED 0.75rem, **no `role="alert"`** (fires on mount = hostile). Continue keeps the real `disabled` attribute (prevents the live-tap bug of `aria-disabled` + un-guarded handler). DEEP 6's variants rejected. |
| R7 | Busy/spinner state (DEEP 6) | **Rejected** — `completeAndFinish` is synchronous; the state is unreachable in shell steps. No `ctaBusy` key. |
| R8 | Portrait clipping | `pageStyle()` currently top-aligns + scrolls only for `isLandscapePhone` (L680-region). **Extend to all viewports**: page container gets `overflowY:auto`, `justifyContent:flex-start`, and the card gets `margin:auto` — identical visual centering when content fits, scrollable when it doesn't (fixes name-card-with-keyboard and the tall wing_orient card on 640px phones). |
| R9 | dvh churn / safe areas | All bottom-pinned overlays use `calc(<rem> + env(safe-area-inset-bottom, 0px))` — never %-of-viewport. Applies to video hairline, hall stack, viewer cards. |
| R10 | i18n | ALL keys FLAT directly under their section (`"onboarding"`, `"entranceHall"`, `"flythrough"`) — never dotted/nested (reference_i18n_flat_lookup, e17b53f). `tr(key, fallback)` guard pattern for every new key. 5 locales in the same commit; EN+NL below are FINAL, DE/ES/FR translated at parity in-register. |
| R11 | Shell measurements | Where DEEP 6 diverged from code, **code wins**: card internal gap 1.5rem, titles D 1.75rem / M 1.5rem, Back button keeps existing style (#FFF bg, MUTED, 0.875rem/500, minHeight 3.25rem). |
| R12 | `stepOf` aria-label | Always with params: `t("stepOf", { current, total })` — never bare (raw-token regression guard). |
| R13 | Derived palace title | Reuse existing key **`cinematicPalaceName`** ("{name}'s Palace" / NL "Het Paleis van {name}", en.json L222) — no new `namePalaceOf` key, no second source of truth, no NL copy churn. |
| R14 | `cinematicSkip` | All 5 locale values already exist and are kept **unchanged** (es stays "Saltar intro"). |
| R15 | First-memory floating banner (DEEP 4) | **Dropped entirely**: it overlaps the hub sheet on iPhones (z 8050 > sheet z 8001), is inert to SRs behind `aria-modal`, collides with the `uploadError` alert, and reverses a recorded owner decision (Wizard L870–872). All guidance moves INTO the hub header via overrides. |

---

## 3. SPEC A — `video_intro` "The Overture" (DEEP 1 + DEEP 3 merged)

**File**: OnboardingWizard.tsx, `phase === "video_intro"` render (~L440–518), KEYFRAMES
(L124–131). Do NOT touch: `beginOutro` (L204–211), 12.5s `VideoAutoAdvance` / 2.6s outro
timers, autoplay-blocked fallback, skip handler, L168 initial-phase pick, PHASE_ORDER.

Anatomy (desktop D / mobile M):
1. Stage: 100vw × 100dvh, bg `#1a1917`. Video `/video/hero-ob.mp4` autoPlay muted playsInline,
   opacity 0.65, `saturate(0.7) brightness(1.1)`, objectPosition D center / M `60% center` —
   unchanged. **ADD** `poster="/video/hero-ob-poster.jpg"` (asset: first-frame grab, §12) and,
   underneath the video, an `aria-hidden` warm-dark fallback div:
   `radial-gradient(ellipse at 50% 40%, #2A2622 0%, #1a1917 70%)` (canonical value — the
   corrupted string in DEEP 3 is resolved to `#2A2622`).
2. Legibility gradient: existing, keep.
3. **Tagline beat** (NEW, single lockup per R3): centered stack, pointer-events none, z 12.
   Overline `appName` — Source Sans 0.6875rem / 700 / 0.18em uppercase, rgba(255,255,255,0.72).
   Tagline `videoTagline` — Fraunces italic 500, D 1.5rem / M 1.1875rem,
   rgba(255,255,255,0.92), textShadow `0 0.125rem 1rem rgba(0,0,0,0.5)`, maxWidth 26rem,
   gap 0.75rem. In at t=1.2s (`onb-taglineIn`: opacity 0→1 + translateY 0.75rem→0, 1.0s ease
   both), out at t=6s (transition opacity 0.9s). Implementation: one `introBeat: "in"|"out"`
   state via two setTimeouts (1200/6000ms) cleared on unmount, skip, and outro.
4. **Outro** (existing `showWelcome` mechanism, keep): radial scrim + GOLD Fraunces italic 600
   title `welcomeToPalace` D 2.75rem / M 1.875rem, `onb-welcomeIn` 1.1s. **ADD** subline
   `welcomeSub` — Source Sans 0.9375rem, rgba(255,255,255,0.85), marginTop 0.75rem,
   `onb-subtitleReveal 0.8s ease 0.6s both` (R2).
5. **Skip button**: existing top-right warm-ink chrome kept verbatim; add `minWidth: 2.75rem`
   (R4). Label `cinematicSkip` unchanged in all 5 locales (R14).
6. **Progress hairline** (NEW): fixed, `bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))`
   (lifted out of the gesture zone per mobile review), height 0.125rem, track
   rgba(255,255,255,0.12), fill rgba(255,255,255,0.4). **Driven by a rAF loop reading
   `video.currentTime/duration`** (not `timeupdate` — 4Hz stutter on iOS Safari); rendered
   only after `loadedmetadata` fires AND `duration > 0` (no 0-jump mid-video); `aria-hidden`;
   hidden once `showWelcome`; rAF cancelled on phase leave/unmount.

States: loading (poster/gradient + interactive Skip) → playing (tagline beat) → outro
(subline added) → advance @2.6s (existing) | skipped (existing handler) | autoplay-blocked
(existing `beginOutro` catch). Reduced motion: **phase never mounts for RM users** (R1). The
"saved-phase-resume into video_intro" edge is provably impossible (`setPhase("video_intro")`
is never called, so it is never persisted) — no RM variant is specced for it; the new
animations are nonetheless wrapped in the existing `prefersReducedMotion()` guard as cheap
defense-in-depth.

New keyframes appended to `KEYFRAMES`: `onb-taglineIn` only.

---

## 4. SPEC B — Wizard visual shell (DEEP 6 revised)

**File**: OnboardingWizard.tsx — refine in place, no extraction.

- Page: `pageStyle()` per R8 (universal margin-auto centering + scroll).
- StepDots: unchanged component; **total = 4** on all four setup cards (R-flow). `role`/`aria`
  attributes and `t("stepOf",{current,total})` params kept (R12). No dots on
  video/upload/celebration (ceremonial beats — comment L85–89 is canon).
- Card frame: opaque CREAM, maxWidth 30rem, width 92%, radius 1rem, HAIRLINE border,
  `SHADOW[1] + TOP_HIGHLIGHT`, padding D 2.5rem 2rem / M 2rem 1.25rem, internal column gap
  **1.5rem** (R11).
- Overline / Title / Aside: existing styles kept — title D **1.75rem** / M **1.5rem** (R11).
- Nav row: Back = existing style unchanged (R11); Continue = `T.land.ctaGrad` EMBER primary,
  flex 1, minHeight 3.25rem, trailing `→`. Exactly one EMBER CTA per card.
- Skip link: MUTED 0.8125rem, **persistent underline** (never hover-only on touch),
  `textUnderlineOffset 0.1875rem`, minHeight 2.75rem, wired to `handleSkip` (unified path).
- Focus: `.onb-focusable:focus-visible` → `0.1875rem solid EMBER (#B85C38)` outline, 0.1875rem
  offset (R5 — replaces GOLD in `canonStyle` L334; GOLD-on-cream fails non-text contrast).
- Disabled Continue: real `disabled` + opacity 0.5 (R6).
- Reduced motion: add to `canonStyle`:
  `@media (prefers-reduced-motion: reduce){.onb-anim,.onb-cta,.onb-orient-in{animation:none!important;transition:none!important;transform:none!important}}`.
- Chunk-loading fallback (`sceneLoadingFallback` with always-clickable Skip): keep — WKWebView
  freeze insurance.
- No busy state (R7). Error surfaces stay toast-only.

---

## 5. SPEC C — `lang_a11y`, `style_era`, `paywall` (gap-fill: keep + verify)

The critiques correctly flagged these as unspecced. Scope decision: **keep current content;
shell refinements from §4 apply; verify-only checklist items** — they shipped through Apple
review and carry no critique defects.

- `lang_a11y`: existing language radiogroup + text-size control kept. Locale switch mid-card
  already re-renders instantly via `setLocaleNoReload` (L161 + picker handler) — verified, no
  change. Focus order: dots (non-tabbable) → radios (roving tabindex, untouched) → text-size →
  Continue → skip.
- `style_era`: existing Roman-Tuscany confirmation card kept; its CTA now routes
  `setPhase("wing_orient")` (keeping the `setStyleEra`/`updateProfile` calls in place);
  failure path = existing toast behavior, unchanged.
- `paywall` (web only): untouched this round — anatomy, Stripe-error path (`paywallFinishError`)
  and decline path stay as shipped. iOS never reaches it (`loadPhase` remap + branch guards).
  Explicitly re-verified in §13.

---

## 6. SPEC D — `name` card, "Founding deed" plaque (DEEP 2 revised)

**File**: OnboardingWizard.tsx, `phase === "name"` block (~L668–771) only.

Recon truth (verified): no palace-name DB field; canonical derived title is
`cinematicPalaceName` = "{name}'s Palace". One input (unchanged `setUserName` path), plus a
live plaque preview. No DB column, no migration.

Anatomy (card column, gap 1.5rem):
1. StepDots **2/4**.
2. Overline `appName`.
3. H2 `nameTitle` — Fraunces 600, D 1.75rem / M 1.5rem, INK.
4. Aside `nameAside` — Fraunces italic 0.9375rem, MUTED, maxWidth 22rem.
5. **Foundation plaque — ABOVE the input** (mobile keyboard fix: browsers scroll the focused
   input into view; the plaque above it stays visible while typing). Container always reserves
   `minHeight: 5.75rem` (covers a 2-line title — the 4.25rem reservation demonstrably
   overflows with 40-char wrapped names). When `trimmedName` non-empty:
   wrapper width 100% / maxWidth 20rem, padding 0.75rem 1rem, radius 0.625rem, HAIRLINE
   border, bg `#FFFFFF99`, centered. Overline `namePlaqueOverline` — Source Sans 0.625rem /
   700 / 0.14em uppercase, **EMBER** (R5, not GOLD). Title —
   `t("cinematicPalaceName", { name: trimmedName })` (R13), Fraunces italic 1.125rem, INK,
   lineHeight 1.3, `overflowWrap:anywhere`, clamped to 2 lines
   (`display:-webkit-box; WebkitLineClamp:2; WebkitBoxOrient:vertical; overflow:hidden`).
   When empty: wrapper at opacity 0 + `aria-hidden`, height reserved. Plain div — no
   `aria-live` (chatty per keystroke).
6. Input (existing element/id/label/Enter/`autoFocus={!isMobile}` kept): add `maxLength={40}`;
   **fontSize `max(1rem, 16px)`** (pins ≥16px computed under accessibility down-scaling —
   kills iOS focus auto-zoom); padding 0.875rem 1.5rem, HAIRLINE→EMBER focus border, radius
   0.625rem, maxWidth 20rem.
7. Hint `nameHint` (existing, `!nameValid` only): MUTED 0.75rem, no role (R6).
8. Nav row + skip: per §4, Continue disabled via `disabled` (R6).

Motion: plaque first-appearance opacity 0→1 + translateY 0.25rem→0, `.3s ease` transitions
(style-toggled, not keyframes); RM: opacity-only `.01s`. Typing updates instant.

---

## 7. SPEC E — `wing_orient` "One palace, five wings" (DEEP 5 revised)

**File**: OnboardingWizard.tsx (+ Phase union, PHASE_ORDER, SETUP_PHASES per §1).
No `RETIRED_PHASE_MAP` entry (new name, contract-2-safe — see §0.2).

Anatomy (reuses `pageStyle`/`canonStyle`/`cardStyle`/`Overline`/`primaryCtaStyle`/
`skipLinkStyle`/Back verbatim; renders on opaque CREAM — the video-backdrop rationale is
deleted from the spec as false):
1. StepDots **4/4**, `label={t("stepOf",{current:"4",total:"4"})}`.
2. Overline `appName`.
3. H2 `orientTitle` — canon title style.
4. Aside `orientAside` — display italic 0.9375rem MUTED, maxWidth 24rem.
5. **Wing strip** — semantic `<ul>` (list reset), flex wrap centered, gap 0.5rem, maxWidth
   24rem, `aria-label={t("orientWingsAria")}`. Five chips (attic omitted): emoji from `WINGS`
   (`aria-hidden`) + name via `orientWing*` keys (values copied VERBATIM from existing wing
   translations per locale). Chip: padding 0.375rem 0.75rem, minHeight 2rem, radius 0.5rem,
   HAIRLINE border, #FFF bg, body 0.8125rem MUTED, non-interactive. Roots chip "selected":
   EMBER 0.09375rem border, INK 600, trailing `<CheckMark size="0.75rem" color={EMBER}/>`.
   **Wrap is free-form** — no layout promise at any width.
6. **No connector line** (deleted: with free chip wrap the "pointing" hairline connects
   nothing on phones — the diagram metaphor is replaced by text). First-room card directly
   follows the strip.
7. **First-room card** — width 100% / maxWidth 20rem, padding 0.875rem 1rem, radius 0.625rem,
   EMBER 0.09375rem border, #FFF. Line 1 `orientFirstRoom` (verbatim seeded room name
   "Me, Over Time" — matches `WING_ROOMS.roots[0]` = ro1, where the upload phase lands).
   Line 2 `orientFirstRoomSub` — body 0.75rem MUTED.
8. Reversibility line `orientReversible` — body 0.8125rem MUTED, maxWidth 24rem.
9. Nav row: Back → `style_era`, Continue → `upload`. Skip link → `handleSkip`.

Tall-card safety: covered by R8 (page scrolls in portrait). Motion: card `onb-fadeUp .5s ease
both`; chips share class `onb-orient-in` with `animationDelay: i*80ms`; RM covered by the §4
media-query block. States: informational only — no error/loading; only Back/Continue/skip
tabbable.

---

## 8. SPEC F — `upload` first-memory capture (DEEP 4 revised)

**Files**: OnboardingWizard.tsx `phase === "upload"` (~L861–953); ImportHub.tsx.
Do NOT touch: `addMemory("ro1", …)` gating, `completeAndFinish` branching, `uploadError`
alert (kept verbatim), scene props (`scene="room" roomId="ro1"`).

- **Floating banner: DROPPED** (R15). All guidance lives in the hub header.
- ImportHub gains optional props `titleOverride?: string; subtitleOverride?: string;` rendered
  in the existing header. **When `subtitleOverride` is present it renders on mobile too**
  (bypass the `!isMobile &&` gate at L479 for the override only) — otherwise the primary
  guidance vanishes on the primary platform.
- Wizard passes `titleOverride={t("firstMemHubTitle")}`,
  `subtitleOverride={t("firstMemHubSubtitle")}`.
- **Explicit skip link**: ImportHub renders, only when `titleOverride` is present, a footer
  text button under its content: centered, Source Sans 0.8125rem MUTED, **persistent
  underline** (hover → INK), minHeight 2.75rem, padding
  `0.75rem 0 calc(1rem + env(safe-area-inset-bottom, 0px))`, label `firstMemSkip`,
  onClick = existing `onClose`. Label is destination-honest for both platforms:
  **"Continue without a photo"** (web lands on celebration→paywall; "I'll add one later"
  falsely promised exit). Distinct accessible name from the close-X (X keeps its existing
  label; no `closeLabelOverride` prop — dropped to avoid duplicate accessible names).
- Hub sheet `maxHeight`: change `90vh` → `min(90dvh, 100dvh - 2rem)` so the footer link stays
  reachable with the iOS URL bar expanded.
- No GOLD, no EMBER on skip (never a CTA). No step-dots (ceremonial beat).
- Motion: hub keeps `impHubSlideUp`; add `animation: none` under a local
  `prefers-reduced-motion` matchMedia check (ImportHub has no helper — mirror the Wizard's).
- Keys `firstMemoryHint`/`uploadPrompt`/`uploadSelfieNudge`: left untouched. (Recon
  correction: they have **no code consumers** — locale-file-only. Not retired this round to
  keep the diff minimal.)
- States: idle → picking/preview (hub-internal) → saving (hub busy) → error (`uploadFailed`
  alert, retry allowed, cleared on next attempt) → success (`handleMemoryAdded()` →
  celebration) | skipped (`onClose` path unchanged).

---

## 9. SPEC G — `celebration` completion + tutorial handoff (DEEP 9, accepted with no critique defects)

**Files**: OnboardingCelebration.tsx; OnboardingWizard.tsx celebration render (~L956–1042
incl. landscape fork); messages.

Do NOT touch: `completeAndFinish`/`setPhase("done")`; the iOS branch
`((isIOS() && !IAP_ENABLED) ? "done" : "paywall")` at BOTH CTAs; WALK_DONE_KEY +
`cleanupStorage` + `onFinish(memoryUploaded)` done-effect; MemoryPalace
`handleFinishOnboarding` (atomic finish → atrium → 800ms nudge reset → 200ms initPage). The
atrium nudge tour IS the tutorial handoff — no competing trigger.

- Anatomy: existing scrim/tick/title/subtitle/CTA kept (gold tick = ceremonial canon, R5-c).
  **NEW hint row [4]** above the CTA: Source Sans italic 0.9375rem MUTED, `✦` glyph
  `aria-hidden` in EMBER @0.8, maxWidth 22rem centered — key `celebrationHandoffHint`.
- Container `paddingBottom: calc(2.75rem + env(safe-area-inset-bottom))` (currently missing).
- `OnboardingCelebration` gains optional prop `hint?: string` (renders row only when
  non-empty; backwards compatible — Wizard is the only call site). Wizard passes
  `hint={tr("celebrationHandoffHint", …)}` in BOTH forks (component + inline landscape card)
  and BOTH platform branches (tour mention is free-tier-safe; zero pricing words on this
  surface).
- Motion: extend the rise cascade — hint @.5s, CTA @.6s (CTA currently pops). RM (existing
  `reduce`, resolved once per mount): static settled frame, `transition:none` extended to
  hint/CTA.
- States S1–S5 as specced in DEEP 9, unchanged.

---

## 10. SPEC H — Entrance-hall look-around overlay (DEEP 8 revised)

**File**: EntranceHallScene.tsx — ONLY the JSX overlay block (~L3556–3639) + local style
injection. Camera choreography (L2869–3016) and `onDoorClick("roots")` handoff untouched.
Reachability truth: overlay renders only under `onboardingMode`, which **only the viewer
(§11) mounts** — this work is latent-in-app, live-in-viewer, and future-proofs contract 3.

Required fixes applied:
- **Keyframes must be injected locally**: `onb-slideUp`/`onb-titleReveal` exist only inside
  OnboardingWizard's `<style>`; EntranceHallScene defines none, so the current declarations
  silently no-op. Add a scoped `<style>` in the overlay JSX with `ehc-slideUp` /
  `ehc-titleReveal` copies (renamed to avoid cross-file coupling).
- **`reduceMotion` hoisted to render scope**: the L314 `prefersReducedMotion()` read is local
  to the sealed scene-construction effect. Add a render-scope
  `const [reduceMotionUi] = useState(() => prefersReducedMotion())` — the sealed effect is
  not edited.
- Anatomy (desktop): prompt stack absolute, **`bottom: calc(3rem + env(safe-area-inset-bottom))`**
  (rem, not %-of-viewport, R9), centered column, z-25, pointer-events none.
  Divider hairlines + dot recolored `T.color.terracotta` → **EMBER @50%/60%**. Kicker
  `welcomeLabel` Fraunces 0.625rem/500, letterSpacing 0.25em uppercase EMBER, text-shadow.
  Title `title` Fraunces `clamp(2rem,5vw,3.5rem)`/300, cream #F2EDE7 with the existing GOLD
  shimmer (ceremonial, R5-d — the ONE hall gold). Subtitle `subtitle` Source Sans 0.9375rem
  #D4CBC0, lh 1.5, maxWidth 26rem.
- Skip button: top-right safe-area, dark linen glass rgba(26,25,23,.45) + blur 0.75rem,
  border rgba(242,237,231,.22), radius 0.375rem, min 2.75rem, 0.8125rem
  rgba(255,255,255,.9); focus-visible 2px #F2EDE7 outline. `skipCinematic` not renamed.
- Mobile <48rem width: same stack, subtitle paddingInline 1.5rem, bottom
  `calc(2rem + env(safe-area-inset-bottom))`.
- **NEW short-viewport variant** (gap fix, mobile #23): when viewport **height < 26rem**
  (landscape phones — gate by height, not width): hide divider + kicker, title fixed 1.5rem,
  subtitle hidden, stack bottom `calc(0.75rem + env(safe-area-inset-bottom))` — impluvium
  sightline preserved.
- States (completing the truncated spec): (1) `cinematicActive && !reduceMotionUi`: divider
  `ehc-slideUp 1s @0.2s both`, kicker @0.4s, title `ehc-titleReveal 2s @0.6s both`, subtitle
  `ehc-slideUp @1.5s both`, easing `cubic-bezier(0.16,1,0.3,1)` throughout. (2)
  `cinematicActive && reduceMotionUi`: single static fade (opacity 0→1 .2s linear one paint),
  title flat cream, no gradient sweep; cream veil untouched (it IS the RM choreography).
  (3) ended/skipped: unmount, no exit animation. (4) A11y: visually-hidden
  `role="status" aria-live="polite"` div rendering `cinematicIntroA11y` once on mount.
- Keys: section `entranceHall` — `welcomeLabel`/`title`/`subtitle`/`skipIntro` values updated,
  `cinematicIntroA11y` NEW **with all 5 locales in the copy table (§12)** — the DEEP 8 gap is
  closed. `exterior3d.entranceHall` and en.json:3530 header token untouched.

---

## 11. SPEC I — Onboarding viewer in /flythrough + CinematicPromptOverlay (DEEP 7 merged into DEEP 10)

**Gate**: `flythrough/page.tsx` untouched — prod 404 stands (contract 4). Viewer NEVER writes
any onboarding localStorage key.

**Files**:
1. NEW `src/components/ui/CinematicPromptOverlay.tsx` — pure UI, props
   `{ visible, onBegin, onSkip, isMobile }`. **Sole consumer: the viewer** (DEEP 7's wizard
   wiring is descoped — no mount point exists, §1).
2. `src/app/flythrough/FlythroughClient.tsx` — scene index 4 "Onboarding":
   `SCENE_ALIASES.onboarding = 4` (`?scene=onboarding`, applied post-mount per the existing
   hydration lesson L142–165); pill after "Room", disabled while `phase==="recording"`.
   Recorder iterates 0–3 only (guard `i < 4`) — byte-identical recording behavior.
3. Scene 4 mounts `OnboardingSceneHost` (no changes — already pipes `onboardingMode`,
   `onCinematicPause`, `cinematicResumed`, `onOnboardingLookDone`, `onReady`):
   - phase `exterior`: `scene="exterior" onboardingMode onCinematicPause={()=>setObPhase("paused")}
     cinematicResumed={obResumed}` + `onRoomClick={(id,arrived)=> id==="__entrance__" && arrived
     && setObPhase("hall")}` (the arrival routing DEEP 7 lacked — no stranded camera).
   - phase `hall`: `scene="entrance" onboardingMode onOnboardingLookDone={()=>setObPhase("done")}`
     → §10 overlay renders here.

State machine `obPhase`: `loading` (cream veil #FCFAF5, 400ms fade on `onReady`) → `hold` →
`paused` (scene fired pause once — mirror with a ref; prompt card shown) → `flying`
(`obResumed=true`, card out 250ms; WP2–5 + zoom run untouched) → `hall` (hint chip 5s or
pointerdown) → `done` (end card). Scene-pill switch or Skip resets all ob-state; re-entering
remounts host with a fresh `key` (one-shot refs restart cleanly).

CinematicPromptOverlay anatomy (Tuscan canon, all rem):
- Wrapper `position:absolute; inset:0; z-index:30`, flex, `pointer-events:none`; mobile
  `align-items:flex-end`, padding `0 1.5rem calc(2.5rem + env(safe-area-inset-bottom,0px))`;
  desktop `align-items:center` with card `translateY(20vh)`. **Breakpoint = the `isMobile`
  prop** (host's existing definition — defined, not a new media query; tablets-portrait
  follow the host's isMobile verdict).
- Card (`pointer-events:auto`): linen glass rgba(252,250,245,0.88) + blur 0.75rem, HAIRLINE
  border, radius 1rem, shadow `0 1rem 3rem rgba(64,59,54,0.18)`, padding 1.75rem 2rem,
  maxWidth D 26rem / M ≤24rem, centered text. Overline `cinematicPromptTitle` (Source Sans
  0.6875rem, 0.12em uppercase MUTED); body `cinematicPrompt` (Fraunces 600 INK, D 1.375rem /
  M 1.1875rem); primary CTA `cinematicYes` full-width EMBER pill min 2.75rem (focus-visible
  EMBER outline); secondary `cinematicSkip` text button min 2.75rem MUTED **persistent
  underline**. No GOLD.
- **`autoFocus` on the primary only when `!isMobile`** (WKWebView viewport-jump guard);
  Enter = Begin, Esc = Skip. `role="dialog" aria-modal="false" aria-labelledby`.
- Skip chip (phases hold→hall): top-right safe-area, linen glass, min 2.75rem, INK 0.8125rem.
  Visibility driven purely off `obPhase` — never timers (RM may shorten the flyover).
- Viewer chrome (FlythroughClient): badge chip "Onboarding preview" top-center; end card with
  Replay (EMBER pill) + Back-to-scenes (ghost hairline). Motion: enter opacity+0.5rem
  translate 300ms ease-out, exit 250ms; RM = fade-only 200ms (no second gate around camera
  code — `src/lib/3d/reducedMotion.ts` already owns the 3D side).

Acceptance: `/flythrough?scene=onboarding` on preview runs WP1 hold → prompt → tap → 5-waypoint
flyover → zoom → auto-enter hall → look-around (§10 overlay) → end card; Replay restarts
cleanly; prod 404s; recording (scenes 0–3) unchanged; all targets ≥2.75rem; overlays read on
bright exterior AND dim hall (glass, not raw text).

---

## 12. i18n KEY PLAN (FLAT keys; EN+NL final; DE/ES/FR translated in-register, same commit)

### Section `"onboarding"` (src/messages/*.json — flat, never nested; `tr(key, fallback)`)

| key | status | EN (final) | NL (final) |
|---|---|---|---|
| `appName` | exists | The Memory Palace | The Memory Palace |
| `stepOf` | exists (always with params) | Step {current} of {total} | Stap {current} van {total} |
| `backButton` / `continueButton` / `skipExploreOwn` | exist | unchanged | unchanged |
| `cinematicSkip` | exists — **unchanged all 5 locales** (R14) | Skip intro | Intro overslaan |
| `welcomeToPalace` | exists | Welcome to your Memory Palace | Welkom in jouw Memory Palace |
| `videoTagline` | **NEW** | A home for the moments that made you. | Een thuis voor de momenten die jou gemaakt hebben. |
| `welcomeSub` | **NEW** (R2 — single outro subline) | Let's make it yours — it takes about two minutes. | We maken het van jou — het duurt zo'n twee minuten. |
| `nameTitle` | revise | Every palace bears a name | Elk paleis draagt een naam |
| `nameAside` | revise | Tell us yours, and we'll carve it above the door. | Vertel ons de jouwe, dan beitelen we hem boven de deur. |
| `namePlaceholder` | exists | Your first name | Je voornaam |
| `nameHint` | exists | Please enter a name to continue. | Vul een naam in om verder te gaan. |
| `namePlaqueOverline` | **NEW** | Founding deed | Stichtingsakte |
| `cinematicPalaceName` | exists — **reused for plaque title** (R13) | {name}'s Palace | Het Paleis van {name} |
| `orientTitle` | **NEW** | One palace, five wings | Eén paleis, vijf vleugels |
| `orientAside` | **NEW** | Wings hold the themes of your life; rooms hold the moments. Every memory finds a room. | Vleugels bundelen de thema's van je leven; kamers bewaren de momenten. Elke herinnering krijgt een kamer. |
| `orientWingRoots/Nest/Craft/Travel/Passions` | **NEW** ×5 | copied VERBATIM from existing wing translations per locale | idem (NL: bestaande vleugelnamen letterlijk) |
| `orientFirstRoom` | **NEW** | Me, Over Time (verbatim `roomMeOverTime` per locale) | Ik, Door de Tijd |
| `orientFirstRoomSub` | **NEW** | Your first room, in the Roots wing — we'll start here. | Je eerste kamer, in de vleugel Roots — hier beginnen we. |
| `orientReversible` | **NEW** | You can rename, add or rearrange rooms anytime. | Je kunt kamers altijd hernoemen, toevoegen of verplaatsen. |
| `orientWingsAria` | **NEW** | The five wings of your palace | De vijf vleugels van je paleis |
| `firstMemHubTitle` | **NEW** | Your first memory | Je eerste herinnering |
| `firstMemHubSubtitle` | **NEW** | A photo of yourself, family, or a place you love. You can add everything else later. | Een foto van jezelf, familie of een plek waar je van houdt. De rest kan later. |
| `firstMemSkip` | **NEW** (destination-honest) | Continue without a photo | Doorgaan zonder foto |
| `celebrationHandoffHint` | **NEW** | Step inside — a short tour of your Atrium is waiting. | Stap naar binnen — een korte rondleiding door je Atrium wacht op je. |
| `celebrationTitle/Subtitle/Continue/Atrium` | exist | unchanged | unchanged |
| `cinematicPromptTitle` | **NEW** (viewer overlay overline) | Your palace awaits | Je paleis wacht op je |
| `cinematicPrompt` | revise | This is your Memory Palace. Shall we walk up to the entrance? | Dit is jouw geheugenpaleis. Zullen we naar de ingang lopen? |
| `cinematicYes` | revise | Begin the walk | Begin de wandeling |
| `cinematicLoading` | exists | Preparing your palace… | Je paleis wordt voorbereid… |

DE/ES/FR for new keys (final, translate in-register): `videoTagline` de "Ein Zuhause für die
Momente, die dich geprägt haben." es "Un hogar para los momentos que te hicieron ser quien
eres." fr "Un foyer pour les moments qui vous ont façonné." · `welcomeSub` de "Machen wir es
zu deinem — es dauert etwa zwei Minuten." es "Hazlo tuyo — toma unos dos minutos." fr
"Faisons-en le vôtre — cela prend environ deux minutes." · `firstMemSkip` de "Ohne Foto
fortfahren" es "Continuar sin foto" fr "Continuer sans photo" · remaining new keys translated
at parity in the same commit.

Removed from all earlier specs: `welcomeSubline`, `namePalaceOf`, `ctaBusy`,
`videoProgressLabel` (hairline is `aria-hidden`; key not shipped), `arrivalOverline`,
`arrivalLine`, `arrivalBegin`, `firstMemBanner`, `firstMemBannerSub`.

### Section `"entranceHall"`

| key | status | EN | NL |
|---|---|---|---|
| `welcomeLabel` | revise | Welcome to | Welkom in |
| `title` | revise | The Entrance Hall | De Entreehal |
| `subtitle` | revise | Every door here opens onto a chapter of your life. First stop: the Roots Wing. | Elke deur hier opent een hoofdstuk van je leven. Eerste halte: de Roots-vleugel. |
| `skipIntro` | exists | Skip intro | Intro overslaan |
| `cinematicIntroA11y` | **NEW — all 5 locales** | A short introduction is playing. Use the Skip intro button to go straight to the Roots Wing. | Er speelt een korte introductie. Gebruik de knop Intro overslaan om direct naar de Roots-vleugel te gaan. — de "Eine kurze Einführung läuft. Mit „Intro überspringen" gelangst du direkt zum Roots-Flügel." es "Se está reproduciendo una breve introducción. Usa el botón Saltar intro para ir directamente al ala Roots." fr "Une courte introduction est en cours. Utilisez le bouton Passer l'intro pour aller directement à l'aile Roots." |

### Section `"flythrough"` (new section if absent; viewer-only)

`onbPill` Onboarding/Onboarding · `onbBadge` Onboarding preview/Onboarding-voorbeeld ·
`onbSkip` Skip/Overslaan · `onbPromptTitle` Welcome to your palace/Welkom in je paleis ·
`onbPromptBody` Every memory you keep will live inside these walls. Ready to take a look?/
Elke herinnering die je bewaart, krijgt een plek binnen deze muren. Klaar om binnen te
kijken? · `onbPromptCta` Show me around/Leid me rond · `onbHallHint` Look around — each door
leads to a wing of your life./Kijk rond — elke deur leidt naar een vleugel van je leven. ·
`onbDoneTitle` That's the welcome tour./Dat was de welkomstrondleiding. · `onbReplay`
Replay/Opnieuw afspelen · `onbBack` Back to scenes/Terug naar scènes.

---

## 13. FILE-BY-FILE CHANGE LIST

| # | File | Changes |
|---|---|---|
| 1 | `src/components/ui/OnboardingWizard.tsx` | §3 video_intro (tagline beat, poster+gradient fallback, welcomeSub, rAF progress hairline, skip minWidth); §4 shell (R5 EMBER focus, R8 pageStyle scroll+margin-auto, RM CSS block, StepDots total 4); §6 name card (plaque above input, maxLength, 16px input floor); §7 wing_orient (Phase union + PHASE_ORDER + SETUP_PHASES + card); §8 upload (banner removed, hub overrides passed); §9 celebration (hint prop pass, both forks); style_era CTA → wing_orient. NO changes: trigger, loadPhase/persistPhase, beginOutro/timers, completeAndFinish, handleSkip, analytics. |
| 2 | `src/components/ui/ImportHub.tsx` | `titleOverride`/`subtitleOverride` props (subtitle override renders on mobile); footer skip link (only when titleOverride present, safe-area padded, persistent underline); `maxHeight: min(90dvh, 100dvh - 2rem)`; RM guard on `impHubSlideUp`. |
| 3 | `src/components/ui/OnboardingCelebration.tsx` | optional `hint` prop + row [4]; CTA joins rise cascade; safe-area paddingBottom; RM extension to hint/CTA. |
| 4 | `src/components/3d/EntranceHallScene.tsx` | JSX overlay block only (~L3556–3639): recolors, rem/safe-area bottoms, short-viewport variant, local `ehc-*` keyframes `<style>`, render-scope `reduceMotionUi`, `cinematicIntroA11y` live region. Camera code untouched. |
| 5 | `src/app/flythrough/FlythroughClient.tsx` | scene 4 pill + alias + obPhase machine + host mounts + badge/hint/end-card chrome; recorder guarded to 0–3. |
| 6 | **NEW** `src/components/ui/CinematicPromptOverlay.tsx` | pure-UI prompt card + skip chip per §11. |
| 7 | `src/messages/{en,nl,de,es,fr}.json` | §12 keys, flat, 5 locales, one commit. |
| 8 | **NEW asset** `public/video/hero-ob-poster.jpg` | first-frame grab of `hero-ob.mp4` (e.g. `ffmpeg -i public/video/hero-ob.mp4 -frames:v 1 -q:v 3 public/video/hero-ob-poster.jpg`), target <60KB. Gradient fallback covers its absence. |

Out of scope / do-not-touch (verbatim from contracts): phase trigger tri-state,
`RETIRED_PHASE_MAP`, `loadPhase` iOS remap, `VideoAutoAdvance`, `OnboardingSceneHost`
internals, radiogroup roving-tabindex, analytics events, `flythrough/page.tsx`, paywall
anatomy, all camera choreography.

---

## 14. VERIFICATION CHECKLIST

Contracts
- [ ] Fresh account (no saved phase): video → lang(1/4) → name(2/4) → style(3/4) → orient(4/4) → upload → celebration → done/paywall.
- [ ] Stale save `"cinematic"`/`"walk_exterior"` in localStorage → resumes at `name` (RETIRED_PHASE_MAP still reachable; `wing_orient` never shadows it).
- [ ] Stale save `"paywall"` on iOS with `!IAP_ENABLED` → remaps to `done`.
- [ ] Half-onboarded user at each legacy phase value resumes without re-onboarding or stranding.
- [ ] Existing-user login: wizard never fires (tri-state untouched — code-diff assert: zero edits in trigger path).
- [ ] `/flythrough` prod → 404; preview → all 5 pills work; recording scenes 0–3 byte-identical.
- [ ] Viewer writes NO onboarding localStorage keys (assert via devtools).

iOS seal
- [ ] iOS sim, full flow: zero pricing/upgrade words before/at celebration; CTA = "Enter your Palace" → done. `firstMemSkip` on iOS → done, no paywall.
- [ ] Web: celebration → paywall unchanged; skip paths land where labeled ("Continue without a photo" makes no exit promise).

Reduced motion
- [ ] RM emulation: video_intro never mounts (straight to lang_a11y); setup cards static; celebration static; hall overlay single fade + flat title; viewer overlays fade-only; no timers leak.

Mobile / responsive
- [ ] iPhone SE portrait + keyboard: name card scrolls, plaque visible above input while typing, no iOS auto-zoom (input ≥16px computed at smallest a11y scale).
- [ ] 640px-tall Android portrait: wing_orient fully reachable (scroll), StepDots visible.
- [ ] Landscape phone: all cards scroll; hall short-viewport variant (height <26rem) shows compact stack.
- [ ] Upload step on iPhone: hub subtitle visible, footer skip link above home indicator, no floating banner, `uploadError` alert unobstructed.
- [ ] Video hairline clear of gesture zone; no double bottom-pinned elements.
- [ ] Android Chrome URL-bar collapse: no visible slide of pinned overlays (rem+env, not %).

A11y / canon
- [ ] Focus rings EMBER, visible on cream (non-text contrast pass); GOLD only: welcome title, celebration tick, hall shimmer.
- [ ] `stepOf` announces interpolated values; StepDots progressbar semantics intact.
- [ ] Skip affordances underlined at rest everywhere; all targets ≥2.75rem; rem units only.
- [ ] `cinematicIntroA11y` announced once in hall; nameHint has no `role="alert"`.
- [ ] NL locale full pass (wing names verbatim, plaque "Het Paleis van {naam}"); spot-check de/es/fr for raw-key leaks (flat-lookup regression guard).
- [ ] Locale switch on lang_a11y re-renders card instantly.

Functional
- [ ] Video: poster shows pre-play; autoplay-block → outro fallback; skip during tagline cancels timeouts (no setState-after-unmount); hairline appears only after `loadedmetadata`, hides at outro.
- [ ] Plaque: live-updates, 2-line clamp at 40 chars, no button-row jump.
- [ ] Upload error → retry works; success → celebration with hint row in both forks.
- [ ] Viewer: Replay restarts choreography (fresh key); pill switch resets state; hall hint dismisses at 5s or pointerdown.

---

## 15. REJECTED / SUPERSEDED POINTS (with reasons)

From the original DEEP specs (superseded by this synthesis):
1. DEEP 1 static reduced-motion arrival screen — self-contradictory (play-effect +
   VideoAutoAdvance fire timers into the "no timers" state) and outvoted by DEEP 3/6 (R1).
   With it: keys `arrivalOverline`/`arrivalLine`/`arrivalBegin`, gold arrival tick, bottom
   arrival lockup, linen-glass skip restyle.
2. DEEP 1's `cinematicSkip` copy churn (es "Saltar introducción") — all 5 locale values exist
   and are approved; unchanged (R14).
3. DEEP 2's `namePalaceOf` key + articled NL/DE plaque titles — duplicate source of truth;
   `cinematicPalaceName` reused verbatim (R13).
4. DEEP 2's plaque-below-input placement + 4.25rem reservation — keyboard hides it; wrapped
   names overflow it. Moved above input, 5.75rem + 2-line clamp.
5. DEEP 3's `videoProgressLabel` key — hairline ships `aria-hidden`; key not created.
6. DEEP 3's RM spec for "saved-phase-resume into video_intro" — state provably unreachable.
7. DEEP 4's floating context banner (both keys) and `closeLabelOverride` prop — overlap on
   iPhone, SR-inert behind aria-modal, collides with uploadError, reverses owner decision;
   duplicate accessible names (R15).
8. DEEP 4's skip label "I'll add one later" — falsely promises exit on web (lands on paywall);
   replaced with destination-honest "Continue without a photo".
9. DEEP 4's claim that `firstMemoryHint`/`uploadPrompt`/`uploadSelfieNudge` have code
   consumers — false (locale-only); noted, keys left untouched anyway.
10. DEEP 5's video-backdrop rationale + connector hairline + "wraps 3+2" promise — backdrop is
    fiction (opaque cream), connector breaks under real chip wrap, wrap promise fails at 360px
    with DE/FR names. Connector deleted; relation carried by copy.
11. DEEP 6: bottom-right skip pill (gesture zone + collisions), GOLD focus ring (contrast
    fail → EMBER), `aria-disabled` Continue (live-tap bug → real `disabled`), EMBER
    `role="alert"` nameHint (mount-fires), busy/spinner state + `ctaBusy` key (unreachable),
    3-dot total (stale), ghost Back restyle + 1.25rem gap + 1.5rem titles (code wins, R11),
    param-less `stepOf` aria-label (raw-token regression).
12. DEEP 7 as a wizard feature — no mount point; resurrecting an exterior phase would break
    stale-save remapping (loadPhase ordering). Overlay ships viewer-only (§11). Its `autoFocus`
    is gated to non-touch; its undefined desktop/mobile breakpoint is bound to the host's
    `isMobile`.
13. DEEP 8's "existing keyframes, keep names" — keyframes don't exist in EntranceHallScene;
    injected locally as `ehc-*`. Its "reuse the existing reduceMotion value" — not in render
    scope; hoisted via a render-scope read. Its %-of-viewport bottoms — replaced with rem+env.
14. DEEP 9: accepted in full — nothing rejected.
15. DEEP 10: accepted with two amendments — prompt overlay is the shared `CinematicPromptOverlay`
    component (single implementation with DEEP 7's), and hall-phase overlay duty is delegated
    to §10's EntranceHallScene overlay rather than a second viewer-drawn hint layer (the
    `onbHallHint` chip remains as the viewer's dismissible extra).

From the critiques (points NOT applied, with reasons):
16. Mobile critic's suggestion to move the intro Skip to bottom-left for thumb reach —
    rejected: top-right is the shipped, Apple-reviewed position, consistent with the hall/viewer
    chips; bottom edge is now occupied by the progress hairline and is gesture-zone hostile.
17. Mobile critic's alternative "accept 4Hz stutter" for the progress bar — rejected in favor
    of the rAF-loop option the same critique offered.
18. Mobile critic #14's alternative "lower the hub sheet to 80dvh" — moot: the banner is
    dropped entirely (R15), stronger fix.
19. Findings #12's implied cleanup obligation for the dead `SETUP_PHASES` video effect —
    optional, not required for correctness; flagged as a may-delete in §1.
20. Critique-final #7's demand for a full paywall redesign spec — deliberately descoped to
    keep-and-verify (§5): the paywall is a shipped, Apple-sensitive surface with zero critique
    defects; redesigning it here expands risk without an owner mandate.
