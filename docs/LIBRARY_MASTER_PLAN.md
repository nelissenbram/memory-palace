# Library Master Plan — Il Muro redesign + full functionality

Consolidates the 115-agent redesign spec (`LIBRARY_REDESIGN_SPEC.json`) and the direct design
critique into one phased plan. Paradigm kept: wings→rooms + grid(=wall)/timeline. List view is
retired (redundant beside wall + timeline). Everything unconditionally visible; simpler; faster
on mobile; Atrium palette.

## Phase 0 — DATA (blocker, must verify first)
- [shipped] Robust tile source: thumbnail→original→warm-gradient with onError; synchronous width
  measure + fallback so the wall never renders blank.
- [OPEN] Confirm real photos load on bram@elyphont.com. If still blank it is a data/CORS issue
  (Supabase file_url not fetched or cross-origin blocked), NOT layout — needs the browser
  console/network error to pinpoint.

## Phase 1 — THE WALL  [SHIPPED]
Il Muro chromeless justified photo wall; sticky gold month bands; MediaThumb/img tiles; list &
timeline untouched; Load-more hidden for grid.

## Phase 2 — PERFORMANCE (make the wall fast at scale)
- Real aspect ratios via one-shot img onLoad → AR cache → rAF-batched single re-pack (organic wall).
- Row-level virtualisation over pre-measured packed rows (~20 live rows regardless of size);
  retire visibleMemCount everywhere.
- content-visibility:auto safety net; single shared rAF scroll/resize scheduler; kill per-card
  entrance stagger; hoist/prune keyframes.

## Phase 3 — MOBILE CHROME (critique #1: biggest mobile win after the wall)
- Collapse the 3 stacked mobile strips (Wings + Rooms + Search/Sort) into ONE 3rem sticky
  context bar: breadcrumb (wing › room) + search icon + sort icon.
- Auto-hide on scroll-down, reveal on scroll-up (Photos-style) so photos own the screen.
- Wings/rooms move into a slide-over or the breadcrumb tap, not permanent bars.

## Phase 4 — RELIVING & FINDING (critique #2 & #4: biggest functional wins)
- Detail viewer prev/next within the room in the active sort (swipe on mobile, arrows desktop) —
  a room becomes an album you page through.
- Stop wiping search/filter on every navigation tap (8 handlers).
- Persistent facet chip lane under search (type · has-place · described · on-this-day[gilt]) that
  survives room switches; one shared, persisted Sort control for all views; live result count.

## Phase 5 — CONSISTENCY & SIMPLICITY (critique #3, #5, #6)
- Room-overview cards: chromeless + a chosen/derived cover photo, same language as the wall.
- Timeline becomes a real "time-river": sticky year/month gold bands, square-cropped tiles.
- Retire the list view (redundant); grid/timeline toggle only, as a low-chrome text toggle.
- Fold the tools toolbar (write/AI/location/import/select/publish) into ONE ember "Add" button
  + a kebab (⋯) sheet.

## Phase 6 — CURATION (critique #7)
- First-class galleries/collections across rooms (create, add-to, reorder, share) — the missing
  pillar for a lifelong archive.

## Phase 7 — THUMBNAIL PIPELINE (backend follow-up)
- Server-side ?w= resize + stored thumbnail_url for all photo types; front-end srcset/sizes.
