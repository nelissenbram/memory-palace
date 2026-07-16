# Landing v2 — Visual Asset Plan (Decisions)

Owner: assets-plan lead · 2026-07-16 · Repo: `C:\Users\nelis\memory-palace` (staging). Decisions are final unless a blocker surfaces in capture.

## 1. Existing assets — verdicts

| Asset | Verdict |
|---|---|
| `public/video/hero-bg-original.mp4` (1792×1024, 12s golden-hour aerial) | **KEEP as re-encode master.** Move out of `public/` after re-encode. |
| `public/video/hero-bg.mp4` / `-slow` / `-fast` | **DELETE** (dark, low-bitrate, unused variants — the "brown void" source). |
| `public/video/hero-ob.mp4` (person touching framed photos, sunlit arcade) | **PROMOTE.** Best emotional clip we own. Use in the "Be remembered" / not-a-photo-album band. Re-encode. |
| `public/video/walkthrough.mp4` (12.4MB, silent) | **RE-CUT required** — narrated 45–60s "Guillaume's Palace" version with captions. Keep poster-first click-to-play pattern; keep existing `walkthrough-poster.jpg` until new cut lands. |
| `public/screenshots/*` (1200×750 webp, UI chrome) | **Retire from landing.** Too small, chrome-laden, low-poly. OK for blog/help only; interim placeholder use permitted until §2 shots land. |
| `public/screenshots/store/*` + `store-assets/*` (phone frames, baked captions) | **One use only:** a single "also on your phone" moment (frameless re-shoot preferred). Baked-caption assets never ship on landing (unlocalizable, WCAG 1.1.1 fail). |
| `public/demo/*.jpg` + `piano-recital.mp4` | **KEEP** as staging content for the demo palace (memories inside frames). Compress before use. |
| `public/brand/*.svg`, `alt-social-512.png` | Keep logos; **512px OG replaced** (see §4). Fix JSON-LD logo → existing `/brand/alt-social-512.png` (kills the `/logo.png` 404). |
| `palace-hero.jpg`, `EntranceHall.jpg`, `pictures/Schermopname*.png` (~16MB), `debug-1-login.png`, PDFs | **DELETE from public/** (off-brand/dead, ~40MB total with video variants). |

## 2. New captures — shot list

Team captures in-app via the existing Puppeteer store-assets pipeline + camera-debug tool; UI/HUD fully hidden; devicePixelRatio 2.

Stage first: **build one lived-in demo palace** using `public/demo/` photos + licensed period family photos in frames, voice-note plaques visible, warm labels ("Oma's keuken, 1962"). All shots come from this palace. Grade everything to one signature golden-hour warm look — no CSS dimming afterwards.

| # | Shot | Angle / light | Master res | Use |
|---|---|---|---|---|
| S1 | Exterior, golden hour | Low 3/4 aerial approach, sun behind villa | frame from hero master video | Hero poster + loop |
| S2 | Entrance hall | Eye-level, doors open, light spilling in | 2880×1800 PNG | Hero alt / final-CTA background |
| S3 | Filled memory room | 3/4 dolly-in on photo wall, voice plaque in frame | 2880×1800 | Tier-1 "3D Palace" band (signature shot) |
| S4 | Photo-wall close-up | Tight crop, one framed photo + caption | 2880×1800 | "This is a palace" full-bleed payoff |
| S5 | WhatsApp→wall sequence | 3 stills: chat bubble → photo materializing → framed on wall | 2880×1800 ×3 | Kep/Capture band (plus 5–8s muted WebM loop ≤1MB) |
| S6 | Memory Map | Straight-on UI crop, real pins | 2880×1800 | Enrich band |
| S7 | Family Tree | Fan chart fragment, real-looking names | 2880×1800 | Enrich band |
| S8 | Time Capsule seal UI | Card close-up with reveal date | 2880×1800 | Share/legacy band |
| S9 | Two avatars co-visiting a room | Wide eye-level | 2880×1800 | Co-creation band |
| S10 | "Shoebox → palace" juxtaposition | Split: grey photo-grid folder vs same photos hung in S3 room | composite | Comparison replacement — signature, uncopyable |
| S11 | Phone frame, one room view | Portrait, frameless capture we frame in CSS | 1170×2532 | Single mobile moment; HTML captions, real alt text |

## 3. Video pipeline (three deliverables, nothing else)

- **Hero loop:** re-encode from `hero-bg-original.mp4`. 1080p, 10–12s, grade baked in. Ship H.264 ~1.5Mbps (≤1.5MB) **+ AV1/WebM ~1Mbps**. `poster="/video/hero-poster.jpg"` (graded S1 frame, 40–80KB) with `<link rel="preload" as="image" fetchpriority="high">`. **Mobile, saveData, 2g/3g, prefers-reduced-motion: still image only, never download or `play()` video.** Delete the CSS brightness/saturate filters — grade lives in the file.
- **hero-ob emotional clip:** 1080p H.264 ≤2MB + WebM, muted loop, poster frame, lazy below fold.
- **Walkthrough (narrated):** 45–60s cut, warm voice-over + ambient score, ends on free CTA. 1080p H.264 (~8MB) + 720p rendition (~3–4MB) via `<source>`; **WebVTT captions EN/NL/DE/ES/FR** via `<track kind="captions">`; poster kept; click-to-play in lightbox from hero secondary CTA. If narration slips: ship score + captions and remove the dead volume control now.

## 4. Image formats & performance

- Masters: lossless PNG 2×. Serve via `next/image` (AVIF/WebP auto) at widths **800/1200/1600/2400**, explicit width/height (CLS 0), `loading="lazy"` below fold, S1 poster `priority`.
- Budgets: hero poster ≤80KB; any band image ≤200KB at 1600w; total above-fold image+video ≤1.8MB desktop, ≤400KB mobile (still only); full-scroll media ≤6MB.
- **OG image:** new 1200×630 branded card showing S3 (filled room) + wordmark; wire into `metadataBase`/OG/Twitter, replacing the 512px logo.
- All captions/labels rendered as HTML (i18n ×5), never baked into bitmaps; descriptive per-image alt text keys in `landing.a11y` (never "screen N").

## 5. Non-negotiables

1. No asset ships behind the trapped carousel — carousel dies; screenshots become static bands.
2. Every Tier-1 feature band gets one real product visual from §2; thin-line icons retired as primary card art.
3. iOS 3.1.1 seal untouched: all assets are price-free imagery; new lightbox/CTA copy goes through existing gates.
4. Frame-zero test: hero paused at second zero must read "beautiful walkable 3D home" — else re-grade.

## 6. Execution order

1. Stage demo palace → 2. S1–S4 (unblocks hero) → 3. Hero loop + poster re-encode → 4. S5 Kep sequence + S6–S9 UI crops → 5. S10/S11 composites → 6. Walkthrough narration + captions → 7. OG image → 8. `public/` cleanup + move masters out.
