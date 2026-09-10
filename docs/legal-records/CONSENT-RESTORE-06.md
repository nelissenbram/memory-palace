# Consent-record ingezonden foto's — RESTORE-06 "You Sent This One"

_Concept 2026-09-10 (opgesteld door Claude namens owner, ter review door de raadsman —
géén juridisch advies). Vereist door de LEG-023-poort op RESTORE-06: alleen bouwen/
publiceren mét een vastgelegd schriftelijk consent-record van de inzender; "met
toestemming" in de comments is niet genoeg._

## 1 · Werkwijze (verplichte volgorde)

1. Iemand plaatst een beschadigde foto onder een post (de pinned-comment-loop).
2. **Vóór** enige restore of build: stuur de inzender per DM de consenttekst (§2).
3. Wacht op het letterlijke antwoord **"I AGREE"** (of "AKKOORD" bij de NL-tekst).
4. Screenshot het volledige DM-gesprek (vraag + antwoord + datum + handle zichtbaar)
   en bewaar het als `socials-kit/consents/<platform>-<handle>-<YYYY-MM-DD>.png`
   (map is gitignored — media/PII blijft buiten git).
5. Vul een registerregel in (§4) in dít bestand en sync de kopie in
   `docs/legal-records/` mee (LEG-019).
6. Pas dán mag de clip gebouwd en gepubliceerd worden.

Huisregels (hard):
- **Nooit gebruikersgezichten in marketing zonder dit record** — ook niet "even snel".
- **Geen herkenbare minderjarigen** in ingezonden marketingfoto's, ook niet met
  consent van de inzender.
- Intrekking (DM of privacy@thememorypalace.ai) → toekomstig gebruik stopt direct;
  reeds gepubliceerde posts waar redelijkerwijs mogelijk verwijderen; registerregel
  bijwerken met intrekkingsdatum.

## 2 · DM-consenttekst (EN — primair, kanalen zijn Engelstalig)

> Hi @{handle}! Thanks for sharing your photo under our post. Before I restore it
> and feature it in a Memory Palace video, I need your written OK on the following:
>
> 1. You own this photo or have permission from its rightful owner to share it —
>    including from any living people shown in it.
> 2. We restore it with AI. Our provider (Replicate) processes the image, and
>    restored faces are AI-reconstructed, so they can differ slightly from the
>    original.
> 3. The Memory Palace may show the original, the restored version, your public
>    username and a screenshot of your comment in its marketing videos and posts,
>    on its social channels and website, worldwide.
> 4. The restore is free and the restored photo is yours to keep. There is no
>    other payment or compensation.
> 5. You can withdraw your permission for future use at any time via DM or
>    privacy@thememorypalace.ai. Already-published posts will be taken down where
>    reasonably possible. Our privacy policy: thememorypalace.ai/privacy
>
> Reply **"I AGREE"** to confirm — we keep this conversation as the consent record.

## 3 · DM-consenttekst (NL — voor Nederlandstalige inzenders)

> Hoi @{handle}! Dank om je foto onder onze post te delen. Voor ik hem herstel en
> in een Memory Palace-video gebruik, heb ik je schriftelijke akkoord nodig op het
> volgende:
>
> 1. De foto is van jou, of je hebt toestemming van de rechtmatige eigenaar om hem
>    te delen — ook van eventuele levende personen op de foto.
> 2. We herstellen hem met AI. Onze verwerker (Replicate) verwerkt het beeld, en
>    herstelde gezichten zijn AI-reconstructies die licht kunnen afwijken van het
>    origineel.
> 3. The Memory Palace mag het origineel, de herstelde versie, je publieke
>    gebruikersnaam en een screenshot van je comment tonen in marketingvideo's en
>    -posts, op onze socialekanalen en website, wereldwijd.
> 4. De restore is gratis en de herstelde foto is voor jou. Er is geen andere
>    betaling of vergoeding.
> 5. Je kunt je toestemming voor toekomstig gebruik altijd intrekken via DM of
>    privacy@thememorypalace.ai. Al gepubliceerde posts halen we waar redelijkerwijs
>    mogelijk offline. Privacybeleid: thememorypalace.ai/privacy
>
> Antwoord **"AKKOORD"** om te bevestigen — we bewaren dit gesprek als consent-record.

## 4 · Register (één regel per consent — nieuwste bovenaan)

| Datum consent | Handle | Platform | Naam (indien bekend) | Scope | Bewijs (screenshot-pad) | Foto-bestand(en) | Gepubliceerd in | Ingetrokken |
|---|---|---|---|---|---|---|---|---|
| _nog geen_ | | | | RESTORE-06: foto + AI-restore + handle/comment in marketing | | | | |

## 5 · AVG-kanttekeningen (voor de raadsman)

- Grondslag: toestemming (art. 6(1)(a)); de DM-tekst is tevens de informatieplicht
  in het kort, met verwijzing naar het privacybeleid voor het volledige verhaal.
- Verwerking door Replicate (VS) valt onder de bestaande sub-verwerkers-inventaris
  (LEG-021-nuance is al live in de privacy-copy).
- Het consent-screenshot bevat PII (handle, gespreksinhoud) → bewust gitignored;
  alleen dit register (handle + datum + paden) wordt geversioneerd.
- Open vraag aan raadsman: volstaat "I AGREE" per DM als bewijs van ondubbelzinnige
  toestemming voor beeldgebruik van derden-op-de-foto (inzender verklaart namens hen),
  of is een aanvullende verklaring per afgebeelde persoon nodig?
