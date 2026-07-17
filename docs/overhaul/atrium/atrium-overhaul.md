# Atrium Overhaul — "The Organised Hearth"

_Creative-director synthesis. Chosen backbone: **The Organised Hearth** (top panel score 41.0/50), grafted with the self-contained hero moves from the runners-up, plus every P0/P1 audit fix folded in. Buildable on the current stack (`HomeView.tsx`, `AtriumHero.tsx`, `AtriumWidgets.tsx`, `AtriumActivity.tsx`, `PersonalProfile.tsx`, `EnhanceMemories.tsx`, `FeatureDiscovery.tsx`, `PersonaSelector.tsx`, `TuscanCard.tsx`, `theme.ts`, `PalaceLogo.tsx`)._

---

## 1. Verdict / Summary

Landing in the Atrium should feel like walking into the front room of a well-kept family home, not opening a SaaS dashboard. Today it is one undifferentiated 72rem column of **twelve equally-loud full-width widgets** — a persona quiz, a points board, an achievements filmstrip, a neural-network "AI portrait", four separate "add a memory" funnels — so a 60+ Heritage Keeper meets a wall of chores before ever seeing a single one of their own memories.

The overhaul does **not** amputate that richness. It imposes calm **order** on it:

1. **Two-zone layout.** On ≥1024px the 72rem column becomes a CSS grid: a wide **PRIMARY column (~62%)** carrying the emotional spine (greeting + real stats + ONE next-best-action + Continue + the user's own memories) and a quieter **SECONDARY RAIL (~38%)** holding support material (a single unified "Your journey" card, a compact tool list, a legacy link). Below 1024px the two zones stack — primary first.
2. **The single self-contained hero win, grafted from every runner-up.** Kill the gold-shimmer transparent-clip H1; render the three dead stat props as a Fraunces stat line; compute **ONE** terracotta next-best-action from state; demote Library/Palace to quiet chips. This alone delivers most of the "front room, not dashboard" feeling and ships in one sitting inside `AtriumHero.tsx`.
3. **Merge & cut the funnel.** Four overlapping "do something" widgets collapse into one primary "Add a memory" zone + one rail journey card. The persona quiz, streak flame, and 28-badge padlock filmstrip leave the daily scroll entirely.
4. **One card language, warm ladder only, motion that fires once and rests.** Every widget rebuilt on `TuscanCard` (1rem radius, 2px gold TOP-hairline, one shadow). Zero blue/violet/teal/third-party hex. A shared `useReducedMotion` hook gates SMIL + JS timers + hover lifts.

Target: **~2–3 screens, not eight.** Through-line for the audience: their name and their growing collection are the warmest thing on the page; the one thing to do next is singular and unmistakable; their memories greet them before any to-do list.

---

## 2. Chosen Direction

**The Organised Hearth** — full richness preserved, quietly filed into a warm wide **hearth** column and a calm **mantel** rail, unified under one Tuscan card language, with the state-computed hero as the emotional anchor.

---

## 3. First Screen (above the fold)

In order, inside the wide PRIMARY column (rail sits right on desktop, below on mobile):

1. **Greeting block, left-aligned (not centered).** "Good afternoon, Alexandra" — solid charcoal `#1F1B1A` Fraunces at **600**, ~2.25rem mobile / ~2.75rem desktop, the **name in `rustDeep #9A4F2A`** (sanctioned on-light accent, ≥5:1). No gold-shimmer clip, no infinite animation, no `WebkitTextFillColor:transparent`. A small static `PalaceLogo variant="mark"` sits beside/under the name as the only gold-adjacent ornament.
2. **Stat line** directly under the greeting, finally rendering the dead `totalMemories/totalWings/totalRooms` props: three Fraunces numerals with Source Sans labels — "47 memories · 6 rooms · 3 wings" — numerals charcoal, "·" separators in gold as graphic accent. At 0 counts it swaps to a warm invitation: **"Your palace is ready for its first memory."**
3. **ONE primary next-best-action** — a single dominant terracotta-filled button (`terracotta #C66B3D`, min 3rem tall, full-width on mobile) computed from state: first-run → "Add your first memory"; has memories none today → "Add today's memory"; unfinished room → "Continue in the Kitchen". Beneath it, **two quiet outcome-labelled chips**: "Walk your palace" (3D) and "Browse the library" — demoted, not two giant competing illustration cards.
4. **Continue-where-you-left-off** as a proper resume card (only if a room was visited <14 days ago): ivory/cream face, gold top-hairline, warm shadow, room title in Fraunces ~1.125rem, warm sub-line ("3 memories waiting"), and — critically — it **deep-links into that room's wing**, not the generic Library.

On desktop the top of the rail shows the unified "Your journey" card. The two giant SVG temple/library illustrations, the streak flame, and the persona quiz are all GONE from the first screen.

---

## 4. New Top-to-Bottom Section Order (after merges/cuts)

Three labelled chapters via `TuscanSectionHeader` eyebrows. Primary column then rail on desktop; stacked on mobile.

**Chapter A — "Your palace" (PRIMARY)**
1. Hero: greeting + stat line + ONE primary CTA + two quiet chips
2. Continue where you left off (14-day gated, real deep-link)

**Chapter B — "Add a memory" (PRIMARY)**
3. Grouped add zone: Voice interview (hero option) + Upload + Write + Time Capsule under one header

**Chapter C — "Your memories" (PRIMARY)**
4. Recent Memories (promoted; warm empty state; 2-across grid on mobile)
5. On This Day (only when present; broadened recall)
6. Shared with you (human "{Name} shared {room}" framing)

**RAIL — "Keep building" (SECONDARY, desktop right / mobile bottom)**
7. Unified "Your journey" card (fuses streak + track next-step + points + earned achievements + one nudge)
8. "Ways to add & explore" tool list (Feature Discovery + Enhance tail, merged, warm-recoloured)
9. Quiet "Your portrait so far" (re-skinned PersonalProfile, light/warm)

**Footer utility row** (out of the emotional flow)
10. Plan your legacy · Help · Blog

_Cut from the daily scroll: Persona quiz, standalone Achievement filmstrip, standalone Legacy widget, the two hero illustration cards._

---

## 5. Per-Section Implementable Spec

### AtriumHero — `AtriumHero.tsx` — REDESIGN
Kill the gold-shimmer transparent-clip H1 (`WebkitTextFillColor:transparent` + `atriumGoldShimmer` infinite), the `fontWeight:300` anaemic serif, and the two giant SMIL-animated temple/library illustration cards. New hero = left-aligned greeting (charcoal Fraunces 600, name in `rustDeep`) + rendered stat line (memories·rooms·wings; first-run invitation when 0) + ONE computed primary CTA + two quiet outcome chips (Walk your palace / Browse library). Any palace glyph = `PalaceLogo variant="mark"` (4 pillars + raised 5th oval), never a bespoke 8-column temple. First-run branch (`totalMemories===0`): CTA → add-first, chips route to create not empty destinations. All motion fires once on mount then rests; gate SMIL behind a `useReducedMotion` matchMedia state that omits `<animate>` children. Snap radii/space to `T.radius`/`T.space`; add fluid `clamp()` on the H1 + `text-wrap:balance` for long DE/FR greetings at 320px.

### Streak badge (HomeView hero wrapper ~line 529) — `HomeView.tsx` — CUT
Remove the Duolingo 🔥 flame + "{count}-day streak!" + "Keep it going!" loss-framing entirely (including the `computeStreak` render path). Replace with a warm cumulative line folded into the stat area only when meaningful: "You've preserved 47 memories so far" — no counter that can break, no emoji.

### Add-a-memory zone (NEW) — `HomeView.tsx` + `EnhanceMemories.tsx` — REDESIGN + MERGE
One `TuscanSectionHeader` "Add a memory". Promote 3–4 genuine creation actions (Upload, Write, Voice/Interview, Time Capsule) as warm inviting light cards. Demote Organize/Gallery/Family Group/Publish/WhatsApp into the rail's tool list; move Blog/Help/Reddit-Contribute into the footer. InterviewPrompt becomes the hero option here (not a 500px animated evangelism block every visit). Consume `interviewCount`: returning keepers see "Continue your story · N recorded" + Resume, not "Begin your FIRST session" forever. Remove duplicate interview entry points from `PersonalProfile`. Add a real quick-add affordance (inline picker/sheet) so it is one tap, not tile→route→localStorage-spotlight. Collapse EnhanceCard's double hover-lift to one interactive element; drop `#25D366`/`#7B6B8E`/`#FF4500`; descriptions ≥1rem AA.

### Recent Memories — `AtriumWidgets.tsx` — KEEP + PROMOTE
Move into the primary column's "Your memories" zone (was position 7 of 13). Reflow to a calm 2-across responsive grid on mobile (drop the invisible horizontal strip; actually consume the `isMobile` prop). Replace emoji type-icons with crafted line icons matching `WingIcon`; designed on-brand placeholder (warm gradient tinted by type + gold hairline) for image-less memories, not a random-HSL block + emoji. Fix the click to open the actual memory/room (pass real `roomId`, stop dumping to generic Library). Title ≥1rem, 2-line wrap; breadcrumb `inkMutedLight` (≥4.5:1); human dates ("Yesterday", "Last week"); leading "Add a memory" tile; warm empty state (never vanish for first-run). Rebuild on `TuscanCard`.

### On This Day — `AtriumActivity.tsx` (`OnThisDayCard`) — KEEP + PROMOTE
Adjacent to Recent, only when present. Broaden the recall engine beyond exact month+day (same-week / "X years ago this month" / a resurfaced memory) so the slot is alive most days; prefer event date over `createdAt`. Reduce the heavy sepia/desaturation/triple-vignette on real family photos to a whisper of warm grade — keep faces true. Drop the infinite `atriumBorderGlow` (animate once). Rebuild on `TuscanCard` with the gold TOP-hairline (not a left bar). Add "Add this year's memory" inline action + a legible "see all".

### Shared with you — `AtriumActivity.tsx` (`SharedRoomsPreview`) — KEEP + PROMOTE
Reframe from DB metadata to a human moment: "{Name} shared {room} with you" in warm Fraunces, sharer's real name/avatar prominent. Fix the `wingName`/`ownerName` inversion so "in {wing}" is correct. Drop the static "Wing" type pill and the hardcoded "0" count (fetch real count or omit). Replace emoji `room.icon` with a crafted sage line mark. On mobile stack to two lines. Skeleton loader (reuse `SkeletonSection`), not a bare "loading" line. One predictable destination (the shared room), not a silent panel fallback.

### Your journey (RAIL) — `AtriumWidgets.tsx` (`TrackProgress` + `AchievementShowcase`) — REDESIGN + MERGE
One compact rail card fusing streak + track next-step + points + earned achievements. Show a single next-best in-progress track with its concrete next step wired to `step.navigateTo` (bypass the panel), plus a small overall progress ring; route the full 8-track grid + all badges behind "View all". Author the two missing track icons (`capture`, `connect`) so no "?" ships; retune off-token colours (`legacy #2C2C2A`, `cocreate #5B8FA8`, `connect #7B6B8E`) to warm tokens. Drop the ⭐ points pill, the infinite shimmer on 8 bars, "Mark your Memories"/"Palace Master" arcade copy. Surface ONLY earned badges (newest first) + one warmly-worded next nudge; **no padlocks on the home surface**. Rewrite gamer titles ("DJ"→"A Voice Preserved", "Centurion"→"A Hundred Memories Kept"). Percent/labels in charcoal (never raw gold text); always-visible badge labels (no hover-only tooltip); `role="progressbar"`; real headings.

### Ways to add & explore (RAIL) — `FeatureDiscovery.tsx` (+ Enhance tail) — DEMOTE + MERGE
Merge FeatureDiscovery + Enhance's secondary tail into one calm rail list. Recolour all tiles off the warm ladder (terracotta/gold/sage/walnut/charcoal) — drop WhatsApp `#25D366`, violet Explore `#7B6B8E`, teal Kep, and the dark-SaaS white-on-jewel treatment. Light cream faces with a terracotta/gold/sage accent icon medallion. De-dupe Kep and Explore. On mobile a 2-col vertical grid of shorter cards (no undiscoverable horizontal strip). State-aware: lead low-content users with add, hide analytics tiles until there's data.

### Your portrait so far (RAIL) — `PersonalProfile.tsx` — REDESIGN + DEMOTE
Kill `variant="dark"` charcoal slab, `NeuralBackground` floating dots, the neural-silhouette icon, and the dishonest "AI-powered insights" framing (there is no AI — it's count aggregation). Re-skin light/warm to match siblings. Lead with the real interview `narrativeSummary` sentence if present, else a warm stat summary titled "Your portrait so far". Remove the fabricated 55/15/30 donut fallback, the permanent "—" days placeholder cell, and the redundant Key Stats row (hero already shows totals). Turn the emptiest-wing insight into an actionable "Your Travel wing is empty — add a memory" nudge. All text ≥1rem, warm on-light ink, no gold body text, drop `fontWeight:300` numerals.

### Persona Selector — `PersonaSelector.tsx` — CUT from daily scroll
Its only downstream effect is re-sorting `TrackProgress`; not worth a 5-question quiz gating the page above the user's own memories for a grieving 60+ audience. Move into onboarding/Settings only. If a persona exists, keep at most a one-line "Tuned for: Storyteller · change" chip inside the journey card. Infer style passively going forward. Removes the steel-blue `#4682B4` dimension bars and all first-run auto-expand issues at a stroke.

### Your Legacy — `HomeView.tsx` (`LegacyPanel` block) — DEMOTE to footer
Reduce to a single quiet "Plan your legacy" link in the footer utility row (already deep-links to `/settings/legacy`). End-of-life estate config is not a daily home action and shouldn't be the somber terminal widget. Decouple language from the points economy — stewardship, not scoring.

### Overall shell / IA — `HomeView.tsx` + `TuscanStyles.tsx` — REDESIGN
Two-zone CSS grid (primary ~62% / rail ~38%, stacking below 1024px). Three labelled chapters with `TuscanSectionHeader` eyebrows. Wrap in `<main>`; each zone/section is `<section aria-labelledby>` with a real heading ladder (one h1/h2 for the Atrium, h2 per section). Every widget rebuilt on `TuscanCard` (one 1rem radius, one gold top-hairline, one shadow). Snap all sizes to `T.space`/`T.radius`/`T.fontSize`. Tiered spacing: tighter within a chapter, larger gap + eyebrow between chapters, ~1.5rem on mobile. All infinite SMIL/CSS/JS-timer animations behind a shared `useReducedMotion` hook; entrance reveals fire once; gate the confetti overlay under reduce.

---

## 6. Brand / Consistency Rules

**Type.** Fraunces (`T.font.display`) reserved strictly for: the greeting H1, stat numerals, section titles (`TuscanSectionHeader`, ONE size across all sections — 1.25rem/600 or promote to `T.fontSize.xl` 1.375rem, but one value), memory/room names, and persona/achievement result names. Everything else — small tracked-uppercase eyebrows, all body/description copy, button labels, dates, stat labels — is Source Sans 3 (`T.font.body`). **ALL eyebrows are Source Sans** (fix the date-eyebrow-in-Fraunces inconsistency). Hard **16px (1rem) floor** for any prose; secondary meta never below ~14px; retire all 9–13px labels. Raise `T.fontSize.base` to 1rem so components stop inheriting an under-16px baseline.

**Colour.** Warm ladder only: charcoal `#1F1B1A` (primary ink), `inkSoft #403B36` / `land.inkBody`, `inkMutedLight #716A5E` for muted-on-light (≥4.5:1 — retire `muted #857B70` for real text), `rustDeep #9A4F2A` for accent text/links/eyebrows on light (the name accent, "view all"), `terracotta #C66B3D` for the primary CTA fill, `sage #4A6741` and `walnut #8B7355` as secondary category accents, linen→warmStone→cream surfaces. **GOLD `#D4AF37` is GRAPHIC-ONLY on light** (card top-hairline, stat separators, small ornament, progress-ring fill) — NEVER readable body/percent/count text. **Zero blue, violet, teal, or third-party brand hex anywhere.** Any on-dark surface (kept only if truly needed) uses linen text + `land.inkMutedDark #B5ADA3`, never raw `rgba(255,255,255,x)`.

**Logo / iconography.** The canonical `PalaceLogo variant="mark"` (4 solid pillars + 5th raised oval at 70%) is the ONLY palace glyph — small in the hero. Any richer palace scene derives from that geometry, never an 8-column gold-wireframe temple. All icons are crafted single-colour SVG line marks (~1.5 stroke, rounded caps, 24×24 viewBox) tinted with `T.color` tokens, matching `WingIcon` — no OS emoji anywhere (room.icon, memory typeIcons, streak flame all replaced).

**Card + spacing.** One card language: `TuscanCard` with 1rem radius (`T.radius.lg`), the 2px gold TOP-hairline accent (drop all left-bar variants), one shared shadow token. Per-section hue varies only via an `accentColor` prop, never the accent's position/width. Inner radii follow a concentric ladder (lg card → md control → sm chip). All padding/margins/gaps from `T.space`. Flat 2.5rem inter-section margin becomes tiered; ~1.5rem on mobile. Every interactive element ≥44px (`T.touch`), with a shared gold/rustDeep `:focus-visible` ring and a touch-press `:active` state (not hover-only).

**Motion.** Used sparingly, only to welcome, never to nag. All entrance reveals fire ONCE and settle — no perpetual loops. A shared `useReducedMotion` hook (`matchMedia('(prefers-reduced-motion: reduce)')` read into state) governs everything — critically it gates SMIL by omitting `<animate>` children (which the globals.css duration reset cannot touch), removes JS setTimeout flash/fade timers and imperative hover transform lifts, and renders nothing for confetti under reduce. Under reduce the Atrium is fully still (opacity 1, colour/shadow/border feedback only). Hover and focus decoupled: focus always gets its own ring. Hover motion capped to ~2–3px lift, wrapped in `@media (hover:hover)` so it never latches on iOS touch. The feel: turning a page in a family album by steady candlelight — not a casino, not a fitness app.

---

## 7. Prioritized Build List

### P0 (highest-impact, mostly self-contained)
- `AtriumHero.tsx` — render the 3 dead stat props as a Fraunces stat line + first-run invitation swap at 0.
- `AtriumHero.tsx` — replace gold-shimmer transparent-clip H1 with solid charcoal Fraunces 600, name in `rustDeep`, left-aligned.
- `AtriumHero.tsx` — compute ONE state-driven primary CTA (add-first / add-today / continue-room); demote Library/Palace to two quiet outcome chips.
- `AtriumHero.tsx` — remove the two giant SMIL temple/library illustration cards; anchor any glyph on `PalaceLogo variant="mark"`.
- `HomeView.tsx` (`handleContinueLastRoom` ~451) — deep-link Continue into the real wing/room, not `handleNavigateLibrary()`; add 14-day staleness gate + warm sub-line.
- `HomeView.tsx` — cut the streak flame + loss-framing block (~529); no emoji on the home surface.
- `HomeView.tsx` — remove `PersonaSelector` from the daily scroll (move to onboarding/Settings).
- `HomeView.tsx` — re-order to two-zone grid: promote Recent/OnThisDay/Shared above the tool/journey material; primary CTA in hero is the single loud action.
- `AtriumWidgets.tsx` (`RecentMemories`) — fix click to open the actual memory/room (pass real `roomId`); render a warm empty state instead of vanishing; consume `isMobile` → 2-across grid.
- `AtriumHero.tsx` + `HomeView.tsx` + `TuscanStyles.tsx` — add shared `useReducedMotion` hook gating SMIL/JS-timers/hover lifts; add shared `:focus-visible` ring utility.

### P1
- `HomeView.tsx` — build the unified rail "Your journey" card; route full tracks + all badges behind View-all.
- `AtriumWidgets.tsx` (`TrackProgress`) — author `capture`/`connect` icons (`TrackIcons.tsx`); wire CTA to `step.navigateTo`; retune off-token colours; drop points pill + infinite shimmer + arcade copy; `role="progressbar"`.
- `AtriumWidgets.tsx` (`AchievementShowcase`) — surface only earned badges (newest first) + one nudge; rewrite gamer titles; always-visible labels; no padlocks on home.
- `EnhanceMemories.tsx` + `HomeView.tsx` — build the primary "Add a memory" zone (Upload/Write/Voice/Time Capsule); demote tail to rail; footer for Blog/Help/Reddit; drop off-palette hex; collapse double hover-lift; add real quick-add.
- `AtriumActivity.tsx` (`InterviewPrompt`) — consume `interviewCount` (Continue-your-story state); use `TuscanSectionHeader`; drop bespoke 1.875rem/700 heading, floating quote glyph, dual glow blobs, infinite border-glow; remove duplicate interview entry from `PersonalProfile`.
- `PersonalProfile.tsx` — re-skin light/warm; drop dark slab + NeuralBackground + neural icon + "AI-powered" framing; remove fabricated donut fallback, "—" cell, redundant Key Stats row; emptiest-wing actionable nudge; text ≥1rem.
- `FeatureDiscovery.tsx` — merge into rail "Ways to add & explore"; warm-recolour; de-dupe Kep/Explore; 2-col vertical grid on mobile; state-aware ordering.
- `AtriumActivity.tsx` (`OnThisDayCard`) — broaden recall engine; reduce sepia/vignette; rebuild on `TuscanCard` gold top-hairline; add "Add this year's memory" + "see all".
- `AtriumActivity.tsx` (`SharedRoomsPreview`) — human "{Name} shared {room}" framing; fix wing/owner inversion; drop Wing pill + hardcoded 0; crafted sage icon; skeleton loader; single predictable destination.
- `HomeView.tsx` — demote Legacy to a footer utility link; add footer utility row (legacy/help/blog).
- `HomeView.tsx` / all widgets — `<main>` + `<section aria-labelledby>` landmark structure + heading ladder; ≥44px touch targets + `:focus-visible` on every interactive card.

### P2
- `theme.ts` — raise `T.fontSize.base` to 1rem; add warm dimension-colour tokens (retire `DIM_COLOR`); add `terracottaLight`/`sageDark` + glass/scrim/shadow tokens so components stop inventing rgba.
- `HomeView.tsx` — tiered spacing (tight within chapter, larger + eyebrow between chapters, ~1.5rem mobile) replacing the flat 2.5rem rhythm.
- `AtriumWidgets.tsx` — designed on-brand placeholder (warm type-tinted gradient + gold hairline) for image-less memories; crafted type/line icons.
- All widgets — snap remaining literal radii/sizes/spacing to `T.radius`/`T.fontSize`/`T.space`; standardise one `TuscanSectionHeader` size across all sections.
- `HomeView.tsx` — gate the confetti overlay under reduced-motion (render nothing).
- Copy pass — dignified legacy-appropriate achievement + track CTA copy; warm human dates; remove clock badges from interview templates.

---

## 8. Cut List

- The two giant SMIL-animated temple + library illustration cards in the hero.
- The gold-shimmer gradient-clip transparent H1 greeting + `atriumGoldShimmer` infinite.
- The Duolingo streak badge (🔥 emoji, "{count}-day streak!", "Keep it going!").
- The entire Persona Selector 5-question quiz from the daily Atrium (steel-blue `#4682B4`/olive bars, auto-expand-on-first-run) → onboarding/Settings.
- The ⭐ points pill, infinite shimmer on all 8 progress bars, "Mark your Memories"/"Palace Master. Every track conquered." arcade copy.
- EnhanceMemories' off-ramp tiles from the creation flow: Blog, Help, Reddit "Contribute" external link.
- The PersonalProfile dark charcoal slab, NeuralBackground dots, neural-silhouette icon, "AI-powered insights" framing.
- The fabricated 55/15/30 donut fallback and the permanent "—" days-of-memories placeholder StatCell.
- The redundant Key Stats row in PersonalProfile (hero already renders totals).
- Duplicate interview entry points in PersonalProfile (`onStartInterview`/`onStartBaselineInterview`) — one canonical home.
- Off-palette hardcoded hex everywhere: WhatsApp `#25D366`, Explore violet `#7B6B8E`, Kep teal, Reddit `#FF4500`, legacy `#2C2C2A`, cocreate `#5B8FA8`.
- Category tabs + the 28-badge horizontal padlock filmstrip from the Atrium achievement surface (keep in View-All panel).
- Your Legacy as a full expandable terminal widget (→ footer link).
- All raw system emoji used as icons (room.icon, memory typeIcons, streak flame) → crafted Tuscan line marks.
- All infinite/perpetual animation on the home surface (border-glow, shimmer, float, star twinkle, water shimmer, sound-wave loops).

## 9. Add List

- A rendered STAT LINE in the hero consuming the dead `totalMemories/totalWings/totalRooms` props (Fraunces numerals, gold-graphic separators) + first-run invitation swap at 0.
- ONE computed next-best-action primary CTA in the hero (first-run→add-first; has-memories-none-today→add-today; unfinished-room→continue) as the single dominant button.
- A two-zone CSS grid: warm primary column + quiet secondary rail (stacks on mobile), giving every widget a defined place.
- A unified "Your journey" rail card fusing streak + track next-step + points + achievements + one nudge.
- A proper "Continue where you left off" resume card that deep-links into the named room's wing (14-day gate + warm content sub-line).
- A grouped "Add a memory" zone presenting voice-interview + upload + write + time-capsule as siblings under one `TuscanSectionHeader`, with a real one-tap quick-add.
- Crafted Tuscan SVG line icons for the two missing tracks (`capture`, `connect`) and for memory types + shared-room marks, matching `WingIcon`/`PalaceLogo` stroke language.
- Warm empty/first-run states for Recent Memories ("Your first memory is waiting" + Add CTA) and a broadened On-This-Day recall engine.
- A shared `useReducedMotion` hook + a shared `:focus-visible` ring utility applied to every interactive card.
- Dignified legacy-appropriate achievement copy rewrites and always-visible badge labels (touch-accessible).
- A footer utility row for the genuine off-ramps: Plan your legacy, Help, Blog.
