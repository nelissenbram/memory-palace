// Round-7 final: close caption, 30->45s labels, and the user-chosen names + descriptors.
import { readFileSync, writeFileSync } from "node:fs";

const D = {
  en: {
    secondary: "Watch the 45-second tour",
    tourNote: "About 45 seconds · no sound needed",
    capClose: "Your Memories, Kept for Good.",
    names: { uploadsName: "Add Memories", cloudName: "Cloud Import", receiveName: "Shared With You", palaceName: "Your Palace", interviewName: "Tell Your Story", mapName: "Memory Map", treeName: "Family Tree", journeyName: "Life Story", capsuleName: "Time Capsule", cocreateName: "Build Together", sharingName: "Share Your Palace", legacyName: "Your Legacy" },
    roles: { uploadsRole: "Photos, video and more, from anywhere", cloudRole: "Bring your cloud in, sorted for you", receiveRole: "Memories your family sends you", palaceRole: "Your memories, walked room by room", interviewRole: "Speak, and we write it down", mapRole: "Every memory, pinned where it happened", treeRole: "Everyone in your family, connected", journeyRole: "Your life, one gentle question at a time", capsuleRole: "Sealed now, opened when you choose", cocreateRole: "Build your palace as a family", sharingRole: "Show a room, or the whole palace", legacyRole: "Choose who inherits the keys" },
  },
  nl: {
    secondary: "Bekijk de tour van 45 seconden",
    tourNote: "Ongeveer 45 seconden · geen geluid nodig",
    capClose: "Jouw herinneringen, voorgoed bewaard.",
    names: { uploadsName: "Herinneringen toevoegen", cloudName: "Cloud-import", receiveName: "Met jou gedeeld", palaceName: "Je paleis", interviewName: "Vertel je verhaal", mapName: "Herinneringskaart", treeName: "Stamboom", journeyName: "Levensverhaal", capsuleName: "Tijdcapsule", cocreateName: "Samen bouwen", sharingName: "Deel je paleis", legacyName: "Jouw nalatenschap" },
    roles: { uploadsRole: "Foto's, video en meer, overal vandaan", cloudRole: "Haal je cloud binnen, netjes gesorteerd", receiveRole: "Herinneringen die je familie je stuurt", palaceRole: "Je herinneringen, kamer voor kamer", interviewRole: "Spreek, en wij schrijven het voor je op", mapRole: "Elke herinnering, vastgepind waar ze gebeurde", treeRole: "Iedereen in je familie, verbonden", journeyRole: "Je leven, één zachte vraag per keer", capsuleRole: "Nu verzegeld, geopend wanneer jij kiest", cocreateRole: "Bouw je paleis als familie", sharingRole: "Laat één kamer zien, of het hele paleis", legacyRole: "Kies wie de sleutels erft" },
  },
  de: {
    secondary: "Die 45-Sekunden-Tour ansehen",
    tourNote: "Etwa 45 Sekunden · kein Ton nötig",
    capClose: "Ihre Erinnerungen, für immer bewahrt.",
    names: { uploadsName: "Erinnerungen hinzufügen", cloudName: "Cloud-Import", receiveName: "Mit Ihnen geteilt", palaceName: "Ihr Palast", interviewName: "Erzählen Sie Ihre Geschichte", mapName: "Erinnerungskarte", treeName: "Stammbaum", journeyName: "Lebensgeschichte", capsuleName: "Zeitkapsel", cocreateName: "Gemeinsam bauen", sharingName: "Palast teilen", legacyName: "Ihr Vermächtnis" },
    roles: { uploadsRole: "Fotos, Videos und mehr, von überall", cloudRole: "Holen Sie Ihre Cloud herein, sortiert", receiveRole: "Erinnerungen, die Ihre Familie schickt", palaceRole: "Ihre Erinnerungen, Raum für Raum", interviewRole: "Sprechen Sie, wir schreiben es auf", mapRole: "Jede Erinnerung, am Ort des Geschehens", treeRole: "Alle in Ihrer Familie, verbunden", journeyRole: "Ihr Leben, eine sanfte Frage nach der anderen", capsuleRole: "Jetzt versiegelt, geöffnet, wann Sie wählen", cocreateRole: "Bauen Sie Ihren Palast als Familie", sharingRole: "Zeigen Sie einen Raum, oder den ganzen Palast", legacyRole: "Wählen Sie, wer die Schlüssel erbt" },
  },
  es: {
    secondary: "Ver el tour de 45 segundos",
    tourNote: "Unos 45 segundos · sin sonido",
    capClose: "Tus recuerdos, guardados para siempre.",
    names: { uploadsName: "Añadir recuerdos", cloudName: "Importar de la nube", receiveName: "Compartido contigo", palaceName: "Tu palacio", interviewName: "Cuenta tu historia", mapName: "Mapa de recuerdos", treeName: "Árbol genealógico", journeyName: "Historia de vida", capsuleName: "Cápsula del tiempo", cocreateName: "Construir juntos", sharingName: "Comparte tu palacio", legacyName: "Tu legado" },
    roles: { uploadsRole: "Fotos, vídeo y más, desde cualquier lugar", cloudRole: "Trae tu nube, ya ordenada", receiveRole: "Recuerdos que te envía tu familia", palaceRole: "Tus recuerdos, habitación por habitación", interviewRole: "Habla, y lo escribimos por ti", mapRole: "Cada recuerdo, fijado donde ocurrió", treeRole: "Toda tu familia, conectada", journeyRole: "Tu vida, una pregunta amable cada vez", capsuleRole: "Sellado ahora, abierto cuando elijas", cocreateRole: "Construye tu palacio en familia", sharingRole: "Muestra una habitación, o todo el palacio", legacyRole: "Elige quién hereda las llaves" },
  },
  fr: {
    secondary: "Voir la visite en 45 secondes",
    tourNote: "Environ 45 secondes · sans son",
    capClose: "Vos souvenirs, gardés pour toujours.",
    names: { uploadsName: "Ajouter des souvenirs", cloudName: "Import du cloud", receiveName: "Partagé avec vous", palaceName: "Votre palais", interviewName: "Racontez votre histoire", mapName: "Carte des souvenirs", treeName: "Arbre généalogique", journeyName: "Récit de vie", capsuleName: "Capsule temporelle", cocreateName: "Bâtir ensemble", sharingName: "Partager le palais", legacyName: "Votre héritage" },
    roles: { uploadsRole: "Photos, vidéos et plus, d'où que ce soit", cloudRole: "Faites entrer votre cloud, déjà trié", receiveRole: "Les souvenirs que votre famille envoie", palaceRole: "Vos souvenirs, pièce par pièce", interviewRole: "Parlez, nous l'écrivons pour vous", mapRole: "Chaque souvenir, épinglé là où il s'est passé", treeRole: "Toute votre famille, reliée", journeyRole: "Votre vie, une question douce à la fois", capsuleRole: "Scellé maintenant, ouvert quand vous voulez", cocreateRole: "Bâtissez votre palais en famille", sharingRole: "Montrez une pièce, ou tout le palais", legacyRole: "Choisissez qui hérite des clés" },
  },
};

for (const [locale, d] of Object.entries(D)) {
  const file = "src/messages/" + locale + ".json";
  const j = JSON.parse(readFileSync(file, "utf8"));
  const v2 = j.landingV2;
  v2.hero.secondary = d.secondary;
  v2.showcase.tourNote = d.tourNote;
  v2.showcase.capClose = d.capClose;
  Object.assign(v2.mock, d.names, d.roles);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  console.log(locale + " final patched (round 7)");
}
