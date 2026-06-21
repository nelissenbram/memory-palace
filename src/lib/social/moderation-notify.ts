import "server-only";
import { sendEmail, escapeHtml, getSiteUrl } from "@/lib/email/shared";

/**
 * Email the moderation team when a user files a report, so objectionable
 * content / abusive users can be removed within 24h (Apple Guideline 1.2).
 * Best-effort: failures are swallowed by the caller.
 */
export async function notifyModerators(input: {
  reporterId: string;
  targetType: string;
  targetId: string;
  targetUserId?: string;
  reason: string;
  details?: string | null;
}): Promise<void> {
  const to =
    process.env.MODERATION_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    "support@thememorypalace.ai";

  const rows: [string, string][] = [
    ["Reporter", input.reporterId],
    ["Content type", input.targetType],
    ["Content ID", input.targetId],
    ["Reported user", input.targetUserId || "—"],
    ["Reason", input.reason],
    ["Details", input.details || "—"],
  ];

  const html = `
    <h2>New content report</h2>
    <p>A user flagged content in The Memory Palace. Please review within 24 hours.</p>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="font-weight:600">${escapeHtml(k)}</td><td>${escapeHtml(
              String(v)
            )}</td></tr>`
        )
        .join("")}
    </table>
    <p style="margin-top:12px">Review queue: ${getSiteUrl()}/admin/reports</p>
  `;

  await sendEmail({
    to,
    subject: `[Moderation] ${input.targetType} reported — ${input.reason}`,
    html,
    tag: "moderation",
  });
}
