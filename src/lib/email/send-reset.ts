import { emailLayout, sendEmail, ornamentalDivider } from "./shared";

// ── i18n translations for password reset emails ──

type Locale = "en" | "nl" | "de" | "es" | "fr";

const copy = {
  en: {
    headerLabel: "Password Reset",
    heading: "Reset your Memory Palace password",
    body: "We received a request to reset the password on your Memory Palace account. Click the button below to choose a new one.",
    boxWarning: 'This link will expire in <strong>1 hour</strong>. If you did not request a reset, you can safely ignore this email &mdash; your password will remain unchanged.',
    ctaText: "Reset password",
    preheader: "Reset your Memory Palace password. This link expires in 1 hour.",
    footer: "You received this because a password reset was requested for your account at thememorypalace.ai.",
    subject: "Reset your Memory Palace password",
  },
  nl: {
    headerLabel: "Wachtwoord Resetten",
    heading: "Reset je Memory Palace wachtwoord",
    body: "We hebben een verzoek ontvangen om het wachtwoord van je Memory Palace-account te resetten. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.",
    boxWarning: 'Deze link verloopt over <strong>1 uur</strong>. Als je geen reset hebt aangevraagd, kun je deze e-mail veilig negeren &mdash; je wachtwoord blijft ongewijzigd.',
    ctaText: "Wachtwoord resetten",
    preheader: "Reset je Memory Palace wachtwoord. Deze link verloopt over 1 uur.",
    footer: "Je ontvangt dit bericht omdat er een wachtwoord-reset is aangevraagd voor je account op thememorypalace.ai.",
    subject: "Reset je Memory Palace wachtwoord",
  },
  de: {
    headerLabel: "Passwort zur\u00fccksetzen",
    heading: "Setze dein Memory Palace Passwort zur\u00fcck",
    body: "Wir haben eine Anfrage erhalten, das Passwort deines Memory Palace-Kontos zur\u00fcckzusetzen. Klicke auf die Schaltfl\u00e4che unten, um ein neues Passwort zu w\u00e4hlen.",
    boxWarning: 'Dieser Link l\u00e4uft in <strong>1 Stunde</strong> ab. Falls du kein Zur\u00fccksetzen angefordert hast, kannst du diese E-Mail ignorieren &mdash; dein Passwort bleibt unver\u00e4ndert.',
    ctaText: "Passwort zur\u00fccksetzen",
    preheader: "Setze dein Memory Palace Passwort zur\u00fcck. Dieser Link l\u00e4uft in 1 Stunde ab.",
    footer: "Du erh\u00e4ltst diese E-Mail, weil ein Passwort-Reset f\u00fcr dein Konto auf thememorypalace.ai angefordert wurde.",
    subject: "Setze dein Memory Palace Passwort zur\u00fcck",
  },
  es: {
    headerLabel: "Restablecer contrase\u00f1a",
    heading: "Restablece tu contrase\u00f1a de Memory Palace",
    body: "Hemos recibido una solicitud para restablecer la contrase\u00f1a de tu cuenta de Memory Palace. Haz clic en el bot\u00f3n de abajo para elegir una nueva.",
    boxWarning: 'Este enlace caducar\u00e1 en <strong>1 hora</strong>. Si no solicitaste un restablecimiento, puedes ignorar este correo &mdash; tu contrase\u00f1a permanecer\u00e1 sin cambios.',
    ctaText: "Restablecer contrase\u00f1a",
    preheader: "Restablece tu contrase\u00f1a de Memory Palace. Este enlace caduca en 1 hora.",
    footer: "Recibes este mensaje porque se solicit\u00f3 un restablecimiento de contrase\u00f1a para tu cuenta en thememorypalace.ai.",
    subject: "Restablece tu contrase\u00f1a de Memory Palace",
  },
  fr: {
    headerLabel: "R\u00e9initialisation du mot de passe",
    heading: "R\u00e9initialisez votre mot de passe Memory Palace",
    body: "Nous avons re\u00e7u une demande de r\u00e9initialisation du mot de passe de votre compte Memory Palace. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
    boxWarning: 'Ce lien expirera dans <strong>1 heure</strong>. Si vous n\u2019avez pas demand\u00e9 de r\u00e9initialisation, vous pouvez ignorer cet e-mail &mdash; votre mot de passe restera inchang\u00e9.',
    ctaText: "R\u00e9initialiser le mot de passe",
    preheader: "R\u00e9initialisez votre mot de passe Memory Palace. Ce lien expire dans 1 heure.",
    footer: "Vous recevez cet e-mail car une r\u00e9initialisation de mot de passe a \u00e9t\u00e9 demand\u00e9e pour votre compte sur thememorypalace.ai.",
    subject: "R\u00e9initialisez votre mot de passe Memory Palace",
  },
} as const;

function resolveLocale(locale?: string): Locale {
  if (locale && locale in copy) return locale as Locale;
  return "en";
}

interface ResetEmailParams {
  recipientEmail: string;
  resetLink: string;
  locale?: string;
}

export function generateResetEmailHtml(params: ResetEmailParams): string {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  const resetLink = params.resetLink;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      ${c.headerLabel}
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
      ${c.heading}
    </h1>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.75;">
      ${c.body}
    </p>

    ${ornamentalDivider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
    <tr><td class="section-bg" style="padding:16px 22px;background-color:#FAFAF7;border:1px solid #EEEAE3;border-left:3px solid #D4AF37;border-radius:2px;">
      <p class="text-muted" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#5C4733;line-height:1.65;">
        ${c.boxWarning}
      </p>
    </td></tr>
    </table>`;

  return emailLayout({
    preheader: c.preheader,
    headerHtml,
    bodyHtml,
    ctaText: c.ctaText,
    ctaUrl: resetLink,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        ${c.footer}
      </p>`,
  });
}

export async function sendResetEmail(params: ResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  return sendEmail({
    to: params.recipientEmail,
    subject: c.subject,
    html: generateResetEmailHtml(params),
    tag: "password-reset",
  });
}
