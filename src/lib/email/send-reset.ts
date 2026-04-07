import { emailLayout, sendEmail, ornamentalDivider } from "./shared";

interface ResetEmailParams {
  recipientEmail: string;
  resetLink: string;
}

export function generateResetEmailHtml(params: ResetEmailParams): string {
  const resetLink = params.resetLink;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      Password Reset
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:30px;font-weight:500;color:#2C2C2A;line-height:1.25;">
      Reset your Memory Palace password
    </h1>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.75;">
      We received a request to reset the password on your Memory Palace account.
      Click the button below to choose a new one.
    </p>

    ${ornamentalDivider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
    <tr><td class="section-bg" style="padding:16px 22px;background-color:#FAFAF7;border:1px solid #EEEAE3;border-left:3px solid #D4AF37;border-radius:2px;">
      <p class="text-muted" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#5C4733;line-height:1.65;">
        This link will expire in <strong>1 hour</strong>. If you did not request a reset,
        you can safely ignore this email &mdash; your password will remain unchanged.
      </p>
    </td></tr>
    </table>`;

  return emailLayout({
    preheader: "Reset your Memory Palace password. This link expires in 1 hour.",
    headerHtml,
    bodyHtml,
    ctaText: "Reset password",
    ctaUrl: resetLink,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        You received this because a password reset was requested for your account at thememorypalace.ai.
      </p>`,
  });
}

export async function sendResetEmail(params: ResetEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: "Reset your Memory Palace password",
    html: generateResetEmailHtml(params),
    tag: "password-reset",
  });
}
