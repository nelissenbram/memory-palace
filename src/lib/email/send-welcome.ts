import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

// ── i18n translations for welcome emails ──

type Locale = "en" | "nl" | "de" | "es" | "fr";

const copy = {
  en: {
    benvenuto: "Benvenuto",
    heading: (name: string) => `Welcome to your Memory Palace,<br/>${name}`,
    subtitle: "A palace built room by room — for the life you have lived.",
    intro: "Your Memory Palace is a private place, modelled on the classical houses of Rome and Tuscany. Inside, memories live in rooms, and rooms belong to themed wings that map to the chapters of your life.",
    wingsTitle: "The Wings of Your Palace",
    wings: [
      { title: "Family", desc: "the faces and voices that shaped you" },
      { title: "Travel", desc: "the places that changed how you see the world" },
      { title: "Childhood", desc: "the early years, kept safe" },
      { title: "Career", desc: "the work, the craft, the long road" },
      { title: "Creativity", desc: "everything you ever made, wrote, or dreamt up" },
    ],
    getStarted: "To begin, you can import photos directly from Dropbox, upload from your device, organise them into rooms, and &mdash; when you are ready &mdash; invite family to share a wing with you.",
    noRush: "There is no rush. A palace is built slowly.",
    ctaText: "Enter your Palace",
    preheader: (name: string) => `Welcome, ${name}. Your palace of memories is ready.`,
    footer: "You received this because you signed up at thememorypalace.ai.",
    subject: (name: string) => `Welcome to your Memory Palace, ${name}`,
  },
  nl: {
    benvenuto: "Benvenuto",
    heading: (name: string) => `Welkom in je Memory Palace,<br/>${name}`,
    subtitle: "Een paleis, kamer voor kamer gebouwd — voor het leven dat je hebt geleefd.",
    intro: "Je Memory Palace is een priv\u00e9plek, ge\u00efnspireerd op de klassieke huizen van Rome en Toscane. Herinneringen leven in kamers, en kamers horen bij thematische vleugels die de hoofdstukken van je leven weerspiegelen.",
    wingsTitle: "De Vleugels van je Paleis",
    wings: [
      { title: "Familie", desc: "de gezichten en stemmen die je hebben gevormd" },
      { title: "Reizen", desc: "de plekken die veranderden hoe je de wereld ziet" },
      { title: "Jeugd", desc: "de vroege jaren, veilig bewaard" },
      { title: "Carri\u00e8re", desc: "het werk, het ambacht, de lange weg" },
      { title: "Creativiteit", desc: "alles wat je ooit maakte, schreef of verzon" },
    ],
    getStarted: "Om te beginnen kun je foto\u2019s importeren vanuit Dropbox, uploaden vanaf je apparaat, ze ordenen in kamers en &mdash; wanneer je er klaar voor bent &mdash; familie uitnodigen om een vleugel met je te delen.",
    noRush: "Er is geen haast. Een paleis bouw je langzaam.",
    ctaText: "Betreed je Paleis",
    preheader: (name: string) => `Welkom, ${name}. Je paleis van herinneringen staat klaar.`,
    footer: "Je ontvangt dit bericht omdat je je hebt aangemeld bij thememorypalace.ai.",
    subject: (name: string) => `Welkom in je Memory Palace, ${name}`,
  },
  de: {
    benvenuto: "Benvenuto",
    heading: (name: string) => `Willkommen in deinem Memory Palace,<br/>${name}`,
    subtitle: "Ein Palast, Raum f\u00fcr Raum erbaut — f\u00fcr das Leben, das du gelebt hast.",
    intro: "Dein Memory Palace ist ein privater Ort, inspiriert von den klassischen H\u00e4usern Roms und der Toskana. Erinnerungen leben in R\u00e4umen, und R\u00e4ume geh\u00f6ren zu thematischen Fl\u00fcgeln, die den Kapiteln deines Lebens entsprechen.",
    wingsTitle: "Die Fl\u00fcgel deines Palastes",
    wings: [
      { title: "Familie", desc: "die Gesichter und Stimmen, die dich gepr\u00e4gt haben" },
      { title: "Reisen", desc: "die Orte, die deinen Blick auf die Welt ver\u00e4ndert haben" },
      { title: "Kindheit", desc: "die fr\u00fchen Jahre, sicher bewahrt" },
      { title: "Karriere", desc: "die Arbeit, das Handwerk, der lange Weg" },
      { title: "Kreativit\u00e4t", desc: "alles, was du je gemacht, geschrieben oder ertr\u00e4umt hast" },
    ],
    getStarted: "Zum Einstieg kannst du Fotos direkt aus Dropbox importieren, von deinem Ger\u00e4t hochladen, sie in R\u00e4umen ordnen und &mdash; wenn du bereit bist &mdash; Familie einladen, einen Fl\u00fcgel mit dir zu teilen.",
    noRush: "Es eilt nicht. Ein Palast wird langsam erbaut.",
    ctaText: "Betritt deinen Palast",
    preheader: (name: string) => `Willkommen, ${name}. Dein Palast der Erinnerungen ist bereit.`,
    footer: "Du erh\u00e4ltst diese E-Mail, weil du dich bei thememorypalace.ai registriert hast.",
    subject: (name: string) => `Willkommen in deinem Memory Palace, ${name}`,
  },
  es: {
    benvenuto: "Benvenuto",
    heading: (name: string) => `Bienvenido a tu Memory Palace,<br/>${name}`,
    subtitle: "Un palacio construido habitaci\u00f3n por habitaci\u00f3n — para la vida que has vivido.",
    intro: "Tu Memory Palace es un lugar privado, inspirado en las casas cl\u00e1sicas de Roma y la Toscana. Los recuerdos viven en habitaciones, y las habitaciones pertenecen a alas tem\u00e1ticas que representan los cap\u00edtulos de tu vida.",
    wingsTitle: "Las Alas de tu Palacio",
    wings: [
      { title: "Familia", desc: "los rostros y las voces que te formaron" },
      { title: "Viajes", desc: "los lugares que cambiaron tu forma de ver el mundo" },
      { title: "Infancia", desc: "los primeros a\u00f1os, guardados con cuidado" },
      { title: "Carrera", desc: "el trabajo, el oficio, el largo camino" },
      { title: "Creatividad", desc: "todo lo que alguna vez creaste, escribiste o so\u00f1aste" },
    ],
    getStarted: "Para empezar, puedes importar fotos directamente desde Dropbox, subirlas desde tu dispositivo, organizarlas en habitaciones y &mdash; cuando est\u00e9s listo &mdash; invitar a tu familia a compartir un ala contigo.",
    noRush: "No hay prisa. Un palacio se construye despacio.",
    ctaText: "Entra en tu Palacio",
    preheader: (name: string) => `Bienvenido, ${name}. Tu palacio de recuerdos est\u00e1 listo.`,
    footer: "Recibes este mensaje porque te registraste en thememorypalace.ai.",
    subject: (name: string) => `Bienvenido a tu Memory Palace, ${name}`,
  },
  fr: {
    benvenuto: "Benvenuto",
    heading: (name: string) => `Bienvenue dans votre Memory Palace,<br/>${name}`,
    subtitle: "Un palais b\u00e2ti pi\u00e8ce par pi\u00e8ce — pour la vie que vous avez v\u00e9cue.",
    intro: "Votre Memory Palace est un lieu priv\u00e9, inspir\u00e9 des maisons classiques de Rome et de Toscane. Les souvenirs vivent dans des pi\u00e8ces, et les pi\u00e8ces appartiennent \u00e0 des ailes th\u00e9matiques qui refl\u00e8tent les chapitres de votre vie.",
    wingsTitle: "Les Ailes de votre Palais",
    wings: [
      { title: "Famille", desc: "les visages et les voix qui vous ont fa\u00e7onn\u00e9" },
      { title: "Voyages", desc: "les lieux qui ont chang\u00e9 votre regard sur le monde" },
      { title: "Enfance", desc: "les premi\u00e8res ann\u00e9es, pr\u00e9cieusement gard\u00e9es" },
      { title: "Carri\u00e8re", desc: "le travail, le savoir-faire, le long chemin" },
      { title: "Cr\u00e9ativit\u00e9", desc: "tout ce que vous avez cr\u00e9\u00e9, \u00e9crit ou r\u00eav\u00e9" },
    ],
    getStarted: "Pour commencer, vous pouvez importer des photos depuis Dropbox, les t\u00e9l\u00e9charger depuis votre appareil, les organiser en pi\u00e8ces et &mdash; quand vous \u00eates pr\u00eat &mdash; inviter votre famille \u00e0 partager une aile avec vous.",
    noRush: "Rien ne presse. Un palais se construit lentement.",
    ctaText: "Entrez dans votre Palais",
    preheader: (name: string) => `Bienvenue, ${name}. Votre palais de souvenirs est pr\u00eat.`,
    footer: "Vous recevez cet e-mail car vous vous \u00eates inscrit sur thememorypalace.ai.",
    subject: (name: string) => `Bienvenue dans votre Memory Palace, ${name}`,
  },
} as const;

function resolveLocale(locale?: string): Locale {
  if (locale && locale in copy) return locale as Locale;
  return "en";
}

interface WelcomeEmailParams {
  recipientEmail: string;
  displayName: string;
  locale?: string;
}

export function generateWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  const displayName = escapeHtml(params.displayName);
  const palaceUrl = `${getSiteUrl()}/palace`;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      ${c.benvenuto}
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:32px;font-weight:500;color:#2C2C2A;line-height:1.25;letter-spacing:-0.005em;">
      ${c.heading(displayName)}
    </h1>
    <p class="header-subtitle" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#5C4733;line-height:1.65;font-style:italic;">
      ${c.subtitle}
    </p>`;

  const wing = (title: string, desc: string) => `
    <tr>
      <td style="padding:10px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.65;">
        <span style="color:#D4AF37;font-size:18px;vertical-align:-1px;">&#10086;</span>
        &nbsp;<strong style="color:#5C4733;">${title}</strong> &mdash; <span style="color:#5C564E;">${desc}</span>
      </td>
    </tr>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.intro}
    </p>

    ${ornamentalDivider()}

    <p style="margin:20px 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.16em;text-transform:uppercase;text-align:center;">
      ${c.wingsTitle}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${c.wings.map((w) => wing(w.title, w.desc)).join("")}
    </table>

    ${ornamentalDivider()}

    <p class="text-secondary" style="margin:22px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#5C564E;line-height:1.8;">
      ${c.getStarted}
    </p>

    <p class="text-secondary" style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#5C564E;line-height:1.8;font-style:italic;">
      ${c.noRush}
    </p>`;

  return emailLayout({
    preheader: c.preheader(params.displayName),
    headerHtml,
    bodyHtml,
    ctaText: c.ctaText,
    ctaUrl: palaceUrl,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        ${c.footer}
      </p>`,
  });
}

export function generateWelcomeEmailSubject(displayName: string, locale?: string): string {
  const loc = resolveLocale(locale);
  const c = copy[loc];
  return c.subject(escapeHtml(displayName));
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateWelcomeEmailSubject(params.displayName, params.locale),
    html: generateWelcomeEmailHtml(params),
    tag: "welcome",
  });
}
