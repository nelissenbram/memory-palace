# Marketing-media: provenance & licenties (LEG-023)

_Vastgesteld 2026-09-10 (owner-akkoord a+b+c). Bron-registers leven in `socials-kit/`
(gitignored wegens mediagewicht); dit document + de meegecommitte kopie van
`SOURCES.json` zijn de geversioneerde audit-registratie. Ottavia bewaakt de sync._

## 1 · Muziek & geluid

| Werk | Maker | Licentie | Gebruik | Creditplicht |
|------|-------|----------|---------|--------------|
| "Light in Dark Places" (`light-in-dark-places.mp3`) | Scott Buckley (scottbuckley.com.au) | **CC BY 4.0** | ingebakken in alle 32 clips-v2-video's | credit-regel verplicht in élke caption: `Music: 'Light in Dark Places' by Scott Buckley (scottbuckley.com.au), CC BY 4.0` (zit in alle geplande captions; Metricool-CSV voegt hem automatisch toe) |

Geen andere muziek of SFX in gebruik. Canonregel (config `musicPolicy`): alleen
reeds-gecleared CC-BY met credits; geen nieuwe downloads zonder licentiecheck.

## 2 · Foto-bronnen restore-marketing (PD-archief)

Volledig register: [`MARKETING-SOURCES-RESTORE.json`](MARKETING-SOURCES-RESTORE.json)
(gecommitte kopie van `socials-kit/restore-src/SOURCES.json`) — per foto: bestand,
titel, **licentie (Public domain, Wikimedia Commons)**, credit, bronlink, resolutie.
Huisregel gerespecteerd: **nooit door gebruikers herstelde gezichten** in marketing;
uitsluitend PD-archief en (toekomstig) AI-persona's.

## 3 · Gesimuleerde before/after-beats (UCPD-borging)

De `rp-*`-beats (`build-restore-pairs.mjs`) zijn **gesimuleerd**: een PD-origineel
wordt met ffmpeg-filters verouderd; de "restauratie" is het onaangetaste origineel.
Best-case-weergave van een echte capability, géén vastgelegde productoutput.

Borging (uitgevoerd 10-09):
- **In-container metadata** op alle vier bestaande beats (rp-couple/fade/lane/wedding)
  én in de pipeline voor alle toekomstige: `comment="SIMULATED DEMO …"` +
  `digital_source_type=compositeSynthetic` (ffprobe-verifieerbaar).
- **Caption-regel (HARD):** elke post die sim-materiaal bevat draagt zichtbaar
  "Simulated demo" (of gelijkwaardig) in caption of beeld.
- **Claims-regel (HARD):** geen prijs-/tijd-/kwaliteitsclaims (bv. "€0,002 per
  restore", "in 31 s") tenzij gemeten en gedocumenteerd; ongemeten claims worden
  geschrapt vóór publicatie.

## 4 · AI-gegenereerde gezichten (AI-Act art. 50(2))

Voor élk toekomstig asset met Flux-/AI-persona's of AI-gerestaureerde portretten:
machine-leesbare markering `digital_source_type=trainedAlgorithmicMedia` in de
container (video) of IPTC/XMP (stills, zelfde idioom als in-app `sharp().withXmp()`),
plus platform-AI-label bij publicatie. Op 10-09 stond er nog géén persona-footage op
schijf; de verplichting geldt vanaf de eerste build (briefing clip-flow bijgewerkt).
Deadline-context: art. 50(2) van kracht 2 dec 2026.
