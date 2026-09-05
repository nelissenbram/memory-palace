# Juridisch risico-register — The Memory Palace (Ottavia & team)

_Laatst bijgewerkt: 2026-09-05 (ronde 2 — IAP-paywall-audit + horizon-refresh: LEG-013 t/m LEG-018; AI-Act art.50 nu van kracht. LEG-012 = concurrent toevoeging signup-analytics, behouden.)_

> **Geen juridisch advies.** Signaleringen + voorbereidend werk. Score = waarschijnlijkheid ×
> impact × blootstelling (1-5). ✅ owner keurt goed · ⚖️ naar raadsman · ⏳ te doen.

## OPEN — met concrete bevinding (file-referenced)
| ID | Domein | Bevinding (grondslag + waar) | Score | Concrete mitigatie | Type |
|----|--------|------------------------------|-------|--------------------|------|
| **LEG-010** ⚡ | Cookies/ePrivacy | **CookieConsent-banner is gebouwd maar NERGENS gemount** — `CookieConsent.tsx` wordt niet geïmporteerd in `layout.tsx`; geen enkele web-bezoeker krijgt een consent-keuze. Analytics staat wel fail-safe UIT, maar vorm is non-compliant + gebruiker kan niet opt-in. | W5·I3·B4 | Mount `<CookieConsent />` in `src/app/layout.tsx` naast `PostHogProvider`; wire "Cookie-instellingen" → `reopen-cookie-consent`. | ✅ owner-fixbaar |
| **LEG-002** ⚡ | IP/attributie | **CC-BY-muziek-credit ontbreekt in de gegenereerde post-CSV.** `make-metricool-csv.ps1` zet alleen `caption+hashtags` in `text` (geen credit-kolom) → clip kan zonder verplichte Scott Buckley-CC-BY-credit gepost worden. Ook: `/credits` heeft geen muzieksectie. | W4·I4·B4 | Credit-blok hard in `make-metricool-csv.ps1` bakken (in `text` of `pinned_comment`-kolom); Muzieksectie op `/credits`. | ✅ owner-fixbaar |
| **LEG-004** | AI/gelijkenis | **Face-restore start zonder consent/notice.** `RestorePhotoModal.tsx:94-98` draait `runRestore` direct bij openen; geen melding dat de foto naar Replicate gaat; geen "AI-bewerkt"-markering. Speelt bij overledenen/derden. `ai-enhance/route.ts` mist ook de AI-consent-gate. | W3·I4·B4 | First-use consent-sheet vóór restore + `checkAiConsent` op de route + "AI-bewerkt"-badge. Biometrie/gelijkenis-kwalificatie → raadsman. | ⚖️ + ✅ |
| **LEG-011** | AI-consent-consistentie | **2 AI-routes negeren de opt-in-belofte.** `ai-enhance` en `life-story/generate` roepen `checkAiConsent` NIET aan, terwijl settings zegt "All AI processing is opt-in" (`en.json:520-528`). | W4·I3·B3 | `checkAiConsent(supabase, user.id)` toevoegen aan beide routes. | ✅ owner-fixbaar |
| **LEG-003** ⬆️ | AI (EU AI Act) | **Van "toekomstig" naar ACHTERSTAND:** AI Act **art. 50** (transparantie AI-content) is **van kracht sinds 2 aug 2026** (geverifieerd bij Commissie-guidelines + art. 113). Nog géén provenance-vlag/"AI-generated"-badge op AI-output (life-story/interview-samenvatting/labels/context). | W4·I4·B3 | `source:"ai"\|"user"`-veld op memories/chapters + AI-badge in UI; synthetisch-beeld-markering (bust/restore) meenemen. Prioriteit verhoogd. | ✅ owner-fixbaar |
| **LEG-005** ⬆️ | Consument | **Nu urgent door live IAP.** (a) Web toont géén auto-renewal-disclosure vóór aankoop — `autoRenewNotice` staat achter `{isApple}` (`pricing/page.tsx:719-723`), Stripe-web-koper ziet niets. (b) **Terms missen nog steeds "Subscriptions & Billing"** (`terms/page.tsx` secties 1-11). (c) **Web CancelFlow-symmetrie:** "Yes, cancel my plan" minder prominent dan "Keep my plan" + verplichte retentie-tussenstap (`CancelFlow.tsx:161,228-254`). iOS (`manageSubscriptions()`) is compliant. | W4·I4·B3 | (a) Web-variant renewal-regel op pricing-kaart. (b) Terms-sectie 12 (concept `RAADSMAN-CONCEPTEN.md:50-57`, corrigeer trial → **7 dagen**). (c) Opzegknop gelijk-visueel + skip-bare retentie-offer. | ⚖️ + ✅ |
| **LEG-006** | Minderjarigen/gevoelig | **Geen art.9-clausule** in privacy (terwijl "Health"-categorie + genealogie bestaan) + geen sensitiviteits-notice bij delen. _(Correctie: de eerder gestelde "server-enforced age-gate" bestaat niet → afgesplitst naar LEG-015.)_ | W3·I4·B4 | Art.9-clausule (concept `RAADSMAN-CONCEPTEN.md:72-81`) + lichte notice bij publiek delen. | ⚖️ + ✅ |
| **LEG-001** | Privacy/controller | Privacyverklaring is sterk (art.-gecit., 13 verwerkers, rechten, transfers). Gaten: **geen genoemde juridische entiteit/adres/ondernemingsnr. + geen DPO/art.27-vertegenwoordiger** (art.13); backup-retentie vaag. | W3·I3·B3 | Controller-blok (entiteit, BE-nr, adres, DPO/contact) + backup-purge-termijn concreet maken. | ⚖️ + ✅ |
| **LEG-007** ⬆️ | Privacy/records | **Nu urgent door live IAP.** Art. 30-verwerkingsregister + 72u-lek-draaiboek bestaan nog niet als document; nieuwe verwerking "abonnementsbeheer/IAP" + nieuwe partij **Apple** ontbreken in de sub-verwerkerslijst (`config.json:14` mist Apple). AI-sub-verwerker (Replicate) nog niet in de Terms-AI-clausule. | W3·I4·B3 | Art.30-entry "Abonnementsbeheer/IAP" (concept in EXEC-SUMMARY) + Apple in `config.json` (rol MoR, niet art.28) + breach-draaiboek-concept; AI-vendor-clausule in Terms. | ⚖️ + ⏳ |
| **LEG-008** | Toegankelijkheid | **EAA** (in werking 2025) applicabiliteit nog niet vastgesteld; a11y-score (ops) = 88. | W3·I3·B3 | Applicabiliteit bepalen; a11y-audit koppelen. | ⏳ |
| **LEG-009** | App-store | In-app account-verwijdering BESTAAT (`settings/security:683-841`, GDPR art.17) = compliant. Klein: alleen onder Security (niet Profile) → review-frictie; cascade-volledigheid niet getraceerd. | W2·I3·B2 | Deep-link vanuit Profile; `deleteAccount()`-cascade spot-checken. | ✅ owner-fixbaar |
| **LEG-012** | Privacy/analytics | **Server-side signup-capture naar PostHog loopt buiten de cookie-consent om** (bewuste keuze, 2026-09-05). `user_signed_up` wordt server-side gestuurd bij registratie (`actions.ts`, `auth/callback/route.ts`, via bestaande `captureServer`-helper) + eenmalige backfill van 215 bestaande users. Uitsluitend pseudoniem Supabase-uid + timestamp + signup-methode; geen e-mail/IP/device-data/cookies → geen ePrivacy-opslag/uitlezing, grondslag = gerechtvaardigd belang (first-party accountstatistiek). | W2·I2·B3 | Korte LIA (belangenafweging) vastleggen; PostHog-server-events benoemen in privacyverklaring (PostHog staat al als verwerker); opt-out-route bevestigen bij accountverwijdering (uid in PostHog wissen via delete-person). | ⚖️ licht + ✅ |
| **LEG-013** ⚡🚨 | App-store / consument | **iOS-abonnementspagina forceert `plan:"free"`, waardoor een betalende IAP-koper zichzelf als "gratis" ziet en Beheer/Opzeg/Restore-paid onbereikbaar zijn.** `settings/subscription/page.tsx:105-106` (`if (isApple) setSub({plan:"free"...})`, geverifieerd) → `isPaid` altijd false → `isPaid && isApple`-blok met `manageSubscriptions()` + paid-Restore (`:461-498`) = dode code. `:592-596` toont onvoorwaardelijk **"free to use on iPhone and iPad"** terwijl `/pricing` verkoopt (Apple **2.3.1** misleidend). `SettingsInline.tsx:51,89` verbergt de Subscription-tab op iOS zónder `IAP_ENABLED`-check (layout.tsx:139 doet 't wél). Stale free-tier-state, niet meegeschaald met de switch (bcfb4d0). | W5·I4·B4 | In `load()` op iOS het échte entitlement lezen bij `IAP_ENABLED`; `iosFreeNote` op `!IAP_ENABLED` conditioneren; `SettingsInline` dezelfde gate als `layout.tsx:139`. Hertest Manage/Restore/auto-renew-notice in paid-state. Apple **3.1.2 / 2.1**. | ✅ owner-fixbaar (blocker vóór submit) |
| **LEG-014** | Privacy (IAP-data) | **Privacyverklaring niet bijgewerkt voor IAP** (`lastUpdated` = 31-3-2026). Apple staat enkel als SSO-provider met "does not access your … data" (`en.json`/`nl.json` `whoWeShareItem10Text`) — nieuwe rol als iOS-betaalpartij/Merchant-of-Record + ontvanger van App Store Server Notifications ontbreekt. Geen categorie "abonnements-/betaaldata" (plan, status, `apple_original_transaction_id`, `current_period_end` — `20260614_apple_iap.sql:5`, gekoppeld aan `user_id`), geen art. 6(1)(b), geen bewaartermijn; Apple (VS) ontbreekt in cross-border-lijst zonder SCC/DPF. | W4·I3·B4 | Privacy-blokken: Apple-MoR-alinea + categorie "Abonnementsgegevens" + art. 6(1)(b) + billing-bewaartermijn + Apple(VS)+SCC/DPF (concept in EXEC-SUMMARY). MoR-vs-verwerker + SCC-toereikendheid → raadsman. | ✅ + ⚖️ |
| **LEG-015** | Minderjarigen | **Geen server-side leeftijdshandhaving — feitencorrectie op LEG-006.** `signUp()` (`actions.ts:9-60`, geverifieerd) bevat géén leeftijdscheck; de "16+"-poort is enkel een **client-side checkbox** (`register/page.tsx:254-261,274`) die niet geldt voor de Google/Apple-OAuth-knoppen (`:304,316`). `git log -S "ageConfirm"` op `actions.ts` = 0 hits. | W3·I4·B3 | Leeftijdsbevestiging server-side vastleggen bij signup (kolom + validatie) en op OAuth-paden afdwingen; consent-timestamp als bewijs. Consent-leeftijd per lidstaat → raadsman. | ✅ + ⚖️ |

## KLEINE TEKST-FIXES (owner-fixbaar, laag risico — batch B)
| ID | Bevinding | Mitigatie |
|----|-----------|-----------|
| **LEG-016** | `store-assets/subscription-descriptions.md:7,11` schrijft "€9.99/yr, €12.99/mo" — dubbelzinnig ("/yr" leest als heel jaar; is maandtarief bij jaarbetaling). | Herformuleer met **totaal jaarbedrag**: "€9.99/mnd bij jaarbetaling (€119.88/jaar) of €12.99/mnd." Idem Guardian (€239.88/jaar). |
| **LEG-017** | `en.json:5128` FAQ: "free … up to 5 rooms with 50 memories" ≠ `plans.ts:34-38` (unlimited rooms/memories, 1 GB). | FAQ corrigeren naar "1 GB opslag, unlimited rooms/memories" (×5 locales). |
| **LEG-018** | `docs/IOS_MONETIZATION_US_TAX_EU_RESEARCH.md:5,28-31` noemt verouderde prijzen (€4.99/€9.99). | Kop toevoegen: "Prijzen verouderd (jul 2026); canoniek = `plans.ts`." |

## DEADLINE-KALENDER
| Datum | Verplichting | Bron | Binnen 90d? | Eigenaar |
|-------|--------------|------|-------------|----------|
| **2 aug 2026 — VAN KRACHT (achterstand)** | **EU AI Act art. 50** — transparantie AI-content (generatief + synthetisch/deepfake-labeling) | Commissie AI-transparency-guidelines + AI Act art. 50/113 (geverifieerd) | **JA (verstreken)** | LEG-003 |
| **2 dec 2026** | AI Act art. 113(a) carve-outs (gen-AI-marking) — voorbehoud (secundaire bron) | AI Act art. 113 | **JA (~grens)** | LEG-003 |
| sinds 28 jun 2025 | **EAA** (toegankelijkheid) — handhaving loopt | EAA | JA (doorlopend) | LEG-008 |
| **feb 2027** | Google Play memory/bitmap + **DEX ≥25% (R8)** | Google blog 26-08-2026 | Nee (~5 mnd) | OPS-004 + LEG |
| **apr 2027** | Google Play **Zero-Tap Sign-In** | Google blog 26-08-2026 | Nee (~7 mnd) | OPS-005 + LEG |

## ⚖️ NAAR RAADSMAN — **concepten uitgeschreven** (`review/pending/2026-09-01/concepts/RAADSMAN-CONCEPTEN.md`)
- Bestaand: LEG-004 (biometrie/gelijkenis, ook van overledenen) · LEG-005 (auto-renewal/consumentenrecht + liability-cap) ·
  LEG-006 (art.9-clausule-tekst) · LEG-001 (controller/DPO + liability-savings-clausule).
- **Nieuw ter toevoeging (ronde 2):** LEG-014 (Apple-MoR-kwalificatie + SCC/DPF-toereikendheid iOS-betaaldata) ·
  LEG-015 (consent-leeftijd per lidstaat + geldigheid client-attest).
  → owner vult entiteits-/bedragvelden in en legt voor aan raadsman.

## ➡️ DOORGEGEVEN AAN OPS (functioneel, geen puur juridisch)
- `/api/media/[...path]` honoreert **`wing_shares` niet** (alleen `room_shares`) → wing-brede deel toont
  metadata maar 403't de media-bytes. = **OPS-006** (onder-autorisatie-bug, geen lek). _(gefixt 2026-09-01)_
- Invite-preview-getters geven recipient-e-mail terug aan houder van de shareId-UUID (kleine privacy-exposure).
- **OPS-007** — `api/apple/verify-receipt/route.ts:10-11` gebruikt het **gedeprecieerde `/verifyReceipt`**-endpoint
  (mét sandbox-fallback + auth + rate-limit = degelijk, maar legacy). De **webhook** doet JWS + cert-chain naar Apple
  Root al correct. Aanbeveling: migreren naar App Store Server API v2 (`SignedDataVerifier`). Niet-blokkerend.

## KLAAR (fix-pakket A — gefixt + gedeployd 2026-09-01)
| ID | Resultaat |
|----|-----------|
| **LEG-010** | `<CookieConsent />` gemount in `layout.tsx` — banner verschijnt nu; consent-logica was al opt-in. Commit `96b7153`. |
| **LEG-011** | `checkAiConsent` toegevoegd aan `/api/ai-enhance` + `/api/life-story/generate` — AI-opt-in-belofte klopt nu overal. Commit `96b7153`, tsc groen. |
| **LEG-002** | CC-BY-muziekcredit (Scott Buckley) hard in `make-metricool-csv.ps1` gebakken → elke post-caption bevat de attributie; kan niet meer zonder credit gepost worden. |
| **OPS-006** | `wing_shares` in media-autorisatie (commit `eb98083`) — doorgegeven + gefixt. |
| **LEG-004** (deel) | Éénmalige AI/gelijkenis-consent-notice vóór face-restore (`RestorePhotoModal.tsx`, i18n ×5, commit `5ccec99`). De biometrie/overledenen-gelijkenis-vragen blijven bij de raadsman (concept). |
