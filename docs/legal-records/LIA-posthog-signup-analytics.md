# LIA — Server-side signup-analytics naar PostHog (incl. weergavenaam)

_Legitimate Interest Assessment (belangenafweging art. 6(1)(f) AVG) · Opgesteld
2026-09-06 · **VASTGESTELD door owner 2026-09-06** (delegatie-besluit "doe alle
open acties") · Hoort bij register-item **LEG-012**._

## 1. Doel (purpose test)
Bij registratie stuurt de server een `user_signed_up`-event naar PostHog (EU-cloud,
eu.posthog.com) met: pseudoniem account-id (Supabase-uid), registratiemethode
(email/google/apple), tijdstip, platform, en — sinds owner-besluit 2026-09-05
(avond) — de **weergavenaam** als person-property, zodat de owner in het
productdashboard en de dagmail namen ziet in plaats van uids. Doel: first-party
accountstatistiek en product-operatie (activatie/funnel) van een kleinschalige
dienst (~215 accounts). Eenmalige backfill van bestaande accounts uitgevoerd.

**Legitiem belang?** Ja — gerechtvaardigd zakelijk belang bij inzicht in de eigen
dienst; overweging 47 AVG noemt verwerking voor eigen, redelijkerwijs te
verwachten administratieve/analytische doeleinden.

## 2. Noodzaak (necessity test)
- Server-side is nodig: OAuth-signups passeren geen client-consent-flow, en de
  backfill kon alleen server-side. Cookie-consent is niet van toepassing: er
  wordt niets op het toestel gelezen of geplaatst (geen ePrivacy-opslag).
- Dataminimalisatie: géén e-mail, IP, device-data of gedragsprofiel — alleen
  uid, methode, tijdstip, platform en weergavenaam. De naam is functioneel voor
  het doel (herkenbaarheid voor de owner) maar maakt de dataset wél direct
  identificerend; zonder naam zou het doel deels ook bereikt worden — dit is de
  bewuste afweging van de owner (2026-09-05) en verhoogt de zorgplicht (zie §4).

## 3. Afweging (balancing test)
- **Redelijke verwachting:** een gebruiker die een account aanmaakt verwacht dat
  de aanbieder bijhoudt dát en wanneer het account bestaat.
- **Impact:** laag — geen tracking over sites, geen profilering, geen besluiten
  met rechtsgevolg, EU-hosting, toegang beperkt tot de owner (en diens
  AI-agents onder owner-gezag).
- **Bijzondere categorieën:** niet aan de orde in dit event.
- Conclusie: belangen van betrokkenen wegen niet zwaarder dan het belang van de
  owner, mits de waarborgen uit §4 gelden.

## 4. Waarborgen
1. Vermelding in de privacyverklaring (PostHog stond al als verwerker; de
   server-side events + naam-property worden expliciet benoemd — uitvoering
   2026-09-06).
2. **Wissing bij accountverwijdering:** person (incl. naam) wordt bij
   `deleteAccount()` best-effort uit PostHog verwijderd (uitvoering 2026-09-06;
   vereist `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` in de server-env).
3. Geen uitbreiding van de property-set zonder nieuwe afweging (met name geen
   e-mail/IP toevoegen).
   **Aanvulling 2026-09-06 (owner-go "bouw maar"):** twee uitbreidingen
   toegevoegd, beide zonder inhoud van herinneringen en zonder PII-properties:
   (a) client-side `feature_used`- en `checkout_started`-events — uitsluitend
   ná cookie-toestemming (grondslag art. 6(1)(a), buiten deze LIA); (b)
   server-side `purchase_completed` (alleen plan + platform) bij eerste
   activatie van een abonnement — grondslag art. 6(1)(b)/(f), valt onder deze
   LIA en is in de privacyverklaring benoemd. Beide gewist met de person bij
   accountverwijdering.
4. Herzien bij: schaalgroei (>~10k accounts), koppeling met gedragsprofielen, of
   gebruik voor andere doelen dan accountstatistiek.

## 5. Conclusie
Grondslag art. 6(1)(f) is verdedigbaar voor deze verwerking in deze vorm.
_Onder voorbehoud van toetsing door gekwalificeerde raadsman._
