# Room Media + Player Controls — Redesign Masterplan

> Surface: the buttons, panels and player controls a user taps to **manage MEDIA** and **control the PLAYER** inside a 3D room.
> Applies to the newly overhauled T-shape salon-hall interior. Reuses the Atrium + Library look & feel and functional grammar.
> Status: SPEC — not yet built. Staging-first, flag-gated. Grounded in the actual codebase (file/line refs inline).

---

## 1. Executive Summary + Winning Concept

**Winning concept: "The Steward's Ledger."**

A single room-scoped manager surface — a Maggiordomo *relay board* rendered in the existing `Sheet.tsx` primitive (right rail on desktop, 92dvh bottom sheet on mobile). It reuses the Atrium's tray/lane/overline vocabulary and the Library's card + action-band vocabulary, but organizes everything by the room's five physical **stations** (Portraits, Vitrine, Library, Gramophone, Screen) plus the mantel **Hero**. No tabs. No room-type picker. No "Room Library vs Room Gallery." One surface to manage; one paired, re-skinned surface to play.

The governing rule: **the room is the spatial navigator** (tap a station in 3D → deep-link to its lane), **the Sheet is the manager** (assign, hide, feature, import, write). We never rebuild a spatial editor in 2D — salon-hang is deterministic.

Two decisive simplifications drive everything:

1. **Every non-photo memory has exactly one legal station** (video→Screen, audio→Gramophone, text→Library, keepsake→Vitrine). Only *photos* need a station choice (Hang vs Vitrine). So the per-card control collapses from a polymorphic dropdown to **one explicit binary toggle** `[ Shown here · In the archive ]`, plus a photos-only picker chip.
2. **Explicit booleans always.** The toggle writes `displayed:true`/`displayed:false` — never leaves `undefined` — structurally killing the "showed one, the rest vanished" tri-state bug in `pickDisplayed`.

The redesign is subtractive at its core: it deletes the two-tab switcher, the whole Gallery furniture-slot grid, the room-type picker, and every `isExhibition` branch — while reconciling the count tables (Vitrine 3→12) and surfacing the previously-silent **archive** so a 200-memory collection is legible instead of truncated in silence.

---

## 2. Design Principles — how it reuses Atrium/Library look & feel

| Principle | Atrium/Library source | Room application |
|---|---|---|
| **One opaque surface, no glass** | Atrium/Library panels are opaque linen | `Sheet.tsx` with `background={T.color.linen}`. **Every** `backdropFilter`/`WebkitBackdropFilter` in `RoomMediaPanel.tsx` is removed (≥9 sites — see §9), not just the five originally listed. |
| **Recessed earth trays as lanes** | `AtriumRelay` `TRAY` hexes (`#F6EBE3` terracotta / `#FAF3E0` gold / `#EFF2E8` sage), `0.1875rem` accent left-rule, inset shadow, `Overline` (`RT.overline` 700/.12em/uppercase) | Each station is one tray lane. **Only the 3 defined tray hexes are used** — see §11 palette (Library is NOT gold). |
| **Terracotta action pills + ink+gold Import keystone** | `LibraryView` action band; `AtriumRelay` anchor | Top action band: Import keystone first, then Write, Select. |
| **Suggestion card** | `AtriumRelay` `relay-suggest` (gilt→ember dashed left-rule, one-shot sheen, arrow chip) | One derived invitation card — the replacement for both the deleted room-type picker and the Gallery tab. |
| **Dark-gilt anchor keystone** | `AtriumRelay` `ACCENT.anchor` | The now-playing transport card. |
| **Cards** | `LibraryMemoryCard` | Reused, plus one **new additive `stationVariant` prop** (§5/§11 — explicitly net-new, not free inheritance). |
| **3-zone auto-save detail** | `MemoryDetail` | Card body tap → detail/player. |
| **Single greeting voice** | Atrium's one warm concierge line; "terracotta display type reserved for the greeting; titles are ink" | Steward strip = ONE Fraunces line (see §3 double-title resolution). All other display text is **ink `#403B36`**; terracotta/EMBER confined to interactive chrome. |
| **Tokens only** | `T` / `libraryTokens` | `INK #403B36`, `MUTED #716A5E`, `EMBER #B85C38` (interactive/active/CTA), `GOLD #D4AF37` (ceremonial: hero seal + focus ring + Import keystone dot ONLY), `LEDGER_OCHRE #8A6410` (gold *text* on cream). Fraunces display / Source Sans 3 body. |
| **One motion primitive** | `warmth.ts` 4s breath | Only the suggested tile + the playing-station glyph + the AV-pill playing-dot animate; all `prefers-reduced-motion` gated. |
| **Lane rhythm preserved at one column** | Atrium hero+compact per lane | Rail is 30rem → single column always (Atrium's `minmax(11rem,1fr)` collapses). We keep the **hero/compact rhythm within the column**: first tile full-width hero treatment, rest compact rows — so the lane grammar still reads as the same family. |

---

## 3. The Control Surfaces (desktop + mobile)

### Entry points (unchanged geometry, re-skinned off glass)

Two fixed bottom-right pills, gated `view==='room' && wingData && !showGallery`:

- **Manage pill** (was "Media", `MemoryPalace.tsx` ~L1732): opens the manager Sheet at `anchor='top'`. Solid tray chrome (linen `#FCFAF5`, `#E7D9C4` border, warm-ink shadow, **no** backdrop-filter). `RelayIcons` ledger glyph in EMBER. Label key `manageRoom`. `tRoom('media')` kept as deprecated alias during rollout.
- **AV pill** (`~L1693`, only when room has ≥1 audio/video): opens the SAME Sheet at `anchor='nowPlaying'`. When something is playing while the Sheet is closed, shows a breathing EMBER dot.

Both open one surface at different scroll anchors — **not two surfaces**.

### Desktop / tablet — right rail (30rem, opaque linen)

```
┌─────────────────────────────────────── Sheet side="right" 30rem ──┐
│  Nonna's Kitchen                                            [ ✕ ]  │  ← Sheet built-in header (Fraunces, ink)
│  12 memories kept here                                            │  ← Steward strip: MUTED datum ONLY (no 2nd title)
├───────────────────────────────────────────────────────────────────┤
│  [⬇ Bring in a memory] [✎ Write] [☰ Select]  →                    │  ← action band (mask-fade h-scroll)
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ ✨ Hang a portrait above the fireplace          →         │    │  ← ONE relay-suggest card
│  └───────────────────────────────────────────────────────────┘    │
│  ┌─ ▸ NOW PLAYING ───────────────────────────────────────────┐    │  ← ACCENT.anchor (only while playing)
│  │  ◀◀  ▶/❚❚  ▶▶   ●───────○ 1:12/3:40   🔊▬▬  ⟲  ⤢          │    │
│  │  "Grandpa's song"        Playing from this room's set     │    │
│  └───────────────────────────────────────────────────────────┘    │
│  ┌─ PORTRAITS · Along the hall · over the mantel ────────────┐    │  ← terracotta tray
│  │  ★ [hero card — GOLD seal]   Over the fireplace           │    │
│  │  [photo][Shown here|In the archive][Hang|Vitrine][★]      │    │
│  │  [photo][Shown here|In the archive][Hang|Vitrine]         │    │
│  │  12 hung · Hall            ▸ 3 kept safe in the archive    │    │  ← Enfilade hint + archive footer
│  │  [ + Hang a memory ]                                       │    │
│  └───────────────────────────────────────────────────────────┘    │
│  ┌─ VITRINE · Front-right corner ────────────── sage tray ───┐    │
│  ┌─ LIBRARY · Front-left corner ──────────────  sage tray ───┐    │
│  ┌─ GRAMOPHONE · Back-right corner ───────────  terracotta ──┐    │
│  ┌─ SCREEN · Recessed over the mantel ────────  terracotta ──┐    │
└───────────────────────────────────────────────────────────────────┘
```

### Mobile portrait — bottom sheet (92dvh)

```
┌──────────────────── 92dvh bottom Sheet ──────────────────┐
│  ══════                                          [ ✕ ]   │  ← drag handle + close
│  Nonna's Kitchen · 12 memories kept here                 │
│  [⬇ Bring in] [✎ Write] [☰ Select]  →                   │
│  ┌─ NOW PLAYING ──────────────────────────────────────┐ │
│  │ ◀◀ ▶/❚❚ ▶▶  ●──────○  🔊▬▬ ⟲ ⤢                     │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─ PORTRAITS · over the mantel ─────────────────────┐  │
│  │ [★ hero, full-width]                               │  │
│  │ [photo row · toggle · chip]                        │  │
│  │ 12 hung · Hall  ·  3 kept safe ▸                   │  │
│  │ [ + Hang a memory ]                                │  │
│  └────────────────────────────────────────────────────┘ │
│  … (lanes stack, one column, .mp-scroll momentum) …      │
└──────────────────────────────────────────────────────────┘
   ▲ full-cover overlay → throttle InteriorScene.animate()
     ONLY when no active playback
```

Landscape phone falls through to Sheet's centered modal (100dvh), matching Library/Atrium.

---

## 4. Full Button / Action Inventory

**Frame / entry**
- `manageRoom` — Manage pill → open Sheet at `top`
- AV pill → open Sheet at `nowPlaying`; breathing dot when playing+closed
- Sheet close ✕ (built-in 44pt) — canonical close; scrim tap; Escape
- 3D station tap (furniture) → deep-link to that lane
- 3D item tap (hung portrait / spine / sleeve / case object) → open that item's detail/player

**Action band**
- `importButton` — Import keystone (ink+gold) → ImportHub, `pendingUnit=null`
- `writeMemory` — Write pill → in-room text composer
- `Select` chip — folds bulk-select mode inside the surface (no parallel mode)

**Per-card (canEdit only)**
- `shownHere` segment → `{displayed:true, displayUnit:<implied|'painting'>}`
- `inArchive` segment → `{displayed:false, displayUnit:undefined}`
- `stationPortraits`/`stationVitrine` — photo-only picker chip (Hang / Vitrine)
- `featureAboveFireplace` — ★ hero star (Portraits only)
- `Show on the screen` — ★ single-slot promote for video cards
- Card body tap → `MemoryDetail` / `RoomMediaPlayer`

**Per-lane**
- Dashed `+ add` tile → ImportHub with `pendingUnit` (Library routes to Write)
- `bringForward` — archive footer un-archive (evicts oldest single-slot with toast + **Undo**)

**Player (canonical = re-skinned in-3D transport → anchor card)**
- ▶/❚❚ play/pause · ◀◀/▶▶ prev/next (`switchTrack`) · seek (drag) · `muteLabel` · `volumeLabel` slider · `loopLabel` · `fullscreenLabel` (video-in-DOM only) · **Stop** (one-tap silence) · Track tray

**Bulk / cross-room**
- Select → sticky footer Hide / Move / Delete
- Move dialog (`moveMemory`, sets `displayed:false` on arrival)

**Every destructive/evicting action carries an Undo affordance on its toast (§13).**

---

## 5. Per-Station Interaction Specs

**Shared card anatomy** — `LibraryMemoryCard` + new additive **`stationVariant`** prop (net-new; see §11 for signature). Card body tap opens detail/player. Footer stacks: binary toggle → photo chip (photos, when shown) → hero/screen star (Portraits/Screen, when shown). The floating `DisplayedPill` overlay and the "Display Type" ActionCard are **deleted** (station implies type).

`stationVariant` is derived from **`displayUnit`, not raw `type`**, and overrides the `LibraryCards.tsx` branch cascade so a keepsake never renders as a quotation card while its lane says Vitrine. Enumerated overrides:
- `displayUnit==='vitrine'` → force keepsake/case visual (bypass `isText` quotation branch even for `type` case/orb)
- `displayUnit==='bookshelf'` → force parchment/document visual
- `displayUnit ∈ {painting,frame}` → force portrait/photo visual
- `screen` → play-badge video visual · `vinyl` → waveform audio visual

### 5.1 Portraits (salon wall + hero)
- Lane = terracotta tray, `stationPortraits` + `lanePosPortraits` overline, `RelayIcons.frame` glyph.
- Members: `displayUnit ∈ {frame,painting}` OR (`type ∈ {photo,painting}` unrouted). Ordered **chronological oldest-first** (mirrors `wallMems.sort`, InteriorScene ~L1556). Hero = `wallMems[0]`, pinned first.
- **Uncapped** on the flag; only `texBudget` (11/23/31 by tier, InteriorScene ~L1809) trims what actually hangs. Toggle **never evicts** here → suppress the fullness datum.
- **Enfilade depth hint** (right-aligned, MUTED, tabular-nums): `"{n} hung · {tier}"` where tier = `tierForCount(displayedWallCount)` (6/16/32 → Intimate/Hall/Gallery/Grand). Read the count from the **same** deduped `pickAllW2` set the 3D uses, so panel and world never disagree.
- **Two archive reasons distinguished:** user-archived (`displayed:false`, `bringForward` re-hangs) vs **budget-overflow** (`displayed:true` but beyond the tier slice). Budget-overflow items get "*waiting for wall space — hang fewer or grow the room*" and a **Feature/prioritize** action, NOT a plain flip that appears to do nothing.

### 5.2 Hero (the one GOLD surface)
- First-class control on any Portraits card: `★ featureAboveFireplace`. One hero at a time; featuring swaps the previous with a warm toast **+ Undo**. The evicted item must visibly reappear in the Portraits lane/archive or the reassurance is a lie.
- The hero card carries the sole GOLD seal (`borderTop 0.1875rem #D4AF37` + faint medallion). Gold = the palace itself.
- **Cross-room reconciliation:** a photo can live in multiple rooms. The hero pointer is **room-scoped**; featuring here never mutates the same image's role in another room. If the underlying image is moved/deleted elsewhere, the hero slot falls back to the next-oldest wall mem (never renders a ghost).

### 5.3 Vitrine (front-right L-glass cabinet)
- Sage tray. Members: `displayUnit==='vitrine'`. **Cap reconciled to 12** across ALL sources in lockstep (§7).
- Photo picker chip routes photos here; `type` case/orb land here natively.
- **Two-arm geometry** (`caseMems.slice(0,6)` / `.slice(6,12)`): arm placement is **deterministic-by-createdAt, out of user control** — stated in the lane, never implied as reorderable (displayOrder is not persisted, §6). Overflow past 12 → archive footer.

### 5.4 Library (front-left bookcase)
- Sage tray. Members: `displayUnit==='bookshelf'`. Cap 5; overflow → archive footer with `bringForward`.
- **Documents are authored, not uploaded.** The lane's add tile + the Write pill open the composer. Opening a spine offers **Edit text** prefilled from **both `title` and `desc`** (the composer has both fields).
- Full control parity: binary toggle, archive footer/bringForward, delete reachable via card body → `MemoryDetail`.

### 5.5 Gramophone (back-right — AUDIO player)
- Terracotta tray. Members: `displayUnit==='vinyl'`. 3 clickable sleeves in 3D; **playlist unlimited** in the track tray.
- **Toggle governs wall/sleeve display only — NOT playback.** `allAudioMems` includes hidden items, so an archived track still plays. Anchor copy: "*Playing from this room's collection*."
- **Volume slider is MANDATORY** (see §7/§13 W3 fix): under W3 the gramophone renders as static meshes with no proximity-ramp updater, so audio would play pinned at volume 1 with no control unless a W3 audio-volume consumer + slider ship.

### 5.6 Screen (recessed over mantel — VIDEO player)
- Terracotta tray. Members: `displayUnit==='screen'`. **Wall = single slot (1); playlist unlimited; adaptive** (borrows a painting when no video — keep, never a dead panel).
- First-class single-slot treatment equal to the hero: `Show on the screen` ★, inline `(1/1)` fullness datum **before** the write, evict-oldest with warm toast **+ Undo**.
- **Lane status line**: `"Showing: <title>"` or `"Adaptive — a painting stands in until a video is on the wall"` so a user with all videos archived understands why a painting is on the screen.
- Toggle governs wall display only; `allVideoMems` includes hidden → tapping a video card plays it regardless.

---

## 6. Media Flows (add / assign / hide / reorder / curate)

### Add — ONE engine
- All add affordances funnel into a single `<ImportHub>` (lazy, Suspense-wrapped), mounted room-scoped with **`lockRoom={true}`** (hides wing/room selectors that `handleImportFiles` silently ignored — fixes the wrong-room hardcode) and `initialRoomId=room.id`.
- **Completion = ONE write.** Rewrite `handleImportFiles` (`RoomMediaPanel.tsx` L528–626) to land each memory `{displayed:true, displayUnit}` in a single `addMemory` call: video→screen, audio→vinyl, image→painting (wall, appears instantly), station-specific entry uses validated `pendingUnit`. Retire the racy 100ms `setTimeout` `onAdd` closure at `MemoryPalace.tsx` L1691.
- **Async ingest state (new — critical gap fix):** server-side thumbnails/derivatives arrive *after* upload. Add an `isProcessing`/`uploadStatus` per-card state → **"Preparing your memory…"** spinner card in the lane and a **"developing" placeholder texture** on the corresponding 3D object, so a just-imported video is never a broken frame or a silent late pop-in. Failed (not offline) uploads get an explicit **retry** card, never a silent vanish.
- **After import, confirm placement:** scroll the Sheet to the card's lane + flash it, and toast the outcome (e.g. "Added to Portraits — hung 12, 1 kept in the archive"). Never a silent drop.

### Write (text) — biggest new capability
- `writeMemory` pill + Library lane tile open an in-room composer Sheet (title `storyMemoryTitle`, body `writeStoryPlaceholder`) → `addMemory({type:'text', title, desc:body, displayed:true, displayUnit:'bookshelf'})`. Must be a **first-class pill** next to Import or the Library station stays empty forever.

### Assign / hide — single-write contract
- Binary toggle + photo chip only (§5). Always explicit booleans.
- **Sibling-heal (critical, `pickDisplayed` L1522):** the first explicit write in a station otherwise makes all legacy `undefined` siblings vanish (`explicit.length>0` early-return). Fix: **on panel open, backfill `displayed:true` for all currently-shown legacy-undefined items** in each station in one batch, so introducing explicit state never drops the siblings.

### Reorder — scoped honestly
- `displayOrder` is **NOT persisted** (absent from `memoryStore` supaUpdates + DB). So: **no manual reorder ships.** Wall order is deterministic (chronological); Vitrine arms deterministic-by-createdAt. Control is via Hero star, Screen star, and `bringForward` only. No reorder arrows that silently drop on refetch.

### Curate — locator + search (new — findability gap fix)
- A **search/filter field** inside the Sheet (title / date / people) + **"jump to this memory's station"** reverse lookup. With 200 memories and no Gallery grid, this is the only way to find one item sitting in some lane's archive. The 3D→lane deep-link is one-directional; this adds memory→station.

### Bulk & cross-room
- Select chip → sticky footer Hide/Move/Delete inside the surface. Move dialog unchanged (`moveMemory` → `displayed:false` on arrival).

---

## 7. The Player (audio + video) design

**Reality check (corrects the "one viewer" premise):** there are **two disjoint systems** today — `RoomMediaPlayer.tsx` (fullscreen z-10000 portal, raw native `<video controls>`/`<audio controls>`, photo-gallery `goTo`) and the in-3D AV bar (`InteriorScene` L3588-3677, which owns `switchTrack`/`vidState`/`audState`/`volOverride`/proximity-volume/loop). They are NOT the same object.

**Decision — canonical transport = the in-3D AV machinery, re-skinned into the Sheet `ACCENT.anchor` card.** `RoomMediaPlayer` stays the photo/text lightbox. Tapping a video/audio card defers to the transport via `setRoomMediaBarOpen(...)` + `switchTrack(type, indexInAllXMems)`. All new controls attach to the AV transport, NOT to native `<video>`.

Controls on the anchor card:
- **Play/pause, prev/next** (`switchTrack`), **seek** — now a real pointer-draggable scrubber that suppresses the 250ms poll during drag, with a buffered underlay and an indeterminate pre-metadata state (not a false 0%). 2.75rem `IconButton`s, tabular-nums time.
- **Volume slider (decoupled from render loop):** on change, write `bRef.current.volume` **directly** AND set `volOverride.current[type]` in the same handler — so it applies immediately regardless of `animate()` throttle. `animate()` handles only proximity auto-mode (`vo===null`). Under W3, a **new audio-volume consumer** must read `volOverride.current.audio` and apply the gramophone proximity ramp (mirror L3206) + spin the record; without it the slider is dead.
- **Mute (per-type):** video mute = `vEl.muted` toggle (clears `mutedPlaying`); audio mute = a separate boolean forcing volume 0 while preserving the last `volOverride`/proximity for un-mute (un-mute of a proximity track restores `vo=null`).
- **Loop (real setter):** `bRef.current.loop = !loop` + optimistic `setVidState`/`setAudState`. Default for a multi-track playlist = **loop off + auto-advance** on `ended` (`switchTrack(type, idx+1)` — add the ended-handler; none exists today); explicit "Loop this one" for single tracks.
- **Fullscreen (video-in-DOM only):** scoped to `RoomMediaPlayer`'s on-screen `<video>` (`requestFullscreen`/`webkitEnterFullscreen`). NOT offered on the off-DOM `VideoTexture` source or the audio anchor.
- **Stop (one-tap silence):** pauses both elements + `setRoomMediaBarOpen(null)`. Preserves the current "Close = silence" one-tap that a pure pause model would regress.
- **Track tray:** full playlist; audio items = title + index + duration chip + generated sleeve color (no blank thumbnail); video missing-thumb → play-badge placeholder. **Verify `switchTrack('audio', idx)` actually rebinds an audio element under W3** — today only `audioMems[0]` gets `vinylAudio`; if the tray can't drive real playback it is decorative and must be wired to the same W3 audio consumer.
- **Index guard:** `const i = allXMems.current.findIndex(m=>m.id===mem.id); if (i<0) open lightbox / no-op` — never pass -1 into the modulo (wraps to the wrong track).

**Playback ≠ display:** closing the Sheet does not stop playback; the AV pill breathing dot returns. `RoomMediaPlayer` keeps its own z-10000 portal above the Sheet.

---

## 8. States

- **Empty room:** `LibraryEmptyState type="room"` with wired `onAdd`; Steward strip shows `firstMemoryPrompt`; suggestion card reason = `firstMemoryPrompt`. **Whole-room first-run:** pulse the Import keystone + one-time steward line "Hang your first portrait above the fireplace" (initiates, doesn't just preserve, the onboarding lock).
- **Per-station empty cues** (adaptive philosophy, no dead panels): Portraits→`emptyEasel`, Vitrine→"The cabinet is waiting for a keepsake" (hints photos can go there — fixes the empty-vitrine confusion), Library→"No letters shelved yet — write one", Gramophone→"No records yet", Screen stays adaptive.
- **Full / archive:** per-lane footer `"{n} kept safe in the archive"` + `bringForward`, wired to the **real `pickDisplayed`/texBudget slice** (not `displayed!==false`), per-tier value (11/23/31). This is load-bearing for the 200-memory user — otherwise ~89 memories vanish with only a `console.debug`.
- **Loading:** panel skeletons while `useRoomMemories.isLoading` (**add this flag** — none today) to prevent a false-empty flash; lazy panel wrapped in `<Suspense>` (**no boundary today**).
- **Visitor / read-only:** see §12.
- **Processing / failed upload:** spinner card + 3D "developing" placeholder / retry card (§6).
- **Offline:** IndexedDB `_offline` queue surfaced with an offline banner + queued badge (never surfaced today).
- **Quota / storage cap reached:** explicit **seal-safe** "you've reached your limit" state in the import flow — never a silent fail, never an iOS-forbidden paywall (route via centralized upgrade prompt only on non-iOS; on iOS show a neutral limit message).
- **Concurrent edit / refetch:** optimistic writes get a **rollback** story — if a `supaUpdate` fails or a collaborator moved/deleted a card mid-toggle, revert the optimistic state and toast "That memory was changed elsewhere," rather than silently reverting on the next refetch.

---

## 9. Removal Plan — room-type picker + Library/Gallery concept

Subtractive; nothing hard-breaks. Migrate old blobs by read-and-ignore.

**`RoomMediaPanel.tsx`**
- Delete two-tab switcher (`activeTab`/`initialTab` ~L861-877); delete the whole Gallery furniture-slot grid + slot-picker modal (L1120-1481); delete room-type picker chips (L1126-1162), `onRoomLayoutChange`/`roomLayout` props, `pickerLayouts` (L487).
- Delete ALL `isExhibition` branches: DisplayedPill filter (L147-149), `activeFurnitureSlots`/`activeSlotCounts` (L489-505), ShowingCounts exhibition (L372-385), 20-slot expansion (L1172-1212), `painting|screen-N` parsing (L1333-1416); remove `isExhibition`/`slotCounts` params on DisplayedPill/ShowingCounts; drop exhibition-only `displayOrder` use.
- Delete the hand-rolled portal + `useFocusTrap` + own close button (replaced by `Sheet.tsx`).
- **De-glass: re-grep `backdropFilter|WebkitBackdropFilter` and remove EVERY site** (≥9: L196, L795, L807, L822, L1228, L1350, L1360, L1571, L1581) — not the enumerated five. Post-refactor assertion: zero backdrop-filter in the room manage surface.
- Repurpose dead `onAdd`/`galleryAutoAssignUnit` for import-into-station.

**`MemoryPalace.tsx`** — drop `roomLayout`/`onRoomLayoutChange` (L1691); drop `layoutOverride` from InteriorScene props + its React `key` (L1558); remove `roomLayouts` store selector (L216) + dead `RoomGallery` import (L64, delete `RoomGallery.tsx`); add `canEdit` + `roomManageAnchor` to the pill (L1732) + panel (L1691) mounts; wrap panel in `<Suspense>`; add the `(selMem||showUpload||showSharing||walkthroughActive)` hidden guard.

**`useNavigation.ts`** — collapse both `handleMemClick` branches (L64-69): remove `galleryInitialTab('library')` (tab notion gone), keep `galleryAutoAssignUnit='painting'` for the mantel + the onboarding lock; repoint any `initialTab='gallery'` to the station deep-link.

**`uiPanelStore.ts`** — drop `galleryInitialTab`; add `roomManageAnchor` (cleared on `setShowGallery(false)` alongside existing `gallery*` fields).

**`roomLayouts.ts`** — collapse `ROOM_LAYOUTS` to a single `salon` base; delete `peristylium`/`isExhibition`/`paintingSlots` + the `layoutOverride` param on `pickBaseLayout`/`layoutForRoom`. **KEEP `sizeForRoom`/`tierForCount`/Enfilade growth** (driven by displayed wall count, not room type).

**`InteriorScene.tsx`** — collapse every `isExhibition ? A : B` to `B`; delete the peristylium shell branch (~L513-966), exhibition `SLOT_COUNTS` (L1491), museum painting-grid (L1565-1648), exhibition screen branch + blank wall-slot (L1649-1658), legacy `#1A1A1A` "No videos yet" fallback (keep adaptive-painting screen). Verify no `isExhibition` 3D branch (geometry/lighting/fog) remains live-but-unreachable.

**Stores / tracks (neutralize)** — retire `progress-checker.ts` L202 `v_change_layout` goal + `achievementStore.ts` L247 `layoutsChanged` metric; `palaceStore.ts` stop writing `roomLayouts`/`mp_room_layouts` (keep one-time read-and-ignore); `settingsSync.ts` drop synced key (L19); `HomeView.tsx` L904 drop `create-gallery` tile; `LibraryView` drop `createGallery` pill.

**Do NOT touch** — `CorridorScene.tsx` `paintingSlots`; `wings.ts` `layout:` descriptor strings.

**Count reconciliation (must ship in lockstep — §7):** Vitrine 3→12 in `ROOM_SLOT_COUNTS.case` (L39) AND `InteriorScene SLOT_COUNTS.case` (L1492) AND the `pickDisplayed('case')` cap AND the DisplayedPill/evict logic — or `"Shown X of Y"` lies and items sit assigned-but-hidden. Panel `SLOT_COUNTS` and `InteriorScene SLOT_COUNTS` must stay identical per station (assert-sync). Export one shared `unitToSlot` module to kill the 3× duplication (relabel only; never rename keys).

---

## 10. i18n Keys + Microcopy Voice

Flat per-section (`t()` is a FLAT lookup); guard `t(k)!==k ? t(k) : 'Fallback'`; 5 locales nl/en/de/es/fr; keep short (German expansion); rem-sized.

**Add:** `manageRoom`, `ariaOpenRoomManager`, `ariaAvControls`, `writeMemory`, `editText`, `shownHere`, `inArchive`, `stationPortraits`/`stationVitrine`/`stationLibrary`/`stationGramophone`/`stationScreen`, `lanePosPortraits`/`lanePosVitrine`/`lanePosLibrary`/`lanePosGramophone`/`lanePosScreen`, `featureAboveFireplace`, `heroPainting`, `showOnScreen`, `screenAdaptive`, `portraitsDepthHint` (`"{n} hung · {tier}"`), `tierIntimate`/`tierHall`/`tierGallery`/`tierGrand`, `archiveKeptSafe` (`"{n} kept safe in the archive"`), `bringForward`, `undo`, `muteLabel`/`volumeLabel`/`loopLabel`/`fullscreenLabel`/`stopLabel`, per-station empty cues, `preparingMemory`, `uploadFailedRetry`, `limitReached`, `searchMemories`.

**Reuse:** `play`/`pause`/`previous`/`next`, `firstMemoryPrompt`, `storyMemoryTitle`/`writeStoryPlaceholder`, `emptyRoom*`, `importConfirm`/`importImporting`/`importClearAll`/`remove`, `save`.

**Purge:** `tabLibrary`, `tabGallery`, `galleryHint`, `roomType`, `roomLayouts.peristylium`, `layout auto`, `album`, `case`, `tableAlbum`, `arrangeHint`/`uploadHint`/`tabArrange`/`tabAll`/`tabUpload`, `notDisplayed`, `clearSlot`, `tapToChoose`, `assigned`, `noCompatible`, exhibition-only strings; rewrite `roomTour.item3`/`dItem3` (drop "Room Gallery"/"change room type"); reword `roomMedia.displayLimit`/`unitFull` warmly.

**Voice:** warm steward. Never "slot / full / limit / removed." Always "kept safe / shelved / still here / moved somewhere safe." Reword `importButton` → "Bring in a memory"; `unitFull` → "This spot's taken — the other keepsake moves to the archive."

---

## 11. Icon + Token Mapping

**Palette (corrects accent drift — only the 3 defined tray hexes):**

| Lane | Tray hex | Left-rule glyph accent |
|---|---|---|
| Portraits | terracotta `#F6EBE3` | terracotta |
| Screen | terracotta `#F6EBE3` | terracotta (unify off ad-hoc `#5B8CB8`) |
| Vitrine | sage `#EFF2E8` | sage |
| Library | sage `#EFF2E8` | sage (**NOT gold** — gold stays ceremonial) |
| Gramophone | terracotta `#F6EBE3` | terracotta |

Lanes are differentiated by **glyph + position tag**, not by inventing tray colors the Atrium palette doesn't contain. GOLD `#D4AF37` reserved strictly for: hero seal, focus ring, Import-keystone dot. `LEDGER_OCHRE #8A6410` only for gold *text* on cream.

**Icons — ONE family, RelayIcons for overlines/pills.** Author new `frame`/`portrait`, `vitrine`/`case`, `screen`/`video` glyphs in the same 24×24 stroke-1.6 `currentColor` hand as `record`. **Hard prerequisite:** without these, the `Glyph` fallback (`RelayIcons[k] ?? RelayIcons.palace`) silently renders 3 identical palace glyphs. Add explicit keys so the fallback never fires for the five lanes. Exactly one `ri-*` sub-part animates, only on the single active station, reduced-motion gated. Card badges keep their `LibraryMemoryCard` family (`TypeIcon`) — do NOT mix `RelayIcons` into card badges.

**`stationVariant` — net-new additive prop (not a free reuse).** Signature: `stationVariant?: 'portrait'|'case'|'document'|'audio'|'video'`, threaded through `LibraryCards.tsx`, evaluated **before** the existing `isText`/`isAudio`/`isVideo`/`hasImage`/`isDocument` cascade, driven by `displayUnit`.

**Type rule:** Fraunces/display text is INK `#403B36` only, except the single steward greeting line. All terracotta/EMBER usage confined to interactive chrome (borders, active pills, glyphs) — never display-font body/title text. Radii: card 1rem, pill 2rem. Motion: one `warmth.ts` 4s breath (suggested tile + playing glyph + AV-pill dot only).

---

## 12. Accessibility + iOS-Seal Compliance

**Accessibility**
- Sheet inherits focus-trap, body-scroll-lock, safe-area insets, `.mp-scroll` momentum, 44pt close ✕.
- Touch targets ≥ 2.75rem (toggle segments, chips, per-item remove, transport buttons).
- Active states use bg + weight, not color alone (contrast). Focus-visible `0.1875rem` GOLD ring.
- **Caption / alt-text authoring** (new — accessibility gap): the manage surface must let a user author a caption/alt for wall portraits; today the player just dumps `mem.title` into `alt`. Audio/video get a transcript/description field surfaced per-track (backed by `mem.desc`).
- All motion `prefers-reduced-motion` gated via one mounted `<TuscanStyles/>`; the photo slideshow auto-advance also gated + paused on video/audio items; rem units throughout.

**iOS seal**
- Manage/AV pills + Sheet + all playback/manage/write/import are **content**, always render on iOS (playback + authoring are not paid surfaces).
- Gate ONLY Publish/Share ember CTAs behind `isIOS()` — including the currently **ungated** `RoomMediaPlayer` share chip (L744).
- Cloud provider chips auto-hidden by `lockRoom` (also keeps brand logos off iOS per Apple 2.3.10).
- Quota-limit state on iOS = neutral message, never a paywall/upgrade route. Any unavoidable upgrade CTA routes via centralized `setShowUpgradePrompt(true)` with `(!isNative() || (isIOS() && IAP_ENABLED))`, reading `IAP_ENABLED` at render.

**canEdit / visitor (real leak fix)**
- `RoomMediaPanel` AND `RoomMediaPlayer` have **zero `canEdit` today**; the pill + panel mount unconditionally wired to real write handlers even when `isSharedWing && !sharedCanEdit`.
- Add explicit `canEdit` (from `sharedCanEdit`, `MemoryPalace` L461), **gated at the mount** (pill L1732 + panel L1691), not internal buttons.
- `canEdit=false`: hide Import/Write/Select/Delete/Move, toggle, photo chip, hero/screen star, dashed adds, suggestion card, and the 3D `__upload__`/`__upload_painting__` sentinels; lanes render read-only; card tap opens playback-only detail. **Players stay fully usable.** Add `canEdit` to `RoomMediaPlayer` too (hide quick-actions toolbar / Edit / inline title-desc edit / delete-restore-share-move; keep transport/zoom/swipe). Preserve heart-only `ReactionBar` + `CommentThread`.
- **Onboarding lock re-asserted on the new furniture deep-link:** gate `station tap → open lane` behind `!onboardingModeRef`, so during onboarding only the mantel `__upload_painting__` path is live.

**Perf**
- Throttle `InteriorScene.animate()` only when a full overlay covers the canvas **AND no active playback** (so a playing gramophone/screen volume ramp never freezes). Desktop 30rem rail does NOT cover the canvas → do not throttle; only mobile 92dvh / ImportHub full-cover throttles. Virtualize lane lists (`content-visibility:auto` on rows), cap enter-stagger.

---

## 13. Resolved Critique Issues + Residual Risks

**Resolved**
- Accent-palette drift → 5 lanes mapped onto the 3 real tray hexes; Library is NOT gold.
- `stationVariant` labeled net-new with signature + the branches it overrides; card-art vs lane-label conflict enumerated (all 5 branches).
- De-glass extended to ALL ≥9 backdrop-filter sites + assertion.
- Double-title resolved: Sheet header owns the Fraunces name; Steward strip is a MUTED datum only.
- New icons made a hard prerequisite so the palace-glyph fallback never fires.
- Single-column rail keeps Atrium hero/compact rhythm.
- Two disjoint player systems named; canonical transport chosen (AV machinery → anchor card); native `<video>` NOT overloaded.
- Loop setter + ended/auto-advance handler specified; volume decoupled from `animate()`; mute per-type; fullscreen scoped to in-DOM `<video>`; Stop preserved; seek made draggable; index guard against -1.
- Sibling-heal batch on panel open (fixes the `pickDisplayed` early-return cliff).
- Screen given hero-equal single-slot controls + status line; Vitrine arms documented deterministic.
- Async processing/failed-upload state, Undo on every evicting toast, and search/locator forced into the spec.
- canEdit gating extended to `RoomMediaPlayer`; onboarding lock re-asserted on furniture deep-link.

**Residual risks (verify during build)**
1. **W3 audio-volume consumer** — must be added or the gramophone slider is dead and tracks play pinned at volume 1; also verify `switchTrack('audio', idx)` rebinds a real audio element under W3 (today only `audioMems[0]`).
2. **displayUnit key contract** — 3 duplicated maps; export one shared module; relabel only, never rename.
3. **displayOrder not persisted** — no reorder ships; Vitrine arms deterministic-by-createdAt.
4. **Archive count truthfulness** — must mirror the real `pickDisplayed`/`texBudget` slice per station, distinguishing user-archived vs budget-overflow for Portraits.
5. **canEdit at the mount** — verify shared-wing + onboarding-lock paths hold.
6. **Vitrine 3→12 in one commit** across all four sources.
7. **`animate()` throttle** gated on "full overlay AND no active playback."
8. **Optimistic rollback / concurrent-edit** — writes must revert cleanly on failure/collaborator change.
9. **iOS quota** — limit state must be seal-safe (no paywall on iOS).

---

## 14. Phased Implementation Plan (flag-gated, staging-first)

Behind flags `w1_roomui` / `w2_roomui` / `w3_roomui` (prod-OFF until owner review), on the `staging` worktree, `npx vercel --prod` for previews.

**Wave 0 — Foundations & de-risk**
- Export shared `unitToSlot`; add `useRoomMemories.isLoading`; wrap panel in `<Suspense>`; add `canEdit` + `roomManageAnchor` plumbing; add `stationVariant` to `LibraryCards`; verify W3 audio-volume consumer + `switchTrack` audio rebind (spike). No user-visible change yet.

**Wave 1 — The Ledger shell + assign (`w1_roomui`)**
- Mount `RoomMediaPanel` inside `Sheet.tsx` (opaque, de-glassed, all backdrop-filter removed); Steward strip; action band; station lanes (3-hex palette, new RelayIcons glyphs); binary toggle + photo chip + hero/screen star; sibling-heal on open; **Vitrine 3→12 lockstep**; count reconciliation + assert-sync. Read-only visitor gating at the mount.

**Wave 2 — Flows (`w2_roomui`)**
- ImportHub `lockRoom` + one-write `handleImportFiles` + async processing/failed states + 3D developing placeholder; Write composer + Edit text (title+desc); archive footer + `bringForward` (real slice) + Undo; Enfilade depth hint; search/locator; empty-room first-run + per-station cues; quota state.

**Wave 3 — Player + polish (`w3_roomui`)**
- Re-skin AV transport into the anchor card; volume slider (decoupled) + W3 consumer; per-type mute; loop + auto-advance; draggable seek; Stop; track tray; fullscreen (in-DOM video); caption/alt authoring; offline banner; concurrent-edit rollback.

**Wave 4 — Removal & cleanup**
- Delete room-type picker, Gallery grid, all `isExhibition` branches, `RoomGallery.tsx`; collapse `roomLayouts` to `salon` (keep Enfilade); neutralize layout stores/achievements/settings-sync; i18n purge + add across 5 locales; final backdrop-filter=0 assertion; perf throttle gate.

**Each wave:** owner review round → z-fight / seal / a11y verification → flag-retire on sign-off (mirroring the corridor/hall precedent).
