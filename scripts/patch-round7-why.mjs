// Round-7 Why block: 3-beat pinned scroll copy (loci / dignity / enrich). 5 locales.
import { readFileSync, writeFileSync } from "node:fs";

const D = {
  en: {
    eyebrow: "The oldest way to remember",
    h2: "The palace in your mind, at last a place you can walk into.",
    body: "For 2,500 years, people have remembered by placing what matters in the rooms of an imagined house. You have been doing it your whole life. Here that house becomes real, and every photo on the wall carries the voice and the story behind it.",
    b1lead: "A trick as old as memory itself.",
    b1sub: "For 2,500 years we have remembered by placing things in rooms we can picture. You already know how.",
    b1label: "2,500 years old",
    b2lead: "Everyone already has one.",
    b2sub: "Rich or humble, near or far, every life has quietly gathered a palace of memories. Yours is worth keeping.",
    b2caption: "your life, worth keeping",
    b3lead: "Then you make it come alive.",
    b3sub: "A folder holds the picture. Here you add the voice, the day, the small story behind it, so it can be touched, not just seen.",
    payoff: "You don't scroll a life. You walk up and touch it.",
    aria: "A woman in golden light reaching up to touch a framed photo on the warm wall of her memory palace. For 2,500 years people have remembered by placing what matters in rooms. Everyone already carries such a palace, and yours is worth keeping. Here a photo is not only kept, the voice and the story behind it stay alive.",
  },
  nl: {
    eyebrow: "De oudste manier om te onthouden",
    h2: "Het paleis in je hoofd, eindelijk een plek waar je binnen kunt lopen.",
    body: "Al 2.500 jaar onthouden mensen door wat telt in de kamers van een denkbeeldig huis te plaatsen. Je doet het je hele leven al. Hier wordt dat huis echt, en elke foto aan de muur draagt de stem en het verhaal erachter mee.",
    b1lead: "Een kunst zo oud als het geheugen zelf.",
    b1sub: "Al 2.500 jaar onthouden we door dingen te plaatsen in kamers die we voor ons zien. Je weet allang hoe.",
    b1label: "2.500 jaar oud",
    b2lead: "Iedereen heeft er al een.",
    b2sub: "Rijk of eenvoudig, dichtbij of ver weg, elk leven heeft stil een paleis van herinneringen verzameld. Dat van jou verdient het om bewaard te worden.",
    b2caption: "jouw leven, het bewaren waard",
    b3lead: "Dan breng je het tot leven.",
    b3sub: "Een map bewaart de foto. Hier voeg je de stem toe, de dag, het kleine verhaal erachter, zodat je het kunt aanraken, niet alleen bekijken.",
    payoff: "Je scrolt geen leven. Je loopt ernaartoe en raakt het aan.",
    aria: "Een vrouw in gouden licht die een ingelijste foto aanraakt aan de warme muur van haar geheugenpaleis. Al 2.500 jaar onthouden mensen door wat telt in kamers te plaatsen. Iedereen draagt al zo'n paleis, en dat van jou verdient het om bewaard te worden. Hier wordt een foto niet alleen bewaard, de stem en het verhaal erachter blijven leven.",
  },
  de: {
    eyebrow: "Die älteste Art, sich zu erinnern",
    h2: "Der Palast in Ihrem Kopf, endlich ein Ort, den Sie betreten können.",
    body: "Seit 2.500 Jahren erinnern sich Menschen, indem sie das Wichtige in die Zimmer eines vorgestellten Hauses stellen. Sie tun es Ihr ganzes Leben lang. Hier wird dieses Haus wirklich, und jedes Foto an der Wand trägt die Stimme und die Geschichte dahinter in sich.",
    b1lead: "Eine Kunst, so alt wie das Erinnern selbst.",
    b1sub: "Seit 2.500 Jahren erinnern wir uns, indem wir Dinge in Räume stellen, die wir uns vorstellen. Sie wissen längst, wie.",
    b1label: "2.500 Jahre alt",
    b2lead: "Jeder hat bereits einen.",
    b2sub: "Reich oder bescheiden, nah oder fern, jedes Leben hat still einen Palast voller Erinnerungen gesammelt. Ihres verdient es, bewahrt zu werden.",
    b2caption: "Ihr Leben, wert bewahrt zu werden",
    b3lead: "Dann erwecken Sie es zum Leben.",
    b3sub: "Ein Ordner bewahrt das Bild. Hier fügen Sie die Stimme hinzu, den Tag, die kleine Geschichte dahinter, damit man es berühren kann, nicht nur ansehen.",
    payoff: "Ein Leben scrollt man nicht. Man tritt heran und berührt es.",
    aria: "Eine Frau im goldenen Licht, die ein gerahmtes Foto an der warmen Wand ihres Gedächtnispalastes berührt. Seit 2.500 Jahren erinnern sich Menschen, indem sie das Wichtige in Räume stellen. Jeder trägt bereits einen solchen Palast, und Ihrer verdient es, bewahrt zu werden. Hier wird ein Foto nicht nur aufbewahrt, die Stimme und die Geschichte dahinter bleiben lebendig.",
  },
  es: {
    eyebrow: "La forma más antigua de recordar",
    h2: "El palacio de tu mente, por fin un lugar en el que puedes entrar.",
    body: "Durante 2.500 años, las personas han recordado colocando lo que importa en las habitaciones de una casa imaginada. Lo has hecho toda tu vida. Aquí esa casa se vuelve real, y cada foto en la pared lleva la voz y la historia que hay detrás.",
    b1lead: "Un arte tan antiguo como la memoria misma.",
    b1sub: "Durante 2.500 años hemos recordado colocando cosas en habitaciones que podemos imaginar. Ya sabes cómo.",
    b1label: "2.500 años de antigüedad",
    b2lead: "Todos ya tienen uno.",
    b2sub: "Rica o humilde, cercana o lejana, cada vida ha reunido en silencio un palacio de recuerdos. La tuya merece conservarse.",
    b2caption: "tu vida, digna de guardar",
    b3lead: "Y luego lo haces cobrar vida.",
    b3sub: "Una carpeta guarda la foto. Aquí añades la voz, el día, la pequeña historia detrás, para poder tocarla, no solo verla.",
    payoff: "Una vida no se desliza. Te acercas y la tocas.",
    aria: "Una mujer bajo una luz dorada que se estira para tocar una foto enmarcada en la cálida pared de su palacio de la memoria. Durante 2.500 años las personas han recordado colocando lo que importa en habitaciones. Todos llevan ya un palacio así, y el tuyo merece conservarse. Aquí una foto no solo se guarda, la voz y la historia que hay detrás siguen vivas.",
  },
  fr: {
    eyebrow: "La plus ancienne façon de se souvenir",
    h2: "Le palais de votre esprit, enfin un lieu où l'on peut entrer.",
    body: "Depuis 2 500 ans, les gens se souviennent en plaçant ce qui compte dans les pièces d'une maison imaginée. Vous le faites depuis toujours. Ici cette maison devient réelle, et chaque photo au mur porte la voix et l'histoire qui se cachent derrière.",
    b1lead: "Un art aussi ancien que la mémoire elle-même.",
    b1sub: "Depuis 2 500 ans, nous nous souvenons en plaçant les choses dans des pièces que nous imaginons. Vous savez déjà comment.",
    b1label: "2 500 ans d'histoire",
    b2lead: "Chacun en a déjà un.",
    b2sub: "Riche ou modeste, proche ou lointaine, chaque vie a rassemblé en silence un palais de souvenirs. La vôtre mérite d'être gardée.",
    b2caption: "votre vie, à garder",
    b3lead: "Puis vous lui donnez vie.",
    b3sub: "Un dossier garde la photo. Ici vous ajoutez la voix, le jour, la petite histoire derrière, pour qu'on puisse la toucher, non seulement la voir.",
    payoff: "Une vie ne se fait pas défiler. On s'en approche et on la touche.",
    aria: "Une femme dans une lumière dorée qui tend la main vers une photo encadrée sur le mur chaleureux de son palais de mémoire. Depuis 2 500 ans, les gens se souviennent en plaçant l'essentiel dans des pièces. Chacun porte déjà un tel palais, et le vôtre mérite d'être gardé. Ici une photo n'est pas seulement conservée, la voix et l'histoire derrière elle restent vivantes.",
  },
};

for (const [locale, d] of Object.entries(D)) {
  const file = "src/messages/" + locale + ".json";
  const j = JSON.parse(readFileSync(file, "utf8"));
  delete j.landingV2.why.caption; // round-6 single near-hand caption, replaced by per-beat captions
  Object.assign(j.landingV2.why, d);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  console.log(locale + " why patched (round 7)");
}
