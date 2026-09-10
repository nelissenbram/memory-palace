# Marketing-media: provenance & licenties (LEG-023)

_Vastgesteld 2026-09-10 (owner-akkoord a+b+c). Bron-registers leven in `socials-kit/`
(gitignored wegens mediagewicht); dit document + de meegecommitte kopie van
`SOURCES.json` zijn de geversioneerde audit-registratie. Ottavia bewaakt de sync._

## 1 · Muziek & geluid

| Werk | Maker | Licentie | Gebruik | Creditplicht |
|------|-------|----------|---------|--------------|
| "Light in Dark Places" | Scott Buckley (scottbuckley.com.au) | **CC BY 4.0** | GRAVE-01a/08a, LEGACY-02a e.a. (4 van 20 geplande rijen) | credit-regel verplicht in élke caption (`Music: '<titel>' by Scott Buckley (scottbuckley.com.au), CC BY 4.0`); Metricool-CSV draagt hem per rij |
| "Amberlight" | Scott Buckley | **CC BY 4.0** | RESTORE-03a, PARENT-05a e.a. (5 van 20) | idem |
| "Penumbra" | Scott Buckley | **CC BY 4.0** | NATIVE-04a e.a. (3 van 20) | idem |
| "This Too Shall Pass" | Scott Buckley | **CC BY 4.0** | GRAVE-04a/05a e.a. (3 van 20) | idem |

Reserves gedownload, zelfde licentie, nog niet in gebruik: Frozen Star, Strength of
the Titans, Ibn Al-Noor, Heroic Age. Bron/ID3 geverifieerd: alle tracks artist=Scott
Buckley (CC-BY 4.0, hele library). Onderlaag alle clips: eigen in-app paleis-ambience.
Alle vier de gebruikte titels staan vermeld op **thememorypalace.ai/credits**.
_Correctie 2026-09-10 (nacheck): eerdere versie van dit record noemde alleen "Light
in Dark Places"; het per-clip-register (`socials-kit/clips/music/MUSIC-CREDITS.txt`)
is leidend._

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
