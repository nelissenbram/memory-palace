# Verwerkingsregister (AVG art. 30 lid 1) — The Memory Palace

_Versie 2026-09-06 · verwerkingsverantwoordelijke-register (controller) · taal: NL · entries 1-7 vastgesteld (1: 05-09, 2-7: 06-09); open velden gemarkeerd "in te vullen"_

**Verwerkingsverantwoordelijke:** The Memory Palace — eenmansonderneming, gevestigd in België (owner: bram@elyphont.com). Juridische entiteit, ondernemingsnummer en vestigingsadres: **in te vullen** (zie LEG-001).
**Functionaris gegevensbescherming (DPO):** niet aangesteld (niet verplicht gebleken; her-beoordelen bij schaal/aard-wijziging).
**Vertegenwoordiger (art. 27):** n.v.t. — verantwoordelijke is in de EU gevestigd.

Legenda status: **VASTGESTELD** = door owner bekrachtigd · **CONCEPT — ter vaststelling** = voorstel, nog niet bekrachtigd.

---

## 1. Abonnementsbeheer / IAP

**Status: VASTGESTELD door owner 2026-09-05, voorbehoud: MoR-kwalificatie Apple + SCC/DPF-toereikendheid nog te bevestigen (LEG-014).**

| Veld | Inhoud |
|------|--------|
| Doel | Afsluiten/activeren/beheren betaald abonnement (keeper/guardian) + entitlement-reconciliatie. |
| Categorieën betrokkenen | Betalende gebruikers. |
| Categorieën data | User-id, plan, status, `apple_original_transaction_id` / Stripe customer- & subscription-id, `current_period_end`, `subscription_source`. |
| Ontvangers / sub-verwerkers | Apple (iOS MoR + Server Notifications), Stripe (web), Supabase (opslag). |
| Doorgifte buiten EU | Apple & Stripe (VS) — waarborg SCC/DPF (te bevestigen). |
| Bewaartermijn | Duur abonnement + wettelijke boekhoud-/fiscale termijn (in te vullen). |
| Beveiligingsmaatregelen | RLS, service-role-only writes, TLS, JWS-webhookverificatie. |
| Grondslag (informatief, art. 6) | Art. 6(1)(b) — uitvoering overeenkomst. |

---

## 2. Accountbeheer & authenticatie

**Status: VASTGESTELD door owner 2026-09-06** (delegatie-besluit; open velden blijven "in te vullen").

| Veld | Inhoud |
|------|--------|
| Doel | Registratie, login (e-mail/wachtwoord + Google/Apple-SSO), sessiebeheer, accountherstel, accountverwijdering. |
| Categorieën betrokkenen | Alle geregistreerde gebruikers. |
| Categorieën data | E-mailadres, display_name, gehasht wachtwoord (bij e-mail-login), OAuth-identifier, user-id (uid), tijdstempels, leeftijdsbevestiging met timestamp (server-side vastgelegd sinds 2026-09-05, incl. OAuth-pad — LEG-015). |
| Ontvangers / sub-verwerkers | Supabase (auth + database); Google/Apple uitsluitend als SSO-identity-provider. |
| Doorgifte buiten EU | Afhankelijk van Supabase-regio-configuratie; bij VS-component: SCC/DPF (te bevestigen). |
| Bewaartermijn | Duur van het account; verwijdering via in-app accountverwijdering (cascade — volledigheid te verifiëren, LEG-009). |
| Beveiligingsmaatregelen | TLS, wachtwoord-hashing (Supabase-auth), RLS op alle gebruikerstabellen, rate-limiting. |

## 3. Opslag familie-media & verhalen (kernproduct)

**Status: VASTGESTELD door owner 2026-09-06** (delegatie-besluit; open velden blijven "in te vullen").

| Veld | Inhoud |
|------|--------|
| Doel | Opslaan, tonen en delen van familieherinneringen: foto's, video's, audio, verhalen, kamers/vleugels, genealogie. |
| Categorieën betrokkenen | Gebruikers; door hen afgebeelde/beschreven derden — waaronder mogelijk minderjarigen en overledenen (gevoelige context; art. 9-kwalificatie open, LEG-006). |
| Categorieën data | Foto- en videobestanden, audio, teksten/verhalen, metadata (titels, jaartallen, relaties), deel-instellingen (room/wing-shares). |
| Ontvangers / sub-verwerkers | Supabase (database/metadata), Cloudflare R2 (media-opslag). |
| Doorgifte buiten EU | Cloudflare (VS-moederbedrijf) — waarborg SCC/DPF (te bevestigen); Supabase: zie entry 2. |
| Bewaartermijn | Duur van het account. **Backups (geverifieerd owner 2026-09-06, Supabase-dashboard):** dagelijkse backups rond middernacht (regio-tijd), geen PITR actief; retentievenster conform Supabase-plan (Pro-standaard 7 dagen). Publieke belofte in de privacyverklaring ("uiterlijk 30 dagen") is daarmee een ruime, correcte bovengrens. |
| Beveiligingsmaatregelen | RLS, autorisatie op media-endpoint (`/api/media/[...path]` incl. room-/wing-shares), TLS, geen publieke buckets. |

## 4. AI-verwerking (foto-restore, life-story, labels/context, interview, bust)

**Status: VASTGESTELD door owner 2026-09-06** (delegatie-besluit; open velden blijven "in te vullen").

| Veld | Inhoud |
|------|--------|
| Doel | Op verzoek van de gebruiker: fotorestauratie (gezichten), life-story-generatie, AI-labels/context, interview-samenvatting, bust-generatie. |
| Categorieën betrokkenen | Gebruikers; afgebeelde derden — waaronder mogelijk minderjarigen en overledenen; gezichten (gelijkenis-/biometrie-kwalificatie open, LEG-004). |
| Categorieën data | Aangeleverde foto's (incl. gezichten), verhaalfragmenten/teksten, gegenereerde AI-output. |
| Ontvangers / sub-verwerkers | Replicate (beeld-AI), Anthropic, OpenAI (tekst-AI). |
| Doorgifte buiten EU | Replicate, Anthropic, OpenAI (VS) — waarborg SCC/DPF (te bevestigen; Replicate: geen DPF-vermelding gevonden). |
| Bewaartermijn | Output bij het account (zie entry 3). **Replicate (geverifieerd 2026-09-06 bij primaire bron, docs "Data retention"):** API-prediction-inputs, -outputs, -bestanden en -logs worden **standaard na 1 uur automatisch verwijderd** — foto's staan daar dus max. ~1 uur. Anthropic/OpenAI: retentie te verifiëren (in te vullen). |
| Beveiligingsmaatregelen | **AI-opt-in-gate:** alle AI-verwerking is opt-in; `checkAiConsent` staat op de AI-routes (ai-context/ai-tag/ai-label/ai-interview/ai-interview-summarize/bust-generate/kep-capture-router + ai-enhance/life-story sinds fix LEG-011); eenmalige consent-notice vóór face-restore; TLS. AI-output-markering (AI Act art. 50) live sinds 2026-09-05 (LEG-003). |
| DPA-status Replicate (check 2026-09-06) | Privacybeleid duidt Replicate als **"processor"/"service provider"**; de docs bevestigen de 1-uurs-autoverwijdering voor API-predictions (sterke feitelijke dataminimalisatie). **Maar:** voor het standaardplan is géén publieke DPA/verwerkersovereenkomst gevonden, de ToS bevat een brede gebruikslicentie zonder expliciete "wij trainen niet op klant-input"-toezegging, en er is geen SCC/DPF-vermelding. Enterprise-plan biedt wél DPA's. **Restadvies:** DPA opvragen via Replicate-support (of enterprise) zodra volume groeit; tot dan is de blootstelling beperkt door opt-in + 1-uurs-retentie + geen accountdata in de calls (alleen de foto zelf). |

## 5. Transactionele e-mail

**Status: VASTGESTELD door owner 2026-09-06** (delegatie-besluit; open velden blijven "in te vullen").

| Veld | Inhoud |
|------|--------|
| Doel | Verzenden van dienst-e-mails: verificatie, wachtwoord-reset, uitnodigingen/shares, dienstmededelingen. |
| Categorieën betrokkenen | Gebruikers; ontvangers van uitnodigingen (e-mailadres door gebruiker aangeleverd). |
| Categorieën data | E-mailadres, naam (indien in bericht), bericht-metadata (verzendstatus, tijdstempel). |
| Ontvangers / sub-verwerkers | Resend (e-mailverzending). |
| Doorgifte buiten EU | Resend (VS) — waarborg SCC/DPF (te bevestigen). |
| Bewaartermijn | Verzendlogs conform Resend-retentie (te verifiëren; in te vullen). |
| Beveiligingsmaatregelen | TLS, API-key-beheer server-side, geen e-mailinhoud in applicatielogs. |

## 6. Product-analytics (PostHog EU)

**Status: VASTGESTELD door owner 2026-09-06** (delegatie-besluit; open velden blijven "in te vullen").

| Veld | Inhoud |
|------|--------|
| Doel | First-party productstatistiek: accountgroei en signup-methode; (client-analytics uitsluitend na cookie-consent). |
| Categorieën betrokkenen | Geregistreerde gebruikers. |
| Categorieën data | **Server-side signup-events** (`user_signed_up`): pseudonieme Supabase-uid, tijdstempel, signup-methode — **plus, per owner-keuze 2026-09-05, `display_name` als person-property `name`** (signup-flows + eenmalige backfill van 215 users). Daarmee bevat PostHog direct identificerende persoonsgegevens (naam), niet enkel pseudoniemen. Géén e-mail/IP/device-data/cookies in de server-side flow (zie LEG-012). |
| Ontvangers / sub-verwerkers | PostHog (EU-hosting). |
| Doorgifte buiten EU | Geen (EU-cloud); te bevestigen dat support-/sub-processing-keten EU-only blijft. |
| Bewaartermijn | PostHog-retentie-instelling (in te vullen); person-record incl. naam wissen bij accountverwijdering (delete-person — actie uit LEG-012). |
| Beveiligingsmaatregelen | Server-side capture zonder cookies; grondslag gerechtvaardigd belang — **LIA vastgelegd en vastgesteld 2026-09-06** (`records/LIA-posthog-signup-analytics.md`); person-delete bij accountverwijdering doorgevoerd 2026-09-06 én actief (envs `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` in Vercel gezet + redeploy, 06-09); toegangsbeperking PostHog-project. |

## 7. Social-/WhatsApp-kanaal (Meta)

**Status: VASTGESTELD door owner 2026-09-06** (delegatie-besluit; open velden blijven "in te vullen").

| Veld | Inhoud |
|------|--------|
| Doel | **Gepreciseerd 2026-09-06:** (a) het KEP-productkanaal — gebruikers sturen herinneringen (foto's/berichten) via WhatsApp in; de app routeert die (AI-routing consent-gated) naar hun paleis (kep-capture-router/auto-route); (b) social-aanwezigheid/marketing via Meta-kanalen. |
| Categorieën betrokkenen | Gebruikers/geïnteresseerden die via het kanaal contact opnemen of content ontvangen. |
| Categorieën data | Telefoonnummer/handle, berichtinhoud, gedeelde media. |
| Ontvangers / sub-verwerkers | Meta Platforms (WhatsApp Business / social). |
| Doorgifte buiten EU | Meta (VS) — waarborg SCC/DPF (te bevestigen). |
| Bewaartermijn | In te vullen. |
| Beveiligingsmaatregelen | Geen accountdata of media uit het product via dit kanaal delen zonder expliciete gebruikersactie; toegangsbeheer op business-account. |

---

## Bijlage — sub-verwerkersoverzicht (bron: `legal-autonomy/config.json`)

Supabase · Cloudflare R2 · Stripe · Replicate · Anthropic · OpenAI · Resend · PostHog (EU) · Meta/WhatsApp · Apple (iOS Merchant-of-Record + App Store Server Notifications — kwalificatie MoR vs. verwerker nog te bevestigen, LEG-014).

## Openstaand vóór volledige vaststelling
1. Controller-blok compleet maken: entiteit, ondernemingsnummer, adres (LEG-001).
2. Bewaartermijnen invullen (billing, backups, e-maillogs, PostHog, AI-vendor-retentie).
3. SCC/DPF-status per VS-ontvanger verifiëren; Apple-MoR-kwalificatie (LEG-014).
4. Art. 9-kwalificatie gezondheids-/genealogiedata (LEG-006) en gelijkenis/biometrie bij AI (LEG-004).
5. Meta/WhatsApp-inzet preciseren of entry schrappen indien kanaal niet actief is.

---

_Onder voorbehoud van toetsing door gekwalificeerde raadsman._
