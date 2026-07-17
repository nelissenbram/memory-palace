// Round-5: winning WHY-a-palace copy ("a box goes dark, a palace stays lit"),
// Kep porter role, and a stronger uploads name. All 5 locales.
import { readFileSync, writeFileSync } from "node:fs";

const patch = {
  en: {
    why: {
      eyebrow: "Why a palace?",
      h2: "A box goes dark. A palace stays lit.",
      body: "Photos in folders and boxes are stored — but never visited. In your palace, every memory gets its own room, and every room you fill lights another window. Walk in any evening: it's all still glowing.",
      windowLabel1: "Sunday mornings, 1964",
      windowLabel2: "The day she graduated, 1989",
      windowLabel3: "The grandchildren, last summer",
      closingLine: "A lifetime, always lit.",
      sceneAria: "A palace at dusk, its windows lighting up one by one until the whole house glows.",
    },
    kepRole: "Your WhatsApp Porter",
    uploadsName: "Gather Memories",
  },
  nl: {
    why: {
      eyebrow: "Waarom een paleis?",
      h2: "Een doos wordt donker. Een paleis blijft verlicht.",
      body: "Foto's in mappen en dozen worden bewaard — maar nooit bezocht. In jouw paleis krijgt elke herinnering een eigen kamer, en elke kamer die je vult laat weer een raam oplichten. Loop 's avonds binnen: alles gloeit nog.",
      windowLabel1: "Zondagochtenden, 1964",
      windowLabel2: "De dag dat ze afstudeerde, 1989",
      windowLabel3: "De kleinkinderen, afgelopen zomer",
      closingLine: "Een heel leven, altijd verlicht.",
      sceneAria: "Een paleis in de schemering, waarvan de ramen één voor één oplichten tot het hele huis gloeit.",
    },
    kepRole: "Je WhatsApp-kruier",
    uploadsName: "Herinneringen verzamelen",
  },
  de: {
    why: {
      eyebrow: "Warum ein Palast?",
      h2: "Eine Kiste wird dunkel. Ein Palast bleibt erleuchtet.",
      body: "Fotos in Ordnern und Kisten werden aufbewahrt — aber nie besucht. In Ihrem Palast bekommt jede Erinnerung einen eigenen Raum, und jeder Raum, den Sie füllen, lässt ein weiteres Fenster leuchten. Treten Sie an einem Abend ein: Alles glüht noch.",
      windowLabel1: "Sonntagmorgen, 1964",
      windowLabel2: "Der Tag ihres Abschlusses, 1989",
      windowLabel3: "Die Enkelkinder, letzten Sommer",
      closingLine: "Ein ganzes Leben, immer erleuchtet.",
      sceneAria: "Ein Palast in der Dämmerung, dessen Fenster nacheinander aufleuchten, bis das ganze Haus glüht.",
    },
    kepRole: "Ihr WhatsApp-Portier",
    uploadsName: "Erinnerungen sammeln",
  },
  es: {
    why: {
      eyebrow: "¿Por qué un palacio?",
      h2: "Una caja se apaga. Un palacio sigue encendido.",
      body: "Las fotos en carpetas y cajas se guardan — pero nunca se visitan. En tu palacio, cada recuerdo tiene su propia habitación, y cada habitación que llenas enciende otra ventana. Entra cualquier noche: todo sigue brillando.",
      windowLabel1: "Mañanas de domingo, 1964",
      windowLabel2: "El día que se graduó, 1989",
      windowLabel3: "Los nietos, el verano pasado",
      closingLine: "Toda una vida, siempre encendida.",
      sceneAria: "Un palacio al anochecer, con sus ventanas encendiéndose una a una hasta que toda la casa brilla.",
    },
    kepRole: "Tu portero de WhatsApp",
    uploadsName: "Reunir recuerdos",
  },
  fr: {
    why: {
      eyebrow: "Pourquoi un palais ?",
      h2: "Une boîte s'éteint. Un palais reste allumé.",
      body: "Les photos dans des dossiers et des boîtes sont rangées — mais jamais visitées. Dans votre palais, chaque souvenir a sa propre pièce, et chaque pièce que vous remplissez allume une fenêtre de plus. Entrez un soir : tout brille encore.",
      windowLabel1: "Les dimanches matin, 1964",
      windowLabel2: "Le jour de sa remise de diplôme, 1989",
      windowLabel3: "Les petits-enfants, l'été dernier",
      closingLine: "Toute une vie, toujours allumée.",
      sceneAria: "Un palais au crépuscule, dont les fenêtres s'allument une à une jusqu'à ce que toute la maison brille.",
    },
    kepRole: "Votre porteur WhatsApp",
    uploadsName: "Rassembler les souvenirs",
  },
};

const OLD_WHY = ["step1t", "step1b", "step2t", "step2b", "step3t", "step3b", "link"];

for (const [locale, p] of Object.entries(patch)) {
  const file = "src/messages/" + locale + ".json";
  const d = JSON.parse(readFileSync(file, "utf8"));
  const v2 = d.landingV2;
  for (const k of OLD_WHY) delete v2.why[k];
  v2.why = { ...v2.why, ...p.why };
  v2.mock.kepRole = p.kepRole;
  v2.mock.uploadsName = p.uploadsName;
  writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
  console.log(locale + " patched (round 5)");
}
