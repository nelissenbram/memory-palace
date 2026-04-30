import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider, signUnsubscribeToken } from "./shared";

// ── i18n translations for drip emails ──

type Locale = "en" | "nl" | "de" | "es" | "fr";
type DripDay = 1 | 3 | 7 | 14;

const copy: Record<DripDay, Record<Locale, {
  label: string;
  heading: (name: string) => string;
  subtitle: string;
  body: string;
  tip?: string;
  tipItems?: string[];
  ctaText: string;
  preheader: (name: string) => string;
  subject: (name: string) => string;
  footer: string;
  unsubscribe: string;
}>> = {
  // ── Day 1: "Add your first memory" ──
  1: {
    en: {
      label: "Getting Started",
      heading: (name) => `Your palace is ready,<br/>${name}`,
      subtitle: "It only takes a moment to preserve your first memory.",
      body: "Every palace begins with a single room, and every room begins with a single memory. A photo, a voice note, a few written words &mdash; whatever feels right.",
      tip: "Quick ways to begin",
      tipItems: [
        "Upload a favourite photo from your camera roll",
        "Record a short voice memory",
        "Write a caption for a moment you never want to forget",
      ],
      ctaText: "Add your first memory",
      preheader: (name) => `${name}, your palace awaits its first memory.`,
      subject: (name) => `${name}, add your first memory`,
      footer: "You received this because you recently joined thememorypalace.ai.",
      unsubscribe: "Unsubscribe from these emails",
    },
    nl: {
      label: "Aan de slag",
      heading: (name) => `Je paleis staat klaar,<br/>${name}`,
      subtitle: "Het duurt maar even om je eerste herinnering te bewaren.",
      body: "Elk paleis begint met \u00e9\u00e9n kamer, en elke kamer begint met \u00e9\u00e9n herinnering. Een foto, een spraakbericht, een paar geschreven woorden &mdash; wat goed voelt.",
      tip: "Snelle manieren om te beginnen",
      tipItems: [
        "Upload een favoriete foto uit je fotorolletje",
        "Neem een kort spraakbericht op",
        "Schrijf een bijschrift bij een moment dat je nooit wilt vergeten",
      ],
      ctaText: "Voeg je eerste herinnering toe",
      preheader: (name) => `${name}, je paleis wacht op zijn eerste herinnering.`,
      subject: (name) => `${name}, voeg je eerste herinnering toe`,
      footer: "Je ontvangt dit bericht omdat je je onlangs hebt aangemeld bij thememorypalace.ai.",
      unsubscribe: "Uitschrijven van deze e-mails",
    },
    de: {
      label: "Erste Schritte",
      heading: (name) => `Dein Palast ist bereit,<br/>${name}`,
      subtitle: "Es dauert nur einen Moment, deine erste Erinnerung zu bewahren.",
      body: "Jeder Palast beginnt mit einem einzigen Raum, und jeder Raum beginnt mit einer einzigen Erinnerung. Ein Foto, eine Sprachnotiz, ein paar geschriebene Worte &mdash; was sich richtig anf\u00fchlt.",
      tip: "Schnelle Wege zum Anfangen",
      tipItems: [
        "Lade ein Lieblingsfoto aus deiner Kamerarolle hoch",
        "Nimm eine kurze Sprachnotiz auf",
        "Schreibe eine Bildunterschrift f\u00fcr einen Moment, den du nie vergessen m\u00f6chtest",
      ],
      ctaText: "F\u00fcge deine erste Erinnerung hinzu",
      preheader: (name) => `${name}, dein Palast wartet auf seine erste Erinnerung.`,
      subject: (name) => `${name}, f\u00fcge deine erste Erinnerung hinzu`,
      footer: "Du erh\u00e4ltst diese E-Mail, weil du dich k\u00fcrzlich bei thememorypalace.ai registriert hast.",
      unsubscribe: "Von diesen E-Mails abmelden",
    },
    es: {
      label: "Primeros Pasos",
      heading: (name) => `Tu palacio est\u00e1 listo,<br/>${name}`,
      subtitle: "Solo toma un momento preservar tu primer recuerdo.",
      body: "Todo palacio comienza con una sola habitaci\u00f3n, y cada habitaci\u00f3n comienza con un solo recuerdo. Una foto, una nota de voz, unas pocas palabras escritas &mdash; lo que se sienta bien.",
      tip: "Formas r\u00e1pidas de empezar",
      tipItems: [
        "Sube una foto favorita de tu carrete",
        "Graba un breve mensaje de voz",
        "Escribe un pie de foto para un momento que nunca quieras olvidar",
      ],
      ctaText: "A\u00f1ade tu primer recuerdo",
      preheader: (name) => `${name}, tu palacio espera su primer recuerdo.`,
      subject: (name) => `${name}, a\u00f1ade tu primer recuerdo`,
      footer: "Recibes esto porque te registraste recientemente en thememorypalace.ai.",
      unsubscribe: "Cancelar suscripci\u00f3n de estos correos",
    },
    fr: {
      label: "Pour Commencer",
      heading: (name) => `Votre palais est pr\u00eat,<br/>${name}`,
      subtitle: "Il ne faut qu'un instant pour pr\u00e9server votre premier souvenir.",
      body: "Chaque palais commence par une seule pi\u00e8ce, et chaque pi\u00e8ce commence par un seul souvenir. Une photo, une note vocale, quelques mots \u00e9crits &mdash; ce qui vous semble juste.",
      tip: "Fa\u00e7ons rapides de commencer",
      tipItems: [
        "T\u00e9l\u00e9chargez une photo pr\u00e9f\u00e9r\u00e9e de votre pellicule",
        "Enregistrez une courte note vocale",
        "\u00c9crivez une l\u00e9gende pour un moment que vous ne voulez jamais oublier",
      ],
      ctaText: "Ajoutez votre premier souvenir",
      preheader: (name) => `${name}, votre palais attend son premier souvenir.`,
      subject: (name) => `${name}, ajoutez votre premier souvenir`,
      footer: "Vous recevez ceci car vous vous \u00eates r\u00e9cemment inscrit sur thememorypalace.ai.",
      unsubscribe: "Se d\u00e9sabonner de ces e-mails",
    },
  },

  // ── Day 3: "Meet your AI interviewer" ──
  3: {
    en: {
      label: "Feature Spotlight",
      heading: (name) => `Meet your AI interviewer,<br/>${name}`,
      subtitle: "A gentle conversation that draws out your stories.",
      body: "Kep, your personal AI interviewer, asks thoughtful questions to help you capture memories you might never think to write down. Just open a room and start a conversation &mdash; Kep takes care of the rest.",
      tip: "What Kep can do",
      tipItems: [
        "Ask follow-up questions about your photos",
        "Help you tell the story behind a moment",
        "Capture memories via WhatsApp voice notes",
      ],
      ctaText: "Try a conversation with Kep",
      preheader: (name) => `${name}, meet your AI interviewer Kep.`,
      subject: (name) => `${name}, meet your AI memory interviewer`,
      footer: "You received this because you recently joined thememorypalace.ai.",
      unsubscribe: "Unsubscribe from these emails",
    },
    nl: {
      label: "Functie in de kijker",
      heading: (name) => `Ontmoet je AI-interviewer,<br/>${name}`,
      subtitle: "Een rustig gesprek dat je verhalen naar boven haalt.",
      body: "Kep, je persoonlijke AI-interviewer, stelt doordachte vragen om je te helpen herinneringen vast te leggen die je anders misschien nooit zou opschrijven. Open gewoon een kamer en begin een gesprek &mdash; Kep doet de rest.",
      tip: "Wat Kep kan doen",
      tipItems: [
        "Vervolgvragen stellen over je foto's",
        "Je helpen het verhaal achter een moment te vertellen",
        "Herinneringen vastleggen via WhatsApp-spraakberichten",
      ],
      ctaText: "Probeer een gesprek met Kep",
      preheader: (name) => `${name}, ontmoet je AI-interviewer Kep.`,
      subject: (name) => `${name}, ontmoet je AI-geheugeninterviewer`,
      footer: "Je ontvangt dit bericht omdat je je onlangs hebt aangemeld bij thememorypalace.ai.",
      unsubscribe: "Uitschrijven van deze e-mails",
    },
    de: {
      label: "Funktion im Fokus",
      heading: (name) => `Lerne deinen KI-Interviewer kennen,<br/>${name}`,
      subtitle: "Ein sanftes Gespr\u00e4ch, das deine Geschichten hervorlockt.",
      body: "Kep, dein pers\u00f6nlicher KI-Interviewer, stellt durchdachte Fragen, um dir zu helfen, Erinnerungen festzuhalten, die du sonst vielleicht nie aufschreiben w\u00fcrdest. \u00d6ffne einfach einen Raum und beginne ein Gespr\u00e4ch &mdash; Kep k\u00fcmmert sich um den Rest.",
      tip: "Was Kep kann",
      tipItems: [
        "Nachfragen zu deinen Fotos stellen",
        "Dir helfen, die Geschichte hinter einem Moment zu erz\u00e4hlen",
        "Erinnerungen per WhatsApp-Sprachnachricht erfassen",
      ],
      ctaText: "Probiere ein Gespr\u00e4ch mit Kep",
      preheader: (name) => `${name}, lerne deinen KI-Interviewer Kep kennen.`,
      subject: (name) => `${name}, lerne deinen KI-Gedächtnisinterviewer kennen`,
      footer: "Du erh\u00e4ltst diese E-Mail, weil du dich k\u00fcrzlich bei thememorypalace.ai registriert hast.",
      unsubscribe: "Von diesen E-Mails abmelden",
    },
    es: {
      label: "Funci\u00f3n Destacada",
      heading: (name) => `Conoce a tu entrevistador IA,<br/>${name}`,
      subtitle: "Una conversaci\u00f3n amable que saca a la luz tus historias.",
      body: "Kep, tu entrevistador personal de IA, hace preguntas reflexivas para ayudarte a capturar recuerdos que quiz\u00e1s nunca pensar\u00edas en escribir. Solo abre una habitaci\u00f3n y comienza una conversaci\u00f3n &mdash; Kep se encarga del resto.",
      tip: "Lo que Kep puede hacer",
      tipItems: [
        "Hacer preguntas de seguimiento sobre tus fotos",
        "Ayudarte a contar la historia detr\u00e1s de un momento",
        "Capturar recuerdos mediante notas de voz de WhatsApp",
      ],
      ctaText: "Prueba una conversaci\u00f3n con Kep",
      preheader: (name) => `${name}, conoce a tu entrevistador IA Kep.`,
      subject: (name) => `${name}, conoce a tu entrevistador de memoria IA`,
      footer: "Recibes esto porque te registraste recientemente en thememorypalace.ai.",
      unsubscribe: "Cancelar suscripci\u00f3n de estos correos",
    },
    fr: {
      label: "Fonctionnalit\u00e9 Phare",
      heading: (name) => `D\u00e9couvrez votre intervieweur IA,<br/>${name}`,
      subtitle: "Une conversation douce qui fait \u00e9merger vos histoires.",
      body: "Kep, votre intervieweur personnel IA, pose des questions r\u00e9fl\u00e9chies pour vous aider \u00e0 capturer des souvenirs que vous n'auriez peut-\u00eatre jamais pens\u00e9 \u00e0 \u00e9crire. Ouvrez simplement une pi\u00e8ce et commencez une conversation &mdash; Kep s'occupe du reste.",
      tip: "Ce que Kep peut faire",
      tipItems: [
        "Poser des questions de suivi sur vos photos",
        "Vous aider \u00e0 raconter l'histoire derri\u00e8re un moment",
        "Capturer des souvenirs par notes vocales WhatsApp",
      ],
      ctaText: "Essayez une conversation avec Kep",
      preheader: (name) => `${name}, d\u00e9couvrez votre intervieweur IA Kep.`,
      subject: (name) => `${name}, d\u00e9couvrez votre intervieweur de m\u00e9moire IA`,
      footer: "Vous recevez ceci car vous vous \u00eates r\u00e9cemment inscrit sur thememorypalace.ai.",
      unsubscribe: "Se d\u00e9sabonner de ces e-mails",
    },
  },

  // ── Day 7: "Share with family" ──
  7: {
    en: {
      label: "Sharing",
      heading: (name) => `Memories are better shared,<br/>${name}`,
      subtitle: "Invite someone who was there.",
      body: "A memory seen from two perspectives becomes richer. Invite a family member or close friend to contribute their own photos, stories, and voice notes to a shared room in your palace.",
      tip: "How sharing works",
      tipItems: [
        "Invite anyone via email — no account needed to view",
        "Contributors can add their own memories to shared rooms",
        "You keep full control over your palace and its rooms",
      ],
      ctaText: "Invite someone to your palace",
      preheader: (name) => `${name}, invite family to share memories together.`,
      subject: (name) => `${name}, invite family to your Memory Palace`,
      footer: "You received this because you recently joined thememorypalace.ai.",
      unsubscribe: "Unsubscribe from these emails",
    },
    nl: {
      label: "Delen",
      heading: (name) => `Herinneringen zijn beter gedeeld,<br/>${name}`,
      subtitle: "Nodig iemand uit die erbij was.",
      body: "Een herinnering vanuit twee perspectieven wordt rijker. Nodig een familielid of goede vriend uit om hun eigen foto's, verhalen en spraakberichten toe te voegen aan een gedeelde kamer in je paleis.",
      tip: "Hoe delen werkt",
      tipItems: [
        "Nodig iemand uit via e-mail — geen account nodig om te bekijken",
        "Bijdragers kunnen hun eigen herinneringen toevoegen aan gedeelde kamers",
        "Jij houdt volledige controle over je paleis en kamers",
      ],
      ctaText: "Nodig iemand uit in je paleis",
      preheader: (name) => `${name}, nodig familie uit om samen herinneringen te delen.`,
      subject: (name) => `${name}, nodig familie uit in je Memory Palace`,
      footer: "Je ontvangt dit bericht omdat je je onlangs hebt aangemeld bij thememorypalace.ai.",
      unsubscribe: "Uitschrijven van deze e-mails",
    },
    de: {
      label: "Teilen",
      heading: (name) => `Erinnerungen sind besser geteilt,<br/>${name}`,
      subtitle: "Lade jemanden ein, der dabei war.",
      body: "Eine Erinnerung aus zwei Perspektiven wird reicher. Lade ein Familienmitglied oder einen engen Freund ein, eigene Fotos, Geschichten und Sprachnotizen in einem gemeinsamen Raum deines Palastes beizutragen.",
      tip: "So funktioniert das Teilen",
      tipItems: [
        "Lade jemanden per E-Mail ein — kein Konto zum Ansehen n\u00f6tig",
        "Beitragende k\u00f6nnen eigene Erinnerungen in geteilten R\u00e4umen hinzuf\u00fcgen",
        "Du beh\u00e4ltst die volle Kontrolle \u00fcber deinen Palast und seine R\u00e4ume",
      ],
      ctaText: "Lade jemanden in deinen Palast ein",
      preheader: (name) => `${name}, lade Familie ein, gemeinsam Erinnerungen zu teilen.`,
      subject: (name) => `${name}, lade Familie in deinen Memory Palace ein`,
      footer: "Du erh\u00e4ltst diese E-Mail, weil du dich k\u00fcrzlich bei thememorypalace.ai registriert hast.",
      unsubscribe: "Von diesen E-Mails abmelden",
    },
    es: {
      label: "Compartir",
      heading: (name) => `Los recuerdos son mejores compartidos,<br/>${name}`,
      subtitle: "Invita a alguien que estuvo ah\u00ed.",
      body: "Un recuerdo visto desde dos perspectivas se vuelve m\u00e1s rico. Invita a un familiar o amigo cercano a contribuir con sus propias fotos, historias y notas de voz en una sala compartida de tu palacio.",
      tip: "C\u00f3mo funciona compartir",
      tipItems: [
        "Invita a cualquiera por correo — no necesita cuenta para ver",
        "Los colaboradores pueden a\u00f1adir sus propios recuerdos a salas compartidas",
        "T\u00fa mantienes el control total de tu palacio y sus salas",
      ],
      ctaText: "Invita a alguien a tu palacio",
      preheader: (name) => `${name}, invita a tu familia a compartir recuerdos juntos.`,
      subject: (name) => `${name}, invita a tu familia a tu Memory Palace`,
      footer: "Recibes esto porque te registraste recientemente en thememorypalace.ai.",
      unsubscribe: "Cancelar suscripci\u00f3n de estos correos",
    },
    fr: {
      label: "Partage",
      heading: (name) => `Les souvenirs sont meilleurs partag\u00e9s,<br/>${name}`,
      subtitle: "Invitez quelqu'un qui \u00e9tait l\u00e0.",
      body: "Un souvenir vu sous deux perspectives devient plus riche. Invitez un membre de la famille ou un ami proche \u00e0 contribuer avec ses propres photos, histoires et notes vocales dans une pi\u00e8ce partag\u00e9e de votre palais.",
      tip: "Comment le partage fonctionne",
      tipItems: [
        "Invitez n'importe qui par e-mail — pas de compte n\u00e9cessaire pour voir",
        "Les contributeurs peuvent ajouter leurs propres souvenirs aux pi\u00e8ces partag\u00e9es",
        "Vous gardez le contr\u00f4le total de votre palais et de ses pi\u00e8ces",
      ],
      ctaText: "Invitez quelqu'un dans votre palais",
      preheader: (name) => `${name}, invitez votre famille \u00e0 partager des souvenirs ensemble.`,
      subject: (name) => `${name}, invitez votre famille dans votre Memory Palace`,
      footer: "Vous recevez ceci car vous vous \u00eates r\u00e9cemment inscrit sur thememorypalace.ai.",
      unsubscribe: "Se d\u00e9sabonner de ces e-mails",
    },
  },

  // ── Day 14: "Your palace is waiting" (only if <5 memories) ──
  14: {
    en: {
      label: "A Gentle Reminder",
      heading: (name) => `Your palace is waiting,<br/>${name}`,
      subtitle: "The rooms are quiet. Shall we fill them?",
      body: "You started something beautiful when you created your Memory Palace. The rooms are still there, waiting for the stories only you can tell. Even one memory a week builds something lasting.",
      tip: "Ideas to spark a memory",
      tipItems: [
        "A photo of someone who shaped who you are",
        "A place you visited that changed your perspective",
        "A recipe, a song, a letter — anything worth keeping",
      ],
      ctaText: "Return to your Palace",
      preheader: (name) => `${name}, your Memory Palace rooms are waiting for you.`,
      subject: (name) => `${name}, your palace is waiting`,
      footer: "You received this because you recently joined thememorypalace.ai.",
      unsubscribe: "Unsubscribe from these emails",
    },
    nl: {
      label: "Een Zachte Herinnering",
      heading: (name) => `Je paleis wacht op je,<br/>${name}`,
      subtitle: "De kamers zijn stil. Zullen we ze vullen?",
      body: "Je bent iets moois begonnen toen je je Memory Palace aanmaakte. De kamers zijn er nog, wachtend op de verhalen die alleen jij kunt vertellen. Zelfs \u00e9\u00e9n herinnering per week bouwt iets blijvends.",
      tip: "Idee\u00ebn om een herinnering op te roepen",
      tipItems: [
        "Een foto van iemand die heeft bepaald wie je bent",
        "Een plek die je bezocht en die je perspectief veranderde",
        "Een recept, een liedje, een brief — alles wat het bewaren waard is",
      ],
      ctaText: "Keer terug naar je Paleis",
      preheader: (name) => `${name}, je Memory Palace-kamers wachten op je.`,
      subject: (name) => `${name}, je paleis wacht op je`,
      footer: "Je ontvangt dit bericht omdat je je onlangs hebt aangemeld bij thememorypalace.ai.",
      unsubscribe: "Uitschrijven van deze e-mails",
    },
    de: {
      label: "Eine Sanfte Erinnerung",
      heading: (name) => `Dein Palast wartet,<br/>${name}`,
      subtitle: "Die R\u00e4ume sind still. Sollen wir sie f\u00fcllen?",
      body: "Du hast etwas Sch\u00f6nes begonnen, als du deinen Memory Palace erstellt hast. Die R\u00e4ume sind noch da und warten auf die Geschichten, die nur du erz\u00e4hlen kannst. Selbst eine Erinnerung pro Woche baut etwas Dauerhaftes auf.",
      tip: "Ideen, um eine Erinnerung zu wecken",
      tipItems: [
        "Ein Foto von jemandem, der dich gepr\u00e4gt hat",
        "Ein Ort, den du besucht hast und der deine Sichtweise ver\u00e4ndert hat",
        "Ein Rezept, ein Lied, ein Brief — alles, was es wert ist, bewahrt zu werden",
      ],
      ctaText: "Kehre zu deinem Palast zur\u00fcck",
      preheader: (name) => `${name}, deine Memory Palace-R\u00e4ume warten auf dich.`,
      subject: (name) => `${name}, dein Palast wartet`,
      footer: "Du erh\u00e4ltst diese E-Mail, weil du dich k\u00fcrzlich bei thememorypalace.ai registriert hast.",
      unsubscribe: "Von diesen E-Mails abmelden",
    },
    es: {
      label: "Un Recordatorio Suave",
      heading: (name) => `Tu palacio te espera,<br/>${name}`,
      subtitle: "Las habitaciones est\u00e1n en silencio. \u00bfLas llenamos?",
      body: "Empezaste algo hermoso cuando creaste tu Memory Palace. Las habitaciones siguen ah\u00ed, esperando las historias que solo t\u00fa puedes contar. Incluso un recuerdo por semana construye algo duradero.",
      tip: "Ideas para despertar un recuerdo",
      tipItems: [
        "Una foto de alguien que form\u00f3 quien eres",
        "Un lugar que visitaste y que cambi\u00f3 tu perspectiva",
        "Una receta, una canci\u00f3n, una carta — cualquier cosa que valga la pena guardar",
      ],
      ctaText: "Regresa a tu Palacio",
      preheader: (name) => `${name}, las habitaciones de tu Memory Palace te esperan.`,
      subject: (name) => `${name}, tu palacio te espera`,
      footer: "Recibes esto porque te registraste recientemente en thememorypalace.ai.",
      unsubscribe: "Cancelar suscripci\u00f3n de estos correos",
    },
    fr: {
      label: "Un Doux Rappel",
      heading: (name) => `Votre palais vous attend,<br/>${name}`,
      subtitle: "Les pi\u00e8ces sont silencieuses. Les remplissons-nous ?",
      body: "Vous avez commenc\u00e9 quelque chose de beau en cr\u00e9ant votre Memory Palace. Les pi\u00e8ces sont toujours l\u00e0, attendant les histoires que vous seul pouvez raconter. M\u00eame un souvenir par semaine construit quelque chose de durable.",
      tip: "Id\u00e9es pour \u00e9veiller un souvenir",
      tipItems: [
        "Une photo de quelqu'un qui a fa\u00e7onn\u00e9 qui vous \u00eates",
        "Un lieu que vous avez visit\u00e9 et qui a chang\u00e9 votre perspective",
        "Une recette, une chanson, une lettre — tout ce qui m\u00e9rite d'\u00eatre gard\u00e9",
      ],
      ctaText: "Retournez \u00e0 votre Palais",
      preheader: (name) => `${name}, les pi\u00e8ces de votre Memory Palace vous attendent.`,
      subject: (name) => `${name}, votre palais vous attend`,
      footer: "Vous recevez ceci car vous vous \u00eates r\u00e9cemment inscrit sur thememorypalace.ai.",
      unsubscribe: "Se d\u00e9sabonner de ces e-mails",
    },
  },
};

function resolveLocale(locale?: string): Locale {
  if (locale && (locale === "en" || locale === "nl" || locale === "de" || locale === "es" || locale === "fr")) {
    return locale;
  }
  return "en";
}

interface DripEmailParams {
  recipientEmail: string;
  displayName: string;
  locale?: string;
  dripDay: DripDay;
  userId?: string; // used for signed unsubscribe token
}

/**
 * Returns config for a given drip day.
 * `requiresLowMemories` indicates day-14 should only send if user has <5 memories.
 */
export function getDripEmailConfig(dripDay: DripDay): {
  dripDay: DripDay;
  requiresLowMemories: boolean;
} {
  return {
    dripDay,
    requiresLowMemories: dripDay === 14,
  };
}

export function generateDripEmailHtml(params: DripEmailParams): string {
  const locale = resolveLocale(params.locale);
  const c = copy[params.dripDay][locale];
  const displayName = escapeHtml(params.displayName);
  const palaceUrl = `${getSiteUrl()}/palace`;
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true${
    params.userId ? `&uid=${signUnsubscribeToken(params.userId)}` : `&email=${encodeURIComponent(params.recipientEmail)}`
  }`;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      ${c.label}
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:32px;font-weight:500;color:#2C2C2A;line-height:1.25;letter-spacing:-0.005em;">
      ${c.heading(displayName)}
    </h1>
    <p class="header-subtitle" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#5C4733;line-height:1.65;font-style:italic;">
      ${c.subtitle}
    </p>`;

  const tipBlock = c.tip && c.tipItems
    ? `
    ${ornamentalDivider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
    <tr><td class="section-bg" style="padding:24px;background-color:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;">
      <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:10px;color:#B8A99A;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">
        ${c.tip}
      </p>
      ${c.tipItems
        .map(
          (item) => `
      <p class="text-primary" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2C2C2A;line-height:1.6;">
        <span style="color:#D4AF37;margin-right:8px;">&mdash;</span> ${item}
      </p>`
        )
        .join("")}
    </td></tr>
    </table>`
    : "";

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.body}
    </p>
    ${tipBlock}`;

  return emailLayout({
    preheader: c.preheader(params.displayName),
    headerHtml,
    bodyHtml,
    ctaText: c.ctaText,
    ctaUrl: palaceUrl,
    locale,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#D4C5B2;">
        ${c.footer}
      </p>
      <a href="${unsubscribeUrl}" style="font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#9A9183;text-decoration:underline;">
        ${c.unsubscribe}
      </a>`,
  });
}

export function generateDripEmailSubject(params: DripEmailParams): string {
  const locale = resolveLocale(params.locale);
  return copy[params.dripDay][locale].subject(escapeHtml(params.displayName));
}

export async function sendDripEmail(
  params: DripEmailParams
): Promise<{ success: boolean; error?: string }> {
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true${
    params.userId ? `&uid=${signUnsubscribeToken(params.userId)}` : `&email=${encodeURIComponent(params.recipientEmail)}`
  }`;

  return sendEmail({
    to: params.recipientEmail,
    subject: generateDripEmailSubject(params),
    html: generateDripEmailHtml(params),
    tag: `drip-day-${params.dripDay}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
