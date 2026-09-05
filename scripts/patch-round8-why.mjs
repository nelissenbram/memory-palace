// Round-8 Why block: "Museum Wall Label" copy (why3.md). All text on cream.
import { readFileSync, writeFileSync } from "node:fs";

const D = {
  en: {
    eyebrow: "The oldest way to remember",
    h2: "The palace in your mind, at last a place you can walk into",
    b1lead: "A trick as old as memory itself",
    b1sub: "For 2,500 years we have remembered by placing what matters in rooms we can picture. You already know how.",
    b2lead: "Everyone already has one",
    b2sub: "Rich or humble, near or far, every life has quietly gathered a palace of memories. Yours is worth keeping.",
    b3lead: "Then you make it come alive",
    b3sub: "A folder holds the picture. Here you add the voice, the day, the story behind it, so it can be touched, not just seen.",
    payoff: "You don't scroll a life. You walk up and touch it.",
  },
  nl: {
    eyebrow: "De oudste manier om te onthouden",
    h2: "Het paleis in je hoofd, eindelijk een plek waar je binnen kunt lopen",
    b1lead: "Een truc zo oud als het geheugen zelf",
    b1sub: "Al 2.500 jaar onthouden we door te plaatsen wat telt in kamers die we voor ons zien. Je weet allang hoe.",
    b2lead: "Iedereen heeft er al een",
    b2sub: "Rijk of eenvoudig, dichtbij of ver weg, elk leven heeft stilletjes een paleis aan herinneringen verzameld. Het jouwe is het waard om te bewaren.",
    b3lead: "Dan breng je het tot leven",
    b3sub: "Een map bewaart de foto. Hier voeg je de stem toe, de dag, het verhaal erachter, zodat je het kunt aanraken, niet alleen zien.",
    payoff: "Je scrolt geen leven. Je loopt ernaartoe en raakt het aan.",
  },
  de: {
    eyebrow: "Die älteste Art zu erinnern",
    h2: "Der Palast in Ihrem Kopf, endlich ein Ort, den Sie betreten können",
    b1lead: "Ein Kunstgriff so alt wie das Erinnern selbst",
    b1sub: "Seit 2.500 Jahren erinnern wir uns, indem wir das Wichtige in Räume legen, die wir uns vorstellen. Sie wissen längst, wie.",
    b2lead: "Jeder hat schon einen",
    b2sub: "Ob reich oder einfach, nah oder fern, jedes Leben hat still einen Palast an Erinnerungen gesammelt. Ihrer ist es wert, bewahrt zu werden.",
    b3lead: "Dann erwecken Sie ihn zum Leben",
    b3sub: "Ein Ordner bewahrt das Bild. Hier fügen Sie die Stimme hinzu, den Tag, die Geschichte dahinter, damit man es berühren kann, nicht nur ansehen.",
    payoff: "Man scrollt kein Leben. Man tritt heran und berührt es.",
  },
  es: {
    eyebrow: "La forma más antigua de recordar",
    h2: "El palacio de tu mente, por fin un lugar en el que puedes entrar",
    b1lead: "Un arte tan antiguo como la memoria misma",
    b1sub: "Durante 2.500 años hemos recordado colocando lo que importa en habitaciones que podemos imaginar. Ya sabes cómo.",
    b2lead: "Todo el mundo ya tiene uno",
    b2sub: "Rico o humilde, cerca o lejos, cada vida ha reunido en silencio un palacio de recuerdos. El tuyo merece conservarse.",
    b3lead: "Y entonces le das vida",
    b3sub: "Una carpeta guarda la foto. Aquí le añades la voz, el día, la historia que hay detrás, para poder tocarla, no solo verla.",
    payoff: "No se recorre una vida. Te acercas y la tocas.",
  },
  fr: {
    eyebrow: "La plus ancienne façon de se souvenir",
    h2: "Le palais dans votre esprit, enfin un lieu où vous pouvez entrer",
    b1lead: "Un art aussi vieux que la mémoire elle-même",
    b1sub: "Depuis 2 500 ans, nous nous souvenons en plaçant ce qui compte dans des pièces que nous imaginons. Vous savez déjà comment.",
    b2lead: "Chacun en a déjà un",
    b2sub: "Riche ou modeste, proche ou lointaine, chaque vie a rassemblé en silence un palais de souvenirs. Le vôtre mérite d'être gardé.",
    b3lead: "Puis vous lui donnez vie",
    b3sub: "Un dossier garde la photo. Ici vous ajoutez la voix, le jour, l'histoire derrière elle, pour pouvoir la toucher, pas seulement la voir.",
    payoff: "On ne fait pas défiler une vie. On s'approche et on la touche.",
  },
};

for (const [locale, d] of Object.entries(D)) {
  const file = "src/messages/" + locale + ".json";
  const j = JSON.parse(readFileSync(file, "utf8"));
  const why = j.landingV2.why;
  delete why.b1label;
  delete why.b2caption;
  Object.assign(why, d);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  console.log(locale + " why patched (round 8)");
}
