import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

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

function getContent(params: ReminderEmailParams): {
  subject: string;
  preheader: string;
  headerHtml: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
} {
  const displayName = escapeHtml(params.displayName);
  const siteUrl = getSiteUrl();

  switch (params.type) {
    case "time_capsule_reveal": {
      const title = escapeHtml(params.capsuleTitle);
      return {
        subject: `A time capsule has opened: "${params.capsuleTitle}"`,
        preheader: `${params.displayName}, your time capsule "${params.capsuleTitle}" is ready to be revealed!`,
        headerHtml: `
          <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
            Time Capsule
          </p>
          <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
            A Capsule Has Opened
          </h1>`,
        bodyHtml: `
          <p class="text-primary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
            ${displayName}, the wait is over. Your time capsule is ready to be revealed.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td class="section-bg" style="padding:28px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
            <p style="margin:0 0 4px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;color:#B8A99A;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
              Now open
            </p>
            <p class="text-primary" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:500;color:#2C2C2A;font-style:italic;">
              &ldquo;${title}&rdquo;
            </p>
          </td></tr>
          </table>

          <p class="text-secondary" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.7;">
            Open it now to rediscover the memory you sealed away. What will you find inside?
          </p>`,
        ctaText: "Open Your Time Capsule",
        ctaUrl: `${siteUrl}/palace`,
      };
    }

    case "goal_deadline": {
      const goal = escapeHtml(params.goalTitle);
      const daysText = params.daysRemaining === 1 ? "tomorrow" : `in ${params.daysRemaining} days`;
      return {
        subject: `Reminder: "${params.goalTitle}" deadline is ${daysText}`,
        preheader: `Your goal "${params.goalTitle}" has a deadline coming up ${daysText}.`,
        headerHtml: `
          <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
            Reminder
          </p>
          <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
            Your Goal Deadline Is Near
          </h1>`,
        bodyHtml: `
          <p class="text-primary" style="margin:0 0 20px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
            A gentle reminder, ${displayName} &mdash; your goal has a deadline approaching.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td class="section-bg" style="padding:28px 24px;background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;text-align:center;">
            <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:500;color:#2C2C2A;font-style:italic;">
              &ldquo;${goal}&rdquo;
            </p>
            <span style="display:inline-block;padding:4px 14px;border:1px solid #D4C5B2;border-radius:2px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;font-weight:600;color:#8B7355;letter-spacing:1.2px;text-transform:uppercase;">
              Due ${daysText}
            </span>
          </td></tr>
          </table>

          <p class="text-secondary" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#8B7355;line-height:1.7;">
            Take a moment to check in on your progress. Every step forward counts.
          </p>`,
        ctaText: "Check Your Progress",
        ctaUrl: `${siteUrl}/palace`,
      };
    }

    case "re_engagement": {
      const weeks = Math.floor(params.daysSinceLogin / 7);
      const timeText = weeks === 1 ? "a week" : `${weeks} weeks`;
      return {
        subject: `Your memories are waiting, ${params.displayName}`,
        preheader: `It's been ${timeText} since your last visit. Your ${params.memoryCount} memories are waiting.`,
        headerHtml: `
          <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
            We Miss You
          </p>
          <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
            Your Palace Awaits
          </h1>`,
        bodyHtml: `
          <p class="text-primary" style="margin:0 0 8px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#2C2C2A;line-height:1.8;">
            It has been ${timeText} since your last visit, ${displayName}.
            Your ${params.memoryCount} ${params.memoryCount === 1 ? "memory is" : "memories are"} waiting for you.
          </p>

          <p class="text-secondary" style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#8B7355;line-height:1.7;font-style:italic;">
            The best time to preserve a memory is the moment it happens.
          </p>

          ${ornamentalDivider()}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
          <tr><td class="section-bg" style="padding:24px;background-color:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;">
            <p style="margin:0 0 14px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;color:#B8A99A;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">
              Quick ideas to get started
            </p>
            <p class="text-primary" style="margin:0 0 8px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.6;">
              <span style="color:#C17F59;margin-right:8px;">&mdash;</span> Add a photo from this week
            </p>
            <p class="text-primary" style="margin:0 0 8px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.6;">
              <span style="color:#C17F59;margin-right:8px;">&mdash;</span> Write a quick journal entry
            </p>
            <p class="text-primary" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.6;">
              <span style="color:#C17F59;margin-right:8px;">&mdash;</span> Create a time capsule for the future
            </p>
          </td></tr>
          </table>`,
        ctaText: "Return to Your Palace",
        ctaUrl: `${siteUrl}/palace`,
      };
    }
  }
}

export function generateReminderEmailHtml(params: ReminderEmailParams): string {
  const { preheader, headerHtml, bodyHtml, ctaText, ctaUrl } = getContent(params);
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true&email=${encodeURIComponent(params.recipientEmail)}`;

  return emailLayout({
    preheader,
    headerHtml,
    bodyHtml,
    ctaText,
    ctaUrl,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You received this because email notifications are enabled.
      </p>
      <a href="${unsubscribeUrl}" style="font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#9A9183;text-decoration:underline;">
        Unsubscribe from reminders
      </a>`,
  });
}

export function generateReminderEmailSubject(params: ReminderEmailParams): string {
  return getContent(params).subject;
}

export async function sendReminderEmail(params: ReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { subject } = getContent(params);
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true&email=${encodeURIComponent(params.recipientEmail)}`;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    html: generateReminderEmailHtml(params),
    tag: "reminder",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
