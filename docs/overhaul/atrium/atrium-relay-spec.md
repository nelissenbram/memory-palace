# The Atrium Relay — Master Spec

**Status:** Approved direction, ready to build
**Date:** 2026-07-17
**Owner:** Creative Director + Principal Engineer
**Replaces:** `src/components/ui/HomeView.tsx` (12-widget vertical dashboard)

---

## 0. Framing (the corrected model)

The Atrium is a **relay / launcher**, not a dashboard. Its single job: be the best
navigation hub in the world for a 60+ Heritage Keeper — beautiful, crystal-clear,
dynamic — relaying the user to (A) the other **parts of the app** and (B) the
**memory-enhancement options**. It is NOT a hero + stat widgets.

Two prior attempts were rejected and both failure modes are designed out here:

- **Rejection 1 — "too plain"** (greeting + one button + stats). Cured by a
  state-aware **Steward suggestion** + a rich, complete, live-content relay board.
- **Rejection 2 — "too cheap"** (reused marketing palace video as the centrepiece,
  ignoring the actual menu). Cured by making the crafted icon relay the star; the
  3D palace appears ONLY as a small contained, hour-graded doorway accent inside a
  single tile — never full-bleed, never the reused reel.

**Governing principle (the clean resolution of both rejections):**
*Guidance for the unsure, complete relay for the sure — one surface, no toggle, no
persona fork.* One dignified recommendation sits ABOVE a complete board that never
hides behind it.

---

## 1. Chosen paradigm — The Maggiordomo (Concierge Desk over a verb-zoned relay board)

**Winner: Direction #1 The Maggiordomo (41.0/50)**, executed with the strongest
structural ideas from #2 Palazzo Bento (size-as-hierarchy, content-tier tiles) and
#3 Peristylium (fixed learned-once positions, gliding focus ring) grafted in.

Why it wins for this audience and this brief:

1. It carries a **state-aware Suggested-Next** concierge card — the single element
   that cures BOTH rejections at once. It is personal, changing and intelligent
   (kills "too plain") without leaning on video (kills "too cheap"), and it is cheap
   to build because the state signals already exist in `HomeView` (`totalMemories`,
   `getWingsSharedWithMe`, `recentMemories`, `lastVisitedRoom`).
2. It keeps the **entire ~18-destination relay visible at once** in verb-led,
   tonally-zoned lanes — no scavenger hunt, no persona fork, no reshuffle. A 60+
   user learns the board once and it never moves.
3. It is graphically excellent and **buildable on the current stack** — it reuses the
   crafted 24-32px stroke icon system, TuscanCard, TuscanStyles keyframes, T.motion
   tokens, inline styles, rem units, 5 locales, and the already-wired
   `useModeTransition`.

The bento (#2) was a very close second and its geometry-as-hierarchy and content-tier
tiles are grafted directly into the lane tiles below. The peristylium's literal iso
courtyard is descoped as too costly / mobile-fragile, but its fixed-cardinal-position
discipline and single gliding gold focus ring are grafted in as the interaction spine.

---

## 2. Information architecture (final grouping of all ~18 destinations)

Four **verb-led** zones teach the entire map in four words. Positions are FIXED and
never reflow between breakpoints or sessions (age-durable spatial memory). Wayfinding
is by **tonal zone (colour), not shouty headers** — a hairline + a small
letter-spaced overline per lane.

**Above the board — THE STEWARD STRIP (guidance, not a zone):**
- Greeting line (hour-graded, real name)
- Museum-label datum (real counts: "· 3 wings · 12 rooms · 84 memories")
- **Suggested-Next card** (ONE state-aware recommendation — see §6)
- Steward's tray: 3 quick chips — Continue where you left off · Add a memory ·
  Capture by WhatsApp

**LANE A — STEP INSIDE** (warm cream, warmest + topmost + largest; FeatureDiscovery glyphs)
`revisit / go somewhere`
1. **Enter Palace** — wide anchor, contained hour-graded doorway accent (primary)
2. **Your Library** — wide shelf, live thumbnail fan (primary)
3. Memory Map
4. Timeline
5. Highlights / Insights
6. Family Tree
7. Explore Palaces
8. Shared With You

**LANE B — ADD A MEMORY** (parchment `#EFE6D4`, gold-tinted medallions; EnhanceMemories glyphs)
`capture / grow`
9. Add Photos (Upload)
10. Restore a Photo (AI Enhance)
11. Write a Memory
12. Record Your Story (Interviews)
13. Capture by WhatsApp (Kep)
14. Create a Gallery
15. Time Capsule
16. Tidy Your Rooms (Organize)

**LANE C — SHARE & CONNECT** (sage-tinted band — promoted to an honest THIRD zone,
not smuggled into ADD)
`with your family`
17. Start a Family Group
18. Family Tree (relational link) *(cross-links to A6)*
19. Share Publicly (Publish to Explore)
20. Invite Relatives

**YOU — utility row** (quiet ink-on-linen pill-tiles, visibly subordinate but with
real card-grade findability at 200% OS text scaling — never a hairline footer)
- Your Journeys (Tracks) · Milestones (Achievements) · Your Profile ·
  Plan Your Legacy · Settings · Help & Guides

> Primary weight: Enter Palace, Your Library (2× tiles). Secondary weight: everything
> else in A/B/C at 1× tiles. Tertiary: the entire YOU row as pills.

---

## 3. Layout spec

### Desktop (three zones on a linen `#F2EDE4` field over a cream `#FCFAF5` page, ~72rem max-width, T.space.md gutters)

**ZONE 1 — Steward strip (~14rem, full width):**
- Left two-thirds: gold PalaceLogo mark → Fraunces hour-graded greeting
  ("Good evening, Maria") → Source Sans museum-label datum. Directly beneath: the
  **Suggested-Next card** — a single wide terracotta→rustDeep tile (~2× a normal
  tile) with the recommended action's crafted glyph, a Fraunces verb, a one-line human
  reason, and one luminous gold arch affordance.
- Right third: slim vertical **Steward's tray** — exactly 3 quick chips.
- Optional atmosphere: a whisper-thin (~9rem) hour-graded rooftop-frieze of the
  palace behind the greeting, dissolving into the linen via a fading gradient mask —
  a soft edge, never a hard rectangle.

**ZONE 2 — Relay board (the complete menu):** three tonally-zoned lanes stacked
cream → parchment → sage, each separated by a hairline + a small overline that draws
a gold underline on arrival. Grid within a lane: `repeat(auto-fit, minmax(11rem, 1fr))`
with the two primary STEP-INSIDE tiles spanning 2 columns.

**ZONE 3 — YOU utility row (footer):** a single wrapped row of quiet pill-tiles.

### Mobile (single column)

- Sticky top gives the greeting weight. Steward strip collapses to greeting line +
  the ONE Suggested-Next card (full-width) + a horizontal 3-chip tray. The suggestion
  is the first thing a thumb reaches.
- Three lanes stack, each an overline + a 2-col grid. STEP INSIDE leads with **Enter
  Palace** and **Library** as full-width tiles.
- YOU row becomes a quiet wrapped chip cluster at the very bottom.
- Above-the-fold on a phone: greeting + Suggested-Next card + the top of LANE A
  (Enter Palace tile visible). Section order top→bottom = Steward → STEP INSIDE →
  ADD → SHARE → YOU, so the emotionally-safe "look at what's here" lane always leads.

---

## 4. Per-destination tile spec ("Living Tiles" — the menu IS the status)

Every tile is one **TuscanCard shell** (`variant="elevated"`, `T.radius.lg`, 1px
`#E3D6BC` hairline, soft downward shadow implying ONE top-clerestory light) with a
**fixed min-height so nothing reflows when data lands**.

**Anatomy (constant across all tiles — a 60+ user never hovers to understand):**
`crafted 24-32px stroke glyph in a tinted medallion · Fraunces title · one-line Source
Sans descriptor · ONE real live datum`.

Three content tiers share the one shell (grafted from the bento):
- **(A) THUMBNAIL** tiles bleed a real image/scene behind a linen→transparent scrim,
  label on the dark foot.
- **(B) COUNT** tiles pair the glyph with a large Fraunces numeral + a muted
  "+3 this week" delta.
- **(C) PROMPT** tiles carry a live editorial line with a 3px terracotta left-border.

**The live datum per tile (real, from existing stores; degrades gracefully):**

| Tile | Live datum | Source | Empty state |
|---|---|---|---|
| Enter Palace (anchor) | hour-graded doorway accent + "3 wings · 12 rooms · 84 memories" | ExteriorScene / counts in HomeView | graded static facade + "Step inside" |
| Your Library | fan of 3 newest thumbnails + true count | `recentMemories` / `memoryStore` | glyph-on-linen + "Begin your collection" |
| Memory Map | user's actual geocoded pins | `allMemories` geodata | glyph + "Pin your first place" |
| Timeline | real year-nodes on a gold ribbon | `allMemories` createdAt | glyph + "Add a dated memory" |
| Highlights/Insights | count + top stat | statistics store | glyph + "Insights appear as you add" |
| Family Tree | face-bezels + "23 people · 4 generations" | family tree store | glyph + "Start your tree" |
| Explore | public palace teaser | explore feed | glyph + "Discover palaces" |
| Shared With You | real owner avatars ("Maria + 2") | `getWingsSharedWithMe` | hidden if none, or "Nothing shared yet" |
| Capture by WhatsApp | green "Kep is standing by" dot + today's saved count | kep store | dot + "Save a memory by message" |
| Record Your Story | live prompt + "3 of 20 stories told" | `interviewStore` | glyph + "Tell your first story" |
| Add Photos / Restore / Write / Gallery / Time Capsule / Organize | glyph + descriptor | — | authored glyph tiles, never blank |

**Rules:**
- **Never a zero, never blank.** Empty tiles degrade to the enlarged glyph on linen
  with a warm "Begin here" line, so a brand-new palace still reads as an authored,
  tended hub — critical for the bereaved first-time user.
- Persistent **icon + label is the non-negotiable baseline**; the live datum is the
  reward for looking, not a requirement for comprehension.
- The Suggested-Next card is the one elevated, warmest tile and the only one carrying
  the gold arch + reason line.
- YOU tiles drop the datum and shrink to quiet pills.
- Whole tile is the hit target (`role="button"`, ≥44pt, Enter/Space wired).

---

## 5. Palace accent (atmosphere, never the cheap reused reel)

The 3D palace appears in exactly ONE place: a **contained "doorway" accent inside the
Enter Palace anchor tile**.

- Reuse the **already-persistently-mounted** `ExteriorScene` (body-level portal),
  clipped/scissored to the arch rect — **no second WebGL context**.
- **Re-grade to the user's REAL local hour** via the existing `hourGrade` system:
  terracotta noon, golden dusk, indigo night with lit gold windows. This is the one
  dynamic thing a marketing loop can never fake — "this is THEIRS, right now."
- A soft **top-vignette / bottom-fading gradient mask** dissolves the render into the
  linen so it reads as a lit doorway in a wall — no hard video rectangle (the exact
  tell that made the reel read cheap, inverted).
- **Idle holds still** (no continuous render loop). On hover/focus the arch brightens
  and the facade eases a hair closer, foreshadowing the match-cut on entry.
- **Ship the static graded facade poster as the PRIMARY state** (also covers
  `hasVisitedPalace === false`, reduced-motion, mobile/integrated GPU, Save-Data). The
  live clipped orbit is a **progressive enhancement** added only after a spike proves
  the scissor pass tracks the card rect without per-frame `getBoundingClientRect` jank.
  The wow must never be a dependency.
- Optional atmosphere: the ~9rem hour-graded rooftop frieze behind the steward
  greeting, dissolving edge only.

---

## 6. The Suggested-Next concierge card (the differentiator)

A cheap, reliable **palace-state read** buckets the user and proposes the single most
useful next act, always degrading to a safe default. Recommends but never blocks — the
full board stays right there.

| Bucket | Signal | Suggestion | Reason line |
|---|---|---|---|
| **empty** | `totalMemories === 0` | Bring in your first photos | "The fastest way to fill your palace" |
| **seedling** | `0 < totalMemories < ~15` | Add a memory to [room] / Record your story | "A few more and your palace comes alive" |
| **shared-into** | `getWingsSharedWithMe().length > 0` and unseen | Maria shared a wing with you | "See what your family added" |
| **established** | `lastVisitedRoom` present | Step back into the Kitchen | "Pick up where you left off" |
| **default** | anything | Step into your palace | "Walk through your rooms in 3D" |

- Announced via an **`aria-live` region** in plain language for screen-reader / low-
  vision parity ("Suggested: Bring in your first photos. The fastest way to fill your
  palace.").
- Precedence: shared-into > empty > seedling > established > default (relational
  surprise first, then onboarding, then continuity).

---

## 7. Motion plan (dynamism calibrated for 60+, all transform/opacity/filter, all reduced-motion gated)

The hub **breathes; it never pulses in unison** (that read cheap before). One focal
point of life, de-synchronised everything else.

1. **Grouped staggered arrival** (once per session via `sessionStorage` flag):
   steward greeting fades first → Suggested-Next card lifts in → each lane assembles
   with a **55ms capped stagger** (T.motion.reveal / T.motion.ease) and its overline
   draws a gold underline left-to-right. Capped ~900ms total, then the hub is instantly
   still and usable on return.
2. **The steward breathes:** exactly ONE locus of gentle life — the Suggested-Next
   card's gold arch runs a slow ~6s sheen sweep ("this is the way in"). Nothing else
   pulses in sympathy.
3. **Content arrival, not decoration:** real counts count-up once (existing
   `AnimatedNumber`), thumbnail fans cross-fade on `img.onload`, the Kep presence dot
   breathes on a slow 4s ease. The datum being true and freshly-loaded IS the dynamism.
   A global governor keeps at most 1-2 concurrent loops.
4. **Single shared gold FLIP-glide focus ring** (the crown jewel): ONE luminous thread
   glides tile-to-tile (~240ms, T.motion.ease), driven **identically by keyboard / tap
   / TV-remote / screen-reader** via roving-tabindex. On focus a single tile lifts
   ~4px with a warm terracotta glow, its glyph strokes charcoal→gold, its one-line
   descriptor reveals, and `aria-live` narrates ("Enter Palace. Walk through your rooms
   in 3D. Item 1 of 8 in Step Inside"). This ONE mechanism collapses navigation,
   accessibility and delight together — and it extends to **all** ~18 destinations
   plus the YOU row (no peek-rails, no sub-threshold text strips).
5. **Anchor Ignite → ModeTransition:** on pointer-down the chosen tile hands its seed
   invisibly into the existing `useModeTransition` (`startTransition("3d" | "library",
   cb)`), so menu and destination are one continuous match-cut — no black-frame jump.

**Reduced-motion:** everything renders settled, counts show final values, the arch is
a static gold glow, the focus ring is a plain 2px gold ring, the palace accent is a
static graded facade. Dignified and fully legible — nothing lost.

---

## 8. Graphics rules

- **Type:** `T.font.display` = Fraunces for greetings, tile titles, museum-label
  datum lines; `T.font.body` = Source Sans 3 for descriptors and data. No Caveat.
- **Icons:** exclusively the crafted 24-32px stroke SVG system — FeatureDiscovery
  glyphs (MapIcon/TimelineIcon/InsightsIcon/FamilyTreeIcon/KepIcon/ExploreIcon) for
  STEP INSIDE; EnhanceMemories glyphs (IconUpload/IconAIEnhance/IconWrite/IconOrganize/
  IconGallery/IconFamilyGroup/IconTimeCapsule/IconWhatsApp/IconPublishExplore) for ADD;
  WingRoomIcons / TrackIcons where relevant. **Zero emoji, zero clip-art.**
- **Colour does the wayfinding** via tonal zoning: STEP INSIDE on cream, ADD on
  parchment `#EFE6D4` with gold-tinted medallions, SHARE on a sage band, YOU on quiet
  linen. Gold `#D4AF37` is **graphic-only on light** (arch sheen, drawn underlines,
  focus ring, hairlines, medallion foil-stamp) and is the ONE hero accent on the
  Suggested-Next card; on dark tile feet it may carry text where contrast holds
  (≥4.5:1). `rustDeep #9A4F2A` carries accent text on light. Terracotta/rustDeep carry
  primary CTA warmth. Charcoal `#1F1B1A` is ink.
- **Depth & light:** ONE implied top-clerestory source — soft downward shadows
  (`0 0.25rem 1rem rgba(0,0,0,0.10)`), never flipped on hover; a single warm glow
  follows focus; medallion wells catch gold like foil-stamp on a book spine. Cards
  read as carved travertine plaques.
- **Cards:** every surface is a TuscanCard-grade object (T.radius.lg, warm shadow,
  hairline border). Inline styles, rem units, 5 locales throughout.
- **Legibility gate (mandatory):** verify at 200% OS text scaling and under reduced
  colour-discrimination; every tile keeps its always-visible label + glyph.

---

## 9. How the 12 legacy widgets map into the relay

| # | Legacy widget (HomeView) | Fate in the relay |
|---|---|---|
| 1 | AtriumHero | Becomes the **Steward strip** (greeting + datum) — no longer a marketing-style hero button pair |
| 2 | Continue-where-you-left-off card | Becomes a **Steward tray chip** + the `established` Suggested-Next state |
| 3 | FeatureDiscovery (Map/Timeline/Insights/Family/Kep/Explore) | Split into **LANE A STEP INSIDE** tiles; icons reused verbatim |
| 4 | PersonaSelector | **Removed from the relay** (no persona fork). Persona still informs track ordering silently; move selection into Settings/onboarding |
| 5 | TrackProgress (Your Journey) | Demoted to **YOU · Your Journeys** pill; progress viewable in the Tracks panel |
| 6 | InterviewPrompt | Becomes **LANE B · Record Your Story** tile with live "3 of 20 stories told" datum |
| 7 | EnhanceMemories (Upload/AI/Write/Organize/Gallery/FamilyGroup/TimeCapsule/WhatsApp/Publish + Blog/Help/Contribute) | Split: capture verbs → **LANE B**; FamilyGroup/Publish → **LANE C**; Blog/Help → **YOU**; Contribute link retired from the hub |
| 8 | PersonalProfile | Demoted to **YOU · Your Profile** pill (full profile in its panel) |
| 9 | RecentMemories | Folded into the **Library tile's** live thumbnail fan (menu IS the status) — no separate widget wall |
| 10 | AchievementShowcase | Demoted to **YOU · Milestones** pill (+ confetti on unlock preserved) |
| 11 | OnThisDayCard | Becomes an optional **seasonal Suggested-Next** variant / a PROMPT datum on the Timeline tile |
| 12 | SharedRoomsPreview | Becomes **LANE A · Shared With You** tile with real owner avatars + the `shared-into` Suggested-Next state |
| — | Your Legacy (accordion) | Becomes **YOU · Plan Your Legacy** pill routing to `/settings/legacy` |

Net effect: the rejected 12-widget wall is **folded INTO the navigation** — every
widget's data reappears as a live datum on the tile it belongs to, so there is no
separate dashboard.

---

## 10. Ordered, shippable build phases

**Phase 1 — Relay board skeleton (ship first, no data dependency).**
New `HomeView` shell: linen field, three tonally-zoned lanes + YOU row, all ~18 tiles
as static TuscanCard Living-Tile shells (glyph + Fraunces title + descriptor, fixed
min-heights), all wired to the existing HomeView handlers. Steward strip with static
greeting + counts. Reduced-motion-safe. This alone replaces the 12-widget stack and is
shippable.

**Phase 2 — The steward brain (Suggested-Next + tray).**
Palace-state bucket read (empty/seedling/shared-into/established/default), the wide
Suggested-Next card with reason line + gold arch, the 3-chip tray, hour-graded greeting
via `hourGrade`, and the `aria-live` announcement.

**Phase 3 — Living data (the menu IS the status).**
Wire the real live datum per tile: Library thumbnail fan, Family Tree face-bezels +
count, Memory Map pins, Timeline year-nodes, Shared owner avatars, Kep presence dot +
today's count, Interviews prompt + progress. Enforce the "never a zero, warm Begin
here" empty states. Count-up-once + cross-fade-on-load motion.

**Phase 4 — The interaction spine (single gliding gold focus ring).**
Roving-tabindex across all 18 tiles + YOU row, one FLIP-glide gold ring, focus lift +
glyph ignition + descriptor reveal, `aria-live` item narration, Anchor-Ignite handing
into `useModeTransition`. Grouped once-per-session staggered arrival + lane overline
underline draw + the single 6s arch sheen.

**Phase 5 — Palace atmosphere (progressive enhancement, last).**
Ship the Enter Palace tile's **static hour-graded facade poster** first. Spike the
scissored `ExteriorScene` pass into the card rect; only if it tracks without jank,
enable the live idle-still / hover-eases-closer doorway accent + optional rooftop
frieze behind the greeting. Everything gated by prefers-reduced-motion / Save-Data /
GPU tier. The wow is never a dependency.

---

## 11. Risks & mitigations

- **Live-3D-in-a-tile scissor pass** is the one engineering bet the codebase guards
  against — de-risked by shipping the static graded facade as primary and treating the
  live pass as Phase-5 progressive enhancement behind a spike.
- **18 tiles = cognitive load for 60+** — mitigated by fixed never-reshuffle positions,
  tonal zoning over shouty headers, the single Suggested-Next recommendation, and the
  200%-zoom legibility gate.
- **Motion reading "cheap"** — mitigated by the de-synced governor (max 1-2 loops),
  one focal breath (the arch), run-once entrance, and full reduced-motion stills.
- **Findability of demoted YOU items at OS text-scaling** — mitigated by giving YOU
  pills real card-grade presence in a clearly-labelled zone, not a hairline footer,
  and including them in the same gliding-focus model.
