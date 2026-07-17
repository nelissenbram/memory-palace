# "Why a palace?" — FINAL spec (round 9, why4)

Creative-director decision. The 1-2-3 ledger is retired. The block becomes ONE
calm human argument: a still photograph of the woman approaching her wall (still
looking away, on the verge of touching), then a single warm proposition that
carries loci, then everyone, then enrich in one breath, then a quiet row of three
dynamic CSS/SVG line-icons that underline those three ideas without counting them,
then the kept italic payoff.

Synthesis of winning ideas: single centered-spine column (identical phone /
tablet / desktop), merged proposition (winning copy assembled from Idea 2 + #35
dignity beat), three icons that each animate ONE accent element on a static ink
structure (calm, not busy), loci leads and the icon order retraces the sentence.

STYLE RULE honored throughout: no em-dashes, commas only. Rem units throughout.
Every reading-critical word is ink `#403B36` on cream `#FCFAF5` (~9:1). No text
ever sits on the photo. React + CSS/SVG only.

---

## 1. Tokens (authoritative, use exactly)

| Role | Hex |
|---|---|
| canvas (cream) | `#FCFAF5` |
| surface (linen) | `#F2EDE4` |
| parchment | `#EFE6D4` |
| hairline | `#E3D6BC` |
| ink | `#403B36` |
| muted | `#716A5E` |
| rust accent | `#9A4F2A` |
| gold | `#D4AF37` |
| success | `#4A6741` |
| umber dark | `#241C15` |

Fonts: `var(--font-display)` = Cormorant Garamond (serif), `var(--font-body)` =
Manrope (sans), `var(--font-note)` = Caveat (handwriting).

---

## 2. Layout — precise implementable spec

SINGLE centered column, identical logic on phone, tablet and desktop. No split,
no pin, no scroll-swap. Reading order is one clean top-to-bottom spine, everything
left-aligned to the same left edge as the photo.

### 2.0 Section shell

- `<section aria-label={w.h2}>`, `background: #FCFAF5` (solid, no scrim).
- `padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)` (block, then inline).
- Inner wrapper (`ref` target for the IntersectionObserver): `max-width: 58rem;
  margin: 0 auto;`.
- Keep the existing `rise(delay)` reveal helper (opacity 0 to 1, translateY
  0.75rem to 0, `0.6s ease`) and its `inView` IntersectionObserver. Reduced-motion
  already renders at rest instantly via the existing `prefersReducedMotion()`
  short-circuit.

### 2.1 STILL PHOTO (top, a hung companion, NEVER a text bed)

- `<figure role="img" aria-label={w.aria || w.h2}>`, `margin: 0 0 clamp(2rem, 4vw, 3rem)`.
- Framed well div: `position: relative; aspect-ratio: 16 / 9; overflow: hidden;
  border-radius: 1rem; border: 1px solid #E3D6BC; box-shadow: 0 1.5rem 3rem
  rgba(36,28,21,0.16); background: #EFE6D4` (parchment mat shows while loading).
- `next/image`: `fill`, `priority={false}`, `sizes="(max-width: 62rem) 100vw, 58rem"`,
  `style={{ objectFit: "cover", objectPosition: "50% 40%" }}` so her upward gaze
  toward the wall and at least two framed memories stay in view.
- SRC: the EARLY still where she is walking up and looking away (approaching, hand
  not yet raised). Extract from `public/video/why-clip.mp4` at ~0.4s to 1.2s (before
  the reach) and save as `public/video/why-approach.jpg`. FALLBACK until extracted:
  `/video/why-poster.jpg`. Wire src as `/video/why-approach.jpg` with the poster as
  a safe default so the block never renders empty.
- `alt=""` (decorative, described by the proposition and the figure aria-label).
- REMOVE ENTIRELY: the `<video>`, `wantVideo`, `paused`, `videoRef`, `toggle`,
  `connectionConstrained`, the play/pause `<button>`, and the second
  `useEffect`/`useEffect` video machinery (lines 44-83, 103-130 of the current
  file). NO video, NO play button, NO scrim, NO caption, NO tilt.
- Rise delay `0s`. Because it is a still, no reduced-motion branch is needed for
  the image itself.

### 2.2 WORDS block (below photo, on bare cream, left-aligned)

Inner container `max-width: 46rem`.

1. EYEBROW `<p>`: `font-family: var(--font-note)` (Caveat), `font-weight: 600;
   font-size: 1.25rem; letter-spacing: 0.02em; color: #9A4F2A` (rust, small
   decorative label ~5.4:1, allowed), `margin: 0`. Rise `0.08s`. Text = `w.eyebrow`.
2. GOLD HAIRLINE `<span aria-hidden>`: `display: block; width: 3rem; height: 2px;
   background: #D4AF37; opacity: 0.6; margin: 0.75rem 0 1.5rem`. Rise `0.08s`.
3. H2 `<h2>`: `font-family: var(--font-display)` (Cormorant), upright,
   `font-weight: 600; font-size: clamp(2rem, 4.5vw, 3rem); line-height: 1.1;
   color: #403B36; text-wrap: balance; margin: 0`. Rise `0.12s`. Text = `w.h2`.
4. PROPOSITION `<p>` (replaces the three numbered rows): `font-family:
   var(--font-body)` (Manrope), `font-weight: 400; color: #403B36` (FULL ink,
   never muted); `font-size: clamp(1.125rem, 1.6vw, 1.25rem)` (18px floor for
   older eyes); `line-height: 1.6; max-width: 42rem; margin-top: clamp(1.5rem,
   3vw, 2rem)`. One flowing paragraph, no numerals, no bullets, no rules between
   ideas. Rise `0.2s`. Text = `w.proposition`. Contrast ink-on-cream ~9:1.

### 2.3 ICON ROW (beneath the proposition, above the payoff)

The three dynamic icons. They sit UNDER the proposition to reinforce it, read as a
matched SET (not a numbered sequence), and retrace the argument left-to-right:
loci, then everyone, then enrich.

- Container `<div>`: `margin-top: clamp(2rem, 4vw, 2.75rem)`. A `1px solid
  #E3D6BC` top hairline with `padding-top: clamp(1.75rem, 3.5vw, 2.25rem)` sets
  the row apart as a quiet restatement (spacing/hairline only, no box). Rise on
  the container at `0.3s`.
- Grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap:
  clamp(1rem, 3vw, 2rem); max-width: 40rem`. Stays 3-across at EVERY width
  (3 x 3rem + 2 gaps of min 1rem = ~176rem-scaled fits 320px comfortably), so no
  reflow. Do NOT stack to one-per-row (stacking re-implies a broken list).
- Each cell: centered vertical stack, `align-items: start; text-align: center`.
  - Icon glyph: inline SVG, `width: 3rem; height: 3rem` (`2.5rem` on very narrow
    phones under `30rem` via clamp), `viewBox="0 0 24 24"`, `fill: none; stroke:
    #716A5E` (muted) for the structure at `stroke-width: 1.5; stroke-linecap:
    round; stroke-linejoin: round`, plus ONE accent element per icon in rust
    `#9A4F2A` or gold `#D4AF37` that carries the motion. `aria-hidden="true"`.
  - Label under it: `font-family: var(--font-body)` (Manrope), `font-weight: 500;
    font-size: 0.9375rem; letter-spacing: 0.02em; color: #716A5E; margin-top:
    0.625rem; line-height: 1.3`. Cap labels at 2 to 3 words; allow 2-line wrap,
    centered, so the row stays balanced. Labels are the load-bearing meaning (the
    proposition already carries the argument in full ink); the icons are felt
    reinforcement.
- Icons animate their single accent element only; the ink structure stays still,
  so the motion reads as alive, not busy. Loop durations are offset (3.2s / 4s /
  1.2s bars) so they never sync into one distracting pulse.

### 2.4 PAYOFF (bottom, kept verbatim, the one italic moment)

- `<p>`: `font-family: var(--font-display)` (Cormorant), `font-style: italic;
  font-weight: 500; font-size: clamp(1.5rem, 2.6vw, 2rem); line-height: 1.25;
  color: #403B36; margin-top: clamp(2rem, 4vw, 2.75rem); padding-left: 1.25rem;
  border-left: 3px solid #9A4F2A`. Rise `0.42s`. Text = `w.payoff`.

### 2.5 Motion + contrast summary

- One-time fade+rise on the figure then words then icon row then payoff, staggered
  (0s / 0.08s / 0.12s / 0.2s / 0.3s / 0.42s), fires once. The ONLY continuous
  motion is the three icon accent loops.
- ALL icon keyframes wrapped in `@media (prefers-reduced-motion: no-preference)`
  so motion-sensitive users get static icons at their resting frame. Define
  keyframes + classNames once in a scoped `<style>` block / CSS module.
- Every reading-critical word is ink `#403B36` on cream `#FCFAF5` (~9:1). Rust
  eyebrow (~5.4:1) is a small decorative label. Gold hairline, muted icon
  structure, and muted labels carry no body-text load. No text over the photo.

---

## 3. Final proposition + payoff (5 locales, no em-dashes, commas only)

The merged proposition fuses the three ideas: sentence 1 carries LOCI (the oldest
way) plus EVERYONE (you have always done it, and yours is worth keeping), sentence
2 carries ENRICH given its own clause ending on the strongest verb, handing into
the payoff. The dignity beat "rich or humble, near or far" is preserved.

### EN

Eyebrow (kept): **The oldest way to remember**

H2 (kept): **The palace in your mind, at last a place you can walk into**

Proposition (`w.proposition`):
> For 2,500 years, people have remembered by placing what matters in the rooms of a house they could picture, and you have been doing it your whole life without knowing its name. Rich or humble, near or far, every life has quietly gathered a palace like this, and yours is worth keeping. Here that house becomes real, a place you can walk into, where every photo on the wall keeps the voice, the day, and the story behind it, so it can be touched, not only seen.

Payoff (kept verbatim, `w.payoff`):
> You don't scroll a life. You walk up and touch it.

aria (`w.aria`, updated for the approaching still):
> A woman in warm golden light walking up to the framed photographs on the wall of her memory palace, about to reach out.

### NL (je)

Eyebrow: **De oudste manier om te onthouden**

H2: **Het paleis in je hoofd, eindelijk een plek waar je binnen kunt lopen**

Proposition:
> Al 2.500 jaar onthouden mensen door te plaatsen wat telt in de kamers van een huis dat ze voor zich kunnen zien, en jij doet het je hele leven al, zonder er een naam voor te kennen. Rijk of eenvoudig, dichtbij of ver weg, elk leven heeft stilletjes zo'n paleis verzameld, en het jouwe is het bewaren waard. Hier wordt dat huis echt, een plek waar je binnen kunt lopen, waar elke foto aan de muur de stem, de dag en het verhaal erachter bewaart, zodat je het kunt aanraken, niet alleen zien.

Payoff:
> Je scrolt geen leven. Je loopt ernaartoe en raakt het aan.

aria:
> Een vrouw in warm gouden licht die naar de ingelijste foto's aan de muur van haar geheugenpaleis loopt, op het punt om ze aan te raken.

### DE (Sie)

Eyebrow: **Die aelteste Art, sich zu erinnern**

H2: **Der Palast in Ihrem Kopf, endlich ein Ort, den Sie betreten koennen**

Proposition:
> Seit 2.500 Jahren erinnern sich Menschen, indem sie das Wichtige in die Raeume eines Hauses legen, das sie sich vorstellen koennen, und Sie tun es Ihr ganzes Leben lang, ohne einen Namen dafuer zu kennen. Ob reich oder bescheiden, nah oder fern, jedes Leben hat still einen solchen Palast gesammelt, und Ihrer ist es wert, bewahrt zu werden. Hier wird dieses Haus wirklich, ein Ort, den Sie betreten koennen, wo jedes Foto an der Wand die Stimme, den Tag und die Geschichte dahinter bewahrt, sodass es beruehrt werden kann, nicht nur gesehen.

Payoff:
> Man scrollt kein Leben. Man geht hin und beruehrt es.

aria:
> Eine Frau in warmem goldenem Licht geht auf die gerahmten Fotos an der Wand ihres Gedaechtnispalastes zu und ist im Begriff, sie zu beruehren.

### ES

Eyebrow: **La forma mas antigua de recordar**

H2: **El palacio en tu mente, por fin un lugar en el que puedes entrar**

Proposition:
> Desde hace 2.500 anos, las personas recuerdan colocando lo que importa en las habitaciones de una casa que pueden imaginar, y tu llevas haciendolo toda la vida sin saber su nombre. Humilde o grande, cercana o lejana, cada vida ha reunido en silencio un palacio como este, y el tuyo merece conservarse. Aqui esa casa se hace real, un lugar en el que puedes entrar, donde cada foto de la pared guarda la voz, el dia y la historia que hay detras, para que se pueda tocar, no solo ver.

Payoff:
> No se recorre una vida deslizando. Te acercas y la tocas.

aria:
> Una mujer bajo una calida luz dorada se acerca a las fotografias enmarcadas en la pared de su palacio de la memoria, a punto de tocarlas.

### FR

Eyebrow: **La plus ancienne facon de se souvenir**

H2: **Le palais dans votre esprit, enfin un lieu ou vous pouvez entrer**

Proposition:
> Depuis 2 500 ans, les gens se souviennent en placant ce qui compte dans les pieces d'une maison qu'ils peuvent imaginer, et vous le faites depuis toujours sans en connaitre le nom. Modeste ou riche, proche ou lointaine, chaque vie a rassemble en silence un palais comme celui-ci, et le votre merite d'etre garde. Ici cette maison devient reelle, un lieu ou vous pouvez entrer, ou chaque photo au mur garde la voix, le jour et l'histoire qui se cachent derriere, pour qu'on puisse la toucher, et pas seulement la voir.

Payoff:
> On ne fait pas defiler une vie. On s'en approche et on la touche.

aria:
> Une femme, dans une chaude lumiere doree, s'avance vers les photographies encadrees au mur de son palais de memoire, sur le point de les toucher.

---

## 4. The 3 dynamic icon specs

Three inline-SVG line-icons, 3rem square (`viewBox="0 0 24 24"`), muted `#716A5E`
structure at `stroke-width 1.5`, ONE accent element each carrying a gentle CSS
keyframe loop on a static structure. All loops gated behind
`@media (prefers-reduced-motion: no-preference)`; under reduced-motion the accent
renders at its resting frame (full opacity, base scale, mid-height bars). Order
left to right retraces the proposition: LOCI, EVERYONE, ENRICH.

### Icon 1 — LOCI (placed in rooms)

- Depicts: a simple room in one-point-perspective, an open doorway on the right,
  and a small framed rectangle on the back wall holding one placed memory.
- Structure (muted `#716A5E`): the room walls and the doorway outline, static.
- Accent (gold `#D4AF37`): the small dot/memory inside the wall frame.
- Animation `mp-why-loci`: the gold memory dot gently pulses, `transform: scale(1)
  to scale(1.15)` with `opacity: 0.55 to 1`, `transform-origin: center`,
  `3.2s ease-in-out infinite`. Reads as a remembered thing glowing where it was
  set down. The room and door stay still.

```css
@media (prefers-reduced-motion: no-preference) {
  .mp-why-loci-dot { animation: mp-why-loci 3.2s ease-in-out infinite; transform-origin: center; }
}
@keyframes mp-why-loci {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%      { transform: scale(1.15); opacity: 1; }
}
```

Labels: EN **Placed in rooms** / NL **In kamers geplaatst** / DE **In Raeume
gelegt** / ES **Puesto en habitaciones** / FR **Place dans des pieces**

### Icon 2 — EVERYONE (everyone already has one)

- Depicts: a small pitched-roof house outline with a soft heart/hearth mark inside,
  standing for the palace every life has quietly gathered.
- Structure (muted `#716A5E`): the house outline, static.
- Accent (rust `#9A4F2A`): the heart/hearth mark inside.
- Animation `mp-why-everyone`: the whole glyph breathes very softly, `transform:
  scale(1) to scale(1.04)`, `transform-origin: center`, `4s ease-in-out infinite`,
  and the inner rust heart fades `opacity: 0.7 to 1` in sync, a slow warm heartbeat
  saying you already carry one. Low amplitude so it settles, never jumps.

```css
@media (prefers-reduced-motion: no-preference) {
  .mp-why-everyone      { animation: mp-why-breathe 4s ease-in-out infinite; transform-origin: center; }
  .mp-why-everyone-heart{ animation: mp-why-heart 4s ease-in-out infinite; }
}
@keyframes mp-why-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes mp-why-heart   { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
```

Labels: EN **Everyone has one** / NL **Iedereen heeft er een** / DE **Jeder hat
einen** / ES **Todos tienen uno** / FR **Chacun en a un**

### Icon 3 — ENRICH (the voice stays)

- Depicts: a framed photo (rounded rectangle with a small mountain/figure line
  inside) and, to its right, three short vertical bars forming a voice waveform,
  so the still photo visibly speaks. ENRICH gets the most active icon so the
  differentiator stays load-bearing.
- Structure (muted `#716A5E`): the photo frame and its inner picture line, static.
- Accent (rust `#9A4F2A`): the three waveform bars, the middle bar carries the
  eye.
- Animation `mp-why-wave`: the three bars bounce in a staggered equalizer,
  `transform: scaleY(0.4) to scaleY(1) to scaleY(0.4)`, `transform-origin: bottom`,
  `1.2s ease-in-out infinite`, `animation-delay: 0s / 0.15s / 0.3s`, so the picture
  audibly "speaks". Frame stays still.

```css
@media (prefers-reduced-motion: no-preference) {
  .mp-why-bar { animation: mp-why-wave 1.2s ease-in-out infinite; transform-origin: bottom; }
  .mp-why-bar:nth-child(2) { animation-delay: 0.15s; }
  .mp-why-bar:nth-child(3) { animation-delay: 0.30s; }
}
@keyframes mp-why-wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
```

Labels: EN **The voice stays** / NL **De stem blijft** / DE **Die Stimme bleibt**
/ ES **La voz permanece** / FR **La voix demeure**

---

## 5. Implementation checklist (component + i18n + asset)

- File: `src/components/landing/WhyPalaceVisual.tsx`. Rewrite: drop all video state
  and controls (`wantVideo`, `paused`, `videoRef`, `toggle`,
  `connectionConstrained`, the video `useEffect`s, the `<video>` and play/pause
  `<button>`); keep `inView` + `rise()`. Replace the three `rows` and their JSX
  with one proposition `<p>` (`w.proposition`) + the 3-icon grid + the kept payoff.
  Add a scoped `<style>` block for the three keyframe sets above.
- i18n: in ALL five locales (`src/messages/en.json` why block ~lines 5226-5238,
  plus `nl/de/es/fr.json`), RETIRE `b1lead b1sub b2lead b2sub b3lead b3sub`
  (and `play` / `pause`, now dead). ADD `proposition`, `iconLoci`, `iconEveryone`,
  `iconEnrich`. KEEP `eyebrow`, `h2`, `payoff`, and update `aria` to the
  approaching-still description. A `why.body` key already exists in en.json
  (currently unused); either reuse it as `proposition` or overwrite. Ship all
  locales in ONE pass or non-EN renders raw key names (the component reads keys
  with no fallback).
- Asset (REQUIRED pre-ship): extract the early "looking-away / approaching" frame
  from `public/video/why-clip.mp4` (~0.4s to 1.2s) and save
  `public/video/why-approach.jpg`; verify the woman and at least two wall frames
  survive the 16/9 crop at 375 / 768 / 1280px, nudge `objectPosition` toward
  `55% 40%` if she clips. Until then the src falls back to `/video/why-poster.jpg`
  (the touching moment), which weakens the "not yet touching" intent but never
  breaks the block. Confirm the frame is sharp and golden-hour, not a blurry
  motion frame, before ship.
