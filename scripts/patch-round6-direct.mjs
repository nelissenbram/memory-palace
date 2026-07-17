// Round-6 direct edits: AI Interviews rename, Gather Memories cloud-link copy,
// transcription strings for the interview card. All 5 locales.
import { readFileSync, writeFileSync } from "node:fs";

const patch = {
  en: {
    interviewName: "AI Interviews",
    u2t: "Gather every memory, from everywhere",
    u2b: "Photos, videos, audio and documents — drag them in from your device, or connect Google Photos, Dropbox or OneDrive and let new memories flow in on their own.",
    mock: {
      uploadsName: "Gather Memories",
      autoSync: "Auto-sync from your cloud",
      dropOrSync: "Drop in, or sync automatically",
      cloudConnected: "Google Photos connected",
      transcribing: "Turning your voice into words…",
      spoken: "“…and every Sunday, the whole family came for lunch.”",
      transcript: "Sunday lunches — Nonna's kitchen, every week",
      voiceToText: "Voice, written down for you",
    },
  },
  nl: {
    interviewName: "AI-interviews",
    u2t: "Verzamel elke herinnering, overal vandaan",
    u2b: "Foto's, video's, audio en documenten — sleep ze vanaf je apparaat, of koppel Google Foto's, Dropbox of OneDrive en laat nieuwe herinneringen vanzelf binnenstromen.",
    mock: {
      uploadsName: "Herinneringen verzamelen",
      autoSync: "Automatisch synchroniseren uit je cloud",
      dropOrSync: "Erin slepen, of automatisch synchroniseren",
      cloudConnected: "Google Foto's gekoppeld",
      transcribing: "Je stem wordt woorden…",
      spoken: "“…en elke zondag kwam de hele familie lunchen.”",
      transcript: "Zondagse lunches — Nonna's keuken, elke week",
      voiceToText: "Stem, voor je uitgeschreven",
    },
  },
  de: {
    interviewName: "KI-Interviews",
    u2t: "Sammeln Sie jede Erinnerung, von überall",
    u2b: "Fotos, Videos, Audio und Dokumente — ziehen Sie sie von Ihrem Gerät herein oder verbinden Sie Google Fotos, Dropbox oder OneDrive und lassen Sie neue Erinnerungen von selbst einfließen.",
    mock: {
      uploadsName: "Erinnerungen sammeln",
      autoSync: "Automatisch aus Ihrer Cloud synchronisieren",
      dropOrSync: "Hereinziehen oder automatisch synchronisieren",
      cloudConnected: "Google Fotos verbunden",
      transcribing: "Ihre Stimme wird zu Worten…",
      spoken: "„…und jeden Sonntag kam die ganze Familie zum Essen.“",
      transcript: "Sonntagsessen — Nonnas Küche, jede Woche",
      voiceToText: "Stimme, für Sie aufgeschrieben",
    },
  },
  es: {
    interviewName: "Entrevistas con IA",
    u2t: "Reúne cada recuerdo, venga de donde venga",
    u2b: "Fotos, vídeos, audio y documentos — arrástralos desde tu dispositivo, o conecta Google Fotos, Dropbox o OneDrive y deja que los nuevos recuerdos entren solos.",
    mock: {
      uploadsName: "Reunir recuerdos",
      autoSync: "Sincronización automática desde tu nube",
      dropOrSync: "Arrastra, o sincroniza automáticamente",
      cloudConnected: "Google Fotos conectado",
      transcribing: "Convirtiendo tu voz en palabras…",
      spoken: "«…y cada domingo, toda la familia venía a comer.»",
      transcript: "Comidas de domingo — la cocina de la Nonna, cada semana",
      voiceToText: "Tu voz, escrita para ti",
    },
  },
  fr: {
    interviewName: "Entretiens IA",
    u2t: "Rassemblez chaque souvenir, d'où qu'il vienne",
    u2b: "Photos, vidéos, audio et documents — glissez-les depuis votre appareil, ou connectez Google Photos, Dropbox ou OneDrive et laissez de nouveaux souvenirs arriver tout seuls.",
    mock: {
      uploadsName: "Rassembler les souvenirs",
      autoSync: "Synchronisation automatique depuis votre cloud",
      dropOrSync: "Glissez, ou synchronisez automatiquement",
      cloudConnected: "Google Photos connecté",
      transcribing: "Votre voix devient des mots…",
      spoken: "«…et chaque dimanche, toute la famille venait déjeuner.»",
      transcript: "Déjeuners du dimanche — la cuisine de Nonna, chaque semaine",
      voiceToText: "La voix, écrite pour vous",
    },
  },
};

for (const [locale, p] of Object.entries(patch)) {
  const file = "src/messages/" + locale + ".json";
  const d = JSON.parse(readFileSync(file, "utf8"));
  const v2 = d.landingV2;
  v2.mock.interviewName = p.interviewName;
  v2.usps.u2t = p.u2t;
  v2.usps.u2b = p.u2b;
  Object.assign(v2.mock, p.mock);
  writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
  console.log(locale + " patched (round 6 direct)");
}
