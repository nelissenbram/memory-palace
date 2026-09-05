import { readFileSync, writeFileSync } from "node:fs";

const DATA = {
  en: {
    eyebrow: "The oldest way to remember",
    h2: "The palace in your mind, at last a place you can walk into",
    proposition:
      "For 2,500 years, people have remembered by placing what matters in the rooms of a house they could picture, and you have been doing it your whole life without knowing its name. Rich or humble, near or far, every life has quietly gathered a palace like this, and yours is worth keeping. Here that house becomes real, a place you can walk into, where every photo on the wall keeps the voice, the day, and the story behind it, so it can be touched, not only seen.",
    payoff: "You don't scroll a life. You walk up and touch it.",
    aria: "A woman in warm golden light walking up to the framed photographs on the wall of her memory palace, about to reach out.",
    iconLoci: "Placed in rooms",
    iconEveryone: "Everyone has one",
    iconEnrich: "The voice stays",
  },
  nl: {
    eyebrow: "De oudste manier om te onthouden",
    h2: "Het paleis in je hoofd, eindelijk een plek waar je binnen kunt lopen",
    proposition:
      "Al 2.500 jaar onthouden mensen door te plaatsen wat telt in de kamers van een huis dat ze voor zich kunnen zien, en jij doet het je hele leven al, zonder er een naam voor te kennen. Rijk of eenvoudig, dichtbij of ver weg, elk leven heeft stilletjes zo'n paleis verzameld, en het jouwe is het bewaren waard. Hier wordt dat huis echt, een plek waar je binnen kunt lopen, waar elke foto aan de muur de stem, de dag en het verhaal erachter bewaart, zodat je het kunt aanraken, niet alleen zien.",
    payoff: "Je scrolt geen leven. Je loopt ernaartoe en raakt het aan.",
    aria: "Een vrouw in warm gouden licht die naar de ingelijste foto's aan de muur van haar geheugenpaleis loopt, op het punt om ze aan te raken.",
    iconLoci: "In kamers geplaatst",
    iconEveryone: "Iedereen heeft er een",
    iconEnrich: "De stem blijft",
  },
  de: {
    eyebrow: "Die älteste Art, sich zu erinnern",
    h2: "Der Palast in Ihrem Kopf, endlich ein Ort, den Sie betreten können",
    proposition:
      "Seit 2.500 Jahren erinnern sich Menschen, indem sie das Wichtige in die Räume eines Hauses legen, das sie sich vorstellen können, und Sie tun es Ihr ganzes Leben lang, ohne einen Namen dafür zu kennen. Ob reich oder bescheiden, nah oder fern, jedes Leben hat still einen solchen Palast gesammelt, und Ihrer ist es wert, bewahrt zu werden. Hier wird dieses Haus wirklich, ein Ort, den Sie betreten können, wo jedes Foto an der Wand die Stimme, den Tag und die Geschichte dahinter bewahrt, sodass es berührt werden kann, nicht nur gesehen.",
    payoff: "Man scrollt kein Leben. Man geht hin und berührt es.",
    aria: "Eine Frau in warmem goldenem Licht geht auf die gerahmten Fotos an der Wand ihres Gedächtnispalastes zu und ist im Begriff, sie zu berühren.",
    iconLoci: "In Räume gelegt",
    iconEveryone: "Jeder hat einen",
    iconEnrich: "Die Stimme bleibt",
  },
  es: {
    eyebrow: "La forma más antigua de recordar",
    h2: "El palacio en tu mente, por fin un lugar en el que puedes entrar",
    proposition:
      "Desde hace 2.500 años, las personas recuerdan colocando lo que importa en las habitaciones de una casa que pueden imaginar, y tú llevas haciéndolo toda la vida sin saber su nombre. Humilde o grande, cercana o lejana, cada vida ha reunido en silencio un palacio como este, y el tuyo merece conservarse. Aquí esa casa se hace real, un lugar en el que puedes entrar, donde cada foto de la pared guarda la voz, el día y la historia que hay detrás, para que se pueda tocar, no solo ver.",
    payoff: "No se recorre una vida deslizando. Te acercas y la tocas.",
    aria: "Una mujer bajo una cálida luz dorada se acerca a las fotografías enmarcadas en la pared de su palacio de la memoria, a punto de tocarlas.",
    iconLoci: "Puesto en habitaciones",
    iconEveryone: "Todos tienen uno",
    iconEnrich: "La voz permanece",
  },
  fr: {
    eyebrow: "La plus ancienne façon de se souvenir",
    h2: "Le palais dans votre esprit, enfin un lieu où vous pouvez entrer",
    proposition:
      "Depuis 2 500 ans, les gens se souviennent en plaçant ce qui compte dans les pièces d'une maison qu'ils peuvent imaginer, et vous le faites depuis toujours sans en connaître le nom. Modeste ou riche, proche ou lointaine, chaque vie a rassemblé en silence un palais comme celui-ci, et le vôtre mérite d'être gardé. Ici cette maison devient réelle, un lieu où vous pouvez entrer, où chaque photo au mur garde la voix, le jour et l'histoire qui se cachent derrière, pour qu'on puisse la toucher, et pas seulement la voir.",
    payoff: "On ne fait pas défiler une vie. On s'en approche et on la touche.",
    aria: "Une femme, dans une chaude lumière dorée, s'avance vers les photographies encadrées au mur de son palais de mémoire, sur le point de les toucher.",
    iconLoci: "Placé dans des pièces",
    iconEveryone: "Chacun en a un",
    iconEnrich: "La voix demeure",
  },
};

const DEAD = ["body", "b1lead", "b1sub", "b2lead", "b2sub", "b3lead", "b3sub", "play", "pause"];

for (const [loc, d] of Object.entries(DATA)) {
  const p = `src/messages/${loc}.json`;
  const j = JSON.parse(readFileSync(p, "utf8"));
  const why = j.landingV2.why;
  for (const k of DEAD) delete why[k];
  // Rebuild in a clean, readable order.
  j.landingV2.why = {
    eyebrow: d.eyebrow,
    h2: d.h2,
    proposition: d.proposition,
    iconLoci: d.iconLoci,
    iconEveryone: d.iconEveryone,
    iconEnrich: d.iconEnrich,
    payoff: d.payoff,
    aria: d.aria,
  };
  writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log(`${loc}: why block updated (${Object.keys(j.landingV2.why).length} keys)`);
}
