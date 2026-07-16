// Round-4 landing v2 copy changes across all 5 locales.
import { readFileSync, writeFileSync } from "node:fs";

const patch = {
  en: {
    heroSub: "A beautiful 3D palace for your photos, voice recordings, and life stories — explore it together with your friends & family.",
    showcase: { soundCta: "Watch with sound" },
    uspsH2: "Everything your memories need to stay alive.",
    how: {
      s1d: "Upload, import, or send them on WhatsApp — AI sorts them into rooms.",
      s2d: "Your voice, guided by the questions your grandchildren would ask.",
      s3d: "Invite your loved ones in — or seal memories for later.",
      g1d: "Set it up in five minutes — you handle the tech.",
      g2d: "They just answer questions — on WhatsApp or in the browser.",
      g3d: "The stories stay in the family, ready to pass on.",
    },
    compareH2: "Keep your cloud photos. That's the drive. This is the home.",
    notes: {
      n1: "your palace, from above",
      n2: "every door, a chapter",
      n3: "photos become rooms",
      n4: "three generations, one tree",
      n5: "the questions that matter",
      n6: "voices live here too",
      n7: "a library of memories",
      n8: "little wins, along the way",
    },
  },
  nl: {
    heroSub: "Een prachtig 3D-paleis voor je foto's, stemopnames en levensverhalen — verken het samen met je vrienden & familie.",
    showcase: { soundCta: "Bekijk met geluid" },
    uspsH2: "Alles wat je herinneringen nodig hebben om te blijven leven.",
    how: {
      s1d: "Upload, importeer of stuur ze via WhatsApp — AI sorteert ze in kamers.",
      s2d: "Jouw stem, geleid door de vragen die je kleinkinderen zouden stellen.",
      s3d: "Nodig je dierbaren uit — of verzegel herinneringen voor later.",
      g1d: "In vijf minuten opgezet — jij regelt de techniek.",
      g2d: "Zij beantwoorden alleen vragen — via WhatsApp of in de browser.",
      g3d: "De verhalen blijven in de familie, klaar om door te geven.",
    },
    compareH2: "Houd je cloudfoto's. Dat is de schijf. Dit is het thuis.",
    notes: {
      n1: "je paleis, van bovenaf",
      n2: "elke deur een hoofdstuk",
      n3: "foto's worden kamers",
      n4: "drie generaties, één stamboom",
      n5: "de vragen die ertoe doen",
      n6: "ook stemmen wonen hier",
      n7: "een bibliotheek vol herinneringen",
      n8: "kleine overwinningen onderweg",
    },
  },
  de: {
    heroSub: "Ein wunderschöner 3D-Palast für Ihre Fotos, Sprachaufnahmen und Lebensgeschichten — erkunden Sie ihn gemeinsam mit Freunden & Familie.",
    showcase: { soundCta: "Mit Ton ansehen" },
    uspsH2: "Alles, was Ihre Erinnerungen brauchen, um lebendig zu bleiben.",
    how: {
      s1d: "Hochladen, importieren oder per WhatsApp senden — die KI sortiert alles in Räume.",
      s2d: "Ihre Stimme, geleitet von den Fragen, die Ihre Enkel stellen würden.",
      s3d: "Laden Sie Ihre Liebsten ein — oder versiegeln Sie Erinnerungen für später.",
      g1d: "In fünf Minuten eingerichtet — Sie übernehmen die Technik.",
      g2d: "Sie beantworten nur Fragen — per WhatsApp oder im Browser.",
      g3d: "Die Geschichten bleiben in der Familie, bereit zum Weitergeben.",
    },
    compareH2: "Behalten Sie Ihre Cloud-Fotos. Das ist die Festplatte. Dies ist das Zuhause.",
    notes: {
      n1: "Ihr Palast, von oben",
      n2: "jede Tür ein Kapitel",
      n3: "Fotos werden Räume",
      n4: "drei Generationen, ein Stammbaum",
      n5: "die Fragen, die zählen",
      n6: "auch Stimmen wohnen hier",
      n7: "eine Bibliothek voller Erinnerungen",
      n8: "kleine Erfolge unterwegs",
    },
  },
  es: {
    heroSub: "Un precioso palacio 3D para tus fotos, grabaciones de voz e historias de vida — explóralo junto a tus amigos y familia.",
    showcase: { soundCta: "Ver con sonido" },
    uspsH2: "Todo lo que tus recuerdos necesitan para seguir vivos.",
    how: {
      s1d: "Sube, importa o envíalos por WhatsApp — la IA los ordena en habitaciones.",
      s2d: "Tu voz, guiada por las preguntas que harían tus nietos.",
      s3d: "Invita a tus seres queridos — o sella recuerdos para más adelante.",
      g1d: "Listo en cinco minutos — tú te ocupas de la tecnología.",
      g2d: "Ellos solo responden preguntas — por WhatsApp o en el navegador.",
      g3d: "Las historias quedan en la familia, listas para transmitirse.",
    },
    compareH2: "Quédate con tus fotos en la nube. Eso es el disco. Esto es el hogar.",
    notes: {
      n1: "tu palacio, desde arriba",
      n2: "cada puerta, un capítulo",
      n3: "las fotos se vuelven habitaciones",
      n4: "tres generaciones, un árbol",
      n5: "las preguntas que importan",
      n6: "aquí también viven voces",
      n7: "una biblioteca de recuerdos",
      n8: "pequeños logros en el camino",
    },
  },
  fr: {
    heroSub: "Un magnifique palais en 3D pour vos photos, vos enregistrements et vos histoires de vie — à explorer avec vos amis et votre famille.",
    showcase: { soundCta: "Regarder avec le son" },
    uspsH2: "Tout ce qu'il faut à vos souvenirs pour rester vivants.",
    how: {
      s1d: "Téléversez, importez ou envoyez-les sur WhatsApp — l'IA les range en pièces.",
      s2d: "Votre voix, guidée par les questions que poseraient vos petits-enfants.",
      s3d: "Invitez vos proches — ou scellez des souvenirs pour plus tard.",
      g1d: "Installé en cinq minutes — vous gérez la technique.",
      g2d: "Ils ne font que répondre à des questions — sur WhatsApp ou dans le navigateur.",
      g3d: "Les histoires restent dans la famille, prêtes à être transmises.",
    },
    compareH2: "Gardez vos photos dans le cloud. Ça, c'est le disque. Ici, c'est le foyer.",
    notes: {
      n1: "votre palais, vu du ciel",
      n2: "chaque porte, un chapitre",
      n3: "les photos deviennent des pièces",
      n4: "trois générations, un arbre",
      n5: "les questions qui comptent",
      n6: "des voix habitent ici aussi",
      n7: "une bibliothèque de souvenirs",
      n8: "de petites victoires en chemin",
    },
  },
};

for (const [locale, p] of Object.entries(patch)) {
  const file = "src/messages/" + locale + ".json";
  const d = JSON.parse(readFileSync(file, "utf8"));
  const v2 = d.landingV2;
  v2.hero.sub = p.heroSub;
  delete v2.showcase.attribution;
  v2.showcase.soundCta = p.showcase.soundCta;
  v2.usps.h2 = p.uspsH2;
  Object.assign(v2.how, p.how);
  v2.compare.h2 = p.compareH2;
  v2.notes = p.notes;
  writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
  console.log(locale + " patched (round 4)");
}
