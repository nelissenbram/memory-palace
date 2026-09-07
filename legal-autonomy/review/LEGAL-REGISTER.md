# Juridisch risico-register — The Memory Palace (Ottavia & team)

_Laatst bijgewerkt: 2026-09-07 (ronde 4 — **BRANCH-DIVERGENTIE ontdekt**: de geverifieerde 05-09 legal-batch (LEG-003 provenance/AI-badge, LEG-015 leeftijdsattest, LEG-005a web-renewal) zit op **`staging`**, maar **ONTBREEKT op `feature/ios-iap-paywall`** — de branch die de nieuwste restore-uitbreiding draagt. → **LEG-020 🆕 (blokkerend release-integriteit)**. LEG-013 opnieuw bevestigd ongewijzigd & blokkerend (nu binnen één build aantoonbaar: `/pricing` verkoopt iOS-IAP terwijl `/settings/subscription` "gratis" toont). Nieuw: LEG-021 (privacy-policy mist Replicate/R2/PostHog in subverwerkerslijst) + LEG-022 (restore-claim "in seconds"). Deadlines herberekend: Google Play-registratie ~23 d, AI-Act art. 50(2) ~86 d.)_

> **Geen juridisch advies.** Signaleringen + voorbereidend werk. Score = waarschijnlijkheid ×
> impact × blootstelling (1-5). ✅ owner keurt goed · ⚖️ naar raadsman · ⏳ te doen · ✔️ geverifieerd DONE.

## ✔️ VERIFICATIE-CLOSEOUT 2026-09-06 (owner-GO-batch 05-09 tegen staging-code gecheckt)
Alle items hieronder zijn met file:line-bewijs geverifieerd in `memory-palace-staging`. Gesloten → verplaatst naar **KLAAR (fix-pakket C)** onderaan.
- ✔️ **LEG-001** — controller-blok = alleen "The Memory Palace" + **privacy@thememorypalace.ai** (0 `.com`-treffers), geen adres/BE-nr/DPO, savings-clausule in Terms, backup-purge = 30 dagen. **0 treffers "Elyphont"** in publieke teksten. (`privacy/page.tsx:181-190`, commit `995a19b`)
- ✔️ **LEG-003** — provenance-veld (`source 'user'|'ai'`, migratie `20260905130000_ai_provenance.sql`) op memories + chapters; AI-badge rendert op AI-output. Commit `9894527`. _Restrisico → LEG-003b._
- ✔️ **LEG-005 (a+b+c)** — (a) web-auto-renewal-regel vóór CTA (`pricing/page.tsx:741-749`, `autoRenewNoticeWeb` ×5 talen); (b) Terms §12 "Subscriptions & Billing" met jaarlijkse auto-verlenging, trial (14d via `TRIAL_DAYS`), opzeggen elk moment, **14-dagen pro-rata herroeping web**, iOS-refunds via Apple (`terms/page.tsx:297-303`, commit `b99b260`); (c) CancelFlow-opzegknop nu gelijk-visueel + retentie-offer skip-baar (`CancelFlow.tsx:148-278`).
- ✔️ **LEG-006** — art. 9-clausule in privacy (grondslag uitdrukkelijke toestemming, intrekken=wissen) + gevoeligheids-notice in deel-dialoog (`SharingPanel.tsx:276+`). Commit `b72a832`.
- ✔️ **LEG-007** — art. 30-register (`records/ART30-REGISTER.md`, entries 1-7 vastgesteld) + 72u-draaiboek (`records/BREACH-DRAAIBOEK-72U.md`) bestaan; Apple staat als MoR in publieke sub-verwerkerslijst (`whoWeShareItem10`) en in `config.json`. _Restpunt → LEG-019._
- ✔️ **LEG-012** — PostHog server-side signup-events + `name`-property benoemd in privacy (`whoWeShareItem14Text`); `deletePersonServer` wist de PostHog-persoon (incl. naam) bij accountverwijdering (`profile-actions.ts:423`); LIA-doc bestaat (`records/LIA-posthog-signup-analytics.md`). Commit `7d992e8`.
- ✔️ **LEG-014** — alle 7 sub-punten in privacy: Apple = zelfstandige betaalpartij/MoR (niet art. 28), de onjuiste "Apple … does not access your data"-zin **verwijderd** (0 treffers), categorie "abonnements-/betaaldata", art. 6(1)(b), bewaartermijn = abonnementsduur + 7 jr (BE), Apple(VS)+Stripe met EU-US DPF/SCC, `lastUpdated` = 5-9-2026. Commit `8d940d8`. _Substantie-voorbehoud (MoR-kwalificatie + SCC/DPF-toereikendheid) blijft raadsman._
- ✔️ **LEG-015** — server-side leeftijdsattest: `signUp()` weigert zonder `ageConfirmed`, schrijft `age_confirmed_at` (migratie `20260905120000`); OAuth-callback dwingt `/auth/confirm-age`-poort af voor accounts vanaf 05-09 (`auth/callback/route.ts:105-125`, write-once). Commit `1bf7119`. _Consent-leeftijd per lidstaat blijft raadsman._
- ✔️ **LEG-016 / LEG-017** — store-copy prijs-notatie ondubbelzinnig (canon-banner €49/€79); FAQ-free-plan gecorrigeerd naar "1 GB, unlimited wings/rooms" (×5 talen). Trial-CTA overal 14d (`TRIAL_DAYS`), 0 "7-dagen"-treffers in app-copy.
- ✔️ **LEG-004 (regressie-check)** — de nieuwe restore-paden (B&W→Kontext `c18bdeb`, auto-colorize `2a562e3`, loader `07ef1d1`) draaien **alle** downstream van de `checkAiConsent`-gate in `ai-enhance/route.ts:128` én stempelen `source:"ai"`. Géén nieuw lek. Biometrie/gelijkenis-kwalificatie blijft raadsman-pending (ongewijzigd).

## OWNER-BESLUITEN 2026-09-05 (behouden als beslissingsdossier)
- ✅ LEG-003 · LEG-015 · LEG-005(a+c) · LEG-016/017/018 · LEG-007 · LEG-014 · LEG-001 · LEG-004 · LEG-006 — go's; besluitteksten hieronder ongewijzigd bewaard.
- ⚠️ **Raadsman-map**: owner wint voorlopig GEEN extern advies in; alle punten intern doorgelopen (met AI-advies). Concepten blijven als referentie in `review/pending/2026-09-01/concepts/`.
- 🏠 **HUISREGEL (owner 05-09):** géén "Elyphont" in publieke teksten/kanalen; publiek = "The Memory Palace" + **privacy@thememorypalace.ai** (.com heeft geen MX; teruggedraaid naar .ai, live). _(Geverifieerd 06-09: 0 publieke Elyphont-treffers; alleen het interne art. 30-register noemt `bram@elyphont.com` — bewust, dat is de controller-identiteit.)_
- 🏠 **HUISREGEL:** nooit door gebruikers herstelde gezichten in marketing/publieke feeds zonder aparte toestemming.
- 💶 **Reprijzing €49/€79 annual** actief op web én iOS (geverifieerd 06-09).
- (Volledige besluitteksten LEG-001/004/005b/006/014/015 uit ronde 2 blijven in de git-historie van dit bestand; hier ingekort na verificatie.)

## OPEN — met concrete bevinding (file-referenced)
| ID | Domein | Bevinding (grondslag + waar) | Score | Concrete mitigatie | Type |
|----|--------|------------------------------|-------|--------------------|------|
| **LEG-013** ⚡🚨 | App-store / consument | **BLIJFT OPEN & BLOKKEREND — herbevestigd 2026-09-07 in BEIDE repos (byte-identiek).** `IAP_ENABLED = true` (`iap-flags.ts:8`); `pricing/page.tsx:146-161` verkoopt op iOS een échte StoreKit-koop (`purchase(getIAPProductId(...))`), toont StoreKit-prijs `:679-700`, trial-CTA `:772`, Apple auto-renew `:799`. **Maar** `settings/subscription/page.tsx:161-162` forceert nog **onvoorwaardelijk** `plan:"free"` op iOS → `isPaid` kan nooit true worden, dus de `manageOrCancel`-knop (`:619-630`) en restore-paid-UI verschijnen nooit. En `:732-735` toont voor **elke** iOS `iosFreeNote` = *"free to use on iPhone and iPad, with all core features included"* — pal boven de auto-renew-notice die wél rendert (`:743-746`, `isApple && IAP_ENABLED`). **Verscherpt:** binnen één en dezelfde build kan iemand op `/pricing` kopen (Apple belast, auto-renew loopt) en ziet daarna op `/settings/subscription` "gratis, alle features". Apple **3.1.2 / 2.3.1** + consumentenrecht (betaler kan niet in-app beheren; misleidende gratis-claim). | W5·I4·B4 | (1) In `load()` op iOS bij `IAP_ENABLED` het **échte** entitlement lezen i.p.v. hard `plan:"free"`; (2) `iosFreeNote` conditioneren op `!IAP_ENABLED`. Daarna Manage/Restore/auto-renew in paid-state hertesten. **NIET submitten zolang IAP_ENABLED=true én deze twee open staan.** | ✅ owner-fixbaar (blocker vóór submit) |
| **LEG-020** 🆕⚡🚨 | Governance / release-integriteit | **BRANCH-DIVERGENTIE — geverifieerd 2026-09-07 bij primaire bron.** De release-branch **`feature/ios-iap-paywall`** (prod-repo `memory-palace`, draagt de nieuwste restore-uitbreiding: `RestorePhotoPicker` nieuw, Kontext `c18bdeb`, auto-colorize `2a562e3`) **mist een substantieel deel van de geverifieerde 05-09 legal-batch** die wél op **`staging`** staat: ⛔ `ai_provenance`-migratie (`20260905130000`) + `source:"ai"`-write + AI-badge (LEG-003/003b, AI-Act art. 50) — **ontbreekt**; ⛔ `age_confirmed_at`-migratie (`20260905120000`, LEG-015 leeftijdsattest) — **ontbreekt**; ⛔ `autoRenewNoticeWeb` (LEG-005a web-renewal) — 0 treffers; ⛔ de foute "Apple … does not access your"-zin (LEG-014) — **nog aanwezig** in `messages/en.json` (op staging verwijderd); ⛔ `docs/legal-records/` (LEG-019, commit `639ac66`) — niet in de tree. **Gevolg:** een iOS-build vanaf deze branch mist de geverifieerde art. 50-markering, het server-side leeftijdsattest en de gecorrigeerde privacy-teksten — én draagt LEG-013 nog. De prior "9 items DONE" zijn tegen **staging** geverifieerd (dáár intact); dit is géén regressie maar een merge-gat. | W4·I5·B4 | **Release uitsluitend via `staging`** (superset: bevat 05-09-batch + restore-uitbreiding), **óf** `feature/ios-iap-paywall` eerst rebasen/mergen op `staging` vóór enige iOS-submission. Owner + OPS: bevestig welke branch de v1.4.1-build voedt. **Niet submitten vanaf feature-branch.** | ✅ owner/OPS-besluit (blocker vóór submit) |
| **LEG-021** 🆕 | Privacy / transparantie | **Publieke privacy-policy-subverwerkerslijst (`whoWeShareItem1-13`, `messages/en.json:3835-3860`) mist Replicate, Cloudflare R2 en PostHog** — terwijl face-foto's naar US-verwerker **Replicate** gaan en de nieuwe restore-picker die flow prominenter maakt (Atrium-tegel i.p.v. verstopt in Library). De restore-**consent-notice** noemt Replicate wél (`en:2529`), de algemene privacyverklaring niet. Grondslag: **AVG art. 13(1)(e)** (ontvangers/categorieën vermelden). | W2·I3·B3 | Replicate (+ R2, PostHog) toevoegen aan `whoWeShare`-lijst in alle 5 talen, met transfer-waarborg-status conform ART30 entry 4 (past onder LEG-007/LEG-014-familie). | ✅ owner-fixbaar |
| **LEG-022** 🆕 | Consument / reclamerecht | **Marketing-copy `en.json:5766` (`u14b`): "our AI gently restores them to clear, warm keepsakes _in seconds_."** Botst met de eigen UX-realiteit (code erkent cold-start ~2,5 min, `route.ts:24-25`; loader "This can take a few minutes", `en:2523`) → potentieel misleidende snelheidsclaim + stellige uitkomst zonder hedge. Grondslag: **Richtlijn oneerlijke handelspraktijken 2005/29** (misleidende claim). | W2·I2·B2 | "in seconds" nuanceren (bv. "in moments" / "usually seconds — older photos can take longer") en resultaat-hedge zoals in de consent-copy ("may differ slightly"). | ✅ owner-fixbaar (copy) |
| **LEG-008** | Toegankelijkheid | **APPLICABILITEIT VASTGESTELD 2026-09-07 (primaire bron: Richtlijn (EU) 2019/882, art. 4 lid 5):** micro-ondernemingen (<10 werknemers én ≤€2 mln omzet/balans) die **diensten** leveren zijn **automatisch vrijgesteld** van de EAA-toegankelijkheidseisen — geen aanvraag of beoordeling nodig. The Memory Palace = eenmansonderneming die een digitale dienst levert → vrijgesteld; de product-kant van de EAA is niet van toepassing. De 28-6-2027-cliff vervalt daarmee als deadline. | W1·I2·B1 | **Herzien zodra** ≥10 werknemers of >€2 mln omzet (dan geldt de EAA wél, met de dan lopende termijnen). Toegankelijkheid blijft los hiervan een kwaliteitsdoel (ops a11y-score, 60+-doelgroep) — de OPS-009/015-fixes lopen gewoon door. | ✔️ vastgesteld (vrijstelling) |
| **LEG-009** | App-store | In-app account-verwijdering BESTAAT (GDPR art. 17) = compliant. Klein: alleen onder Security → review-frictie; cascade-volledigheid niet getraceerd. | W2·I3·B2 | Deep-link vanuit Profile; `deleteAccount()`-cascade spot-checken. | ✅ owner-fixbaar |
| **LEG-003b** 🆕 | AI (AI-Act art. 50) | **Synthetische 3D-buste ("bust") van een (mogelijk overleden) echte persoon draagt géén zichtbaar "AI-generated"-label.** De migratie sluit busts bewust uit van het `source`-veld; er is geen badge-component op de 3D-buste-surface. Ook `historicalContext` (AI, client-side, niet-gepersisteerd) is ongemarkeerd. Beide gedocumenteerd in de migratie-header. Art. 50(2) vereist markering van synthetische beelden. | W3·I3·B3 | Raadsman-oordeel: heeft een synthetische gelijkenis van een echte overledene een on-surface art. 50-markering nodig? Zo ja: badge op buste-surface. Laag-maar-gevoelig. | ⚖️ + ✅ |
| **LEG-019** 🆕 | Governance / records | **Art. 30-register, 72u-draaiboek en PostHog-LIA staan alléén in `memory-palace/legal-autonomy/records/`, niet mee-geversioneerd met de code (staging).** Bewijs voor LEG-007/012 leeft dus buiten de audit-tree. | W2·I2·B3 | **BESLOTEN 2026-09-07 (owner): mee-versioneren.** Gesynchroniseerde kopieën staan in `docs/legal-records/` in de code-tree (commit `639ac66`); bron blijft `legal-autonomy/records/`, chief legal bewaakt de sync in de dagelijkse run. | ✔️ afgehandeld |

_Raadsman-pending substantie-items (open, maar niet code-oplosbaar):_ LEG-004 (biometrie/gelijkenis-kwalificatie, ook overledenen) · LEG-014 (Apple-MoR-kwalificatie + SCC/DPF-toereikendheid) · LEG-015 (geldigheid client-attest + consent-leeftijd per lidstaat) · LEG-006 (eenmalige-bevestiging-variant bij opschaling). Concepten in `review/pending/2026-09-01/concepts/RAADSMAN-CONCEPTEN.md`.

## DEADLINE-KALENDER
| Datum | Verplichting | Bron | Binnen 90d? | Eigenaar |
|-------|--------------|------|-------------|----------|
| **2 aug 2026 — VAN KRACHT (achterstand grotendeels ingelopen)** | **EU AI Act art. 50(1)/(4)** — informeren over AI-interactie + deepfake/AI-tekst-disclosure | Commissie art. 50-guidelines; artificialintelligenceact.eu/article/50 | JA (verstreken) | LEG-003 (grotendeels DONE) |
| **2 dec 2026 (~86 d)** ⚠️ | **AI Act art. 50(2)** — machine-leesbare **markering** van AI-gegenereerde/synthetische content; gratieperiode-einde voor gen-AI van vóór 2-8-2026 | **Digital Omnibus Verord. (EU) 2026/1744**, PB 27-7-2026 (**geherattribueerd** — NIET art. 113(a)) | **JA (~86 d)** | LEG-003 / LEG-003b (staging DONE; **op feature-branch ontbrekend → LEG-020**) |
| **2 dec 2026** | AI Act art. 5 verboden-praktijk-carve-outs (5(1)(ba),(bb),(1a),(1b)) — dít is wat art. 113(a) écht is | AI Act art. 113(a), geconsolideerd | JA | n.v.t. (geen verboden praktijk bij ons) |
| **30 sep 2026 (~23 d)** ⚠️ | Google Play — app-package/developer-registratie-verificatie | Play Console announcements | **JA (~23 d)** | → OPS (bevestig registratie) |
| **31 aug 2026 — verstreken** | Google Play target API 36 (Android 16) voor nieuwe apps/updates | Play Console policy | JA (verstreken) | → OPS (bevestig build-target) |
| ~~28 jun 2027 — EAA-cliff~~ **VERVALLEN** | ~~EAA legacy-dienstcontracten~~ — **micro-onderneming vrijgesteld** (art. 4 lid 5 Richtlijn (EU) 2019/882) | Richtlijn (EU) 2019/882 art. 4(5) | N.v.t. | LEG-008 (vrijstelling, herzien bij ≥10 wn / >€2 mln) |
| **feb 2027** | Google Play memory/bitmap + **DEX ≥25% (R8)** | Google blog 26-08-2026 | Nee (~5 mnd) | OPS-004 + LEG |
| **apr 2027** | Google Play **Zero-Tap Sign-In** | Google blog 26-08-2026 | Nee (~7 mnd) | OPS-005 + LEG |

_Voorbehouden (horizon 07):_ (a) DSA "online platform"-zelfclassificatie nog niet formeel gedaan — bepaalt of enige DSA-transparantieplicht aanhaakt (waarschijnlijk niet-VLOP, lage kans). (b) Of onze restore/bust-outputs "in de handel vóór 2-8-2026" zijn (bepaalt of de 2-dec-gratie geldt of markering al 2-8 verschuldigd was) — feitelijk, voor owner.

## ⚖️ NAAR RAADSMAN — concepten (`review/pending/2026-09-01/concepts/RAADSMAN-CONCEPTEN.md`)
- LEG-004 (biometrie/gelijkenis, ook overledenen) · LEG-014 (Apple-MoR + SCC/DPF-toereikendheid iOS-betaaldata) ·
  LEG-015 (consent-leeftijd per lidstaat + geldigheid client-attest) · LEG-006 (art. 9 — bevestigings-variant bij opschaling) ·
  LEG-003b 🆕 (art. 50-markering synthetische buste van echte (overleden) persoon).
  → owner vult entiteits-/bedragvelden in en legt voor aan raadsman (wanneer hij weer extern advies inwint).

## ➡️ DOORGEGEVEN AAN OPS
- **BRANCH-BUILD (LEG-020, blokkerend)** 🆕 — bevestig dat de v1.4.1-iOS-build vanaf **`staging`** wordt gebouwd, niet vanaf `feature/ios-iap-paywall` (die mist de 05-09 legal-batch). Zo niet: rebase/merge feature op staging vóór submit.
- **W-8BEN + Paid Applications Agreement (App Store Connect)** 🆕 — operationele voorwaarde náást `IAP_ENABLED=true`: zonder ondertekende Paid Apps Agreement + belastinginfo worden IAP-producten niet "Ready for Sale" (bron: `docs/IOS_MONETIZATION_US_TAX_EU_RESEARCH.md`, primair bevestigd). Geen IRS-filing; 0% US-inhouding via BE-fiscaalnr als foreign TIN. Verifiëren vóór live-gang.
- **Export-compliance** 🆕 — `ITSAppUsesNonExemptEncryption=false` staat in staging-buildconfig (`codemagic.yaml:74`, `.github/workflows/ios.yml:223`), **ontbreekt op feature-branch**. "Exempt"-claim plausibel (alleen HTTPS/TLS + server-side SHA-256/HMAC; geen niet-standaard crypto in de client). Meelift-punt bij LEG-020.
- **Google Play 30 sep 2026** — bevestig app-package/developer-registratie (~23 d). En target-API-36 (31 aug verstreken) build-target checken.
- **OPS-007** — `api/apple/verify-receipt/route.ts` gebruikt het gedeprecieerde `/verifyReceipt` (met sandbox-fallback + auth + rate-limit = degelijk, maar legacy); webhook doet JWS + cert-chain correct. Aanbeveling: migreren naar App Store Server API v2 (`SignedDataVerifier`). Niet-blokkerend.
- `/api/media/[...path]` wing_shares-autorisatie (OPS-006) — _gefixt 2026-09-01._
- Invite-preview-getters geven recipient-e-mail terug aan houder van de shareId-UUID (kleine privacy-exposure).

## KLAAR (fix-pakket A+B — gefixt/gedeployd 2026-09-01 t/m 05-09)
| ID | Resultaat |
|----|-----------|
| **LEG-010** | `<CookieConsent />` gemount in `layout.tsx`; consent-logica opt-in. Commit `96b7153`. |
| **LEG-011** | `checkAiConsent` op AI-routes; opt-in-belofte klopt. Commit `96b7153`. |
| **LEG-002** | CC-BY-muziekcredit (Scott Buckley) hard in `make-metricool-csv.ps1`; ook Poly-Haven CC0 op `/credits`. |
| **OPS-006** | `wing_shares` in media-autorisatie (commit `eb98083`). |
| **LEG-004** (consent-deel) | Éénmalige AI/gelijkenis-consent-notice vóór face-restore (`RestorePhotoModal.tsx`, i18n ×5, commit `5ccec99`); dekt ook overledenen/derden in de copy. |

## KLAAR (fix-pakket C — geverifieerd DONE 2026-09-06)
| ID | Resultaat (bewijs) |
|----|--------------------|
| **LEG-001** | Controller-blok + .ai-contact + savings-clausule + 30d-backup; 0 Elyphont-treffers publiek. `privacy/page.tsx:181-190`. |
| **LEG-003** | Provenance-veld + AI-badge (2 gedocumenteerde carve-outs → LEG-003b). Migratie `20260905130000`, commit `9894527`. |
| **LEG-005** | (a) web-renewal-regel `pricing/page.tsx:741-749`; (b) Terms §12 `b99b260`; (c) CancelFlow-symmetrie `CancelFlow.tsx`. |
| **LEG-006** | Art. 9-clausule + deel-notice. Commit `b72a832`. |
| **LEG-007** | Art. 30-register + 72u-draaiboek + Apple-MoR-subverwerker. `records/`, `config.json`. (restpunt LEG-019) |
| **LEG-012** | PostHog-disclosure + person-delete + LIA. Commit `7d992e8`. |
| **LEG-014** | 7/7 privacy-IAP-blokken. Commit `8d940d8`. (substantie-voorbehoud raadsman) |
| **LEG-015** | Server-side leeftijdsattest + OAuth-poort. Commit `1bf7119`. |
| **LEG-016/017** | Prijs-notatie + FAQ-free-plan gecorrigeerd; trial 14d consistent. |
</content>
</invoke>
