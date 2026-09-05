// Round-6 army decisions applied: WHY copy, tour VIDEO captions, and the
// "Household" feature names + plain descriptors. All 5 locales.
import { readFileSync, writeFileSync } from "node:fs";

const D = {
  en: {
    why: {
      eyebrow: "Why a palace, and not a folder",
      h2: "You don't scroll a life. You walk up and touch it.",
      body: "A folder buries your photos. A feed forgets them by morning. Here every memory has a room, a wall, a place you can walk back into — and you become the keeper everyone comes home to.",
      caption: "the place they'll come home to",
      aria: "A woman in golden light reaching up to touch a framed photo on the warm wall of her memory palace — a life you can walk up to and touch, not a folder you scroll.",
    },
    show: {
      tourNote: "About 30 seconds · no sound needed",
      capExteriorEyebrow: "Outside", capExterior: "A whole home — for a whole life.",
      capDoorsEyebrow: "The doors", capDoors: "Every door opens a chapter.",
      capCorridorEyebrow: "The hallway", capCorridor: "Walk past your memories — together.",
      capRoomEyebrow: "A room", capRoom: "Photos, voices and stories, all in one place.",
      capClose: "Your family's story, kept for good.", capCloseCta: "Create your palace",
    },
    names: {
      uploadsName: "The Doorstep", cloudName: "The Steward", receiveName: "The Post",
      palaceName: "The Palace", interviewName: "The Scribe", mapName: "The Atlas",
      treeName: "The Family Tree", journeyName: "The Chronicle", capsuleName: "The Vault",
      cocreateName: "The Workshop", sharingName: "The Guest Book", legacyName: "The Keys",
    },
    roles: {
      uploadsRole: "Brings your memories in", cloudRole: "Files everything in the right room",
      receiveRole: "Delivers what family sends you", palaceRole: "Your memories, walked room by room",
      interviewRole: "Writes down your spoken stories", mapRole: "Pins your memories on the map",
      treeRole: "Everyone in your family, connected", journeyRole: "Your whole life, told in order",
      capsuleRole: "Seals memories to open later", cocreateRole: "Build your palace together",
      sharingRole: "Let visitors sign and explore", legacyRole: "Hand your palace to loved ones",
    },
  },
  nl: {
    why: {
      eyebrow: "Waarom een paleis, en geen map",
      h2: "Je scrolt geen leven. Je loopt ernaartoe en raakt het aan.",
      body: "Een map begraaft je foto's. Een feed is ze 's ochtends alweer vergeten. Hier heeft elke herinnering een kamer, een muur, een plek waar je binnen kunt lopen — en word jij degene naar wie iedereen terugkeert.",
      caption: "de plek waar ze naar terugkomen",
      aria: "Een vrouw in gouden licht die een ingelijste foto aanraakt aan de warme muur van haar geheugenpaleis — een leven waar je naartoe kunt lopen en het kunt aanraken, geen map waar je doorheen scrolt.",
    },
    show: {
      tourNote: "Ongeveer 30 seconden · geen geluid nodig",
      capExteriorEyebrow: "Buiten", capExterior: "Een heel huis — voor een heel leven.",
      capDoorsEyebrow: "De deuren", capDoors: "Elke deur opent een hoofdstuk.",
      capCorridorEyebrow: "De gang", capCorridor: "Loop langs je herinneringen — samen.",
      capRoomEyebrow: "Een kamer", capRoom: "Foto's, stemmen en verhalen, alles op één plek.",
      capClose: "Het verhaal van je familie, voorgoed bewaard.", capCloseCta: "Maak je paleis",
    },
    names: {
      uploadsName: "De Drempel", cloudName: "De Rentmeester", receiveName: "De Post",
      palaceName: "Het Paleis", interviewName: "De Schrijver", mapName: "De Atlas",
      treeName: "De Stamboom", journeyName: "De Kroniek", capsuleName: "De Kluis",
      cocreateName: "De Werkplaats", sharingName: "Het Gastenboek", legacyName: "De Sleutels",
    },
    roles: {
      uploadsRole: "Brengt je herinneringen binnen", cloudRole: "Zet alles in de juiste kamer",
      receiveRole: "Bezorgt wat familie je stuurt", palaceRole: "Je herinneringen, kamer voor kamer",
      interviewRole: "Schrijft je gesproken verhalen op", mapRole: "Prikt je herinneringen op de kaart",
      treeRole: "Iedereen in je familie, verbonden", journeyRole: "Je hele leven, op volgorde verteld",
      capsuleRole: "Verzegelt herinneringen voor later", cocreateRole: "Bouw je paleis samen",
      sharingRole: "Laat bezoekers tekenen en rondkijken", legacyRole: "Geef je paleis door aan dierbaren",
    },
  },
  de: {
    why: {
      eyebrow: "Warum ein Palast – und kein Ordner",
      h2: "Ein Leben scrollt man nicht. Man tritt heran und berührt es.",
      body: "Ein Ordner vergräbt Ihre Fotos. Ein Feed hat sie bis zum Morgen vergessen. Hier hat jede Erinnerung ein Zimmer, eine Wand, einen Ort, den Sie wieder betreten können — und Sie werden zu dem Menschen, zu dem alle heimkehren.",
      caption: "der Ort, an den alle heimkehren",
      aria: "Eine Frau im goldenen Licht, die ein gerahmtes Foto an der warmen Wand ihres Gedächtnispalastes berührt — ein Leben, an das man herantreten und das man berühren kann, kein Ordner zum Scrollen.",
    },
    show: {
      tourNote: "Etwa 30 Sekunden · kein Ton nötig",
      capExteriorEyebrow: "Draußen", capExterior: "Ein ganzes Zuhause — für ein ganzes Leben.",
      capDoorsEyebrow: "Die Türen", capDoors: "Jede Tür öffnet ein Kapitel.",
      capCorridorEyebrow: "Der Flur", capCorridor: "Gehen Sie an Ihren Erinnerungen entlang — gemeinsam.",
      capRoomEyebrow: "Ein Raum", capRoom: "Fotos, Stimmen und Geschichten — alles an einem Ort.",
      capClose: "Die Geschichte Ihrer Familie — für immer bewahrt.", capCloseCta: "Erstellen Sie Ihren Palast",
    },
    names: {
      uploadsName: "Die Schwelle", cloudName: "Der Verwalter", receiveName: "Die Post",
      palaceName: "Der Palast", interviewName: "Der Schreiber", mapName: "Der Atlas",
      treeName: "Der Stammbaum", journeyName: "Die Chronik", capsuleName: "Der Tresor",
      cocreateName: "Die Werkstatt", sharingName: "Das Gästebuch", legacyName: "Die Schlüssel",
    },
    roles: {
      uploadsRole: "Bringt Ihre Erinnerungen herein", cloudRole: "Legt alles in den richtigen Raum",
      receiveRole: "Liefert, was Ihre Familie schickt", palaceRole: "Ihre Erinnerungen, Raum für Raum",
      interviewRole: "Schreibt Ihre erzählten Geschichten auf", mapRole: "Steckt Ihre Erinnerungen auf die Karte",
      treeRole: "Alle in Ihrer Familie, verbunden", journeyRole: "Ihr ganzes Leben, der Reihe nach erzählt",
      capsuleRole: "Versiegelt Erinnerungen für später", cocreateRole: "Bauen Sie Ihren Palast gemeinsam",
      sharingRole: "Lassen Sie Gäste unterschreiben und stöbern", legacyRole: "Übergeben Sie Ihren Palast an Ihre Liebsten",
    },
  },
  es: {
    why: {
      eyebrow: "Por qué un palacio, y no una carpeta",
      h2: "Una vida no se desliza. Te acercas y la tocas.",
      body: "Una carpeta entierra tus fotos. Un feed las olvida al amanecer. Aquí cada recuerdo tiene una habitación, una pared, un lugar al que puedes volver a entrar — y te conviertes en quien todos regresan a ver.",
      caption: "el lugar al que todos vuelven",
      aria: "Una mujer bajo una luz dorada que se estira para tocar una foto enmarcada en la cálida pared de su palacio de la memoria — una vida a la que puedes acercarte y tocar, no una carpeta que deslizas.",
    },
    show: {
      tourNote: "Unos 30 segundos · sin sonido",
      capExteriorEyebrow: "Fuera", capExterior: "Una casa entera — para toda una vida.",
      capDoorsEyebrow: "Las puertas", capDoors: "Cada puerta abre un capítulo.",
      capCorridorEyebrow: "El pasillo", capCorridor: "Recorre tus recuerdos — juntos.",
      capRoomEyebrow: "Una sala", capRoom: "Fotos, voces e historias, todo en un solo lugar.",
      capClose: "La historia de tu familia, guardada para siempre.", capCloseCta: "Crea tu palacio",
    },
    names: {
      uploadsName: "El Umbral", cloudName: "El Mayordomo", receiveName: "El Correo",
      palaceName: "El Palacio", interviewName: "El Escriba", mapName: "El Atlas",
      treeName: "El Árbol Genealógico", journeyName: "La Crónica", capsuleName: "La Cámara",
      cocreateName: "El Taller", sharingName: "El Libro de Visitas", legacyName: "Las Llaves",
    },
    roles: {
      uploadsRole: "Trae tus recuerdos", cloudRole: "Coloca todo en la habitación correcta",
      receiveRole: "Entrega lo que te envía la familia", palaceRole: "Tus recuerdos, habitación por habitación",
      interviewRole: "Escribe tus historias habladas", mapRole: "Fija tus recuerdos en el mapa",
      treeRole: "Toda tu familia, conectada", journeyRole: "Toda tu vida, contada en orden",
      capsuleRole: "Sella recuerdos para abrir más tarde", cocreateRole: "Construid vuestro palacio juntos",
      sharingRole: "Deja que las visitas firmen y exploren", legacyRole: "Entrega tu palacio a tus seres queridos",
    },
  },
  fr: {
    why: {
      eyebrow: "Pourquoi un palais, et non un dossier",
      h2: "Une vie ne se fait pas défiler. On s'en approche et on la touche.",
      body: "Un dossier enterre vos photos. Un fil les oublie au matin. Ici chaque souvenir a une pièce, un mur, un lieu où l'on peut revenir — et vous devenez celui vers qui chacun revient.",
      caption: "le lieu où chacun revient",
      aria: "Une femme dans une lumière dorée qui tend la main vers une photo encadrée sur le mur chaleureux de son palais de mémoire — une vie dont on peut s'approcher et que l'on peut toucher, non un dossier que l'on fait défiler.",
    },
    show: {
      tourNote: "Environ 30 secondes · sans son",
      capExteriorEyebrow: "Dehors", capExterior: "Une maison entière — pour toute une vie.",
      capDoorsEyebrow: "Les portes", capDoors: "Chaque porte ouvre un chapitre.",
      capCorridorEyebrow: "Le couloir", capCorridor: "Parcourez vos souvenirs — ensemble.",
      capRoomEyebrow: "Une pièce", capRoom: "Photos, voix et récits, tout au même endroit.",
      capClose: "L'histoire de votre famille, gardée pour toujours.", capCloseCta: "Créez votre palais",
    },
    names: {
      uploadsName: "Le Seuil", cloudName: "L'Intendant", receiveName: "Le Courrier",
      palaceName: "Le Palais", interviewName: "Le Scribe", mapName: "L'Atlas",
      treeName: "L'Arbre Généalogique", journeyName: "La Chronique", capsuleName: "Le Coffre",
      cocreateName: "L'Atelier", sharingName: "Le Livre d'Or", legacyName: "Les Clés",
    },
    roles: {
      uploadsRole: "Fait entrer vos souvenirs", cloudRole: "Range tout dans la bonne pièce",
      receiveRole: "Livre ce que votre famille envoie", palaceRole: "Vos souvenirs, pièce par pièce",
      interviewRole: "Écrit vos histoires racontées", mapRole: "Épingle vos souvenirs sur la carte",
      treeRole: "Toute votre famille, reliée", journeyRole: "Toute votre vie, racontée dans l'ordre",
      capsuleRole: "Scelle des souvenirs pour plus tard", cocreateRole: "Bâtissez votre palais ensemble",
      sharingRole: "Laissez les visiteurs signer et explorer", legacyRole: "Transmettez votre palais à vos proches",
    },
  },
};

const OLD_WHY = ["windowLabel1", "windowLabel2", "windowLabel3", "closingLine", "sceneAria", "step1t", "step1b", "step2t", "step2b", "step3t", "step3b"];

for (const [locale, d] of Object.entries(D)) {
  const file = "src/messages/" + locale + ".json";
  const j = JSON.parse(readFileSync(file, "utf8"));
  const v2 = j.landingV2;
  // WHY
  for (const k of OLD_WHY) delete v2.why[k];
  v2.why.eyebrow = d.why.eyebrow;
  v2.why.h2 = d.why.h2;
  v2.why.body = d.why.body;
  v2.why.caption = d.why.caption;
  v2.why.aria = d.why.aria;
  // VIDEO captions
  Object.assign(v2.showcase, d.show);
  delete v2.showcase.soundCta;
  // NAMES + descriptors
  Object.assign(v2.mock, d.names, d.roles);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  console.log(locale + " patched (round 6 armies)");
}
