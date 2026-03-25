const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Escape user-provided strings before inserting into HTML templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Verification email (sent to the inactive user) ──

interface VerificationEmailParams {
  recipientEmail: string;
  displayName: string;
  inactiveDays: number;
  verificationToken: string;
}

export function generateVerificationEmailHtml(params: VerificationEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const verifyUrl = `${SITE_URL}/api/legacy/verify?token=${encodeURIComponent(params.verificationToken)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:20px;border:1px solid #EEEAE3;box-shadow:0 4px 24px rgba(44,44,42,0.08);overflow:hidden;">

  <!-- Header gradient -->
  <tr><td style="background:linear-gradient(135deg,#C17F59 0%,#8B7355 100%);padding:36px 32px 28px;text-align:center;">
    <div style="font-size:36px;margin-bottom:12px;">&#x1F3DB;&#xFE0F;</div>
    <h1 style="margin:0;font-family:'Georgia',serif;font-size:22px;font-weight:400;color:#FFFFFF;line-height:1.4;">
      Are you still there, ${displayName}?
    </h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 24px;">
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
      We noticed you haven&rsquo;t visited your Memory Palace in <strong>${params.inactiveDays} days</strong>.
    </p>
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
      Your legacy contacts are configured to receive your memories if you become
      inactive. To confirm you&rsquo;re still here and reset this timer, please
      click the button below.
    </p>
    <p style="margin:0 0 28px;font-family:'Georgia',serif;font-size:14px;color:#9A9183;line-height:1.7;">
      If we don&rsquo;t hear from you within 30 days, your legacy messages and
      shared memories will be delivered to your designated contacts.
    </p>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${verifyUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4A6741,#5A7751);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(74,103,65,0.3);">
        I&rsquo;m Still Here
      </a>
    </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #EEEAE3;text-align:center;">
    <p style="margin:0 0 8px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.5;">
      The Memory Palace &mdash; Embrace Eternity
    </p>
    <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#D4C5B2;">
      You received this because you have legacy delivery enabled.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = generateVerificationEmailHtml(params);
  const subject = `Are you still there, ${params.displayName}? — The Memory Palace`;

  return sendEmail(params.recipientEmail, subject, html);
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
  const accessUrl = `${SITE_URL}/legacy/${encodeURIComponent(params.accessToken)}`;
  const expiresDate = new Date(params.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:20px;border:1px solid #EEEAE3;box-shadow:0 4px 24px rgba(44,44,42,0.08);overflow:hidden;">

  <!-- Header gradient -->
  <tr><td style="background:linear-gradient(135deg,#C17F59 0%,#8B7355 100%);padding:36px 32px 28px;text-align:center;">
    <div style="font-size:36px;margin-bottom:12px;">&#x1F3DB;&#xFE0F;</div>
    <h1 style="margin:0;font-family:'Georgia',serif;font-size:22px;font-weight:400;color:#FFFFFF;line-height:1.4;">
      A Message from ${senderName}
    </h1>
    <p style="margin:8px 0 0;font-family:'Georgia',serif;font-size:14px;color:#FFFFFF;opacity:0.85;">
      Left for you in their Memory Palace
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 24px;">
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
      Dear ${recipientName},
    </p>
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
      ${senderName} prepared this message for you in their Memory Palace, to be
      delivered as part of their digital legacy.
    </p>

    ${messageSubject ? `
    <p style="margin:0 0 8px;font-family:'Georgia',serif;font-size:14px;font-weight:600;color:#2C2C2A;">
      ${messageSubject}
    </p>` : ""}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border-radius:12px;border:1px solid #EEEAE3;margin:0 0 24px;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0;font-family:'Georgia',serif;font-size:15px;color:#2C2C2A;line-height:1.7;">
        ${messageBody}
      </p>
    </td></tr>
    </table>

    <p style="margin:0 0 28px;font-family:'Georgia',serif;font-size:14px;color:#9A9183;line-height:1.7;">
      ${senderName} also shared some of their memories with you. You can view
      them using the link below. This link expires on ${expiresDate}.
    </p>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${accessUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(193,127,89,0.3);">
        View Shared Memories
      </a>
    </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #EEEAE3;text-align:center;">
    <p style="margin:0 0 8px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.5;">
      The Memory Palace &mdash; Embrace Eternity
    </p>
    <p style="margin:0;font-family:'Georgia',serif;font-size:11px;color:#D4C5B2;">
      This is a one-time legacy delivery. No further emails will be sent.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendDeliveryEmail(params: LegacyDeliveryEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = generateDeliveryEmailHtml(params);
  const subject = `A legacy message from ${params.senderName} — The Memory Palace`;

  return sendEmail(params.recipientEmail, subject, html);
}

// ── Shared email sender ──

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "The Memory Palace <noreply@memorypalace.app>",
          to: [to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: `Email service error: ${(err as Record<string, unknown>).message || res.statusText}` };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: `Email send failed: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  // Fallback: log
  console.log(`[Legacy Email] Would send to ${to}: ${subject}`);
  return { success: true };
}
