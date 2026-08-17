<!-- 93-agent review (wf_ccb654fd-244), 2026-08-17. Winner: The Deepening Cabinet (84/100). Owner: growth=display space (paintings/video), stay a room not a hall, library fixed, STRIP the colonnade. REPLACES the rejected colonnade/furnished-bay build. -->

I have all the concrete anchors I need. Writing the definitive masterplan now.

# ROOMS DISPLAY-SPACE OVERHAUL â€” "The Deepening Cabinet"
## Definitive Masterplan (w3_interior) â€” REPLACES the rejected colonnade / furnished-bay execution

**Status:** DRAFT FOR BUILD Â· staging-first Â· prod-OFF until owner "go"
**Owner verdict being answered (2026-08-17):** *"It feels like a ZAAL (a hall/salon), NOT a room. The furniture journey is wrong."*
**Winning concept:** The Deepening Cabinet (84.0/100)
**Scene:** `src/components/3d/InteriorScene.tsx` Â· **Engine:** `src/lib/3d/roomLayouts.ts`, `src/lib/3d/salonHang.ts`
**Flags:** `w1_interior` / `w2_interior` (live staging) + **`w3_interior`** gates every change below. Intimate rooms (`bays===0`) stay byte-identical on the flag-off path.

---

## 0. THESIS â€” what the room becomes

A memory room should grow like a lifelong collector's private study. As your pictures multiply, the room **deepens modestly** and the **new linear wall becomes one continuous, eye-level SALON HANG of your own paintings**, plus one or two framed *"moving portraits"* (video) hung inline among the stills.

- **Nothing new is ever added to the FLOOR.** Furniture stays clustered ONCE at the hearth end.
- The deep end is calm, bare, walkable floor whose **WALLS carry the media**.
- The colonnade and per-bay vignettes are **stripped entirely** â€” they were architecture *plus* a furniture-journey that turned the room into a ZAAL.
- What replaces them is the **ABSENCE of a structure**: one undivided volume, close walls, warm hearth light at your back, memories getting denser and brighter as you walk deeper in.

**The room feels MORE inhabited by a life the bigger it gets â€” never more like a museum.**

The core bug we are inverting: today growth is driven by photo **COUNT** while display is capped by **texBudget**, so extra length becomes **furniture, not media**. We re-point the display engine that already exists (`salonHang` + `rL` growth) so the added wall run **HOSTS** the added photos.

---

## 1. THE MECHANISM â€” how growth adds DISPLAY SPACE (formulas + thresholds)

### 1.1 Keep the growth engine, clamp the proportion
`sizeForRoom` / `tierForCount` (`roomLayouts.ts:43-56`) stay as the engine. Two changes:

**(a) Clamp the aspect so depth can never become a corridor.** Today `sizeForRoom` does a pure single-axis stretch: `rL = min(base.rL + b*BAY_DEPTH, MAX_RL)` (`roomLayouts.ts:54`). Replace with a proportion-clamped grow:

```
rL = min(base.rL + b*BAY_DEPTH, base.rW * 1.6, MAX_RL_forRoom)
```

- `rW`/`rH` stay **frozen** (intimacy is carried by width + height â€” never scale them up with size).
- Add a **dev assert `rL/rW <= 1.8`** in `sizeForRoom` so a future tweak can't reopen the corridor.
- Make **`MAX_RL` a function of `rW`** (e.g. `rW*1.6`, ~19m for a 12-wide Salon) rather than the flat `26`. `MAX_BAYS` stays `3`.

**Felt-length guard:** prefer **denser salon rows** (the built shrink-then-add-rows, up to 3 â€” `salonHang.ts:220-231`) over ever-more depth, and pull **fog NEARER** (see Â§2.3) so the far end softens into golden haze â€” the *felt* room stays ~12â€“14m even when geometry runs longer.

**(b) Tie tiers to texBudget as the single source of truth.** Keep the owner thresholds `6 / 16 / 32` (`tierForCount`, `roomLayouts.ts:43-48`) but treat the top tier's target as **the honest ceiling texBudget can fill**, not a springboard to unlimited depth. `texBudget` is `11/23/31` (potato/mobile/desktop) at `InteriorScene.tsx:1650`. On mobile the honest ceiling is **~23 salon + 1 hero â‰ˆ 24 live CanvasTextures**. Add a comment in `tierForCount` naming texBudget as the source of truth. **Do NOT let a room imply more display than texBudget can fill â€” an empty-looking Grand room is worse than a full Hall.**

### 1.2 Make salonHang LENGTH-AWARE â€” added depth becomes hanging WALL
Today the four salon runs (`InteriorScene.tsx:1638-1647`) are: two on the FRONT short wall flanking the door (`width=rW/2-â€¦`, **frozen**), two on the RIGHT long wall **bisected by the cinema screen**. The LEFT long wall is 100% bookshelf; the back wall is fireplace/hero/windows. Net: as `rL` grows only the right-wall runs lengthen, and they are split by one fixed screen.

Re-point the same `computeSalonHang` loop (same deterministic seed `salonSeed^(ri*0x9e3779b9)`, `InteriorScene.tsx:1670`) across **length-aware runs**:

1. **+x (right) long wall** â€” ONE continuous salon run once the cinema is moved off it (Â§1.3), `width = rL - 2*cornerIn`, tracks grown `rL`.
2. **âˆ’x (left) long wall** â€” a salon band **ABOVE the fixed bookshelf's top rail** (`yBase` raised to ~2.4m), continuing as bare wall **past the bookshelf's fixed end** into the grown depth; `width = rL - BOOKSHELF_LEN reserve`.
3. **Back-wall flanks** â€” reclaim the existing wainscot flanks around the fireplace/windows (`InteriorScene.tsx:769-770`, the wainscot/gold runs that currently sit blank) for salon media â€” **roughly doubles usable run**.
4. **Front short wall** â€” the two existing door-flanking runs, unchanged.

**Result:** every extra 4m of depth (`BAY_DEPTH`) = **~8m of new picture wall across two sides.**

### 1.3 Move the cinema off the growing wall
The cinema screen currently sits on the right wall at `scrX=rW/2-.2, scrZ=0` (`InteriorScene.tsx:1813, 1839, 1851-1853`), bisecting the only wall that grows. **Move it to a fixed niche** (back-wall flank or a short return) so the right long wall becomes ONE uninterrupted salon run that lengthens cleanly. Keep exactly one live `VideoTexture` (Â§4). **âš ï¸ OWNER-GATE â€” changes the room's focal geometry.**

### 1.4 Hang everything, stream the nearest ~24 (distance-LRU pool)
Decouple *"how much wall exists"* from *"how many live textures."* Hang **all** pieces the walls physically allow up to `layout.omitted`; stream live textures only for the **~24 nearest/visible** via a distance-driven LRU pool; show a **cheap unlit framed placeholder** for the rest. Walking the deep wall resolves placeholders into real pictures â€” `rL` growth genuinely converts to more *visible* art without breaking the mobile CanvasTexture cap.

- ONE explicit, enforced ceiling (`texBudget`, ~24 mobile) shared across ALL runs, allocated **proportional-by-width** exactly as `InteriorScene.tsx:1652-1657` does today.
- **Dev assert:** total mounted-**live** pieces `<= texBudget` after adding the long-wall runs.
- âš ï¸ **This LRU streaming is the single most novel piece â€” see Risk R1.** Gate behind `w3_interior`; verify with PerfHud before raising any target. If mis-tuned it pops/thrashes on iOS.

---

## 2. HOW IT STAYS A COSY ROOM, NOT A HALL (explicit guardrails)

Five guardrails, each concrete:

**(a) One undivided volume.** No colonnade, no bay dividers, no per-bay coffered/clerestory. ONE continuous ceiling treatment so the ceiling stops chanting *"bay, bay, bay."* (Strips `InteriorScene.tsx:801-820`.)

**(b) One living heart.** ALL core furniture â€” fireplace + hero painting, one reading chair, one rug, album table, vitrine, bookshelf â€” stays clustered ONCE at the hearth/entrance end. **The grown depth carries ZERO new furniture.**

**(c) One lighting mood.** A single warm floor pool + hearth key light at the near end (**brightest = home; memories = the brightest pixels**); the deep end dimmer so you are drawn toward the lit pictures via the existing per-frame picture-lights (`pictureLight:W3`, `InteriorScene.tsx:1678`) â€” **NOT architectural shafts. No new dynamic lights.** Re-use `getGlowCardMat` as ONE pool, not per-bay.

**(d) Cap the aspect + near fog.** `rL/rW <= ~1.6`, never past ~1.8 (Â§1.1). Prefer denser rows over depth. Pull fog nearer so the felt room stays ~12â€“14m.

**(e) Domestic salon hang.** Varied sizes, plaques, warm picture-lights via the corridor-approved refined frame (`refinedFrame/plaquePlate/rabbet/pictureLight:W3`, `InteriorScene.tsx:1678`) â€” a collector's wall, **never a single-line museum rail.**

### 2.1 Re-anchor the hearth as the room deepens (CRITIC GAP â€” must not skip)
The plan grows `rL` but the hearth, fixed-depth furniture, and the spawn/entry point are placed relative to `-rL/2` / `+rL/2` today (e.g. fireplace `fpZ=-rL/2+.3`, cinema `scrZ=0`, easel at `-rL/2+1.2` `InteriorScene.tsx:1702`). **Wave A must audit every `Â±rL/2`-derived furniture/spawn/camera anchor and re-home the living cluster to a FIXED z window at the hearth end**, so growth extends the room *away* from the heart rather than pushing the hearth further back or leaving furniture stranded mid-floor. Without this, a Grand room reads as "furniture floating in a long empty box." (See Risk R7.)

---

## 3. THE LIBRARY STAYS FIXED (owner constraint #3)

Freeze the bookshelf to a constant run anchored at a **fixed z** near the hearth/entrance end of the âˆ’x wall, regardless of grown `rL`.

- Introduce **`BOOKSHELF_LEN` const (~3.5â€“4m)**. Replace **every** `rL`-derived dimension in the block:
  - shelf boards `rL-2` / `rL-1.9` (`InteriorScene.tsx:1757-1758`)
  - book-packing loop end `shelfEnd = rL/2-1.2` and `bz=-rL/2+1.2` (`:1759`)
  - frame verticals/rails `rL-.1`, `rL-.05`, `rL-.08` (`:1790-1795`)
  - doc-spine spread `bz=-rL/2+1.5+i*((rL-3)/5)` (`:1797`)
  - hit-area `rL-2` (`:1802`)
- **Distribute the 5 clickable doc-memory spines within the fixed window:** `bz = shelfStart + i*(BOOKSHELF_LEN/5)` so library memories stay grouped and tappable, never drifting into the extension.
- **Batch books + gold bands into `InstancedMesh`** (per-instance color via `instanceColor`) â†’ the whole bookcase to **~5â€“10 draws** and truly O(1) across all tiers (today it is an un-instanced `while`-loop that explodes draw calls as depth grows â€” see Risk R4).
- The left-wall length **PAST** the fixed unit **and** the band **ABOVE** its top rail (~2.4mâ†’ceiling) become salon-hang picture space (Â§1.2 run #2).
- **Add an explicit invariant comment** tying this block to **owner constraint #3** so no future tier logic re-scales the library.

---

## 4. VIDEO â€” modest, wall-hung, decode-safe

**Reject the "video wall / home-cinema" framing** â€” it recreates the ZAAL.

- **KEEP** the single largest framed niche as the **hero video** (the relocated cinema, Â§1.3).
- In **Gallery/Grand tiers only, ADD 1â€“2 SMALLER framed "moving portraits"** â€” same walnut/brass frame vocabulary as the stills, sized like a large photo (~1.2â€“1.6m), hung **INLINE in the salon hang among the paintings** so they read as *"a photo that moves"* â€” intimate, not a screen array.
- **Hard-cap simultaneously-DECODING videos** at **1 mobile / 2 desktop** via a `videoDecodeBudget` constant next to `texBudget`. Only the niche nearest the camera holds a live `VideoTexture`; the rest show the poster/first-frame still (infra already draws it â€” `InteriorScene.tsx:1846-1856`) and promote to live on approach/tap via a single reusable handoff decoder.
- **Refactor** the hard-wired `videoMems[0]` block (`InteriorScene.tsx:1845-1867`, plus letterbox/play-affordance math further down) into **`makeVideoNiche(pos,size,mem,{live}) â†’ {mesh, handle?, dispose}`**. Store handles in an array; loop-dispose on unmount (each `dispose()` does the existing pause â†’ clear-src â†’ load decoder-release dance). âš ï¸ Preserve the click/hit routing + cleanup currently welded to `videoMems[0]` (Risk R3).

---

## 5. STRIP LIST â€” remove from the current w3 build (pure deletion, fewer draws)

Delete the **entire** `if(W3&&(layout.bays||0)>0){â€¦}` block, **`InteriorScene.tsx:777-862`**:

| Lines | What | Why strip |
|---|---|---|
| `781-791` | Colonnade `InstancedMesh` (shaft / base / cap) | A colonnade defines a PASSAGE, subdivides the room into an enfilade â€” the #1 "zaal" culprit |
| `793-796` | Per-portal entablature beams + gilt cornice | Hall vocabulary |
| `801-809` | Per-bay coffered ceiling modules | Basilica-nave ceiling â€” makes the ceiling chant "bay" |
| `810-819` | Clerestory glow strips + raking golden shafts | "Procession of lit rooms" â€” museum sequencing |
| `804-806` | Per-bay warm floor pools | Multiplied pools = "rooms you pass through" |
| `826-830` | `fabricMat / rugMat / shadeMat / potMat / leafMat` | Materials only the vignettes need |
| `831-844` | `readingNook()` builder | The furniture-journey the owner rejected |
| `845-854` | `galleryBench()` builder | Second seating group â€” forbidden |
| `855-861` | Per-bay placement loop | Generates the furnished bays |
| `771-776` | The "PROCESSION of cosy bays" comment block | Strip the enfilade framing outright |

**Also:**
- `roomLayouts.ts:24-40` â€” retire `bays` as a **furniture/colonnade signal**. Keep the numeric depth in `sizeForRoom`, but rename the concept in comments from *"Enfilade / bays / procession"* â†’ *"deeper room / added wall-run."* The `bays` field may remain as an informational tier marker but must have **zero geometry consumers** â€” grep to confirm nothing else reads `layout.bays` after the strip.
- **DO NOT** replace the stripped block with any mid-floor architecture. If any vertical rhythm is wanted, keep ONLY the flat wainscot pilasters that already exist on the wall plane (`InteriorScene.tsx:769`).

**Explicitly NOT stripped (separate legacy branch â€” leave intact):** the Peristylium / `isExhibition` exhibition path (`roomLayouts.ts:95-102`, `layoutForRoom` re-home at `:132`, and the `isExhibition` screen/painting branches in the scene). A W3 room pinned to the Peristylium already re-homes to a scalable Salon.

---

## 6. WAVES (A / B / C) â€” concrete steps against real files

### WAVE A â€” engine + strip (foundation; no visual media change yet)
1. **STRIP** `InteriorScene.tsx:777-862` in full (Â§5). Pure deletion â€” cheaper draws, removes the rejected objects.
2. `roomLayouts.ts sizeForRoom` (`:51-56`): replace the pure `rL` stretch with the proportion-clamped grow `rL = min(base.rL + b*BAY_DEPTH, base.rW*1.6, MAX_RL_forRoom)`; add dev assert `rL/rW<=1.8`. `rW/rH` stay frozen.
3. `roomLayouts.ts`: make `MAX_RL` a function of `rW` (`:38`); keep `MAX_BAYS=3`.
4. `roomLayouts.ts tierForCount` (`:43-48`): keep `6/16/32`; add comment tying thresholds to `texBudget` as single source of truth.
5. `roomLayouts.ts`: rename all "Enfilade/bays/procession" comment vocabulary (`:24-40`) â†’ "deeper room / added wall-run."
6. **Re-anchor the living cluster** (Â§2.1): audit every `Â±rL/2`-derived furniture/hearth/spawn/camera anchor; pin the hearth zone to a fixed z window at the entrance end. Keep the `?wallcount=N` preview override (`InteriorScene.tsx:164-166`) as the review lever.
7. Grep-confirm no remaining `layout.bays` geometry consumer.

### WAVE B â€” length-aware display + fixed library
1. **Length-aware salon runs** (`InteriorScene.tsx:1638-1647`): +x wall as ONE continuous run (`width=rL-2*cornerIn`); âˆ’x wall band above the fixed bookshelf (`yBaseâ‰ˆ2.4`, `width=rL-BOOKSHELF_LEN reserve`); back-wall flanks. Feed all into the same `computeSalonHang` loop + seed.
2. **Move the cinema** off the right wall to a fixed niche (`InteriorScene.tsx:1813, 1839, 1851-1853`) â€” keeps ONE live `VideoTexture`. âš ï¸ owner-gate.
3. **FREEZE the bookshelf** (Â§3): `BOOKSHELF_LEN` const swap across `:1755-1805`; distribute 5 doc-spines in the fixed window; `InstancedMesh` the books + gold bands; invariant comment (constraint #3). Give the reclaimed left-wall length + band-above to salon art.
4. **Single texBudget across ALL runs**, proportional-by-width (`:1652-1657`). Dev assert: mounted-live pieces `<= texBudget`.
5. **Distance-LRU texture pool** (Â§1.4): hang all up to `layout.omitted`, stream ~24 nearest, framed placeholders for the rest.

### WAVE C â€” polish, video moving-portraits, overflow honesty, perf
1. **Surface `omittedCount`** (`:1658/1671/1695`) as a soft signal â€” e.g. a small plaque *"and N more in the archive"* â€” instead of a silent `console.debug`. A Grand collection reads as "a lifetime of pictures," not a wall that quietly drops memories. **â†’ overflow-to-archive UX.**
2. **One continuous ceiling + ONE warm floor pool** at the hearth (`getGlowCardMat` reused once); one warm hearth key light so the deep end reads dimmer and pulls the eye to the lit pictures.
3. **Video moving-portraits** (Â§4): `makeVideoNiche(...)` refactor; 1â€“2 inline framed videos at Gallery/Grand; `videoDecodeBudget` 1 mobile / 2 desktop; poster-still fallback.
4. **PerfHud pass:** confirm **â‰¤150 draw calls** and **iOS â‰¤750k tris** with a Grand room fully mounted (instanced frozen bookshelf + N salon frames + placeholders). Only raise mobile `texBudget` past ~24 **after** PerfHud confirms headroom.

---

## 7. OWNER-GATES (require explicit approval before/at build)

1. **Cinema relocation** â€” moving the cinema screen off the right wall to a fixed niche changes the room's focal geometry. **Owner must approve.**
2. **Proportion clamp values** â€” final `rW*1.6` aspect cap and per-room `MAX_RL` must be tuned **by eye on staging** and confirmed (a room that reads hall-ish past ~1.8 is a fail).
3. **Video moving-portraits at Gallery/Grand** â€” confirm the inline "moving portrait" treatment (vs. hero-only) reads intimate, not as a screen array.
4. **Overflow-to-archive plaque copy** â€” the *"and N more in the archive"* wording + whether to surface it at all.
5. **Any `texBudget` raise past ~24 mobile** â€” only after PerfHud proof; owner sign-off before shipping a higher target.

---

## 8. CANON BUDGETS + TEXTURE/OVERFLOW CONTRACT (MUSEO VIVO)

- **Golden hour**; memories = the **brightest pixels** (via per-frame picture-lights, not architectural shafts).
- **â‰¤150 draw calls** â€” verify with the instanced frozen bookshelf + N salon frames mounted (PerfHud, Wave C).
- **iOS â‰¤750k tris.**
- **â‰¤4 dynamic lights** â€” hemi + sun + fill + fire (~4, at the ceiling). **Add ZERO new dynamic lights**; all pooled/hearth light is baked (glow cards / emissive) or the existing per-frame picture-lights.
- **ONE tone-map / grade.**
- **texBudget is the single enforced ceiling:** `11/23/31` (potato/mobile/desktop). Shared across old + new runs, allocated **proportional-by-width**. Live-texture count stays ~24 on mobile regardless of room size; growth changes **WHERE** budgeted photos hang (more spread, bigger, more breathing room), not how many decode.
- **Overflow â†’ archive, never silent:** hang all the walls physically allow up to `layout.omitted`; distance-LRU streams the nearest ~24 live with framed placeholders beyond; the remainder past physical capacity surfaces as the "N more in the archive" plaque (Â§ C1).
- **videoDecodeBudget:** 1 mobile / 2 desktop, enforced by the `makeVideoNiche` helper.
- Ships behind `w1/w2/w3_interior`, **staging-first, prod-OFF until owner "go"** (as exterior/hall/corridor shipped).

---

## 9. RISKS + MITIGATIONS

- **R1 â€” Physical wall capacity can bite before texBudget.** Audit `perRowCap*maxRows` (`salonHang.ts:207-209`) summed across the four+new runs so the grown walls can actually hold ~24 comfortable pieces. If not, the honest ceiling is *lower* than texBudget (be honest) or the added depth must open a NEW run (far-end wall) â€” don't pay texture cost only to overflow to `omitted`.
- **R2 â€” Distance-LRU streaming is the novel piece.** If mis-tuned it pops/thrashes on iOS. Gate behind `w3_interior`; verify with PerfHud that draws stay <150 and decoders â‰¤2 before raising any target.
- **R3 â€” Cinema relocation** needs re-routing its click/hit + cleanup currently welded to `videoMems[0]` (`:1854-1867`). The `makeVideoNiche` refactor must preserve the pause â†’ clear-src â†’ load decoder-release dance on unmount.
- **R4 â€” Freezing the bookshelf touches every `rL`-derived dimension** in its block (`:1755-1805`); missing one leaves a half-stretched shelf. Needs a careful sweep + the invariant comment. (The un-instanced book `while`-loop also explodes draws as depth grows today â€” the `InstancedMesh` + fixed length fixes both.)
- **R5 â€” Aspect creep.** Even one undivided long room reads hall-ish past ~1.8. Tier retune + near fog must be tuned by eye on staging; a Grand room that shows fewer live pieces than its size implies looks emptier than a full Hall â€” cap growth to what the walls can fill.
- **R6 â€” texBudget as single source of truth.** Keep ONE explicit enforced ceiling (~24 mobile) shared across old + new runs, proportional-by-width, with a dev assert that mounted-live â‰¤ budget after adding the long-wall runs.
- **R7 â€” Furniture/hearth/spawn anchoring** (Â§2.1). Every `Â±rL/2`-derived anchor must be re-homed to a fixed hearth window, or the grown room strands furniture mid-floor and pushes the hearth back â€” reads as an empty box, not a cosy deep room.

---

## 10. NET

Mostly **DELETION** rather than new mechanism â†’ low-risk, cheap on draw/tri budget. Growth adds **PAINTINGS + VIDEO on the walls** (constraint #1) by re-pointing the existing display engine, not new furniture. It stays a cosy **ROOM** (constraint #2) via one undivided volume, one living heart, one lighting mood, a clamped aspect, near fog. The **library is frozen** by a targeted constant swap + `InstancedMesh` (constraint #3). And it resolves the **colonnade/furnished-bay question** (constraint #4): strip both; keep only the salon-hang + `rL`-growth engine, the fixed bookshelf, and the single hearth cluster.

**KEEP:** `sizeForRoom` rL growth (clamped), `salonHang` + deterministic seed, tier thresholds, refined frames + picture-lights, the single hearth cluster, one fixed bookshelf, the Peristylium/`isExhibition` legacy branch.
**STRIP:** colonnade columns + entablature, per-bay coffered/clerestory/floor-pools/shafts, `readingNook` + `galleryBench` + their materials, the enfilade framing.
