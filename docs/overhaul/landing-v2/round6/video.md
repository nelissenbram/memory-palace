# The Guided Walk — Final Tour Video Direction

**Section:** `#tour` ("See it in action") in `src/app/LandingV2Client.tsx` (idle doorway ~L1029–1071, `startTour` ~L479–489, boxed player branch ~L1013–1025, helpers `prefersReducedMotion()` L52 / `connectionIsConstrained()` L56).

This document is the FINAL decision. Build this, not the variants.

---

## 0. VERIFIED GROUND TRUTH (ffprobe / ffmpeg — do not re-litigate)

Ran against `public/video/walkthrough.mp4`:

- **Duration: 30.07s.**
- **ONE stream, `codec_type=video`. There is NO audio track.** The file is silent.
- **Real scene cuts (ffmpeg `select='gt(scene,0.35)'` + a 0.25 pass):** `~9.97s`, `~15.53s`, `~21.9s`, `~27.07s` (a minor in-scene camera move sits at `~4.17s`, ignore it). These are the true 5-scene boundaries and are the ONLY timing anchors we use.

**Consequences that override the brief and most ideas:**

1. **KILL every "with sound on" / "Watch with sound" promise.** The video is silent — promising audio is a lie the 60+ audience will notice. The captions ARE the narration.
2. **KILL every "0.8x lowers audio pitch" / "preservesPitch" / "sludgy voice" risk line.** There is no audio to degrade. Slowing playback is free of penalty.
3. **Play the video MUTED** (`v.muted = true`). This is both honest (nothing to hear) and the most reliable autoplay-after-gesture path across iOS WKWebView (the Capacitor shell this app ships in). The current code sets `v.muted = false` at ~L485 — **that is a bug; fix it to `true`.**
4. **KILL freeze-frame / `playbackRate=0` / per-scene rate-ramp "holds."** Pausing or ramping the video reads as buffering/jank to a trust-sensitive older audience. Use a continuous CSS "settle" instead (§4).
5. Anchor captions to `video.currentTime` mapped against the real cuts above — **never `setTimeout`, never wall-clock, never guessed second-marks.** currentTime is in source-time and survives pause/seek/rate change.

Poster asset exists: `public/video/walkthrough-poster-v2.jpg`.

---

## 1. THE EXPERIENCE (one paragraph)

Click the gold doorway and the section walls dissolve: the walkthrough goes **full-bleed** behind the entire dark band — edge to edge, no box, no rounded card, no browser chrome. It plays **muted at 0.8x** (30s → ~37.5s of unhurried screen time). A soft **centered "reading lane" vignette** keeps the middle of the picture bright and watchable while darkening the left/right margins into legible gutters. Across the five scenes, **one short serif caption at a time** fades in — alternating LEFT, RIGHT, LEFT, RIGHT, then CENTER for the sign-off — each naming what the eye is seeing in warm, plain language. It feels like someone quietly showing you their home, one room at a time. It never promises sound it doesn't have.

---

## 2. INTERACTION

### 2.1 Idle (unchanged foundation)
Keep today's resting state: dark umber section (`#241C15`), poster `walkthrough-poster-v2.jpg` at opacity `0.55` behind the existing radial vignette, one breathing gold doorway ring. **No autoplay, ever.** `preload="none"` so the 12.5MB file is only fetched on click.

**Change the idle micro-copy** (the Caveat sub-line under the doorway, currently `v2.showcase.soundCta` = "with sound"):
→ **"About 30 seconds · no sound needed"** (`v2.showcase.tourNote`). This sets the honest expectation and removes the false audio promise.

### 2.2 Full-bleed play
On click, extend `startTour()`:
- `setTourPlaying(true)`.
- In the existing `rAF` block: `v.muted = true; v.currentTime = 0; v.playbackRate = 0.8; v.play()`.
- **Replace the boxed 62rem `<video>` branch.** Render `<video>` as `position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; margin:0; border-radius:0; box-shadow:none`, `playsInline`, **no `controls`**, inside the `<section>` (already `position:relative; overflow:hidden`). It sits ABOVE the poster and vignette, BELOW captions/controls.
- Cross-fade poster `<Image>` opacity `0.55 → 0` over `600ms`; fade video `0 → 1` over `600ms` (avoids a black flash). Fade the doorway button out (`200ms`) and unmount it.
- Fade the center heading block (Eyebrow / H2 / sub) to `opacity 0` (`400ms`) so the film owns the frame; keep it in the DOM for a11y.
- Give the section `min-height: clamp(30rem, 56vw, 44rem)` in BOTH idle and playing states so nothing jumps on click.

### 2.3 Controls (custom, replaces native chrome)
Bottom-center pill, `z-index:5`, appears on play, auto-hides after 3s idle, reappears on `pointermove`/focus:
- **Pause/Play toggle** (swaps ▮▮ / ▶ SVG). Pause also freezes the active caption.
- **Close ✕** — pauses, `currentTime = 0`, `setTourPlaying(false)`, restores poster + heading + doorway, **returns focus to the doorway button**.
- Pill: `background: rgba(36,28,21,0.55); backdrop-filter: blur(8px); border: 1px solid rgba(212,175,55,0.4); border-radius: 999px; padding: 0.5rem 1rem`. Buttons ≥ `2.75rem` tap targets (60+/WCAG).
- **Thin gold progress hairline** riding the pill top (or pinned to section bottom): height `0.1875rem`, gold `#D4AF37`, `width = currentTime / duration`, updated in the same `timeupdate` handler. No mute button (nothing to mute).
- **Keyboard:** `Space` = pause toggle, `Esc` = close. Real `<button>`s with `aria-label`s (reuse `v2.a11y.pause` / `v2.a11y.play` / `v2.a11y.close`).
- **Click anywhere on the video** = pause toggle.
- On `ended`: hold the last frame, keep the Scene-5 caption up, and fade up the **primary CTA** center — "Create your palace" (see §6) — plus a ghost "Watch again ↺" that resets to `0` and replays.

### 2.4 Reduced-motion / saveData fallback
If `prefersReducedMotion() || connectionIsConstrained()`: the doorway click does **NOT** load or play the video. Instead:
- Cross-fade the poster to opacity `1` (still full-bleed).
- Render **all five caption lines as a static, stacked "storyboard"** (scene label + line, in order), no motion, no download.
- Offer one explicit opt-in text link: **"▶ Play the tour"** that then plays the muted video with the normal experience.

This delivers the entire narrative to everyone — no forced motion, no forced 12.5MB.

---

## 3. THE READING LANE (legibility over moving video)

Two layers above the video (`z-index:2`), below captions/controls:

1. **Centered reading-lane vignette** (keeps the bright middle watchable, darkens margins where text lives):
   ```
   radial-gradient(ellipse 62% 78% at 50% 50%, rgba(36,28,21,0) 34%, rgba(36,28,21,0.55) 100%),
   linear-gradient(90deg, rgba(36,28,21,0.72) 0%, rgba(36,28,21,0) 26%, rgba(36,28,21,0) 74%, rgba(36,28,21,0.72) 100%)
   ```
2. **Per-caption directional scrim** (the load-bearing legibility guarantee). Each caption sits on its OWN local scrim so it never floats over a busy or bright frame — a soft edge gradient behind that side only, `~28rem` wide:
   - LEFT captions: `linear-gradient(90deg, rgba(36,28,21,0.72) 0%, rgba(36,28,21,0.30) 55%, transparent 100%)`
   - RIGHT captions: mirrored.
   - The active side's scrim animates to full opacity with its caption; the idle side stays at 0.

**Text insurance:** every caption line also carries `text-shadow: 0 1px 12px rgba(36,28,21,0.85)`. **Verify against the two brightest frames — the golden-hour exterior (Scene 1) and the fireplace glow (Scene 4)** — on a real screen; bump that side's scrim to `0.80` if contrast dips below 4.5:1.

---

## 4. HOW IT FEELS SLOWER / CLEARER

Three levers, all shipped, none of them a pause/freeze:

1. **`playbackRate = 0.8`** — the single biggest lever. 30s → ~37.5s. Turns frantic pans into a slow drift. Zero audio penalty (silent file). Do **not** go to 0.7 — slower reads as sluggish/laggy with no comprehension gain.
2. **Per-scene continuous "settle"** — on entering each scene, apply a CSS `transform: scale(1.04) → scale(1.0)` on the video over ~1.6s ease-out. This reads as the camera gently easing to rest at each room, giving the eye a place to land — **without ever pausing the video** (no buffering illusion). Disable under reduced-motion.
3. **One caption per scene, held its whole scene** — never two on screen; each idea gets ~5.5–9.5s of dwell, comfortably above the 60+ reading threshold for a 3–5 word serif line. The caption itself is the pacer.

---

## 5. SIDE-ANNOTATION SYSTEM

### Count & sides
**Exactly 5 captions, one per scene, never two at once.** Alternating sides lead the eye across the walk:

| Scene | Cut window (source sec) | Fraction of duration | Side |
|---|---|---|---|
| 1 · Exterior | 0.00 – 9.97 | 0.000 – 0.331 | **LEFT** |
| 2 · Doors | 9.97 – 15.53 | 0.331 – 0.517 | **RIGHT** |
| 3 · Corridor | 15.53 – 21.90 | 0.517 – 0.728 | **LEFT** |
| 4 · Room | 21.90 – 27.07 | 0.728 – 0.900 | **RIGHT** |
| 5 · Close | 27.07 – 30.07 | 0.900 – 1.000 | **CENTER-LOW** |

**Store as fraction-of-duration** so a re-encode to a different length cannot desync the captions:
```js
const SCENES = [
  { key: 'Exterior', side: 'left',   start: 0.000, end: 0.331 },
  { key: 'Doors',    side: 'right',  start: 0.331, end: 0.517 },
  { key: 'Corridor', side: 'left',   start: 0.517, end: 0.728 },
  { key: 'Room',     side: 'right',  start: 0.728, end: 0.900 },
  { key: 'Close',    side: 'center', start: 0.900, end: 1.000 },
];
```

### Driver
A single `timeupdate` (or `rAF`) handler computes `progress = currentTime / duration`, finds the scene where `progress ∈ [start, end)`, and sets `activeScene`. **Only call `setState` when the index actually changes** (integer compare) to avoid per-frame render thrash. Show each caption from `start + 0.02` to `end - 0.02` so it clears the hard cut. Because it's currentTime-driven, captions stay glued through pause, seek, and the 0.8x rate.

### Placement
- Absolute, vertically centered-ish: `top: 38%`. `z-index:4` (above video + scrim, below controls).
- LEFT: `left: clamp(1.5rem, 6vw, 5rem)`, `text-align: left`. RIGHT mirrored. Max-width `20rem` so lines stay 2–5 words.
- Scene 5 (center): centered horizontally, lower (`top: 58%`), above where the end-card CTA appears.

### Type
- **Optional scene eyebrow** (§6 labels) in `var(--font-note)` Caveat, gold `#D4AF37`, `~1.15rem`, letter-spacing `0.06em`.
- **Line** in `var(--font-display)` Cormorant Garamond, `clamp(1.5rem, 3.2vw, 2.5rem)`, weight `500`, color canvas `#FCFAF5`, letter-spacing `0.01em`, line-height `1.15`, `text-wrap: balance`.

### Enter / exit
Keyed by scene index so React remounts → animation retriggers.
- **Enter:** `opacity 0→1` + slide `0.75rem` inward from the anchored edge (LEFT slides in from left; CENTER just rises `0.5rem`), `700ms` ease-out.
- **Exit:** `opacity 1→0` + slight rise `0.5rem`, `450ms`. Cross-fade window ~`350ms`; exit begins before the next enters so they never stack.
- **Reduced-motion:** opacity-only cross-fade, no translate/scale.

### Mobile (< 48rem)
No side gutters exist over a portrait cover-crop. **Collapse all five to a single bottom-center lane** (`bottom: 6rem`, `text-align: center`, `max-width: calc(100vw - 3rem)`) over a bottom-up scrim `linear-gradient(0deg, rgba(36,28,21,0.85), transparent)`. Same copy, same timing, no left/right.

### Accessibility
Captions are decorative over video, so **also expose the five lines as real DOM text** (visually-hidden ordered list) and wrap the live caption in an `aria-live="polite"` region so screen readers announce each scene as it appears.

---

## 6. FINAL COPY — annotation lines per scene, all 5 locales

Voice: short, warm, plain. **No "3D / immersive / AI / sound" jargon.** Add under `landingV2.showcase` as new keys (e.g. `capExterior`/`capExteriorEyebrow` … `capClose`), across `en/nl/de/es/fr`, **SSR-sealed like the neighboring showcase strings** (iOS Apple 3.1.1 constraint — see below).

### Scene 1 — EXTERIOR (golden hour) · LEFT
| Locale | Eyebrow | Line |
|---|---|---|
| EN | Outside | A whole home — for a whole life. |
| NL | Buiten | Een heel huis — voor een heel leven. |
| DE | Draußen | Ein ganzes Zuhause — für ein ganzes Leben. |
| ES | Fuera | Una casa entera — para toda una vida. |
| FR | Dehors | Une maison entière — pour toute une vie. |

### Scene 2 — ENTRANCE / WING DOORS · RIGHT
| Locale | Eyebrow | Line |
|---|---|---|
| EN | The doors | Every door opens a chapter. |
| NL | De deuren | Elke deur opent een hoofdstuk. |
| DE | Die Türen | Jede Tür öffnet ein Kapitel. |
| ES | Las puertas | Cada puerta abre un capítulo. |
| FR | Les portes | Chaque porte ouvre un chapitre. |

### Scene 3 — CORRIDOR OF FRAMED PHOTOS · LEFT
| Locale | Eyebrow | Line |
|---|---|---|
| EN | The hallway | Walk past your memories — together. |
| NL | De gang | Loop langs je herinneringen — samen. |
| DE | Der Flur | Geht an euren Erinnerungen entlang — gemeinsam. |
| ES | El pasillo | Recorre tus recuerdos — juntos. |
| FR | Le couloir | Parcourez vos souvenirs — ensemble. |

### Scene 4 — FURNISHED MEMORY ROOM (photos, fireplace, piano) · RIGHT
| Locale | Eyebrow | Line |
|---|---|---|
| EN | A room | Photos, voices and stories, all in one place. |
| NL | Een kamer | Foto's, stemmen en verhalen, alles op één plek. |
| DE | Ein Raum | Fotos, Stimmen und Geschichten — alles an einem Ort. |
| ES | Una sala | Fotos, voces e historias, todo en un solo lugar. |
| FR | Une pièce | Photos, voix et récits, tout au même endroit. |

### Scene 5 — CLOSE · CENTER-LOW (soft sign-off, no eyebrow)
| Locale | Line | Micro-CTA (reuse primary CTA styling) |
|---|---|---|
| EN | Your family's story, kept for good. | Create your palace → |
| NL | Het verhaal van je familie, voorgoed bewaard. | Maak je paleis → |
| DE | Die Geschichte deiner Familie — für immer bewahrt. | Erstelle deinen Palast → |
| ES | La historia de tu familia, guardada para siempre. | Crea tu palacio → |
| FR | L'histoire de votre famille, gardée pour toujours. | Créez votre palais → |

**Idle doorway (all locales):** label = existing "Take the 30-second tour" equivalent; sub-note = the new **"About 30 seconds · no sound needed"** key (`v2.showcase.tourNote`), translated per locale.

---

## 7. BUILD CHECKLIST / GUARDRAILS

- [ ] **Fix the muted bug:** `v.muted = true` (currently `false` at ~L485).
- [ ] Remove the "with sound" copy; add `tourNote` = "no sound needed".
- [ ] Replace boxed player with full-bleed `object-fit: cover` video, no `controls`, `playsInline`, `preload="none"`.
- [ ] Anchor captions to `currentTime/duration` fractions (§5 table), driven by `timeupdate`, integer-compare `setState`.
- [ ] Per-caption directional scrim + `text-shadow`; verify Scene 1 (sun) and Scene 4 (fireplace).
- [ ] `playbackRate = 0.8`; per-scene `scale(1.04)→1.0` settle (no pause/freeze/ramp).
- [ ] Custom pill controls (pause / close / progress hairline), `Space`/`Esc`, focus return to doorway.
- [ ] Reduced-motion / saveData → poster + static 5-caption storyboard + explicit "▶ Play" opt-in.
- [ ] Mobile < 48rem → single bottom-center caption lane.
- [ ] Real DOM caption text + `aria-live="polite"`.
- [ ] 12 new i18n keys (5 eyebrows + 5 lines + `tourNote` + reuse CTA) × 5 locales, **SSR-sealed** for iOS.
- [ ] **iOS CTA sealing (Apple 3.1.1 history):** the Scene-5 micro-CTA and end-card CTA must NOT contain "Free" and must route to `/atrium` (never `/pricing`) on iOS. Match the neighboring hero/showcase CTA sealing exactly.
