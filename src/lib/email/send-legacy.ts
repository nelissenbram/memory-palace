import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

// ── Verification email (sent to the inactive user) ──

interface VerificationEmailParams {
  recipientEmail: string;
  displayName: string;
  inactiveDays: number;
  verificationToken: string;
}

export function generateVerificationEmailHtml(params: VerificationEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const verifyUrl = `${getSiteUrl()}/api/legacy/verify?token=${encodeURIComponent(params.verificationToken)}&type=user`;

  return emailLayout({
    preheader: `${params.displayName}, please confirm you're still active. Your legacy contacts will be notified otherwise.`,
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
        Legacy Check-In
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
        Are you still there, ${displayName}?
      </h1>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
        We noticed you have not visited your Memory Palace in <strong>${params.inactiveDays} days</strong>.
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.8;">
        Your legacy contacts are configured to receive your memories if you become
        inactive. To confirm you are still here and reset this timer, please
        click the button below.
      </p>

      ${ornamentalDivider()}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      <tr><td class="section-bg" style="padding:20px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;">
        <p class="text-muted" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#9A9183;line-height:1.7;">
          If we do not hear from you within 30 days, your legacy messages and
          shared memories will be delivered to your designated contacts.
        </p>
      </td></tr>
      </table>`,
    ctaText: "I\u2019m Still Here",
    ctaUrl: verifyUrl,
    footerExtra: `
      <p style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You received this because you have legacy delivery enabled.
      </p>`,
  });
}

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `Are you still there, ${params.displayName}?`,
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
}

export function generateTrustedVerifierEmailHtml(params: TrustedVerifierEmailParams): string {
  const recipientName = escapeHtml(params.recipientName);
  const userName = escapeHtml(params.userName);
  const verifyUrl = `${getSiteUrl()}/api/legacy/verify?token=${encodeURIComponent(params.verificationToken)}&type=verifier`;

  return emailLayout({
    preheader: `${params.userName} has been inactive — their legacy plan may be activated.`,
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
        Trusted Verifier Notice
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
        Regarding ${userName}
      </h1>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
        Dear ${recipientName},
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${userName} designated you as their <strong>trusted verifier</strong> in their Memory Palace.
        They have not visited their palace in <strong>${params.inactiveDays} days</strong>, which
        has triggered their legacy plan.
      </p>

      <p class="text-secondary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.8;">
        If ${userName} is still well and simply hasn\u2019t logged in, you can confirm on
        their behalf by clicking the button below. This will reset their inactivity timer
        and prevent the legacy delivery.
      </p>

      ${ornamentalDivider()}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      <tr><td class="section-bg" style="padding:20px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;">
        <p class="text-muted" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#9A9183;line-height:1.7;">
          If you do not take action, ${userName}\u2019s legacy messages and shared memories
          will be delivered to their designated contacts in 30 days.
        </p>
      </td></tr>
      </table>`,
    ctaText: `Confirm ${userName} Is Well`,
    ctaUrl: verifyUrl,
    footerExtra: `
      <p style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You received this because ${userName} designated you as their trusted verifier.
      </p>`,
  });
}

export async function sendTrustedVerifierEmail(params: TrustedVerifierEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `Trusted Verifier Notice: ${params.userName} has been inactive`,
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
}

export function generateDeliveryEmailHtml(params: LegacyDeliveryEmailParams): string {
  const recipientName = escapeHtml(params.recipientName);
  const senderName = escapeHtml(params.senderName);
  const messageSubject = escapeHtml(params.messageSubject);
  const messageBody = escapeHtml(params.messageBody).replace(/\n/g, "<br>");
  const accessUrl = `${getSiteUrl()}/legacy/${encodeURIComponent(params.accessToken)}`;
  const expiresDate = new Date(params.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return emailLayout({
    preheader: `${params.senderName} left a message for you in their Memory Palace.`,
    headerHtml: `
      <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
        A Legacy Message
      </p>
      <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
        From ${senderName}
      </h1>
      <p class="header-subtitle" style="margin:14px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#8B7355;line-height:1.6;font-style:italic;">
        Left for you in their Memory Palace
      </p>`,
    bodyHtml: `
      <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:#2C2C2A;line-height:1.5;">
        Dear ${recipientName},
      </p>
      <p class="text-secondary" style="margin:0 0 28px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.8;">
        ${senderName} prepared this message for you in their Memory Palace, to be
        delivered as part of their digital legacy.
      </p>

      ${messageSubject ? `
      <p class="text-primary" style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:600;color:#2C2C2A;">
        ${messageSubject}
      </p>` : ""}

      <!-- The message itself -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr><td style="padding:28px 32px;border-left:2px solid #C17F59;">
        <p class="text-primary" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
          ${messageBody}
        </p>
      </td></tr>
      </table>

      ${ornamentalDivider()}

      <p class="text-muted" style="margin:16px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#9A9183;line-height:1.7;">
        ${senderName} also shared some of their memories with you. You can view
        them using the link below. This link expires on ${expiresDate}.
      </p>`,
    ctaText: "View Shared Memories",
    ctaUrl: accessUrl,
    footerExtra: `
      <p style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        This is a one-time legacy delivery. No further emails will be sent.
      </p>`,
  });
}

export async function sendDeliveryEmail(params: LegacyDeliveryEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `A legacy message from ${params.senderName}`,
    html: generateDeliveryEmailHtml(params),
    tag: "legacy-delivery",
  });
}
