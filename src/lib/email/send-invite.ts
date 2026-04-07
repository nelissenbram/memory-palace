import { escapeHtml, emailLayout, sendEmail, getSiteUrl } from "./shared";

interface InviteEmailParams {
  inviterName: string;
  recipientEmail: string;
  roomName: string;
  wingName: string;
  shareId: string;
  permission: string;
  personalMessage?: string | null;
}

export function generateInviteEmailHtml(params: InviteEmailParams): string {
  const inviterName = escapeHtml(params.inviterName);
  const roomName = escapeHtml(params.roomName);
  const wingName = params.wingName ? escapeHtml(params.wingName) : "";
  const personalMessage = params.personalMessage ? escapeHtml(params.personalMessage) : null;
  const acceptUrl = `${getSiteUrl()}/invite/${encodeURIComponent(params.shareId)}`;
  const permissionLabel = params.permission === "contribute" ? "Contribute" : "View";

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      An Invitation
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.3;">
      ${inviterName} invites you into their Memory Palace
    </h1>`;

  const messageBlock = personalMessage
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
    <tr><td style="padding:22px 26px;background-color:#FAFAF7;border-radius:2px;border-left:3px solid #D4AF37;">
      <p style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:11px;color:#B8922E;text-transform:uppercase;letter-spacing:0.14em;font-weight:600;">
        A note from ${inviterName}
      </p>
      <p class="text-primary" style="margin:0;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:19px;color:#2C2C2A;line-height:1.65;font-style:italic;">
        &ldquo;${personalMessage}&rdquo;
      </p>
    </td></tr>
    </table>`
    : "";

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      In a Memory Palace, rooms hold the stories that matter most.
      <strong>${inviterName}</strong> has opened one of theirs to you &mdash;
      <em>&ldquo;${roomName}&rdquo;</em>${wingName ? `, in the <strong>${wingName}</strong> wing` : ""}.
    </p>

    ${messageBlock}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
    <tr><td class="section-bg" style="padding:28px 24px;background-color:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
      <p class="text-primary" style="margin:0 0 4px;font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:24px;font-weight:500;color:#2C2C2A;">
        ${roomName}
      </p>
      ${wingName ? `<p class="text-muted" style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#8B7355;font-style:italic;">${wingName} wing</p>` : `<div style="height:14px;"></div>`}
      <span style="display:inline-block;padding:5px 16px;border:1px solid #D4AF37;border-radius:2px;font-family:'Cormorant Garamond',Georgia,serif;font-size:11px;font-weight:600;color:#B8922E;letter-spacing:0.14em;text-transform:uppercase;">
        ${permissionLabel} access
      </span>
    </td></tr>
    </table>`;

  return emailLayout({
    preheader: `${params.inviterName} invites you into their Memory Palace — the room "${params.roomName}" awaits.`,
    headerHtml,
    bodyHtml,
    ctaText: "Accept invitation",
    ctaUrl: acceptUrl,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        You received this because ${inviterName} shared a room with you.
      </p>`,
  });
}

export function generateInviteEmailSubject(inviterName: string): string {
  return `${escapeHtml(inviterName)} invites you into their Memory Palace`;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateInviteEmailSubject(params.inviterName),
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
}

export async function sendFamilyInviteEmail(params: FamilyInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const inviterName = escapeHtml(params.inviterName);
  const groupName = escapeHtml(params.groupName);
  const roleLabel = params.role === "admin" ? "Admin" : "Member";
  const acceptUrl = `${getSiteUrl()}/settings/family`;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      Family Invitation
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.3;">
      ${inviterName} invites you to join the ${groupName} family
    </h1>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      <strong>${inviterName}</strong> has added you to their family group <em>&ldquo;${groupName}&rdquo;</em> in The Memory Palace.
      Family members can share wings of their palace and co-create memories together.
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
    preheader: `${params.inviterName} invites you to join the ${params.groupName} family in The Memory Palace.`,
    headerHtml,
    bodyHtml,
    ctaText: "Open your Family",
    ctaUrl: acceptUrl,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        You received this because ${inviterName} added you to a family group.
      </p>`,
  });

  return sendEmail({
    to: params.recipientEmail,
    subject: `${params.inviterName} invites you to the ${params.groupName} family`,
    html,
    tag: "family-invite",
  });
}
