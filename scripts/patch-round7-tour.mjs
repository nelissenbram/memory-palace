// Round-7 tour caption edits (user feedback): rename to The Wings / The Corridor
// / The Room, playful wing examples, no em-dashes. All 5 locales.
import { readFileSync, writeFileSync } from "node:fs";

const D = {
  en: {
    capExterior: "A whole palace, for a whole life of memories.",
    capDoorsEyebrow: "The Wings · childhood, family, travels…",
    capDoors: "Every Wing opens a theme of life.",
    capCorridorEyebrow: "The Corridor",
    capCorridor: "Every Wing holds chapters, in the form of Rooms.",
    capRoomEyebrow: "The Room",
    capRoom: "Add photos, video and stories to a room made just for them.",
  },
  nl: {
    capExterior: "Een heel paleis, voor een heel leven aan herinneringen.",
    capDoorsEyebrow: "De Vleugels · jeugd, familie, reizen…",
    capDoors: "Elke vleugel opent een thema van je leven.",
    capCorridorEyebrow: "De Gang",
    capCorridor: "Elke vleugel bewaart hoofdstukken, in de vorm van kamers.",
    capRoomEyebrow: "De Kamer",
    capRoom: "Voeg foto's, video en verhalen toe aan een kamer die er speciaal voor is.",
  },
  de: {
    capExterior: "Ein ganzer Palast, für ein ganzes Leben voller Erinnerungen.",
    capDoorsEyebrow: "Die Flügel · Kindheit, Familie, Reisen…",
    capDoors: "Jeder Flügel öffnet ein Lebensthema.",
    capCorridorEyebrow: "Der Korridor",
    capCorridor: "Jeder Flügel birgt Kapitel, in Form von Räumen.",
    capRoomEyebrow: "Der Raum",
    capRoom: "Fügen Sie Fotos, Videos und Geschichten in einen eigens dafür gemachten Raum ein.",
  },
  es: {
    capExterior: "Un palacio entero, para toda una vida de recuerdos.",
    capDoorsEyebrow: "Las Alas · infancia, familia, viajes…",
    capDoors: "Cada ala abre un tema de tu vida.",
    capCorridorEyebrow: "El Corredor",
    capCorridor: "Cada ala guarda capítulos, en forma de habitaciones.",
    capRoomEyebrow: "La Habitación",
    capRoom: "Añade fotos, vídeo e historias a una habitación hecha para ellas.",
  },
  fr: {
    capExterior: "Un palais entier, pour toute une vie de souvenirs.",
    capDoorsEyebrow: "Les Ailes · enfance, famille, voyages…",
    capDoors: "Chaque aile ouvre un thème de vie.",
    capCorridorEyebrow: "Le Corridor",
    capCorridor: "Chaque aile renferme des chapitres, sous forme de pièces.",
    capRoomEyebrow: "La Pièce",
    capRoom: "Ajoutez photos, vidéos et récits dans une pièce faite pour eux.",
  },
};

for (const [locale, d] of Object.entries(D)) {
  const file = "src/messages/" + locale + ".json";
  const j = JSON.parse(readFileSync(file, "utf8"));
  Object.assign(j.landingV2.showcase, d);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  console.log(locale + " tour captions patched (round 7)");
}
