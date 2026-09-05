# Mantel / Fireplace Hero — Scene Realism Plan

Goal: make the featured-photo hero zone (fireplace + mantel + chimney breast) read as a real, lived-in Tuscan villa salon instead of "made in Paint". Realism comes from **material truth, light, micro-detail, subtle imperfection and proportion — NOT added ornament.** A prior heavy carved overmantel (pilasters + fielded border + entablature) was rejected as "gekunsteld / veel te zwaar". This plan does the opposite: it re-materials boxes that already exist and adds sub-centimetre light/shadow cues. The photo must stay the single brightest, sharpest focal element.

All line numbers below are verified against the current `src/components/3d/InteriorScene.tsx` (W3 branch) and `src/lib/3d/makeArtwork.ts`.

---

## 1. Why it looks like "Paint" today (root causes)

1. **Wet-plastic stone.** `MS.marble` (line 488) is a `mkPhys` physical material at `roughness .15` + `clearcoat .3` + `reflectivity .6` — a lacquered bathroom-vanity sheen, not 400-year-old stone. It is shared with the floors, so **the same veins tile across ~10 mantel boxes at mismatched UV scales** (marbleTex `[3,3]`). That uniform plastic highlight + mismatched grain IS the Paint tell.
2. **Dead-flat chimney breast.** The biggest plane behind the photo (line 1237) reuses the plain room-wall plaster (`MS.wall`, normalScale `.3`) with no soot, no warmth, no tone break — a flat fill the photo floats on.
3. **Boxes don't seat together.** Stacked slabs abut with no contact shadow, so the surround reads as one extruded CG solid rather than cut, settled masonry.
4. **No mobile mantel light.** `fireL` PointLight is intensity **0** on mobile (line 1232), and the picture SpotLights are desktop-gated — phones get **zero** local light on the mantel, so even good normals have nothing to catch.
5. **Brass jewellery competes.** A `MS.gold` gilt lip (1217), centre tablet (1213), pilaster caps (1209) and a 2.24-wide gold ceiling cornice (1238) scatter warm-metal glints that fight the photo — and read French/Rococo, not Florentine.
6. **Flat hero frame + sticker plaque.** `getWalnutFrameMat` (makeArtwork.ts:76) is a bare untextured `MeshStandardMaterial`; the name plaque is `MeshBasicMaterial` (unlit) so it reads as printed paper.

---

## 2. Phased changes

### PHASE 1 — Material & light (highest leverage, lowest risk, ships first)

**1.1 Re-clad the chimneypiece in matte pietra serena / travertine stone**
- **Where:** texture load near line 427; new `MS.stone` in `acquireMaterialSet` beside `marble` (~488); swap on surround boxes 1208, 1210, 1212, 1214, 1215, 1216, 1218, 1219.
- **What:** add `const stoneTex=loadSandstoneTextures([1.4,1.4]);` (or `loadTravertineTextures` for warmer cream). Push it into `allTexSets` (432) and the W1 aniso loop (454). Add
  `stone: mkPhys(THREE,{color:'#9AA0A0', roughness:.65, metalness:0, map:stoneTex.map, normalMap:stoneTex.normalMap, normalScale:new THREE.Vector2(.75,.75), roughnessMap:stoneTex.roughnessMap, aoMap:stoneTex.aoMap, aoMapIntensity:.9, clearcoat:0, reflectivity:.2})`.
  Swap `MS.marble → MS.stone` on the eight surround boxes ONLY. Keep `MS.marble` for floors/fallback.
- **Reuse:** `loadSandstoneTextures`/`loadTravertineTextures` (assetLoader.ts 641/659, both shipped on disk), `mkPhys`, `acquireMaterialSet` cache — one material edit updates all boxes.
- **Risk:** low. Zero geometry, cheaper shader (dropping clearcoat), no new light.
- **Why realistic not contrived:** drops the lacquer sheen that IS the Paint look; matte grey-green pietra serena is the authentic Florentine chimneypiece stone. Note: the mobile-load-bearing part is `roughness .15→.65` (mkPhys strips clearcoat on mobile anyway).

**1.2 Dedicated intonaco chimney breast**
- **Where:** breastTex near line 429; new `MS.breast` (~471); swap at line 1237.
- **What:** `const breastTex=loadClayPlasterTextures([1.1,1.7]);` (low repeat so it does NOT tile behind the photo). Add
  `breast:new THREE.MeshStandardMaterial({color:'#D6CBB6', roughness:.92, map:breastTex.map, normalMap:breastTex.normalMap, normalScale:new THREE.Vector2(.55,.55), roughnessMap:breastTex.roughnessMap, aoMap:breastTex.aoMap, aoMapIntensity:.8})`.
  Change `MS.wall → MS.breast` in the line-1237 box **only** — geometry, size, position unchanged.
- **Reuse:** `loadClayPlasterTextures` (assetLoader.ts 619), same pattern as `MS.wall`.
- **Risk:** low. Hero clearances (y=2.72, fpZ+.17) untouched.
- **Why:** one ramp-step warmer/darker lime plaster quietly grounds the photo; the largest flat plane stops being a fill. Textbook material-not-ornament.

**1.3 Fake contact-occlusion / shadow-gap slivers (seats the boxes as one mass)**
- **Where:** inside the W3 block, after the mantel/hearth boxes (~1216-1219).
- **What:** one shared cached `const shadowMat=new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.32,depthWrite:false});`. Drop ~5-6 thin unlit quads/boxes: under the mantel-shelf overhang (`BoxGeometry(fbW+.9,.02,.01)` at y≈1.49, breast face), under the frieze where it meets the breast (y≈1.13), and a thin vertical sliver each side where jamb meets firebrick. `renderOrder` above the stone.
- **Reuse:** exact idiom already proven in-file on the sofa piping seam; `mk()`.
- **Risk:** low. No light-budget cost; works on mobile where there is no local light.
- **Why:** real stacked stone has contact shadow in every joint; this is the cue a photo has and a CG box lacks. Tint warm-grey (not pure black) and it doubles as a mortar/lime joint line.

**1.4 Always-on baked additive glow-card = mobile mantel key**
- **Where:** hero region near line 1456 / firebox; reuse `getGlowCardMat` (line 576).
- **What:** a low-opacity warm additive plane (`opacity ~.25`, color `#FFCE90`, ~1.4×1.0) in front of the firebox / lower breast, added **unconditionally** (NOT `isMobileGPU`-gated). Also bump `fireL` distance `5→6` (line 1232) so on desktop the real fire grazes the shelf underside (~1.5).
- **Reuse:** `getGlowCardMat`/`addGlowCard` (AdditiveBlending, disposed by the existing sweep); the `animTex` fire tick.
- **Risk:** low. **No 5th dynamic light.**
- **Why:** the ONLY mobile-safe way to give the new stone normals directional light to catch; on desktop the fire authentically lights the mantel from below (villa light comes from the fire, not a gallery picture-light).

**1.5 Walnut PBR on the hero frame**
- **Where:** `getWalnutFrameMat` (makeArtwork.ts:75-78).
- **What:** feed real maps: `map/normalMap/roughnessMap` from `loadWalnutWoodTextures([1,1])`, `normalScale .6`, keep tint `#3A2A1C`, `roughness .42`, `metalness .12`. Wrap in try/catch → fall back to the current bare material on SSR/no-renderer.
- **Reuse:** `loadWalnutWoodTextures` (assetLoader.ts 674, shipped); module-cached single material — improves every salon frame.
- **Risk:** low. Same silhouette, owner-tuned placement untouched.
- **Why:** the frame is the one object that BELONGS to the photo and is allowed to hold detail; real noce grain replaces a flat painted box.

**1.6 Plaque as real metal**
- **Where:** plate branch of makeArtwork.ts (~line 356).
- **What:** swap the engraved face from `MeshBasicMaterial` to `MeshStandardMaterial({map:plaqueTex, metalness:.85, roughness:.42, envMapIntensity:.9})`. Skip the roughness/bump sibling canvases on low `opts.quality` (mobile).
- **Reuse:** existing `plaqueTex` canvas + existing lights.
- **Risk:** low-medium (priority-2 polish). Keep the single material swap; defer bump/roughness siblings.
- **Why:** an unlit plate reads as a sticker; making it catch the fire highlight is honest material response, not ornament.

**1.7 Anisotropy on the new PBR clones**
- **Where:** extend the existing per-set aniso loop (line 454) to include `stoneTex, breastTex`.
- **What:** `tex.anisotropy = Math.min(isMobileGPU()?4:8, maxAniso); tex.needsUpdate=true` on map+normalMap+roughnessMap.
- **Risk:** low. Kills grazing-angle shimmer that reads CG.

**1.8 Quiet the brass (less brass, not warmer brass)**
- **Where:** gilt lip 1217, ceiling cornice 1238; optionally tablet 1213 / caps 1209.
- **What:** **delete the gilt lip** (1217) entirely — a brass strip on a stone shelf is exactly the "jewellery" that reads kitsch and violates "mat brons GEEN goud". **Re-material the ceiling cornice** (1238) from `MS.gold` to `MS.breast`/`MS.stone` (a gold band across the hero zone is the surviving heavy cue). Strongly consider making the centre tablet (1213) and pilaster caps (1209) `MS.stone` (carved stone) too — once the surround is matte grey they will otherwise stand out as pasted-on.
- **Risk:** low. Pure deletions / material swaps.
- **Why:** an austere Florentine chimneypiece has little-to-no brass; every strip removed is more restrained AND more authentic, and stops metal competing with the photo.

---

### PHASE 2 — Geometry / micro-detail (after Phase 1 is reviewed at the true camera angle)

**2.1 Chamfer / arris-highlight strips on load-bearing edges**
- **Where:** helper defined above the FIREPLACE block (~1198); apply on mantel-shelf top-front, bullnose front, frieze bottom-front, hearth tier fronts (~4-6 strips).
- **What:** a ~12mm square `BoxGeometry` lath rotated 45° so its face points up-and-out, in `MS.stone`, so cut-stone edges catch one specular sliver. `castShadow=false`.
- **Reuse:** `mk()`, `MS.stone`. No moulding tiers.
- **Risk:** low. Sub-centimetre; invisible as an "object", manifests only as a highlight line.

**2.2 Deterministic hand-cut settle (imperfection, not damage)**
- **Where:** jamb loop 1207-1211, hearth 1218-1219.
- **What:** assign the mesh to a const, then `m.rotation.z = s*0.010` (≈0.6°, mirrored per side); drop one hearth tier ~1mm. **Fixed offsets, NOT `Math.random()`** (random reshuffles every mount, breaks QA/snapshots).
- **Reuse:** same pattern already used on the fire logs (1234).
- **Risk:** low. Reads as settled masonry.

**2.3 Firebox depth + soot (recess, don't restyle)**
- **Where:** firebox back (1205), firebrick (1206, `MS.brickD`).
- **What:** darken firebox back to a warm sooted near-black with a faint vertical soot gradient rising up the breast (reuse the `getGlowCardMat` canvas idiom, dark/multiply). Map `MS.brickD` with `loadWornPlasterTextures` for real texture; darken `MS.iron` `#3A3A3A → #23211E` (warm wrought-iron black). Optionally recess the back a few cm with mobile-gated sooted cheeks/ash bed.
- **Reuse:** `getGlowCardMat`, `loadWornPlasterTextures` (assetLoader.ts 614).
- **Risk:** low-medium (cheeks/ash move logs/andirons — gate behind `isMobileGPU`, second pass).
- **Why:** fifty years of woodsmoke is what makes a real hearth read real; the soot gradient also vignettes the eye up to the photo. **The soot gradient is the highest realism-per-byte single change — commit it concretely.**

**2.4 Terracotta hearth floor (optional)**
- **Where:** hearth tiers 1218-1219.
- **What:** swap to a worn terracotta/cotto material (`loadTerracottaTileTextures`) instead of stone/marble bench.
- **Risk:** low. Authentic cotto hearth, not a polished marble bench.

> Do NOT bundle the coordinated re-proportioning (fbW 1.7→1.5, fbH, jamb/frieze widths) or the ExtrudeGeometry ogee shelf here. Both touch firebox/andiron/fire-light offsets and the owner-tuned clearances — separate higher-risk workstream, only if review still shows squat proportions or a razor shelf edge. A simple chamfer (2.1) gets ~80% of the "shelf catches light" benefit at a fraction of the risk. An ogee IS a moulding — avoid it.

---

### PHASE 3 — Objects / dressing / optional (deferred; opt-in after material pass lands)

**3.1 (Deferred / cut for now) mantel still-life.** The candlesticks + clock + olive-jar + books proposal (~12-16 primitives) is the single biggest regret risk: it adds real competing mass directly under the hero, narrows the protected 1.6-1.95 clearance band, and a mantel-clock-plus-matched-candlesticks trope skews English-drawing-room, not Tuscan-austere. **Do not ship in this pass.** If anything, ONE low asymmetric terracotta/olive jar off to one side, max — and only after Phase 1 review.

**3.2 (Optional, desktop-only, after profiling) SSAO for crevice contact-shadow.** Only if desktop review still wants more seating after the baked quads. Adds a NormalPass + SSAO pass to the interior desktop pipeline; mobile gets nothing. The baked quads (1.3) already give crevice separation on ALL devices for free — prefer them.

---

## 3. DO-NOT list

- **Do NOT** add carved ornament: no pilasters, fielded borders, entablature, stacked cornice/mouldings, or an ogee-profiled shelf. The owner rejected exactly this as "gekunsteld / veel te zwaar".
- **Do NOT** make the brass prettier/shinier/"like jewellery". Canon is **"mat brons, GEEN goud"** — trend toward LESS brass (delete the gilt lip, de-gold the cornice), not warmer brass.
- **Do NOT** move the hero: `mountArtwork(om,t,fpX, 2.72, fpZ+.17, 0, 2.0)` — keep **y=2.72, z=fpZ+.17**, and the plaque clearance above the **1.6** mantel shelf. New planes go on the breast face BEHIND the frame, never around the shelf.
- **Do NOT** exceed **~4 dynamic lights** (fire is one). No 5th Point/Spot on the hero — mobile leans on the baked additive glow-card (1.4) + stronger normals. Reuse/retarget the existing `fpSp` pattern on desktop rather than adding a light.
- **Do NOT** touch the SHARED postprocessing grade (AgX tonemapping swap, global SSAO enable) for a mantel-local problem — high blast-radius across exterior/corridor/hall. The matte materials carry the realism.
- **Do NOT** use `Math.random()` per-box jitter (non-deterministic, breaks QA). Use fixed mirrored offsets.
- **Do NOT** create ad-hoc materials outside `acquireMaterialSet` without pushing them to the existing dispose sweep (glow/shadow cards and any per-fireplace clones must be disposed on scene transition).
- **Do NOT** let the fire (or any glow) out-bright the photo — the photo stays the highest-contrast sRGB element (brightness dogma).
- **Do NOT** blow the mobile <150 draw-call budget: cap the chimneypiece to 2-3 distinct stone materials; net draw delta from Phase 1 is small (shadow quads ≈ boxes reused).

---

## 4. Verification

- Review each change at the **actual hero framing** via `/staging/room?rcam=hearth` — the owner's complaint is perceptual ("looks like Paint"), and several effects (normalScale, anisotropy, dropped clearcoat, contact slivers) only manifest at the specific grazing angle/distance the mantel is viewed from.
- Capture a **before/after screenshot at that camera** for each phase; gate shipping on the A/B, on **desktop AND a mobile GPU profile** (mobile is the constrained target and gets no local mantel light except the glow-card).
- Confirm after Phase 1: mobile draw-call assert (~line 3052) still passes; new materials/cards are disposed on scene transition; hero clearances visually intact (plaque clears the shelf).
