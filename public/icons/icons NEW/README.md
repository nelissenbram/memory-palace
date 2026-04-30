# Memory Palace — Icon Kit

Three-variant icon system, production-ready for web, iOS, Android, PWA, and in-app use.

## Contents

```
icon-kit/
├── svg/
│   ├── memory-palace-primary.svg       Solid clay tile + linen columns (app icon)
│   ├── memory-palace-alternative.svg   Cream tile + clay columns (marketing)
│   └── memory-palace-inapp.svg         Symbol only, uses currentColor (in-product)
├── png/
│   ├── favicon.ico                     Multi-res (16/32/48) for browsers
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── favicon-48.png
│   ├── apple-touch-icon-180.png        iOS home screen
│   ├── android-chrome-192.png          Android home screen (standard)
│   ├── android-chrome-512.png          Android home screen (hi-res)
│   ├── pwa-512.png                     PWA installed app icon
│   ├── appstore-1024.png               App Store / Play Store listing
│   ├── alt-avatar-256.png              Social avatars (LinkedIn, Twitter, etc.)
│   ├── alt-social-512.png              Marketing surfaces, open graph
│   ├── alt-print-1024.png              Printed materials
│   ├── inapp-clay-64.png               Pre-tinted in-app (if SVG unavailable)
│   ├── inapp-clay-128.png
│   └── inapp-clay-256.png
└── manifest.json                       PWA manifest
```

## Color palette

- **Deep clay** `#9B5A38` — Primary brand color. Tile background on app icon, column fill in alternative and in-app variants.
- **Linen** `#FAFAF7` — Column fill on primary app icon, page background throughout the product.
- **Warm cream** `#F5E6D3` — Tile background on alternative (marketing) variant only.

## Integration — Next.js 14

### Step 1 — Copy files into `public/`

```
public/
├── favicon.ico
├── manifest.json
├── icons/
│   ├── apple-touch-icon-180.png
│   ├── android-chrome-192.png
│   ├── android-chrome-512.png
│   └── pwa-512.png
└── brand/
    ├── memory-palace-primary.svg
    ├── memory-palace-alternative.svg
    └── memory-palace-inapp.svg
```

### Step 2 — Wire metadata in `app/layout.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Memory Palace",
  description: "Your memories, given a home.",
  manifest: "/manifest.json",
  themeColor: "#9B5A38",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/android-chrome-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/android-chrome-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180" },
    ],
  },
};
```

### Step 3 — Use the in-app symbol as a React component

```tsx
// components/Logo.tsx
export function Logo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Memory Palace"
      className={className}
    >
      <g fill="currentColor">
        <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z" />
        <rect x="18" y="40" width="8" height="32" />
        <rect x="32" y="40" width="8" height="32" />
        <rect x="46" y="40" width="8" height="32" />
        <rect x="60" y="40" width="8" height="32" />
        <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7" />
        <rect x="10" y="72" width="80" height="4" />
        <rect x="6" y="78" width="88" height="4" />
        <rect x="2" y="84" width="96" height="4" />
      </g>
    </svg>
  );
}
```

Usage anywhere in the product:

```tsx
<Logo size={32} className="text-[#9B5A38]" />        // nav bar
<Logo size={16} className="text-[#8B7355]" />        // breadcrumb
<Logo size={64} className="text-[#9B5A38] opacity-60" />  // empty state
```

Because the symbol uses `currentColor`, it inherits whatever text color is set on the parent — so it automatically adapts to dark mode if you later add it.

## When to use which variant

| Surface | Variant | File |
|---|---|---|
| iOS/Android home screen | Primary | `apple-touch-icon-180.png`, `android-chrome-*.png` |
| Browser favicon / tab | Primary | `favicon.ico` |
| PWA installed app | Primary | `pwa-512.png` |
| App Store / Play Store listing | Primary | `appstore-1024.png` |
| Product nav bar / breadcrumbs | In-app | `memory-palace-inapp.svg` |
| Empty states, loading screens | In-app | `memory-palace-inapp.svg` |
| LinkedIn / Twitter avatar | Alternative | `alt-avatar-256.png` |
| Open Graph / social share cards | Alternative | `alt-social-512.png` |
| Print: business cards, book cover | Alternative | `alt-print-1024.png` |
| Email header / footer | Alternative | Alternative SVG (for scaling) |

## Design rules

- **Minimum size for primary icon:** 32×32 px (below that, the oval and column separation start to blur — use favicon-32 or the favicon.ico).
- **Safe area:** 10% padding all around. Never crop the temple against the tile edge.
- **Don't recolor the primary variant.** Deep clay tile with linen columns is the brand. If you need a different color context, use the in-app variant (transparent) and tint via CSS.
- **The oval stays at 70% opacity** in all variants. It's the "fifth pillar being raised" — the product's narrative heart. Don't make it solid (removes meaning) and don't make it lighter (becomes invisible).

## Future-proofing

The SVGs are all hand-optimized with:
- No embedded metadata, no Inkscape cruft, no unnecessary `<defs>`
- Integer coordinates only (sharp rendering at every scale)
- `role="img"` + `<title>` for screen readers
- `currentColor` on the in-app variant (dark-mode-ready)

Total SVG filesize: ~500 bytes each. These won't be a performance consideration.

## License / ownership

These files were generated for The Memory Palace and are yours to use, modify, and redistribute as part of the product.
