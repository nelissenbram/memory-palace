import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

// ── i18n translations for pre-renewal emails ──

type Locale = "en" | "nl" | "de" | "es" | "fr";

interface RenewalStats {
  memories: number;
  rooms: number;
  familyMembers: number;
  storageMb: number;
}

const copy = {
  en: {
    heading: (name: string, plan: string) =>
      `Your ${plan} plan renews soon,<br/>${name}`,
    subtitle: (date: string) => `Your next renewal date is ${date}.`,
    intro: "Here is what you have built in your palace since you joined:",
    statsTitle: "Your Palace in Numbers",
    statMemories: (n: number) => `${n} ${n === 1 ? "memory" : "memories"} preserved`,
    statRooms: (n: number) => `${n} ${n === 1 ? "room" : "rooms"} created`,
    statFamily: (n: number) => `${n} family ${n === 1 ? "member" : "members"} invited`,
    statStorage: (mb: number) => `${mb} MB of memories stored`,
    closing: "Your palace continues to grow. Thank you for being part of Memory Palace.",
    ctaText: "Visit your Palace",
    preheader: (plan: string, date: string) => `Your ${plan} plan renews on ${date}. See what you have built.`,
    footer: "You received this because you have an active subscription at thememorypalace.ai.",
    subject: (plan: string, date: string) => `Your ${plan} plan renews on ${date}`,
    pushTitle: "Renewal reminder",
    pushBody: (plan: string, date: string) => `Your ${plan} plan renews on ${date}.`,
  },
  nl: {
    heading: (name: string, plan: string) =>
      `Je ${plan}-abonnement wordt binnenkort verlengd,<br/>${name}`,
    subtitle: (date: string) => `Je volgende verlengdatum is ${date}.`,
    intro: "Dit is wat je hebt opgebouwd in je paleis sinds je lid werd:",
    statsTitle: "Je Paleis in Cijfers",
    statMemories: (n: number) => `${n} ${n === 1 ? "herinnering" : "herinneringen"} bewaard`,
    statRooms: (n: number) => `${n} ${n === 1 ? "kamer" : "kamers"} aangemaakt`,
    statFamily: (n: number) => `${n} ${n === 1 ? "familielid" : "familieleden"} uitgenodigd`,
    statStorage: (mb: number) => `${mb} MB aan herinneringen opgeslagen`,
    closing: "Je paleis blijft groeien. Bedankt dat je deel uitmaakt van Memory Palace.",
    ctaText: "Bezoek je Paleis",
    preheader: (plan: string, date: string) => `Je ${plan}-abonnement wordt verlengd op ${date}. Bekijk wat je hebt opgebouwd.`,
    footer: "Je ontvangt dit bericht omdat je een actief abonnement hebt bij thememorypalace.ai.",
    subject: (plan: string, date: string) => `Je ${plan}-abonnement wordt verlengd op ${date}`,
    pushTitle: "Verlengingsherinnering",
    pushBody: (plan: string, date: string) => `Je ${plan}-abonnement wordt verlengd op ${date}.`,
  },
  de: {
    heading: (name: string, plan: string) =>
      `Dein ${plan}-Abo verl\u00e4ngert sich bald,<br/>${name}`,
    subtitle: (date: string) => `Dein n\u00e4chster Verl\u00e4ngerungstermin ist der ${date}.`,
    intro: "Das hast du seit deinem Beitritt in deinem Palast aufgebaut:",
    statsTitle: "Dein Palast in Zahlen",
    statMemories: (n: number) => `${n} ${n === 1 ? "Erinnerung" : "Erinnerungen"} bewahrt`,
    statRooms: (n: number) => `${n} ${n === 1 ? "Raum" : "R\u00e4ume"} erstellt`,
    statFamily: (n: number) => `${n} ${n === 1 ? "Familienmitglied" : "Familienmitglieder"} eingeladen`,
    statStorage: (mb: number) => `${mb} MB an Erinnerungen gespeichert`,
    closing: "Dein Palast w\u00e4chst weiter. Danke, dass du Teil von Memory Palace bist.",
    ctaText: "Besuche deinen Palast",
    preheader: (plan: string, date: string) => `Dein ${plan}-Abo verl\u00e4ngert sich am ${date}. Sieh, was du aufgebaut hast.`,
    footer: "Du erh\u00e4ltst diese E-Mail, weil du ein aktives Abonnement bei thememorypalace.ai hast.",
    subject: (plan: string, date: string) => `Dein ${plan}-Abo verl\u00e4ngert sich am ${date}`,
    pushTitle: "Verl\u00e4ngerungserinnerung",
    pushBody: (plan: string, date: string) => `Dein ${plan}-Abo verl\u00e4ngert sich am ${date}.`,
  },
  es: {
    heading: (name: string, plan: string) =>
      `Tu plan ${plan} se renueva pronto,<br/>${name}`,
    subtitle: (date: string) => `Tu pr\u00f3xima fecha de renovaci\u00f3n es el ${date}.`,
    intro: "Esto es lo que has construido en tu palacio desde que te uniste:",
    statsTitle: "Tu Palacio en N\u00fameros",
    statMemories: (n: number) => `${n} ${n === 1 ? "recuerdo" : "recuerdos"} preservados`,
    statRooms: (n: number) => `${n} ${n === 1 ? "habitaci\u00f3n" : "habitaciones"} creadas`,
    statFamily: (n: number) => `${n} ${n === 1 ? "miembro" : "miembros"} de familia invitados`,
    statStorage: (mb: number) => `${mb} MB de recuerdos almacenados`,
    closing: "Tu palacio sigue creciendo. Gracias por ser parte de Memory Palace.",
    ctaText: "Visita tu Palacio",
    preheader: (plan: string, date: string) => `Tu plan ${plan} se renueva el ${date}. Mira lo que has construido.`,
    footer: "Recibes este mensaje porque tienes una suscripci\u00f3n activa en thememorypalace.ai.",
    subject: (plan: string, date: string) => `Tu plan ${plan} se renueva el ${date}`,
    pushTitle: "Recordatorio de renovaci\u00f3n",
    pushBody: (plan: string, date: string) => `Tu plan ${plan} se renueva el ${date}.`,
  },
  fr: {
    heading: (name: string, plan: string) =>
      `Votre abonnement ${plan} sera bient\u00f4t renouvel\u00e9,<br/>${name}`,
    subtitle: (date: string) => `Votre prochaine date de renouvellement est le ${date}.`,
    intro: "Voici ce que vous avez construit dans votre palais depuis votre inscription :",
    statsTitle: "Votre Palais en Chiffres",
    statMemories: (n: number) => `${n} ${n === 1 ? "souvenir" : "souvenirs"} pr\u00e9serv\u00e9s`,
    statRooms: (n: number) => `${n} ${n === 1 ? "pi\u00e8ce" : "pi\u00e8ces"} cr\u00e9\u00e9es`,
    statFamily: (n: number) => `${n} ${n === 1 ? "membre" : "membres"} de famille invit\u00e9s`,
    statStorage: (mb: number) => `${mb} Mo de souvenirs stock\u00e9s`,
    closing: "Votre palais continue de grandir. Merci de faire partie de Memory Palace.",
    ctaText: "Visitez votre Palais",
    preheader: (plan: string, date: string) => `Votre abonnement ${plan} se renouvelle le ${date}. D\u00e9couvrez ce que vous avez construit.`,
    footer: "Vous recevez cet e-mail car vous avez un abonnement actif sur thememorypalace.ai.",
    subject: (plan: string, date: string) => `Votre abonnement ${plan} se renouvelle le ${date}`,
    pushTitle: "Rappel de renouvellement",
    pushBody: (plan: string, date: string) => `Votre abonnement ${plan} se renouvelle le ${date}.`,
  },
} as const;

function resolveLocale(locale?: string): Locale {
  if (locale && locale in copy) return locale as Locale;
  return "en";
}

export interface RenewalEmailParams {
  recipientEmail: string;
  displayName: string;
  locale?: string;
  planName: string;
  renewalDate: string;
  stats: RenewalStats;
}

function statRow(label: string): string {
  return `
    <tr>
      <td style="padding:8px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.65;">
        <span style="color:#D4AF37;font-size:18px;vertical-align:-1px;">&#10086;</span>
        &nbsp;<span class="text-primary" style="color:#5C4733;">${label}</span>
      </td>
    </tr>`;
}

export function generateRenewalEmailHtml(params: RenewalEmailParams): string {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  const displayName = escapeHtml(params.displayName);
  const planName = escapeHtml(params.planName);
  const renewalDate = escapeHtml(params.renewalDate);
  const palaceUrl = `${getSiteUrl()}/palace`;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      Memory Palace
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:32px;font-weight:500;color:#2C2C2A;line-height:1.25;letter-spacing:-0.005em;">
      ${c.heading(displayName, planName)}
    </h1>
    <p class="header-subtitle" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#5C4733;line-height:1.65;font-style:italic;">
      ${c.subtitle(renewalDate)}
    </p>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.intro}
    </p>

    ${ornamentalDivider()}

    <p style="margin:20px 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.16em;text-transform:uppercase;text-align:center;">
      ${c.statsTitle}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${statRow(c.statMemories(params.stats.memories))}
      ${statRow(c.statRooms(params.stats.rooms))}
      ${statRow(c.statFamily(params.stats.familyMembers))}
      ${statRow(c.statStorage(params.stats.storageMb))}
    </table>

    ${ornamentalDivider()}

    <p class="text-secondary" style="margin:22px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#5C564E;line-height:1.8;font-style:italic;">
      ${c.closing}
    </p>`;

  return emailLayout({
    preheader: c.preheader(planName, renewalDate),
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

export function generateRenewalEmailSubject(planName: string, renewalDate: string, locale?: string): string {
  const loc = resolveLocale(locale);
  const c = copy[loc];
  return c.subject(escapeHtml(planName), escapeHtml(renewalDate));
}

export function getRenewalPushCopy(planName: string, renewalDate: string, locale?: string) {
  const loc = resolveLocale(locale);
  const c = copy[loc];
  return {
    title: c.pushTitle,
    body: c.pushBody(planName, renewalDate),
  };
}

export async function sendRenewalEmail(params: RenewalEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateRenewalEmailSubject(params.planName, params.renewalDate, params.locale),
    html: generateRenewalEmailHtml(params),
    tag: "pre-renewal",
  });
}
