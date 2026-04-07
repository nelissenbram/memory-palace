import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

// ── i18n translations for legacy emails ──

type Locale = "en" | "nl";

const t = {
  verification: {
    preheader: {
      en: (name: string) => `${name}, please confirm you're still active. Your legacy contacts will be notified otherwise.`,
      nl: (name: string) => `${name}, bevestig alstublieft dat u nog actief bent. Anders worden uw nabestaanden-contacten op de hoogte gebracht.`,
    },
    headerLabel: {
      en: "Legacy Check-In",
      nl: "Nalatenschap Check-In",
    },
    headerTitle: {
      en: (name: string) => `A check-in from your Memory Palace, ${name}`,
      nl: (name: string) => `Een check-in vanuit uw Memory Palace, ${name}`,
    },
    bodyInactive: {
      en: (days: number) => `We noticed you have not visited your Memory Palace in <strong>${days} days</strong>.`,
      nl: (days: number) => `We merkten op dat u uw Memory Palace al <strong>${days} dagen</strong> niet hebt bezocht.`,
    },
    bodyExplain: {
      en: "Your legacy contacts are configured to receive your memories if you become inactive. To confirm you are still here and reset this timer, please click the button below.",
      nl: "Uw nabestaanden-contacten zijn ingesteld om uw herinneringen te ontvangen als u inactief wordt. Klik op de onderstaande knop om te bevestigen dat u er nog bent en de timer opnieuw in te stellen.",
    },
    boxWarning: {
      en: "If we do not hear from you within 30 days, your legacy messages and shared memories will be delivered to your designated contacts.",
      nl: "Als we binnen 30 dagen niets van u horen, worden uw nalatenschapsberichten en gedeelde herinneringen bezorgd aan uw aangewezen contacten.",
    },
    ctaText: {
      en: "I\u2019m Still Here",
      nl: "Ik Ben Er Nog",
    },
    footerNote: {
      en: "You received this because you have legacy delivery enabled.",
      nl: "U ontvangt dit bericht omdat u nalatenschapsbezorging hebt ingeschakeld.",
    },
    subject: {
      en: (name: string) => `A check-in from your Memory Palace, ${name}`,
      nl: (name: string) => `Een check-in vanuit uw Memory Palace, ${name}`,
    },
  },

  verifier: {
    preheader: {
      en: (userName: string) => `${userName} has been inactive — their legacy plan may be activated.`,
      nl: (userName: string) => `${userName} is inactief geweest — hun nalatenschapsplan kan worden geactiveerd.`,
    },
    headerLabel: {
      en: "Trusted Verifier Notice",
      nl: "Vertrouwde Verificateur Melding",
    },
    headerTitle: {
      en: (userName: string) => `Regarding ${userName}`,
      nl: (userName: string) => `Betreffende ${userName}`,
    },
    greeting: {
      en: (name: string) => `Dear ${name},`,
      nl: (name: string) => `Beste ${name},`,
    },
    bodyDesignated: {
      en: (userName: string, days: number) => `${userName} designated you as their <strong>trusted verifier</strong> in their Memory Palace. They have not visited their palace in <strong>${days} days</strong>, which has triggered their legacy plan.`,
      nl: (userName: string, days: number) => `${userName} heeft u aangewezen als <strong>vertrouwde verificateur</strong> in hun Memory Palace. Ze hebben hun paleis al <strong>${days} dagen</strong> niet bezocht, waardoor hun nalatenschapsplan is geactiveerd.`,
    },
    bodyIfWell: {
      en: (userName: string) => `If ${userName} is still well and simply hasn\u2019t logged in, you can confirm on their behalf by clicking the button below. This will reset their inactivity timer and prevent the legacy delivery.`,
      nl: (userName: string) => `Als ${userName} nog in goede gezondheid verkeert en simpelweg niet heeft ingelogd, kunt u namens hen bevestigen door op de onderstaande knop te klikken. Dit reset de inactiviteitstimer en voorkomt de nalatenschapsbezorging.`,
    },
    bodyIfDeceased: {
      en: (userName: string) => `If ${userName} has indeed passed away or become incapacitated, you do not need to take any action. Their legacy messages will be delivered to their designated contacts after the grace period.`,
      nl: (userName: string) => `Als ${userName} inderdaad is overleden of wilsonbekwaam is geworden, hoeft u geen actie te ondernemen. Hun nalatenschapsberichten worden na de wachttijd bezorgd aan hun aangewezen contacten.`,
    },
    boxWarning: {
      en: (userName: string) => `If you do not take action, ${userName}\u2019s legacy messages and shared memories will be delivered to their designated contacts in 30 days.`,
      nl: (userName: string) => `Als u geen actie onderneemt, worden de nalatenschapsberichten en gedeelde herinneringen van ${userName} binnen 30 dagen bezorgd aan hun aangewezen contacten.`,
    },
    ctaText: {
      en: (userName: string) => `Confirm ${userName} Is Well`,
      nl: (userName: string) => `Bevestig dat ${userName} in orde is`,
    },
    footerNote: {
      en: (userName: string) => `You received this because ${userName} designated you as their trusted verifier.`,
      nl: (userName: string) => `U ontvangt dit bericht omdat ${userName} u heeft aangewezen als vertrouwde verificateur.`,
    },
    subject: {
      en: (userName: string) => `Trusted Verifier Notice: ${userName} has been inactive`,
      nl: (userName: string) => `Vertrouwde Verificateur Melding: ${userName} is inactief geweest`,
    },
  },

  delivery: {
    preheader: {
      en: (senderName: string) => `${senderName} left a message for you in their Memory Palace.`,
      nl: (senderName: string) => `${senderName} heeft een bericht voor u achtergelaten in hun Memory Palace.`,
    },
    headerLabel: {
      en: "A Legacy Message",
      nl: "Een Nalatenschapsbericht",
    },
    headerTitle: {
      en: (senderName: string) => `From ${senderName}`,
      nl: (senderName: string) => `Van ${senderName}`,
    },
    headerSubtitle: {
      en: "Left for you in their Memory Palace",
      nl: "Voor u achtergelaten in hun Memory Palace",
    },
    greeting: {
      en: (name: string) => `Dear ${name},`,
      nl: (name: string) => `Beste ${name},`,
    },
    bodyIntro: {
      en: (senderName: string) => `${senderName} prepared this message for you in their Memory Palace, to be delivered as part of their digital legacy.`,
      nl: (senderName: string) => `${senderName} heeft dit bericht voor u voorbereid in hun Memory Palace, om bezorgd te worden als onderdeel van hun digitale nalatenschap.`,
    },
    empathyNote: {
      en: "We understand this may be an emotional moment. These memories were chosen with care.",
      nl: "We begrijpen dat dit een emotioneel moment kan zijn. Deze herinneringen zijn met zorg gekozen.",
    },
    takeYourTime: {
      en: "Take your time with these memories. There is no rush.",
      nl: "Neem de tijd voor deze herinneringen. Er is geen haast.",
    },
    sharedMemories: {
      en: (senderName: string, expiresDate: string) => `${senderName} also shared some of their memories with you. You can view them using the link below. This link expires on ${expiresDate}.`,
      nl: (senderName: string, expiresDate: string) => `${senderName} heeft ook een aantal herinneringen met u gedeeld. U kunt deze bekijken via de onderstaande link. Deze link verloopt op ${expiresDate}.`,
    },
    ctaText: {
      en: "View Shared Memories",
      nl: "Bekijk Gedeelde Herinneringen",
    },
    footerNote: {
      en: "This is a one-time legacy delivery. No further emails will be sent.",
      nl: "Dit is een eenmalige nalatenschapsbezorging. Er worden geen verdere e-mails verzonden.",
    },
    subject: {
      en: (senderName: string) => `A legacy message from ${senderName}`,
      nl: (senderName: string) => `Een nalatenschapsbericht van ${senderName}`,
    },
  },
} as const;

function resolveLocale(locale?: string): Locale {
  return locale === "nl" ? "nl" : "en";
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
  const expiresDate = new Date(params.expiresAt).toLocaleDateString(
    locale === "nl" ? "nl-NL" : "en-US",
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

  const en = {
    preheader: `${params.senderName} named you as a legacy contact in their Memory Palace.`,
    label: "A Role of Trust",
    title: `${senderName} has named you as a legacy contact`,
    greeting: `Dear ${recipientName},`,
    intro: `<strong>${senderName}</strong> has designated you as one of their <strong>legacy contacts</strong> in The Memory Palace${relationship ? ` — as their ${relationship}` : ""}.`,
    explain: `A legacy contact is someone ${senderName} trusts to receive their memories, messages and selected parts of their palace if they ever become unable to maintain it themselves. No action is needed from you today.`,
    whatHappens: `If ${senderName} becomes inactive for an extended period, you will receive a separate email with access to the memories and messages they have prepared for you.`,
    footer: `You received this because ${senderName} named you a legacy contact. You can opt out by replying to this email.`,
    cta: "Learn about The Memory Palace",
    subject: `${params.senderName} has named you as a legacy contact`,
  };
  const nl = {
    preheader: `${params.senderName} heeft u aangewezen als nalatenschapscontact in hun Memory Palace.`,
    label: "Een rol van vertrouwen",
    title: `${senderName} heeft u aangewezen als nalatenschapscontact`,
    greeting: `Beste ${recipientName},`,
    intro: `<strong>${senderName}</strong> heeft u aangewezen als een van hun <strong>nalatenschapscontacten</strong> in The Memory Palace${relationship ? ` — als hun ${relationship}` : ""}.`,
    explain: `Een nalatenschapscontact is iemand die ${senderName} vertrouwt om hun herinneringen, berichten en geselecteerde delen van hun paleis te ontvangen mocht ${senderName} dit ooit niet meer zelf kunnen onderhouden. U hoeft vandaag niets te doen.`,
    whatHappens: `Als ${senderName} gedurende langere tijd inactief wordt, ontvangt u een aparte e-mail met toegang tot de herinneringen en berichten die ${senderName} voor u heeft voorbereid.`,
    footer: `U ontvangt dit bericht omdat ${senderName} u heeft aangewezen als nalatenschapscontact. U kunt zich afmelden door op deze e-mail te antwoorden.`,
    cta: "Meer over The Memory Palace",
    subject: `${params.senderName} heeft u aangewezen als nalatenschapscontact`,
  };
  const L = locale === "nl" ? nl : en;

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
