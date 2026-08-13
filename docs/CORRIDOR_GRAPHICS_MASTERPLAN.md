# MUSEO VIVO — The Threshold Procession
## Wing Corridor Graphics Masterplan (Wave W3, flag `w3_corridor`)

> Companion to `docs/ENTRANCE_HALL_GRAPHICS_MASTERPLAN.md`. Scope: the wing corridor scene
> `src/components/3d/CorridorScene.tsx` — the salon-hung gallery corridor the visitor walks from the
> entrance hall toward the room doors. Canon: **MUSEO VIVO — Museum of You at Golden Hour**. Everything new
> lives behind `flag3d('w3_corridor')` (staging-ON / prod-OFF automatic; NOT in `RETIRED_ON`, so the shipped
> W1/W2 corridor stays flag-sealed on prod). Staging branch only. Do NOT commit/push unless the user asks.

---

## 1. Executive Summary & Winning Vision

**Winning vision (score 89/100): "MUSEO VIVO — The Threshold Procession: Doors as Golden-Hour Altarpieces"**,
merged with its tied-first runner-up **"Il Cammino Dorato — The Golden Walk"** (the motion/pacing layer) per the
meta-judge. The two are the same axis seen twice: the Procession organizes by **destination** (terminus and doors
as lit "weenie" landmarks); Il Cammino organizes by **the walk between them** (staged reveal-after-reveal). The
corridor's one true structural fact is its **length** — `cL = totalSlots*C.sp + 14` (CorridorScene.tsx:219), a
parametric 60–90 m one-point-perspective axis that varies per wing, so any whole-corridor bake is impossible and
every lighting/detail strategy must be modular (bay atlas, instanced bays, per-call texture repeats).

The corridor is not a hallway to be traversed; it is a **nave to be processed down**, where every door plus the
end-wall is a lit destination that pulls the visitor forward. Today the whole dramaturgy of arrival is broken by
**confirmed bugs**: the far portal is a stair-stepped box heap whose entire glow/fog/label set faces away from the
player and is back-face-culled from every reachable viewpoint (a hero that literally cannot be seen); the doors are
flat 5-box slabs with sphere knobs; per-room identity is dead under W1 (the `coverHue` light is killed); the sun
rakes from the windowless wall so no shaft ever crosses an opening; and the camera far plane (80) clips the
vanishing point off at spawn in the long wings.

This vision treats the **threshold-first axis** as the organizing principle: fix one-point-perspective so the
terminus reads as a "weenie" landmark from the corridor mouth; rebuild the two door-classes (room doors and the
entrance portal) as GLB heroes that arrive lit and named; make each door recognizably the visitor's own room via
`coverHue`-keyed overdoor frescoes; and rake the canon golden-hour sun **THROUGH** the window bays so cast shafts
and floor pools point the walk toward the doors. Everything obeys the MUSEO VIVO grade: one sun; memories are the
brightest pixels; walls ≥0.5 luminance; gold and architecture never bloom; ≤150 draw calls; iOS ≤750k tris; mobile
tiers via `mobilePerf`.

### Grafts folded into the winner (from losing/adjacent visions, per meta-judge)

1. **Sun-through-the-windows rake** (L'Ora Dorata / La Grande Galerie / Tactile Museo) — the highest-leverage,
   near-zero-cost fix, independently found by four visions and code-confirmed (sun at `(8,16,-3)` = +x; windows at
   `winSide=-1`). Physical precondition for "shafts point the walk toward the doors."
2. **Modular bay-atlas / bay-tiling, NOT whole-corridor bake** (Il Cammino / La Galleria Scolpita / L'Ora Dorata) —
   the load-bearing engineering constraint: `cL` is parametric per wing.
3. **Auto-seed the salon hang from the room's own memories** (Gallery of First Glances / La Grande Galerie) — kills
   the "hall of empty gold frames on first arrival," and gives the over-unity photo lift something to bloom.
4. **Carve the camera-facing surfaces as DRACO GLB heroes with the shell-merge absorb** (La Galleria Scolpita /
   Grande Galerie) — extend the hall-proven 251→17 pattern to terminus, frames, door surrounds.
5. **Depth-fog FAR pinned to the room doors + per-bay luminous cadence** (Sila d'Oro) — makes a fixed far plane read
   as a "weenie," not a hard clip; near bays kept crisp (brightest-pixels dogma protected).

### WOW moments

- **The weenie at the end of the nave.** From the first step into the wing, the far terminus reads as a lit
  destination: the far plane no longer clips the vanishing point, linear fog keeps near memories crisp while the
  door-end glows golden, an axial vignette funnels the eye, and a facing portal glow + gilded wing plaque + optional
  aedicula statue sit exactly on the vanishing point. The first frame every visitor sees becomes the most cinematic
  in the app.
- **Golden shafts that point at the doors.** The sun finally rakes THROUGH the window bays; oblique shafts fall from
  each arched opening to the floor pools with dust motes igniting inside, leaning along the walk axis toward the room
  doors — one merged draw call, all under the bloom threshold.
- **"That's my room" at a glance.** Each door arrives as a real paneled bronze-handled hero set in a travertine
  reveal, crowned by a `coverHue`-keyed fresco lunette and a carved-gilded Fraunces nameplate — and its salon bay is
  already hung with the room's own starred photos (auto-seeded). Wayfinding becomes recognition.

### Risks (carried forward, mitigated below)

- Blender-MCP hero authoring is the schedule risk (≥6 new DRACO GLBs, CPU-only AO bakes, Z-up matrixWorld baking,
  LOD1s, canary fallbacks). **Mitigation:** ship the code-only cheap path first; heroes arrive incrementally behind
  the same canary.
- Owner sign-off gates are real and sequential (bloom threshold move, flag retirement, terminus content).
- Draw-budget/VRAM headroom is tight and cumulative — the hall-grade shell-merge is the enabler.
- Re-tuned blind values (portal glow/fog, shaft opacity, axial vignette, fresco saturation) must be judged on a REAL
  in-corridor view or W3 repeats the exact mistake it's fixing.
- Auto-seeding changes what existing users see the instant W3 lands — must respect memory visibility/privacy and let
  manual curation override.

---

## 2. Confirmed Audit Findings

| # | Sev | Finding | Impact | Owner WS |
|---|-----|---------|--------|----------|
| F01 | P0 | Base floor texture stretched 3×–9× along corridor (fixed `[3,3]` repeat on cW×cL plane) | 7 | WS5 |
| F02 | P0 | Exit-portal arch = 26 unrotated axis-aligned boxes, stair-stepped/gappy silhouette | 7 | WS8 |
| F03 | P0 | All portal dressing (glow/fog/"Back to Entrance" label) faces away from player, back-face culled | 6 | WS8 |
| F04 | P0 | Cinematic timeline on unclamped wall-clock — compile stall / hitches / hidden-tab eat the 6s shot | 6 | WS11 |
| F05 | P0 | No scene-space AO or lightmap anywhere; mobile ships zero geometry-aware occlusion | 8 | WS5/WS4 |
| F06 | P0 | Sun from wrong side of sky: hardcoded key `(8,16,-3)` opposite the windows, contradicts canon | 7 | WS1 |
| F07 | P0 | Zero grime/wear; walls flat hex, 3 of 4 plaster PBR channels discarded | 7 | WS4 |
| F08 | P0 | External autowalk targets 2 m BEYOND the wall — arrival & `onDoorClick` never fire, input locks | 6 | WS7 |
| F09 | P0 | New user's own photos NEVER appear on salon walls — hall of empty frames | 8 | WS2 |
| F10 | P0 | Room doors (primary interaction hero) are flat 5-box slabs with sphere knobs | 7 | WS7 |
| F11 | P1 | Key sun contradicts canon golden-hour sun AND the corridor's own windows | 7 | WS1 |
| F12 | P1 | Sun shadow frustum covers <half the corridor; no shadow bias set anywhere | 6 | WS1 |
| F13 | P1 | Corridor is the only canon scene on hard PCFShadowMap with zero bias (hall/exterior use PCFSoft+bias) | 6 | WS1 |
| F14 | P1 | Salon artwork neither casts nor receives shadows; late remounts never trigger the F02-style rebake | 5 | WS2/WS1 |
| F15 | P1 | Photo plane floats 14 mm PROUD of frame — no rabbet, no molding, no shadow gap | 6 | WS2 |
| F16 | P1 | Picture-light read is a symmetric floating radial halo; bands "spot" bare colonnade wall | 6 | WS3 |
| F17 | P1 | Corridor photos never get the hall over-unity lift — memories don't read picture-lit under bloom | 5 | WS3 |
| F18 | P1 | Prod (flags-off) stretches every photo onto a fixed 1.465:1 plane, lit MeshStandard | 7 | WS12 (wave-exit) |
| F19 | P1 | Painting textures upload full native res into a cache that never evicts — VRAM blowout on iOS | 4 | WS12 |
| F20 | P1 | Memories not enforced brightest: no over-unity lift + bloom threshold still 0.85 (hall Wave C missing) | 6 | WS3/WS11 |
| F21 | P1 | Walls normal-map-only flat colour; plaster diffuse/rough/AO loaded but never wired in | 7 | WS4 |
| F22 | P1 | Texel density inconsistent ~10–40×: one `[3,3]` shared by ~80 m wall and ~2 m fill strips | 5 | WS4 |
| F23 | P1 | Per-wing wall variety dead: `wallStyle` never consumed; W1 collapsed 5 wings to one plaster wall | 6 | WS4 |
| F24 | P1 | Wing floor "patterns" = sparse flat box confetti floating 1 cm above floor (nondeterministic) | 7 | WS5 |
| F25 | P1 | Runner rug is a bare 2 m box; designed per-wing border (`rugB`) never built | 7 | WS5 |
| F26 | P1 | Floor is matte (rough .7, envInt .15) while hall proved polished-gallery clearcoat floors | 7 | WS5 |
| F27 | P1 | Roman path draws TWO overlapping beam systems (ceilStyle ribs + 11 era timber beams same depth) | 5 | WS4/WS6 |
| F28 | P1 | Renaissance barrel vault rotated 90° wrong, pokes through side walls, occluded by flat ceiling | 3 | WS6 |
| F29 | P1 | Ceiling is largest untreated surface: one flat untextured plaster plane, no AO/bounce | 6 | WS4/WS6 |
| F30 | P1 | Door is a flat 5 cm box slab, gold slab "insets," 6-seg sphere knobs — below hall GLB bar | 7 | WS7 |
| F31 | P1 | Roman doors have NO frame (jambs/architrave gated to renaissance); pediment doesn't close | 7 | WS7 |
| F32 | P1 | Per-room identity dead under W1: `coverHue` PointLight killed; lunettes cycle by index not room | 6 | WS10 |
| F33 | P1 | Prod still renders rejected Georgia "license-plate" typography at hall→corridor threshold | 6 | WS12 (wave-exit) |
| F34 | P1 | Corridor ignores gilded Fraunces variant; end-wall plaque unlit dark ink, subtitle dropped | 6 | WS10 |
| F35 | P1 | Long i18n / user labels horizontally crushed by fillText maxWidth (fixed font + letterSpacing) | 5 | WS10 |
| F36 | P1 | Two/three wings width > height — corridor reads as a low hall, not a gallery | 5 | **A1 → WS6** |
| F37 | P1 | All wall articulation stops ~4.5 m — 45–55% of the 7–9 m wall is blank plaster | 6 | **A3 → WS4** |
| F38 | P1 | "Salon-hung" walls = one ~1.45 m picture per 8 m bay (~20% pier coverage vs 60–80%) | 7 | **A4 → WS2** |
| F39 | P1 | Renaissance vault full semicircle (apex ~12 m) occluded by unconditional flat ceiling | 4 | **A2/A7 → WS6** |
| F40 | P1 | Camera far plane (80) clips the terminus in long wings — vanishing point cut off at spawn | 6 | WS1/WS11 |

---

## 3. Technique Verdicts

| Technique | Feasible | Perf | Impact | Verdict / Owner |
|-----------|----------|------|--------|-----------------|
| Baked lightmaps for walls/ceiling (bay-atlas via uv1 lightMap) | yes | ~0 to negative | 7 | **Adopt (bay-atlas only)** — WS4/WS6. Whole-corridor bake impossible (`cL` parametric); bake modular window-lit + salon-shadow bay tiles + caps. |
| Salon frame GLB kit (instanced per-aspect variants) | yes | net neutral/-DC | 7 | **Adopt** — WS2. Collapses per-bay box frames to 3–4 instanced draws. |
| Canvas/paper grain on memory photos | yes | ~0 | 4 | **Adopt (polish, ship last)** — WS2/WS3. Layer A baked grain all tiers; Layer B sheen desktop-only. |
| Picture lights (instanced brass fixtures + selective bloom lift) | yes | +3 DC fixed | 7 | **Adopt** — WS3. No new lights; over-unity tube + threshold 1.0. |
| Gallery runner carpet (displaced cloth + bordered canvas) | yes | net 0 DC | 7 | **Adopt** — WS5/WS9. `cL` parametric ⇒ procedural displaced plane + non-repeating canvas, NOT a baked cloth GLB. |
| Coffered/beamed ceiling GLB hero (per-bay, instanced) | yes | +1–3 DC | 7 | **Adopt (Wave B)** — WS6. Coffered-only Wave 1; truss variant + nest fresco optional. |
| Room-door GLB kit (leaf + surround + cartouche, tinted) | yes | ~0 ms, ≤16 DC | 7 | **Adopt (Wave B)** — WS7. Identity by tint, not PointLights. |
| Wainscoting/panelling relief (true bevelled geometry, merged) | yes | +10–18k tris, 0 DC | 6 | **Adopt** — WS4. Geometry route (merged); reject POM. |
| Window-bay golden light shafts (merged oblique prisms, additive) | yes | +1 DC | 7 | **Adopt** — WS11. Reject screen-space godrays (sun off-axis) and raymarch. |
| Dust motes concentrated in light bands / shafts | yes | +1 DC (fold to 0) | 6 | **Adopt** — WS11. One dust system (WS10-3 rule). |
| End-wall hero terminus (aedicula + statue + lunette glow) | yes | +5–8 DC | 8 | **Adopt (Wave B/C)** — WS8. |
| Floor upgrade: waxed anisotropic sheen + IBL (no Reflector) | yes | +0 DC | 7 | **Adopt** — WS5. Reject true planar Reflector (doubles DC). |
| Selective static shell-merge (hall 251→17, re-runnable + heroes) | yes | -60–120 DC | 6 | **Adopt (ENABLER)** — WS12. Factor `mergeShell` into geometryOptimizer.ts. |
| Selective HDR bloom @ threshold 1.0 + over-unity lift | yes | ~0 (free) | 7 | **Adopt (owner-gated)** — WS11/WS3. Corridor preset override only. |
| Baked AO decals (dark multiply contact shadows) | yes | +2 DC | 7 | **Adopt** — WS5/WS9. Replaces SSAO on mobile. |
| Bench seating GLB hero (instanced) | yes | net -DC | 5 | **Adopt (Wave B/C)** — WS9. |
| Per-wing material palette (canon-derived tints) | yes | ~free | 5 | **Adopt** — WS10. Replace off-canon C.accent with WING_ACCENTS. |
| Fog / atmospheric depth (built-in three fog, tuned) | yes | ~free | 4 | **Adopt** — WS11. Linear Fog pinned to terminus; no post haze pass. |
| Build-time per-bay LOD tiering (NOT runtime three.LOD) | partial | net savings | 3 | **Adopt (tail)** — WS12. Runtime LOD fights the shell-merge. |
| Axial/anisotropic vignette (custom Effect in shared pass) | yes | ~free | 5 | **Adopt** — WS11. darkness ≤0.45 (walls ≥0.5 dogma). |
| KTX2/BasisU compressed textures (wake dormant pipeline) | yes | VRAM win | 3 | **Adopt (independent of W3)** — WS12. Needs `toktx` install. |
| CC0/CC-BY props (Sketchfab + Poly Haven) | partial | instanced, small | 6 | **Adopt (owner license gate)** — WS9. CC0 preferred; NEVER CC-BY-NC/ND on a paid app. |
| Wet-look floor via cheap envMap approximation (no Reflector) | partial | +0 DC | 5 | **Adopt (cheap variant only)** — WS5. True Reflector REJECTED (doubles DC, breaks one-grade). |

---

## 4. The 12 Workstreams (build order & dependencies)

Ownership matrix resolving all critic collisions is in §8. Build order groups into waves in §5.

1. **WS1 — Lighting Bands & Shadows Overhaul.** Rake the canon sun THROUGH the window bays; fit the shadow ortho
   frustum to `cL`; PCFSoft + bias/normalBias/radius; realign W1 sun-pool decals to the new throw.
   *Owns:* F06, F11, F12, F13. *Dep:* shared W3 flag read (§8).
2. **WS2 — Salon Hang & Frame System.** Real moulded/GLB frames with rabbet + shadow-gap; auto-seed bays from the
   room's own starred photos; widen `slot.wall` to a real cluster; cast/receive shadow + F02 rebake.
   *Owns:* F09, F14, F15, F38. *Dep:* WS12 shell-merge (frames), WS3 (lift/threshold co-verify), parent
   `roomMemsFallback` prop.
3. **WS3 — Memory Presentation & Picture Lights.** Over-unity photo lift + bloom threshold override; top-biased
   scalloped wash replacing radial halo; instanced brass picture-light fixtures; paper grain (polish).
   *Owns:* F16, F17, F20. *Dep:* WS11 owns the postprocessing override object (§8 C8); WS12 VRAM cap before seed.
4. **WS4 — Wall / Panelling Material System.** Wire the discarded plaster maps; world-space texel scaling; seeded
   darkening grime atlas + CPU vertex-AO; bolection wainscot relief; ceiling treatment + beam de-dup; consume
   `wallStyle`; **upper-wall frieze datum (A3/F37)**.
   *Owns:* F05(walls), F07, F21, F22, F23, F27(fallback), F29(fallback), F37. *Dep:* WS12 shell-merge.
5. **WS5 — Floor & Runner.** Aspect-correct floor repeats; **remove floor-confetti + bake pattern into diffuse
   (A5/F24)**; per-wing runner (field + border + medallion) with contact-shadow strip; polished-gallery floor
   material (desktop); merged AO-decal kit (F05 ground).
   *Owns:* F01, F24, F25, F26, F05(ground). *Dep:* WS4 (shared UV-scale helper, grime seed), floor-stack heights (§8 E3).
6. **WS6 — Ceiling Hero (GLB).** Coffered per-bay module instanced along `cL`; canary keeps the flat plane +
   procedural ornament; per-wing tint; **fix/delete the renaissance vault (A2/A7/F28/F39)**; **wide-wing cove/section
   decision (A1/F36)**.
   *Owns:* F27(hero), F28, F29(hero), F36, F39. *Dep:* WS12 shell-merge, WS4 (fallback ceiling), owner wide-wing call.
7. **WS7 — Room Doors & Thresholds.** GLB door leaf hero (raycast contract preserved); era-independent travertine
   architrave + reveal + threshold stone; autowalk arrival fix; portal facing/rebuild coordinated with WS8.
   *Owns:* F08, F10, F30, F31. *Dep:* WS12 shell-merge, WS1 (raking light lands on doors), WS10 (coverHue keying).
8. **WS8 — End-Wall & Portal Composition.** Gilded aedicula terminus "weenie" + optional statue GLB; portal GLB
   hero + facing-dressing fix + opacity retune.
   *Owns:* F02, F03, F40(via camera far), terminus composition. *Dep:* WS12 shell-merge, WS11 (fog/far coordinate),
   WS10 (gilded plaque + subtitle).
9. **WS9 — Props, Benches & Greenery.** Bench/plinth/plant GLB heroes (instanced, canary); runner rug build (with
   WS5); baked AO contact decals under props; CC0/CC-BY curation.
   *Owns:* dressing props. *Dep:* WS12 shell-merge, WS5 (runner), WS7 (plinth clears door reveal), owner license gate.
10. **WS10 — Per-Wing Identity System.** `coverHue` overdoor frescoes (per-room, keyed to room.id); canon-derived
    `WING_ACCENTS`; gilded Fraunces nameplates + restored subtitle; `frauncesLabel` measure-and-shrink; **lunette y
    from dH not hardcoded 3.8 (A3/E2)**.
    *Owns:* F32, F34, F35. *Dep:* shared W3 flag/msKey; coordinates fresco with WS2/WS7 (§8 C5).
11. **WS11 — Atmosphere & Post-Processing.** Camera far plane; length-pinned linear fog; cinematic dt-clamp; golden
    shafts + in-shaft motes; axial vignette; bloom threshold 1.0; owns the single `createPostProcessing` override
    object.
    *Owns:* F04, F40, shafts/motes/fog/vignette/bloom. *Dep:* WS1 (sun direction for shaft lean), owner bloom sign-off.
12. **WS12 — Performance, Merge, Tiers & First-Frame (ENABLER).** Factor re-runnable `mergeShell`; extend to async
    DRACO heroes; mobilePerf tier gating; KTX2 wake; painting-texture cap + eviction; perfAssert headroom;
    wave-exit retirement (owner-gated). **Backport interim MeshBasic+aspect fix or flag prod-stretch to owner (F18).**
    *Owns:* F18, F19, F33, shell-merge, tiers, KTX2, wave-exit. *Dep:* must land `mergeShell` FIRST (§8 C12).

**Critical build ordering:** WS12 `mergeShell` lib + the shared W3 flag read land first (unblock all hero WSs).
Then WS1/WS5/WS4 code-only substrate. Then WS2/WS3/WS10 salon+identity. Then Wave-B heroes (WS6/WS7/WS8/WS9). WS11
atmosphere ships alongside code-only. Owner-gated moves (bloom, retirement, wide-wing, licensing, KTX2) stay
independently shippable so they never block code-only value.

---

## 5. Wave Plan (flag `w3_corridor`)

All waves behind `flag3d('w3_corridor')`; `?flag3d=w3_corridor` on staging, prod stays W1/W2 until the owner-gated
wave-exit. Every hero degrades to intact legacy geometry on 404 / potato via canary `.visible=false`-on-success.

### Wave A — Quick Wins (code-only, zero authoring, ship first)

The composition prerequisites + correctness fixes that land most W3 value with no assets and no owner gate:

- **WS12 C1/C5:** shared W3 flag read (single definition, §8 C1) + `mergeShell` lib factored into geometryOptimizer.ts.
- **WS11 S1:** `camera.far = cL+15; updateProjectionMatrix()` after line 219 (reclaim vanishing point, F40).
- **WS11 S2:** FogExp2 → length-pinned `THREE.Fog(fogColor, near, far-just-past-terminus)` (near bays crisp, F-depth).
- **WS11 S3:** cinematic dt-clamp `cinT += min(dt,.05)` gated on `readyFiredRef` (F04).
- **WS7 S1:** autowalk stand-point flip `dm.x - dm.side*1.6` + manual cancel + timeout failsafe (F08).
- **WS1 C1/C2/C3/C4/C5:** sun to `-x/-z` window quadrant; fill to `+x`; shadow ortho fit to `cL/cW`; PCFSoft +
  bias/normalBias/radius; realign sun-pool decals (F06, F11, F12, F13).
- **WS5 S1:** aspect-correct floor repeats (F01); **remove box confetti, bake pattern into diffuse (F24)**.
- **WS4 S1/S2:** world-space UV scaling (F22); wire plaster diffuse/rough/AO maps already in VRAM (F21).
- **WS2 S5 / WS3 S4:** auto-seed salon walls from the room's own starred photos (F09) — **single owner (WS2)**.
- **WS10 S1/S2:** `WING_ACCENTS` canon token map; route accent behind W3 (F23 partial); `frauncesLabel` shrink (F35).
- **WS11 S6A:** radial vignette override deepen (composition).

### Wave B — Heroes (Blender-MCP DRACO GLBs, incremental behind canary)

Each authored with CPU-only AO baked into albedo (GPU/HIP bakes black on this AMD box), Z-up→Y-up baked into
geometry (`part.matrixWorld` before use), LOD1s, per-tier gating, and shell-merge absorb after load:

- **WS8:** portal hero `public/models/corridor/portal_w3.glb` + facing-dressing fix + opacity retune (F02, F03).
- **WS7:** room-door leaf `door_w3.glb` + travertine architrave/reveal/threshold (F10, F30, F31).
- **WS2:** salon frame kit `frames_w3.glb` (instanced per-aspect) + rabbet/shadow-gap (F15).
- **WS6:** coffered ceiling bay `ceiling_bay_w3.glb` (+ `_lod1`) instanced along `cL`; renaissance-vault fix/delete
  (F28, F39); wide-wing cove if owner approves (F36).
- **WS8:** terminus statue `terminus_statue_w3.glb` (+ `_lod1`) inside the aedicula (weenie).
- **WS9:** bench `bench_w3.glb`, plinth `plinth_w3.glb`, plant `plant_w3.glb` (instanced, CC0-preferred).

### Wave C — Atmosphere & Polish (mixes code-only + owner-gated)

- **WS11 S4/S5:** golden window shafts (merged prism, +1 DC) + in-shaft/in-band dust motes (F-shafts).
- **WS11 S6B:** axial anisotropic vignette (custom Effect, darkness ≤0.45).
- **WS3 S1 / WS11 S7:** bloom threshold 0.85→1.0 override + over-unity photo lift (F17, F20) — **owner sign-off**.
- **WS3 S2/S3:** top-biased picture-light wash + instanced brass fixtures (F16).
- **WS4 S3/S4/S5/S6/S7:** grime atlas + vertex-AO (F05, F07); bolection wainscot relief; ceiling treatment + beam
  de-dup (F27, F29); `wallStyle` per-wing (F23); upper-wall frieze datum (F37).
- **WS5 S2/S3/S4/S5:** per-wing runner + contact strip (F25); polished floor material (F26); merged AO-decal kit (F05).
- **WS2 S8 / WS3 S8:** paper grain (polish, last).
- **WS12 C12:** build-time per-bay LOD tiering; **wave-exit** — add `w1_corridor`/`w2_corridor` to `RETIRED_ON`,
  delete the three Georgia else-branches (~80 lines), make the salon path unconditional (F18, F33) — **owner-gated**.
- **WS12 C8:** KTX2 wake + desktop 2k retune (independent of W3) — **owner infra go/no-go**.

---

## 6. Budgets & Guardrails

**Hard budgets (MUSEO VIVO canon):** ≤150 draw calls (mobile tier), iOS ≤750k tris, ≤4 dynamic lights
(hemi + sun + fill + portal point — this wave adds NONE; all "light" is faked additive geometry or baked/emissive),
one grade (`NeutralToneMapping 1.15`), memories = brightest pixels, walls ≥0.5 luminance, gold/architecture never bloom.

**Draw-call census WITH shell-merge (the enabler, WS12):**
- portal 1–3, up to 8 doors × (leaf clone 1–2 + architrave instance 1), frame kit InstancedMesh-per-aspect (≤4),
  ceiling-bay InstancedMesh (1–2), bench (2)/plinth (1)/plant (1–2) instanced, merged shafts (1), merged AO decals
  (1–2), runner (1), picture-light fixtures (3), coverHue lunette atlas (1–2), gilded plaques (unlit, a few).
- Net threshold procession ≈ +40–60 draws AFTER merge — inside ≤150 mobile ONLY because WS12 absorbs each async hero
  to 1–3 draws. Without it heroes land at 10–30 each and must be cut.

**Tris:** door ~5–8k × ≤8, portal ~10–20k, ceiling bay ~2–4k × instanced count, statue ~20k (LOD1 ~10k), wainscot
relief +10–18k, shafts <100 — all inside ≤750k with LOD1s + build-time per-bay tiering (Wave C).

**VRAM:** cap `createImageBitmap` longest edge 2048 desktop / 1024–1280 mobile / 512 potato; add per-wing
`paintingTextureCache` eviction BEFORE auto-seed fills bays (WS12 C9, prerequisite for WS2 seed). KTX2 (WS12 C8) frees
~4–5× on the 7 PBR sets, funding desktop 2k.

**Bloom law:** raise the corridor preset override to `luminanceThreshold 1.0` (WS11, owner-gated); pair with the
over-unity photo lift (`photoMat.color.setRGB(1.12,...)`, opt-in in makeArtwork, default off so hall/other callers
untouched) so ONLY sun + gold-leaf + memory highlights cross. Audit glass (`.9` tinted, opacity .6), gold trim
(0.1–0.25), fresco emissive (.18), shafts/pools/bands (additive, ≤0.09) — all must stay sub-1.0. Screenshot-assert
"blooming pixels = sun + memories."

**Fog dogma:** fog color === `scene.background` === `dlPreset.fogColor` (`GOLDEN.fogInterior`). No per-bay tint. No
postprocessing haze pass (fogs in HDR pre-tonemap, fights one-grade).

**Floor-stack heights (single-owner band, §8 E3):** W1 sun pools `y=.032`; runner top ≤`.026`; contact strip
`.028–.030`. Keep runner ≤`.030` or bump pools to `.04` in the same commit.

**Verification gate:** every re-tuned blind value (portal glow/fog `.08/.06`, shaft `.06–.09`, axial vignette,
fresco saturation, WING_ACCENTS hue/sat) judged on a REAL in-corridor screenshot from spawn AND mid-corridor, on
nest + passions (longest wings, worst far-plane/fog case). Run `perfAssert` / `renderer.info.render.calls` +
`.triangles` on the actual mobile + potato tiers, and both the GLB-success and 404 canary drills, before promotion.

---

## 7. Owner Decision Gates

1. **W3 flag definition** — bare `flag3d('w3_corridor')` (recommended; features assume W1 substrate internally) vs
   `W2 && flag`. Affects every workstream (§8 C1). **DECIDE FIRST.**
2. **Wave retirement of `w1_corridor`/`w2_corridor` into `RETIRED_ON`** + deletion of the three Georgia else-branches
   (~80 lines). This is the ONLY fix for the prod photo-stretch (F18) and the Georgia-typography canon break at the
   hall→corridor threshold (F33). Choose: **approve retirement now**, OR approve the **interim MeshBasic + aspect
   backport** into the legacy path (WS12), OR **accept prod stays stretched** until then.
3. **Bloom threshold 0.85→1.0** (WS11/WS3) — re-reads every corridor emissive at once; hall precedent required sign-off
   on a screenshot.
4. **Fog model + far value** — reconcile the three parallel-spec fog depths on a real spawn screenshot BEFORE coding
   (§8 C3). WS11 is the single owner; owner confirms the look.
5. **Wide-wing section (A1/F36)** — clamp `cW ≤ cH` (changes dimensions users may already know) vs add a cove/vault
   (changes WS6 ceiling GLB authoring). Blocks WS6 hero authoring.
6. **Blender-MCP hero authoring & licensing** — confirm which of the ≥6 heroes (door, doorframe, portal, frames,
   ceiling_bay+lod, bench, plinth, plant, terminus statue) are in Wave-B scope; confirm any Hunyuan/Rodin enablement +
   license; confirm CC0-only for Sketchfab/Poly Haven props (**NEVER CC-BY-NC/ND on the paid app**); confirm any
   terminus statue/tympanum content vs the exterior masterplan's owner-name/concept gates.
7. **KTX2 activation (WS12 C8)** — requires installing `KhronosGroup.KTXSoftware` (`toktx`) on the box + running the
   bake; flips desktop textures to 2k. Infra go/no-go.
8. **Ownership matrix (§8)** — issue/approve the shared-surface ownership assignments so the parallel-written specs
   don't conflict on merge.

---

## 8. Critic Gaps RESOLVED (every unowned item assigned)

### A. Orphaned findings — now owned

- **A1/F36 (wide wings read as low hall) → WS6** (new STEP). Owner decides clamp `cW≤cH` vs cove/vault (Gate 5). If
  cove: reuse the existing barrel-vault/rib code path as a per-wing shallow cove at near-zero authoring cost; the
  section apex must exceed width. Cross-checks WS6 ceiling-GLB fit and WS1 shadow frustum.
- **A2/A7/F28/F39 (renaissance vault broken/occluded) → WS6** (new STEP, explicit). Under W3 **delete the renaissance
  vault + rib + boss block entirely** (era picker is retired, styleEra coerced to roman) OR rebuild as a segmental arc
  (rise ~cW/4) springing from an impost cornice with the flat ceiling skipped when the vault is active. Because WS6's
  canary only hides procedural ceiling on GLB-load-*success*, the delete/fix must also hold on the 404/potato fallback.
- **A3/F37 (upper-wall dead zone 45–55% blank) → WS4** (new STEP). Introduce a horizontal frieze/entablature datum at
  ~0.62·cH (paintTex canvas band + trim Box, mergeable into the static shell) so the upper wall is a designed zone;
  and/or raise the salon-hang field toward cH-2 (coordinate with WS2 A4). **Includes E2:** scale lunette `y` from `dH`
  (WS10) not the hardcoded `3.8`.
- **A4/F38 (narrow ~1.45 m slot) → WS2** (extend STEP 5). In addition to feeding `computeSalonHang` more pieces,
  **widen `slot.wall` to ~`C.sp-3.5`** and let satellites fill UPWARD into a two-register cluster toward the A3 raised
  field, so bays reach 60–80% pier coverage instead of cramming pieces into 1.45 m.
- **A5/F24 (floor box-confetti) → WS5** (extend STEP 1). **Remove the floating `floorPat` box-confetti meshes**, bake
  the herringbone/checker/marble/mosaic pattern into the per-wing floor diffuse canvas at world scale (kills the
  z-order patchwork, the 1 cm ledges, and the `Math.random()` nondeterminism), with a matching roughness channel so
  the pattern reads under the sun pools.
- **A6/F27 (double beam systems) → WS4 owns the de-dup on the fallback path; WS6 owns the hero path.** On WS6 GLB
  success the ceiling GLB is the single source; on 404/potato WS4's beam-dedup holds.

### B. Weak-fix findings

- **B1/F18 (prod photo-stretch) → WS12.** Wave-exit retirement is the clean fix but is owner-gated (Gate 2). WS12
  additionally implements/flags the **interim MeshBasic + aspect-rebuild backport** so prod is not knowingly left
  stretched pending approval. Flag to owner explicitly.
- **B2/F05 (floor AO) → WS5 decal kit + WS4 vertex-AO.** Accepted as adequate; hero-albedo AO bake arrives with the
  optional shell-GLB tail.

### C. Collisions resolved — ownership matrix

| Shared surface | Sole owner | Others delete their copy |
|----------------|-----------|--------------------------|
| **C1** W3 flag read (one definition, bare `flag3d('w3_corridor')`) | **WS12** declares once at mount | all others reuse the const |
| **C2** `camera.far = cL+15` after :219 | **WS11 S1** | WS7 S9, WS8 C1, WS12 C1 delete |
| **C3** `scene.fog` linear swap + far value | **WS11 S2** (value locked on screenshot, Gate 4) | WS8 C2, WS12 C2 delete |
| **C4** ceiling: fallback vs hero | **WS4** owns fallback (MS.ceil maps, beam de-dup, nest fresco); **WS6** owns hero GLB + hides procedural on success | nest fresco = WS4 only |
| **C5** salon auto-seed | **WS2 S5** | WS3 S4 deletes its copy |
| overdoor coverHue fresco | **WS10 S3** | WS2 S6, WS3 S5, WS7 S5 defer to WS10 |
| **C6** gilded Fraunces nameplate | **WS10** (door + wing plaques) | WS2 S7, WS3 S5c, WS7 S6, WS8 C5 defer |
| `frauncesLabel` measure-and-shrink | **WS10** | WS2 S7 defers |
| **C7** `makeArtwork` ArtworkOptions extension (`frameStyle/lift/paperGrain/pictureLight/linerAccent`) | **one consolidated commit, WS2 authors** | WS3, WS10 add fields via that commit only |
| **C8** postprocessing override object (bloom + axial vignette) | **WS11** owns the single override arg | WS3 S1d passes its bloom intent to WS11 |
| **C9** portal rebuild + facing + retune | **WS8** | WS7 S7 defers portal to WS8 |
| **C10** autowalk overshoot fix | **WS7 S1** | WS12 C4 deletes |
| **C11** cinematic dt-clamp (clamp the branch running under W3) | **WS11 S3** (reconcile :2020 W2 vs :2054 legacy on real run) | WS12 C3 deletes |
| **C12** shell-merge `mergeShell` lib | **WS12 C5** lands FIRST | all hero WSs register canary groups into its skip/KEEP set |
| **C13** `msKey` append `|w3:${W3?1:0}` at :250 | **WS12** (once) | WS4/WS5/WS9/WS10 rely on it |
| **C14** golden shafts + in-shaft motes + dust | **WS11 S4/S5** | WS1 C7/C9 delete (WS1 keeps sun+shadows+pool-realign only) |

### D. Owner decisions before build

Consolidated into §7 Gates 1–8: (1) flag definition, (2) wave retirement / prod-stretch, (3) bloom sign-off,
(4) fog value, (5) wide-wing section, (6) hero authoring + licensing scope, (7) KTX2 infra, (8) the ownership matrix
above.

### E. Smaller gaps / risks — assigned

- **E1 (shadow-camera axis mapping unverified, WS1 C3).** WS1 owns; after the sun rotates to `-x/-z`, the ortho box's
  long axis must lie along the light's view basis, not world-z. Locked in the WS1 screenshot pass (swap hx/hz if the
  throw reads transverse).
- **E2 (lunette y from dH) → WS10** (bundled with A3).
- **E3 (floor-stack 2 mm band).** **Single owner: WS5** publishes the height contract (pools `.032` / runner ≤`.026`
  / contact strip `.028–.030`); WS9 runner respects it.
- **E4 (WS6 `cW/9` non-uniform coffer scale).** WS6 confirms coffers read acceptably non-square across wings in the
  real-view check; if not, author a second-width variant or accept per wide-wing decision (A1).
- **E5 (`frescoMesh` mergeSkip dangling after WS8 end-wall rebuild).** WS8 confirms `frescoMesh` still exists (or
  updates the mergeSkip reference) after the aedicula rebuild; WS12/WS1 reference it as a preserved skip.
- **E6 (procedural pediment stays open on fallback).** WS7 models the pediment closed in the doorframe GLB; the
  procedural fallback keeps the open pediment as an accepted degrade (noted).

### Bottom line

P0 coverage is complete (floor stretch, portal boxes, portal back-facing, cinematic clock, AO absence, sun direction,
grime, autowalk, empty salon walls, box doors — all owned). The real risk was **owner-overlap on ~10 shared
coordinates with conflicting values**, now resolved by the §8 C ownership matrix and §7 owner gates. The previously
**orphaned P1s** (wide-wing section A1, renaissance vault A2/A7, upper-wall frieze A3, `slot.wall` widening A4,
floor-confetti removal A5) are each assigned above. Ship Wave A (code-only) for immediate value; Wave B heroes arrive
incrementally behind canary; Wave C atmosphere + owner-gated moves stay independently shippable.

*— End of masterplan. Staging branch only, behind `flag3d('w3_corridor')`. Do not promote to prod until the §7
wave-exit gate is owner-approved.*
