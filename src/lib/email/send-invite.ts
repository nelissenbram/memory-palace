import { escapeHtml, emailLayout, sendEmail, getSiteUrl } from "./shared";

// ── i18n translations for invite emails ──

type Locale = "en" | "nl" | "de" | "es" | "fr";

const copy = {
  en: {
    label: "An Invitation",
    heading: (name: string) => `${name} invites you into their Memory Palace`,
    noteFrom: (name: string) => `A note from ${name}`,
    body: (inviter: string, room: string, wing: string) =>
      `In a Memory Palace, rooms hold the stories that matter most. <strong>${inviter}</strong> has opened one of theirs to you &mdash; <em>&ldquo;${room}&rdquo;</em>${wing ? `, in the <strong>${wing}</strong> wing` : ""}.`,
    wingLabel: (w: string) => `${w} wing`,
    contribute: "Contribute",
    view: "View",
    accessLabel: (perm: string) => `${perm} access`,
    ctaText: "Accept invitation",
    preheader: (inviter: string, room: string) => `${inviter} invites you into their Memory Palace \u2014 the room "${room}" awaits.`,
    footer: (inviter: string) => `You received this because ${inviter} shared a room with you.`,
    subject: (inviter: string) => `${inviter} invites you into their Memory Palace`,
    // Family group invite
    familyLabel: "Family Invitation",
    familyHeading: (inviter: string, group: string) => `${inviter} invites you to join the ${group} family`,
    familyBody: (inviter: string, group: string) =>
      `<strong>${inviter}</strong> has added you to their family group <em>&ldquo;${group}&rdquo;</em> in The Memory Palace. Family members can share wings of their palace and co-create memories together.`,
    familyCta: "Open your Family",
    familyPreheader: (inviter: string, group: string) => `${inviter} invites you to join the ${group} family in The Memory Palace.`,
    familyFooter: (inviter: string) => `You received this because ${inviter} added you to a family group.`,
    familySubject: (inviter: string, group: string) => `${inviter} invites you to the ${group} family`,
    admin: "Admin",
    member: "Member",
  },
  nl: {
    label: "Een Uitnodiging",
    heading: (name: string) => `${name} nodigt je uit in hun Memory Palace`,
    noteFrom: (name: string) => `Een bericht van ${name}`,
    body: (inviter: string, room: string, wing: string) =>
      `In een Memory Palace bewaren kamers de verhalen die er het meest toe doen. <strong>${inviter}</strong> heeft een van hun kamers voor je geopend &mdash; <em>&ldquo;${room}&rdquo;</em>${wing ? `, in de <strong>${wing}</strong>-vleugel` : ""}.`,
    wingLabel: (w: string) => `${w}-vleugel`,
    contribute: "Bijdragen",
    view: "Bekijken",
    accessLabel: (perm: string) => `${perm}-toegang`,
    ctaText: "Uitnodiging accepteren",
    preheader: (inviter: string, room: string) => `${inviter} nodigt je uit in hun Memory Palace \u2014 de kamer "${room}" wacht op je.`,
    footer: (inviter: string) => `Je ontvangt dit bericht omdat ${inviter} een kamer met je heeft gedeeld.`,
    subject: (inviter: string) => `${inviter} nodigt je uit in hun Memory Palace`,
    familyLabel: "Familie-uitnodiging",
    familyHeading: (inviter: string, group: string) => `${inviter} nodigt je uit voor de ${group}-familie`,
    familyBody: (inviter: string, group: string) =>
      `<strong>${inviter}</strong> heeft je toegevoegd aan hun familiegroep <em>&ldquo;${group}&rdquo;</em> in The Memory Palace. Familieleden kunnen vleugels van hun paleis delen en samen herinneringen maken.`,
    familyCta: "Open je Familie",
    familyPreheader: (inviter: string, group: string) => `${inviter} nodigt je uit voor de ${group}-familie in The Memory Palace.`,
    familyFooter: (inviter: string) => `Je ontvangt dit bericht omdat ${inviter} je aan een familiegroep heeft toegevoegd.`,
    familySubject: (inviter: string, group: string) => `${inviter} nodigt je uit voor de ${group}-familie`,
    admin: "Beheerder",
    member: "Lid",
  },
  de: {
    label: "Eine Einladung",
    heading: (name: string) => `${name} l\u00e4dt dich in ihren Memory Palace ein`,
    noteFrom: (name: string) => `Eine Nachricht von ${name}`,
    body: (inviter: string, room: string, wing: string) =>
      `In einem Memory Palace bewahren R\u00e4ume die Geschichten, die am meisten z\u00e4hlen. <strong>${inviter}</strong> hat einen ihrer R\u00e4ume f\u00fcr dich ge\u00f6ffnet &mdash; <em>&ldquo;${room}&rdquo;</em>${wing ? `, im <strong>${wing}</strong>-Fl\u00fcgel` : ""}.`,
    wingLabel: (w: string) => `${w}-Fl\u00fcgel`,
    contribute: "Beitragen",
    view: "Ansehen",
    accessLabel: (perm: string) => `${perm}-Zugang`,
    ctaText: "Einladung annehmen",
    preheader: (inviter: string, room: string) => `${inviter} l\u00e4dt dich in ihren Memory Palace ein \u2014 der Raum "${room}" wartet.`,
    footer: (inviter: string) => `Du erh\u00e4ltst diese E-Mail, weil ${inviter} einen Raum mit dir geteilt hat.`,
    subject: (inviter: string) => `${inviter} l\u00e4dt dich in ihren Memory Palace ein`,
    familyLabel: "Familieneinladung",
    familyHeading: (inviter: string, group: string) => `${inviter} l\u00e4dt dich in die ${group}-Familie ein`,
    familyBody: (inviter: string, group: string) =>
      `<strong>${inviter}</strong> hat dich zur Familiengruppe <em>&ldquo;${group}&rdquo;</em> in The Memory Palace hinzugef\u00fcgt. Familienmitglieder k\u00f6nnen Fl\u00fcgel ihres Palastes teilen und gemeinsam Erinnerungen schaffen.`,
    familyCta: "Deine Familie \u00f6ffnen",
    familyPreheader: (inviter: string, group: string) => `${inviter} l\u00e4dt dich in die ${group}-Familie in The Memory Palace ein.`,
    familyFooter: (inviter: string) => `Du erh\u00e4ltst diese E-Mail, weil ${inviter} dich zu einer Familiengruppe hinzugef\u00fcgt hat.`,
    familySubject: (inviter: string, group: string) => `${inviter} l\u00e4dt dich in die ${group}-Familie ein`,
    admin: "Admin",
    member: "Mitglied",
  },
  es: {
    label: "Una Invitaci\u00f3n",
    heading: (name: string) => `${name} te invita a su Memory Palace`,
    noteFrom: (name: string) => `Una nota de ${name}`,
    body: (inviter: string, room: string, wing: string) =>
      `En un Memory Palace, las salas guardan las historias que m\u00e1s importan. <strong>${inviter}</strong> ha abierto una de las suyas para ti &mdash; <em>&ldquo;${room}&rdquo;</em>${wing ? `, en el ala <strong>${wing}</strong>` : ""}.`,
    wingLabel: (w: string) => `ala ${w}`,
    contribute: "Contribuir",
    view: "Ver",
    accessLabel: (perm: string) => `Acceso de ${perm}`,
    ctaText: "Aceptar invitaci\u00f3n",
    preheader: (inviter: string, room: string) => `${inviter} te invita a su Memory Palace \u2014 la sala "${room}" te espera.`,
    footer: (inviter: string) => `Recibes este mensaje porque ${inviter} comparti\u00f3 una sala contigo.`,
    subject: (inviter: string) => `${inviter} te invita a su Memory Palace`,
    familyLabel: "Invitaci\u00f3n Familiar",
    familyHeading: (inviter: string, group: string) => `${inviter} te invita a unirte a la familia ${group}`,
    familyBody: (inviter: string, group: string) =>
      `<strong>${inviter}</strong> te ha a\u00f1adido a su grupo familiar <em>&ldquo;${group}&rdquo;</em> en The Memory Palace. Los miembros de la familia pueden compartir alas de su palacio y crear recuerdos juntos.`,
    familyCta: "Abrir tu Familia",
    familyPreheader: (inviter: string, group: string) => `${inviter} te invita a unirte a la familia ${group} en The Memory Palace.`,
    familyFooter: (inviter: string) => `Recibes este mensaje porque ${inviter} te a\u00f1adi\u00f3 a un grupo familiar.`,
    familySubject: (inviter: string, group: string) => `${inviter} te invita a la familia ${group}`,
    admin: "Admin",
    member: "Miembro",
  },
  fr: {
    label: "Une Invitation",
    heading: (name: string) => `${name} vous invite dans son Memory Palace`,
    noteFrom: (name: string) => `Un mot de ${name}`,
    body: (inviter: string, room: string, wing: string) =>
      `Dans un Memory Palace, les salles gardent les histoires qui comptent le plus. <strong>${inviter}</strong> a ouvert l'une des siennes pour vous &mdash; <em>&ldquo;${room}&rdquo;</em>${wing ? `, dans l'aile <strong>${wing}</strong>` : ""}.`,
    wingLabel: (w: string) => `aile ${w}`,
    contribute: "Contribuer",
    view: "Voir",
    accessLabel: (perm: string) => `Acc\u00e8s ${perm}`,
    ctaText: "Accepter l'invitation",
    preheader: (inviter: string, room: string) => `${inviter} vous invite dans son Memory Palace \u2014 la salle "${room}" vous attend.`,
    footer: (inviter: string) => `Vous recevez cet e-mail car ${inviter} a partag\u00e9 une salle avec vous.`,
    subject: (inviter: string) => `${inviter} vous invite dans son Memory Palace`,
    familyLabel: "Invitation Familiale",
    familyHeading: (inviter: string, group: string) => `${inviter} vous invite \u00e0 rejoindre la famille ${group}`,
    familyBody: (inviter: string, group: string) =>
      `<strong>${inviter}</strong> vous a ajout\u00e9 \u00e0 son groupe familial <em>&ldquo;${group}&rdquo;</em> dans The Memory Palace. Les membres de la famille peuvent partager les ailes de leur palais et cr\u00e9er des souvenirs ensemble.`,
    familyCta: "Ouvrir votre Famille",
    familyPreheader: (inviter: string, group: string) => `${inviter} vous invite \u00e0 rejoindre la famille ${group} dans The Memory Palace.`,
    familyFooter: (inviter: string) => `Vous recevez cet e-mail car ${inviter} vous a ajout\u00e9 \u00e0 un groupe familial.`,
    familySubject: (inviter: string, group: string) => `${inviter} vous invite dans la famille ${group}`,
    admin: "Admin",
    member: "Membre",
  },
} as const;

function resolveLocale(locale?: string): Locale {
  if (locale && locale in copy) return locale as Locale;
  return "en";
}

interface InviteEmailParams {
  inviterName: string;
  recipientEmail: string;
  roomName: string;
  wingName: string;
  shareId: string;
  permission: string;
  personalMessage?: string | null;
  locale?: string;
}

export function generateInviteEmailHtml(params: InviteEmailParams): string {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  const inviterName = escapeHtml(params.inviterName);
  const roomName = escapeHtml(params.roomName);
  const wingName = params.wingName ? escapeHtml(params.wingName) : "";
  const personalMessage = params.personalMessage ? escapeHtml(params.personalMessage) : null;
  const acceptUrl = `${getSiteUrl()}/invite/${encodeURIComponent(params.shareId)}`;
  const permissionLabel = params.permission === "contribute" ? c.contribute : c.view;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      ${c.label}
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.3;">
      ${c.heading(inviterName)}
    </h1>`;

  const messageBlock = personalMessage
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
    <tr><td style="padding:22px 26px;background-color:#FAFAF7;border-radius:2px;border-left:3px solid #D4AF37;">
      <p style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:11px;color:#B8922E;text-transform:uppercase;letter-spacing:0.14em;font-weight:600;">
        ${c.noteFrom(inviterName)}
      </p>
      <p class="text-primary" style="margin:0;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:19px;color:#2C2C2A;line-height:1.65;font-style:italic;">
        &ldquo;${personalMessage}&rdquo;
      </p>
    </td></tr>
    </table>`
    : "";

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.body(inviterName, roomName, wingName)}
    </p>

    ${messageBlock}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
    <tr><td class="section-bg" style="padding:28px 24px;background-color:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
      <p class="text-primary" style="margin:0 0 4px;font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:24px;font-weight:500;color:#2C2C2A;">
        ${roomName}
      </p>
      ${wingName ? `<p class="text-muted" style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#8B7355;font-style:italic;">${c.wingLabel(wingName)}</p>` : `<div style="height:14px;"></div>`}
      <span style="display:inline-block;padding:5px 16px;border:1px solid #D4AF37;border-radius:2px;font-family:'Cormorant Garamond',Georgia,serif;font-size:11px;font-weight:600;color:#B8922E;letter-spacing:0.14em;text-transform:uppercase;">
        ${c.accessLabel(permissionLabel)}
      </span>
    </td></tr>
    </table>`;

  return emailLayout({
    preheader: c.preheader(params.inviterName, params.roomName),
    headerHtml,
    bodyHtml,
    ctaText: c.ctaText,
    ctaUrl: acceptUrl,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        ${c.footer(inviterName)}
      </p>`,
  });
}

export function generateInviteEmailSubject(inviterName: string, locale?: string): string {
  const loc = resolveLocale(locale);
  return copy[loc].subject(escapeHtml(inviterName));
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateInviteEmailSubject(params.inviterName, params.locale),
    html: generateInviteEmailHtml(params),
    tag: "invite",
  });
}

// ── Family group invite email ──

interface FamilyInviteEmailParams {
  inviterName: string;
  recipientEmail: string;
  groupName: string;
  role: "admin" | "member";
  locale?: string;
}

export async function sendFamilyInviteEmail(params: FamilyInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  const inviterName = escapeHtml(params.inviterName);
  const groupName = escapeHtml(params.groupName);
  const roleLabel = params.role === "admin" ? c.admin : c.member;
  const acceptUrl = `${getSiteUrl()}/settings/family`;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      ${c.familyLabel}
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.3;">
      ${c.familyHeading(inviterName, groupName)}
    </h1>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.familyBody(inviterName, groupName)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
    <tr><td class="section-bg" style="padding:24px;background-color:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
      <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:500;color:#2C2C2A;">
        ${groupName}
      </p>
      <span style="display:inline-block;padding:5px 16px;border:1px solid #D4AF37;border-radius:2px;font-family:'Cormorant Garamond',Georgia,serif;font-size:11px;font-weight:600;color:#B8922E;letter-spacing:0.14em;text-transform:uppercase;">
        ${roleLabel}
      </span>
    </td></tr>
    </table>`;

  const html = emailLayout({
    preheader: c.familyPreheader(params.inviterName, params.groupName),
    headerHtml,
    bodyHtml,
    ctaText: c.familyCta,
    ctaUrl: acceptUrl,
    locale,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        ${c.familyFooter(inviterName)}
      </p>`,
  });

  return sendEmail({
    to: params.recipientEmail,
    subject: c.familySubject(params.inviterName, params.groupName),
    html,
    tag: "family-invite",
  });
}
