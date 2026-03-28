import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

interface WelcomeEmailParams {
  recipientEmail: string;
  displayName: string;
}

export function generateWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const palaceUrl = `${getSiteUrl()}/palace`;

  const headerHtml = `
    <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
      Welcome
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
      Hello, ${displayName}
    </h1>
    <p class="header-subtitle" style="margin:14px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#8B7355;line-height:1.6;">
      Your journey of preserving memories begins now.
    </p>`;

  const step = (n: number, title: string, desc: string, isLast: boolean) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${isLast ? "0" : "24"}px;">
    <tr>
      <td width="44" valign="top" style="padding-top:2px;">
        <div class="step-number" style="width:34px;height:34px;border-radius:50%;border:1.5px solid #D4C5B2;color:#C17F59;font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:600;text-align:center;line-height:34px;">
          ${n}
        </div>
      </td>
      <td style="padding-left:16px;">
        <p class="text-primary" style="margin:0 0 4px;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:600;color:#2C2C2A;line-height:1.3;">
          ${title}
        </p>
        <p class="text-secondary" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.6;">
          ${desc}
        </p>
      </td>
    </tr>
    </table>`;

  const bodyHtml = `
    <p class="text-secondary" style="margin:0 0 12px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#5C564E;line-height:1.8;">
      The Memory Palace is your private space to collect, preserve, and share
      the moments that matter most. Here is how to begin.
    </p>

    ${ornamentalDivider()}

    <div style="padding:20px 0 0;">
      ${step(1, "Take the guided tour", "Walk through the onboarding wizard to set up your first wing and room.", false)}
      ${step(2, "Import your photos", "Bring your favourite photos in from your device or cloud to start building your collection.", false)}
      ${step(3, "Start a memory track", "Themed prompts guide you to fill your palace room by room, one memory at a time.", true)}
    </div>`;

  return emailLayout({
    preheader: `Welcome to The Memory Palace, ${params.displayName}. Your journey starts now.`,
    headerHtml,
    bodyHtml,
    ctaText: "Enter Your Palace",
    ctaUrl: palaceUrl,
    footerExtra: `
      <p style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You received this because you signed up at thememorypalace.ai.
      </p>`,
  });
}

export function generateWelcomeEmailSubject(displayName: string): string {
  return `Welcome to The Memory Palace, ${escapeHtml(displayName)}`;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateWelcomeEmailSubject(params.displayName),
    html: generateWelcomeEmailHtml(params),
    tag: "welcome",
  });
}
