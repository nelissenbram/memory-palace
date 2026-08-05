# MUSEO VIVO — 3D Overhaul Master Plan

**The Museum of You, at Golden Hour**
Date: 2026-08-05 · Program: 3D environment overhaul (staging-first) · Owner surfaces: www.thememorypalace.ai
Hard constraints: keep raw three.js ^0.183 (no engine swap) · must run on older iPads/phones (60+ audience) · iOS free-tier/IAP seal untouched · ship to STAGING first · incremental deploys over big-bang.

---

## 1. Executive Summary — and the brutal state of today

The landing page sells "3D rooms you walk through, organized by life chapter" and "a cinematic 3D walkthrough with music, atmosphere, and a memory map." The 3D layer currently delivers none of it well. The 2D app was overhauled to a warm cream/ink Tuscan canon and now visibly outclasses the 3D it wraps — the differentiator has become the weak spot.

**What's actually broken (from the audits and critiques):**

- **First impression:** black-void sky until a 6.5MB HDRI loads, then a flyover of a cartoon-yellow (#FFDD78) toy villa, then an intentionally "eerie" 0.7-underexposed hall with full-black blink frames. Silent throughout — the only audio asset 404s. Zero personal content in the first 60 seconds: empty tympanum wreath, disabled busts, colored-box "paintings."
- **Memory presentation (the USP):** photos render as 512×384 canvases stretched onto wrong-aspect planes; on mobile only the top-left quarter of every photo shows and titles draw off-canvas; rooms cap at ~3 visible photos; videos blit at sub-VGA; no captions in 3D.
- **Navigation:** built for a WASD-native gamer, not a 70-year-old. Tutorials teach controls scenes don't implement; doors silently swallow clicks beyond hidden 15m/5m raycast gates; the joystick hides a 3x sprint (up to 12 m/s); movement is synthetic-WASD via a 16ms setInterval; zero prefers-reduced-motion support. Point-to-walk machinery already exists but is wired only to nudge tooltips.
- **Coherence:** exposure whiplash 2.4 → 0.7 → 1.8 → 1.7 at every doorway; tone mapping silently dead; three disagreeing suns; three disagreeing golds; all in-3D type is Georgia/Times/Cormorant, never Fraunces.
- **Performance discipline:** 14+ point lights in the hall, per-door lights, per-frame emissive-lerp over ~1000 cloned materials, ~500 per-patch unique field materials, hundreds of unbatched draw calls; mergeStaticMeshes, KTX2Loader and the textureRes knob are written but have zero call sites.

**Audit scores (0–100; two independent passes per area, averaged):**

| Area | Design | UX | Perf | Code |
|---|---|---|---|---|
| Exterior scene (ExteriorScene + tuscanTerrain + grassShader) | 37 | 52 | 48 | 31 |
| Entrance hall (EntranceHallScene) | 44 | 55 | 48 | 57 |
| Corridor (CorridorScene) | 37 | 53 | 46 | 47 |
| Interior room (InteriorScene + roomLayouts/roomStyles/inlayMeshes) | 36 | 50 | 50 | 41 |
| Orchestrator (MemoryPalace.tsx) | 40 | 46 | 51 | 35 |
| Controls — desktop | 59 | 49 | 65 | 44 |
| Controls — touch | 61 | 58 | 76 | 58 |
| Lighting (4 scenes + daylightCycle + envMaps + postprocessing) | 45 | 44 | 59 | 48 |
| Materials & textures | 47 | 46 | 64 | 55 |
| Postprocessing & atmosphere | 49 | 58 | 65 | 61 |
| Performance systems (lod, geometryOptimizer, mobilePerf, …) | 47 | 46 | 52 | 54 |
| Memory displays (8 display types) | 38 | 48 | 52 | 40 |
| Assets & loading | 37 | 48 | 58 | 62 |
| HUD-over-3D | 67 | 55 | 54 | 50 |
| Visitor 3D routes | 47 | 48 | 52 | 54 |
| **Audio** | **11** | **26** | 66 | 44 |

Nothing scores above the mid-60s on the axes that matter; audio design is an 11 because the palace is literally silent. Memory displays — the product — average 38 design.

**The plan in one paragraph:** Freeze the palace at Tuscan golden hour under one sun and one Neutral grade at exposure 1.15. Turn every photo into a spotlit, aspect-correct, plaqued artwork via one shared `makeArtwork()` module. Make tap-is-travel the only primary input, promote the already-shipped auto-walk machinery into dolly-to-frame and a one-tap Docent Tour. Enforce light/draw-call budgets by a live dev HUD and staging assertions, bake everything that can be baked, and ship it as one atomic cross-scene grade commit followed by per-scene passes behind staging flags — verified on a real A9/A10 iPad and by a 60+ tester before every promotion.

---

## 2. The Chosen Direction

### MUSEO VIVO — The Museum of You, at Golden Hour

**Thesis:** Build the world's smallest great museum — of one life — and freeze it at Tuscan golden hour. Every photo becomes a spotlit, aspect-correct, plaqued artwork on calm cream plaster; one sun, one grade, one tap-to-walk camera. Architecture recedes, light is baked, budgets are law, and the 3D finally delivers what the landing page sells.

### The five pillars

1. **BRIGHTNESS HIERARCHY** — memories are always the brightest pixels. Fix the silently-dead tone mapping with a real ToneMappingEffect (Neutral) in the existing merged EffectPass, exposure ~1.15 everywhere (kills the 2.4/0.7/1.8/1.7 whiplash), HalfFloat buffers, bloom threshold 0.35→0.85 so only picture-lights and gold leaf bloom. Ratios: photo 1.0 > gold frame 0.8 > plaque 0.6 > wall ≤0.5 — floors/walls never drop below 0.5 relative luminance for 60+ eyes.
2. **ONE SUN, ONE GOLDEN HOUR** (graft from L'Ora d'Oro) — collapse daylightCycle to a single authored GOLDEN preset: low SW sun ~#FFB870, warm hemisphere with terracotta ground bounce, procedural golden sky set as scene.background unconditionally at mount (the black-void bug dies), HDRI demoted. Canon-anchored gallery restraint: warm plaster #F2E9DA walls, honed travertine floors with #E3D6BC grout, ink #403B36 trim/plaques, gold #D4AF37 exclusively for frames and the tympanum, ember #B85C38 exclusively as the interactive accent. Every other hue is deleted.
3. **MEMORIES AS AUTHORED ARTWORKS** — one shared `makeArtwork()` module consumed by all four scenes: frame planes sized from texture aspect (never stretch), paintTex fixed to Q.paintingResWidth/Height (unbreaks the mobile quarter-crop), salon-hang walls that scale with collection size, VideoTexture cinema walls, and a brass Fraunces plaque (title + year, ink on cream) under every piece. Owner's name carved in the tympanum and on the bust pedestal — personal content in the first 60 seconds of every scene.
4. **FAKE-BUT-REAL MUSEUM LIGHT UNDER BUDGET LAW** (graft from Affresco) — per artwork, a baked warm light-pool decal on wall+floor plus an emissive picture-light bar: zero per-fragment cost, identical on a 2015 iPad. Hard budgets enforced, not aspired: 2–4 real lights per scene mobile (RectAreaLight wall-washers desktop-only), one static 1024 shadow map (normalBias 0.03, radius 6), ≤150 draw calls mobile via merged static architecture + instancing, warm cached PMREM as primary GI with procedural IBL on potato tier. Dev HUD shows live counts; staging asserts renderer.info.
5. **CURATED CAMERA, NO DRIVING TEST** (graft from La Passeggiata) — tap-is-travel becomes the only primary input: promote the shipped awTarget/CatmullRom machinery, delete distance-gated dead clicks and 16ms synthetic-WASD polling. Comfort caps hard-coded: ≤25°/s yaw, ≤2.2 m/s, easeInOutCubic, eye height locked to the single EYE_HEIGHT constant in cameraComfort.ts (2.0 through Wave 2; 1.65 only when Wave 3 re-authors walk + cinematics + dolly together); prefers-reduced-motion gets crossfades between the same composed shots. Tap any artwork → dolly-to-frame (room dips 15%, plaque brightens); one-tap Docent Tour auto-walks a room chronologically with score. Free-walk survives only as an opt-in "Take the wheel" toggle.

### Dogma (non-negotiable rules)

1. **MEMORIES BRIGHTEST, ALWAYS:** photo 1.0 > gold frame 0.8 > plaque 0.6 > wall ≤0.5 relative luminance; walls/floors never below 0.5 — nothing but picture-lights and gold may bloom (threshold 0.85).
2. **ONE GRADE, ONE SUN:** NeutralToneMapping via a real ToneMappingEffect in the merged EffectPass, exposure 1.15 in every scene, single GOLDEN low-SW-sun preset — per-scene exposure multipliers and second suns are forbidden forever.
3. **CANON PALETTE ONLY:** plaster #F2E9DA, travertine + #E3D6BC grout, ink #403B36 trim/type, gold #D4AF37 for frames and tympanum ONLY, ember #B85C38 for interaction ONLY — any other hue in a 3D scene is a bug (machine-checked by an audit script).
4. **LIGHT BUDGET IS LAW:** 2–4 real dynamic lights per scene on mobile, one static 1024 shadow (normalBias 0.03, radius 6), everything else baked pool decals + emissive fixtures + glow sprites; ≤150 draw calls mobile, enforced by dev HUD and a staging renderer.info assertion.
5. **TAP IS TRAVEL:** point-to-walk/auto-walk is the primary input everywhere; no distance-gated dead clicks, no WASD requirement, no hidden sprint; comfort caps ≤25°/s yaw, easeInOutCubic, eye height = the shared EYE_HEIGHT constant in cameraComfort.ts (2.0 through Wave 2; 1.65 lands only with the Wave-3 cinematic re-author — never mixed within a wave); prefers-reduced-motion gets crossfades between the same shots; free-walk only as opt-in "Take the wheel."
6. **EVERY PHOTO IS AN ARTWORK:** one shared makeArtwork() for all four scenes — aspect-correct plane (never stretch), quality-tiered resolution, brass Fraunces plaque; salon-hang scales with collection size and degrades gracefully when sparse; no photo caps, no blank frames.
7. **ALL 3D TYPE IS FRAUNCES:** baked via document.fonts.load, ink on cream, persistent (never hover-only); the owner's name appears carved in every user's first 60 seconds.
8. **SHIP ORDER IS SACRED:** atomic cross-scene grade/palette/sun commit first, then per-scene behind staging flags; verify each step on a real A9/A10 iPad and with a 60+ tester before promote; iOS free-tier/IAP seal untouched; no big-bang scene replacements.

### Per-scene treatment

**Exterior — the approach shot to a sunlit museum.** One sun only: delete the canvas sun and HDRI sunrise; procedural golden sky as instant background. Regrade #FFDD78 cartoon walls to sun-bleached plaster #F2E9DA reading honey on the lit face, ink-umber in shadow; exposure 2.4→1.15 Neutral. Replace the locked 40–180u orbit with an 18s establishing dolly that flies INTO the low sun — cypress contre-jour, long raking shadows — cresting to the tympanum where the owner's name is carved in Fraunces bronze-on-travertine (~8s in, music from frame one). Dolly ends at eye level before the door; tap door → walk in. Persistent travertine wing signposts in Fraunces ink (delete hover-only Cormorant labels). Cut the Renaissance branch (lines 386–637), buildTower/gothicWindow, statues, dentil boxes, per-patch field materials (→3–4 shared materials + vertex tint, instanced cypresses), and the idle emissive-lerp loop over ~1000 materials.

**Entrance hall — the Rotunda of You: homecoming, not séance.** Exposure 0.7 "eerie"→1.15, vignette 0.7→0.35, terracotta ground bounce. HERO: the empty colored-box "paintings" become the ANCESTRAL WALL — 3–5 of the user's REAL photos, large-format, gold-framed, each with baked pool decal + picture-light bar + Fraunces brass plaque, hung where the oculus shaft falls. One golden oculus beam (delete duplicate dust/beam systems, keep one 150-sprite system) landing as a baked pool on the impluvium; dead teal water → scrolling-normal water shimmering warm. Bust pedestal re-enabled with engraved name plaque. Seven doors lose ALL colored emissive glow: ink casings, brass Fraunces lintel plaques, one warm pool decal each. Light rig: hemi + oculus key spot (the one shadow) + 2 warm points mobile; doorFill/doorFaceSpot/intensity-0 lights deleted. Cinematic 20s→6s push-in, zero blink blackouts, ambient score starts here and never stops. Any door tapped at any distance auto-walks then enters. Hall graph + PMREM cached on mobile so re-entry is instant.

**Corridor — La Passeggiata: a salon-hung gallery corridor swept by the low sun.** Memory clusters on BOTH walls (colonnade side as framed easels), aspect-correct, plaqued; alternating baked light bands every ~4m (gradient floor decals + brightened wall strips — zero dynamic cost) create the rhythmic light/shade pulse of walking a spotlit colonnade, each artwork hung inside its own band. Grade joins the 1.15 golden family so the hall doorway is continuous, not a jump cut. Sconces → emissive fixtures + glow cards; 2 real lights max trailing the camera. Ink-on-travertine room lintels in Fraunces at each doorway, always visible; one low-poly museum bench at the midpoint. Tap a painting → dolly-to-frame; tap a doorway from any distance → walk-then-enter. Joystick feeds the integrator directly as a rail nudge (delete 16ms synthetic-key polling and the hidden 3x sprint).

**Room — the chapter gallery, seeded and grounded.** Furniture recedes: 3–4 seeded, collision-boxed (cheap AABB/circle colliders — no more ghost-walking through sofas) anchor pieces per room type; prop clutter deleted, wall space belongs to the collection. Salon-hang replaces the 3-photo cap: visible frames scale with collection size, quarter-crop bug fixed, every piece plaqued. Videos on a proper cinema wall (quality-tiered 1024/2048 VideoTexture). One authored west window per room with its pool aimed at the primary memory wall: RectAreaLight desktop, emissive window plane + baked floor decal mobile; plus each artwork's pool + picture-light; 2 real lights mobile. Walls #F2E9DA plaster over the leather gentleman's-club set; trim-sheet + KTX2 floors. Tap artwork → dolly-to-frame (room dims 15%, plaque lifts); "Docent Tour" button auto-walks the room chronologically with score. Seeded per-roomId placement — identical every visit. Warm empty state: cream easel reading "Hang your first memory" in Fraunces.

### Signature moments

1. **THE LINTEL (0:08):** the establishing dolly flies into the low golden sun past cypress silhouettes and the owner's name flares in carved Fraunces on the tympanum — "MARIA'S PALACE" in bronze on travertine. Personal before interactive, music from frame one.
2. **THE ANCESTRAL WALL (0:30):** the doors open onto the Rotunda of You — the oculus shaft falls in dusty gold on the impluvium while five of the user's actual photos hang spotlit in gold, each under its own pool of light, their name on the bust pedestal. The first room already contains their life.
3. **DOLLY-TO-FRAME (any tap, anywhere):** the camera glides to museum viewing distance, the room dims 15%, the picture light holds, and the brass plaque reads the memory's title and year. Grandmother's wedding photo finally gets the wedding-photo treatment.
4. **THE DOCENT TOUR (one tap):** the palace walks itself — a chronological auto-glide through the collection with music, pausing at each piece; the corridor leg is a lateral tracking shot past both walls of their photos through rhythmic bands of sun. The promised "cinematic walkthrough with music," requiring zero driving skill from a 75-year-old — and a screen-recordable 20 seconds that IS the marketing video.

### Keeps

- The raw three.js + "postprocessing" single-merged-EffectPass pipeline and SCENE_PRESETS in `src/lib/3d/postprocessing.ts` — extend it (ToneMappingEffect, HalfFloat, warm grade), never replace it.
- The shipped autoWalk/awTarget machinery and CatmullRomCurve3 path code in EntranceHall/Corridor — promoted from nudge-tooltip duty to THE primary navigation and Docent Tour rail primitive (a rail/tour generator from roomLayouts is the one new build for InteriorScene).
- `environmentMaps.ts` cached warm PMREM pipeline + materialCache — primary GI under the golden grade, with per-tier procedural IBL fallback.
- `assetLoader.ts` KTX2Loader + draco wiring and geometryOptimizer/mergeStaticMeshes (written but idle) — ship the .ktx2/ORM conversion and merged static architecture they were waiting for; JPG dual-path kept until KTX2 soaks on staging.
- mobilePerf quality tiers, static shadow autoUpdate=false, scenePreloader, and the 2D cream/ink canon tokens + wings.ts accents as the single source of truth for all 3D materials and re-warmed wing accents.

### Kills

- All dead/dual code: the entire Renaissance era branch (ExteriorScene:386–637), buildTower, gothicWindow, unused lod.ts, duplicate dust/beam systems, minimap dead code, and the day/night cycle — daylightCycle collapses to one GOLDEN preset (API shape kept so call sites don't break).
- The "eerie" identity wholesale: 0.7 underexposure, black blink overlays, the 20s forced cinematic, seven colored emissive door glows, sci-fi orbs and sparkles, vignette 0.7, teal dead water, and the three disagreeing suns.
- The light explosion: per-door PointLights, 7 intensity-0 walkthrough lights, doorFaceSpots, per-frame emissive-lerp hover loops over ~1000 cloned materials, per-patch unique field/vineyard materials — replaced by baked pools, emissive fixtures, glow sprites, shared materials.
- Kit-bashed figurative props and clutter: box-torso statues, sphere lion heads, 23-box dentils, cylinder amphorae, tube garlands, colored-box fake paintings, the leather gentleman's-club interior set — restraint over clutter; nothing primitive pretends to be sculpture.
- Control fear and off-canon type: WASD-as-primary, hidden 3x joystick sprint, 16ms synthetic-key polling, invisible fallback touch zones, 15m/5m distance-gated dead clicks, and every Georgia/Times/Cormorant fillText site + in-scene hovLabel — one Fraunces canvas-label helper (document.fonts.load) feeds all scenes.

---

## 3. Why This Direction (judged alternatives)

Eight visions were scored; MUSEO VIVO ("Museum of You") won at 76/100 and absorbs the best grafts of the runners-up:

| Vision | Score | One-line verdict |
|---|---|---|
| **MUSEUM OF YOU** (chosen, as MUSEO VIVO) | **76** | The only vision that makes the USER'S PHOTOS the hero — everything else in the scene exists to light and frame them. |
| Casa Vissuta — The Lived-In Villa | 75.5 | Warm "lived-in home" texture, but clutter-first — amplifies exactly the kit-bash prop problem the audits condemned. |
| L'Ora d'Oro — Permanent Golden Hour | 75 | Right light, no thesis about memories — **grafted in** as the one-sun/one-grade pillar. |
| La Passeggiata — the palace on rails | 75 | Right camera, thin on presentation — **grafted in** as tap-is-travel + Docent Tour. |
| La Villa Dipinta — Impressionist/Macchiaioli painterly canon | 75 | Beautiful but a full stylized-shading rebuild — too risky on old iPads and off the cream/ink canon. |
| Ora d'Oro — The Villa That Keeps Time | 75 | Doubles down on the day/night cycle the audits show nobody benefits from and old hardware pays for. |
| Affresco — Light Baked Into Plaster | 72 | Right performance doctrine, no emotional spine — **grafted in** as baked pools/emissive fixtures under budget law. |
| Casa Piccola — One Courtyard, Six Rooms | 71 | A spatial re-architecture (content migration, navigation rewrite) that the incremental-deploy constraint forbids. |

MUSEO VIVO = Museum of You's thesis + L'Ora d'Oro's sun + Affresco's baked-light budget law + La Passeggiata's rails. Every graft is proven by an existing subsystem in the codebase (merged EffectPass, awTarget walkers, PMREM cache, mergeStaticMeshes) — no engine work, no new tech risk.

---

## 4. The Twelve Workstreams

Legend: **(P#)** = phase/wave · effort **S/M/L/XL**. File paths are load-bearing — they name the exact edit sites found in the audit.

---

### WS1 — Lighting & color system (all four scenes)

**Goal:** One sun, one golden-hour grade, one canon palette: real Neutral tone mapping at exposure 1.15 in the shared EffectPass, daylightCycle collapsed to a single GOLDEN preset, terracotta-bounce rigs extracted to a shared module, light budgets enforced — so memories are always the brightest pixels on every tier including A9 iPads.

**Steps:**

1. (P1, M) **Real tone mapping in the merged EffectPass** — Append ToneMappingEffect(NEUTRAL) as the LAST effect in the existing single EffectPass in createPostProcessing(); EffectComposer with frameBufferType HalfFloatType (UnsignedByte on potato); ren.toneMapping=NoToneMapping in all four scenes + rendererPool; delete the 2.4/0.7/1.8/1.7 `*dlPreset.exposure` multipliers. Per-scene exposure now forbidden. _Files:_ src/lib/3d/postprocessing.ts; ExteriorScene.tsx:188, EntranceHallScene.tsx:271-272, InteriorScene.tsx:121, CorridorScene.tsx:130; rendererPool.ts:32.
2. (P1, S) **Collapse daylightCycle to one GOLDEN preset (API shape kept)** — sunColor #FFB870, low SW sun, ambient #FFE8CC, new groundBounceColor #A86B4C, warm cream fog; getLightingPreset(hour) returns GOLDEN for every hour; setDaylightHour/getDaylightHour signatures kept so all call sites compile; hide/remove EVERY time-of-day surface, not just the provider — the TopBar daylight control, the settings/profile daylight preference, and the daylight keys in all five locale files (removed or gated) — no now-no-op control may remain visible anywhere. _Files:_ src/lib/3d/daylightCycle.ts; DaylightProvider.tsx; src/components/ui/TopBar.tsx; src/app/(app)/settings/profile/page.tsx; messages/*.json (daylight keys).
3. (P1, M) **Canon palette module + headline wall regrade** — new canon.ts exporting PLASTER/TRAVERTINE_GROUT/INK/GOLD/EMBER, relLuminance(hex), BRIGHTNESS_RATIOS {photo:1.0, frame:0.8, plaque:0.6, wallMin:0.5}. Same commit: exterior cartoon-yellow wall hex + the four scene.background lines → canon plaster/warm fog. _Files:_ new src/lib/3d/canon.ts; the four scene monoliths' headline surfaces.
4. (P1, S) **Bloom 0.85 + vignette 0.35 retune** — luminanceThreshold 0.35/0.4→0.85 in all four SCENE_PRESETS (only picture-lights and gold may bloom, intensity ~0.6); vignette darkness →0.35 everywhere. _Files:_ postprocessing.ts SCENE_PRESETS (49-70).
5. (P1, S) **Golden sky as unconditional background (kill black void)** — scene.background=skyTex at mount for ALL tiers; regrade the procedural sky to golden-hour; demote the 6.5MB HDRI (never block first paint). _Files:_ ExteriorScene.tsx:179-182, :206.
6. (P1, S) **Terracotta ground-bounce pass on all hemisphere lights** — replace hemi ground colors (#8A7858/#C4B8A0/#1A0F05 — the near-black entrance value is a main "eerie" cause) with GOLDEN.groundBounceColor #A86B4C; entrance hemi intensity 0.15→0.4. Steps 1–6 ship as ONE atomic cross-scene commit to staging. _Files:_ the four scenes' hemi lines.
7. (P1, S) **Dev HUD + staging assertions** — ?mp3ddebug=1 overlay: renderer.info calls/triangles + live light count; staging console.warn + PostHog event when mobile tier exceeds 4 lights or 150 draw calls. Lands in wave 1 because it's the measuring stick for everything after. _Files:_ new src/lib/3d/devHud.ts.
8. (P2, L) **Shared createGoldenRig() adopted by all scenes** — hemi + one shadow-casting key directional from GOLDEN.sunPosition + one fill, per-scene variant config; replaces the four inline rig blocks; rig intensities are the only per-scene tuning knob (exposure is fixed). _Files:_ new src/lib/3d/lighting.ts + the four rig blocks.
9. (P2, S) **Shadow softening + frusta tightening** — shadow.normalBias 0.03 + radius 6 on every key light; exterior frustum ±80/far 200 → ~±35/far 120 (2x texel density); one static 1024 map on mobile; remove EntranceHall's second shadow caster on mobile.
10. (P2, L) **Light-budget purge: delete the light explosion** — intensity-0 walkthrough lights, per-door doorFill/doorFaceSpot, per-door hue PointLights, sconce/lamp PointLight swarm — each replaced by emissive fixture + additive glow sprite (baked pools arrive via WS2; sequence per scene behind staging flags so nothing goes dark early). End state: 2–4 real lights per scene mobile, HUD-verified. _Files:_ light-site lists per scene (EntranceHall:969,975,1907; Exterior:2740,2792,963-985; Corridor:763,1279,596-622; Interior:845-1590).
11. (P2, M) **Env maps regraded to canon as primary GI + potato IBL** — kill the greenish ground/blue dome in buildExteriorEnvMap, warm interior env; drive environmentIntensity from GOLDEN; ensure potato tier gets the cached procedural PMREM (currently zero IBL). _Files:_ environmentMaps.ts, materialCache.ts, mobilePerf.ts.
12. (P3, M) **RectAreaLight wall-washers, desktop tier only** — replaces window SpotLight + supplements the oculus; RectAreaLightUniformsLib init once; counts against desktop budget, HUD-verified.
13. (P3, M) **Full non-canon hue sweep + audit script** — scripts/audit-canon-hues.mjs greps 3D sources for hex/hsl literals vs canon allowlist; sweep teal water, hsl() orb/door hues, leather bases. "Any other hue is a bug" becomes machine-checked.

**Acceptance:** all four scenes render through ToneMappingEffect(NEUTRAL) at 1.15 with zero per-scene multipliers and zero ACESFilmic in scene files · golden procedural sky on the first frame (no black void) · walls/floors ≥0.5 relative luminance in screenshot probes; only picture-lights/gold bloom · dev HUD shows ≤4 lights per scene mobile on a real A9/A10 iPad at stable framerate · potato renders via UnsignedByte fallback and now has IBL · phase 1 ships as ONE atomic commit; 60+ tester confirms warmth before phase-2 promotion · no dead time-of-day control visible anywhere (TopBar, settings, locale keys swept) · iOS seal untouched.

**Risks:** HalfFloat buffers add memory pressure on A8/A9 (potato UnsignedByte fallback, A/B on real hardware) · Neutral@1.15 will mis-expose scenes tuned around 0.7–2.4 — retune via rig/env intensities only, budget tuning time in step 8 · step-10 deletions depend on WS2 pools landing — gate per-scene behind flags, never ship half-purged · collapsing daylightCycle no-ops any time-of-day control — product sign-off needed; night visitors now see golden hour.

---

### WS2 — Materials & textures

**Goal:** Every 3D surface reads as the cream/ink Tuscan canon in real materials — sharp floors, real terrain, canon-only palettes — then cut texture payload/memory via KTX2+ORM so old iPads render the same warmth, using the already-wired but dormant loaders.

**Steps:**

1. (P1, S) **Anisotropy + filtering pass in loadPBRSet** — add anisotropy to QualitySettings (8/4/2), apply to diffuse+normal, clamp to getMaxAnisotropy(). Zero anisotropy exists today; grazing-angle floor blur is the most visible cheapness. _Files:_ assetLoader.ts (~L404-423), mobilePerf.ts.
2. (P1, M) **Canon-collapse the palettes actually RENDERED (roomStyles.ts is dead code — delete, don't redesign)** — styleForRoom()'s only occurrence in src is its own export (src/lib/3d/roomStyles.ts:83); WS6-4 deletes roomStyles.ts entirely and no rewrite happens here. The off-canon palettes users actually see (Maritime blue, Art Deco black, Victorian oxblood, gentleman's-club leather) live in InteriorScene's MS/acquireMaterialSet block and the wings.ts accents — WS6-3 owns that regrade; this step deletes the leatherColor/leatherDark consumers in inlayMeshes.ts and verifies every rendered material hue traces to a canon token. Ships as the flagged commit immediately following the atomic grade commit (same day — it creates no cross-scene seam). _Files:_ inlayMeshes.ts, InteriorScene material blocks (with WS6-3), wings.ts.
3. (P1, M) **Real terrain textures replacing tinted plaster** — CC0 Poly Haven grass/soil/dry-field sets into public/textures/pbr; point loadGrassTextures/loadGroundTextures/loadCropTextures (currently all painted_plaster_wall!) at them; noise-mask blend to break tiling. _Files:_ assetLoader.ts (549-563), tuscanTerrain.ts, grassShader.ts.
4. (P1, M) **Collapse per-patch field/vineyard materials** — ~105 per-patch unique MeshStandardMaterials → 3–4 shared cached materials + vertexColors tint; prerequisite for the draw-call budget; coordinate with the WS1 kill of the idle emissive-lerp loop. _Files:_ ExteriorScene.tsx.
5. (P2, M) **KTX2+ORM conversion script** — scripts/convert-ktx2.mjs wrapping toktx: diffuse→ETC1S srgb, normals→UASTC (ETC1S destroys normals), packed ORM via sharp, always --genmipmap, plus 512px potato variants. Verify toktx on Windows. _Files:_ new script, public/textures/pbr/** (14 dirs, 41MB).
6. (P2, L) **Route loadPBRSet through KTX2 with JPG dual-path** — initKTX2Loader(renderer) at renderer creation (zero callers today); try .ktx2, fall back to _1k.jpg; ORM aliased into roughness/ao/metalness maps; verify CompressedTexture clone-sharing on staging before removing any JPG. _Files:_ assetLoader.ts, rendererPool.ts.
7. (P2, S) **Wire the dormant textureRes knob** — extend to "512"|"1k"|"2k", potato→"512"; loadPBRSet derives suffix from getQuality().textureRes; ~8x GPU-memory drop for potato PBR. _Files:_ mobilePerf.ts (118,142,167,188), assetLoader.ts.
8. (P2, M) **Bake proceduralTextures offline, keep runtime fallback** — outputs are seeded/deterministic; puppeteer/dev-route bake → PNG → KTX2; tryLoadBaked(name) with procedural fallback on 404. Kills main-thread per-pixel canvas + Sobel loops at scene entry. _Files:_ proceduralTextures.ts, new scripts/bake-procedural.mjs.
9. (P3, M) **Baked corner AO: vertex AO + junction strips + blob shadows** — applyCornerVertexAO(geometry, boxes) analytic darkening; tiling gradient AO strips at wall-base/cornice; radial-gradient contact shadows under furniture/busts. Grounds interiors where SSAO is off; identical cost every tier. _Files:_ geometryOptimizer.ts, meshHelpers.ts, scene builders.
10. (P3, L) **Tuscan trim sheet for cornice/skirting/casings** — one 1024 tiling sheet (UASTC KTX2) + mapTrimBand(geometry, band) UV helper; InteriorScene first behind a flag, then corridor lintels and hall casings. Replaces the 23-box dentil look. _Files:_ new trim_sheet assets, meshHelpers.ts, inlayMeshes.ts.
11. (P3, L) **Activate mergeStaticMeshes for static architecture** — after palette collapse (shared materials are the precondition), merge per material, keep interactive meshes unmerged for raycasting; InteriorScene first, HUD-verified against ≤150 mobile calls. _Files:_ geometryOptimizer.ts (mergeStaticMeshes L45, zero callers), the four monoliths.
12. (P3, S) **Dead-code cleanup** — delete eraMaterials.ts (only a type import), stand-in loader comments, unused 6.5MB HDRI once WS1 demotes it.

**Acceptance:** real terrain textures, sharp floors at grazing angles on A9/A10 · every material hue traces to a canon token; zero leather/Maritime/Art Deco; roomStyles.ts deleted per WS6-4 (dead code — not redesigned) · KTX2 live with JPG fallback, pbr payload −≥60%, potato loads 512 variants · no scene-entry jank from proceduralTextures · ≤150 draw calls mobile after merging, HUD-asserted · each phase ships independently, iOS seal untouched, old-iPad-verified.

**Risks:** KTX2 async vs loadPBRSet's sync contract — prove pendingClones works for transcoded textures before deleting JPGs, else memory doubles · ETC1S artifacts on smooth plaster; normals MUST be UASTC; A/B on device · palette collapse changes every room at once — ship as the flagged commit immediately following the atomic grade commit (same day), keep a one-commit revert · verify toktx tooling on Windows + CC0 licensing before phase 2 is scheduled.

---

### WS3 — Exterior scene rebuild (the approach shot)

**Goal:** Turn ExteriorScene.tsx from a cartoon-yellow orbit toy over a black-void sky into an 18s golden-hour approach to a canon-plaster museum: one sun, Neutral 1.15, instant procedural golden sky, owner's name in Fraunces on the tympanum, persistent wing signposts, tap-is-travel entrance — under hard mobile budgets on old iPads.

**Steps:**

1. (P1, M) **Tone mapping in the merged EffectPass** (shared with WS1 step 1 — exterior side of the atomic commit; bloom threshold exterior 0.4→0.85). _Files:_ postprocessing.ts.
2. (P1, S) **daylightCycle → GOLDEN** (shared with WS1 step 2). _Files:_ daylightCycle.ts.
3. (P1, M) **Instant golden sky, one sun, HDRI demoted** — NoToneMapping/1.15 at line 188; scene.background=skyTex unconditionally (delete the loadBackgroundHDRI gate at 182 that leaves desktop black until 6.5MB resolves); delete the painted canvas sun (143-165) and stars; paint distant hill silhouettes into the golden sky canvas (replaces the horizon the removed mountains relied on — see comments at 2600/2682). _Files:_ ExteriorScene.tsx:81-206.
4. (P1, M) **Canon palette regrade of all exterior materials** — M.stone #FFDD78 → #F2E9DA (honey comes from the sun, not albedo); tympanum → travertine; ink trim, gold restricted to entrance/tympanum; delete winBlue/copper; retune emissive/envMap intensities tuned for ACES@2.4; warm field tints. Steps 1–3 land inside the atomic grade commit; step 4's material/emissive/envMap retunes ship as the immediately-following exterior-flagged commit the same day (no cross-scene seam). _Files:_ ExteriorScene.tsx M.* block 247-270, 891, 2107-2109.
5. (P2, M) **Kill the Renaissance branch and primitive clutter** — delete isRenaissance (386-637), buildTower, gothicWindow, box-torso statues, dentil loops; pin styleEra "roman"; preserve the click-target contract (centralGroup/centralBodyMeshes/entranceCoreMeshes, 375-379). _Files:_ ExteriorScene.tsx, MemoryPalace.tsx prop plumbing.
6. (P2, L) **Shared field materials + instanced cypresses** — 500 (60 mobile) per-patch materials → 3 shared + instanceColor/vertex tint, merged patch geometry; buildCypress → 2 InstancedMesh LOD tiers. Target ≤150 mobile draw calls. _Files:_ ExteriorScene.tsx 2012-2210.
7. (P2, M) **Delete the emissive-lerp hover system; ember affordance instead** — remove per-section cloned-material lerping over ~1000 materials + per-wing hover PointLights; new affordance = ember highlight on the wing's signpost + ONE reusable hover PointLight (budget: sun + rim + 1 hover = 3). _Files:_ ExteriorScene.tsx 2737-2800, 2987-3035.
8. (P2, M) **Fraunces 3D label helper + owner's name on the tympanum** — new textLabels.ts makeTextPlane() (await document.fonts.load, ink-on-cream + bronze-on-travertine variants, cached); replace the empty wreath with ownerName carved on tymMesh (name already available from useUserStore at line 33). The one shared type primitive all scenes consume. _Files:_ new src/lib/3d/textLabels.ts; ExteriorScene.tsx 882-913.
9. (P2, L) **18s establishing dolly into the low sun** — re-author the 5-waypoint Catmull-Rom: into the SW sun, cypress contre-jour, tympanum beat ~8s, ends eye-level at camD≈35 before the door; easeInOutCubic, yaw ≤25°/s; remove the 1.5s HOLD_DUR interrupt; reduced-motion = crossfade between 3 composed stills; ambient score from frame one (hook to WS10). _Files:_ ExteriorScene.tsx 2848-2920.
10. (P2, M) **Persistent travertine wing signposts** — delete hover-only Cormorant hovLabel + its per-frame projection; in-scene travertine signpost plane per wing (Fraunces ink, always visible) at each wing centroid; 2–3x invisible hit planes for tremor-friendly taps; wing accents from wings.ts re-warmed. _Files:_ ExteriorScene.tsx 227-236, 2946-2985.
11. (P2, S) **Tap-is-travel entrance and doors** — any tap on entrance/signpost at any distance runs the existing camD dolly (__entrance__ path) then fires onRoomClickRef; wheel/pinch zoom stays secondary; verify exterior tutorial copy never says WASD. _Files:_ ExteriorScene.tsx 3084-3102, 2915-2922.
12. (P3, S) **Golden PMREM as primary GI, potato IBL enabled** — warm-grade createExteriorEnvMap; demote loadHDRIProgressive to desktop-idle or delete; flip POTATO so the cheap procedural PMREM runs. _Files:_ environmentMaps.ts:110, ExteriorScene.tsx 197-203, mobilePerf.ts.
13. (P3, L) **Real terrain via KTX2 pipeline** (adopts WS2 outputs) — real grass/dry-field/mud sets, anisotropy 4–8, noise-mask blending; JPG dual-path until soak. _Files:_ assetLoader.ts ~552-574, tuscanTerrain.ts, grassShader.ts.
14. (P3, S) **Budget law: tight shadows + HUD assert** — sun.shadow frustum to villa+road bounds (~±45), normalBias 0.03, radius 6; ?hud=1 overlay + staging console.assert ≤150 calls / ≤4 lights mobile; verify on real A9/A10.

**Acceptance:** golden procedural sky on first frame, desktop and mobile · one grade (Neutral/1.15, single GOLDEN preset, no per-scene multiplier) · walls read #F2E9DA plaster; gold only tympanum/entrance; ember only interactive; Renaissance branch gone · owner's name legible ~8s into the 18s dolly, reduced-motion + skip working · ≤150 calls / ≤4 lights mobile at ~30fps+ on A9/A10 with one static 1024 shadow · tap-anywhere entrance/signposts auto-dolly then enter; no hover-only labels; iOS seal untouched.

**Risks:** steps 1–2 regrade all four scenes — MUST land inside the coordinated atomic commit, never exterior-only · every emissive/envMap intensity was tuned for ACES@2.4 — budget an on-device retune before promoting phase 1 · demoting the HDRI removes the horizon — the sky canvas must paint hill silhouettes or distance reads empty · instancing breaks the per-mesh cloned-material hover contract — step 7 must ship in the same wave or wing hover silently dies.

---

### WS4 — Entrance hall rebuild: The Rotunda of You

**Goal:** Turn EntranceHallScene.tsx (2604 lines) from the "eerie underexposed" séance into a warm golden-hour rotunda where the user's own photos hang spotlit under the oculus, the owner's name is present, doors auto-walk on tap from any distance, and the light/draw-call budget is law on old iPads — shipped incrementally to staging.

**Steps:**

1. (P1, M) **Adopt the golden grade (hall side of the atomic commit)** — kill line 272's `0.7 * dlPreset.exposure`; exposure 1.15 Neutral via the shared EffectPass; vignette 0.7→0.35; bloom 0.25→0.85, intensity 0.9→0.6. _Files:_ EntranceHallScene.tsx:240-294, daylightCycle.ts, postprocessing.ts.
2. (P1, L) **Light-rig diet to budget: 4 real lights, everything else baked** — keep hemi (terracotta ground), oculusSpot (sole shadow caster, normalBias 0.03/radius 6/1024), oculusFill, one warm point. Delete: 7+7 doorFill/doorFaceSpots, per-candelabra/lamp lights, portalLight/Spot, 7 intensity-0 hlDoorLights — each replaced by emissive fixture + glow sprite + warm pool decal (shared CanvasTexture, one material). _Files:_ EntranceHallScene.tsx:361-389, 968-979, 1329-1333, 1601-1607, 1836-1843, 1902-1909.
3. (P1, M) **Doors: de-glow, ink casings, brass Fraunces plaques** — remove colored emissive from door/niche/frame materials + emissive-lerp hover loops; hover = ember outline plane + cursor; new canvasLabel.ts (document.fonts.load, ink on cream) replaces all Georgia/Times fillText; plaques persistent; walkthrough highlight = gold ring decal, no PointLight. _Files:_ EntranceHallScene.tsx:100-134, 804-1052, 1965-1977, 2200-2215; new src/lib/3d/canvasLabel.ts.
4. (P1, M) **Cinematic 20s→6s, zero blinks, reduced-motion** — delete singleBlink/twoBlinks/blinkRef + the #000 overlay div; one 6s continuous push-in to hall center facing the impluvium/Ancestral Wall, yaw ≤25°/s, ends free with doors visible (no forced onDoorClick('roots') at end); reduced-motion = crossfade to the final shot. _Files:_ EntranceHallScene.tsx:1979-2067, 2519-2520, 200-203.
5. (P1, S) **Tap-is-travel: any-distance door tap auto-walks, sprint removed** — promote awTarget (2078-2102): door clicks at ANY distance set autoWalkToRef; speed 5.0→2.2 eased; shift-12 sprint removed; bust 15m gate → walk-then-open; 2.5x invisible hit planes on doors/busts. _Files:_ EntranceHallScene.tsx:2078-2118, 2160-2290.
6. (P2, L) **THE ANCESTRAL WALL: real photos replace Pompeian colored boxes** — new ancestralMemories prop (MemoryPalace selects 3–5 photo memories, favorites/oldest first); replace the 12 Pompeian panels with 3–5 large gold-framed makeArtwork() pieces (aspect-correct, quality-tiered, brass Fraunces plaque, picture-light bar + baked pools), seeded, facing the entrance spawn; zero photos → warm plaster + cream easel "Hang your first memory." _Files:_ EntranceHallScene.tsx:1461-1524, props 137-171; MemoryPalace.tsx:363,519,1214-1222; shared makeArtwork.ts (WS7).
7. (P2, S) **One oculus beam + baked impluvium pool; kill duplicate dust** — delete the 300-particle system + per-frame loop; keep createDustParticles(150) + createLightBeam retinted #FFB870; baked radial pool decal where the shaft lands (zero dynamic cost, works on potato). _Files:_ EntranceHallScene.tsx:578-600, 1711-1733, 1912-1918, 2221-2234.
8. (P2, S) **Warm living water in the impluvium** — keep MeshPhysicalMaterial, warm the tint, tiling normalMap scrolled ~0.02/s (two counter-scrolled layers), envMapIntensity up to catch the golden PMREM. One line in the frame loop, no new lights. _Files:_ EntranceHallScene.tsx:1343-1358.
9. (P2, M) **Owner's name on bust pedestal + re-enabled bust moment** — use the already-written addBust/loadBustModel path instead of the placeholder sphere; engraved Fraunces name plaque on the pedestal face; falls back to plaque alone without a bust model. Personal content in the first 60s even before the Ancestral Wall. _Files:_ EntranceHallScene.tsx:61-95, 1078-1110, 1373-1380.
10. (P2, S) **Continuous ambient score from mount** — the audioRef + ambientPause/Resume plumbing exists but the asset 404s; ship the ≤1MB seamless loop, fade in 2s, survives hall re-entry; footsteps restored behind the existing settings key as follow-up. _Files:_ EntranceHallScene.tsx:197, 234-238; public/audio/*.
11. (P3, M) **Mobile instant re-entry: hall graph + PMREM cached** — extend the desktop persistent-portal idea: cache built scene graph + warm PMREM keyed by wingsFingerprint on mobile (pooled renderer, no second GL context), behind a quality-tier flag; potato keeps current behavior. _Files:_ EntranceHallScene.tsx:223-263, scenePreloader.ts, environmentMaps.ts, rendererPool.ts.
12. (P3, S) **Budget enforcement: dev HUD + staging assertion** (shared with WS11) — warn + PostHog if hall exceeds 150 calls or 4 lights on mobile.
13. (P3, S) **Cleanup tail** — delete unused Pompeian materials, garlands/gold rosettes (owner visual call), off-canon hues (#FF9040, #A42A2E, #C9A961, #2B2B2B); sweep MS materials to canon.

**Acceptance:** hall at 1.15 Neutral, vignette 0.35, walls/floors ≥0.5 relative luminance; no eerie underexposure · ≤150 calls / ≤4 lights / one 1024 shadow (oculusSpot) mobile, 30–45fps stable on A9/A10 per the Section-6 FPS budget (no governor demotion below rung 2; 60fps is the desktop target, not an A9 one) · 3–5 real photos aspect-correct with Fraunces plaques and light pools; empty account = cream easel, never colored boxes · cinematic ~6s, zero black frames, reduced-motion crossfade, ambient audio from mount surviving re-entry · any door/bust tap from any distance auto-walks (≤2.2 m/s) then opens; no dead clicks, no hidden sprint; all in-scene text Fraunces · iOS seal untouched; phase 1 = one commit aligned with the cross-scene grade commit.

**Risks:** phase-1 grade depends on the shared atomic commit — hall must not ship regraded against a cartoon-yellow exterior · Neutral+HalfFloat + persistent renderer add memory pressure on A8/A9 — UnsignedByte fallback + real-hardware test · deleting ~20 lights can flatten the hall if decals/sprites are mistuned for 60+ eyes — tune against the ≥0.5 floor, senior tester before lock · Ancestral Wall needs shared makeArtwork() + a memory-selection query — lazy-load photo textures after first paint with plaster placeholders.

---

### WS5 — Corridor rebuild: La Passeggiata

**Goal:** Turn CorridorScene.tsx from an era-forked, light-exploded hallway with 3 fixed fake paintings into a calm canon-palette gallery corridor: every photo an aspect-correct plaqued artwork inside a baked light band, tap-is-travel everywhere, 2–4 real lights and ≤150 draw calls on mobile, grade continuous with the hall.

**Steps:**

1. (P1, S) **Adopt the shared golden grade** — replace `ACESFilmic; 1.8*dlPreset.exposure` with shared Neutral/1.15; bloom 0.35→0.85, vignette 0.5→0.35; scene.background/FogExp2 from wing.wall → warm plaster #F2E9DA so the hall doorway is continuous. _Files:_ CorridorScene.tsx:124-130, postprocessing.ts:60-64.
2. (P1, M) **Canon palette sweep** — keep per-wing cfg geometry, delete its color table (rugC/rugB/accent) + lunetteColors; rebuild the MS acquireMaterialSet block on canon; delete hsl() mosaic palette and teal/green materials; seed remaining variation from wingId (no Math.random). _Files:_ CorridorScene.tsx:153-228, 250-253, 869, 1072-1117.
3. (P1, M) **Tap-is-travel: kill dead clicks, sprint, 16ms polling** — remove every `hits[0].distance<5` gate; out-of-range taps set autoWalkToRef; generalize the awTarget integrator to {x,z,yaw,onArrive}, 2.2 m/s, yaw ≤25°/s, eased; `keys["shift"]?9:3` → flat 2.2; delete touchTick setInterval + touchKeys, feed touchMoveDir directly per frame; reduced-motion crossfades. _Files:_ CorridorScene.tsx:1534-1562, 1604-1699.
4. (P1, M) **Light-budget enforcement + kill sci-fi effects and duplicate dust** — delete per-door hsl PointLights, intensity-0 hlDoorLights, window sunBeam/fillBeam pairs, chandelier/sconce/lamp/statue/fresco/portal lights, 5 portal fog planes + 56 sparkles, inline rdN=90 dust; keep hemi+sun+fill + ≤2 warm points trailing the camera; emissive fixtures/glow cards compensate; the baked light bands from step 6 (gradient floor decals + brightened wall strips every ~4m — zero dynamic cost) ship in this SAME Wave-1 commit so the corridor never soaks flat or gloomy through the Wave-1 gate; HUD-asserted. _Files:_ CorridorScene.tsx:483-492, 596-622, 763, 914-919, 1254-1352, 1444-1448.
5. (P2, L) **Adopt shared makeArtwork() for painting slots** — replace inline frame boxes; PRESERVE the paintingTextureCache + applyPaintingsRef in-place swap contract exactly (placeholder map keeps USE_MAP defined — no shader recompile); warm cream empty-state easels. _Files:_ CorridorScene.tsx:624-736, shared artwork module, mobilePerf.ts:122-145.
6. (P2, M) **Salon-hang both walls inside the Wave-1 light bands** — colonnade side as framed easels between columns (reuse door/sconce avoidance); count/size scale with collection; the alternating baked bands every ~4m already landed in Wave 1 inside step 4's commit — this step hangs each artwork centered in its band; bands keep ≥0.5 luminance. _Files:_ CorridorScene.tsx:643-709, floor build 233-260.
7. (P2, M) **Fraunces everywhere: door lintels, portal label, wing fresco** — replace all three Georgia fillText sites; always-visible ink-on-travertine lintels above each doorway; restrained wing fresco; portal label cream/ink. _Files:_ CorridorScene.tsx:764-770, 1356-1442.
8. (P2, M) **Dolly-to-frame on artwork tap** — change contract to onPaintingClick(slotKey) (currently dropped); walk to museum viewing distance, dim ~15%, hold picture-light, brighten plaque; any input releases; reduced-motion = crossfade. _Files:_ CorridorScene.tsx:1619-1628, 700-708; MemoryPalace.tsx contract.
9. (P2, M) **Shorten onboarding cinematic** — 8-step ~12.5s scripted sequence → one ~6s push-in past the first light band ending framed on the nearest artwork; keep the onCinematicStep callback shape (MemoryPalace tooltip contract); reduced-motion = static composed shot. _Files:_ CorridorScene.tsx:1475-1533.
10. (P3, L) **Docent Tour rail (corridor leg)** — CatmullRomCurve3 down the corridor center from the salon slots sorted chronologically; lateral tracking shot pausing ~3s per band; score continues from hall; tap exits. The screen-recordable marketing shot — verify 60fps desktop / 30fps A9. _Files:_ CorridorScene.tsx tour block + shared tour generator (WS8).
11. (P3, M) **Kill the Renaissance branch and kit-bash clutter** — delete the styleEra==='renaissance' fork (840-1007), aedicule niches, sphere-head busts/urns, box statues, side tables, potted spheres; keep ONE bench at midpoint; simplify the garden to ground + hedges + instanced cypress contre-jour. _Files:_ CorridorScene.tsx:840-1190, 555-622, 1085-1118.
12. (P3, L) **Merge static architecture + instancing** — hundreds of mk() boxes (herringbone, wainscot, coffers, columns) merged per material via the idle mergeStaticMeshes; columns/capitals as InstancedMesh; interactive meshes unmerged; ≤150 calls verified; dispose sweep confirmed. _Files:_ CorridorScene.tsx:233-439, geometryOptimizer.ts.

**Acceptance:** shared Neutral/1.15 grade, no jump cut hall→corridor; bloom only picture-lights/gold · zero off-canon hues (no hsl(), no cfg color table); walls/floors ≥0.5 luminance · every door/portal/niche/painting responds at ANY distance; no distance<5 gates, no setInterval, no sprint; comfort caps + reduced-motion verified · ≤4 lights / ≤150 calls on A9/A10; applyPaintings in-place swap intact (no recompile stutter) · every photo aspect-correct with Fraunces plaque; salon-hang both walls, degrades to fewer/larger when sparse · staged behind flags, 60+ tester soak, iOS seal untouched.

**Risks:** the ~1600-line mount closure keyed [wingId] — the applyPaintingsRef/paintingTextureCache contracts are load-bearing across wing transitions; makeArtwork adoption must preserve them · light deletion before baked bands reads flat/gloomy — the bands ship INSIDE step 4's Wave-1 commit (never a wave apart from the purge) · cross-WS dependencies (GOLDEN preset, makeArtwork, label helper) — if late, proceed behind a local flag · onPaintingClick/onCinematicStep contracts live in MemoryPalace.tsx + CorridorGalleryPanel slot-key mapping — coordinate before merging phase 2.

---

### WS6 — Room/interior rebuild (InteriorScene + layouts)

**Goal:** Turn InteriorScene.tsx rooms into chapter galleries: every photo an aspect-correct, plaqued, spotlit artwork on canon plaster; salon-hang replacing the 3-photo cap; tap-is-travel with dolly-to-frame and a Docent Tour; light/draw budgets enforced on old iPads — shipped incrementally behind flags.

**Steps:**

1. (P1, S) **Fix paintTex quarter-crop** — replace hardcoded w=512,h=384 with c.width/c.height so drawing matches Q.paintingResWidth/Height (256×192 mobile, 128×96 potato); store natural aspect on tex.userData; Fraunces for the title font. _Files:_ src/lib/3d/textureHelpers.ts (lines 14, 58).
2. (P1, M) **Shared makeArtwork() module** — one factory for all scenes: aspect-correct plane (rescale on load, never stretch), ink frame + gold fillet from cached materials, brass Fraunces plaque canvas, emissive picture-light bar, baked wall+floor pool decals (additive, depthWrite:false); returns {group, planeMesh, plaqueMesh, setDimmed()}; zero dynamic lights inside. _Files:_ new src/lib/3d/makeArtwork.ts.
3. (P1, M) **Canon regrade of the interior material set** — wall→plaster, trim→ink, floor→travertine + grout; delete leather/leatherD/button/brick from visible surfaces; bump msKey so acquireMaterialSet doesn't serve stale palettes; delete the dlPreset min-clamp + 1.7x exposure multiplier when WS1 lands. _Files:_ InteriorScene.tsx MS block 161-199, 110-121; wings.ts.
4. (P1, S) **Kill list: orbs, sci-fi glow, dead code** — delete floating memory orbs + per-orb PointLight (route orb-typed mems to the salon wall/vitrine), doorGlow pulse, xmasTree flourish lights, duplicate raw-Points dust; delete roomStyles.ts entirely (zero importers of styleForRoom); ro1 placeholder → Fraunces ink-on-cream. _Files:_ InteriorScene.tsx:1879-1888, 2109, 1968-1971, 1165-1180; roomStyles.ts.
5. (P1, M) **Replace fireplace/exhibition paintings with makeArtwork** — fireplace big painting, small frame, exhibition placePainting all via makeArtwork(); delete per-painting SpotLights — pools + picture-light bars light art identically on every tier (mobile finally gets lit art). First visible staging win. _Files:_ InteriorScene.tsx:1000-1188.
6. (P2, L) **Salon-hang generator (kill the 3-photo cap)** — salonHang(roomId, layout, mems): wall runs from rW/rL minus door/window/fireplace reserves, seeded by the existing roomId PRNG; 1 photo = one large centered piece, 20+ = dense salon rows; displayUnit routing (screen/vinyl/vitrine/bookshelf) kept explicit; cap live CanvasTextures ~24 mobile. _Files:_ new src/lib/3d/salonHang.ts; InteriorScene.tsx:949-998.
7. (P2, L) **Tap-is-travel + dolly-to-frame** — remove the h.distance<4 click filter (hover-only now); far taps tween posT/lookT to a viewing pose (dist = planeW/(2·tan(fov/2))·1.2, eye = EYE_HEIGHT from cameraComfort.ts (2.0 through Wave 2), eased, ≤25°/s); on arrival dim 15% via setDimmed, brighten plaque, then open panel; delete shift-7.5 sprint; reduced-motion = instant cut + fade. _Files:_ InteriorScene.tsx:2063-2069, 2084, 2201-2206, 2257.
8. (P2, M) **Furniture colliders (no ghost-walking)** — colliders {x,z,hw,hd}[] pushed when building fireplace/sofa/desk/table/piano/bookshelf/vitrine/impluvium; resolve posT with push-out after the wall clamp; auto-walk routes around via one midpoint detour. _Files:_ InteriorScene.tsx movement clamp 2068.
9. (P2, L) **Light budget law + authored window** — replace the ~18 gated Point/SpotLights (desk/oil/vitrine/lamps/sconces/tree/bird) with emissive fixtures + glow cards + baked decals; keep sun (one 1024 static shadow), hemi, fire point, ≤1 more; window = emissive plane + baked floor pool aimed at the primary memory wall, RectAreaLight desktop-only. _Files:_ InteriorScene.tsx:845-1953, windows 1597-1623.
10. (P2, M) **Merge static architecture + draw-call assert** — mergeStaticMeshes on shell + bookshelf books (hundreds of meshes; 16-color palette → vertex colors, one material) + wainscoting; memMeshes/hitAreas unmerged; staging console.assert ≤150 calls mobile. _Files:_ InteriorScene.tsx:1229-1268, geometryOptimizer.ts.
11. (P3, L) **Docent Tour** — generateTour(salonSlots, colliders): chronological poses joined by CatmullRomCurve3 (reuse the corridor awTarget pattern), ≤2.2 m/s, 4s dwell with the dolly/dim/plaque treatment, score via the audio hook; ember "Docent Tour" button (i18n ×5 locales) when a room has ≥3 artworks; Esc/tap cancels. _Files:_ new src/lib/3d/docentTour.ts; InteriorScene.tsx; MemoryPalace.tsx.
12. (P3, M) **Cinema wall quality tiers** — replace the 384×256 canvas blit with quality-tiered THREE.VideoTexture (1024 mobile / 2048 desktop); canvas path only for the idle poster + portrait rotation; idle card cream/ink Fraunces; playlist routing untouched. _Files:_ InteriorScene.tsx:1319-1391.
13. (P3, M) **Layout declutter + seeded anchors + warm empty state** — RoomLayout gains anchors (3–4 collision-boxed pieces per type); delete amphorae/garlands/plant spam; empty room = cream easel "Hang your first memory," tap → __upload__ (existing isStation path). _Files:_ roomLayouts.ts, InteriorScene furniture builders.
14. (P3, M) **Trim sheet + KTX2 floors (polish tail)** — adopt WS2 outputs: KTX2 marble/plaster with JPG fallback, tier anisotropy, trim-sheet bands on skirting/cornice. Purely additive. _Files:_ assetLoader.ts, meshHelpers.ts.

**Acceptance:** every photo full-frame + aspect-correct at 256×192 with a legible Fraunces plaque, verified on real A9/A10 + a regression check · 12+ photos = salon wall, 1 photo = large centered, 0 = cream easel · staging Den on mobile: ≤150 calls, ≤4 lights, exactly one 1024 static shadow · tap anything from any distance auto-walks/dollies within comfort caps; zero dead clicks; no walking through sofas; reduced-motion crossfades · canon-only surfaces matching the 1.15 grade, no jump cut at the corridor doorway · screen/vinyl playlists, displayUnit routing, the exhibition 18-slot wall, and the iOS seal behave exactly as before.

**Risks:** displayFingerprint rebuilds the whole scene; salon-hang multiplies build cost — keep the 800ms debounce, profile on A9 before phase-2 promote · uncapped photos → many CanvasTextures can evict WebGL contexts on 1–2GB iPads — enforce the ~24-texture cap with distance-based downres · acquireMaterialSet caches by msKey — forgetting to bump the key serves stale club-leather; audit releaseMaterialSet · exhibition (Peristylium) shares slot/raycast/video codepaths — smoke-test every phase in a Den-hash room AND the Peristylium.

---

### WS7 — Memory presentation: frames, art lighting, focus mode, video/audio

**Goal:** Make every user memory an aspect-correct, spotlit, plaqued artwork via one shared makeArtwork() across all four scenes; fix the mobile quarter-crop, replace photo caps with salon-hang, upgrade video to real VideoTexture, add dolly-to-frame focus mode — all within mobile budgets on old iPads.

**Steps:**

1. (P1, S) **Fix paintTex quarter-crop and title loss** — c.width/c.height (or one ctx.scale) in paintTex/paintLockedTex; keep title redraw for pre-plaque scenes. _Files:_ textureHelpers.ts. *(Same fix as WS6-1 — one owner, WS7 leads.)*
2. (P1, L) **Build shared makeArtwork()** — plane sized from natural aspect within maxW/maxH (placeholder 4:3 until load), canon gold frame auto-fit, Fraunces brass plaque, emissive picture-light bar, baked pool decals, 2.5x invisible hit plane with userData={memory}; zero dynamic lights. _Files:_ new makeArtwork.ts; textureHelpers.ts; mobilePerf.ts. *(One module shared with WS4/5/6.)*
3. (P1, M) **Adopt makeArtwork in InteriorScene hero spots** — fireplace painting/frame + exhibition placePainting; delete desktop-only per-painting SpotLights. _Files:_ InteriorScene.tsx ~1000-1190.
4. (P1, S) **Tier regression check for paintTex** — jsdom/canvas test at 512×384 / 256×192 / 128×96 asserting full-canvas composition; manual QA entry for real A9/A10. _Files:_ new textureHelpers test.
5. (P2, L) **Salon-hang generator replaces photo caps** — computeSalonSlots reusing the exhibition wall-slot math; painting+frame+photo+orb buckets pooled; count scales with collection, sizes grow when sparse; orb slot + sphere code deleted; seeded from actualRoomId. _Files:_ InteriorScene.tsx SLOT_COUNTS 949-993, orbs 1879-1888; new salonHang.ts. *(Joint with WS6-6 — ONE owner (WS7 leads) and ONE phase: P2/Wave 2, because it depends on makeArtwork, the per-tier texture byte caps, and the ~24-CanvasTexture cap that only exist/soak after Wave 1. Wave 1's memory win is the quarter-crop fix + makeArtwork at hero spots.)*
6. (P2, M) **Corridor slots adopt makeArtwork, both walls** — KEEP the paintingSlots/applyPaintingToSlot uniform-swap cache but extend slot records with a rescale(aspect) hook; second row on the colonnade side as easels; cream empty slots. _Files:_ CorridorScene.tsx:643-736.
7. (P2, M) **Entrance hall Ancestral Wall** — plumb 3–5 starred/oldest photo memories as a prop; replace Pompeian panels with large-format makeArtwork pieces facing the entrance path; click routes to wing or opens the memory. _Files:_ EntranceHallScene.tsx:1461-1523; MemoryPalace.tsx. *(Joint with WS4-6.)*
8. (P2, M) **Focus mode: dolly-to-frame** — focusMode.ts: viewing pose from plane normal (distance = planeHeight·1.4, eye = EYE_HEIGHT from cameraComfort.ts (2.0 through Wave 2)), eased ≤25°/s; dim hemisphere/env 15%, boost that artwork's picture-light; ~1.2s glide, any tap cancels; second tap opens the existing modal; reduced-motion = crossfade; distance<4 dead-click gate removed for artworks. _Files:_ new focusMode.ts; InteriorScene.tsx ~1989-2110.
9. (P2, M) **Video cinema wall via VideoTexture** — THREE.VideoTexture once loadeddata fires; plane from videoWidth/Height letterboxed in the niche; poster/loading canvas kept as initial map; per-frame drawImage deleted; quality-capped decode size. _Files:_ InteriorScene.tsx:1290-1392.
10. (P2, M) **Focus mode + makeArtwork in corridor and entrance** — same focusMode.ts wired to corridor slots and Ancestral Wall pieces, reusing each scene's awTarget integrator so dolly and auto-walk share one camera authority. _Files:_ CorridorScene.tsx, EntranceHallScene.tsx.
11. (P3, S) **Audio memories: plaqued record sleeves** — makeArtwork square variant with mini plaque + play glyph; vitrine PointLights → emissive strip + glow card; vinylAudio/playlist logic untouched. _Files:_ InteriorScene.tsx:1397-1424, 1470-1471.
12. (P3, S) **Warm empty states everywhere** — the #1A1A1A "noVideos" screen and dark stations → cream easel/canvas, Fraunces ink-on-cream "Hang your first memory" (i18n ×5, flat keys); corridor empty slots same. _Files:_ InteriorScene.tsx:1385-1391; CorridorScene emptyGroup.
13. (P3, L) **Docent Tour rail (room leg)** — chronological CatmullRom through focus poses, 4s dwell, big ember button; depends on steps 5+8. *(Joint with WS6-11/WS8-10.)*
14. (P3, S) **Budget assertions on staging** — after salon-hang mounts: assert ≤150 calls, ≤4 lights, artwork texture bytes under tier cap (downgrade oldest to 256px when exceeded).
15. (P2, M) **Visitor-route content parity: the Ancestral Wall for guests** — VisitorPalaceWalk/VisitorPalace mount EntranceHallScene directly (bypassing MemoryPalace.tsx, where the ancestralMemories prop is plumbed), so without this step shared-link guests — whom this plan calls "disproportionately first-time 60+ users" — would see the empty/placeholder wall through Waves 1–2: pass the owner's PUBLIC photos (privacy-filtered per Open Decision 7) as ancestralMemories, or an explicit visitor variant; fewer than 3 public photos → the warm cream empty state, never placeholders. _Files:_ src/app/visit/[userId]/VisitorPalaceWalk.tsx, VisitorPalace.tsx; EntranceHallScene props. *(Joint with WS4-6/WS7-7 — ships in the same Wave-2 hall wave.)*

**Acceptance:** full photo composition on 256×192/128×96 tiers, device-verified · zero aspect distortion across interior/corridor/exhibition/entrance · every visible photo: gold frame + readable Fraunces plaque + identical baked art lighting mobile and desktop (zero per-artwork dynamic lights) · 12+ photos = 8+ framed salon pieces, zero orbs, identical layout every revisit · any-distance tap dollies within comfort caps with 15% dim; reduced-motion crossfade; second tap opens the modal · VideoTexture at native aspect; mobile ≤150 calls / ≤4 lights asserted.

**Risks:** async aspect rescale can pop/overlap frames — makeArtwork reserves maxW/maxH bounds and only rescales within them; corridor cache needs the rescale hook · salon-hang multiplies textures/draw calls on old iPads — per-tier byte caps + shared frame/plaque geometry/materials, promote gated on the assertion · applyPaintingToSlot assumes fixed geometry + uniform-swap-only — keep the slot-cache contract intact · focus dolly can fight joystick/autoWalk — single camera authority per scene, input locked only during glide; dim clamped at 15% with walls ≥0.5 luminance.

---

### WS8 — Camera & controls: comfort model, navigation paradigm, touch parity

**Goal:** Tap-is-travel as the primary input across all four scenes with hard comfort caps (≤25°/s yaw, ≤2.2 m/s, eased arrivals, reduced-motion crossfades); delete dead-click distance gates, hidden 3x sprint, and 16ms synthetic-key polling; promote the shipped autoWalk + useCinematicPath machinery into walk-to and the Docent Tour rail — incrementally, old-iPad safe, staging first.

**Steps:**

1. (P1, S) **Shared camera-comfort module** — cameraComfort.ts: MAX_WALK_SPEED=2.2, MAX_YAW_RATE=25°/s, AUTOWALK_ARRIVE_RADIUS, EYE_HEIGHT=2.0 — THE single eye-height constant that every walk integrator, dolly-to-frame, focus-mode, and tour pose reads (no eye-height literals anywhere else; stays 2.0 through Wave 2 so focus glides never drop the camera 35cm and pop back; flips to 1.65 only in the Wave-3 step that re-authors walk + cinematics + dolly together), easeInOutCubic, clampYawStep(), prefersReducedMotion() singleton, module-level moveInput ref. Pure additive.
2. (P1, S) **Kill hidden 3x sprint, normalize speeds** — delete MobileJoystick line 41 (magnitude>0.7 dispatches 'shift'); hall (shift?12:4), corridor (9:3), interior (7.5:2.5) → flat 2.2. _Files:_ MobileJoystick.tsx; EntranceHallScene:2106; CorridorScene:1557; InteriorScene:2063.
3. (P1, M) **Direct joystick vector feed; delete 16ms polling and hidden corner zones** — joystick writes {x,z} into moveInput; scenes read it in animate() alongside keys (analog magnitude); delete touchKeys + setInterval(...,16) in all three scenes and the invisible rx/ry fallback zones. _Files:_ MobileJoystick.tsx; MemoryPalace.tsx:1434-1440; the three walkable scenes.
4. (P1, M) **No dead clicks: corridor + hall walk-then-enter at any distance** — drop distance<5 filters; far hits set autoWalkToRef (existing integrators walk and fire onDoorClickRef); hover cursor ungated. _Files:_ CorridorScene:1610-1688; EntranceHallScene ~2200-2330.
5. (P1, S) **Comfort caps on all autoWalk integrators** — speed 5.0→2.2 with ease-out over the last 2m; frame-rate-dependent yaw lerp *0.06 → clampYawStep at 25°/s; same caps on the exterior __entrance__ zoom. Steps 1–5 ship together as the phase-1 wave, A9/A10-verified.
6. (P2, L) **InteriorScene walk-to + dolly-to-frame groundwork** — add an autoWalk integrator (straight line, clamped to rW/rL bounds, comfort caps — InteriorScene has none today); far taps compute a viewing pose ~2.2m in front of the artwork along its normal, walk eased, then fire onMemoryClickRef.
7. (P2, M) **prefers-reduced-motion across all 3D cinematics** — static composed shots + 400ms crossfades in the four onboarding cinematics; CRITICAL: still fire onCinematicStepRef callbacks in the same order so CorridorTutorial/RoomTutorial state machines don't break; autoWalk stays (travel, not decoration) with instant-face.
8. (P2, M) **Tutorial copy parity with real controls** — exterior tutorial teaches WASD but the scene is orbit+tap only; rewrite per scene to tap-is-travel language across all 5 locales (FLAT keys per the i18n gotcha), rem units. _Files:_ the four tutorial components + messages/*.json.
9. (P2, M) **"Take the wheel" opt-in free-walk toggle** — default hides MobileJoystick; localStorage-backed toggle in the 3D settings re-enables joystick + WASD emphasis; keyboard walking keeps working silently on desktop. Phase-2 wave gated on a 60+ tester.
10. (P3, XL) **Docent Tour rail generator + player upgrades** — extend useCinematicPath with dwell stops/pause/resume/reduced-motion crossfade mode; tourRail.ts builds CatmullRom + dwell list from roomLayouts placements chronologically; corridor variant = lateral tracking shot; one-tap Tour button; score hooks to WS10.
11. (P3, L) **Exterior establishing dolly** — the 18s authored dolly played through useCinematicPath (keyframes co-designed with WS3); orbit remains available after; reduced-motion = 3 crossfaded stills.
12. (P3, M) **Visitor-route input parity** — port steps 2–6 to VisitorPalaceWalk/VisitorPalace (they duplicate the joystick/keys pattern); guests are disproportionately first-time 60+ users from shares. Input parity only — audio/loading parity is pulled forward to WS9-13 (Wave 1) and Ancestral Wall content parity to WS7-15 (Wave 2). _Files:_ src/app/visit/[userId]/**.

**Acceptance:** zero setInterval input polling and zero synthetic KeyboardEvent dispatch in src/components/3d/* + MobileJoystick (grep-verifiable) · max touch speed 2.2 m/s everywhere; no path reaches 9–12 m/s · any-distance tap on door/portal/artwork produces travel-then-action in all four scenes · measured yaw ≤25°/s with decelerating arrivals (camDebug on real A9/A10) · reduced-motion: no forced pans, all step callbacks still fire, tutorials complete · iOS seal untouched; phase 1 as one wave; 60+ tester pass for phase 2.

**Risks:** hardcoded cinematic waypoints assume current speeds and eye height 2.0 — keep 2.0 until cinematics are re-authored; test each onboarding flow per phase · removing distance gates without colliders lets paths cross furniture — clamp to room bounds now, depend on WS6-8 colliders before phase-2 promote · the joystick refactor touches MemoryPalace + 3 owner + 2 visitor scenes — grep for dispatchEvent(new KeyboardEvent and touchKeys before each merge · reduced-motion skipping onCinematicStep would soft-lock tutorials — contract preserved + staging click-through of all four.

---

### WS9 — Transitions, loading & continuity: 2D→3D and scene→scene

**Goal:** Every passage reads as one continuous golden-hour experience: no black frames ever, one warm veil language, music that starts at first entry and never stops, overlays that lift only onto fully-ready scenes.

**Steps:**

1. (P1, S) **Instant golden sky at exterior mount** — scene.background=skyTex unconditionally before first frame on ALL tiers; demote/delete the 6.3MB HDRI background load. _Files:_ ExteriorScene.tsx:179-206. *(Same edit as WS3-3; lands in the atomic commit.)*
2. (P1, S) **One shared warm clear-color across all four scenes** — GOLDEN_CLEAR exported from the preset; unconditional mount-time background/fog in Corridor (wing.wall today), Interior (#87CEEB exhibition blue), Hall. Kills the hue jump-cut at every seam.
3. (P1, S) **Canonize PalaceLoadingScreen + destination line** — destination prop (wing/room display name), Fraunces ink-on-cream, gradient aligned to canon cream; i18n ×5 flat keys. _Files:_ PalaceLoadingScreen.tsx, MemoryPalace.tsx:1353.
4. (P1, M) **Delete black blink overlays from the hall cinematic** — blinkOpacity, twoBlinks/singleBlink, the #000 div; re-time the look-around. Zero full-black frames in the first minute. *(Same edit as WS4-4.)*
5. (P1, S) **Grade-continuity in rendererPool borrow path** — borrowRenderer hard-resets to ACESFilmic on every borrow; read the canonical toneMapping/exposure from the shared grade module instead. Lands in the atomic grade commit. _Files:_ rendererPool.ts:26-36.
6. (P1, M) **Persistent ambient-audio manager + ship the missing mp3** — module singleton: start on the palace-entry gesture, crossfade on scene change, pause on document.hidden; hall's scene-local Audio block moves into it; ExteriorScene starts it at mount so music plays from frame one. _Files:_ new ambientAudio.ts, public/audio/entrance-ambient.mp3 (currently 404s), EntranceHallScene:2389-2427, MemoryPalace.tsx. *(Joint with WS10-2.)*
7. (P2, M) **Harden the onReady contract: ready = rendered + decoded** — fire onReady only after first frame AND hero textures decoded (2.5s cap so slow networks never hang); extend the "[palace] first frame" timing to all four scenes. Prerequisite for the lighter veil. _Files:_ the four onReady sites.
8. (P2, M) **Golden veil for warm hops; full loading card only when cold** — lightweight cream→gold veil when the target module is warm (scenePreloader isWarm), full destination-labeled card for cold loads; reduceMotion keeps the plain crossfade. _Files:_ MemoryPalace.tsx:1350-1408, PalaceLoadingScreen.tsx, globals.css:190.
9. (P2, S) **Complete the preload map + next-scene asset warming** — add back-paths (room→corridor, corridor→room/entrance, entrance→corridor/exterior); export isWarm(); desktop idle-warms next scene's PBR sets; mobile stays module-only. _Files:_ scenePreloader.ts:22-27, 88-102.
10. (P2, L) **Mobile hall re-entry cache (graph + PMREM)** — module-level cache of the built static hall + PMREM so remount skips the rebuild; behind a kill-switch mirroring mp_no_hall_persist; evict on low-memory/pagehide; target <1s re-entry on A10. *(Joint with WS4-11.)*
11. (P3, M) **Threshold crossfade: walk through the door, then swap** — fadeAtThreshold(cb): auto-walk to the tapped door; when the doorway fills the frame the veil starts, masking the swap — entering feels like walking in, not a cut. _Files:_ palaceStore.ts:75-98 + per-scene door handlers.
12. (P3, S) **Staging transition assertions + timing HUD** — per-transition marks (fade→mount→onReady→lifted) behind a dev flag; warn if >2.5s mobile or onReady never fired. _Files:_ new transitionMetrics.ts.
13. (P1, S) **Visitor-route continuity parity (audio + loading card)** — VisitorPalaceWalk/VisitorPalace (src/app/visit/[userId]/**) lazy-mount ExteriorScene/EntranceHallScene/CorridorScene/InteriorScene directly and bypass MemoryPalace.tsx, where the ambient-audio singleton and the canonized loading card are wired — without this step shared-link guests get a silent palace and old transitions through Waves 1–2: mount ambientAudio start/setScene (WS9-6/WS10-2) and the canon PalaceLoadingScreen (destination variant) in both visitor loaders in the SAME wave those land for owners. _Files:_ src/app/visit/[userId]/VisitorPalaceWalk.tsx, VisitorPalace.tsx.

**Acceptance:** no pure-black frame in any transition on staging; exterior first frame shows the golden sky on every tier; zero blink blackouts · overlays lift via onReady only after hero textures decode; no pop-in after lift (timing HUD on A9/A10) · music starts at first entry, crossfades across all four scenes with zero gaps, no /audio 404s · warm hops show only the ≤1s veil; cold loads show the Fraunces destination card; clear-colors match at every seam · reduced-motion = plain crossfades; kill-switches revert cleanly; iOS seal untouched · visitor routes (VisitorPalaceWalk/VisitorPalace) play the same score and show the same canon loading card as owner routes (WS9-13) · phase-1 steps 1–2, 5 land inside the atomic grade commit.

**Risks:** the lighter veil exposes pop-in the opaque card used to mask — onReady hardening MUST ship before the veil (enforced by phasing + HUD) · iOS WKWebView audio autoplay/interruption/backgrounding can kill or double-start the singleton — key off the entry gesture, pause on visibilitychange, device-test before promote · the hall cache adds resident memory on A8/A9 — kill-switch + evict + A/B before default-on · steps 1/2/5 outside the atomic commit = exactly the regraded-hall-behind-cartoon-exterior whiplash the dogma forbids.

---

### WS10 — Atmosphere, life & sound

**Goal:** Make the palace audibly and atmospherically alive at golden hour: one continuous warm score plus per-scene soundscapes (fixing the silent-palace 404), marble footsteps behind the already-translated settings key, one deduplicated golden dust/beam system per scene, shimmering warm water, drifting birds/mist, deleted sci-fi sparkle systems — all within mobile particle budgets and prefers-reduced-motion.

**Steps:**

1. (P1, S) **Ship the missing audio assets** — CC0 loops (entrance-ambient, palace-score, 4 marble footsteps, fountain, birdsong, roomtone), seamless 30–60s, mono 64–96kbps, ≤800KB each. Creating public/audio/entrance-ambient.mp3 alone makes the hall audible with ZERO code change (EntranceHallScene:2398 already plays it).
2. (P1, M) **Singleton ambient-audio manager** — WebAudio graph (score GainNode + scene-layer GainNode), autoplay-unlock pattern copied from tryPlay, 2s equal-power crossfades, document.hidden pause; MemoryPalace calls setScene(sceneId) so the score survives all transitions. _Files:_ new src/lib/3d/ambientAudio.ts; EntranceHallScene audio block; MemoryPalace ~682. *(Joint with WS9-6.)*
3. (P1, S) **Delete EntranceHall's duplicate dust and beam systems** — remove the 300-pt BufferGeometry system (never per-particle-updated, undisposed) + ConeGeometry beam; keep the atmosphericEffects pair (150 sprites + one beam), retinted warm. −2 draw calls, one leak closed.
4. (P1, M) **Wire footsteps behind the existing dead settings key** — buffer pool of 4 marble samples, round-robin ±5% rate jitter, vol 0.15, triggered every ~0.75m from each scene's movement integrator; toggle persisted mp_footstep_sounds, default ON, surfaced with the orphaned footstepSounds i18n keys (already in all 5 locales — no new i18n).
5. (P1, S) **Warm the fog family to the golden grade** — retint setupAtmosphericFog defaults (greenish-grey → #E8C99A exterior, #EFE3CC corridor/interior); ships in the same wave as the atomic grade commit so fog never disagrees with the sky. _Files:_ atmosphericEffects.ts:168-196.
6. (P2, S) **Kill the sci-fi sparkle/orb systems** — exterior 35 floating additive orbs + corridor 56 portal sparkles deleted; portal keeps the warm glow plane, pulse softened ±0.04→±0.015. _Files:_ ExteriorScene:2695-2701; CorridorScene:1336-1347, 1588-1592.
7. (P2, M) **Warm shimmering impluvium water** — dead teal → canon-warm, small tiling water normalMap scrolled 0.02/s, envMapIntensity 1.4 catching the golden PMREM. *(Joint with WS4-8.)* _Files:_ EntranceHallScene:1341-1358.
8. (P2, M) **Life pass: drifting birds, breathing mist, hearth flicker** — birds translate slowly across sky (skip on reduced-motion); mist slow drift + opacity breathing (every 2nd frame mobile); fireplace emissive flicker + one warm PointLight noise (desktop only; mobile emissive-only per budget law). _Files:_ ExteriorScene:2703-2724; InteriorScene:857-875.
9. (P2, M) **Reduced-motion + particle budget enforcement** — particleMultiplier in QualitySettings (1/0.5/0.25) consumed by every createDustParticles; reduced-motion → static dust/mist/birds/water, frozen pulses. _Files:_ mobilePerf.ts + the three createDustParticles call sites.
10. (P3, M) **Per-scene soundscape layers over the continuous score** — exterior=birdsong+breeze, entrance=fountain+roomtone, corridor=roomtone (reverb tail), room=quiet roomtone; setScene crossfades only the layer bus, the score never interrupts; lazy-fetch, decoded buffers ≤10MB total for A9.
11. (P3, S) **Ducking API** — memory audio/video play → duck ambient to 10% over 400ms, restore on pause/end; tourMode(true) lifts score to 0.45 for the Docent Tour. _Files:_ ambientAudio.ts; RoomMediaPlayer/StoragePlayerPanel/RoomGallery refs.
12. (P3, S) **Audio settings: master volume + music/effects toggles** — slider (mp_audio_volume) + toggles (mp_audio_music, footsteps key), canon styling, i18n ×5; ambientAudio subscribes to storage events for live effect.

**Acceptance:** zero /audio 404s; ambient audible in the hall within 2s of first gesture · score uninterrupted across all four scenes; pauses on document.hidden · footstep toggle live in all 5 locales, persisted · exactly one dust system + one beam in the hall; orbs/sparkles gone; draw calls do not increase anywhere · reduced-motion = static atmosphere; potato = 0.25x particles at target FPS on A9 · memory playback ducks ambient to 10% and restores; iOS seal untouched.

**Risks:** iOS/Safari autoplay policy — the manager must keep the tryPlay unlock pattern and be tested on a real iPad or the palace stays silent exactly where it matters · decoded buffers add RAM on A8/A9 already pressured by HalfFloat — mono/short loops, lazy-decode, release on scene exit, verify no jetsam · 60+ startle/annoyance — defaults low (score 0.3, steps 0.15), mute one tap away, senior approves levels · fog retint must land with the atomic grade commit; orb/sparkle deletion must not race WS7 edits to the same monolith lines — coordinate merge order.

---

### WS11 — Performance & quality tiers: budgets, adaptive quality, monolith refactor, disposal hygiene

**Goal:** Make "budgets are law" real: live perf HUD + staging assertions on renderer.info, one pooled renderer for all four scenes, unified leak-free disposal, shipped mesh-merging to hit ≤150 mobile draw calls, an FPS-adaptive quality governor on top of the static tiers, and an incremental extraction strategy for the four monoliths.

**Steps:**

1. (P1, M) **Perf budget HUD + staging assertion module** — perfBudget.ts: samplePerf(renderer, scene, sceneId) reading renderer.info + visible light count + rolling FPS; overlay behind ?perfhud=1; staging console.error + PostHog on breach (>150 calls, >4 lights, >1 shadow caster mobile). The enforcement backbone every workstream verifies against — lands first. *(Owns the HUD other WSs reference.)*
2. (P1, S) **Move ExteriorScene onto the renderer pool** — replace its private WebGLRenderer with borrowRenderer/returnRenderer (matching Corridor/Interior); kills a context create + shader recompile on every exterior↔hall transition; when the grade commit lands, change the pool's ACESFilmic reset to canonical Neutral+exposure so the pool IS the one-grade enforcer. _Files:_ ExteriorScene.tsx:186, 3145-3152; rendererPool.ts.
3. (P1, M) **Unify disposal into one exemption-aware helper** — disposeSceneGraph(scene, {cachedTextures, cachedMaterials}) disposing ALL texture slots (Exterior's inline version misses aoMap/alphaMap/envMap/lightMap/bumpMap and skips the cached-material exemption); swap all four cleanup traversals; HUD flags memory growth across 3 scene cycles as a leak. _Files:_ geometryOptimizer.ts; the four cleanup blocks.
4. (P1, S) **Delete 16ms synthetic-key polling; integrate joystick in animate** — remove the three setInterval(touchKeys,16) timers; read the joystick vector in each animate() movement block scaled by dt; drop the magnitude sprint; cap 2.2 m/s. *(Same edit as WS8-2/3 — one owner, WS8 leads; WS11 verifies.)*
5. (P1, M) **Ship mergeStaticMeshes: Corridor + Interior static architecture** — after optimizeMaterials() (already called), merge static walls/floors/trim/columns per material; exclude raycast targets and animated meshes; verify the draw-call drop on the HUD; ≤150 mobile target. These scenes first — no per-mesh wall hover state.
6. (P2, L) **Exterior per-section merge + hover-material diet** — merge each sectionGroup per shared material (isolation preserved via section id) so hover needs 1–3 material instances, not hundreds; gate the emissive-lerp block on an activity flag. Biggest draw-call and per-frame CPU win in the first scene. _Files:_ ExteriorScene.tsx:2771-2782, 2987-3035, ~386-1100.
7. (P2, L) **Adaptive quality governor with persisted demotion** — rolling 3s FPS; <45fps sustained → ladder: (1) pixel ratio −25%, (2) SMAA off, (3) shadows 1024→512, (4) shadows off; one-way ratchet, 10s hysteresis, live where possible; persisted per renderer string so an A9's second visit starts correct; never below potato floor, never upgrades mid-session. _Files:_ new adaptiveQuality.ts; mobilePerf.ts.
8. (P2, S) **HalfFloat/UnsignedByte framebuffer plumbing** — QualitySettings.halfFloatBuffers (desktop/mobile true, potato false) → EffectComposer frameBufferType. WS11 owns the tier switch and the A8/A9 fallback the risk list demands; governor may drop halfFloat as rung 5. _Files:_ postprocessing.ts, mobilePerf.ts.
9. (P2, S) **Activate the dormant textureRes knob with a 512 tier** — tier plumbing + graceful 404→1k fallback so it ships before all WS2 variants exist. _Files:_ mobilePerf.ts:118; assetLoader loadPBRSet.
10. (P3, L) **Extract shared walk/look controls module** — createWalkController({bounds, eyeHeight, maxSpeed:2.2, maxYawRate}) returning {update(dt), setJoystick(v), autoWalkTo(curve)}; adopt scene-by-scene (one scene per commit, behavior-identical); the refactor beachhead WS8's dolly/Docent rail builds on; comfort caps enforced in exactly one place. _Files:_ new controls.ts; the three walkable scenes' integrator blocks.
11. (P3, XL) **Extract architecture builders; monoliths become mount shells** — buildVilla/buildHall/buildCorridor/buildRoom returning {group, clickTargets, animated, disposables} with zero React/refs; mount effects shrink to borrow-build-wire-animate-dispose; one scene per PR, ordered Corridor→Interior→EntranceHall→Exterior; enables headless draw-call unit tests; no behavior change permitted per commit. _Files:_ new src/components/3d/builders/.
12. (P3, S) **Dead-code deletion sweep** — delete lod.ts entirely (zero call sites), superseded inline disposal, unused touchKeys plumbing; audit remaining setIntervals (mediaPoll legitimate); single deletion PR with bundle-size before/after.
13. (P1, S) **Staging-flag mechanism: flags3d.ts** — the ship order leans on "behind staging flags" ~15 times but no step built the mechanism: src/lib/3d/flags3d.ts exports named boolean flags (FLAG_HALL_LIGHT_DIET, FLAG_CORRIDOR_SALON, …) with env-derived defaults staging=ON / prod=OFF, a `?flag3d=name` / `?flag3d=!name` query override persisted to localStorage for on-device QA, and read-at-mount semantics (the four monoliths' mount effects re-run via remount on change — no hot-toggling inside a mounted scene). Per-wave flag retirement is mandatory — see the flag rule in Section 5. Lands in Wave 1 alongside the perf HUD. _Files:_ new src/lib/3d/flags3d.ts.

**Acceptance:** ?perfhud=1 shows live calls/triangles/lights/FPS in all four scenes; staging logs PostHog + console.error on budget breach · exterior↔hall reuses the pooled renderer (programs count stable, no context loss) · three full scene cycles leave renderer.info.memory flat (± cached sets) · Corridor + Interior ≤150 mobile calls after merging, device-verified · no setInterval movement; joystick dt-integrated, sprint gone, 2.2 m/s cap · on a throttled device the governor steps down within ~15s, recovers 45+ fps, demotion persists to next visit.

**Risks:** mergeStaticMeshes can break raycast/hover contracts — merge only explicitly-tagged static meshes; Exterior per-section merge stays phase 2 behind a flag · renderer pooling changes per-scene state assumptions — land coordinated with the grade commit or scenes re-assert state on borrow · governor oscillation/over-demotion reads as "the app got blurry" to 60+ users — one-way ratchet + hysteresis + potato floor + A/B on real A9 · monolith extraction risks subtle regressions in 10k lines of minified effect code — one-scene-per-commit, staging soak per commit, HUD/leak assertions as tripwire.

---

### WS12 — HUD/2D-over-3D alignment + accessibility

**Goal:** One reduced-motion source of truth honored by all four scenes (crossfaded stills, zero black blink frames), comfort-capped movement with the hidden sprint deleted, tutorial copy that never teaches controls a scene lacks, and every HUD surface over the canvas aligned to the cream/ink canon, safe-area insets, and a documented z-layer map.

**Steps:**

1. (P1, S) **Centralize reduced-motion detection** — prefersReducedMotion() in mobilePerf.ts (cached matchMedia + subscription, SSR-safe); refactor the two existing independent reads (MemoryPalace:140-148, TouchControlsOverlay:32-36) so 2D and 3D can never disagree.
2. (P1, M) **Gate 3D cinematics behind reduced-motion with cream crossfades** — skip the entrance look-around and exterior flyover; set camera to the final composed shot and fade via a 400ms cream (#FCFAF5, never black) overlay; PRESERVE the onboarding contract — the reduce path must still run skipCinematic()'s onDoorClickRef('roots') branch (EntranceHallScene:2505-2514); gate idle drift too.
3. (P1, M) **Delete blink blackouts; restyle Skip to ember-on-cream** — remove the blink timeline + #000 overlay for ALL users (photosensitivity + comfort); Skip becomes a large ember-on-cream pill (≥3rem, bottom-right above safe-area), visible from frame one. _Files:_ EntranceHallScene:1982-2059, 2520, 2579-2596. *(Same edits as WS4-4/WS9-4 — WS4 leads.)*
4. (P1, S) **Kill hidden 3x sprint and cap walk speed** — *(same as WS8-2 — WS8 leads; WS12 requires it lands BEFORE the joystick-integrator rewrite so it rebases cleanly)*; keyboard Shift at most 1.5x desktop-only.
5. (P1, S) **Tutorial truth pass across 5 locales** — palaceTour.dStep1Body teaches "WASD or arrow keys to walk" but ExteriorScene is orbit-only; audit every tour/hint key against each scene's actual inputs (corridor/interior DO map WASD via _cMap); update all 5 locale files together. *(Joint with WS8-8.)*
6. (P2, M) **Comfort caps module** — comfort.ts: YAW_MAX 25°/s, MOVE_MAX 2.2, EYE_HEIGHT (the single constant from WS8-1: 2.0 through Wave 2, 1.65 only with the Wave-3 cinematic re-author), easeInOutCubic; clamp per-frame yaw in all authored motion; user drag-look stays uncapped (self-paced). The contract WS8 and the Docent Tour consume. *(Merge with WS8-1 cameraComfort.ts — one module.)*
7. (P2, M) **HUD z-layer map + safe-area alignment** — codify ad-hoc zIndex values (45 portal, 46 hints, 47 joystick, 52/88-100 panels) into named tokens (Z.scene/hint/control/panel/modal); env(safe-area-inset-bottom) on WingTooltip/DoorTooltip; stagger DoorTooltip vs TouchControlsOverlay so they never stack. _Files:_ libraryTokens.ts, MemoryPalace.tsx:1359-1727, HoverTooltip.tsx, MobileJoystick.tsx, TouchControlsOverlay.tsx.
8. (P2, S) **Canonize the exterior hover label** — keep the project()+clamp positioning; restyle to cream/ink/hairline canon. Interim until WS3's persistent signposts delete hovLabel entirely.
9. (P2, L) **Shared Fraunces canvas-label helper for in-scene type** — drawLabel(canvas, {title, sub}): await document.fonts.load('600 38px Fraunces') with 2s timeout + repaint-on-load, ink-on-cream, ALL coordinates from canvas.width/height (kills off-canvas text at low tiers); replace the ~15 Georgia/Times fillText sites. *(One helper with WS3-8/WS4-3 — single owner.)*
10. (P3, M) **Dev perf/accessibility HUD** — PerfHUD.tsx behind ?mpdev=1: calls/triangles, light count, FPS, GPU tier, reduced-motion state; staging warn >150 mobile calls; follows the existing camDebug portal pattern. *(Merges with WS11-1 — one HUD.)*
11. (S) **Contrast + senior verification pass — SPLIT across waves** — (a) P1/Wave 1: the automated contrast probe (screenshot relative-luminance ≥0.5 for walls/floors + WCAG AA 4.5:1 for HUD text and baked labels over representative frames) runs as part of the Wave-1 promotion gate — the grade commit changes every luminance in the app and the #1 program risk (gallery drama vs 60+ eyesight) must be measured the wave the change lands, not two waves later; (b) P3/Wave 3: the full scripted on-device senior session (A9/A10 iPad, one 60+ tester, OS reduce-motion both states) remains the staging→prod gate.
12. (P3, S) **Close the "memory map" landing-page promise** — the landing page sells "a cinematic 3D walkthrough with music, atmosphere, and a memory map"; music (WS10), atmosphere (WS1/WS10) and walkthrough (Docent Tour) are covered, but no step delivers a memory map (WS1's Kills only delete minimap dead code). Resolution: the existing 2D Memory Map feature fulfills the promise — add a canon-styled map entry to the 3D HUD (and the Docent Tour UI) linking to it; if the owner judges that insufficient, the upgrade path is a plaqued villa floor-plan in the entrance hall (owner call, Wave 3).

**Acceptance:** with OS reduce-motion on: no involuntary camera animation anywhere; cinematics = cream-crossfaded stills; onboarding still opens the roots door; prefersReducedMotion referenced in all four scenes · zero full-black frames; Skip is an ember pill ≥3rem · full joystick pull ≤2.2 m/s; no synthetic 'shift' ever dispatched · no tutorial string in any locale describes a control its scene lacks · all HUD surfaces on canon tokens, named Z tokens, safe-area insets; no Georgia/Times/Cormorant fillText remains · ?mpdev=1 HUD live; A9/A10 + 60+ tester session signed off before prod.

**Risks:** sequencing collision with WS8 (tap-is-travel deletes the polling MobileJoystick feeds) — land sprint removal + comfort module first as the shared contract · speed cap without tap-to-walk yet makes corridors feel slow — acceptable interim, but ship close to WS8's auto-walk promotion · Fraunces font-load races bake fallback-serif into textures — timeout + repaint-on-load + 256×192 regression test · blink/cinematic removal touches first-login onboarding tri-state — cover both onboarding paths on staging before promote.

---

## 5. Phasing — Three Waves

Shared-edit dedup rule: where two workstreams name the same edit (paintTex fix, blink deletion, sprint removal, HUD, label helper, ambient audio), ONE workstream owns the code (named in each step) and the other verifies. Effort totals below count each edit once.

Flag rule: every "behind a staging flag" in this plan uses the ONE mechanism in flags3d.ts (WS11-13) — named flags, staging-ON/prod-OFF defaults, `?flag3d=` override, read at scene mount. Flag retirement is part of each wave's exit: before a wave promotes, the previous wave's flags are deleted and their code paths made unconditional; no wave promotes with more than its own flags live.

### Wave 1 — "The Atomic Golden Hour" (first staging release; biggest visible wins)

**Contents (all P1 steps):**
- **The one atomic cross-scene commit (the seam-visible grade contract ONLY):** ToneMappingEffect Neutral @1.15 + HalfFloat/UnsignedByte plumbing, GOLDEN daylight preset, canon.ts tokens + the exterior headline wall hex (cartoon yellow → plaster), bloom 0.85 / vignette 0.35 presets, unconditional golden sky (black void dies), terracotta hemi bounce, warm fog retint, rendererPool grade-continuity, shared warm clear-colors. **Exact file list:** src/lib/3d/postprocessing.ts, daylightCycle.ts, canon.ts (new), rendererPool.ts, atmosphericEffects.ts (fog defaults) — plus ONLY the toneMapping/exposure lines, scene.background/fog/clear-color lines, hemi ground-color lines, and the headline exterior wall hex inside the four scene monoliths. One-commit revert path. (WS1-1..6, WS3-1..3, WS4-1, WS5-1, WS9-1/2/5, WS10-5)
- **Same-day follow-up commits, per-scene behind flags (deliberately NOT in the atomic commit — they create no cross-scene seam and would scope-creep it toward the forbidden big-bang):** exterior emissive/envMap/material retunes (WS3-4), interior canon palette regrade (WS6-3), corridor canon palette sweep (WS5-2), inlayMeshes/rendered-palette verification (WS2-2).
- **Enforcement first:** perf HUD + staging assertions, staging-flag mechanism flags3d.ts, Exterior onto the renderer pool, unified disposal, reduced-motion singleton, automated contrast probe wired into the Wave-1 gate. (WS11-1..3, WS11-13, WS1-7, WS12-1, WS12-11a)
- **Control mercy killings:** sprint deleted, speeds → 2.2, direct joystick vector (no 16ms polling, no hidden zones), no-dead-clicks walk-then-enter in hall + corridor, comfort caps on all autoWalk integrators, tutorial truth pass. (WS8-1..5, WS12-4/5)
- **First-minute dignity:** hall cinematic 20s→6s with zero blinks + ember Skip, hall light-rig diet + door de-glow + Fraunces plaques, duplicate dust/beam deleted, canonized loading screen. (WS4-2..5, WS12-2/3, WS9-3/4, WS10-3)
- **Sound exists:** audio assets shipped (the 404 dies), singleton ambient manager, footsteps behind the existing key, visitor loaders mount the same singleton + canon loading card. (WS10-1/2/4, WS9-6, WS9-13)
- **Memory groundwork:** paintTex quarter-crop fixed + tier regression test, makeArtwork() built, adopted at InteriorScene hero spots, corridor light purge + baked light bands (one commit), interior kill list, anisotropy, real terrain textures, shared field materials, Corridor+Interior mergeStaticMeshes. (WS7-1..4, WS6-1/2/4/5, WS5-3/4, WS2-1/3/4, WS11-4/5) — salon-hang (WS7-5/WS6-6) moves wholly to Wave 2: it depends on makeArtwork, the texture byte caps, and the ~24-CanvasTexture cap that only soak in Wave 1.

**Effort:** ~29 unique steps; mostly S/M with 3 L (hall light diet, makeArtwork, field materials). Roughly **35% of total program effort**. Ship as: 1 atomic grade commit (exact file list above) → same-day per-scene regrade commits behind flags → the remaining per-scene P1 passes behind staging flags in quick succession.

**Wave 1 demo checklist (staging, real A9/A10 iPad + one 60+ tester):**
- [ ] First frame of the exterior shows the golden sky — no black void, any tier
- [ ] Walk exterior→hall→corridor→room: no exposure/hue jump cut anywhere (one grade)
- [ ] Hall is warm, not eerie; zero black blink frames; cinematic ≤6s; ember Skip visible
- [ ] Music plays from first entry and never stops; footsteps audible; no /audio 404
- [ ] A photo memory on mobile shows the FULL photo, aspect-correct, with a Fraunces plaque
- [ ] Tap a door from across the hall/corridor → the camera walks there and enters (no dead click)
- [ ] Full joystick pull = calm 2.2 m/s; no sprint
- [ ] ?perfhud=1: ≤4 lights and ≤150 draw calls in hall/corridor/interior mobile; no leak across 3 scene cycles
- [ ] Automated contrast probe passes: walls/floors ≥0.5 relative luminance, HUD text/baked labels 4.5:1 AA (WS12-11a)
- [ ] A visitor share link plays the same music and shows the canon loading card (WS9-13)
- [ ] OS reduce-motion: no forced pans, tutorials still complete
- [ ] iOS free-tier/IAP seal diff-checked: untouched

### Wave 2 — "The Museum Opens" (personal content + tap-is-travel completeness)

**Contents (all P2 steps):** Ancestral Wall + bust/name plaque + living water + oculus pool + ambient continuity + visitor Ancestral Wall parity (WS4-6..10, WS7-7, WS7-15); owner's name on the tympanum + Fraunces textLabels + Renaissance kill + instanced cypresses + emissive-lerp deletion + 18s dolly + persistent signposts + tap-is-travel entrance (WS3-5..11); corridor makeArtwork + salon-hang both walls (light bands landed in Wave 1) + lintels + dolly-to-frame + 6s cinematic (WS5-5..9); interior salon-hang + walk-to/dolly + colliders + light budget/window + merge/assert (WS6-6..10); salon-hang generator + focus mode + VideoTexture + cross-scene focus (WS7-5/6/8/9/10); reduced-motion cinematics + "Take the wheel" toggle + InteriorScene walk-to (WS8-6..9); golden rig + shadow tightening + light purge + env regrade (WS1-8..11); KTX2 script + loadPBRSet routing + textureRes + procedural baking (WS2-5..8); onReady hardening + golden veil + preload map + mobile hall cache (WS9-7..10); sparkle kill + life pass + particle budgets (WS10-6..9); Exterior merge + adaptive governor + HalfFloat plumbing (WS11-6..9); z-layer map + safe-area + hover label + canvas-label sweep + comfort module (WS12-6..9).

**Effort:** ~45 unique steps, M/L-heavy (8+ L). Roughly **40–45% of program effort**. Ship per-scene behind flags: hall wave (Ancestral Wall) → exterior wave (dolly + name) → corridor wave (salon) → interior wave (salon + focus) → infra waves (KTX2, governor, veil), each with its own staging soak.

**Wave 2 demo checklist:**
- [ ] New-user first minute: name on the tympanum by 0:08, Ancestral Wall with their real photos by 0:30
- [ ] Tap any artwork anywhere → dolly-to-frame, 15% dim, plaque readable; second tap opens the memory
- [ ] A 12-photo room shows a salon wall; a 1-photo room shows one large piece; 0 photos shows the cream easel
- [ ] Corridor: photos on both walls inside rhythmic light bands; no hsl() hues anywhere
- [ ] Videos play sharp (VideoTexture) at native aspect on the cinema wall
- [ ] No ghost-walking through furniture; joystick hidden by default, "Take the wheel" works
- [ ] KTX2 live with JPG fallback; pbr payload −60%; potato loads 512 tier
- [ ] Warm hops show the ≤1s golden veil; cold loads show the destination card; hall re-entry <1s on A10
- [ ] Adaptive governor demotes a throttled device within ~15s and persists
- [ ] 60+ tester approves warmth, readability, audio levels before any promote

### Wave 3 — "The Palace Walks Itself" (tour, polish, refactor)

**Contents (all P3 steps):** Docent Tour (rail generator + room leg + corridor tracking shot + score/ducking + Tour button) (WS8-10, WS6-11, WS7-13, WS5-10, WS10-11); exterior authored dolly through useCinematicPath + terrain KTX2 + PMREM/potato IBL + budget shadows (WS3-12..14, WS8-11); corridor Renaissance/clutter kill + static merge (WS5-11/12); interior cinema tiers + declutter/anchors + trim/KTX2 tail (WS6-12..14); audio sleeves + empty states + budget asserts (WS7-11/12/14); RectAreaLight washers + full hue sweep/audit script (WS1-12/13); corner AO + trim sheet + mergeStaticMeshes completion + dead-code cleanup (WS2-9..12); threshold crossfade + transition metrics (WS9-11/12); soundscape layers + audio settings (WS10-10/12); walk-controller extraction + builder extraction + deletion sweep (WS11-10..12); visitor-route input parity (WS8-12); PerfHUD merge + the scripted on-device senior session (the automated contrast probe already ran as the Wave-1 gate) + memory-map HUD link (WS12-10, WS12-11b, WS12-12).

**Effort:** ~35 unique steps including the two big refactors (XL builder extraction, XL tour system). Roughly **25% of program effort** for the product-visible half; the monolith extraction is a background track that can trail into subsequent cycles.

**Wave 3 demo checklist:**
- [ ] One tap on "Docent Tour": the room walks itself chronologically with music, pausing at each piece; corridor leg is the lateral tracking shot — screen-record 20s and it looks like the marketing video
- [ ] Exterior 18s establishing dolly into the sun, tympanum beat at ~8s, reduced-motion stills variant
- [ ] Walking through a door = walk-then-veil-then-arrive (no jump cut)
- [ ] scripts/audit-canon-hues.mjs passes: zero off-canon hues in 3D sources
- [ ] Visitor routes have full input parity (speeds, no dead clicks, reduced-motion)
- [ ] Per-scene soundscapes layered over the never-stopping score; volume settings live
- [ ] renderer.info flat across all scenes; lod.ts and all dead code gone; bundle-size delta reported
- [ ] Final senior + WCAG AA pass signed off; promote to prod

---

## 6. Performance Budgets & Quality Tiers

**Budgets (LAW — enforced by dev HUD `?perfhud=1` and staging assertions with PostHog events, not aspiration):**

| Budget | Mobile tier | Desktop tier | Potato tier |
|---|---|---|---|
| Target framerate | **45+ fps sustained (A10-class); 30fps floor on A9** — sustained <45fps triggers the governor, below-30 is a promotion blocker | 60fps | 30fps floor |
| Real dynamic lights per scene | **2–4** | 4–6 (+ RectArea washers) | 2 |
| Shadow-casting lights | **1** (static 1024, autoUpdate=false, normalBias 0.03, radius 6, tight frusta) | 1 (PCFSoft, 1024–2048) | 0–1 |
| Draw calls | **≤150** (merged static architecture + instancing) | ≤300 | ≤100 |
| Composer buffers | HalfFloat | HalfFloat | **UnsignedByte** |
| Texture resolution | 1k KTX2 | 1k–2k | **512 KTX2** (textureRes knob) |
| Painting canvases | Q.paintingResWidth/Height (256×192), ~24 live CanvasTextures cap, distance-based downres | 512×384+ | 128×96 |
| Particles | 0.5× multiplier | 1× | 0.25×; one 150-sprite dust system + one beam max per scene |
| Video | 1024 VideoTexture | 2048 VideoTexture | poster only if needed |
| Decoded audio | ≤10MB total, mono, lazy per scene | same | same |
| Anisotropy | 4 | 8 | 2 |
| IBL | cached warm PMREM | PMREM (+ optional HDRI idle-load) | **procedural PMREM (currently zero — fixed)** |

**Everything else is baked:** pool decals (wall+floor per artwork), emissive picture-light bars, emissive fixtures + additive glow sprites/cards, gradient light bands, vertex/strip AO, blob contact shadows, baked procedural textures.

**Adaptive governor (WS11-7):** rolling 3s FPS; sustained <45fps → pixel ratio −25% → SMAA off → shadows 512 → shadows off (→ optionally UnsignedByte). One-way ratchet, 10s hysteresis, persisted per renderer string, never below potato floor, never upgrades mid-session.

**Verification gates:** every wave promotes only after (a) HUD assertions clean on a real A9/A10 iPad through a full walkthrough, (b) renderer.info.memory flat across 3 scene cycles, (c) a 60+ tester pass on staging, (d) iOS free-tier/IAP seal diff-verified untouched, (e) for any wave containing the KTX2 rollout (WS2-6) or HalfFloat plumbing (WS11-8): a clean pass on one representative low-end Android device (2–3GB RAM, mid-tier Adreno/Mali — the Play-store audience; ETC1S transcode targets, HalfFloat framebuffer support, and low-memory kill behavior differ materially from A9/A10 iPads).

---

## 7. Risks & Mitigations (program level)

1. **Gallery drama vs 60+ eyesight.** Mistuned dimming reads gloomy to the exact audience served. → Dogma pins walls/floors ≥0.5 relative luminance, ink-on-cream for all baked type (WCAG-checked under the new grade), focus dim clamped at 15%, and a real senior verifies on staging before the grade locks.
2. **Old-hardware memory & shadow aliasing.** ToneMappingEffect + HalfFloat + golden grade changes every scene at once and adds memory pressure on A8/A9 iPads; long raked shadows alias on 1024 mobile maps. → A/B on real old hardware, UnsignedByte fallback tier, tighten shadow frusta to villa/rail bounds, bake shadows beyond the frustum, adaptive governor as the safety net, kill-switches on every cache (hall graph, KTX2 JPG dual-path).
3. **Restraint amplifies emptiness; dollies can nauseate.** → Salon-hang MUST degrade gracefully (fewer/larger/better-lit frames + inviting cream empty states); camera comfort caps (≤25°/s, ≤2.2 m/s, eased) + reduced-motion crossfades are non-negotiable and tested on-device before staging promotion.
4. **Rollout seam whiplash across four monoliths.** → Ship step 1 as ONE atomic cross-scene grade/sun commit scoped to the seam-visible grade contract only (exact file list in Section 5: postprocessing.ts + GOLDEN preset + canon.ts + rendererPool + fog + the monoliths' grade/background/hemi lines); per-room palettes and material retunes follow as same-day flagged per-scene commits, then further per-scene passes behind flags — never a regraded hall behind a cartoon-yellow exterior. One-commit revert path kept. iOS seal untouched throughout.
5. **Load-bearing hidden contracts.** applyPaintingsRef/paintingTextureCache (corridor), acquireMaterialSet msKey caching, onCinematicStep tutorial callbacks, onboarding tri-state (skipCinematic's roots-door branch), clickTargets/raycast lists vs mesh merging. → Each named in the owning workstream's steps; contract-preservation is an explicit acceptance criterion; staging click-through of all four tutorials per wave.
6. **Retune debt under the new grade.** Every emissive/envMapIntensity was tuned for ACES at scene-specific exposures; Neutral@1.15 shifts golds/windows/water. → Exposure fixes are forbidden by dogma; all retuning happens via rig/env intensities with budgeted on-device tuning time in WS1-8/WS3-4.
7. **Cross-workstream dependency slips** (makeArtwork, GOLDEN preset, label helper, KTX2 script, tour rail). → Dependency owners named per step; dependent scenes proceed behind local flags with current behavior as fallback; nothing merges half-purged (lights deleted before pools land = forbidden).
8. **iOS WKWebView audio.** Autoplay policy, interruptions, backgrounding. → Keep the proven tryPlay unlock pattern, key off the existing entry gesture, pause on visibilitychange, real-iPad test before promote; palace-stays-silent is a P0 regression.
9. **Windows tooling & licensing for KTX2/CC0 assets.** → Verify toktx availability and CC0 attribution before scheduling WS2 phase 2; JPG dual-path until KTX2 soaks; prove CompressedTexture clone-sharing before deleting any JPG.

---

## 8. Open Decisions for the Owner (7, each with a recommendation)

1. **Kill the day/night cycle for good?** Collapsing daylightCycle to GOLDEN silently no-ops any time-of-day control, and users visiting at 23:00 will see golden hour, not night. **Recommendation: yes, kill it.** One authored golden hour IS the product identity; the cycle is a large ongoing tuning/perf tax with no audit evidence anyone values it. Keep the API shape so it could return as a paid "moods" feature later.
2. **Delete the Renaissance era entirely (pin "roman")?** The isRenaissance forks in Exterior and Corridor (~450+ lines) die; any user who selected the Renaissance style silently gets the one Roman museum. **Recommendation: delete.** Two half-maintained styles are why both look kit-bashed; one great museum beats two mediocre villas. Check how many users actually have renaissance set before merging (one SQL query); if >5% of actives, show a one-time "your palace was renovated" toast.
3. **Hide the joystick by default ("Take the wheel" opt-in)?** Tap-is-travel becomes the only visible input; free-walk is a settings toggle. **Recommendation: yes, but sequence it** — hide only after Wave 2's walk-to/dolly is verified by the 60+ tester; in Wave 1 the joystick stays visible (de-sprinted, 2.2 m/s) so nobody is stranded mid-transition.
4. **Ancestral Wall photo selection: favorites → oldest → most-recent fallback, auto-selected?** The hall will surface 3–5 of the user's real photos without asking. **Recommendation: auto-select (favorites first, then oldest), plus a later "choose what hangs here" editor.** Auto delivers the 0:30 signature moment to 100% of users on day one; a picker ships as a Wave 3 nicety. Respect any existing private/hidden flags in the selection query.
5. **Audio defaults: score + footsteps ON at low volume (0.3 / 0.15), CC0-sourced loops?** **Recommendation: default ON.** "Cinematic with music" is a landing-page promise and the cheapest warmth win in the whole audit (audio design scored 11/100); mute is one tap, levels get senior sign-off on staging. Owner to approve the actual track choice before Wave 1 promotes (it becomes the brand's sound).
6. **Decor kill-list final call: garlands, gold rosettes, box statues, amphorae — delete or keep any?** The plan deletes all figurative primitive props ("nothing primitive pretends to be sculpture"). **Recommendation: delete all in Wave 2/3 passes**, with one exception owner may keep: the entrance-hall garlands IF they still read well under the new grade — flagged as an explicit owner visual call on staging (WS4-13) before the commit lands.
7. **May the owner's auto-selected photos hang on the Ancestral Wall for PUBLIC visitors?** Visitor routes mount EntranceHallScene directly (WS7-15) and the wall auto-selects photos without asking (decision 4) — the plan must not leak private memories to shared-link guests. **Recommendation: no — visitors see only explicitly PUBLIC photos** (privacy-filtered selection query; anything private/hidden excluded); fewer than 3 public photos → the warm cream empty state, never a placeholder wall. Revisit alongside the Wave-3 "choose what hangs here" editor.

---

*Program lead notes: all work happens on the staging worktree first (deploy via `npx vercel --prod` per the known broken Git integration — staging equivalent for previews); every commit that touches shared 3D infra names its cross-WS dependents in the commit body; the iOS free-tier/IAP seal files are on a do-not-touch list checked in every review.*
