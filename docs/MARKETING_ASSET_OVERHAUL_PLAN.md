# Marketing Asset Overhaul — rooms & corridor re-render

**Created 2026-09-05.** Trigger: the room realism pass (`a892652`, msKey fp19) and the
corridor realism pass (`6b8e75d`) both shipped to production on 2026-09-05. Every
marketing asset that shows a ROOM or a CORRIDOR was rendered before that and now
misrepresents the product.

Owner decisions (2026-09-05): **full scope (phases 0–4)**, **redesigned shot list**
(the new work must actually be visible, not just re-rendered), **pipeline moves into
the staging worktree**.

---

## 1. What is stale, and what is not

The overhauls touched `InteriorScene` (rooms) and `CorridorScene` (corridors) only.
Exterior and hall geometry is unchanged since August, so **exterior/hall footage stays
valid**. That is the triage axis and it removes a large slice of the work.

> **CORRECTION (2026-09-05, after inspecting actual frames).** The first version of
> this table ranked the hero videos by file date and exposure without checking what
> they contain. Three of the four are **not 3D renders at all** — they are cinematic
> stock/AI footage (a woman walking a sunlit corridor; a Tuscan landscape through an
> arch; a cypress avenue to a villa). They contain no product geometry, so a 3D
> overhaul cannot make them stale. Only `walkthrough-tour.mp4` is a product render.
> Verify content before ranking by mtime.

| Asset | Surface | Autoplay | Shows | Verdict |
|---|---|---|---|---|
| `public/video/hero-ob.mp4` | Onboarding intro | **yes**, 100% of new users | stock footage, no 3D | 🟢 leave alone |
| `public/video/hero-v2.mp4` | Landing hero | **yes** | stock footage, no 3D | 🟢 leave alone |
| `public/video/hero-bg.mp4` | Atrium hero (in-app) | no | stock footage, no 3D | 🟢 leave alone |
| `public/video/walkthrough-tour.mp4` | Landing "see it in action" | no (click) | **the only 3D render** | 🔴 rebuild (all 7 segments) |
| `public/landing/band-corridor.jpg` | Landing Palace card | — | corridor | 🔴 |
| `public/landing/shots/shot-1..7.webp` | Landing carousel | — | app views | 🔴 |
| `store-assets/raw-v4`, `raw-v5`, `ios` | App Store / Play | — | room + corridor | 🔴 |
| socials-kit: 28 carousels, 31 ASO clips | Social | — | room + corridor | 🔴 (02/09) |
| `public/press/still-hall-doors`, `still-villa-goldenhour` | `/press` | — | hall, exterior | 🟢 keep |
| `public/video/why-clip.mp4` | — | — | — | ⚪ unreferenced, delete |

**The tour chain had a hole.** `scripts/build_tour.mjs` consumes seven *graded*
segments (`scripts/hero_rec2/seg2/s0..s6.mp4`), but nothing in the repo produced
those from the raw takes in `seg/t1..t8.mp4` — that cut/grade step was done by hand
and never written down (`s2` and `t5` are not even the same take). So "re-render only
the stale segments" was not actually possible without eyeballing an unknown grade,
which would risk a visible colour jump exactly at the hall→corridor cut.

Resolved by declaring the whole chain in `scripts/marketing/build-tour.mjs`:
record → trim → xfade → publish → stamp, with all seven segments re-recorded through
one shared grade. Cut durations mirror the original 31.1 s so the landing section,
poster and JSON-LD duration stay valid.

---

## 2. Blockers to clear first

1. **The pipeline points at the wrong worktree.** `scripts/week1/*` reads and writes
   `C:/Users/nelis/memory-palace/socials-kit/...` — the July-old worktree. Re-rendering
   as-is would faithfully reproduce the OLD visuals. This is why the overhaul is needed
   at all, and it will recur unless fixed.
2. **`scripts/week1/` is untracked** in the staging worktree — the render pipeline is not
   under version control alongside the code it renders.
3. **No provenance.** Nothing records which scene-commit an asset was rendered from, so
   staleness is invisible until someone eyeballs it.

---

## 3. Rendering constraints (learned the hard way — do not relitigate)

- **GPU + headful, or headless with ANGLE.** A backgrounded/extension-driven tab pauses
  `requestAnimationFrame` and yields a black canvas. Use `--use-gl=angle --use-angle=d3d11`.
- **Wait ~18–24 s** after navigation: 3D assembly plus the reveal-veil fade. Console logs
  `[palace] reveal (assembled) at Xms` mark the moment.
- **`/flythrough` and `/staging/*` are prod-404 by design** (Apple Guideline 2.2). All
  capture runs against a **local dev server of the staging worktree** (`npx next dev -p 3002`).
- **Renders are deterministic.** Math.random was removed from flames/motes/mosaic, so the
  same URL yields the same frame — A/B comparisons and re-runs are reliable.
- Cache-buster: scene material sets are keyed (`msKey … fp19`); bump-on-change already handled.

---

## 4. Phases

### Phase 0 — Foundation (blocking)

- Move the socials-kit render pipeline into the staging worktree; commit `scripts/week1/`.
  Output stays outside git (large binaries) but the *scripts and manifest* are versioned
  next to the 3D code they depend on.
- Create **`marketing/shots.manifest.json`** — the single source of truth. One entry per
  deliverable:
  ```jsonc
  {
    "id": "tour-s5-corridor",
    "surface": "landing/tour",
    "kind": "video",              // video | still
    "route": "/flythrough",
    "params": { "scene": "corridor", "walk": "1", "wing": "roots" },
    "viewport": [1920, 1080], "dsf": 2, "durationMs": 13500,
    "scenes": ["corridor"],       // drives staleness triage
    "out": "seg/t5_corridor.mp4"
  }
  ```
- Single entrypoint `scripts/marketing/render.mjs` that can run one id, or filter
  (`--scenes corridor,room`) — so "re-render everything touching rooms" is one command.
- Verify every existing param still resolves against the new scene code.

### Phase 1 — The tour video (scope corrected)

Only `walkthrough-tour.mp4` is a product render, so phase 1 is one deliverable:

```
node scripts/marketing/build-tour.mjs          # record missing segments, then assemble
node scripts/marketing/build-tour.mjs --force  # re-record all seven
```

A scripted room dolly (`?rmove=hearth|reveal`) was added to `InteriorScene` for this —
the room previously had only static `?rcam` poses, so the tour had no motion indoors.
It mirrors the corridor's `?walk`: a 13 s eased move, resettable via `window.__walkReset`.

Afterwards bump `VideoObject.uploadDate` and `duration` in `LandingV2Client.tsx`
(hardcoded 2026-08-23 / PT31S).

### Phase 2 — Stills: landing, press, stores

- `band-corridor.jpg` and `shots/shot-1..7.webp`.
- Press stills for room + corridor (hall/exterior ones stay).
- **App Store 6.9" (1320×2868)** — already an open backlog item, folded in here — plus
  iPad 13" and Play phone/tablet via `generate-store-assets-v*.mjs`.

### Phase 3 — Social library

Re-render the 28 carousels, 31 ASO clips and the persona corridor clips
(`record-corridor-walk.mjs` with `cp1..cp4`). Update the clip catalog with the render stamp.

### Phase 4 — Guardrails (so this cannot silently rot again)

- Every render writes a sidecar stamp: scene-commit SHA + msKey + timestamp.
- `scripts/marketing/check-stale.mjs`: compares each asset's stamped commit against the
  latest commit touching `InteriorScene.tsx` / `CorridorScene.tsx` / `src/lib/3d/**`, and
  lists what is out of date. Run it before any release.

---

## 5. Redesigned shot list — what the new work must show

The overhauls added things no existing shot frames. New/changed hero moments to capture:

**Room (`/staging/room`, `?rcam=hearth|entry|plan`, `?grade=`, `?wallcount=`)**
- The rebuilt chimneypiece: pale sandstone, cannelures, rounded arrises, contact shadows.
- The **grand velario** ceiling and its daylight pool — the single biggest new feature.
- The 4-frame animated fire with ember strip.
- Checkerboard marble + baked-plank parquet floor.
- `?grade=` variants (mattina default / dorato / fresco) as a mood A/B.

**Corridor (`/staging/corridor`, `?cam=statue|plant|portal|door|terminus`, `?wing=`, `?walk=`)**
- The five **wing centrepieces**, now themed: roots family tree, travel armillary,
  **nest woven twig nest + eggs**, craft obelisk, **passions bronze lyre**. Use
  `/staging/statues` to review, `?wing=` to capture.
- Potted plants with visible potting soil and wheel-thrown terracotta (`?cam=plant`).
- Semicircular window heads and the softened, layered light shafts.
- Rounded arrises on frames, wainscot and pedestals.

---

## 6. Sequencing note

Phases 1–3 are all gated on Phase 0. Within a phase, work strictly in exposure order —
an hour spent on `hero-ob.mp4` is worth more than a day on a carousel clip.

Related: [`SCENE_REALISM_PLAN.md`](./SCENE_REALISM_PLAN.md) (the room pass this stems from).
