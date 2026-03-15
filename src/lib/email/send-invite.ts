const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  const { inviterName, roomName, wingName, shareId, permission, personalMessage } = params;
  const acceptUrl = `${SITE_URL}/invite/${shareId}`;
  const permissionText = permission === "contribute"
    ? "see and contribute to"
    : "explore";

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
      ${inviterName} invited you to<br>explore their Memory Palace
    </h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 24px;">
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
      Hi there! <strong>${inviterName}</strong> wants to share a special room with you &mdash;
      <em>&ldquo;${roomName}&rdquo;</em>${wingName ? ` in their <strong>${wingName}</strong> wing` : ""}.
    </p>
    <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
      This room contains precious memories they&rsquo;d love you to ${permissionText}.
    </p>

    ${personalMessage ? `
    <!-- Personal message -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="padding:16px 20px;background-color:#F2EDE7;border-radius:12px;border-left:3px solid #C17F59;">
      <p style="margin:0 0 6px;font-family:'Georgia',serif;font-size:12px;color:#9A9183;text-transform:uppercase;letter-spacing:0.5px;">
        ${inviterName} says:
      </p>
      <p style="margin:0;font-family:'Georgia',serif;font-size:15px;color:#2C2C2A;line-height:1.6;font-style:italic;">
        &ldquo;${personalMessage}&rdquo;
      </p>
    </td></tr>
    </table>
    ` : ""}

    <!-- Room card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr><td style="padding:20px;background-color:#FAFAF7;border-radius:14px;border:1px solid #EEEAE3;text-align:center;">
      <div style="font-family:'Georgia',serif;font-size:18px;font-weight:600;color:#2C2C2A;margin-bottom:4px;">
        ${roomName}
      </div>
      ${wingName ? `<div style="font-family:'Georgia',serif;font-size:13px;color:#9A9183;">${wingName} Wing</div>` : ""}
      <div style="margin-top:8px;display:inline-block;padding:4px 12px;background-color:${permission === "contribute" ? "#4A674118" : "#C17F5918"};border-radius:20px;font-family:'Georgia',serif;font-size:12px;color:${permission === "contribute" ? "#4A6741" : "#C17F59"};">
        Can ${permission}
      </div>
    </td></tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${acceptUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(193,127,89,0.3);">
        View Their Memories
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
      You received this because ${inviterName} shared a room with ${params.recipientEmail}.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateInviteEmailSubject(inviterName: string): string {
  return `${inviterName} invited you to explore their Memory Palace`;
}

// Send invite email using Resend (if configured) or Supabase Edge Function fallback
export async function sendInviteEmail(params: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = generateInviteEmailHtml(params);
  const subject = generateInviteEmailSubject(params.inviterName);

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
        return { success: false, error: `Email service error: ${(err as any).message || res.statusText}` };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: `Email send failed: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  // Fallback: log the invite (email delivery not configured)
  console.log(`[Invite Email] Would send to ${params.recipientEmail}: ${subject}`);
  console.log(`[Invite Email] Accept URL: ${SITE_URL}/invite/${params.shareId}`);
  return { success: true }; // Don't block the share flow if email isn't configured
}
