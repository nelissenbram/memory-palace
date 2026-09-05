# Atrium Relay — Stronger Colour Spec (INK & EMBER)

Flagship home screen. Goal: **stronger, richer, more distinct, more alive** colour
than the current pale Tuscan tints — while staying **warm, dignified, and highly
legible** for a 60+ heritage audience (nothing garish or gamified).

Synthesised from the top three research directions (INK & EMBER 45.3 / Fresco
Earthworks 43.3 / Deeper Tuscany 43.0). All three converged on the same move, so
this spec adopts it wholesale:

1. **Three true edge-to-edge earth washes** per zone that **never fade to cream/white**
   (the current `... 0%, #FCFAF5 70%` fade is exactly why the colour reads weak).
   Siena rust / burnt ochre / deep olive.
2. **Bring-to-Life switches gold → burnt OCHRE** so gold is never diluted across a
   whole light lane (and never used as text on light, where it fails AA).
3. **The two anchors (Palace / Library) invert to dark, gilt-edged cards** — the ONLY
   dark cards on the board — so they outrank the three light verb-zones as the keystone.
4. **Gold is rationed to metal-on-dark only** (3 sanctioned spots) so it reads as gilt,
   not mustard.

Page sits on a **warmer parchment** (`#F4EADA`) instead of near-white cream, so the
saturated washes have something to push against.

---

## Contrast (WCAG AA) — text measured against the DARKER gradient stop (`gradTo`, worst case)

| Zone / surface | element | fg | bg (gradTo) | ratio |
|---|---|---|---|---|
| Capture | title | `#2A1A12` | `#F3C9B2` | 11.00:1 |
| Capture | desc | `#5A3A2A` | `#F3C9B2` | 6.66:1 |
| Capture | datum/glyph | `#7C3016` | `#F3C9B2` | 6.03:1 |
| Bring to Life | title | `#2A2010` | `#F0D48C` | 11.05:1 |
| Bring to Life | desc | `#5E4718` | `#F0D48C` | 6.07:1 |
| Bring to Life | datum | `#6E4A0F` | `#F0D48C` | 5.47:1 |
| Share | title | `#232C15` | `#D2DEAE` | 10.26:1 |
| Share | desc | `#45532E` | `#D2DEAE` | 5.85:1 |
| Share | datum/glyph | `#38481F` | `#D2DEAE` | 7.00:1 |
| Anchor Palace | title | `#F7EFE0` | `#1C130C` | 16.01:1 |
| Anchor Palace | desc | `#E4D6BE` | `#1C130C` | 12.77:1 |
| Anchor Palace | datum/glyph | `#E8C766` | `#1C130C` | 11.14:1 |
| Anchor Library | title | `#F5EFE2` | `#191218` | 16.06:1 |
| Anchor Library | desc | `#D8CBB6` | `#191218` | 11.51:1 |
| Anchor Library | datum/glyph | `#E8C766` | `#191218` | 11.21:1 |
| Steward greeting | h1 | `#1F1B1A` | page `#F4EADA` | 14.33:1 |
| Steward datum line | muted | `#6B6459` | page `#F4EADA` | 4.91:1 |
| Suggested card | overline (gold) | `#F2C75A` | rust `#7C3016` (dark grad stop) | 5.71:1 |
| Suggested card | title | `#F2EDE4` | rust `#7C3016` | 7.86:1 |
| You row | pill text | `#5E4636` | page `#F4EADA` | 7.33:1 |
| Score chip | points glyph | `#8A6410` | chip `#F6EBCB` | 4.52:1 |

Every value clears AA body (4.5:1). Titles clear AAA.

---

## Drop-in token set for the `AtriumRelay` `ACCENT` map

Keys map to `RelayAccent = "terracotta" | "gold" | "sage" | "anchor"`.
`terracotta`→Capture, `gold`→Bring to Life (now OCHRE), `sage`→Share, `anchor`→Palace/Library.

```ts
// page background (set on the Atrium page wrapper, not the ACCENT map)
const PAGE_BG = "#F4EADA";        // warm parchment (was near-white cream)
const GOLD    = "#D4AF37";        // focus-ring + score chip only
const YOU_TEXT = "#5E4636";       // You-row pill ink (AA on page, 7.33:1)

const ACCENT: Record<RelayAccent, {
  glyph: string; medallion: string; glow: string; band: string; rule: string;
  tileTop: string; tileBg: string; border: string;
  titleColor: string; descColor: string;   // NEW: per-zone text (do NOT keep charcoal/muted)
}> = {
  // ── CAPTURE — Siena rust ──────────────────────────────────────────────
  terracotta: {
    tileTop:   "#A8471F",
    glyph:     "#7C3016",
    medallion: "rgba(168,71,31,0.18)",
    glow:      "rgba(168,71,31,0.55)",
    band:      "rgba(168,71,31,0.06)",
    rule:      "rgba(168,71,31,0.42)",
    tileBg:    "linear-gradient(160deg, #FBE4D6 0%, #F3C9B2 100%)", // edge-to-edge, no cream fade
    border:    "rgba(168,71,31,0.28)",
    titleColor:"#2A1A12",
    descColor: "#5A3A2A",
  },
  // ── BRING TO LIFE — burnt OCHRE (was pale gold) ───────────────────────
  gold: {
    tileTop:   "#B47A1A",
    glyph:     "#6E4A0F",
    medallion: "rgba(158,111,20,0.20)",
    glow:      "rgba(158,111,20,0.55)",
    band:      "rgba(158,111,20,0.06)",
    rule:      "rgba(158,111,20,0.42)",
    tileBg:    "linear-gradient(160deg, #FBEAC6 0%, #F0D48C 100%)",
    border:    "rgba(158,111,20,0.28)",
    titleColor:"#2A2010",
    descColor: "#5E4718",
  },
  // ── SHARE & PASS ON — deep olive ──────────────────────────────────────
  sage: {
    tileTop:   "#55682E",
    glyph:     "#38481F",
    medallion: "rgba(78,97,56,0.20)",
    glow:      "rgba(78,97,56,0.50)",
    band:      "rgba(78,97,56,0.06)",
    rule:      "rgba(78,97,56,0.42)",
    tileBg:    "linear-gradient(160deg, #E9EFD5 0%, #D2DEAE 100%)",
    border:    "rgba(78,97,56,0.28)",
    titleColor:"#232C15",
    descColor: "#45532E",
  },
  // ── ANCHOR — dark gilt-edged keystone (PALACE default) ────────────────
  //    For LIBRARY, override tileBg → "linear-gradient(155deg,#2A2027 0%,#191218 100%)"
  //    and titleColor → "#F5EFE2", descColor → "#D8CBB6".
  anchor: {
    tileTop:   "#E8C766",                 // gold rule
    glyph:     "#E8C766",                 // gold glyph
    medallion: "rgba(232,199,102,0.16)",  // + 1px inner ring rgba(232,199,102,0.42), see note
    glow:      "rgba(232,199,102,0.30)",
    band:      "transparent",
    rule:      "rgba(232,199,102,0.42)",
    tileBg:    "linear-gradient(155deg, #2E2118 0%, #1C130C 100%)",
    border:    "rgba(232,199,102,0.30)",
    titleColor:"#F7EFE0",
    descColor: "#E4D6BE",
  },
};
```

### Per-zone summary (compact)

| token | Capture (Siena rust) | Bring to Life (burnt ochre) | Share (deep olive) |
|---|---|---|---|
| topAccent | `#A8471F` | `#B47A1A` | `#55682E` |
| medallionTint | `rgba(168,71,31,0.18)` | `rgba(158,111,20,0.20)` | `rgba(78,97,56,0.20)` |
| glyph | `#7C3016` | `#6E4A0F` | `#38481F` |
| gradFrom | `#FBE4D6` | `#FBEAC6` | `#E9EFD5` |
| gradTo | `#F3C9B2` | `#F0D48C` | `#D2DEAE` |
| textAA title | `#2A1A12` | `#2A2010` | `#232C15` |
| textAA desc | `#5A3A2A` | `#5E4718` | `#45532E` |

### Anchor pair (the only dark cards)

| token | Palace | Library |
|---|---|---|
| gradFrom | `#2E2118` | `#2A2027` |
| gradTo | `#1C130C` | `#191218` |
| topAccent (gold rule) | `#E8C766` | `#E8C766` |
| medallionTint | `rgba(232,199,102,0.16)` + inner ring `rgba(232,199,102,0.42)` | `rgba(232,199,102,0.15)` + inner ring `rgba(232,199,102,0.42)` |
| glyph | `#E8C766` | `#E8C766` |
| title | `#F7EFE0` | `#F5EFE2` |
| desc | `#E4D6BE` | `#D8CBB6` |
| datum | `#E8C766` | `#E8C766` |
| border | `rgba(232,199,102,0.30)` | `rgba(232,199,102,0.30)` |
| shadow | `0 0.625rem 2rem rgba(28,19,12,0.34)` | `0 0.625rem 2rem rgba(28,19,12,0.34)` |

### Page + You + score

- **page bg**: `#F4EADA`
- **greeting h1**: `#1F1B1A` · **name accent**: `#A8471F` (Siena rust, was terracotta) · **datum line**: `#6B6459`
- **You-row pill text**: `#5E4636` (border keeps `warmStone`, transparent bg)
- **score chip**: gold points glyph `#8A6410` on chip `linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))`

---

## Where gold is rationed (metal-on-dark ONLY — 3 sanctioned spots)

1. **The two dark anchors** — gold top-rule + medallion ring + glyph + datum in `#E8C766`
   on the dark `#2E2118 / #2A2027` grounds (11.1–11.2:1). The one place gold behaves like
   gilt on a leather binding.
2. **The Steward "SUGGESTED FOR YOU" overline** `#F2C75A` on the suggested card — **deepen
   that card's gradient to `linear-gradient(135deg, #A24B28, #7C3016)`** (was `#A24B28`)
   so the gold overline clears AA at **5.71:1** instead of the current 3.66:1.
3. **The app-wide focus-visible outline** `#D4AF37` + the **score-chip points glyph** `#8A6410`.

Gold is **never** a zone body fill and **never** text on a light card. Bring-to-Life earns
its saturation from **burnt ochre**, not gold, precisely so gold stays precious.

---

## Implementation notes for the engineer

- **Kill the cream fade.** The single most important change: every zone `tileBg` is now
  a 2-stop earth wash `gradFrom → gradTo` with the second stop at `100%` — no `#FCFAF5`
  terminal stop. That is what makes the colour "stronger / more alive."
- **Text can no longer be `T.color.charcoal` / `T.color.muted` globally.** Add
  `titleColor` + `descColor` to the `ACCENT` map and read them in `Tile` for the title
  (`a.titleColor`) and desc (`a.descColor`). Anchors need light text; light zones need
  dark ink; a single hard-coded charcoal would fail on the dark anchors.
- **Anchor is a variant.** `Tile` currently passes `accent="anchor"` for both Palace and
  Library. To give Library its cooler `#2A2027 → #191218` ground, either add an
  `"anchorLibrary"` accent key or branch on `tile.key === "library"` inside `Tile`.
- **Medallion inner ring** on anchors: add `boxShadow: "inset 0 0 0 1px rgba(232,199,102,0.42)"`
  to the medallion span when `accent === "anchor"`.
- **Suggested card gradient**: change the steward button background from
  `linear-gradient(135deg, ${T.color.terracotta}, #A24B28)` to
  `linear-gradient(135deg, #A24B28, #7C3016)` and the overline colour to `#F2C75A`.
- rem units + React inline styles throughout — unchanged from current file.
