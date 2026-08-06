# EXTERIOR FANTASY CONCEPTS — "Toscaanse fantasie-paleizen"

**MUSEO VIVO · WS3 (exterior) · concept-ronde vóór uitvoering — 2026-08-06**

> Owner-vraag: *"graag veel verder / gewaagder durven denken — eerst wat 'Toscaanse
> fantasie-paleizen' schetsen delen alvorens uit te voeren."*

Vier duidelijk verschillende, gewaagde richtingen. Alle vier respecteren de canon:
warm plaster/travertijn/ink/goud, **één** gouden-uur-zon (laag ZW, de dolly vliegt
erin), geen nieuwe dynamische lichten, mobiel-budget ≤150 draw calls (instancing +
`mergeGeometries` zijn al live in de scene), en de exterior heeft één doel: **de
monumentale entree** — de dolly eindigt bij de ene deur, met de naam-op-tympaan-beat
op ~7,5s. Draw-call-schattingen zijn gebaseerd op de huidige `ExteriorScene.tsx`
(gedeeld `M.*`-materiaalwoordenboek, W2-koepel-op-tamboer apex ~29m, monumentale
trap, geïnstancede cipressen, gemergde veld-buckets).

Geen Disney: alle vier zijn opgeschaalde, licht-onwerkelijke versies van dingen die
in Toscane/Lazio écht bestaan (Sacro Monte, San Gimignano, Villa Lante, Pienza).

---

## Concept 1 — LA SCALA DEL CIELO
*Het paleis staat niet óp de heuvel — de heuvel is zelf een trap van honderd meter
naar de ene deur.*

### Silhouet (front-elevatie)

```
                           ♦
                         _/|\_
                        /KOEPEL\
                    ___|~~~~~~~|___
                   |▯▯▯|tamboer|▯▯▯|
                ___|___|_______|___|___
     ^         | ▯  ▯ [ NAAM ]  ▯  ▯ |         ^
     ^      ___|______[  ∏∏  ]_______|___      ^
     ^     |==  L O G G I A - T E R R A S  ==|     ^
     ^   __|/===============================\|__   ^
     ^  |==      T W E E D E   T E R R A S    ==|  ^
   __^__|/=====================================\|__^__
  |==        O N D E R S T E   T E R R A S        ==|
~~/ / / / / /   scala — 100 m cascade   \ \ \ \ \ \~~
```
*(^ = cipres-paren die elke bordes-rand markeren)*

### Beeld
De huidige villa blijft vrijwel intact, maar wordt op een **Sacro Monte** gezet:
drie brede travertijn-terrassen die als reuzentreden uit de helling groeien, elk
met een balustrade-rand en een cipres-paar op de hoeken, verbonden door één
axiale trap die van 100m ver beneden begint en per terras versmalt — het paleis
"perst" de bezoeker naar die ene deur. De bestaande monumentale trap wordt de
bovenste, laatste vlucht. Op golden hour strijkt de lage ZW-zon **dwars over de
treden**: elke stootrand werpt een lange slagschaduw, zodat de hele cascade als
een gestreepte gouden ladder leest — het silhouet is een piramide met de koepel
als top. De 18s-dolly begint laag bij de voet van de scala (contre-jour door de
cipres-paren), klimt de as op terwijl terras na terras zich boven de vorige
uitvouwt, vangt op 7,5s het tympaan met de naam precies boven de trap-as, en
daalt dan de laatste vlucht af naar de deur — de camera "beklimt" letterlijk het
gebouw. De vleugels blijven op het bovenste plateau staan, half achter de
loggia-borstweringen, waardoor het paleis breder en geworteld oogt.

### Signature-move
**De trap ís de berg.** Geen paleis met een trap ervoor, maar één continue
steen-cascade van 100m waar landschap en architectuur niet te scheiden zijn — en
de naam-beat gebeurt exact op de as ervan.

### Haalbaarheid
- **Draw calls:** terrassen = grote boxen, gemergd per materiaal (`M.marble`,
  `M.trim`, `M.stoneD`) → ~8; balusters als 1 InstancedMesh → 1-2; extra
  trap-treden mergen in de bestaande stair-batch → +1; cipres-paren liften mee op
  de bestaande W2-instancing-buckets → +0. **Netto +12-18 calls.**
- **Risico's:** terrein (`getHeightAt`) moet de terrassen volgen (collision +
  paden opnieuw leggen); wing-forecourt-clearances (de cap-op-15-breedte-les van
  de huidige trap) gelden per terras; dolly-waypoints herschrijven (klim i.p.v.
  orbit) maar zelfde Catmull-Rom-machinerie.
- **Hergebruik huidige scene: ~75%** — koepel/tamboer/tympaan/portico/vleugels/
  landschap blijven; forecourt en heuvelprofiel gaan op de schop.
- **Score: 4/5**

---

## Concept 2 — LE SETTE SORELLE
*Een San Gimignano-familie van zeven slanke torens omringt de koepel als kaarsen
om een reliekschrijn — elke toren draagt één verlicht venster.*

### Silhouet (front-elevatie)

```
                █                      █
          █     █        _♦_          █     █
          █     █       /KOEPEL\      █     █
     █    █     █    __|~~~~~~~|__    █     █    █
     █    █▯    █▯  |▯▯ tamboer ▯▯|  ▯█    ▯█    █
     █▯   █     █   |▯  ▯  ▯  ▯  ▯|   █     █   ▯█
     █    █     █___|_____________|___█     █    █
     █    █    |  ▯  ▯ [ NAAM ] ▯  ▯ |█     █    █
     █    █____|______ [  ∏∏  ]______|█_____█    █
     █   |=====        DEUR          =====|      █
   __█___|================================|______█__
  |============ voorplein-arcade ==================|
 ^^  ~ ~ ~ ~ ~ ~  cipres-voorhof  ~ ~ ~ ~ ~ ~  ^^
```

### Beeld
Het bestaande centrale blok met koepel blijft het hart, maar eromheen rijst een
**familie van zeven torens** in drie hoogtes (twee van ~34m die de koepel flankeren
en er nét bovenuit steken, dan paren van ~26m en ~18m die naar buiten toe
aftrappen) — het middeleeuwse Toscane van San Gimignano gekruist met de
renaissance-villa die er al staat. Elke toren is sober: glad plaster
(`M.stone`-familie), een pietra-serena-band, een laag tentdak van coppo-tegels,
en **één hoog venster met warme gloed** — zeven stille wachters, elk (verhaal voor
de owner) een vleugel/hoofdstuk van het leven dat hier bewaard wordt. De entree
wint aan kracht doordat de twee hoogste zusters de tympaan-gevel inkaderen als
een poortgebouw. Op golden hour doet dit silhouet precies wat San Gimignano doet:
de ZW-zon zet de westflanken van alle zeven torens in vuur terwijl de oostflanken
in koele schaduw vallen — een ritme van goud/ink/goud/ink over de hele breedte,
en lange torenschaduwen strijken over het voorplein. De dolly wordt spectaculair
zonder één waypoint-truc extra: in de openingsswing schuiven de torens als
coulissen langs elkaar (parallax!), op 7,5s staat de naam precies in het kader
tussen de twee grote zusters, en in de afdaling sluiten de torens zich achter de
camera tot alleen de deur overblijft.

### Signature-move
**De torenfamilie als coulissen-parallax.** Zeven verticalen die tijdens de dolly
langs elkaar schuiven geven het 18s-shot een diepte die geen enkele gevel-detail
kan evenaren — en het silhouet is vanaf elke afstand herkenbaar als "mijn paleis".

### Haalbaarheid
- **Draw calls:** de goedkoopste van de vier. 7 torens × (cilinder-schacht + 2
  banden + tentdak) mergen per materiaal → ~5; de zeven gloeivensters delen
  `M.win` → 1 gemergde call; finials in de bestaande gold-batch → +1.
  **Netto +7-12 calls.** Geen nieuwe lichten: de vensters zijn puur emissive
  (canon: `M.win` emissive .16).
- **Risico's:** torens mogen de wing-klik-anchors en de tap-is-travel-raycast
  niet afdekken (torens buiten `entrClickRadius` 12 houden); schaduw-frustum
  (±58) omvat de buitenste torens nét — checken; silhouet-balans vraagt 1-2
  iteraties zodat de koepel dominant blijft (dogma: de koepel wint).
- **Hergebruik huidige scene: ~85%** — alles blijft staan; torens zijn additief.
- **Score: 5/5**

---

## Concept 3 — LO SPECCHIO D'ORO
*Villa Lante uitvergroot: een 200m-lange waterspiegel als voorhof, en het paleis
bestaat twee keer — één keer in steen, één keer in gesmolten goud.*

### Silhouet (front-elevatie, mét spiegelbeeld)

```
                          _♦_
                        /KOEPEL\
                    ___|~~~~~~~|___
               ____|▯▯  tamboer  ▯▯|____
              | ▯  ▯   [ NAAM ]   ▯  ▯ |
         _____|________[  ∏∏  ]________|_____
        |  loggia  ====  DEUR  ====  loggia |
   ^    |__________|===========|____________|    ^
 ~~~~~~~~~~~~~~~~~~| causeway  |~~~~~~~~~~~~~~~~~~~
 ~  ~   ~   ~   ~  |  200 m    |  ~   ~   ~   ~  ~
 ~   .  ' spiegelbeeld: paleis ondersteboven '  . ~
 ~ ~  . ` ~  . ~ (_/KOEPEL-echo\_) ~ . ` ~  . ~ ~ ~
```
*(onderste vier regels = het watervlak met de gouden reflectie)*

### Beeld
Het hele voorterrein tussen aankomst en trap wordt één **rechthoekige
waterspiegel** — een peschiera zoals Villa Lante of het Boboli-bekken, maar
uitgerekt tot 200m. Eén travertijn-causeway van 6m breed loopt exact over de as,
geflankeerd door lage bronzen vuurschalen-sokkels (zonder vuur — de zon doet het
werk) en om de 25m een cipres-paar dat zich in het water verdubbelt. Het paleis
zelf blijft de huidige W2-massing (trap → parapet → tamboer → koepel), maar
staat nu op een podium dat uit het water oprijst. Het gouden uur is hier geen
decor maar het mechanisme: de lage ZW-zon legt een **brandende lichtbaan over het
water die precies naar de deur wijst**, en het complete silhouet — koepel incluis —
staat ondersteboven in het bekken. De dolly opent extreem laag, centimeters boven
het wateroppervlak, zodat het frame voor de helft uit de gespiegelde gouden villa
bestaat; bij de klim naar de tympaan-beat "richt" het paleis zich op uit zijn
eigen reflectie, en de afdaling volgt de causeway tussen de twee werelden door
naar de deur. Licht-onwerkelijk, want geen villa heeft een bekken van deze maat —
maar elk ingrediënt is puur Toscaans.

### Signature-move
**De omgekeerde villa in het water tijdens de eerste 4 dolly-seconden.** De helft
van het openingsframe is reflectie — geen enkele memory-app opent zo.

### Haalbaarheid
- **Draw calls:** watervlak = 1 call (bestaand `M.water`, W1-retoned). MAAR: een
  echte planar reflection (three.js `Reflector`) = een tweede render-pass van de
  hele scene → **verboden op mobiel-budget**. De canon-oplossing: een
  **low-poly spiegel-proxy** — ~15 grove boxen/cilinders (koepel, tamboer, blok,
  vleugelmassa's) geïnverteerd onder het watervlak, gemergd per materiaal met een
  goud-getinte, halfdoorzichtige variant → ~4-6 calls; het wateroppervlak eroverheen
  met hoge `envMapIntensity` verkoopt de illusie. Causeway + sokkels gemergd → ~4.
  **Netto +10-16 calls** (desktop kan optioneel wél `Reflector` krijgen, tier-gated).
- **Risico's:** de proxy-illusie is het hele concept — als die niet overtuigt op
  een oude iPad valt het beeld weg (vroeg prototypen!); waterlijn vs.
  `getHeightAt`/heuvelprofiel; de bestaande fontein/paden/veld-buckets in de
  voorhof verdwijnen (verwijder-werk, geen bouw-werk); dolly-waypoint 1 moet
  onder de huidige min-phi-clamp door kunnen.
- **Hergebruik huidige scene: ~80%** — paleis 100% intact; alleen de voorhof
  wordt vervangen door water + causeway.
- **Score: 3/5**

---

## Concept 4 — IL CRINALE
*Het paleis is niet op de heuvelrug gebouwd — het is de heuvelrug: een Pienza-achtige
boog-substructie draagt de villa, en de ene deur zit in een reuzennis in de rots.*

### Silhouet (front-elevatie)

```
                                _♦_
                              /KOEPEL\
                          ___|~~~~~~~|___
                     ____|▯▯  tamboer  ▯▯|____
                ____| ▯   ▯  [ NAAM ]  ▯   ▯ |____
           ____|      loggia  [  ∏∏  ]  loggia   |
      ____|  (∩)  (∩)  (∩)   _______   (∩)  (∩)  |____
  ___|      (∩)  (∩)  (∩)   / GROTE \   (∩)  (∩)     |___
 |  heuvel    (∩)  (∩)     |  BOOG-  |     (∩)   rots    |
 |___ olijf-terras ___/    |NIS+DEUR |    \___ olijf- ___|
      \____ rots ____/     |_________|     \_ terras _/
  ~ ^ ~  ~ ^ ~ ~ ^ ~ // holle weg omhoog \\ ~ ^ ~ ~ ^ ~
```
*((∩) = de boog-substructie; de deur zit ín de centrale reuzenboog)*

### Beeld
Denk aan Pienza vanaf de Val d'Orcia: een stad die op een **gemetselde substructie
van bogen** uit de klif groeit. Hier wordt dat één gebouw: de villa-massing
(huidige koepel, tamboer, tympaan) kroont een 12m hoge boog-arcade van warm
plaster en travertijn die de hele heuvelrug-breedte overspant — twintig bogen,
waarvan de middelste is uitvergroot tot een **reuzennis van 10m hoog** waarin de
ene deur staat, klein en heilig onder al die massa. De asymmetrie is de charme:
links loopt de substructie uit in ruwe rots met olijfterrassen, rechts trapt de
massing af in loggia's — het gebouw "verweert" naar landschap aan beide zijden,
alsof het er al vijfhonderd jaar staat en uit de berg is gegroeid. Golden hour:
de lage zon schiet **dwars door de arcade** en zet elke boog-dagkant in vuur
terwijl de nissen zelf ink-donker blijven — een rij gouden halve manen over de
hele klif, en de reuzennis wordt vanzelf het donkerste, meest magnetische punt.
De dolly nadert laag over de velden, klimt schuin langs de klif zodat de arcade
als een ribbenkast voorbij strijkt, vangt op 7,5s de naam op het tympaan hoog
boven de nis, en daalt dan ín de reuzenboog af — het laatste shot is de deur,
omarmd door 12m steen.

### Signature-move
**De reuzennis:** de ene deur niet bovenop een trap, maar onderin een boog van
kathedraal-formaat — nederigheid en monumentaliteit in hetzelfde beeld, en de
arcade-contre-jour is het mooiste dat één gouden-uur-zon gratis kan geven.

### Haalbaarheid
- **Draw calls:** arcade = 1 boog-geometrie als **InstancedMesh** (~20 instances)
  → 1-2 calls; substructie-wand + reuzennis gemergd (`M.stone`/`M.stoneD`) → ~5;
  rots-uitlopers hergebruiken de bestaande rocky-hills-geometrie → ~3;
  olijfterrassen liften op de veld-buckets → +2. **Netto +12-20 calls.**
- **Risico's:** de grootste ingreep van de vier — heuvelprofiel/`getHeightAt`,
  paden, wing-plaatsing én de entree-overgang (deur zit nu ~12m lager t.o.v. de
  villa-vloer: de EntranceHall-overgang heeft een verhaal nodig, bv. fade in de
  boognis) moeten allemaal opnieuw; de huidige monumentale trap en het
  parterre-voorplein vervallen; dolly volledig her-authoren; asymmetrie is
  moeilijker te balanceren dan symmetrie (meer art-direction-iteraties).
- **Hergebruik huidige scene: ~55-60%** — koepel/tamboer/tympaan/materialen/
  landschaps-systemen blijven, maar forecourt, trap, terrein en entree-sequens
  gaan om.
- **Score: 3/5**

---

## Vergelijking & advies

| # | Concept | Signature | Δ draw calls | Hergebruik | Score |
|---|---------|-----------|-------------|-----------|-------|
| 1 | La Scala del Cielo | de trap ís de berg | +12-18 | ~75% | **4/5** |
| 2 | Le Sette Sorelle | torenfamilie-parallax | +7-12 | ~85% | **5/5** |
| 3 | Lo Specchio d'Oro | omgekeerde villa in goud-water | +10-16 | ~80% | **3/5** |
| 4 | Il Crinale | reuzennis in boog-substructie | +12-20 | ~55-60% | **3/5** |

**Advies van de art-director:** concept 2 (Sette Sorelle) is de beste
risico/impact-verhouding en volledig additief op de huidige W2-scene; concept 1
(Scala del Cielo) is de meest "monumentale entree"-pure keuze en dient de
18s-dolly het sterkst. Combineerbaar: 2 + een lichte versie van 1 (twee
terrassen i.p.v. drie) blijft binnen budget (+~22 calls) en geeft zowel het
silhouet als de aankomst een sprong. 3 en 4 zijn de gewaagdste beelden maar
vragen elk een prototype-week vóór commitment (waterspiegel-proxy resp.
terrein-resculpt).

*Alle concepten: staging-only, geen prod; uitvoering pas na owner-keuze.*
