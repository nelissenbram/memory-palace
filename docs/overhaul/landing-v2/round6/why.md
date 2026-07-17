# "Why a palace?" — FINAL block (round 6)

## Decision

**One full-bleed `band-together.jpg` hero. No diagram, no composite, no fake UI, no before/after.**

The three judging panels converge on the same truth: `band-together.jpg` is the single load-bearing asset and it genuinely delivers the whole argument — golden-hour light, a woman seen from behind, her hand literally pressed to a framed photo on a warm terracotta wall, an archway of light, dust motes. The "reach up and touch a memory" gesture is *real in the image*, not aspirational. Every winner across two of the three panels is a clean single-image `band-together` hero; the asset persuades on its own and needs no decoding.

We reject the split-screen / fake-folder / file-list / composite / `band-corridor` ideas (Judge 3's argument that a single image "can't prove palace > folder" is noted, but the fabricated-UI and pasted-frame routes are exactly the constructed, diagram-y approach that looked cheap the last two times — killed by both other panels). Instead the **copy** carries the folder-vs-palace contrast explicitly, and — taking Judge 1's strongest-angle finding — the H2/body lead with the deeper Heritage-Keeper fear (*being the one everyone comes back to*, vs. being forgotten) rather than mere storage.

Winning pattern = full-bleed premium render + one restrained line seated in the already-dark left/lower-left + a mandatory legibility scrim + exactly one ornament (a gold hairline) + one tiny handwritten caption near the hand + a single slow Ken Burns push-in that goes static under `prefers-reduced-motion`.

---

## Final copy (5 locales)

### Eyebrow — `--font-note` (Caveat), gold `#D4AF37`

| Locale | Text |
|--------|------|
| EN | Why a palace, and not a folder |
| NL (je) | Waarom een paleis, en geen map |
| DE (Sie) | Warum ein Palast – und kein Ordner |
| ES | Por qué un palacio, y no una carpeta |
| FR | Pourquoi un palais, et non un dossier |

### H2 — `--font-display` (Cormorant, italic), cream `#FCFAF5`

| Locale | Text |
|--------|------|
| EN | You don't scroll a life. You walk up and touch it. |
| NL (je) | Je scrolt geen leven. Je loopt ernaartoe en raakt het aan. |
| DE (Sie) | Ein Leben scrollt man nicht. Man tritt heran und berührt es. |
| ES | Una vida no se desliza. Te acercas y la tocas. |
| FR | Une vie ne se fait pas défiler. On s'en approche et on la touche. |

### Body — `--font-body` (Manrope), parchment-white `#EFE6D4` at 92% opacity (≤35 words)

| Locale | Text |
|--------|------|
| EN | A folder buries your photos. A feed forgets them by morning. Here every memory has a room, a wall, a place you can walk back into — and you become the keeper everyone comes home to. |
| NL (je) | Een map begraaft je foto's. Een feed is ze 's ochtends alweer vergeten. Hier heeft elke herinnering een kamer, een muur, een plek waar je binnen kunt lopen — en word jij degene naar wie iedereen terugkeert. |
| DE (Sie) | Ein Ordner vergräbt Ihre Fotos. Ein Feed hat sie bis zum Morgen vergessen. Hier hat jede Erinnerung ein Zimmer, eine Wand, einen Ort, den Sie wieder betreten können — und Sie werden zu dem Menschen, zu dem alle heimkehren. |
| ES | Una carpeta entierra tus fotos. Un feed las olvida al amanecer. Aquí cada recuerdo tiene una habitación, una pared, un lugar al que puedes volver a entrar — y te conviertes en quien todos regresan a ver. |
| FR | Un dossier enterre vos photos. Un fil les oublie au matin. Ici chaque souvenir a une pièce, un mur, un lieu où l'on peut revenir — et vous devenez celui vers qui chacun revient. |

---

## Extra short strings (5-locale)

### Handwritten caption near the hand — `--font-note` (Caveat), gold `#D4AF37`, rotated −2deg

| Locale | Text |
|--------|------|
| EN | the place they'll come home to |
| NL (je) | de plek waar ze naar terugkomen |
| DE (Sie) | der Ort, an den alle heimkehren |
| ES | el lugar al que todos vuelven |
| FR | le lieu où chacun revient |

### `aria-label` on the `<figure role="img">` (screen-reader equivalent of the whole argument)

| Locale | Text |
|--------|------|
| EN | A woman in golden light reaching up to touch a framed photo on the warm wall of her memory palace — a life you can walk up to and touch, not a folder you scroll. |
| NL (je) | Een vrouw in gouden licht die een ingelijste foto aanraakt aan de warme muur van haar geheugenpaleis — een leven waar je naartoe kunt lopen en het kunt aanraken, geen map waar je doorheen scrolt. |
| DE (Sie) | Eine Frau im goldenen Licht, die ein gerahmtes Foto an der warmen Wand ihres Gedächtnispalastes berührt — ein Leben, an das man herantreten und das man berühren kann, kein Ordner zum Scrollen. |
| ES | Una mujer bajo una luz dorada que se estira para tocar una foto enmarcada en la cálida pared de su palacio de la memoria — una vida a la que puedes acercarte y tocar, no una carpeta que deslizas. |
| FR | Une femme dans une lumière dorée qui tend la main vers une photo encadrée sur le mur chaleureux de son palais de mémoire — une vie dont on peut s'approcher et que l'on peut toucher, non un dossier que l'on fait défiler. |

---

## VISUAL — implementable spec

### Asset
- **Single hero:** `/landing/band-together.jpg` (verified present at `public/landing/band-together.jpg`). This is the ONLY image in the block. No `band-corridor.jpg`, no demo-photo thumbnails, no composited frames, no SVG line-art.

### Container / figure
- Wrap in `<figure role="img" aria-label="…">` (see aria table). Caption text lives in real DOM, never baked into the pixels.
- `position: relative; overflow: hidden;`
- `border-radius: 1.25rem;`
- `box-shadow: 0 1.5rem 3rem rgba(36, 28, 21, 0.18);` (soft umber lift off the `#FCFAF5` canvas)
- `border: 1px solid #E3D6BC;` (hairline, reads as a hung frame)
- `max-width: 64rem;` centered (`margin-inline: auto`) with the block's canvas background `#FCFAF5` and generous vertical padding (`padding-block: clamp(3rem, 6vw, 5rem)`) so the warm render reads as a framed picture, not an abruptly dark full-bleed section.
- Aspect: desktop `aspect-ratio: 16 / 9`; **mobile (≤48rem) `aspect-ratio: 4 / 5`** (portrait) so height survives.

### Image element
- Use `next/image` `fill` (or `<img>` with `object-fit: cover`).
- `object-position: 68% 42%;` — **load-bearing.** Pins the reaching hand + framed photos in-frame at every breakpoint. On the 4/5 mobile crop keep `object-position: 72% 40%;` so the hand+frame never clips (verify at 375px — if the metaphor's hand is lost the block fails).
- Never upscale past native sharpness. `sizes="(max-width: 48rem) 100vw, 64rem"`, `priority={false}` (below the fold), lazy-loaded.

### Scrim (MANDATORY — not decorative)
Two stacked gradients as an `::after` overlay, confined to the naturally-dark left + lower-left where the text sits, so the sunlit right (hand + frames + arch) stays untouched:

```css
figure::after {
  content: "";
  position: absolute; inset: 0;
  background:
    linear-gradient(105deg,
      rgba(36, 28, 21, 0.74) 0%,
      rgba(36, 28, 21, 0.34) 40%,
      transparent 66%),
    linear-gradient(to top,
      rgba(36, 28, 21, 0.55) 0%,
      transparent 42%);
  pointer-events: none;
}
```
- Base alpha ≥0.72 at the lower-left origin is non-negotiable — verify **AA (≥4.5:1)** for the cream H2 on the real pixels at 375px, 768px, 1280px. If the H2 washes out, deepen the scrim; never shrink the type.

### Text block
- Anchored **bottom-left**, `position: absolute; left: 0; bottom: 0;`
- Padding: desktop `2.5rem`; mobile (≤48rem) `1.5rem`.
- `max-width: 30rem` desktop / `22rem` mobile.
- Stacking order top→bottom:
  1. **Eyebrow** — Caveat (`--font-note`), gold `#D4AF37`, `1.15rem`, letter-spacing `0.02em`.
  2. **Gold hairline** — the ONLY ornament: `width: 2.5rem; height: 1px; background: #D4AF37; opacity: 0.4; margin-block: 0.75rem;`
  3. **H2** — Cormorant italic (`--font-display`), cream `#FCFAF5`, `clamp(1.75rem, 4.5vw, 3rem)`, `line-height: 1.05`, `text-shadow: 0 1px 12px rgba(36, 28, 21, 0.45);`
  4. **Body** — Manrope (`--font-body`), `#EFE6D4` at `opacity: 0.92`, `clamp(1rem, 1.4vw, 1.0625rem)`, `line-height: 1.5`, `margin-top: 1rem`.

### Handwritten caption near the hand
- One Caveat line (`--font-note`), gold `#D4AF37`, `~1.25rem`, `transform: rotate(-2deg)`, subtle `text-shadow: 0 1px 6px rgba(36, 28, 21, 0.5)`.
- Positioned upper-right over the wall beside the frames, roughly `top: 14%; right: 6%;` (over warm mid-tone plaster — not over the bright arch). On mobile (≤48rem) **hide it** (`display: none`) to protect the <5s read on the tighter crop; the block stands without it.

### Motion (single, restrained)
- On scroll-into-view: image does one slow **Ken Burns push-in** `scale(1) → scale(1.06)` over `6s` `ease-out`, `transform-origin: 70% 45%` (drifts gently toward the reaching hand). Text block `opacity 0 → 1` + `translateY(0.6rem → 0)` over `0.8s`.
- **`prefers-reduced-motion: reduce` end state:** image `transform: none; scale: 1;` fully static and fully legible; text fully visible at rest. No parallax, no loops, no lighting effects — a single push-in only, capped at 6% so it never reads as a gimmick.

### Units & build
- All sizing in `rem`; positional overlays in `%`. React + one `<img>`/`next-image` + CSS only. No JS-driven layout, no SVG, no compositing.

### Palette reference
`#FCFAF5` canvas · `#EFE6D4` parchment · `#E3D6BC` hairline · `#D4AF37` gold · `#241C15` umber-dark · `#403B36` ink · Cormorant `--font-display` · Manrope `--font-body` · Caveat `--font-note`.

### QA gates (ship-blockers)
1. H2 passes AA on real pixels at 375 / 768 / 1280px — if not, deepen scrim.
2. The reaching hand + at least one framed photo survive the `object-position` crop at 375px — if they clip, the "touch" metaphor collapses; re-tune before ship.
3. Static (reduced-motion) composition reads the full argument in <5s with zero motion.
4. Do not blow the render past native resolution; keep the golden grade and film grain intact.
