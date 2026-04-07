import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

interface WelcomeEmailParams {
  recipientEmail: string;
  displayName: string;
}

export function generateWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const palaceUrl = `${getSiteUrl()}/palace`;

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      Benvenuto
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:32px;font-weight:500;color:#2C2C2A;line-height:1.25;letter-spacing:-0.005em;">
      Welcome to your Memory Palace,<br/>${displayName}
    </h1>
    <p class="header-subtitle" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#5C4733;line-height:1.65;font-style:italic;">
      A palace built room by room — for the life you have lived.
    </p>`;

  const wing = (title: string, desc: string) => `
    <tr>
      <td style="padding:10px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2C2C2A;line-height:1.65;">
        <span style="color:#D4AF37;font-size:18px;vertical-align:-1px;">&#10086;</span>
        &nbsp;<strong style="color:#5C4733;">${title}</strong> &mdash; <span style="color:#5C564E;">${desc}</span>
      </td>
    </tr>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      Your Memory Palace is a private place, modelled on the classical houses of Rome and Tuscany.
      Inside, memories live in rooms, and rooms belong to themed wings that map to the chapters of your life.
    </p>

    ${ornamentalDivider()}

    <p style="margin:20px 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.16em;text-transform:uppercase;text-align:center;">
      The Wings of Your Palace
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${wing("Family", "the faces and voices that shaped you")}
      ${wing("Travel", "the places that changed how you see the world")}
      ${wing("Childhood", "the early years, kept safe")}
      ${wing("Career", "the work, the craft, the long road")}
      ${wing("Creativity", "everything you ever made, wrote, or dreamt up")}
    </table>

    ${ornamentalDivider()}

    <p class="text-secondary" style="margin:22px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#5C564E;line-height:1.8;">
      To begin, you can import photos directly from Dropbox, upload from your device,
      organise them into rooms, and &mdash; when you are ready &mdash; invite family to share a wing with you.
    </p>

    <p class="text-secondary" style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#5C564E;line-height:1.8;font-style:italic;">
      There is no rush. A palace is built slowly.
    </p>`;

  return emailLayout({
    preheader: `Welcome, ${params.displayName}. Your palace of memories is ready.`,
    headerHtml,
    bodyHtml,
    ctaText: "Enter your Palace",
    ctaUrl: palaceUrl,
    footerExtra: `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        You received this because you signed up at thememorypalace.ai.
      </p>`,
  });
}

export function generateWelcomeEmailSubject(displayName: string): string {
  return `Welcome to your Memory Palace, ${escapeHtml(displayName)}`;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.recipientEmail,
    subject: generateWelcomeEmailSubject(params.displayName),
    html: generateWelcomeEmailHtml(params),
    tag: "welcome",
  });
}
