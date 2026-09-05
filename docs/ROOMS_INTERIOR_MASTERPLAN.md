<!-- 199-agent review (wf_64a9b967-e79), 2026-08-16. Winner: The Enfilade â€” Rooms that Lengthen into a Colonnaded Gallery (81.6/100). Runner-up: L'Enfilade â€” The Room That Lengthens Into a Gallery. Findings: 490 (252 P0/P1). Owner directives: scalable rooms + remove Peristylium. -->
I now have full grounding. The `wallMems` derivation (dedup + W2 display filter) at L1266 is exactly what must be lifted early for the count. Here is the definitive masterplan.

---

# ROOMS / INTERIOR OVERHAUL â€” DEFINITIVE MASTERPLAN
## "The Enfilade" â€” Rooms that Lengthen into a Colonnaded Gallery

**Scene:** `src/components/3d/InteriorScene.tsx` (the ROOMS/interior scene). **Flag:** new `w3_interior` (staging-ON / prod-OFF), retired into `RETIRED_ON` only on owner "go", exactly like exterior/hall/corridor.
**Winning vision:** 81.6/100 â€” grow rooms by adding a proportioned **bay** along the depth axis (rL only), freeze rW/rH; delete the Peristylium (it was a second lighting regime, not a room) and let the largest tier BE the gallery under one canon sun.

---

## 1. THE SCALABLE-ROOMS ENGINE (the chosen mechanism)

### 1.1 Thesis
A room is a proportioned Roman hall, not a rubber box. Keep the hand-tuned **width `rW` and height `rH` sacred** (they carry the golden-hour proportions, rug, piano, window rhythm, wing accent). Grow **only the depth `rL`** in discrete, snapped **bay** tiers. Each new bay adds a real architectural module â€” a paired colonnade, a clerestory window admitting the canon SW golden shaft, a ceiling coffer module, and ~4 m more salon-hang wall. A photo-rich collection reads as a naturally longer museum wing.

### 1.2 The formula â€” `sizeForRoom(base, count)` (new, in `roomLayouts.ts`)
Pure, deterministic, zero assets, fully unit-testable.

```
BAY_DEPTH   = 4.0   // metres of rL per bay
MAX_BAYS    = 3     // iOS-safe ceiling (see Â§5)

tierFor(count):        // count = displayed WALL-memory count (see OG2)
  count <= 6   -> { tier:"Intimate",      bays:0 }
  count <= 16  -> { tier:"Hall",          bays:1 }
  count <= 32  -> { tier:"Gallery",       bays:2 }
  else         -> { tier:"Grand Enfilade", bays:3 }   // 33+

sizeForRoom(base, count):
  { tier, bays } = tierFor(count)
  bays = min(bays, MAX_BAYS)
  rL   = min(base.rL + bays * BAY_DEPTH, MAX_RL)   // MAX_RL from Â§5 budget
  return { ...base, rL, tier, bays }               // rW, rH UNTOUCHED
```

- `rW`, `rH`, and every `RoomLayout` style field are copied through unchanged â€” proportions, door/fireplace/window anchors, and the camera near-plane safety analysis at L155â€“162 all stay valid.
- Growth is **quantized** (snapped tiers), so it is stable across revisits, keeps the static-merge/geometry cache (`msKey`) clean, and bounds draw calls.

### 1.3 Why it's beautiful & within canon
- **Freezing rW/rH** protects the golden-hour proportions a free-scaling box would destroy. Snapping to bays gives a *true architectural reason* for growth â€” the enfilade, the way Roman villas actually extended.
- **The salon engine already lengthens for free.** `salonHang.ts` derives each run's width from `rL` and is cap-free (shrink-then-add-rows up to 3, overflow â†’ `layout.omitted`). A longer `rL` automatically widens the right-wall runs (L1508â€“1517), so previously-omitted pieces fill the new bays with **zero change to `salonHang.ts`** or any per-piece code.
- **`rWRef` propagates for free.** `rWRef.w/l` is set at L438 from `rW/rL` and feeds every camera clamp, collider bound (`aw.z` clamp at L277), door reserve, fog far, and shadow frustum (`shCam` at L198 uses `max(rW,rL)`). Lengthening `rL` keeps navigation, wall-follow, and the golden-hour shadow line correct with no downstream rewrites.
- **One sun, one grade, one eye-height.** No second lighting regime. Dust density, fog far, shadow frustum, and coffer/clerestory counts all derive from the same `rL`.

### 1.4 The grow transition (no resize under a walking user)
- **Persist the tier into the room record** (not re-derived live per-frame). A room never resizes out from under a walking visitor mid-session; revisits are deterministic (matches the deterministic salon-seed discipline).
- The scene already rebuilds on `displayFingerprint` (L103) with an 800 ms debounce (L92â€“101). A tier crossing rides that same rebuild â€” graceful, no dark-flash.
- On next entry after a tier change, show a subtle **"your room has grown"** beat (respect `prefersReducedMotion` â€” see L127/L133), so growth feels earned, not hidden.

### 1.5 Wiring the count in early (the one refactor)
`layoutForRoom` is called at **L134**, but `wallMems` (the displayed, deduped wall-memory list) is not built until **L1266** (dedup by id + W2 display filter). We must derive a lightweight **`displayedWallCount`** from `mems` (available at L81) *before* the layout picks:

- Extract the dedup + display-filter logic (currently inline at L1260â€“1274) into a tiny pure helper `displayedWallCount(mems)` reusing the same `displayed===true/undefined` rules.
- Extend the signature: `layoutForRoom(roomId, override?, count?)`. When `count` is omitted OR `w3_interior` is OFF, return today's fixed `rL` exactly (backward-compatible).
- Call: `const layout = layoutForRoom(actualRoomId||roomId, layoutOverride, W3 ? displayedWallCount(mems) : undefined)`.

---

## 2. REMOVING THE PERISTYLIUM (delete, don't relocate)

The Peristylium's only unique value â€” a grand 20-slot gallery with top-light â€” is now an **emergent property of the largest depth tier**. It is deleted because it was never a room; it was a second lighting/geometry regime. **Sequence removal AFTER the growth mechanism lands (Wave B), so gallery capacity exists before the courtyard disappears â€” no user loses their exhibition wall.**

The `isExhibition` conditional threads through **61 sites** in `InteriorScene.tsx` (confirmed by grep, not the "handful" the vision listed). All must be handled:

1. **`roomLayouts.ts`:** delete `ROOM_LAYOUTS[5]` (peristylium, L62â€“70). Drop `isExhibition` / `paintingSlots` from the `RoomLayout` interface (L21â€“23). `AUTO_LAYOUTS`' exclusion filter (L75) becomes moot â€” simplify to the 5 style variants.
2. **`InteriorScene.tsx`:** delete the entire `isExhibition` shell branch (courtyard shell L443â€“733, the exhibition painting grid, the exhibition light / second-sun overrides) and **every** `isExhibition?` ternary in fog (L185â€“189), hemi/sun/background (L194â€“204), camera far (L163), `SLOT_COUNTS`, and eye-height. Left standing: one canon sun, one grade, eye-height, the 58Â° camera, `far=60`.
3. **Migration (must run BEFORE the branch is deleted, tested on a real persisted peristylium room):** any room with `layoutOverride==='peristylium'` is remapped to a normal scalable variant (recommend `'salon'` â€” the deepest base `rL=13`). Its former 20 exhibition assignments become ordinary **wall memories**, so the count naturally lands the room in the Gallery / Grand-Enfilade tier. `layoutForRoom` already falls through safely on unknown overrides, but add an **explicit remap** so the assignments are not orphaned.
4. **Re-home the beauty indoors:** the open-sky top-light becomes the **per-bay clerestory band** (Â§3, Wave B) â€” each bay admits a warm golden shaft onto the coffers, giving the large room the Peristylium's luminous, colonnaded feel without a second regime.

**Staging A/B safety:** while `w3_interior` is OFF, the old peristylium layout still resolves so staging can A/B the two. The hard-delete + `RoomLayout`-interface change lands only when the flag retires (owner go).

---

## 3. WAVES A / B / C

### WAVE A â€” Sizing engine, count-wiring, budget guard, migration prep (code-only, no assets)
- **A1** â€” `sizeForRoom(base, count)` in `roomLayouts.ts`: pure function per Â§1.2. Returns `{ ...base, rL, tier, bays }`. Unit tests for all four tier boundaries + `MAX_RL` clamp.
- **A2** â€” Extend `layoutForRoom(roomId, override?, count?)`: hash-pick STYLE variant unchanged (rW/rH/rug/piano/window rhythm sacred), overwrite ONLY `rL` via `sizeForRoom`. `count` optional â†’ base `rL`. When `w3_interior` OFF, ignore count entirely.
- **A3** â€” Lift `displayedWallCount(mems)` helper out of the L1260â€“1274 logic; compute early (â‰ˆL81â€“134) and pass into `layoutForRoom` at L134. Confirm `rWRef.w/l` (L438) propagates the new `rL` to camera clamps, colliders, `aw.z` clamp, door reserve, fog far, shadow frustum.
- **A4** â€” Salon-hang scale check: verify `computeSalonHang` capacity (`perRowCap Ã— maxRows`, `salonHang.ts` L207â€“209) grows with the longer right-wall runs and that the four `salonRuns` (L1508â€“1517) lengthen correctly. **Tier-scale `texBudget`** (L1520) â€” see Â§5 headline risk.
- **A5** â€” `MAX_RL` clamp + dev-only budget assert: log estimated draws & tris per tier at build time (reuse the `process.env.NODE_ENV` debug pattern at L1561). Worst case (Grand Enfilade + full 3-row salon-hang) must stay â‰¤150 draws / â‰¤750k tris / â‰¤4 lights.
- **A6** â€” Migration script prep: identify rooms with `layoutOverride==='peristylium'`; write + test the remap (â†’ `'salon'`, exhibition assignments â†’ wall memories). **Do not run destructively yet** â€” gate behind OG3.

### WAVE B â€” The bay module + Peristylium removal (the hero, has assets/geometry)
- **B1 â€” `mkBay(zCenter)` generator (the hero):** one repeatable bay placed once per tier along the depth axis. Each bay = paired pilasters/columns (**one shared geometry via `InstancedMesh`** so N bays add ~O(1) draw calls, NOT NÃ—k meshes â€” the current peristylium builds ~4 non-instanced `CylinderGeometry` meshes *per column*; do NOT copy that), one entablature band, one coffer module, one clerestory window. Reuse the hall column-kit + corridor `makeArtwork` refinement patterns.
- **B2 â€” Clerestory window per bay:** one high window on the SW sun wall, aligned to the existing sun vector (`sun.position`, L196). Reuse the baked emissive-plane + floor-pool pattern (no new dynamic light â€” stays â‰¤4). Confirm `shCam` (L198, `max(rW,rL)/2+2`) grows with `rL` so the golden shadow line stays correct the full enfilade length. **Set `ren.shadowMap.needsUpdate=true` after the static-merge** (shadow map is baked once at mount â€” L166 has `autoUpdate=false`; a longer frustum without this = no raking shadows).
- **B3 â€” Coffer ceiling module tiling:** replace the single flat ceiling with per-bay coffered modules (instanced), driven off `rL` like the existing renaissance grid. Stays under the A5 budget.
- **B4 â€” Longer salon-hang wall run:** the lengthened right-wall runs already host more pieces; verify the far bays fill and that deterministic seeding (`salonSeed`, L1506) and per-run largest-remainder allocation (L1523â€“1527) stay intact. If a fixed-4-run layout strands the far bay, generate a per-bay run entry rather than the fixed four at L1508.
- **B5 â€” Colonnade-as-gallery terminus:** the far (back) wall of the Grand Enfilade becomes the lit focal "weenie" (hero memory / video screen), echoing the corridor NAVE language â€” this is what *replaces* the Peristylium's gallery identity.
- **B6 â€” Peristylium removal + migration run:** execute Â§2 (delete branch + all 61 `isExhibition` sites, run migration). Gated so flag-OFF still resolves the old layout for staging A/B until retirement.
- **B7 â€” Refinements the owner already approved (corridor W3C):** pass `refinedFrame:true, plaquePlate:true, rabbet:true, pictureLight:true` into `mountSalonHang` (L1542) and the hero `mountArtwork` (L1499). Set `tex.anisotropy` + mipmaps on salon/hero `CanvasTexture`s so grazing wall art reads sharp and sunlit, not flat gold-slab.

### WAVE C â€” Polish, dressing, framing (code-only tuning)
- **C1** â€” Tier-transition polish: graceful rebuild via `displayFingerprint` (no dark-flash, respect 800 ms debounce); the "hall has lengthened" beat only when reduced-motion is off.
- **C2** â€” Golden-hour proportion tuning per tier: verify fog near/far (L188â€“189), exposure, and the SW shaft land canon at each `rL`. **Owner grade session across all 4 tiers.** ONE tone-map/grade preserved.
- **C3** â€” Bay-rhythm dressing: extend `plantCorners` logic, sconces, and rug-runner tiling to the new depth so a long hall never reads as empty middle. Wing-accent color continues down the enfilade. Re-anchor seating vignettes to bay centres.
- **C4** â€” Easel placement (L1566): reposition the cream empty-state easel sensibly in the Intimate tier; ensure it is never stranded at the far end of a long hall.
- **C5** â€” Minimap/camera intro framing + autowalk path lengthened to walk the enfilade (corridor lesson: autowalk mis-aimed behind a wall â€” verify `startAutoWalk` clamps at L276â€“278 target the far bays, not a wall).

---

## 4. OWNER-GATES (must be signed off before the gated work proceeds)

- **OG1 â€” TIER THRESHOLDS & BAY DEPTH:** confirm count breakpoints (**6 / 16 / 32 / 33+**), per-bay depth (**~4 m**), and `MAX_RL` / `MAX_BAYS=3`. These set how fast rooms grow and the iOS ceiling.
- **OG2 â€” COUNT SEMANTICS:** is size driven by **DISPLAYED wall-memories only** (`wallMems` rules) or ALL memories in the room? Winning vision = displayed wall-memory count. Affects whether toggling a memory's display resizes the room. **Needs explicit sign-off** (recommend: displayed wall-memories only, for a truthful "these are what's on my walls" mental model).
- **OG3 â€” PERISTYLIUM RETIREMENT:** confirm hard-delete of the peristylium layout + shell branch + the migration of existing `layoutOverride==='peristylium'` rooms (â†’ salon / Grand Enfilade). **Irreversible for those rooms** â€” migration must be tested on a real persisted room first.
- **OG4 â€” REFINEMENTS ON:** confirm turning on the corridor-approved `refinedFrame / plaquePlate / rabbet / pictureLight` for interior salon + hero art (B7).
- **OG5 â€” GROW AFFORDANCE:** confirm the "your room has grown" next-entry beat (copy + reduced-motion behaviour).
- **OG6 â€” FLAG RETIREMENT:** on owner "go", retire `w1_interior`, `w2_interior`, `w3_interior` into `RETIRED_ON` (`flags3d.ts` L23) and make the code paths unconditional â€” per the established hall/corridor/exterior exit ritual.

---

## 5. CANON BUDGETS (hard ceilings â€” the enforcement is a Wave-A deliverable)

- **â‰¤ 150 draw calls.** Bays add geometry via **`InstancedMesh`** (columns, coffers) so N bays are ~O(1) draws. Static-merge + `msKey` cache stay clean because tiers are quantized. A5 asserts the worst-case count at build time.
- **â‰¤ 750k tris (iOS).** `MAX_BAYS=3` and `MAX_RL` are derived so Grand Enfilade + full 3-row salon-hang stays under. A5 logs estimated tris per tier.
- **â‰¤ 4 dynamic lights.** Unchanged: hemi + sun + fire (den runs exactly these per the L201 light-budget law). Clerestory windows use **baked emissive planes + floor pools**, NOT new `DirectionalLight`s. The exhibition's extra fill light dies with the Peristylium.
- **ONE tone-map / grade.** Grade stays in the shared `EffectPass` (NeutralToneMapping @ canon `EXPOSURE`, L166); the deleted exhibition second-sun/background override collapses into the single canon sun.
- **â˜… HEADLINE RISK â€” live photo textures vs `texBudget`.** The plan budgets draws & tris but a bigger room does NOT get unlimited photos: `texBudget` (L1520) is a live-`CanvasTexture` GPU ceiling (~24 on mobile). **Tier-scale `texBudget` with the tier** (Intimateâ†’Grand Enfilade) *within* the mobile cap, and when a tier's wall still overflows, surface an **honest "and N more in the archive" plaque** (reuse `salonHang.omitted` / `omittedCount` at L1528/L1541) instead of the current silent `console.debug` drop at L1561. This is the single most likely way the largest tier over-commits GPU memory â€” it must be an explicit A4/A5 deliverable, not an afterthought.

---

## 6. PER-WING IDENTITY (preserved & extended)

- The hash-picked STYLE variant (den/study/parlour/salon/nook) remains the **style seed**: `rW`, `rH`, rug, piano, reading chair, globe, window rhythm, plant corners, sconces â€” all untouched by growth. A user's room keeps its character at every tier.
- **Wing accent color continues down the enfilade** (C3): the 6 wings (roots/nest/craft/travel/passions/attic â€” `src/lib/constants/wings.ts`) keep their accent on the new bays' pilaster capitals / entablature band / rug-runner, so a lengthened Craft room still reads as Craft, a lengthened Roots room as Roots.
- Because only `rL` changes, two rooms of the same wing with different memory counts share identity but differ in grandeur â€” the collection's size is legible as architecture, per wing.

---

## 7. SEQUENCING & RISK SUMMARY

1. **Wave A** lands the pure engine + count-wiring + budget guard + migration prep behind `w3_interior` (OFF in prod). Zero visual risk (flag-off = today's fixed rL exactly).
2. **Wave B** builds the bays, re-homes the top-light as clerestory, then removes the Peristylium â€” **capacity exists before the courtyard dies** (no user loses their wall). Migration runs here, tested on a real room (OG3).
3. **Wave C** dresses and tunes; owner grade session across 4 tiers (C2).
4. **Retire** w1/w2/w3_interior on owner go (OG6).

**Top risks & mitigations:** (a) live-texture budget vs growth â€” Â§5 headline, tier-scale `texBudget` + honest overflow plaque; (b) bowling-alley feel â€” museum-comfort cap (â‰¤~2 s walk to any wall), per-bay filler & re-anchored seating (C3); (c) baked shadow not refreshed â€” `ren.shadowMap.needsUpdate=true` after static-merge (B2); (d) migration orphaning â€” run BEFORE branch delete, test on real persisted room (A6/B6); (e) narrow aspect at top tier â€” optional single snapped `rW` nudge only if playtests demand (OG1 fallback); (f) resize-under-walker â€” persisted tier + next-entry grow affordance (OG5).
