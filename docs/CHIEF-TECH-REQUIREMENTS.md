# Technische requirements die de chiefs terugbrengen — samengevat

_Cross-chief overzicht (Aurelia · Livia · Ottavia), 2026-09-01. Bron: ops-/legal-backlog,
PLATFORM-SPECS, Google Play-notice. Niets hiervan is autonoom uitgevoerd — beslisklaar voor de owner._

## ⏰ Harde deadlines (bewaakt door de Horizon-scanner)
| Datum | Requirement | Chief |
|-------|-------------|-------|
| **feb 2027** | Google Play: **DEX ≥25% (R8)** + geheugen (RSS+swap) + **bitmap**-drempels | Livia (+Ottavia) |
| **apr 2027** | Google Play: **Zero-Tap Sign-In** (Restore Credentials API) | Livia (+Ottavia) |
| gefaseerd | **EU AI Act** (transparantie AI-content) | Ottavia |
| in werking (2025) | **EAA** (digitale toegankelijkheid) — applicabiliteit toetsen | Ottavia |

## 🔧 Livia — Operations / performance
1. **R8/DEX ≥25%** — config **gecommit** (`766eb67`); vereist nog `cap sync` + release-build +
   **device-smoke** (login/eerste-foto/IAP/3D) vóór Play-submit. *(kan alleen in Android Studio)*
2. **Runtime-geheugen** — dynamic RSS+swap + bitmap onder drempel; **meten via Play Console → Android
   vitals** (nieuwe tools). *(vereist owner-login)*
3. **Zero-Tap Sign-In** (androidx.credentials + Supabase-sessieherstel) — native, gepland Q1-2027 (OPS-005).
4. **Perf-budgetten** (doorlopend): draw-calls < 150, TTI, 3D-FPS, a11y-score — dashboard-KPI's.
5. **Asset-hygiëne** — dode assets weg (−28 MB gedaan); verdere texture/HDRI-opschoning mogelijk.
6. **Canon (blijvend):** iOS free-tier-seal nooit doorbreken; deploy alleen vanaf committed master.

## ⚖️ Ottavia — Legal / compliance (technische kant)
**Al live deze sessie:** cookie-consent-banner gemount · AI-opt-in-gates op alle AI-routes ·
restore-consent-notice · `wing_shares` in media-autorisatie (OPS-006).
**Open (technisch):**
1. **AI-content-labeling** (LEG-003) — `source:"ai"|"user"`-veld + "AI-bewerkt"-badge (AI-Act-transparantie).
2. **In-app account-verwijdering** — bestaat; deep-link vanuit Profile + cascade-volledigheid verifiëren.
3. **Play Data-Safety-formulier** — laten kloppen met de feitelijke data-map.
4. **Art. 30-verwerkingsregister** + **72u-datalek-draaiboek** — als concept opstellen.
5. **DPA/sub-verwerkers-inventaris** (Replicate/Anthropic/OpenAI) + doorgifte (SCC's).
6. **EAA-toegankelijkheid** — applicabiliteit + a11y-audit koppelen (ops a11y = 88).
7. **Raadsman-concepten** (LEG-001/004/005/006) — uitgeschreven, wachten op jouw raadsman.

## 📣 Aurelia — Social / assets (`autonomy/PLATFORM-SPECS.md`)
1. **Clips:** 9:16, **1080×1920 @30fps**, h264 crf18+aac, **hook <1,5s**, CC-BY-credit verplicht.
2. **Foto/carrousel:** render **1620×2880 → 4:5 (1080×1350) + 9:16**; TikTok Photo Mode **5-7 slides**
   (aparte snit van IG); **max 5 hashtags**.
3. **Ads:** Meta **9:16 + 1:1**, TikTok **Spark-ready**, YT **Shorts**.
4. **Covers/thumbnails:** 3 ratio's geleverd (9:16 / 4:5 / 1:1) met safe-zones — **klaar**.
5. **ASO:** App Store-/Play-screenshots zijn **verouderd** → vernieuwen met huidige app-look (charter 07).

---
_Grootste eerstvolgende technische acties met deadline: **R8 device-smoke-build** + **Play Console
geheugenmeting** (Livia, richting feb-2027). De rest is doorlopend of wacht op owner/raadsman._
