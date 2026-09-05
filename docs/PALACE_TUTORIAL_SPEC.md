# PALACE TUTORIAL SPEC — Exterior · Entrance Hall · Corridor · Room

**Date:** 2026-08-20 · **Branch:** staging · **Status:** Implementation spec (final copy included) · **Rev:** 2 (post-critique)
**Goal:** Bring all four 3D-scene tutorials into 100% alignment with the Atrium/Library/Me tutorial canon (NudgeTooltip / SettingsTutorial card grammar, step UX, voice) and make every sentence truthful to the behavior shipped 2026-08-18/20 (approach-flight auto-enter, one-click RoomMediaPlayer everywhere, Steward's Ledger, compact mobile breadcrumb bar).

**Canon honesty note (Rev 2):** the "canon" is split between NudgeTooltip.tsx and SettingsTutorial.tsx on several axes (ring color, scrims, widths, bullets, a11y, skip label). Wherever they diverge, this spec now names both sources and declares ONE choice for the scene tours; it no longer presents a single grammar as pre-existing where none exists.

---

## 1. Component plan — UPDATE, don't rebuild

No new tutorial framework. The four scene tutorials already share the canon card grammar lineage (NudgeTooltip.tsx:364 cites CorridorTutorial/SettingsTutorial as the canon). We keep all four components and their stores, restyle + recopy them, and align their step UX.

| Surface | File | Action |
|---|---|---|
| Exterior tour | `src/components/ui/PalaceExteriorTutorial.tsx` | **UPDATE** — new copy (approach flight auto-enter, compact bar), mobile steps 2 AND 3 become centered cards (no `[data-mp-palace-enter]` target — the Enter chip only exists when a pending selection exists, so it cannot be reliably spotlit; step 3 teaches free-look gestures, so a whole-scene cutout would only intercept the gestures being taught). Delete the dead exported hook `usePalaceExteriorTutorial` (never imported). |
| Entrance tour | `src/components/ui/EntranceHallTutorial.tsx` | **UPDATE** — copy refresh; step structure (mobile 1 / desktop 2) stays; tap-to-advance removed (§1.1). |
| Corridor tour | `src/components/ui/CorridorTutorial.tsx` | **UPDATE** — copy rewrite (one-click fullscreen viewer, auto-seeded paintings, Media pill wording — it is a linen pill labeled "Media", NOT a "golden medallion"); tap-to-advance removed. |
| Room tour | `src/components/ui/RoomTutorial.tsx` | **UPDATE** — overview-card bullets rewritten for Steward's Ledger, one-click viewer, AV pill. Remove the unused in-file `useRoomTutorial` guard hook (live path is the MemoryPalace effect). Add NEW `skip` + `stepXofY` keys (the section currently has neither — see §2.5/§4.1). |
| Touch hint | `src/components/ui/TouchControlsOverlay.tsx` | **UPDATE** — split the shared entrance/corridor hint: corridor keeps painting wording, entrance gets a NEW `entranceHint` key without it (the hall has no tappable paintings and §2.2 forbids implying the lunettes are tappable). Suppress while any scene tour is open (§5.4). |
| Nudge palace walk | `src/lib/stores/nudgeStore.ts` + `NudgeTooltip.tsx` | **UPDATE** — remove `palace_room_layout` from the palace sequence (layout picker no longer exists); rewrite 3 stale copy keys (§4.3). No renderer changes. |
| Steward's Ledger | `src/components/ui/RoomStewardLedger.tsx` | **UPDATE** — the station-hint fallback at line 143 ships `screen: "Recessed over the mantel"`, contradicting §7.10 inside the very panel the room tour points at. Rewrite fallback + `roomMedia.stationWhere_screen` ×5 locales → EN "Set into the right wall" / NL "In de rechterwand". |
| Dead code | `src/lib/stores/tutorialStore.ts` TUTORIAL_STEPS, `src/components/ui/Minimap.tsx`, `src/components/ui/FirstMemoryPrompt.tsx` + its lazy import (MemoryPalace.tsx:87) | **DELETE** (keep only the `useTutorialStore(s=>s.active)` suppression flag reads, or replace with a trivial const). |

### 1.1 Canon step-UX alignment (all four scene tours)

Declared grammar for scene tours (source named per rule; where the two canon components diverge, the choice is explicit):

- **No step dots.** Strictly forward: `[Skip tutorial]` (left, MUTED ghost button, minHeight 2.75rem, hover→INK — hover treatment adopted from NudgeTooltip's prompt/walk variants; the overview/tooltip variants and SettingsTutorial have no hover state) + `[Next]` / `[Got it]` on the final step (right, solid EMBER #B85C38, white text, borderRadius 0.5rem, minHeight 2.75rem). The scene tours' `done` values are ALREADY "Got it"/"Begrepen" — keep them; no rename needed. Skip label standardized on "Skip tutorial"/"Tutorial overslaan" (nudge.skip precedent; settingsTour.skip uses plain "Skip"/"Overslaan" and stays as-is).
- **Step announcement (NEW, no canon precedent):** add `stepXofY` as a visually-hidden `aria-live="polite"` announcement on multi-step tours. Neither NudgeTooltip nor SettingsTutorial announces steps today (SettingsTutorial's TourControls ignores its `total` prop); this is a deliberate a11y addition, and `roomTour` needs the key created (§4.1).
- **Card grammar:** CREAM #FCFAF5 opaque card, 1px HAIRLINE #E3D6BC border, SHADOW[2], radius 0.875rem (tooltip) / 1rem (centered card). Title: Fraunces (`T.font.display`) 600, INK #403B36, 0.9375–1.0625rem, letterSpacing 0.02em. Body: Source Sans, 0.8125rem, MUTED #716A5E, lineHeight 1.5 (SettingsTutorial spotlight-tooltip precedent; NudgeTooltip's Fraunces `playfulText` message style is NOT used for scene tours). Overview bullets: tiny `◆` in EMBER_GLYPH #9A4F2A (NudgeTooltip pattern; SettingsTutorial's round-EMBER-dot variant not used — split resolved in favor of ◆). Footer notes: 0.75rem MUTED italic. No gold text, no italic titles.
- **Spotlight:** SVG mask scrim `rgba(64,59,54,0.45)` with rounded cutout (0.25rem padding around the target) + pulsing 0.1875rem GOLD #D4AF37 ring (`nudgePulse`-style 2s) — NudgeTooltip.tsx:824 precedent; SettingsTutorial's 0.125rem EMBER ring is the other canon and stays untouched there. Centered cards ALSO use scrim 0.45 (SettingsTutorial tour precedent; NudgeTooltip centered variants range 0.28–0.40 — split resolved on 0.45 for tour modality). **The cutout is NOT interactive:** the scrim intercepts all pointer events, matching both canon components — there is NO tap-to-advance button over cutouts (the previous scene-tour tap-to-advance is removed; `advanceHint` keys are purged, §4.2). Advancing is via the Next/Got it buttons only.
- **Motion:** every keyframe gated by `@media (prefers-reduced-motion: reduce) { animation: none !important }` + JS `useReducedMotion()` for timers. Under reduced motion the GOLD ring REMAINS as a static (non-pulsing) ring — the highlight must never disappear entirely. All geometry rem-derived, re-laid-out on resize/rotation/root-font-size change (SettingsTutorial `remPx` pattern).
- **A11y (build target — only SettingsTutorial ships part of this today; NudgeTooltip ships none of it):** portal to body, `role="dialog" aria-modal="true"`, Escape closes (without muting, §5.2), focus trap Skip↔primary, primary auto-focused per step (all four per SettingsTutorial.tsx:113–128/166/226), PLUS focus restore on close — which currently exists in NO canon implementation and is a new requirement here.
- **Platform branch:** `useTouchControls()` for joystick-vs-WASD copy (NEVER viewport width); `useIsMobile()` only for card sizing/position.

---

## 2. Final step lists + copy (EN / NL)

Voice: warm steward, second person, em-dash asides, museum metaphor, sentence case, no exclamation marks, short (German-expansion safe — verify per §8), zero pricing/upgrade/locked-slot language (iOS seal). NL uses informal je/jij; wing names stay English. During-tour copy is DESCRIPTIVE ("tapping it opens…"), never an imperative the scrim would block (§1.1: cutouts are inert while the tour is up).

### 2.1 EXTERIOR — section `palaceTour`

**Desktop (2 steps)**

| # | Type | Key(s) | EN | NL |
|---|---|---|---|---|
| 1 | Centered card | `dStep1Title` / `dStep1Body` | **Your palace on the hill** / Drag to look around and scroll to draw closer. Click the palace — even from afar — and you'll ride up the road and step straight inside. | **Je paleis op de heuvel** / Sleep om rond te kijken en scroll om dichterbij te komen. Klik op het paleis — ook van veraf — en je rijdt de weg op en stapt zo naar binnen. |
| 2 | Spotlight `[data-palace-subnav]` | `dStep2Title` / `dStep2Body` | **Jump anywhere** / This bar shows where you are — Palace, Wing, Room. Use it to jump straight to any place, without the walk. | **Spring overal heen** / Deze balk toont waar je bent — Paleis, Vleugel, Kamer. Spring ermee meteen ergens heen, zonder de wandeling. |

**Mobile (3 steps)**

| # | Type | Key(s) | EN | NL |
|---|---|---|---|---|
| 1 | Spotlight `[data-mp-palace-bars]` | `step1Title` / `step1Body` | **Your compass** / This bar shows where you are — Palace › Wing › Room. Tapping it opens the picker, for jumping to any wing or room. | **Je kompas** / Deze balk toont waar je bent — Paleis › Vleugel › Kamer. Een tik erop opent de kiezer, om naar elke vleugel of kamer te springen. |
| 2 | Centered card (no target) | `step2Title` / `step2Body` | **Two ways in** / Tap the palace and you'll ride up the road, straight inside. Up close, tap a wing door and the bar offers Enter — one more tap takes you in. | **Twee wegen naar binnen** / Tik op het paleis en je rijdt de weg op, zo naar binnen. Tik je van dichtbij op een vleugeldeur, dan biedt de balk Enter aan — nog één tik en je bent binnen. |
| 3 | Centered card (no target) | `step3Title` / `step3Body` | **Look around** / Drag with one finger to circle the palace; pinch to come closer or drift away. | **Kijk rond** / Sleep met één vinger om rond het paleis te draaien; knijp om dichterbij te komen of verder weg te gaan. |

Truth guards (verified against ExteriorScene.tsx:6040/6246/6285 + MemoryPalace.tsx:1495–1502): the approach flight ends by AUTO-ENTERING — never say "arriving at the door" or imply a further click; a near tap on the main entrance also auto-walks and auto-enters (no Enter chip, including under reduced motion — the mid-range reduced-motion entrance tap is treated as an arrival) — the Enter-chip flow is only promised for wing doors, and only UP CLOSE: a FAR wing-door tap rides the approach flight in and auto-enters that wing directly (no Enter chip), which is why step 2 says "Up close".

### 2.2 ENTRANCE HALL — section `entranceHallTour`

**Mobile (1 step — spotlight `[data-mp-joystick]`)**

- `stepTitle` EN: **The Entrance Hall** · NL: **De ontvangsthal**
- `stepBody` EN: Tap any door — even across the hall — and you'll stroll over and step inside. Use this joystick whenever you'd rather wander yourself.
- `stepBody` NL: Tik op een deur — ook aan de overkant — en je wandelt ernaartoe en stapt binnen. Gebruik deze joystick als je liever zelf rondloopt.

**Desktop (2 steps)**

| # | Type | Key(s) | EN | NL |
|---|---|---|---|---|
| 1 | Centered card | `dStep1Title` / `dStep1Body` | **The Entrance Hall** / Every door carries a wing's name, its newest photo glowing above. Click any door, at any distance — you'll walk over and enter. WASD or arrow keys to stroll; hold and drag to look around. | **De ontvangsthal** / Elke deur draagt de naam van een vleugel, met de nieuwste foto erboven. Klik op een deur, hoe ver ook — je loopt ernaartoe en gaat binnen. WASD of pijltjestoetsen om te wandelen; klik en sleep om rond te kijken. |
| 2 | Spotlight `[data-palace-subnav]` | `dStep2Title` / `dStep2Body` | **Or skip the walk** / This bar always knows where you are — use it to jump to any wing or room in a click. | **Of sla de wandeling over** / Deze balk weet altijd waar je bent — spring ermee in één klik naar elke vleugel of kamer. |

Forbidden here: any mention of locked/shared slots, the floor inlay, or upgrades (iOS seal); lunettes are decorative-only — never say "tap the photo above the door".

### 2.3 CORRIDOR — section `corridorTour`

**Mobile (2 steps)**

| # | Type | Key(s) | EN | NL |
|---|---|---|---|---|
| 1 | Spotlight `[data-mp-joystick]` | `step1Title` / `step1Body` | **The wing's gallery** / Each frame holds a room's newest photo — tap a painting to view it full screen, or tap a door to step into that room. The joystick lets you wander. | **De galerij van de vleugel** / Elke lijst toont de nieuwste foto van een kamer — tik op een schilderij om het schermvullend te bekijken, of tik op een deur om die kamer binnen te gaan. Met de joystick wandel je zelf. |
| 2 | Spotlight `[data-mp-corridor-media]` | `step2Title` / `step2Body` | **Curate the walls** / This pill chooses which memory hangs in each frame — tapping an empty frame opens it too. | **Stel de wanden samen** / Met deze knop kies je welke herinnering in elke lijst hangt — op een lege lijst tikken opent hem ook. |

**Desktop (2 steps)**

| # | Type | Key(s) | EN | NL |
|---|---|---|---|---|
| 1 | Centered card | `dStep1Title` / `dStep1Body` | **The wing's gallery** / Each painting is a room's newest photo — click one to view it full screen. Click any door to enter its room; you'll walk over on your own. WASD to stroll, drag to look. The portal behind you leads back to the hall. | **De galerij van de vleugel** / Elk schilderij is de nieuwste foto van een kamer — klik erop om het schermvullend te bekijken. Klik op een deur om die kamer binnen te gaan; je loopt er vanzelf heen. WASD om te wandelen, sleep om te kijken. Het portaal achter je leidt terug naar de hal. |
| 2 | Spotlight `[data-mp-corridor-media]` | `dStep2Title` / `dStep2Body` | **Curate the walls** / This pill chooses which memory hangs in each frame — clicking an empty frame opens it too. | **Stel de wanden samen** / Met deze knop kies je welke herinnering in elke lijst hangt — op een lege lijst klikken opent hem ook. |

Truth guards: never promise "empty gold frames" (auto-seed hangs the newest photo per room); "Media" is the pill's real label; the room's name is engraved ON the door (bronze nameplate), not beside it.

### 2.4 ROOM — section `roomTour` (single centered overview card, ◆ bullets, italic footer, Got it)

- `overviewTitle` EN: **Welcome to this room** · NL: **Welkom in deze kamer**

**Mobile items (`item1..item5`)** — EN / NL:
1. Wander — joystick to walk, drag to look around. / Wandel — joystick om te lopen, sleep om rond te kijken.
2. Tap any memory on the walls to view it full screen — browse the whole room from there, and edit right in the viewer. / Tik op een herinnering aan de wand om haar schermvullend te bekijken — blader daar door de hele kamer en bewerk direct in de viewer.
3. Media — opens this room's ledger: bring memories in, write a note, feature one above the fireplace, choose what's shown or archived. / Media — opent het register van deze kamer: breng herinneringen binnen, schrijf een notitie, geef er één de ereplek boven de haard, kies wat hangt of in het archief rust.
4. See a play button? This room keeps sound or film — tap it for the player. / Zie je een afspeelknop? Deze kamer bewaart geluid of film — tik erop voor de speler.
5. The bar up top jumps you to any wing or room. / De balk bovenin brengt je naar elke vleugel of kamer.

**Desktop items (`dItem1..dItem5`)** — EN / NL:
1. WASD or arrow keys to walk — hold Shift to hurry, drag to look around. / WASD of pijltjestoetsen om te lopen — houd Shift in om vlot door te stappen, sleep om rond te kijken.
2. Click any memory to view it full screen — browse the whole room from there, and edit right in the viewer. / Klik op een herinnering om haar schermvullend te bekijken — blader daar door de hele kamer en bewerk direct in de viewer.
3. Media — opens this room's ledger: bring memories in, write a note, feature one above the fireplace, choose what's shown or archived. / Media — opent het register van deze kamer: breng herinneringen binnen, schrijf een notitie, geef er één de ereplek boven de haard, kies wat hangt of in het archief rust.
4. See a play button? This room keeps sound or film — click it for the player. / Zie je een afspeelknop? Deze kamer bewaart geluid of film — klik erop voor de speler.
5. The breadcrumb bar jumps you anywhere, without the walk. / Met het kruimelpad spring je overal heen, zonder de wandeling.

- `overviewFooter` EN: *Every memory finds its own place — photos along the hall, keepsakes in the vitrine, words in the library, sound at the gramophone, film on the screen.*
- `overviewFooter` NL: *Elke herinnering vindt haar eigen plek — foto's langs de hal, kleinoden in de vitrine, woorden in de bibliotheek, geluid bij de grammofoon, film op het scherm.*

Truth guards: the screen is set into the RIGHT wall (never "over the mantel" — this also requires the Ledger hint fix, §1 table); the mantel holds the ★ hero portrait; no station capacity numbers in copy; never mention room types/layouts.

**Key delta:** `roomTour` currently has only 13 keys (`overviewTitle`, `item1-5`, `dItem1-5`, `overviewFooter`, `done`) — `skip` and `stepXofY` must be ADDED (new keys ×5 locales) or the canon Skip button and step announcement cannot render.

### 2.5 Shared button keys (all four sections)
`skip` = "Skip tutorial" / "Tutorial overslaan" (exists in three sections; NEW in `roomTour`) · `next` = "Next" / "Volgende" · `done` = "Got it" / "Begrepen" (already the shipped values in all four sections — no rename; note the nudge canon names this key `gotIt` and also has a `tryIt` CTA, but scene tours keep the existing `done` key to avoid ×5-locale churn, and `tryIt` has no scene-tour equivalent) · `stepXofY` = "Step {x} of {y}" / "Stap {x} van {y}" (aria-only; NEW in `roomTour`). The `advanceHint` keys (entranceHallTour, corridorTour) are RETIRED with tap-to-advance — purge (§4.2).

### 2.6 TouchControlsOverlay — section `touchControls`
- `corridorHint` (corridor ONLY) EN: "Drag to look around · Tap a door or painting to travel there" · NL: "Sleep om rond te kijken · Tik op een deur of schilderij om ernaartoe te gaan".
- `entranceHint` (NEW key ×5 locales, entrance hall) EN: "Drag to look around · Tap a door to walk there" · NL: "Sleep om rond te kijken · Tik op een deur om ernaartoe te wandelen" — the hall has no tappable paintings; the previous shared hint invited the exact interaction §2.2 forbids.
- `roomHint`, `move`, `look`, `gotIt`: unchanged.

---

## 3. Nudge palace-walk alignment (`nudge` section, nudgeStore.ts)

1. **Remove** `palace_room_layout` from `PAGE_NUDGES.palace` (and MOBILE list) — the room-layout/type picker no longer exists. Purge key `nudge.roomLayout` (×5 locales) and its NUDGE_CONFIG entry.
2. **Rewrite** `nudge.clickEntrance` EN: "Tap the palace — you'll ride up the road and step inside." NL: "Tik op het paleis — je rijdt de weg op en stapt naar binnen."
3. **Rewrite** `nudge.palaceRoomInfo` EN: "Tap any memory to view it full screen — the Media pill opens this room's ledger." NL: "Tik op een herinnering om haar schermvullend te bekijken — de Media-knop opent het register van deze kamer."
4. **Audit** `palaceRoomOverviewItems`, `roomUpload`, `roomMemory`, `palaceCorridorItems`, `palaceEntranceItems` against §7's forbidden list; rewrite any bullet mentioning layouts, galleries/tabs, furniture slots, or two-tap viewing to the §2 vocabulary (one-click viewer, Ledger, auto-seeded frames). Overview `Items` stay JSON-stringified arrays parsed in try/catch.

Note: nudge dismissal mechanics (skipAll = permanent all-nudges kill, inert scrims) are a DIFFERENT model from the scene tours (§5.2) and are deliberately untouched here.

---

## 4. i18n key plan

### 4.1 Sections kept (rewrite values in place, all 5 locales `src/messages/{en,nl,de,es,fr}.json`, FLAT keys)
- `palaceTour` — reuse `step1..3Title/Body`, `dStep1..2Title/Body`, `skip`, `next`, `done`, `stepXofY`. New VALUES per §2.1.
- `entranceHallTour` — reuse existing keys, new values per §2.2; purge `advanceHint` (§4.2).
- `corridorTour` — reuse existing keys, new values per §2.3; purge `advanceHint` (§4.2).
- `roomTour` — reuse the 13 existing keys with new values per §2.4 (`done` is already "Got it"/"Begrepen" — value unchanged); ADD `skip` + `stepXofY` (new ×5 locales).
- `touchControls` — rewrite `corridorHint`; ADD `entranceHint` (new ×5 locales, §2.6); purge `desktopHint`, `mobileHint` (0 refs).
- `roomMedia` — rewrite `stationWhere_screen` (×5 locales) + the RoomStewardLedger.tsx:143 fallback → EN "Set into the right wall" / NL "In de rechterwand" (stale "Recessed over the mantel", §7.10).
- `contextualTooltip` — purge `emptyRoomHint` (retired tooltip id); rewrite `furnitureHint` EN: "Tap a memory to view it full screen" · NL: "Tik op een herinnering om haar schermvullend te bekijken" (old copy described pre-overhaul clickable furniture).
- DE/ES/FR: translate from the final EN with the same register (match current files' du-form convention). Do NOT assume German fits: the longest strings (room items 2–3, corridor dStep1) must be verified at 360px portrait per §8; cards scroll with a fade affordance when they overflow (§6.1).

### 4.2 Purge list (stale keys ×5 locales — delete keys AND dead consumers)
- `tutorial` — ALL 55 keys + gut `tutorialStore.ts` TUTORIAL_STEPS (keep the suppression boolean if still read).
- `minimap` (2) + delete `Minimap.tsx`.
- `firstMemoryPrompt` (5) + delete component + lazy import.
- `exterior3d`: `rotateHint`, `controlsHint`, `pinchHint`, `dragHint`, `rotateDismiss`, `cinematicPrompt`, `cinematicYes`, `cinematicSkip` (8).
- `interior3d`: `noVideos`, `cinemaScreen`, `vinylPlayer`, `loopOn`, `loopOff`, `stop`, `volume`, `rotate`, `noPaintings` (9).
- `palace`: `hintExterior`, `hintEntranceWalk`, `hintEntranceDrag`, `hintEntranceDoor`, `hintCorridorDoor`, `hintRoomMemories` (6).
- `entranceHall`: `unmute`, `mute`, `sharedWing`, `sharedWingTooltip` (4).
- `walkthrough`: `clickEntrance`, `enterWing`, `enterRoom` (3).
- `corridorGallery`: `default`, `cancel`, `choose` (3).
- `settingsTour.helpAria` (1) · `nudge.roomLayout` (1, §3).
- `entranceHallTour.advanceHint` + `corridorTour.advanceHint` (2, tap-to-advance retired, §1.1).

This list = **99 keys**; **102 total purged** counting §4.1's `touchControls.desktopHint`/`mobileHint` and `contextualTooltip.emptyRoomHint`. New keys added: 4 (`roomTour.skip`, `roomTour.stepXofY`, `touchControls.entranceHint` — ×5 locales each — plus no others). Purge in one commit with the copy rewrite so grep-verification (`0 refs outside src/messages`) is re-runnable.

---

## 5. Triggers, persistence, re-open

### 5.1 Auto-fire (bumped keys; one guard change)
Existing MemoryPalace effects stay the live path (exterior 1056-1074, entrance 1020-1038, corridor 990-1010, room 963-988): fire on first entry per scene when `navMode==="3d"`, 800ms delay (corridor 0ms → change to 800ms for consistency), per-session ref, `tutorialsMuted()` guard, seen-flag set at fire time. **CHANGE:** the room effect currently fires on ANY navMode — add the `navMode==="3d"` guard there too; every §2.4 bullet (joystick, walls, Media pill, play button) describes the 3D interior and would be false elsewhere.

**Bump all four localStorage keys to `_v2`** — `mp_palace_tour_seen_v2`, `mp_entrance_tour_seen_v2`, `mp_corridor_tour_seen_v2`, `mp_room_tour_seen_v2` — the interaction model changed materially (approach-flight auto-enter, one-click viewer, Ledger), so every existing user sees each rewritten tour exactly once more. Do not migrate/read the `_v1` keys.

**Divergence note:** per-scene seen-keys + auto-fire is a deliberate scene-tour convention. It does NOT match the nudge canon (aggregate `mp_nudges_seen`/`mp_nudges_skipped`) nor the Me canon (no auto-fire, `?tour=1`/help-button only). Scene entry is the natural trigger here; do not "align" this to either other model.

### 5.2 Dismissal semantics (scene-tour model — NOT the nudge or Settings model)
- `Skip tutorial` button → `muteTutorials()` (global mute of all four scene tutorials until manual restart). This is the ONLY action that mutes.
- `Got it` (final step) and `Escape` → close WITHOUT muting.
- **Backdrop/scrim tap → nothing** (scrim is `pointerEvents: auto` but inert), matching both canon components — on touch, stray scrim grazes are routine and must never silently kill all tutorials.
- Leaving the scene mid-tour cancels the pending timer and closes without marking beyond the already-set seen flag.
- For the record, the other models stay untouched: nudges use `skipAll()` (permanent, help-button reset only); SettingsTutorial closes with zero persistence.

### 5.3 Manual re-open
- Help "?" menu → `mp:open-palace-tutorial` event → `unmuteTutorials()` + open the tour for the CURRENT view (existing router, MemoryPalace 1041-1053). Keep `mp:open-entrance-tutorial`.
- Nudge restarts (`?help=1`, help-menu `startTutorial` on non-3D modes) stay untouched.

### 5.4 Overlap rules
- TouchControlsOverlay must NOT render while a scene tour is open (subscribe to the four tour stores or a shared `anySceneTourOpen` selector); it may appear after dismissal — its own 6s/12s timer and `mp_touch_tutorial_seen_*` keys unchanged.
- **NEW WORK (no such guards exist today):** the four auto-fire effects currently check only view/navMode/mute/localStorage. ADD suppression so scene tours never auto-fire while the onboarding cinematic, the walkthrough, a nudge with cutout, or any modal/Sheet is active — gate the open calls (and/or the render sites at MemoryPalace.tsx:1641-1644) on those states; defer (retry next eligible moment), don't consume the seen-flag while suppressed.

---

## 6. Layout rules per platform

### 6.1 Z + chrome map (from verified constraint sheet)
- **Z stack (canon 57/58/59, NudgeTooltip.tsx:396/808/824/836):** scrim z57, pulse ring z58, card z59 — above joystick 47, nav bar 50, help scrim 55; below help menu/toast 60. A single flat z57 container (SettingsTutorial-style) is NOT acceptable here: a tour card at 57 would sit under any concurrently mounted nudge card (z59). Portal to body, `role="dialog"`.
- **Mobile keep-clear (portrait):** top full-width `calc(env(safe-area-inset-top) + 2.75rem)` (compact bar); top-RIGHT down to `calc(safeT + 6rem)` in corridor/room (Passcode/Publish circles); bottom full-width `calc(3.5rem + env(safe-area-inset-bottom))` (NavigationBar); bottom-left joystick block left 0→7.5rem, bottom 7.5rem→13.75rem (+safe); Media pill bottom 6.5rem→9rem.
- **Centered cards:** width `isMobile ? calc(100vw - 2rem) : 22rem`, `maxWidth 24rem`, `maxHeight calc(100dvh - 4rem)`, `overflowY auto` (canon values from NudgeTooltip.tsx:399 + SettingsTutorial.tsx:236 — 2rem gutter, 24rem cap).
- **Spotlight tooltips:** width `min(100vw - 2rem, 20rem)` mobile (SettingsTutorial precedent — the wider of the two canons, chosen for German fit) / 17.5rem desktop; position against the target with rem-derived math; when the target is the top bar (`[data-mp-palace-bars]`, `[data-palace-subnav]` mobile) the card sits BELOW it; when the target sits in the bottom band the card sits ABOVE **the cutout, not merely the nav bar**: card bottom edge ≥ cutout top edge + 0.75rem — concretely `bottom ≥ calc(14.5rem + env(safe-area-inset-bottom))` for the joystick (cutout top ≈13.75rem) and `≥ calc(9.75rem + env(safe-area-inset-bottom))` for the Media pill (cutout top ≈9rem). Never cover the cutout itself.
- **Doesn't-fit fallback (NEW):** compute the free band between keep-clears; the tooltip gets `maxHeight` = that band, `overflowY auto` with a 1.5rem bottom linear-gradient fade while scrollable (so long DE/FR bodies are visibly scrollable, never silently clipped). If the free band < 10rem, render that step as a centered card over full scrim instead (same safety-net as anchor-not-found).
- **Landscape (NEW — landscape/auto-rotate is enabled app-wide):** consume all four `env(safe-area-inset-*)`; when `100dvh < 26rem` (phone landscape) EVERY step renders as a centered card (full scrim, no cutout — the bottom-band geometry doesn't exist in landscape), `maxHeight calc(100dvh - 3rem)`, same scroll fade. Re-evaluate on rotation (the existing resize re-layout covers this).
- **Desktop:** keep the top ~8.5rem center band clear when not spotlighting it (NavigationBar pill top 0.875rem h 3.5rem + PalaceSubNav capsule top 4.75rem h 3.25rem); centered cards are viewport-centered so this is automatic.
- Anchor-not-found after retries → fall back to a centered card over full scrim (NudgeTooltip safety-net pattern) — required for `[data-mp-corridor-media]` (pill hidden while its panel is open) and the joystick (hidden when a panel is up).

### 6.2 Reduced motion
Both patterns mandatory: scoped `@media (prefers-reduced-motion: reduce)` CSS block killing all keyframes/transitions on tour class names, AND `useReducedMotion()` for JS timers (instant card appearance). The GOLD spotlight ring stays visible as a STATIC ring (only the pulse is removed) — the cutout must always have a visible pointer. Copy never depends on watching an animation.

---

## 7. Forbidden stale concepts — must appear NOWHERE in tutorial/nudge copy

1. Room types / layout picker / "change room type" / gallery-room vs exhibition rooms.
2. Room "Gallery" / "Library" tabs (old room panel).
3. Exhibition / peristylium vocabulary.
4. Three-logo gesture-hint strip; generic "Left side: move · Right side: look" hints.
5. Furniture slot grids / "click furniture to add memories" (furniture is walk-through except 4 solids; media hangs at stations).
6. Two-tap viewing ("walk to the frame, then tap again") — ONE click/tap opens the fullscreen RoomMediaPlayer in corridor and room.
7. "Golden medallion" for the corridor media control — it is a linen "Media" pill.
8. Empty-frame walls as the default — corridors auto-seed the newest photo per room.
9. Photo projection on the video screen / "cinema screen" / "vinyl player table" / idle "No videos yet" canvas.
10. Screen "over the mantel" — it is set into the right wall; the mantel holds the ★ hero portrait (applies to the Ledger station hints too, §1 table).
11. Glowing memory orbs, minimap, bust builder, Ancestral Wall (AW off), attic door in the hall.
12. Pricing, upgrades, subscriptions, locked wing slots, floor-inlay unlock (iOS seal — tutorials are content).
13. Gold as text color or non-ceremonial accent (GOLD = the spotlight ring + arrows only; 3D references use mat brons).
14. "Arriving at the door" / any implication the approach flight stops short of entering — it auto-enters.

---

## 8. Acceptance checklist

- [ ] All four tours restyled to §1.1 grammar (no dots, Got it kept, canon tokens, GOLD ring — static under reduced motion, EMBER CTA and Skip both ≥2.75rem, z57/58/59 stack).
- [ ] Copy in code matches §2 verbatim for EN/NL; DE/ES/FR translated; all keys present in 5 locales (flat, per-section); new keys `roomTour.skip`, `roomTour.stepXofY`, `touchControls.entranceHint` exist ×5.
- [ ] `_v2` seen-keys live; each tour fires once per fresh profile on first 3D scene entry (room tour now 3D-gated); Help "?" reopens the current scene's tour.
- [ ] Skip button mutes all scene tours; Got it / Escape close without muting; backdrop tap is inert; no tap-to-advance anywhere; TouchControlsOverlay suppressed while a tour is open; §5.4 auto-fire suppression guards BUILT and verified against onboarding cinematic + walkthrough + cutout-nudge + open Sheet.
- [ ] `nudge` palace sequence has no `palace_room_layout`; rewritten nudge keys shipped; `roomMedia.stationWhere_screen` says right wall in all 5 locales.
- [ ] Purge list §4.2 removed incl. both `advanceHint` keys (grep: 0 refs outside src/messages); Minimap/FirstMemoryPrompt/TUTORIAL_STEPS/dead hooks deleted; build green.
- [ ] Mobile portrait: no tour card overlaps compact bar, bottom nav, joystick cutout, Media-pill cutout, or Passcode/Publish circles (iPhone SE portrait + iPad portrait). Joystick/pill tooltips respect the ≥14.5rem / ≥9.75rem bottoms.
- [ ] **Landscape:** iPhone landscape check — all steps render as centered cards, readable, inside safe areas.
- [ ] **German at 360px:** longest DE strings (room items 2–3, corridor dStep1) render without silent clipping; scroll fade visible when overflowing.
- [ ] Reduced-motion: zero animation, static ring present, tours fully usable.
- [ ] iOS seal grep: no pricing/upgrade strings in any tour/nudge section.

---

## Rejected critique items

1. **"EMBER ring is arguably the truer canon" (canon defect 1, remedy direction):** the split-canon finding is accepted and now documented, but the GOLD 0.1875rem ring is kept — NudgeTooltip.tsx:824 is the newest spotlight implementation and §7.13 explicitly sanctions spotlight-ring GOLD; SettingsTutorial's EMBER ring stays untouched as-is.
2. **"Drop `stepXofY` since aria-live step announcement has no canon precedent" (canon defect 5, implied remedy):** kept, but reframed as an explicitly NEW a11y addition (§1.1) rather than removed — losing the announcement would be an a11y regression for multi-step tours.
3. **"Cutout tap target must be ≥2.75rem" (mobile defect 7, first half):** moot — tap-to-advance is removed and cutouts are inert (§1.1), so the cutout is no longer a touch target; the ≥2.75rem rule is applied to the Skip/Next/Got it buttons instead (second half of the finding, accepted).
4. **"Rename `done` labels" flagged as no-op (verification defect 4 / canon defect 16):** accepted as a factual finding, but no copy change results — the spec now simply states the values are already shipped; listed here only because there is nothing further to "fix".
