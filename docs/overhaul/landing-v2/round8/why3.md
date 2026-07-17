# Why block, round 8, FINAL (why3)

The Museum Wall Label. All words come off the photograph and live on the clean
cream page. The photo is hung once as a framed companion, never a surface you
must read through. One calm top to bottom reading order. Dark ink on cream at
book contrast, so a 68 year old reads it in one pass, no motion required, no
decoding.

This is the creative director's final call. It merges the two ideas every judge
converged on: the four judges' shared winner (the wall label diptych, ink on
cream, numbered loci / everyone / enrich rows, payoff set apart) and the
contrast judge's hard rule (every reading critical word must be ink #403B36 on
cream #FCFAF5, roughly 9 to 1, never gold or rust for meaning, never over photo
pixels). No umber slab, no inverted light on dark panel, so the eye never
switches contrast direction. One page, one voice, one path.

---

## 1. Layout spec (precise, implementable)

### Section shell
- `<section>` full width, background `#FCFAF5` (canvas cream). Solid color, no
  image, no scrim anywhere in the section.
- `padding-block: clamp(4rem, 8vw, 7rem)`.
- `padding-inline: clamp(1.25rem, 5vw, 3rem)`.
- Inner wrapper: `max-width: 72rem; margin: 0 auto;`.
- Desktop grid: `display: grid; grid-template-columns: 1.05fr 0.95fr;
  column-gap: clamp(2.5rem, 5vw, 4.5rem); align-items: center;`.
- The words are the LEFT column, the framed photo is the RIGHT column.

### LEFT column (the words, on bare cream, `max-width: 34rem`)
Strict top to bottom order, one thing at a time:

1. **Eyebrow.** `font-note` (Caveat), color rust `#9A4F2A` (NOT gold: gold on
   cream is ~2:1 and fails; rust on cream is ~5.4:1, and this is a small
   decorative label, not body copy, so it is allowed here). `font-size: 1.25rem;
   letter-spacing: 0.02em; margin: 0;`.
2. **Gold hairline rule.** `width: 3rem; height: 2px; background: #D4AF37;
   opacity: 0.6; border: 0; margin: 0.75rem 0 1.75rem;`. Static, decorative only.
3. **H2 headline.** `font-display` (Cormorant Garamond), **upright, weight 600
   (NOT italic** — several judges flagged italic Cormorant at display size as a
   readability tax; italic is reserved for the short payoff only). Color ink
   `#403B36`. `font-size: clamp(2rem, 4.5vw, 3.25rem); line-height: 1.08;
   text-wrap: balance; margin: 0;`.
4. **Three numbered idea rows.** Container `margin-top: clamp(2rem, 4vw,
   2.75rem)`. Each row is a 2-column sub-grid: `grid-template-columns: 2.5rem 1fr;
   column-gap: 1rem;`. Row gap between the three rows: `1.75rem`. A `1px` hairline
   `#E3D6BC` divider sits above rows 2 and 3 (`padding-top: 1.75rem`) so the three
   read as one calm list.
   - **Numeral marker:** `font-display`, upright, weight 600, gold `#D4AF37`,
     `font-size: 1.75rem; line-height: 1;` sitting in its own `2.5rem` column.
     (Gold here is a non-load-bearing sequence accent; the digit is redundant with
     the visual order, so the ~2:1 gold contrast never costs comprehension.)
   - **Row lead:** `font-display`, upright, weight 600, ink `#403B36`,
     `font-size: 1.5rem; line-height: 1.2; margin: 0;`.
   - **Row body:** `font-body` (Manrope), weight 400, ink `#403B36` (full ink,
     NOT muted, so every reading word clears ~9:1), `font-size: 1.125rem` (18px
     floor for older eyes), `line-height: 1.55; margin-top: 0.375rem;
     max-width: 27rem;`.
5. **Payoff pull-quote.** `margin-top: clamp(2.25rem, 4vw, 3rem);
   padding-left: 1.25rem; border-left: 3px solid #9A4F2A;` (rust rule for
   editorial character; the RULE is rust, the TEXT is ink). Text: `font-display`,
   **italic**, weight 500, ink `#403B36`, `font-size: clamp(1.5rem, 2.6vw, 2rem);
   line-height: 1.25;`. This is the one italic moment and the emotional close.

### RIGHT column (the photo as a hung companion, never a text bed)
- `<figure style="margin:0; position:relative;">`.
- **The frame / mat:** `padding: 0.75rem;` with `background: #EFE6D4` (parchment
  mat), `border: 1px solid #E3D6BC;` `border-radius: 0.5rem;`
  `box-shadow: 0 1.5rem 3rem rgba(36,28,21,0.16);` so it lifts off the cream page
  like a real hung frame. NO tilt, NO rotate, NO hanging-nail nub (judges killed
  those gimmicks).
- **Image well inside the mat:** `aspect-ratio: 4 / 5;` (portrait, print-like),
  `overflow: hidden; border-radius: 0.25rem;`. `next/image` `fill`,
  `object-fit: cover; object-position: 64% 40%;` so the woman, her reaching hand
  and at least one frame she touches stay in view; the emptier far-left archway
  crops away. Verify the hand + frame survive at 375 / 768 / 1280px; if the hand
  clips, nudge to `66% 40%`. NO scrim, NO gradient, NO text over the image.
- **No caption on or beside the image.** (Judges killed floating Caveat
  captions crowding the render.) The frame stands alone.

### Motion (clarity only)
- ONE gentle one-time fade-and-rise of the whole left column and the frame on
  first scroll into view via `IntersectionObserver`: `opacity 0 -> 1`,
  `translateY 0.75rem -> 0`, `0.6s ease`, staggered so the photo settles then the
  words settle. Fires once, then never again.
- Under `@media (prefers-reduced-motion: reduce)` everything renders at rest
  instantly.
- There is NO scroll pin, NO `minHeight` track, NO beat crossfade, NO scroll
  driven swap of any kind. Delete the round-7 pin/progress machinery and the
  `b1label` / `b2caption` on-image notes.

### Mobile stack (`max-width: 48rem`)
- Grid collapses to one column. **Words lead:** eyebrow, hairline, H2, then the
  framed photo (full width, `aspect-ratio: 4/5`, `object-position: 66% 40%`),
  then the three numbered rows, then the payoff.
- Left-column `max-width` removed to 100%.
- Type holds at clamp minimums: H2 `2rem`, row lead `1.375rem`, row body
  `1.0625rem`, payoff `1.5rem`. Body never drops below 18px.
- No pin, no swap, nothing hidden on any breakpoint.

---

## 2. Final copy (EN / NL je / DE Sie / ES / FR)

No em-dashes anywhere. Commas and short phrasing only. Keys map 1:1 to the
existing `why.*` block; retired keys: `b1label`, `b2caption`, and the pinned
beat/aria-overlay machinery. `aria` stays as the figure's aria-label.

### EN
- **eyebrow:** The oldest way to remember
- **h2:** The palace in your mind, at last a place you can walk into
- **b1lead:** A trick as old as memory itself
- **b1sub:** For 2,500 years we have remembered by placing what matters in rooms we can picture. You already know how.
- **b2lead:** Everyone already has one
- **b2sub:** Rich or humble, near or far, every life has quietly gathered a palace of memories. Yours is worth keeping.
- **b3lead:** Then you make it come alive
- **b3sub:** A folder holds the picture. Here you add the voice, the day, the story behind it, so it can be touched, not just seen.
- **payoff:** You don't scroll a life. You walk up and touch it.

### NL (je)
- **eyebrow:** De oudste manier om te onthouden
- **h2:** Het paleis in je hoofd, eindelijk een plek waar je binnen kunt lopen
- **b1lead:** Een truc zo oud als het geheugen zelf
- **b1sub:** Al 2.500 jaar onthouden we door te plaatsen wat telt in kamers die we voor ons zien. Je weet allang hoe.
- **b2lead:** Iedereen heeft er al een
- **b2sub:** Rijk of eenvoudig, dichtbij of ver weg, elk leven heeft stilletjes een paleis aan herinneringen verzameld. Het jouwe is het waard om te bewaren.
- **b3lead:** Dan breng je het tot leven
- **b3sub:** Een map bewaart de foto. Hier voeg je de stem toe, de dag, het verhaal erachter, zodat je het kunt aanraken, niet alleen zien.
- **payoff:** Je scrolt geen leven. Je loopt ernaartoe en raakt het aan.

### DE (Sie)
- **eyebrow:** Die älteste Art zu erinnern
- **h2:** Der Palast in Ihrem Kopf, endlich ein Ort, den Sie betreten können
- **b1lead:** Ein Kunstgriff so alt wie das Erinnern selbst
- **b1sub:** Seit 2.500 Jahren erinnern wir uns, indem wir das Wichtige in Räume legen, die wir uns vorstellen. Sie wissen längst, wie.
- **b2lead:** Jeder hat schon einen
- **b2sub:** Ob reich oder einfach, nah oder fern, jedes Leben hat still einen Palast an Erinnerungen gesammelt. Ihrer ist es wert, bewahrt zu werden.
- **b3lead:** Dann erwecken Sie ihn zum Leben
- **b3sub:** Ein Ordner bewahrt das Bild. Hier fügen Sie die Stimme hinzu, den Tag, die Geschichte dahinter, damit man es berühren kann, nicht nur ansehen.
- **payoff:** Man scrollt kein Leben. Man tritt heran und berührt es.

### ES
- **eyebrow:** La forma más antigua de recordar
- **h2:** El palacio de tu mente, por fin un lugar en el que puedes entrar
- **b1lead:** Un arte tan antiguo como la memoria misma
- **b1sub:** Durante 2.500 años hemos recordado colocando lo que importa en habitaciones que podemos imaginar. Ya sabes cómo.
- **b2lead:** Todo el mundo ya tiene uno
- **b2sub:** Rico o humilde, cerca o lejos, cada vida ha reunido en silencio un palacio de recuerdos. El tuyo merece conservarse.
- **b3lead:** Y entonces le das vida
- **b3sub:** Una carpeta guarda la foto. Aquí le añades la voz, el día, la historia que hay detrás, para poder tocarla, no solo verla.
- **payoff:** No se recorre una vida. Te acercas y la tocas.

### FR
- **eyebrow:** La plus ancienne façon de se souvenir
- **h2:** Le palais dans votre esprit, enfin un lieu où vous pouvez entrer
- **b1lead:** Un art aussi vieux que la mémoire elle-même
- **b1sub:** Depuis 2 500 ans, nous nous souvenons en plaçant ce qui compte dans des pièces que nous imaginons. Vous savez déjà comment.
- **b2lead:** Chacun en a déjà un
- **b2sub:** Riche ou modeste, proche ou lointaine, chaque vie a rassemblé en silence un palais de souvenirs. Le vôtre mérite d'être gardé.
- **b3lead:** Puis vous lui donnez vie
- **b3sub:** Un dossier garde la photo. Ici vous ajoutez la voix, le jour, l'histoire derrière elle, pour pouvoir la toucher, pas seulement la voir.
- **payoff:** On ne fait pas défiler une vie. On s'approche et on la touche.

---

## 3. What changed vs the failed version, and why it is now clear

**The 4 prior failures and their fix:**

1. **Text over a busy amber photo (marginal ~2 to 3:1, varying pixel to pixel).**
   Fixed by moving every reading-critical word onto solid cream `#FCFAF5` as ink
   `#403B36` (~9:1, book contrast), verified against a known solid color instead
   of unpredictable photo pixels. No word ever touches the photograph again. The
   photo is quarantined into a matted frame, so its warmth adds emotion without
   ever degrading legibility.

2. **The confusing scroll-swap / beat crossfade ("what just changed?").** Deleted
   entirely. No pin, no `260vh` track, no per-line fade. All three ideas are
   present at once as numbered rows 1, 2, 3; the reader sees the whole argument
   and sets their own pace. The only motion is a single one-time settle on entry,
   gated on `prefers-reduced-motion`, which never changes or hides content.

3. **Size soup (five competing sizes stacked at once).** Collapsed to a strict,
   repeating scale: one rust eyebrow, one upright ink H2, a single lead/body pair
   repeated identically down three rows, one italic payoff. The eye learns the
   pattern once. H2 is set UPRIGHT (italic reserved for the payoff only) per the
   judges' readability note.

4. **No clear reading order.** Now a single vertical spine on the left, with
   serif numerals 1 / 2 / 3 giving an unmistakable sequence (the job the
   scroll-swap tried and failed to do), resolving on the rust-ruled payoff.

**Also honored from the judges:** all three ideas stay explicit and load-bearing
(no fused run-on paragraph that lets *enrich* read as secondary); the dignity
line "Yours is worth keeping" and "Rich or humble, near or far" are kept
verbatim; gold and rust are accent-only, never carrying meaning as body text, so
contrast direction never switches (no umber slab, no light-on-dark inversion);
18px body floor; and the load-bearing crop detail (the reaching hand + frame at
`object-position ~64% 40%`) is called out to verify. This structure is
physically incapable of any of the four prior failures.
