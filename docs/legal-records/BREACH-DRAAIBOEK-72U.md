# 72-uurs datalek-draaiboek — The Memory Palace

_Status: **VASTGESTELD door owner 2026-09-06** (delegatie-besluit) · versie 2026-09-06 · controller: Belgische eenmansonderneming · toezichthouder: Gegevensbeschermingsautoriteit (GBA/APD), Brussel_

> Dit draaiboek bereidt voor en structureert. Het is géén juridisch advies; bij twijfel over meldplicht of kwalificatie: gekwalificeerde (EU/BE) raadsman raadplegen — maar **laat de 72u-klok daar nooit op wachten**.

## Gevoelige context — waarom bij ons sneller "hoog risico"
The Memory Palace verwerkt familie-foto's en -verhalen, genealogie, **mogelijk minderjarigen**, **overledenen** en **AI-verwerkte gezichten** (restore/bust). Een lek van media of verhalen raakt daardoor al snel de persoonlijke levenssfeer van kwetsbare betrokkenen en van derden die zelf geen account hebben. Uitgangspunt: bij twijfel over de risico-inschatting **opschalen**, niet afschalen.

---

## 1. Detectie & triage — wat telt als inbreuk (art. 4(12) AVG)

Een **inbreuk in verband met persoonsgegevens** is elke beveiligingsinbreuk die leidt tot vernietiging, verlies, wijziging, of ongeoorloofde verstrekking van of toegang tot persoonsgegevens. Drie types:
- **Confidentialiteit** — ongeoorloofde toegang/verstrekking (bv. verkeerde share-autorisatie, gelekte service-key, R2-bucket publiek, PostHog-project open).
- **Integriteit** — ongeoorloofde wijziging (bv. memories van een ander account overschreven).
- **Beschikbaarheid** — verlies/vernietiging zonder herstelbare backup (ook ransomware).

**Wel triggeren (voorbeelden bij ons):** autorisatie-bug die media van anderen toont; gelekte Supabase service-role-key of R2-credentials; e-maillijst uitgelekt via Resend; AI-vendor-incident met onze aangeleverde foto's; verloren laptop met productie-toegang; webhook-endpoint dat data accepteert zonder verificatie én misbruikt is.
**Geen inbreuk (wel loggen):** geblokkeerde aanvalspoging zonder toegang; bug zonder persoonsgegevens; downtime met intacte data en backup.

**Triage binnen 4 uur na signaal:** (1) is het een beveiligingsinbreuk? (2) zijn er persoonsgegevens geraakt? (3) loopt het nog — zo ja, eerst **stoppen/indammen** (key roteren, endpoint dicht, share revoken). Alles in het incident-logboek (§8), ook een "vals alarm".

## 2. Rollen (eenmansbedrijf)

| Rol | Wie | Doet |
|-----|-----|------|
| **Beslisser & melder** | Owner (Bram) | Elk besluit: melden ja/nee, communicatie, externe hulp. Enige die meldt of communiceert. |
| **Voorbereiders** | AI-chiefs (legal + ops) | Feiten verzamelen, tijdlijn, aantallen-query's (read-only), concept-melding en concept-communicatie invullen, risico-analyse voorleggen. **Nooit** zelf melden, publiceren of betrokkenen contacteren. |
| Externe schil (indien nodig) | Raadsman · Supabase/Cloudflare/vendor-support | Juridische duiding · forensics/containment op platformniveau. |

## 3. Beoordelingskader risico (art. 33/34)

| Uitkomst | Criterium | Actie |
|----------|-----------|-------|
| **Geen melding** | Inbreuk, maar **waarschijnlijk geen risico** voor betrokkenen (bv. gelekte data was versleuteld met niet-gecompromitteerde sleutel; verkeerd verzonden mail direct en aantoonbaar gewist). | Alleen intern documenteren (art. 33(5)) — verplicht, met motivering. |
| **Melden aan GBA** | Enig risico aannemelijk (default bij ons). | Melding binnen 72u (§4-5). |
| **Óók betrokkenen informeren** | **Waarschijnlijk hoog risico** (art. 34): media/verhalen van gezinnen ingezien, gezichtsfoto's of AI-gezichtsdata gelekt, minderjarigen geraakt, wachtwoord-hashes + e-mails samen, identiteitsfraude-potentieel. | Zonder onnodige vertraging, in duidelijke taal (§6). Uitzonderingen art. 34(3) — o.a. adequate encryptie — alleen na expliciete afweging. |

Wegingsfactoren (ENISA/EDPB-lijn): aard/gevoeligheid data (foto's van gezichten, kinderen, overledenen = zwaar), volume, identificeerbaarheid, gevolgen (reputatie, distress, fraude), kwetsbaarheid betrokkenen, duur van de blootstelling.

## 4. De 72-uurs-klok
- **Start: bij kennisname** — het moment waarop de owner (of een systeem/agent namens hem) redelijkerwijs zekerheid heeft dát er een inbreuk is. Niet pas na volledige analyse.
- Weekend/vakantie telt gewoon mee.
- Nog niet alles bekend na 72u? **Meld in fasen** (art. 33(4)): eerste melding met wat vaststaat + aanvulling later. Te laat melden vergt motivering — vermijd dat.
- Ankerpunten: T+4u triage klaar · T+24u concept-melding klaar · T+48u besluit owner · T+72u melding ingediend (indien meldplichtig).

## 5. Meldkanaal GBA
- **Online meldformulier datalekken** van de GBA via het portaal op **www.gegevensbeschermingsautoriteit.be** (rubriek "Acties ondernemen" → melding gegevenslek / notification de fuite de données). URL en formulier-versie op het moment zelf verifiëren op de site — niet blind uit dit document overnemen.
- Melding gebeurt **uitsluitend door de owner** (guardrail: geen autonoom toezichthouder-contact).
- Bewaar het ingediende formulier (PDF/kopie) + ontvangstbevestiging + dossiernummer in `legal-autonomy/records/incidenten/`.

## 6. Meld-template GBA (invulbaar — art. 33(3))

```
1. MELDER / CONTACTPUNT
   Verantwoordelijke: [entiteit + ondernemingsnr + adres — zie ART30-REGISTER kop]
   Contactpunt: Bram Nelissen, bram@elyphont.com, [tel]
   (Geen DPO aangesteld.)

2. AARD VAN DE INBREUK
   Type: [confidentialiteit / integriteit / beschikbaarheid]
   Wat is er gebeurd: [feitelijk, chronologisch, 5-10 zinnen]
   Ontdekt op: [datum+tijd kennisname] — via: [monitoring / gebruiker / vendor / ...]
   Periode van blootstelling: [van - tot / onbekend]
   Loopt de inbreuk nog: [ja/nee — containment: ...]

3. CATEGORIEËN DATA
   [ ] accountdata (e-mail, naam)   [ ] wachtwoord-hashes
   [ ] familie-media (foto/video/audio)   [ ] verhalen/genealogie
   [ ] AI-verwerkte gezichtsdata (restore/bust)   [ ] abonnements-/betaalreferenties
   [ ] analytics (uid + naam)   [ ] anders: ...

4. CATEGORIEËN & AANTALLEN BETROKKENEN
   Categorieën: [gebruikers / afgebeelde derden / minderjarigen (mogelijk) / overledenen*]
   Aantal betrokkenen: [n / schatting / "nog onbekend, volgt"]
   Aantal records: [n / schatting]
   (*overledenen: buiten AVG-bereik, wel meenemen in impact op nabestaanden)

5. WAARSCHIJNLIJKE GEVOLGEN
   [privacy-schending / distress / reputatie / fraude-potentieel / ...]

6. GENOMEN & VOORGENOMEN MAATREGELEN
   Containment: [key-rotatie / endpoint dicht / shares gerevoked / ...]
   Herstel: [...]  Preventie: [...]
   Betrokkenen geïnformeerd: [ja op datum / gepland / niet — motivering]

7. FASERING
   [volledige melding / eerste melding — aanvulling volgt uiterlijk (datum)]
```

## 7. Communicatie naar gebruikers (art. 34 — indien hoog risico)
- **Eerlijk en feitelijk:** wat er gebeurd is, welke data van hén, wat wij deden, wat zij kunnen doen (wachtwoord wijzigen, alert zijn op phishing), en waar ze terechtkunnen (bram@elyphont.com).
- **Geen juridische kwalificaties** ("geen aansprakelijkheid", "geen inbreuk in de zin van...") en geen bagatelliseren; ook geen speculatie over daders of oorzaken die niet vaststaan.
- Duidelijke taal, in de taal van de gebruiker (5 locales); per e-mail (Resend) aan geraakte accounts; alleen na akkoord owner.
- Gaat het om foto's waarop derden/kinderen staan: benoem dat expliciet, zodat de accounthouder zíjn familie kan informeren.
- Pers/publiek: alleen owner, alleen indien nodig, zelfde feitelijke lijn.

## 8. Incident-logboek-template (art. 33(5) — ook bij niet-melden verplicht)

Per incident een bestand `legal-autonomy/records/incidenten/INC-JJJJ-NN.md`:

```
# INC-[jaar]-[nr] — [korte titel]
Status: [open / gecontained / gesloten]   Meldplichtig: [ja/nee — motivering]
Kennisname: [datum+tijd]   72u-deadline: [datum+tijd]

## Tijdlijn (doorlopend bijwerken, tijden in CET/CEST)
- [tijdstip] — [gebeurtenis / besluit / actie — wie]

## Feiten
[aard, scope, data, betrokkenen, oorzaak]

## Risico-beoordeling
[kader §3 toegepast — uitkomst + motivering, ook bij "geen risico"]

## Besluiten owner
- [datum] — [melden ja/nee / communicatie / ...]

## Melding & communicatie
[GBA-dossiernr, tijdstip indiening / betrokkenen-mail verzonden op ...]

## Nazorg / lessons learned
[structurele fixes, register-/draaiboek-updates]
```

## 9. Vendor-inbreuken (art. 33(2))
Sub-verwerkers (Supabase, Cloudflare R2, Stripe, Replicate, Anthropic, OpenAI, Resend, PostHog, Meta, Apple) moeten óns zonder onredelijke vertraging informeren; **onze** 72u-klok start bij ónze kennisname. Actie bij vendor-melding: direct triage (§1), scope voor onze gebruikers bepalen, zelfde flow. Security-/breach-contactpagina's van de vendors: verzamelen als bijlage (in te vullen).

---

_Onder voorbehoud van toetsing door gekwalificeerde raadsman._
