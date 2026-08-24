import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider, signUnsubscribeToken } from "./shared";

type Locale = "en" | "nl" | "de" | "es" | "fr";

const rt: Record<string, Record<Locale, string>> = {
  timeCapsuleLabel: {
    en: "Time Capsule", nl: "Tijdcapsule", de: "Zeitkapsel", es: "C\u00e1psula del Tiempo", fr: "Capsule Temporelle",
  },
  capsuleOpened: {
    en: "A Capsule Has Opened", nl: "Een Capsule is Geopend", de: "Eine Kapsel wurde ge\u00f6ffnet", es: "Una C\u00e1psula se ha Abierto", fr: "Une Capsule s'est Ouverte",
  },
  waitIsOver: {
    en: ", the wait is over. Your time capsule is ready to be revealed.",
    nl: ", het wachten is voorbij. Je tijdcapsule is klaar om onthuld te worden.",
    de: ", das Warten hat ein Ende. Deine Zeitkapsel ist bereit, enth\u00fcllt zu werden.",
    es: ", la espera termin\u00f3. Tu c\u00e1psula del tiempo est\u00e1 lista para ser revelada.",
    fr: ", l'attente est termin\u00e9e. Votre capsule temporelle est pr\u00eate \u00e0 \u00eatre r\u00e9v\u00e9l\u00e9e.",
  },
  nowOpen: {
    en: "Now open", nl: "Nu geopend", de: "Jetzt ge\u00f6ffnet", es: "Ahora abierta", fr: "Maintenant ouverte",
  },
  openToRediscover: {
    en: "Open it now to rediscover the memory you sealed away. What will you find inside?",
    nl: "Open hem nu om de herinnering die je hebt verzegeld opnieuw te ontdekken. Wat vind je erin?",
    de: "\u00d6ffne sie jetzt, um die Erinnerung wiederzuentdecken, die du versiegelt hast. Was wirst du darin finden?",
    es: "\u00c1brela ahora para redescubrir el recuerdo que sellaste. \u00bfQu\u00e9 encontrar\u00e1s dentro?",
    fr: "Ouvrez-la maintenant pour red\u00e9couvrir le souvenir que vous avez scell\u00e9. Qu'y trouverez-vous ?",
  },
  openCapsuleCta: {
    en: "Open your time capsule", nl: "Open je tijdcapsule", de: "\u00d6ffne deine Zeitkapsel", es: "Abre tu c\u00e1psula del tiempo", fr: "Ouvrez votre capsule temporelle",
  },
  capsuleSubject: {
    en: "A time capsule has opened:", nl: "Een tijdcapsule is geopend:", de: "Eine Zeitkapsel wurde ge\u00f6ffnet:", es: "Una c\u00e1psula del tiempo se abri\u00f3:", fr: "Une capsule temporelle s'est ouverte :",
  },
  capsulePreheader: {
    en: ", your time capsule is ready to be revealed!",
    nl: ", je tijdcapsule is klaar om onthuld te worden!",
    de: ", deine Zeitkapsel ist bereit, enth\u00fcllt zu werden!",
    es: ", \u00a1tu c\u00e1psula del tiempo est\u00e1 lista!",
    fr: ", votre capsule temporelle est pr\u00eate !",
  },
  reminderLabel: {
    en: "Reminder", nl: "Herinnering", de: "Erinnerung", es: "Recordatorio", fr: "Rappel",
  },
  goalDeadlineNear: {
    en: "Your Goal Deadline Is Near", nl: "Je Doeldeadline Nadert", de: "Dein Zieltermin r\u00fcckt n\u00e4her", es: "Tu Fecha L\u00edmite se Acerca", fr: "La Date Limite Approche",
  },
  gentleReminder: {
    en: "A gentle reminder, {name} &mdash; your goal has a deadline approaching.",
    nl: "Een zachte herinnering, {name} &mdash; de deadline van je doel nadert.",
    de: "Eine sanfte Erinnerung, {name} &mdash; der Termin deines Ziels r\u00fcckt n\u00e4her.",
    es: "Un suave recordatorio, {name} &mdash; la fecha l\u00edmite de tu meta se acerca.",
    fr: "Un doux rappel, {name} &mdash; la date limite de votre objectif approche.",
  },
  tomorrow: {
    en: "tomorrow", nl: "morgen", de: "morgen", es: "ma\u00f1ana", fr: "demain",
  },
  inDays: {
    en: "in {n} days", nl: "over {n} dagen", de: "in {n} Tagen", es: "en {n} d\u00edas", fr: "dans {n} jours",
  },
  due: {
    en: "Due {when}", nl: "Deadline {when}", de: "F\u00e4llig {when}", es: "Vence {when}", fr: "\u00c9ch\u00e9ance {when}",
  },
  checkProgress: {
    en: "Take a moment to check in on your progress. Every step forward counts.",
    nl: "Neem even de tijd om je voortgang te bekijken. Elke stap telt.",
    de: "Nimm dir einen Moment, um deinen Fortschritt zu pr\u00fcfen. Jeder Schritt z\u00e4hlt.",
    es: "T\u00f3mate un momento para revisar tu progreso. Cada paso cuenta.",
    fr: "Prenez un moment pour v\u00e9rifier votre progression. Chaque \u00e9tape compte.",
  },
  checkProgressCta: {
    en: "Check your progress", nl: "Bekijk je voortgang", de: "Fortschritt pr\u00fcfen", es: "Revisa tu progreso", fr: "V\u00e9rifier votre progression",
  },
  weMissYou: {
    en: "We Miss You", nl: "We Missen Je", de: "Wir Vermissen Dich", es: "Te Extra\u00f1amos", fr: "Vous Nous Manquez",
  },
  palaceAwaits: {
    en: "Your Palace awaits", nl: "Je Paleis Wacht", de: "Dein Palast wartet", es: "Tu Palacio Te Espera", fr: "Votre Palais vous Attend",
  },
  beenTime: {
    en: "It has been {time} since your last visit, {name}.",
    nl: "Het is {time} geleden sinds je laatste bezoek, {name}.",
    de: "Es ist {time} seit deinem letzten Besuch her, {name}.",
    es: "Han pasado {time} desde tu \u00faltima visita, {name}.",
    fr: "Cela fait {time} depuis votre derni\u00e8re visite, {name}.",
  },
  memoriesWaiting: {
    en: "Your {count} memories are waiting for you.",
    nl: "Je {count} herinneringen wachten op je.",
    de: "Deine {count} Erinnerungen warten auf dich.",
    es: "Tus {count} recuerdos te esperan.",
    fr: "Vos {count} souvenirs vous attendent.",
  },
  memoryWaiting: {
    en: "Your memory is waiting for you.",
    nl: "Je herinnering wacht op je.",
    de: "Deine Erinnerung wartet auf dich.",
    es: "Tu recuerdo te espera.",
    fr: "Votre souvenir vous attend.",
  },
  bestTime: {
    en: "The best time to preserve a memory is the moment it happens.",
    nl: "Het beste moment om een herinnering te bewaren is het moment dat het gebeurt.",
    de: "Der beste Zeitpunkt, eine Erinnerung zu bewahren, ist der Moment, in dem sie geschieht.",
    es: "El mejor momento para preservar un recuerdo es el momento en que sucede.",
    fr: "Le meilleur moment pour pr\u00e9server un souvenir est le moment o\u00f9 il se produit.",
  },
  quickIdeas: {
    en: "Quick ideas to get started", nl: "Snelle idee\u00ebn om te beginnen", de: "Schnelle Ideen zum Anfangen", es: "Ideas r\u00e1pidas para empezar", fr: "Id\u00e9es rapides pour commencer",
  },
  ideaPhoto: {
    en: "Add a photo from this week", nl: "Voeg een foto van deze week toe", de: "F\u00fcge ein Foto dieser Woche hinzu", es: "A\u00f1ade una foto de esta semana", fr: "Ajoutez une photo de cette semaine",
  },
  ideaJournal: {
    en: "Write a quick journal entry", nl: "Schrijf een kort dagboekbericht", de: "Schreibe einen kurzen Tagebucheintrag", es: "Escribe una entrada r\u00e1pida en tu diario", fr: "\u00c9crivez une entr\u00e9e rapide dans votre journal",
  },
  ideaCapsule: {
    en: "Create a time capsule for the future", nl: "Maak een tijdcapsule voor de toekomst", de: "Erstelle eine Zeitkapsel f\u00fcr die Zukunft", es: "Crea una c\u00e1psula del tiempo para el futuro", fr: "Cr\u00e9ez une capsule temporelle pour l'avenir",
  },
  returnCta: {
    en: "Return to your Palace", nl: "Keer terug naar je Paleis", de: "Kehre zu deinem Palast zur\u00fcck", es: "Regresa a tu Palacio", fr: "Retournez \u00e0 votre Palais",
  },
  memoriesWaitingSubject: {
    en: "Your memories are waiting, {name}", nl: "Je herinneringen wachten, {name}", de: "Deine Erinnerungen warten, {name}", es: "Tus recuerdos te esperan, {name}", fr: "Vos souvenirs vous attendent, {name}",
  },
  aWeek: {
    en: "a week", nl: "een week", de: "eine Woche", es: "una semana", fr: "une semaine",
  },
  nWeeks: {
    en: "{n} weeks", nl: "{n} weken", de: "{n} Wochen", es: "{n} semanas", fr: "{n} semaines",
  },
  footerNotice: {
    en: "You received this because email notifications are enabled.",
    nl: "Je ontvangt dit bericht omdat e-mailmeldingen zijn ingeschakeld.",
    de: "Du erh\u00e4ltst diese E-Mail, weil Benachrichtigungen aktiviert sind.",
    es: "Recibes esto porque las notificaciones por correo est\u00e1n activadas.",
    fr: "Vous recevez ceci car les notifications par e-mail sont activ\u00e9es.",
  },
  unsubscribe: {
    en: "Unsubscribe from reminders", nl: "Uitschrijven van herinneringen", de: "Von Erinnerungen abmelden", es: "Cancelar suscripci\u00f3n a recordatorios", fr: "Se d\u00e9sabonner des rappels",
  },
  goalSubject: {
    en: "Reminder: \"{goal}\" deadline is {when}",
    nl: "Herinnering: deadline \"{goal}\" is {when}",
    de: "Erinnerung: Termin f\u00fcr \"{goal}\" ist {when}",
    es: "Recordatorio: fecha l\u00edmite de \"{goal}\" es {when}",
    fr: "Rappel : \u00e9ch\u00e9ance de \u00ab {goal} \u00bb est {when}",
  },

  // \u2500\u2500 Win-back (single calm knock \u2014 SPEC \u00a7D). Supersedes the old
  //    "we miss you" re_engagement copy above for the 30-day win-back path. \u2500\u2500
  wbSubject: {
    en: "Your palace is still here",
    nl: "Je paleis staat er nog",
    de: "Dein Palast steht noch",
    es: "Tu palacio sigue aqu\u00ed",
    fr: "Votre palais est toujours l\u00e0",
  },
  wbPreheader: {
    en: "Everything you kept is exactly where you left it.",
    nl: "Alles wat je bewaarde staat precies waar je het achterliet.",
    de: "Alles, was du bewahrt hast, ist genau dort, wo du es zur\u00fcckgelassen hast.",
    es: "Todo lo que guardaste est\u00e1 exactamente donde lo dejaste.",
    fr: "Tout ce que vous avez gard\u00e9 est exactement l\u00e0 o\u00f9 vous l\u2019avez laiss\u00e9.",
  },
  wbEyebrow: {
    en: "Still here", nl: "Nog steeds hier", de: "Immer noch da", es: "Sigue aqu\u00ed", fr: "Toujours l\u00e0",
  },
  wbTitle: {
    en: "The door is still open",
    nl: "De deur staat nog open",
    de: "Die T\u00fcr ist noch offen",
    es: "La puerta sigue abierta",
    fr: "La porte est toujours ouverte",
  },
  wbBody: {
    en: "{name}, it\u2019s been about a month \u2014 that\u2019s alright, the palace doesn\u2019t go anywhere. Everything you built is still standing: {count} across your wings, each one right where you left it. Whenever you\u2019re ready, there\u2019s a door.",
    nl: "{name}, het is ongeveer een maand geleden \u2014 dat is prima, het paleis gaat nergens heen. Alles wat je bouwde staat er nog: {count} verspreid over je vleugels, elk precies waar je het achterliet. Wanneer je er klaar voor bent, is er een deur.",
    de: "{name}, es ist etwa ein Monat her \u2014 das ist in Ordnung, der Palast geht nirgendwohin. Alles, was du gebaut hast, steht noch: {count} in deinen Fl\u00fcgeln, jede genau dort, wo du sie zur\u00fcckgelassen hast. Wann immer du bereit bist, es gibt eine T\u00fcr.",
    es: "{name}, ha pasado alrededor de un mes \u2014 est\u00e1 bien, el palacio no va a ninguna parte. Todo lo que construiste sigue en pie: {count} por tus alas, cada uno justo donde lo dejaste. Cuando est\u00e9s listo, hay una puerta.",
    fr: "{name}, cela fait environ un mois \u2014 ce n\u2019est rien, le palais ne bouge pas. Tout ce que vous avez b\u00e2ti tient toujours : {count} \u00e0 travers vos ailes, chacun l\u00e0 o\u00f9 vous l\u2019avez laiss\u00e9. Quand vous serez pr\u00eat, il y a une porte.",
  },
  wbMemoriesCount: {
    en: "<strong>{n} memories</strong>",
    nl: "<strong>{n} herinneringen</strong>",
    de: "<strong>{n} Erinnerungen</strong>",
    es: "<strong>{n} recuerdos</strong>",
    fr: "<strong>{n} souvenirs</strong>",
  },
  wbMemoryCountSingular: {
    en: "<strong>one memory</strong>",
    nl: "<strong>\u00e9\u00e9n herinnering</strong>",
    de: "<strong>eine Erinnerung</strong>",
    es: "<strong>un recuerdo</strong>",
    fr: "<strong>un souvenir</strong>",
  },
  wbCta: {
    en: "Walk back in",
    nl: "Loop weer naar binnen",
    de: "Komm wieder herein",
    es: "Vuelve a entrar",
    fr: "Revenez",
  },
  wbUnsubNote: {
    en: "If you\u2019d rather not hear from us, you can unsubscribe below \u2014 no hard feelings.",
    nl: "Als je liever niets meer van ons hoort, kun je je hieronder uitschrijven \u2014 geen probleem.",
    de: "Wenn du lieber nichts mehr von uns h\u00f6ren m\u00f6chtest, kannst du dich unten abmelden \u2014 ganz ohne Groll.",
    es: "Si prefieres no saber m\u00e1s de nosotros, puedes cancelar la suscripci\u00f3n abajo \u2014 sin resentimientos.",
    fr: "Si vous pr\u00e9f\u00e9rez ne plus recevoir de nos nouvelles, vous pouvez vous d\u00e9sabonner ci-dessous \u2014 sans rancune.",
  },
};

function r(key: string, locale: Locale): string {
  return rt[key]?.[locale] || rt[key]?.en || key;
}

type ReminderType = "time_capsule_reveal" | "goal_deadline" | "re_engagement";

interface BaseReminderParams {
  recipientEmail: string;
  displayName: string;
  locale?: string;
}

interface TimeCapsuleRevealParams extends BaseReminderParams {
  type: "time_capsule_reveal";
  capsuleTitle: string;
}

interface GoalDeadlineParams extends BaseReminderParams {
  type: "goal_deadline";
  goalTitle: string;
  daysRemaining: number;
}

interface ReEngagementParams extends BaseReminderParams {
  type: "re_engagement";
  daysSinceLogin: number;
  memoryCount: number;
  /**
   * When present, the unsubscribe link is an HMAC-signed token (IDOR-safe per
   * SPEC §E) instead of the legacy raw-email link. The win-back path passes it.
   */
  userId?: string;
}

export type ReminderEmailParams =
  | TimeCapsuleRevealParams
  | GoalDeadlineParams
  | ReEngagementParams;

function resolveLocale(locale?: string): Locale {
  if (locale && (locale === "en" || locale === "nl" || locale === "de" || locale === "es" || locale === "fr")) {
    return locale;
  }
  return "en";
}

function getContent(params: ReminderEmailParams): {
  subject: string;
  preheader: string;
  headerHtml: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  locale: Locale;
} {
  const locale = resolveLocale(params.locale);
  const displayName = escapeHtml(params.displayName);
  const siteUrl = getSiteUrl();

  switch (params.type) {
    case "time_capsule_reveal": {
      const title = escapeHtml(params.capsuleTitle);
      return {
        locale,
        subject: `${r("capsuleSubject", locale)} "${params.capsuleTitle}"`,
        preheader: `${params.displayName}${r("capsulePreheader", locale)}`,
        headerHtml: `
          <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
            ${r("timeCapsuleLabel", locale)}
          </p>
          <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
            ${r("capsuleOpened", locale)}
          </h1>`,
        bodyHtml: `
          <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
            ${displayName}${r("waitIsOver", locale)}
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td class="section-bg" style="padding:28px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
            <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:10px;color:#B8A99A;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
              ${r("nowOpen", locale)}
            </p>
            <p class="text-primary" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:500;color:#2C2C2A;font-style:italic;">
              &ldquo;${title}&rdquo;
            </p>
          </td></tr>
          </table>

          <p class="text-secondary" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.7;">
            ${r("openToRediscover", locale)}
          </p>`,
        ctaText: r("openCapsuleCta", locale),
        ctaUrl: `${siteUrl}/palace`,
      };
    }

    case "goal_deadline": {
      const goal = escapeHtml(params.goalTitle);
      const daysText = params.daysRemaining === 1
        ? r("tomorrow", locale)
        : r("inDays", locale).replace("{n}", `${params.daysRemaining}`);
      return {
        locale,
        subject: r("goalSubject", locale).replace("{goal}", params.goalTitle).replace("{when}", daysText),
        preheader: r("goalSubject", locale).replace("{goal}", params.goalTitle).replace("{when}", daysText),
        headerHtml: `
          <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
            ${r("reminderLabel", locale)}
          </p>
          <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
            ${r("goalDeadlineNear", locale)}
          </h1>`,
        bodyHtml: `
          <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
            ${r("gentleReminder", locale).replace("{name}", displayName)}
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td class="section-bg" style="padding:28px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
            <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:500;color:#2C2C2A;font-style:italic;">
              &ldquo;${goal}&rdquo;
            </p>
            <span style="display:inline-block;padding:4px 14px;border:1px solid #D4C5B2;border-radius:2px;font-family:Georgia,'Times New Roman',serif;font-size:10px;font-weight:600;color:#8B7355;letter-spacing:1.2px;text-transform:uppercase;">
              ${r("due", locale).replace("{when}", daysText)}
            </span>
          </td></tr>
          </table>

          <p class="text-secondary" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.7;">
            ${r("checkProgress", locale)}
          </p>`,
        ctaText: r("checkProgressCta", locale),
        ctaUrl: `${siteUrl}/palace`,
      };
    }

    case "re_engagement": {
      // Restyled to the calm single-knock win-back (SPEC §D + §A tokens).
      const countPhrase = params.memoryCount === 1
        ? r("wbMemoryCountSingular", locale)
        : r("wbMemoriesCount", locale).replace("{n}", `${params.memoryCount}`);
      const bodyText = r("wbBody", locale)
        .replace("{name}", displayName)
        .replace("{count}", countPhrase);
      return {
        locale,
        subject: r("wbSubject", locale),
        preheader: r("wbPreheader", locale),
        headerHtml: `
          <p style="margin:0 0 16px;font-family:'Source Sans 3',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#716A5E;letter-spacing:0.18em;text-transform:uppercase;">
            ${r("wbEyebrow", locale)}
          </p>
          <h1 class="header-title" style="margin:0;font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#2E2A26;line-height:1.25;">
            ${r("wbTitle", locale)}
          </h1>`,
        bodyHtml: `
          <p class="text-primary" style="margin:0 0 24px;font-family:'Source Sans 3',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#403B36;line-height:1.8;">
            ${bodyText}
          </p>

          ${ornamentalDivider()}

          <p class="text-muted" style="margin:20px 0 0;font-family:'Source Sans 3',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#716A5E;line-height:1.7;font-style:italic;text-align:center;">
            ${r("wbUnsubNote", locale)}
          </p>`,
        ctaText: r("wbCta", locale),
        ctaUrl: `${siteUrl}/palace`,
      };
    }
  }
}

/**
 * Build the unsubscribe URL. When the caller supplies a userId (win-back path),
 * use an HMAC-signed token (IDOR-safe, SPEC §E). Otherwise fall back to the
 * legacy raw-email link that the unsubscribe route still honors.
 */
function reminderUnsubUrl(params: ReminderEmailParams): string {
  const base = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true`;
  if (params.type === "re_engagement" && params.userId) {
    return `${base}&uid=${signUnsubscribeToken(params.userId)}`;
  }
  return `${base}&email=${encodeURIComponent(params.recipientEmail)}`;
}

export function generateReminderEmailHtml(params: ReminderEmailParams): string {
  const content = getContent(params);
  const { preheader, headerHtml, bodyHtml, ctaText, ctaUrl, locale } = content;
  const unsubscribeUrl = reminderUnsubUrl(params);

  return emailLayout({
    preheader,
    headerHtml,
    bodyHtml,
    ctaText,
    ctaUrl,
    locale,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:'Source Sans 3',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#716A5E;">
        ${r("footerNotice", locale)}
      </p>
      <a href="${unsubscribeUrl}" style="font-family:'Source Sans 3',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#716A5E;text-decoration:underline;">
        ${r("unsubscribe", locale)}
      </a>`,
  });
}

export function generateReminderEmailSubject(params: ReminderEmailParams): string {
  return getContent(params).subject;
}

export async function sendReminderEmail(params: ReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { subject } = getContent(params);
  const unsubscribeUrl = reminderUnsubUrl(params);

  return sendEmail({
    to: params.recipientEmail,
    subject,
    html: generateReminderEmailHtml(params),
    tag: "reminder",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
