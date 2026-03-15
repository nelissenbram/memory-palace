const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface WelcomeEmailParams {
  recipientEmail: string;
  displayName: string;
}

export function generateWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const { displayName } = params;
  const palaceUrl = `${SITE_URL}/palace`;

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
      Welcome to The Memory Palace, ${displayName}
    </h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 24px;">
    <p style="margin:0 0 24px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
      Your journey of preserving memories begins now. We&rsquo;re so glad you&rsquo;re here.
    </p>
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
      Here are three tips to help you get started:
    </p>

    <!-- Tip 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
    <tr>
      <td width="44" valign="top" style="padding-top:2px;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-align:center;line-height:32px;">1</div>
      </td>
      <td style="padding-left:12px;">
        <p style="margin:0 0 4px;font-family:'Georgia',serif;font-size:15px;font-weight:600;color:#2C2C2A;">Take the guided tour</p>
        <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#9A9183;line-height:1.5;">Walk through the onboarding wizard to set up your very first wing and room.</p>
      </td>
    </tr>
    </table>

    <!-- Tip 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
    <tr>
      <td width="44" valign="top" style="padding-top:2px;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-align:center;line-height:32px;">2</div>
      </td>
      <td style="padding-left:12px;">
        <p style="margin:0 0 4px;font-family:'Georgia',serif;font-size:15px;font-weight:600;color:#2C2C2A;">Import photos from your cloud</p>
        <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#9A9183;line-height:1.5;">Bring your favourite photos in to start building your collection of memories.</p>
      </td>
    </tr>
    </table>

    <!-- Tip 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr>
      <td width="44" valign="top" style="padding-top:2px;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-align:center;line-height:32px;">3</div>
      </td>
      <td style="padding-left:12px;">
        <p style="margin:0 0 4px;font-family:'Georgia',serif;font-size:15px;font-weight:600;color:#2C2C2A;">Start your first memory building track</p>
        <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#9A9183;line-height:1.5;">Create themed rooms and fill them with the moments that matter most.</p>
      </td>
    </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${palaceUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(193,127,89,0.3);">
        Enter Your Palace
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
      You received this because you signed up at ${SITE_URL}.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateWelcomeEmailSubject(displayName: string): string {
  return `Welcome to The Memory Palace, ${displayName}`;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = generateWelcomeEmailHtml(params);
  const subject = generateWelcomeEmailSubject(params.displayName);

  // Try Resend first (recommended for transactional email)
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
          to: [params.recipientEmail],
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

  // Fallback: log (email delivery not configured)
  console.log(`[Welcome Email] Would send to ${params.recipientEmail}: ${subject}`);
  return { success: true }; // Don't block the registration flow if email isn't configured
}
