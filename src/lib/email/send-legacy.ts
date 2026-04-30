import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

// ── i18n translations for legacy emails ──

type Locale = "en" | "nl" | "de" | "es" | "fr";

const t = {
  verification: {
    preheader: {
      en: (name: string) => `${name}, please confirm you're still active. Your legacy contacts will be notified otherwise.`,
      nl: (name: string) => `${name}, bevestig alstublieft dat u nog actief bent. Anders worden uw nabestaanden-contacten op de hoogte gebracht.`,
      de: (name: string) => `${name}, bitte best\u00e4tige, dass du noch aktiv bist. Andernfalls werden deine Nachlassempf\u00e4nger benachrichtigt.`,
      es: (name: string) => `${name}, por favor confirma que sigues activo. De lo contrario, tus contactos de legado ser\u00e1n notificados.`,
      fr: (name: string) => `${name}, veuillez confirmer que vous \u00eates toujours actif. Sinon, vos contacts de legs seront notifi\u00e9s.`,
    },
    headerLabel: {
      en: "Legacy Check-In",
      nl: "Nalatenschap Check-In",
      de: "Nachlass-Check-In",
      es: "Verificaci\u00f3n de Legado",
      fr: "V\u00e9rification de Legs",
    },
    headerTitle: {
      en: (name: string) => `A check-in from your Memory Palace, ${name}`,
      nl: (name: string) => `Een check-in vanuit uw Memory Palace, ${name}`,
      de: (name: string) => `Ein Check-in von deinem Memory Palace, ${name}`,
      es: (name: string) => `Un check-in de tu Memory Palace, ${name}`,
      fr: (name: string) => `Un rappel de votre Memory Palace, ${name}`,
    },
    bodyInactive: {
      en: (days: number) => `We noticed you have not visited your Memory Palace in <strong>${days} days</strong>.`,
      nl: (days: number) => `We merkten op dat u uw Memory Palace al <strong>${days} dagen</strong> niet hebt bezocht.`,
      de: (days: number) => `Uns ist aufgefallen, dass du deinen Memory Palace seit <strong>${days} Tagen</strong> nicht besucht hast.`,
      es: (days: number) => `Hemos notado que no has visitado tu Memory Palace en <strong>${days} d\u00edas</strong>.`,
      fr: (days: number) => `Nous avons remarqu\u00e9 que vous n\u2019avez pas visit\u00e9 votre Memory Palace depuis <strong>${days} jours</strong>.`,
    },
    bodyExplain: {
      en: "Your legacy contacts are configured to receive your memories if you become inactive. To confirm you are still here and reset this timer, please click the button below.",
      nl: "Uw nabestaanden-contacten zijn ingesteld om uw herinneringen te ontvangen als u inactief wordt. Klik op de onderstaande knop om te bevestigen dat u er nog bent en de timer opnieuw in te stellen.",
      de: "Deine Nachlassempf\u00e4nger sind so konfiguriert, dass sie deine Erinnerungen erhalten, wenn du inaktiv wirst. Um zu best\u00e4tigen, dass du noch da bist und den Timer zur\u00fcckzusetzen, klicke bitte auf die Schaltfl\u00e4che unten.",
      es: "Tus contactos de legado est\u00e1n configurados para recibir tus recuerdos si te vuelves inactivo. Para confirmar que sigues aqu\u00ed y reiniciar el temporizador, haz clic en el bot\u00f3n de abajo.",
      fr: "Vos contacts de legs sont configur\u00e9s pour recevoir vos souvenirs si vous devenez inactif. Pour confirmer que vous \u00eates toujours l\u00e0 et r\u00e9initialiser le minuteur, veuillez cliquer sur le bouton ci-dessous.",
    },
    boxWarning: {
      en: "If we do not hear from you within 30 days, your legacy messages and shared memories will be delivered to your designated contacts.",
      nl: "Als we binnen 30 dagen niets van u horen, worden uw nalatenschapsberichten en gedeelde herinneringen bezorgd aan uw aangewezen contacten.",
      de: "Wenn wir innerhalb von 30 Tagen nichts von dir h\u00f6ren, werden deine Nachlassnachrichten und geteilten Erinnerungen an deine bestimmten Kontakte zugestellt.",
      es: "Si no tenemos noticias tuyas en 30 d\u00edas, tus mensajes de legado y recuerdos compartidos ser\u00e1n entregados a tus contactos designados.",
      fr: "Si nous n\u2019avons pas de vos nouvelles dans les 30 jours, vos messages de legs et souvenirs partag\u00e9s seront transmis \u00e0 vos contacts d\u00e9sign\u00e9s.",
    },
    ctaText: {
      en: "I\u2019m Still Here",
      nl: "Ik Ben Er Nog",
      de: "Ich bin noch da",
      es: "Sigo aqu\u00ed",
      fr: "Je suis toujours l\u00e0",
    },
    footerNote: {
      en: "You received this because you have legacy delivery enabled.",
      nl: "U ontvangt dit bericht omdat u nalatenschapsbezorging hebt ingeschakeld.",
      de: "Du erh\u00e4ltst diese E-Mail, weil du die Nachlass-Zustellung aktiviert hast.",
      es: "Recibes este mensaje porque tienes activada la entrega de legado.",
      fr: "Vous recevez cet e-mail car vous avez activ\u00e9 la livraison de legs.",
    },
    subject: {
      en: (name: string) => `A check-in from your Memory Palace, ${name}`,
      nl: (name: string) => `Een check-in vanuit uw Memory Palace, ${name}`,
      de: (name: string) => `Ein Check-in von deinem Memory Palace, ${name}`,
      es: (name: string) => `Un check-in de tu Memory Palace, ${name}`,
      fr: (name: string) => `Un rappel de votre Memory Palace, ${name}`,
    },
  },

  verifier: {
    preheader: {
      en: (userName: string) => `${userName} has been inactive — their legacy plan may be activated.`,
      nl: (userName: string) => `${userName} is inactief geweest — hun nalatenschapsplan kan worden geactiveerd.`,
      de: (userName: string) => `${userName} war inaktiv — ihr Nachlassplan k\u00f6nnte aktiviert werden.`,
      es: (userName: string) => `${userName} ha estado inactivo — su plan de legado podr\u00eda activarse.`,
      fr: (userName: string) => `${userName} a \u00e9t\u00e9 inactif — leur plan de legs pourrait \u00eatre activ\u00e9.`,
    },
    headerLabel: {
      en: "Trusted Verifier Notice",
      nl: "Vertrouwde Verificateur Melding",
      de: "Mitteilung f\u00fcr Vertrauensperson",
      es: "Aviso de Verificador de Confianza",
      fr: "Avis au V\u00e9rificateur de Confiance",
    },
    headerTitle: {
      en: (userName: string) => `Regarding ${userName}`,
      nl: (userName: string) => `Betreffende ${userName}`,
      de: (userName: string) => `Betrifft ${userName}`,
      es: (userName: string) => `Sobre ${userName}`,
      fr: (userName: string) => `Concernant ${userName}`,
    },
    greeting: {
      en: (name: string) => `Dear ${name},`,
      nl: (name: string) => `Beste ${name},`,
      de: (name: string) => `Liebe/r ${name},`,
      es: (name: string) => `Estimado/a ${name},`,
      fr: (name: string) => `Cher/Ch\u00e8re ${name},`,
    },
    bodyDesignated: {
      en: (userName: string, days: number) => `${userName} designated you as their <strong>trusted verifier</strong> in their Memory Palace. They have not visited their palace in <strong>${days} days</strong>, which has triggered their legacy plan.`,
      nl: (userName: string, days: number) => `${userName} heeft u aangewezen als <strong>vertrouwde verificateur</strong> in hun Memory Palace. Ze hebben hun paleis al <strong>${days} dagen</strong> niet bezocht, waardoor hun nalatenschapsplan is geactiveerd.`,
      de: (userName: string, days: number) => `${userName} hat dich als <strong>Vertrauensperson</strong> in ihrem Memory Palace bestimmt. Sie haben ihren Palast seit <strong>${days} Tagen</strong> nicht besucht, was ihren Nachlassplan ausgel\u00f6st hat.`,
      es: (userName: string, days: number) => `${userName} te design\u00f3 como su <strong>verificador de confianza</strong> en su Memory Palace. No han visitado su palacio en <strong>${days} d\u00edas</strong>, lo que ha activado su plan de legado.`,
      fr: (userName: string, days: number) => `${userName} vous a d\u00e9sign\u00e9 comme <strong>v\u00e9rificateur de confiance</strong> dans leur Memory Palace. Ils n\u2019ont pas visit\u00e9 leur palais depuis <strong>${days} jours</strong>, ce qui a d\u00e9clench\u00e9 leur plan de legs.`,
    },
    bodyIfWell: {
      en: (userName: string) => `If ${userName} is still well and simply hasn\u2019t logged in, you can confirm on their behalf by clicking the button below. This will reset their inactivity timer and prevent the legacy delivery.`,
      nl: (userName: string) => `Als ${userName} nog in goede gezondheid verkeert en simpelweg niet heeft ingelogd, kunt u namens hen bevestigen door op de onderstaande knop te klikken. Dit reset de inactiviteitstimer en voorkomt de nalatenschapsbezorging.`,
      de: (userName: string) => `Falls ${userName} wohlauf ist und sich einfach nicht eingeloggt hat, kannst du dies in ihrem Namen best\u00e4tigen, indem du auf die Schaltfl\u00e4che unten klickst. Dies setzt den Inaktivit\u00e4ts-Timer zur\u00fcck und verhindert die Nachlass-Zustellung.`,
      es: (userName: string) => `Si ${userName} est\u00e1 bien y simplemente no ha iniciado sesi\u00f3n, puedes confirmar en su nombre haciendo clic en el bot\u00f3n de abajo. Esto reiniciar\u00e1 su temporizador de inactividad y evitar\u00e1 la entrega del legado.`,
      fr: (userName: string) => `Si ${userName} va bien et ne s\u2019est simplement pas connect\u00e9, vous pouvez confirmer en leur nom en cliquant sur le bouton ci-dessous. Cela r\u00e9initialisera leur minuteur d\u2019inactivit\u00e9 et emp\u00eachera la livraison du legs.`,
    },
    bodyIfDeceased: {
      en: (userName: string) => `If ${userName} has indeed passed away or become incapacitated, you do not need to take any action. Their legacy messages will be delivered to their designated contacts after the grace period.`,
      nl: (userName: string) => `Als ${userName} inderdaad is overleden of wilsonbekwaam is geworden, hoeft u geen actie te ondernemen. Hun nalatenschapsberichten worden na de wachttijd bezorgd aan hun aangewezen contacten.`,
      de: (userName: string) => `Falls ${userName} tats\u00e4chlich verstorben oder handlungsunf\u00e4hig geworden ist, m\u00fcssen Sie nichts unternehmen. Ihre Nachlassnachrichten werden nach Ablauf der Frist an ihre bestimmten Kontakte zugestellt.`,
      es: (userName: string) => `Si ${userName} efectivamente ha fallecido o se ha incapacitado, no necesitas hacer nada. Sus mensajes de legado ser\u00e1n entregados a sus contactos designados despu\u00e9s del per\u00edodo de gracia.`,
      fr: (userName: string) => `Si ${userName} est effectivement d\u00e9c\u00e9d\u00e9 ou devenu inapte, vous n\u2019avez rien \u00e0 faire. Leurs messages de legs seront transmis \u00e0 leurs contacts d\u00e9sign\u00e9s apr\u00e8s le d\u00e9lai de gr\u00e2ce.`,
    },
    boxWarning: {
      en: (userName: string) => `If you do not take action, ${userName}\u2019s legacy messages and shared memories will be delivered to their designated contacts in 30 days.`,
      nl: (userName: string) => `Als u geen actie onderneemt, worden de nalatenschapsberichten en gedeelde herinneringen van ${userName} binnen 30 dagen bezorgd aan hun aangewezen contacten.`,
      de: (userName: string) => `Wenn du nicht handelst, werden die Nachlassnachrichten und geteilten Erinnerungen von ${userName} in 30 Tagen an ihre bestimmten Kontakte zugestellt.`,
      es: (userName: string) => `Si no tomas acci\u00f3n, los mensajes de legado y recuerdos compartidos de ${userName} ser\u00e1n entregados a sus contactos designados en 30 d\u00edas.`,
      fr: (userName: string) => `Si vous n\u2019agissez pas, les messages de legs et souvenirs partag\u00e9s de ${userName} seront transmis \u00e0 leurs contacts d\u00e9sign\u00e9s dans 30 jours.`,
    },
    ctaText: {
      en: (userName: string) => `Confirm ${userName} Is Well`,
      nl: (userName: string) => `Bevestig dat ${userName} in orde is`,
      de: (userName: string) => `Best\u00e4tigen, dass ${userName} wohlauf ist`,
      es: (userName: string) => `Confirmar que ${userName} est\u00e1 bien`,
      fr: (userName: string) => `Confirmer que ${userName} va bien`,
    },
    footerNote: {
      en: (userName: string) => `You received this because ${userName} designated you as their trusted verifier.`,
      nl: (userName: string) => `U ontvangt dit bericht omdat ${userName} u heeft aangewezen als vertrouwde verificateur.`,
      de: (userName: string) => `Du erh\u00e4ltst diese E-Mail, weil ${userName} dich als Vertrauensperson bestimmt hat.`,
      es: (userName: string) => `Recibes este mensaje porque ${userName} te design\u00f3 como su verificador de confianza.`,
      fr: (userName: string) => `Vous recevez cet e-mail car ${userName} vous a d\u00e9sign\u00e9 comme v\u00e9rificateur de confiance.`,
    },
    subject: {
      en: (userName: string) => `Trusted Verifier Notice: ${userName} has been inactive`,
      nl: (userName: string) => `Vertrouwde Verificateur Melding: ${userName} is inactief geweest`,
      de: (userName: string) => `Mitteilung f\u00fcr Vertrauensperson: ${userName} war inaktiv`,
      es: (userName: string) => `Aviso de Verificador de Confianza: ${userName} ha estado inactivo`,
      fr: (userName: string) => `Avis au V\u00e9rificateur de Confiance : ${userName} a \u00e9t\u00e9 inactif`,
    },
  },

  delivery: {
    preheader: {
      en: (senderName: string) => `${senderName} left a message for you in their Memory Palace.`,
      nl: (senderName: string) => `${senderName} heeft een bericht voor u achtergelaten in hun Memory Palace.`,
      de: (senderName: string) => `${senderName} hat eine Nachricht f\u00fcr dich in ihrem Memory Palace hinterlassen.`,
      es: (senderName: string) => `${senderName} te dej\u00f3 un mensaje en su Memory Palace.`,
      fr: (senderName: string) => `${senderName} vous a laiss\u00e9 un message dans leur Memory Palace.`,
    },
    headerLabel: {
      en: "A Legacy Message",
      nl: "Een Nalatenschapsbericht",
      de: "Eine Nachlass-Nachricht",
      es: "Un Mensaje de Legado",
      fr: "Un Message de Legs",
    },
    headerTitle: {
      en: (senderName: string) => `From ${senderName}`,
      nl: (senderName: string) => `Van ${senderName}`,
      de: (senderName: string) => `Von ${senderName}`,
      es: (senderName: string) => `De ${senderName}`,
      fr: (senderName: string) => `De ${senderName}`,
    },
    headerSubtitle: {
      en: "Left for you in their Memory Palace",
      nl: "Voor u achtergelaten in hun Memory Palace",
      de: "F\u00fcr dich in ihrem Memory Palace hinterlassen",
      es: "Dejado para ti en su Memory Palace",
      fr: "Laiss\u00e9 pour vous dans leur Memory Palace",
    },
    greeting: {
      en: (name: string) => `Dear ${name},`,
      nl: (name: string) => `Beste ${name},`,
      de: (name: string) => `Liebe/r ${name},`,
      es: (name: string) => `Estimado/a ${name},`,
      fr: (name: string) => `Cher/Ch\u00e8re ${name},`,
    },
    bodyIntro: {
      en: (senderName: string) => `${senderName} prepared this message for you in their Memory Palace, to be delivered as part of their digital legacy.`,
      nl: (senderName: string) => `${senderName} heeft dit bericht voor u voorbereid in hun Memory Palace, om bezorgd te worden als onderdeel van hun digitale nalatenschap.`,
      de: (senderName: string) => `${senderName} hat diese Nachricht f\u00fcr dich in ihrem Memory Palace vorbereitet, um als Teil ihres digitalen Nachlasses zugestellt zu werden.`,
      es: (senderName: string) => `${senderName} prepar\u00f3 este mensaje para ti en su Memory Palace, para ser entregado como parte de su legado digital.`,
      fr: (senderName: string) => `${senderName} a pr\u00e9par\u00e9 ce message pour vous dans leur Memory Palace, \u00e0 transmettre dans le cadre de leur legs num\u00e9rique.`,
    },
    empathyNote: {
      en: "We understand this may be an emotional moment. These memories were chosen with care.",
      nl: "We begrijpen dat dit een emotioneel moment kan zijn. Deze herinneringen zijn met zorg gekozen.",
      de: "Wir verstehen, dass dies ein emotionaler Moment sein kann. Diese Erinnerungen wurden mit Sorgfalt ausgew\u00e4hlt.",
      es: "Entendemos que este puede ser un momento emotivo. Estos recuerdos fueron elegidos con cuidado.",
      fr: "Nous comprenons que cela peut \u00eatre un moment \u00e9mouvant. Ces souvenirs ont \u00e9t\u00e9 choisis avec soin.",
    },
    takeYourTime: {
      en: "Take your time with these memories. There is no rush.",
      nl: "Neem de tijd voor deze herinneringen. Er is geen haast.",
      de: "Nimm dir Zeit f\u00fcr diese Erinnerungen. Es eilt nicht.",
      es: "T\u00f3mate tu tiempo con estos recuerdos. No hay prisa.",
      fr: "Prenez votre temps avec ces souvenirs. Rien ne presse.",
    },
    sharedMemories: {
      en: (senderName: string, expiresDate: string) => `${senderName} also shared some of their memories with you. You can view them using the link below. This link expires on ${expiresDate}.`,
      nl: (senderName: string, expiresDate: string) => `${senderName} heeft ook een aantal herinneringen met u gedeeld. U kunt deze bekijken via de onderstaande link. Deze link verloopt op ${expiresDate}.`,
      de: (senderName: string, expiresDate: string) => `${senderName} hat auch einige Erinnerungen mit dir geteilt. Du kannst sie \u00fcber den folgenden Link ansehen. Dieser Link l\u00e4uft am ${expiresDate} ab.`,
      es: (senderName: string, expiresDate: string) => `${senderName} tambi\u00e9n comparti\u00f3 algunos de sus recuerdos contigo. Puedes verlos usando el enlace de abajo. Este enlace caduca el ${expiresDate}.`,
      fr: (senderName: string, expiresDate: string) => `${senderName} a \u00e9galement partag\u00e9 certains de ses souvenirs avec vous. Vous pouvez les consulter via le lien ci-dessous. Ce lien expire le ${expiresDate}.`,
    },
    ctaText: {
      en: "View Shared Memories",
      nl: "Bekijk Gedeelde Herinneringen",
      de: "Geteilte Erinnerungen ansehen",
      es: "Ver Recuerdos Compartidos",
      fr: "Voir les Souvenirs Partag\u00e9s",
    },
    footerNote: {
      en: "This is a one-time legacy delivery. No further emails will be sent.",
      nl: "Dit is een eenmalige nalatenschapsbezorging. Er worden geen verdere e-mails verzonden.",
      de: "Dies ist eine einmalige Nachlass-Zustellung. Es werden keine weiteren E-Mails gesendet.",
      es: "Esta es una entrega de legado \u00fanica. No se enviar\u00e1n m\u00e1s correos electr\u00f3nicos.",
      fr: "Ceci est une livraison de legs unique. Aucun autre e-mail ne sera envoy\u00e9.",
    },
    subject: {
      en: (senderName: string) => `A legacy message from ${senderName}`,
      nl: (senderName: string) => `Een nalatenschapsbericht van ${senderName}`,
      de: (senderName: string) => `Eine Nachlass-Nachricht von ${senderName}`,
      es: (senderName: string) => `Un mensaje de legado de ${senderName}`,
      fr: (senderName: string) => `Un message de legs de ${senderName}`,
    },
  },
} as const;

function resolveLocale(locale?: string): Locale {
  if (locale && (locale === "en" || locale === "nl" || locale === "de" || locale === "es" || locale === "fr")) {
    return locale;
  }
  return "en";
}

// ── Verification email (sent to the inactive user) ──

interface VerificationEmailParams {
  recipientEmail: string;
  displayName: string;
  inactiveDays: number;
  verificationToken: string;
  locale?: string;
}

export function generateVerificationEmailHtml(params: VerificationEmailParams): string {
  const locale = resolveLocale(params.locale);
  const displayName = escapeHtml(params.displayName);
  const verifyUrl = `${getSiteUrl()}/api/legacy/verify?token=${encodeURIComponent(params.verificationToken)}&type=user`;

  return emailLayout({
    preheader: t.verification.preheader[locale](params.displayName),
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
        ${t.verification.headerLabel[locale]}
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
        ${t.verification.headerTitle[locale](displayName)}
      </h1>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
        ${t.verification.bodyInactive[locale](params.inactiveDays)}
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${t.verification.bodyExplain[locale]}
      </p>

      ${ornamentalDivider()}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      <tr><td class="section-bg" style="padding:20px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;">
        <p class="text-muted" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#9A9183;line-height:1.7;">
          ${t.verification.boxWarning[locale]}
        </p>
      </td></tr>
      </table>`,
    ctaText: t.verification.ctaText[locale],
    ctaUrl: verifyUrl,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#D4C5B2;">
        ${t.verification.footerNote[locale]}
      </p>`,
  });
}

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = resolveLocale(params.locale);
  return sendEmail({
    to: params.recipientEmail,
    subject: t.verification.subject[locale](params.displayName),
    html: generateVerificationEmailHtml(params),
    tag: "legacy-verification",
  });
}

// ── Trusted verifier notification email ──

interface TrustedVerifierEmailParams {
  recipientEmail: string;
  recipientName: string;
  userName: string;
  inactiveDays: number;
  verificationToken: string;
  locale?: string;
}

export function generateTrustedVerifierEmailHtml(params: TrustedVerifierEmailParams): string {
  const locale = resolveLocale(params.locale);
  const recipientName = escapeHtml(params.recipientName);
  const userName = escapeHtml(params.userName);
  const verifyUrl = `${getSiteUrl()}/api/legacy/verify?token=${encodeURIComponent(params.verificationToken)}&type=verifier`;

  return emailLayout({
    preheader: t.verifier.preheader[locale](params.userName),
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
        ${t.verifier.headerLabel[locale]}
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
        ${t.verifier.headerTitle[locale](userName)}
      </h1>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
        ${t.verifier.greeting[locale](recipientName)}
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${t.verifier.bodyDesignated[locale](userName, params.inactiveDays)}
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${t.verifier.bodyIfWell[locale](userName)}
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;font-style:italic;">
        ${t.verifier.bodyIfDeceased[locale](userName)}
      </p>

      ${ornamentalDivider()}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      <tr><td class="section-bg" style="padding:20px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;">
        <p class="text-muted" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#9A9183;line-height:1.7;">
          ${t.verifier.boxWarning[locale](userName)}
        </p>
      </td></tr>
      </table>`,
    ctaText: t.verifier.ctaText[locale](userName),
    ctaUrl: verifyUrl,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#D4C5B2;">
        ${t.verifier.footerNote[locale](userName)}
      </p>`,
  });
}

export async function sendTrustedVerifierEmail(params: TrustedVerifierEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = resolveLocale(params.locale);
  return sendEmail({
    to: params.recipientEmail,
    subject: t.verifier.subject[locale](params.userName),
    html: generateTrustedVerifierEmailHtml(params),
    tag: "legacy-verifier",
  });
}

// ── Legacy delivery email (sent to contacts) ──

interface LegacyDeliveryEmailParams {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messageSubject: string;
  messageBody: string;
  accessToken: string;
  expiresAt: string;
  locale?: string;
}

export function generateDeliveryEmailHtml(params: LegacyDeliveryEmailParams): string {
  const locale = resolveLocale(params.locale);
  const recipientName = escapeHtml(params.recipientName);
  const senderName = escapeHtml(params.senderName);
  const messageSubject = escapeHtml(params.messageSubject);
  const messageBody = escapeHtml(params.messageBody).replace(/\n/g, "<br>");
  const accessUrl = `${getSiteUrl()}/legacy/${encodeURIComponent(params.accessToken)}`;
  const localeMap: Record<Locale, string> = { en: "en-US", nl: "nl-NL", de: "de-DE", es: "es-ES", fr: "fr-FR" };
  const expiresDate = new Date(params.expiresAt).toLocaleDateString(
    localeMap[locale],
    { year: "numeric", month: "long", day: "numeric" }
  );

  return emailLayout({
    preheader: t.delivery.preheader[locale](params.senderName),
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
        ${t.delivery.headerLabel[locale]}
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
        ${t.delivery.headerTitle[locale](senderName)}
      </h1>
      <p class="header-subtitle" style="margin:14px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#8B7355;line-height:1.6;font-style:italic;">
        ${t.delivery.headerSubtitle[locale]}
      </p>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:#2C2C2A;line-height:1.5;">
        ${t.delivery.greeting[locale](recipientName)}
      </p>
      <p class="text-secondary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${t.delivery.bodyIntro[locale](senderName)}
      </p>

      <p class="text-secondary" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;font-style:italic;">
        ${t.delivery.empathyNote[locale]}
      </p>
      <p class="text-secondary" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;font-style:italic;">
        ${t.delivery.takeYourTime[locale]}
      </p>

      ${messageSubject ? `
      <p class="text-primary" style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:600;color:#2C2C2A;">
        ${messageSubject}
      </p>` : ""}

      <!-- The message itself -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr><td style="padding:28px 32px;border-left:3px solid #D4AF37;">
        <p class="text-primary" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
          ${messageBody}
        </p>
      </td></tr>
      </table>

      ${ornamentalDivider()}

      <p class="text-muted" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#9A9183;line-height:1.7;">
        ${t.delivery.sharedMemories[locale](senderName, expiresDate)}
      </p>`,
    ctaText: t.delivery.ctaText[locale],
    ctaUrl: accessUrl,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#D4C5B2;">
        ${t.delivery.footerNote[locale]}
      </p>`,
  });
}

export async function sendDeliveryEmail(params: LegacyDeliveryEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = resolveLocale(params.locale);
  return sendEmail({
    to: params.recipientEmail,
    subject: t.delivery.subject[locale](params.senderName),
    html: generateDeliveryEmailHtml(params),
    tag: "legacy-delivery",
  });
}

// ── Trustee welcome email (sent when user assigns a legacy contact) ──

interface TrusteeWelcomeEmailParams {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  relationship?: string | null;
  locale?: string;
}

export async function sendTrusteeWelcomeEmail(params: TrusteeWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = resolveLocale(params.locale);
  const recipientName = escapeHtml(params.recipientName || "there");
  const senderName = escapeHtml(params.senderName);
  const relationship = params.relationship ? escapeHtml(params.relationship) : "";

  const copies: Record<Locale, {
    preheader: string; label: string; title: string; greeting: string;
    intro: string; explain: string; whatHappens: string; footer: string;
    cta: string; subject: string;
  }> = {
    en: {
      preheader: `${params.senderName} named you as a legacy contact in their Memory Palace.`,
      label: "A Role of Trust",
      title: `${senderName} has named you as a legacy contact`,
      greeting: `Dear ${recipientName},`,
      intro: `<strong>${senderName}</strong> has designated you as one of their <strong>legacy contacts</strong> in The Memory Palace${relationship ? ` \u2014 as their ${relationship}` : ""}.`,
      explain: `A legacy contact is someone ${senderName} trusts to receive their memories, messages and selected parts of their palace if they ever become unable to maintain it themselves. No action is needed from you today.`,
      whatHappens: `If ${senderName} becomes inactive for an extended period, you will receive a separate email with access to the memories and messages they have prepared for you.`,
      footer: `You received this because ${senderName} named you a legacy contact. You can opt out by replying to this email.`,
      cta: "Learn about The Memory Palace",
      subject: `${params.senderName} has named you as a legacy contact`,
    },
    nl: {
      preheader: `${params.senderName} heeft u aangewezen als nalatenschapscontact in hun Memory Palace.`,
      label: "Een rol van vertrouwen",
      title: `${senderName} heeft u aangewezen als nalatenschapscontact`,
      greeting: `Beste ${recipientName},`,
      intro: `<strong>${senderName}</strong> heeft u aangewezen als een van hun <strong>nalatenschapscontacten</strong> in The Memory Palace${relationship ? ` \u2014 als hun ${relationship}` : ""}.`,
      explain: `Een nalatenschapscontact is iemand die ${senderName} vertrouwt om hun herinneringen, berichten en geselecteerde delen van hun paleis te ontvangen mocht ${senderName} dit ooit niet meer zelf kunnen onderhouden. U hoeft vandaag niets te doen.`,
      whatHappens: `Als ${senderName} gedurende langere tijd inactief wordt, ontvangt u een aparte e-mail met toegang tot de herinneringen en berichten die ${senderName} voor u heeft voorbereid.`,
      footer: `U ontvangt dit bericht omdat ${senderName} u heeft aangewezen als nalatenschapscontact. U kunt zich afmelden door op deze e-mail te antwoorden.`,
      cta: "Meer over The Memory Palace",
      subject: `${params.senderName} heeft u aangewezen als nalatenschapscontact`,
    },
    de: {
      preheader: `${params.senderName} hat dich als Nachlassempf\u00e4nger in ihrem Memory Palace benannt.`,
      label: "Eine Rolle des Vertrauens",
      title: `${senderName} hat dich als Nachlassempf\u00e4nger benannt`,
      greeting: `Liebe/r ${recipientName},`,
      intro: `<strong>${senderName}</strong> hat dich als einen ihrer <strong>Nachlassempf\u00e4nger</strong> in The Memory Palace bestimmt${relationship ? ` \u2014 als ${relationship}` : ""}.`,
      explain: `Ein Nachlassempf\u00e4nger ist jemand, dem ${senderName} vertraut, um ihre Erinnerungen, Nachrichten und ausgew\u00e4hlte Teile ihres Palastes zu erhalten, falls sie diesen eines Tages nicht mehr selbst pflegen k\u00f6nnen. Heute ist von dir keine Aktion erforderlich.`,
      whatHappens: `Falls ${senderName} \u00fcber einen l\u00e4ngeren Zeitraum inaktiv wird, erh\u00e4ltst du eine separate E-Mail mit Zugang zu den Erinnerungen und Nachrichten, die ${senderName} f\u00fcr dich vorbereitet hat.`,
      footer: `Du erh\u00e4ltst diese E-Mail, weil ${senderName} dich als Nachlassempf\u00e4nger benannt hat. Du kannst dich abmelden, indem du auf diese E-Mail antwortest.`,
      cta: "Mehr \u00fcber The Memory Palace erfahren",
      subject: `${params.senderName} hat dich als Nachlassempf\u00e4nger benannt`,
    },
    es: {
      preheader: `${params.senderName} te ha designado como contacto de legado en su Memory Palace.`,
      label: "Un Papel de Confianza",
      title: `${senderName} te ha designado como contacto de legado`,
      greeting: `Estimado/a ${recipientName},`,
      intro: `<strong>${senderName}</strong> te ha designado como uno de sus <strong>contactos de legado</strong> en The Memory Palace${relationship ? ` \u2014 como su ${relationship}` : ""}.`,
      explain: `Un contacto de legado es alguien en quien ${senderName} conf\u00eda para recibir sus recuerdos, mensajes y partes seleccionadas de su palacio si alguna vez no puede mantenerlo. No se requiere ninguna acci\u00f3n de tu parte hoy.`,
      whatHappens: `Si ${senderName} se vuelve inactivo por un per\u00edodo prolongado, recibir\u00e1s un correo separado con acceso a los recuerdos y mensajes que ${senderName} ha preparado para ti.`,
      footer: `Recibes este mensaje porque ${senderName} te nombr\u00f3 como contacto de legado. Puedes darte de baja respondiendo a este correo.`,
      cta: "Conocer The Memory Palace",
      subject: `${params.senderName} te ha designado como contacto de legado`,
    },
    fr: {
      preheader: `${params.senderName} vous a d\u00e9sign\u00e9 comme contact de legs dans leur Memory Palace.`,
      label: "Un R\u00f4le de Confiance",
      title: `${senderName} vous a d\u00e9sign\u00e9 comme contact de legs`,
      greeting: `Cher/Ch\u00e8re ${recipientName},`,
      intro: `<strong>${senderName}</strong> vous a d\u00e9sign\u00e9 comme l\u2019un de ses <strong>contacts de legs</strong> dans The Memory Palace${relationship ? ` \u2014 en tant que ${relationship}` : ""}.`,
      explain: `Un contact de legs est une personne \u00e0 qui ${senderName} fait confiance pour recevoir ses souvenirs, messages et parties s\u00e9lectionn\u00e9es de son palais s\u2019il ne peut plus l\u2019entretenir. Aucune action n\u2019est n\u00e9cessaire de votre part aujourd\u2019hui.`,
      whatHappens: `Si ${senderName} devient inactif pendant une p\u00e9riode prolong\u00e9e, vous recevrez un e-mail s\u00e9par\u00e9 avec acc\u00e8s aux souvenirs et messages que ${senderName} a pr\u00e9par\u00e9s pour vous.`,
      footer: `Vous recevez cet e-mail car ${senderName} vous a d\u00e9sign\u00e9 comme contact de legs. Vous pouvez vous d\u00e9sabonner en r\u00e9pondant \u00e0 cet e-mail.`,
      cta: "D\u00e9couvrir The Memory Palace",
      subject: `${params.senderName} vous a d\u00e9sign\u00e9 comme contact de legs`,
    },
  };
  const L = copies[locale];

  const html = emailLayout({
    preheader: L.preheader,
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
        ${L.label}
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:28px;font-weight:500;color:#2C2C2A;line-height:1.3;">
        ${L.title}
      </h1>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:#2C2C2A;line-height:1.5;">
        ${L.greeting}
      </p>
      <p class="text-primary" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
        ${L.intro}
      </p>
      <p class="text-secondary" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${L.explain}
      </p>
      ${ornamentalDivider()}
      <p class="text-secondary" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#8B7355;line-height:1.8;font-style:italic;">
        ${L.whatHappens}
      </p>`,
    ctaText: L.cta,
    ctaUrl: `${getSiteUrl()}/`,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#D4C5B2;">
        ${L.footer}
      </p>`,
  });

  return sendEmail({
    to: params.recipientEmail,
    subject: L.subject,
    html,
    tag: "legacy-trustee-welcome",
  });
}
