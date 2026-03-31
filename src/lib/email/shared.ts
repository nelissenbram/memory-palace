import crypto from "crypto";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/* ── HMAC helpers for unsubscribe tokens ── */
const UNSUBSCRIBE_SECRET =
  process.env.CRON_SECRET || process.env.UNSUBSCRIBE_SECRET || "fallback-dev-secret";

/** Sign a userId into a tamper-proof unsubscribe token: `userId.hmacHex` */
export function signUnsubscribeToken(userId: string): string {
  const hmac = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET).update(userId).digest("hex");
  return `${userId}.${hmac}`;
}

/** Verify an unsubscribe token. Returns the userId if valid, null otherwise. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const userId = token.slice(0, dotIndex);
  const providedHmac = token.slice(dotIndex + 1);

  const expectedHmac = crypto
    .createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest("hex");

  // Timing-safe comparison — both buffers must be the same length
  if (providedHmac.length !== expectedHmac.length) return null;

  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedHmac, "utf8"),
    Buffer.from(expectedHmac, "utf8"),
  );

  return isValid ? userId : null;
}

/** Escape user-provided strings before inserting into HTML templates. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getSiteUrl(): string {
  return SITE_URL;
}

/** Strip HTML tags and decode common entities for plain-text fallback. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&#x([\dA-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── Ornamental divider ── */
function ornamentalDivider(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">
      <tr><td style="padding:8px 0;text-align:center;">
        <span style="display:inline-block;width:40px;height:1px;background:#D4C5B2;vertical-align:middle;"></span>
        <span style="display:inline-block;width:6px;height:6px;border:1px solid #C17F59;border-radius:50%;margin:0 12px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:40px;height:1px;background:#D4C5B2;vertical-align:middle;"></span>
      </td></tr>
    </table>`;
}

export { ornamentalDivider };

/** Footer tagline translations. */
const footerTaglines: Record<string, string> = {
  en: "Preserve what matters. Share what connects. Leave what lasts.",
  nl: "Bewaar wat ertoe doet. Deel wat verbindt. Laat na wat blijft.",
};

export function emailLayout(opts: {
  preheader: string;
  headerHtml: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerExtra?: string;
  locale?: string;
}): string {
  const { preheader, headerHtml, bodyHtml, ctaText, ctaUrl, footerExtra, locale } = opts;
  const lang = locale || "en";
  const tagline = footerTaglines[lang] || footerTaglines.en;

  const ctaBlock = ctaText && ctaUrl
    ? `
    <!-- CTA -->
    <tr><td style="padding:36px 48px 12px;text-align:center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:50px;v-text-anchor:middle;width:260px;" arcsize="10%" fillcolor="#C17F59" stroke="f">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Georgia,serif;font-size:15px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${ctaText}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${ctaUrl}" style="display:inline-block;padding:15px 44px;background:#C17F59;color:#FFFFFF;font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:4px;letter-spacing:1.2px;text-transform:uppercase;mso-hide:all;transition:background 0.2s;">
        ${ctaText}
      </a>
      <!--<![endif]-->
    </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>The Memory Palace</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>
    table { border-collapse: collapse; }
    .email-card { border: 1px solid #E8E2DA; }
  </style>
  <![endif]-->
  <style>
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }

    /* ── Mobile ── */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-body { padding: 28px 24px !important; }
      .email-header { padding: 44px 24px 36px !important; }
      .email-footer { padding: 24px 24px 28px !important; }
      .cta-cell { padding: 28px 24px 8px !important; }
      .stat-cell { display: block !important; width: 100% !important; padding: 14px 20px !important; text-align: left !important; }
      .stat-cell p:first-child { display: inline !important; font-size: 24px !important; }
      .stat-cell p:last-child { display: inline !important; margin-left: 8px !important; }
      .step-number { width: 28px !important; height: 28px !important; line-height: 28px !important; font-size: 13px !important; }
    }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #1a1917 !important; }
      .email-card { background-color: #262523 !important; border-color: #3a3835 !important; }
      .email-header-bg { background: linear-gradient(170deg, #2C2C2A 0%, #1a1917 100%) !important; }
      .email-header-border { border-bottom-color: #3a3835 !important; }
      .text-primary { color: #F2EDE7 !important; }
      .text-secondary { color: #D4C5B2 !important; }
      .text-muted { color: #9A9183 !important; }
      .section-bg { background-color: #2e2d2a !important; border-color: #3a3835 !important; }
      .divider { border-color: #3a3835 !important; }
      .header-title { color: #F2EDE7 !important; }
      .header-subtitle { color: #D4C5B2 !important; }
      .footer-divider { border-color: #3a3835 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F2EDE7;font-family:'Source Sans 3','Segoe UI',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden inbox preview text) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}${"&zwnj; ".repeat(10)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:#F2EDE7;">
  <tr><td style="padding:48px 16px 40px;" align="center">

    <!-- Wordmark -->
    <table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">
    <tr><td style="padding:0 0 28px;text-align:center;">
      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#8B7355;letter-spacing:3.5px;text-transform:uppercase;">
        The Memory Palace
      </p>
    </td></tr>
    </table>

    <!-- Card -->
    <table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container email-card" style="max-width:580px;width:100%;background-color:#FFFFFF;border-radius:2px;border:1px solid #E8E2DA;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

      <!-- Header -->
      <tr><td class="email-header email-header-bg email-header-border" style="padding:52px 48px 40px;text-align:center;border-bottom:1px solid #E8E2DA;">
        ${headerHtml}
      </td></tr>

      <!-- Body -->
      <tr><td class="email-body" style="padding:40px 48px 28px;">
        ${bodyHtml}
      </td></tr>

      ${ctaBlock}

      <!-- Pre-footer spacer -->
      <tr><td style="padding:20px 0 0;"></td></tr>

      <!-- Footer -->
      <tr><td class="email-footer" style="padding:28px 48px 36px;">
        <!-- Thin top line -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 0 24px;">
            <div class="footer-divider" style="border-top:1px solid #EEEAE3;"></div>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="text-align:center;">
            <!-- Ornamental mark -->
            <div style="margin:0 0 16px;">
              <span style="display:inline-block;width:24px;height:1px;background:#D4C5B2;vertical-align:middle;"></span>
              <span style="display:inline-block;width:4px;height:4px;border:1px solid #C17F59;border-radius:50%;margin:0 10px;vertical-align:middle;"></span>
              <span style="display:inline-block;width:24px;height:1px;background:#D4C5B2;vertical-align:middle;"></span>
            </div>

            <p style="margin:0 0 4px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#8B7355;letter-spacing:2.5px;text-transform:uppercase;">
              The Memory Palace
            </p>
            <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;color:#B8A99A;line-height:1.6;font-style:italic;letter-spacing:0.3px;">
              ${tagline}
            </p>
            ${footerExtra || ""}
            <p style="margin:16px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;line-height:1.5;">
              <a href="${SITE_URL}" style="color:#B8A99A;text-decoration:none;">thememorypalace.ai</a>
            </p>
            <p style="margin:8px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;color:#D4C5B2;line-height:1.5;">
              The Memory Palace &middot; Antwerp, Belgium
            </p>
          </td></tr>
        </table>
      </td></tr>

    </table>

  </td></tr>
  </table>
</body>
</html>`;
}

/** Shared email sending via Resend with plain-text fallback. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string;
  tag?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, headers, replyTo, tag } = opts;
  const text = htmlToPlainText(html);

  if (process.env.RESEND_API_KEY) {
    try {
      const payload: Record<string, unknown> = {
        from: process.env.RESEND_FROM_EMAIL || "The Memory Palace <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
        text,
        reply_to: replyTo || "support@thememorypalace.ai",
      };
      if (headers) payload.headers = headers;
      if (tag) payload.tags = [{ name: "category", value: tag }];

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          error: `Email service error: ${(err as Record<string, unknown>).message || res.statusText}`,
        };
      }

      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: `Email send failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  // Fallback: log (email delivery not configured)
  console.log(`[Email] Would send to ${to}: ${subject}`);
  return { success: true };
}
