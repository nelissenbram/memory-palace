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

| Asset | Surface | Autoplay | Shows | Verdict |
|---|---|---|---|---|
| `public/video/hero-ob.mp4` | Onboarding intro | **yes**, 100% of new users | corridor + room | 🔴 re-render (16/07) |
| `public/video/hero-v2.mp4` | Landing hero | **yes** | palace | 🟠 re-render (23/08) |
| `public/video/walkthrough-tour.mp4` | Landing "see it in action" | no (click) | seg 5–8 = corridor/room | 🔴 partial re-render |
| `public/video/hero-bg.mp4` | Atrium hero (in-app) | no | palace | 🟠 re-render (16/07) |
| `public/landing/band-corridor.jpg` | Landing Palace card | — | corridor | 🔴 |
| `public/landing/shots/shot-1..7.webp` | Landing carousel | — | app views | 🔴 |
| `store-assets/raw-v4`, `raw-v5`, `ios` | App Store / Play | — | room + corridor | 🔴 |
| socials-kit: 28 carousels, 31 ASO clips | Social | — | room + corridor | 🔴 (02/09) |
| `public/press/still-hall-doors`, `still-villa-goldenhour` | `/press` | — | hall, exterior | 🟢 keep |
| `public/video/why-clip.mp4` | — | — | — | ⚪ unreferenced, delete |

**Partial re-render wins.** `walkthrough-tour.mp4` is assembled by `scripts/build_tour.mjs`
from 8 segments (`t1_orbit … t8_mantel`) chained with ffmpeg xfades. Segments 1–4 are
exterior/hall and stay; only **s5 corridor, s6 door, s7 room-pan, s8 mantel** need
re-recording before re-assembly. Apply the same segment-level thinking everywhere.

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

### Phase 1 — Hero video set (highest exposure first)

Order strictly by how many people see it:
1. `hero-ob.mp4` — onboarding, autoplays for every new user.
2. `hero-v2.mp4` — landing hero, autoplays for every visitor.
3. `walkthrough-tour.mp4` — re-record s5–s8, re-assemble with `build_tour.mjs`.
4. `hero-bg.mp4` — atrium.

Also refresh posters (`hero-poster.jpg`, `walkthrough-poster-v2.jpg`) and bump the JSON-LD
`VideoObject.uploadDate` in `LandingV2Client.tsx` (currently hardcoded 2026-08-23).

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
