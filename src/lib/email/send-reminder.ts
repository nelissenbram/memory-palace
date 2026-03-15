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

type ReminderType = "time_capsule_reveal" | "goal_deadline" | "re_engagement";

interface BaseReminderParams {
  recipientEmail: string;
  displayName: string;
}

interface TimeCapsuleRevealParams extends BaseReminderParams {
  type: "time_capsule_reveal";
  capsuleTitle: string;
}

interface GoalDeadlineParams extends BaseReminderParams {
  type: "goal_deadline";
  goalTitle: string;
  daysRemaining: number;
}

interface ReEngagementParams extends BaseReminderParams {
  type: "re_engagement";
  daysSinceLogin: number;
  memoryCount: number;
}

export type ReminderEmailParams =
  | TimeCapsuleRevealParams
  | GoalDeadlineParams
  | ReEngagementParams;

function getSubjectAndContent(params: ReminderEmailParams): {
  subject: string;
  headerEmoji: string;
  headerTitle: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
} {
  const displayName = escapeHtml(params.displayName);

  switch (params.type) {
    case "time_capsule_reveal": {
      const title = escapeHtml(params.capsuleTitle);
      return {
        subject: `A time capsule has opened: "${params.capsuleTitle}"`,
        headerEmoji: "&#x1F389;",
        headerTitle: `A Time Capsule Has Opened!`,
        bodyHtml: `
          <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
            ${displayName}, the wait is over! Your time capsule
            <em>&ldquo;${title}&rdquo;</em> is ready to be revealed.
          </p>
          <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
            Open it now to rediscover the memory you sealed away. What will you find inside?
          </p>`,
        ctaText: "Open Your Time Capsule",
        ctaUrl: `${SITE_URL}/palace`,
      };
    }

    case "goal_deadline": {
      const goal = escapeHtml(params.goalTitle);
      const daysText =
        params.daysRemaining === 1
          ? "tomorrow"
          : `in ${params.daysRemaining} days`;
      return {
        subject: `Reminder: "${params.goalTitle}" deadline is ${daysText}`,
        headerEmoji: "&#x23F0;",
        headerTitle: `Your Goal Deadline Is Approaching`,
        bodyHtml: `
          <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
            Hi ${displayName}! Just a gentle reminder that your goal
            <em>&ldquo;${goal}&rdquo;</em> has a deadline coming up <strong>${daysText}</strong>.
          </p>
          <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
            Take a moment to check in on your progress. Every step forward counts.
          </p>`,
        ctaText: "Check Your Progress",
        ctaUrl: `${SITE_URL}/palace`,
      };
    }

    case "re_engagement": {
      const weeks = Math.floor(params.daysSinceLogin / 7);
      const timeText = weeks === 1 ? "a week" : `${weeks} weeks`;
      return {
        subject: `We miss you, ${params.displayName}! Your memories are waiting`,
        headerEmoji: "&#x1F3DB;&#xFE0F;",
        headerTitle: `Your Palace Misses You`,
        bodyHtml: `
          <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:16px;color:#2C2C2A;line-height:1.7;">
            Hi ${displayName}, it&rsquo;s been ${timeText} since your last visit.
            Your ${params.memoryCount} ${params.memoryCount === 1 ? "memory is" : "memories are"} waiting for you.
          </p>
          <p style="margin:0 0 20px;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;">
            The best time to preserve a memory is the moment it happens.
            Why not add something new today?
          </p>
          <!-- Suggestions -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td style="padding:16px 20px;background-color:#F2EDE7;border-radius:12px;">
            <p style="margin:0 0 10px;font-family:'Georgia',serif;font-size:13px;color:#8B7355;font-weight:600;">
              Quick ideas to get started:
            </p>
            <p style="margin:0 0 6px;font-family:'Georgia',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
              &#x2728; Add a photo from this week
            </p>
            <p style="margin:0 0 6px;font-family:'Georgia',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
              &#x270D;&#xFE0F; Write a quick journal entry
            </p>
            <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
              &#x1F4E6; Create a time capsule for the future
            </p>
          </td></tr>
          </table>`,
        ctaText: "Return to Your Palace",
        ctaUrl: `${SITE_URL}/palace`,
      };
    }
  }
}

export function generateReminderEmailHtml(params: ReminderEmailParams): string {
  const { headerEmoji, headerTitle, bodyHtml, ctaText, ctaUrl } =
    getSubjectAndContent(params);
  const unsubscribeUrl = `${SITE_URL}/api/email/unsubscribe?unsubscribe=true&email=${encodeURIComponent(params.recipientEmail)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:20px;border:1px solid #EEEAE3;box-shadow:0 4px 24px rgba(44,44,42,0.08);overflow:hidden;">

  <!-- Header gradient -->
  <tr><td style="background:linear-gradient(135deg,#C17F59 0%,#8B7355 100%);padding:36px 32px 28px;text-align:center;">
    <div style="font-size:36px;margin-bottom:12px;">${headerEmoji}</div>
    <h1 style="margin:0;font-family:'Georgia',serif;font-size:22px;font-weight:400;color:#FFFFFF;line-height:1.4;">
      ${headerTitle}
    </h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 24px;">
    ${bodyHtml}

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${ctaUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(193,127,89,0.3);">
        ${ctaText}
      </a>
    </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #EEEAE3;text-align:center;">
    <p style="margin:0 0 8px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.5;">
      The Memory Palace &mdash; Embrace Eternity
    </p>
    <p style="margin:0 0 12px;font-family:'Georgia',serif;font-size:11px;color:#D4C5B2;">
      You received this because you have email notifications enabled.
    </p>
    <a href="${unsubscribeUrl}" style="font-family:'Georgia',serif;font-size:11px;color:#9A9183;text-decoration:underline;">
      Unsubscribe from email reminders
    </a>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateReminderEmailSubject(params: ReminderEmailParams): string {
  return getSubjectAndContent(params).subject;
}

export async function sendReminderEmail(params: ReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = generateReminderEmailHtml(params);
  const subject = generateReminderEmailSubject(params);

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
  console.log(`[Reminder Email] Would send to ${params.recipientEmail}: ${subject}`);
  return { success: true };
}
