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
    <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
      Invitation
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
      ${inviterName} invited you
    </h1>
    <p class="header-subtitle" style="margin:14px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#8B7355;line-height:1.6;">
      to explore a room in their Memory Palace
    </p>`;

  /* Personal message: styled to feel handwritten / letter-like */
  const messageBlock = personalMessage
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr><td style="padding:24px 28px;background-color:#FAFAF7;border-radius:2px;border-left:2px solid #C17F59;">
      <p style="margin:0 0 8px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;color:#B8A99A;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
        A note from ${inviterName}
      </p>
      <p class="text-primary" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#2C2C2A;line-height:1.7;font-style:italic;">
        &ldquo;${personalMessage}&rdquo;
      </p>
    </td></tr>
    </table>`
    : "";

  const bodyHtml = `
    <p class="text-secondary" style="margin:0 0 24px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#5C564E;line-height:1.8;">
      <strong>${inviterName}</strong> wants to share a special room with you &mdash;
      <em>&ldquo;${roomName}&rdquo;</em>${wingName ? ` in their <strong>${wingName}</strong> wing` : ""}.
    </p>

    ${messageBlock}

    <!-- Room card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
    <tr><td class="section-bg" style="padding:28px 24px;background-color:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
      <p class="text-primary" style="margin:0 0 4px;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:500;color:#2C2C2A;letter-spacing:-0.2px;">
        ${roomName}
      </p>
      ${wingName ? `<p class="text-muted" style="margin:0 0 12px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:12px;color:#9A9183;letter-spacing:0.3px;">${wingName} Wing</p>` : `<div style="height:12px;"></div>`}
      <span style="display:inline-block;padding:4px 16px;border:1px solid #D4C5B2;border-radius:2px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;font-weight:600;color:#8B7355;letter-spacing:1.2px;text-transform:uppercase;">
        ${permissionLabel} Access
      </span>
    </td></tr>
    </table>`;

  return emailLayout({
    preheader: `${params.inviterName} invited you to explore "${params.roomName}" in their Memory Palace.`,
    headerHtml,
    bodyHtml,
    ctaText: "View Their Memories",
    ctaUrl: acceptUrl,
    footerExtra: `
      <p style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You received this because ${inviterName} shared a room with you.
      </p>`,
  });
}

export function generateInviteEmailSubject(inviterName: string): string {
  return `${escapeHtml(inviterName)} invited you to explore their Memory Palace`;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateInviteEmailSubject(params.inviterName),
    html: generateInviteEmailHtml(params),
    tag: "invite",
  });
}
