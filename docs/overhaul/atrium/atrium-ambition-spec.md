# The Atrium Overhaul — "The Grand Threshold"

**Status:** Spec (buildable) · **Owner:** Creative Director + Principal Engineer · **Date:** 2026-07-17
**Target file:** `src/components/ui/HomeView.tsx` (+ `MemoryPalace.tsx`, `ExteriorScene.tsx`, new `AtriumThreshold.tsx`)
**Audience:** Heritage Keepers 60+ and their adult children, often preserving a late loved one. Awe + warmth + dignity + clarity, never gamified.

---

## 1. Thesis

The Atrium stops being a dashboard of 12 widgets and becomes **the sunlit approach to your own palace**. The first screen is a single living 3D establishing shot of the user's actual palace at their real local hour, with exactly one thing to look at (their palace, breathing) and exactly one thing to do (cross the threshold). Tapping "Enter your palace" does not navigate — it **dollies you through the door into the real scene in one unbroken motion**, because the hero *is* the destination: the same persistent WebGL context the whole time.

This is the decisive synthesis of the three top directions (Grand Threshold 45.0 / Billboard 44.7 / Living Hearth 44.3). They agree on 95% of the mechanism; we commit to **Grand Threshold** as the backbone (its match-cut framing is the sharpest) and graft the Billboard's title-lockup discipline and the Living Hearth's "every memory is a lit window" data-truth.

---

## 2. The Hero Mechanism — THE DECISION

**Live, bounded R3F `ExteriorScene` of the user's OWN palace, by REPOSITIONING the single already-mounted persistent WebGL host — NOT a second context, NOT a clone, NOT a video (on capable tiers).**

### Why live 3D over video (the load-bearing reason)
It is the *only* mechanism where the hero literally IS the destination, so "Enter" becomes a seamless match-cut with **zero load and zero seam**. The border-radius/inset animate to fullscreen while the camera hands off from ambient drift into the existing onboarding fly-in — because it was the same scene the entire time. No video or still can deliver a continuous camera handoff. This weaponizes the app's worst liability (palace load latency) into its signature moment.

### Grounded implementation (verified against the code)
The recon is confirmed accurate against the real files:

- **The host exists.** `MemoryPalace.tsx:657-666` creates the body-level portal `div[data-palace-persistent]`, `position:fixed;inset:0;z-index:5;visibility:hidden;pointer-events:none;`, `dataset.paused="1"`. `hasVisitedPalace = true` (line 654) eager-mounts and warms the scene app-wide.
- **It's container-sized, not viewport-hardcoded.** `ExteriorScene.tsx:74` — `let w=el.clientWidth||window.innerWidth,h=el.clientHeight||window.innerHeight`. Driving the host's fixed rect from a hero card's `ResizeObserver`'d box makes the canvas fill the card. No rewrite.
- **The pause gate is real.** `ExteriorScene.tsx:2825` early-returns the whole animate pass when `_hostEl.dataset.paused==="1"`. Setting `dataset.paused="0"` runs the loop; an `IntersectionObserver` toggling it back to `"1"` when the hero scrolls off costs near-zero battery.
- **The match-cut fly-in already exists.** `ExteriorScene.tsx:2848-2911` runs the Catmull-Rom 5-waypoint flyover + cubic zoom (`camD` 180→35), ending at `onRoomClickRef.current("__entrance__")` (line 2909). This is shipped code; we hand ambient drift into it via a NEW dedicated `cinematicEntry` prop (never overload `onboardingMode`, which re-seeds the camera + fires the onboarding prompt at lines 64-71).
- **Idle drift is the only genuinely new scene code.** Outside onboarding/autoWalk the camera holds the static WP1 pose (lines 2924-2929). We add ~5 lines in the animate else-branch: ease `camOT.theta` ±3-4° over ~40s (sine loop) + gentle phi bob, gated on `!drag.current` and hero-on-screen. A breath, never a spin.

### Mandatory tier gating (not optional)
Read `getGPUTier()` (`src/lib/3d/mobilePerf.ts`) once at mount + `prefers-reduced-motion` + `navigator.connection.saveData` + `deviceMemory`:

| Tier | Hero | Enter transition |
|---|---|---|
| **Desktop / capable** | Live bounded 3D (reposition persistent host) | True match-cut: radius/inset→0 + camera hands to fly-in |
| **Mobile / iPad / Capacitor** | Muted `hero-bg.mp4` (2MB, `-slow` variant) over `hero-poster.jpg`, framed to the SAME resting camera pose | Video crossfade + existing gold `portalFlash` |
| **Potato / reduced-motion / Save-Data** | `hero-poster.jpg`, 2-layer scroll/pointer parallax, CSS day/night grade, no decode | 400ms gold cross-dissolve |

A second live WebGL context is **explicitly forbidden on phones** (the documented iPad WKWebView memory ceiling; mirror the `!isMobileGPU()` gate already guarding the persistent Entrance Hall at `MemoryPalace.tsx:683-691`). **SSR `hero-poster.jpg` sits under every tier** so first paint is never blank and CLS is zero (fixed hero box, explicit aspect).

### The palace is lit by the user's REAL local hour
Bind the hero to the existing `getLightingPreset(resolvedHour)` / `DaylightProvider` (auto-ticks 60s, 2h blends). 7am warm dawn gold, 1pm bright midday, 7pm amber golden-hour, night cool-blue with warm lit windows. **The greeting's time-word is derived from the SAME hour** so text and light can never disagree ("Good evening, Bram" over an amber palace). The home screen literally never looks the same twice, at near-zero cost, on every tier (posters carry a CSS day/night grade). This is the highest wow-per-risk graft in the field and cannot be faked by any calmer alternative.

---

## 3. First Screen (above the fold)

In order, edge to edge:

1. **THE LIVING THRESHOLD** — full-bleed cinematic hero band, ~52vh desktop / ~42vh mobile, 24px radius, thin terracotta hairline frame, soft top-vignette that melts the 3D into the cream page so it reads as a **window you look through**, not a game viewport. Inside: the user's actual palace at their real hour, quietly breathing on the ~40s ambient orbit. Wings the user actually filled glow warm from within (emissive driven by real per-wing memory counts); empty ones wait dark. A soft charcoal bottom-up scrim on the lower third guarantees text contrast on any frame without boxing the palace in glass.

2. **THE TITLE LOCKUP** (floating bottom-left over the scrim, NO glass card): `PalaceLogo` mark, then a Fraunces greeting whose time-word tracks the real hour ("Good evening, Bram", name in terracotta), then ONE quiet museum-wall-label metadata line of real data in Source Sans, small and tabular ("37 memories across 6 rooms · a new one Tuesday").

3. **THE ONE LUMINOUS ACTION** — a wide, low, warm-terracotta "Enter your palace" pill with a slow ~6s gold sheen sweep (a beckon, not a blink); the only saturated element on the screen. A whisper-quiet ghost "Continue where you left off" appears beside it ONLY when `lastVisitedRoom` exists.

That is the entire fold: a living palace and one door. Excellence + simplicity together.

---

## 4. Motion Plan (dynamic, performant, reduced-motion safe)

Five coordinated, low-amplitude, dignified layers — each independently reduced-motion + tier gated. Never a spinner, never a bounce.

1. **AMBIENT ORBITAL BREATH** — live camera eases ±3-4° theta over ~40s + gentle phi bob, seamless loop. ~5 new lines in the existing animate else-branch; same mounted scene, near-zero GPU. `IntersectionObserver` re-pauses (`dataset.paused="1"`) off-screen and on tab hide.
2. **REAL TIME-OF-DAY LIGHT** — `getLightingPreset(resolvedHour)`, 60s auto-tick, 2h blends. Greeting word derived from the same hour.
3. **TRUTH GLOW** — wings the user filled glow via the existing per-wing emissive path (`hoveredRoom`/`highlightDoor` machinery); a memory added today gives that wing's window one soft ~4s gold ember-pulse. Real data, never looping decoration.
4. **LIVE-DATA BEATS** — metadata count-up once on mount via the existing `useAnimatedNumber` hook; On-This-Day surfaces inline in the Reliquary Wall (not a toast).
5. **THE MATCH-CUT (on Enter tap)** — frame un-clips border-radius→0 / inset→0 over ~600ms cubic-bezier while the camera hands from ambient drift into the fly-in; atrium DOM lifts + fades on a 90ms stagger; the existing gold `portalFlash` blooms at the entrance-plane handoff into the Entrance Hall.

**Performance guards:** cap DPR in hero mode (reuse `min(devicePixelRatio, Q.maxPixelRatio)`, `ExteriorScene.tsx:187`); shadows already baked (`shadowMap.autoUpdate=false`); shared `materialCache`/`assetLoader` so no extra texture cost; pause off-screen via IO. **`prefers-reduced-motion`** freezes drift + pulse to a single settle, keeps the correct static day/night frame, and replaces the camera push with a 400ms gold cross-dissolve — motion off, awe and destination intact.

---

## 5. Graphics Rules

- **Type:** Fraunces (`T.font.display`) for the greeting, section headers, tile titles, and museum numerals — solid, never gold-shimmer-clip (flagged off-brand). Source Sans 3 (`T.font.body`) for metadata/stats/eyebrows, `tabular-nums`, letter-spaced uppercase wall-labels.
- **Zero emoji anywhere.** The in-house 24×24 strokeWidth-1.5 SVG set (`WingRoomIcons.tsx` — 6 wing + 18 room glyphs; `TrackIcons.tsx`) is the canonical glyph layer, colored per-wing via the real `wing.accent` hex. **Concrete win:** the Atrium currently leaks raw emoji (`WINGS[].icon`) straight through — render `<WingIcon wingId/>` / `<RoomIcon roomId wingId/>` by id instead. **Net-new:** author 4-5 memory-type glyphs (photo/video/audio/voice/letter) in the identical idiom to retire `MemoryCard`'s emoji fallback (`~L1637/L1798`) and the literal text "25" in `kep_regular`.
- **Colour:** Tuscan warm ladder from `theme.ts` — linen/cream page, charcoal ink, **terracotta (`#B85C38`/`#C66B3D`) as the ONE saturated action color**, **gold (`#D4AF37`) rationed as a deliberate FEATURED accent** (CTA sheen + On-This-Day chips + one hero hairline only — NOT the current gold-on-8-elements dilution). `rustDeep`/`walnut` carries accent text on light. Crucially, the hero's colour is the palace's OWN real-time lighting, so the page is literally tinted by the user's hour.
- **Depth & light:** ONE shared top-left light source across all cards (inner highlight + dual ambient/contact shadow) so cards read as carved stone tiles lit from a single window, not floating glass. One fixed ambient background below the fold (soft radial travertine glow + faint grain + gentle vignette) so cards float on warmth, not flat linen. The hero's top-vignette + terracotta hairline frame it as an aperture into a real place.
- **Cards:** one radius scale (`T.radius`), one shadow token, one border token across ALL sections so the vertical scroll finally reads as a single designed surface, not 12 disparate widgets. Extend `TuscanCard` with a lit `featured` finish.
- **Memory tiles:** overflow-hidden frames, 1.06 parallax inner zoom on hover (photo breathes inside its frame), slow ~9s diagonal gold sheen (lit vitrine). Transform/opacity-only, reduced-motion gated. **Non-negotiable tonal cohesion filter** (sepia + vignette + saturate, from `OTDThumb`) on every real photo so a wall of mixed phone photos reads museum-grade, not cluttered.

---

## 6. New Layout (top to bottom)

1. **THE LIVING THRESHOLD** (hero) — living palace + title lockup + one door. §3.
2. **CONTINUE** (rich state only, when `lastVisitedRoom` exists) — the built last-visited block, promoted to directly under the hero for one-tap resume.
3. **ACT 1 — "Your memories, alive" (THE RELIQUARY WALL)** — the flagship collapse. One horizontally-scrolling gallery of large 3:4 museum-grade tiles: real thumbnail (`thumbnailUrl ?? dataUrl`) under a thin gold hairline on soft cast shadow, sepia/vignette cohesion; imageless memories fill with their own stored hue/s/l gradient + crafted line-glyph (never emoji). **On-This-Day promoted INLINE** as tiles bearing a gold "18 years ago today" chip — anniversaries surface WITH the family's real faces, killing the separate toast. Tiles route via the existing `onMemoryClick`. This sits directly under the hero: living palace, then the family's real faces in gold frames.
4. **ACT 2 — "Your palace is growing"** — `TrackProgress` + `AchievementShowcase` + `InterviewPrompt` collapse into one quiet wing-tinted progress strip (a "Living Ring" / wing-fill), doubling as wayfinding (tap a wing → `switchWing`). No streak pressure for grieving users; motion ambient.
5. **ACT 3 — "Shared with you"** — `SharedRooms` kept, length-guarded (hidden when empty).
6. **ACT 4 — "Discover"** — `FeatureDiscovery` + `PersonaSelector` + `PersonalProfile` demoted to a single low, calm row / "Settings & profile" link.

Every section is length-guarded (extend the existing guards at `HomeView.tsx:845/887`) so an empty widget never re-creates the rejected "plain/basic" wall.

### First-run inversion (0 memories) — "The palace at dawn, waiting for you"
Lift `isFirstRun` (`totalMemories <= 0`, currently local to `AtriumHero.tsx:88`) into `HomeView` to swap the whole page, not just the subtitle. First-run **suppresses Acts 1-3 entirely** (empty widgets are the exact rejected failure). Show: the palace at its BIGGEST and darkest except **one warm breathing window in Roots** (the metaphor taught before any data exists), a greeting ("Welcome to your palace"), and a single generous **"3 ways to begin" trio** (import photos / record a voice memory / one interview question via `startInterviewSession("baseline")`). Primary CTA becomes "Add your first memory"; "Enter Palace" demotes to a quiet chip. **The payoff:** saving the first memory visibly ignites a second window with a ~900ms warm bloom and the headline crossfades to "One memory lit. Your palace remembers." This dignified, non-gamified onboarding loop survives on every tier (poster with one lit window + crossfade) and should ship even if nothing else does.

---

## 7. Fate of All 12 Legacy Widgets

| # | Widget | Fate |
|---|---|---|
| 1 | **Hero** (greeting+stats+CTA) | **REDESIGN** → the Living Threshold (live 3D hero + title lockup + one door). Keeps the once-dead `totalMemories/totalRooms/totalWings` line as the museum metadata. |
| 2 | **Continue where you left off** | **PROMOTE** → directly under the hero when `lastVisitedRoom` exists; one-tap resume. |
| 3 | **RecentMemories** | **MERGE** → backbone of the Reliquary Wall (Act 1). Prefer `thumbnailUrl ?? dataUrl`; slice to 12-16 tiles. |
| 4 | **OnThisDay** | **MERGE + PROMOTE INLINE** → tiles inside the Reliquary Wall with a gold "N years ago" chip; separate toast killed. Optional enrichment layer, never the backbone (frequently empty). |
| 5 | **EnhanceMemories** | **MERGE** → folded into Act 1's gentle "add a memory" affordance / Act 2. |
| 6 | **TrackProgress** | **MERGE** → Act 2 progress strip. |
| 7 | **AchievementShowcase** | **MERGE + DEMOTE** → Act 2 quiet growth; no confetti, no streak flame (already killed for grief-dignity). |
| 8 | **InterviewPrompt** | **MERGE** → Act 2 / first-run "3 ways to begin" trio. |
| 9 | **SharedRooms** | **KEEP** → Act 3, length-guarded (hidden when empty). |
| 10 | **PersonaSelector** | **DEMOTE** → Act 4 "Discover" row. Not first-impression material. |
| 11 | **PersonalProfile** | **DEMOTE** → Act 4 / footer "Settings & profile" link. |
| 12 | **FeatureDiscovery** | **DEMOTE** → Act 4 "Discover" row. |

Net: 12 widgets → 1 hero + 4 calm acts (+ a promoted Continue), all on one designed surface.

---

## 8. Asset Plan

- **`hero-poster.jpg`** (SSR, LCP, every tier) — golden-hour graded still of a representative palace at the exact resting camera pose (framed to the WP1/settle pose so the video/live match). Already shipped (~76KB); verify grade + regenerate at the resting pose via the existing Puppeteer capture pipeline.
- **`hero-bg.mp4` (`-slow` variant)** — mobile/iPad tier loop, muted/`playsInline`/`loop`, ~2MB, framed to the same resting pose. Already shipped. Do NOT autoplay `walkthrough-tour.mp4` (9.4MB) or the 11-12MB masters.
- **Day/night poster grades** — 4 CSS grade overlays (dawn/midday/dusk/night) selected by `resolvedHour`, so video/poster tiers feel lit-for-this-hour. CSS only, no new image assets.
- **4-5 memory-type glyphs** (photo/video/audio/voice/letter) — authored in the `WingRoomIcons` idiom (24×24, strokeWidth 1.5, currentColor), added to a new `MediaTypeIcon` map to retire the last `MemoryCard` emoji.
- **No new 3D assets, no new textures, no second WebGL context.** Reuse `materialCache`/`assetLoader` refcounts. The wow is real-time lighting + real user data, not new geometry.

---

## 9. Build Phases (ordered, each shippable)

**Phase 0 — Foundations & tokens (no visual risk).**
Lift `isFirstRun` into `HomeView`. Add `theme.ts` tokens: shared top-left light shadow, one hairline, one radius, `featured` card finish. Reserve the fixed hero box (explicit aspect / min-height) with the SSR poster painted — kills CLS and the blank→spinner→skeleton cold-load choreography. Ship the poster-only hero + title lockup + one CTA; delete the skeleton gate for the hero region. *Already a visible upgrade over today.*

**Phase 1 — Time-of-day + video tier (highest wow-per-risk, all tiers).**
Bind the hero backdrop grade to `resolvedHour`; sync the greeting time-word. Add the tier-gated `hero-bg.mp4` loop (mobile) with poster fallback, muted/`playsInline`, IO pause off-screen. Reduced-motion/Save-Data/potato → graded poster. Now the home screen is alive and never the same twice on *every* device, with zero live-3D risk.

**Phase 2 — The Reliquary Wall (Act 1, no WebGL, works every tier).**
Collapse RecentMemories + OnThisDay + EnhanceMemories into the one horizontally-scrolling museum wall. `thumbnailUrl ?? dataUrl`, non-negotiable sepia/vignette cohesion filter, hue/s/l + crafted-glyph fallback, inline On-This-Day gold chips, 1.06 hover zoom + ~9s sheen (motion-safe). Answers the "memories buried" audit finding. Ship the memory-type glyphs here; render `WingIcon`/`RoomIcon` by id (retire emoji).

**Phase 3 — Body collapse (Acts 2-4) + first-run inversion.**
Merge remaining widgets into the wing-tinted progress strip (Act 2), length-guarded Shared (Act 3), demoted Discover row (Act 4). Build the first-run "palace at dawn, one lit window" state + "3 ways to begin" trio + the first-memory second-window bloom payoff.

**Phase 4 — Live 3D hero + match-cut (desktop/capable only, the flagship moment).**
Reposition the persistent host from the hero card's `ResizeObserver`'d rect (drive rect synchronously in the existing `useLayoutEffect` at `MemoryPalace.tsx:669` to avoid a full-screen flash on atrium entry). Add ambient orbital drift (~5 lines, animate else-branch). Add the `cinematicEntry` prop + match-cut: radius/inset→0 handing ambient drift into the existing fly-in (`ExteriorScene.tsx:2848-2911`) → `portalFlash` → Entrance Hall. `IntersectionObserver` pauses off-screen. Host stays `pointer-events:none`; the card is the button. Reduced-motion → 400ms gold cross-dissolve. This is the last, highest-risk, highest-awe layer — everything below it already ships value without it.

---

## 10. Risks & Mitigations

- **Sizing race** — host must not paint at `inset:0` for a frame before adopting the card rect on atrium entry. Set rect synchronously in the existing `useLayoutEffect` (`MemoryPalace.tsx:669`).
- **No ResizeObserver today** — atrium scroll/keyboard/orientation resize the card without a window resize. Add an observer or dispatch a synthetic `resize` (existing `onRs` at `ExteriorScene.tsx:3086` refits) or the canvas stretches.
- **Always-live context battery** — keeps the exterior rendering where it was previously paused. Mitigate: DPR cap in hero mode, shadows baked, `IntersectionObserver` → `dataset.paused="1"` off-screen and on tab hide. Desktop/capable only.
- **Pointer conflict** — scene binds `touchmove` with `preventDefault`; keep host `pointer-events:none`, card is the button, so vertical scroll is never hijacked.
- **Layering** — host is z-index:5, below `NavigationBar`(50)/`PalaceSubNav`(42); the card's chrome (border, label, CTA) must render above z:5.
- **`onboardingMode` overload** — it re-seeds the camera + fires the onboarding prompt (`ExteriorScene.tsx:64-71`). Add a dedicated `cinematicEntry` branch; never reuse it.
- **New-user warm scene** — the warm scene only mounts when `hasVisitedPalace` (currently forced `true`); a brand-new user with no palace built falls back to video/poster on any tier. First-run inversion covers this intentionally.
- **iOS autoplay** — muted + `playsInline` required, poster underneath as the guaranteed frame; low-power mode blocks autoplay, so the poster must be beautiful as the true baseline.
- **Dignity** — On-This-Day + a late loved one's photos can surface a hard anniversary; gentle copy, no celebratory confetti, no gamified motion on that surface.
- **Data volume** — `allMemories` iterates every wing/room; memoized, but slice to 12-16 tiles before rendering the wall.
