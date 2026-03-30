import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider } from "./shared";

export interface OnThisDayMemory {
  title: string;
  yearsAgo: number;
}

export interface UpcomingCapsule {
  title: string;
  revealDate: string;
}

export interface SharedRoomActivity {
  roomName: string;
  contributorName: string;
  memoryCount: number;
}

export interface TrackProgress {
  trackName: string;
  percentComplete: number;
  icon: string;
  /** Human-readable description of the next step to complete */
  nextStepHint: string | null;
  /** How many more of "something" to reach the next milestone (e.g. "15 more memories") */
  nextMilestoneLabel: string | null;
}

export interface MemoryOfTheWeek {
  title: string;
  thumbnailUrl: string | null;
  roomName: string;
}

export interface WeeklyStats {
  totalMemories: number;
  memoriesThisWeek: number;
  totalRooms: number;
}

export interface DigestEmailParams {
  recipientEmail: string;
  userId: string;
  displayName: string;
  onThisDayMemories: OnThisDayMemory[];
  upcomingCapsules: UpcomingCapsule[];
  sharedRoomActivity: SharedRoomActivity[];
  trackProgress: TrackProgress | null;
  weeklyStats: WeeklyStats;
  memoryOfTheWeek: MemoryOfTheWeek | null;
  /** Number of consecutive weeks the user has added at least one memory */
  streakWeeks: number;
}

/* ── Section renderers ── */

function sectionHeading(title: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
      <tr>
        <td style="font-family:'Cormorant Garamond',Georgia,serif;font-size:12px;font-weight:600;color:#C17F59;letter-spacing:2px;text-transform:uppercase;">
          ${title}
        </td>
        <td style="text-align:right;">
          <div class="divider" style="border-top:1px solid #EEEAE3;margin-top:7px;"></div>
        </td>
      </tr>
    </table>`;
}

function renderStats(stats: WeeklyStats, streakWeeks: number): string {
  const cell = (value: string, label: string, showBorder: boolean) => `
    <td class="stat-cell" width="${streakWeeks > 0 ? "25" : "33"}%" style="text-align:center;padding:22px 8px;${showBorder ? "border-right:1px solid #EEEAE3;" : ""}">
      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;font-weight:400;color:#2C2C2A;line-height:1.1;letter-spacing:-1px;">
        ${value}
      </p>
      <p style="margin:6px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;color:#8B7355;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
        ${label}
      </p>
    </td>`;

  const streakCell = streakWeeks > 0
    ? cell(`${streakWeeks}`, streakWeeks === 1 ? "Week Streak" : "Week Streak", false)
    : "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr>
        ${cell(`${stats.totalMemories}`, "Total Memories", true)}
        ${cell(`${stats.memoriesThisWeek}`, "This Week", true)}
        ${cell(`${stats.totalRooms}`, "Rooms", streakWeeks > 0)}
        ${streakCell}
      </tr>
    </table>`;
}

function renderMemoryOfTheWeek(memory: MemoryOfTheWeek | null): string {
  if (!memory) return "";

  const thumbnail = memory.thumbnailUrl
    ? `<img src="${escapeHtml(memory.thumbnailUrl)}" alt="${escapeHtml(memory.title)}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:3px;border:1px solid #EEEAE3;" />`
    : `<div style="width:120px;height:120px;border-radius:3px;background:#C17F59;background:linear-gradient(145deg,#C17F59 0%,#8B7355 100%);text-align:center;line-height:120px;">
        <span style="font-size:32px;opacity:0.6;">&#x1f3db;</span>
      </div>`;

  return `
    ${sectionHeading("Memory of the Week")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr>
        <td style="padding:20px;width:120px;" valign="top">${thumbnail}</td>
        <td style="padding:20px 20px 20px 4px;" valign="middle">
          <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:500;color:#2C2C2A;line-height:1.3;font-style:italic;">
            &ldquo;${escapeHtml(memory.title)}&rdquo;
          </p>
          <p class="text-muted" style="margin:0 0 14px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#9A9183;letter-spacing:0.3px;">
            in <strong style="color:#8B7355;">${escapeHtml(memory.roomName)}</strong>
          </p>
          <p style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#B8A99A;font-style:italic;line-height:1.5;">
            Revisit this memory and the stories it holds.
          </p>
        </td>
      </tr>
    </table>`;
}

function renderStreak(streakWeeks: number): string {
  if (streakWeeks < 2) return "";

  // Build flame icons based on streak length (max 8 for display)
  const flames = Math.min(streakWeeks, 8);
  const flameStr = "&#x1f525;".repeat(flames) + (streakWeeks > 8 ? " ..." : "");

  const encouragement = streakWeeks >= 12
    ? "Remarkable dedication. Your future self will thank you."
    : streakWeeks >= 8
      ? "An incredible run. Your palace grows richer every week."
      : streakWeeks >= 4
        ? "A month of consistency. Your memories are building something lasting."
        : "Keep the momentum going &mdash; every week counts.";

  return `
    ${sectionHeading("Your Streak")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;padding:20px 24px;margin:0 0 28px;">
    <tr><td style="text-align:center;">
      <p style="margin:0 0 6px;font-size:20px;line-height:1;">
        ${flameStr}
      </p>
      <p class="text-primary" style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#2C2C2A;line-height:1.3;">
        <strong>${streakWeeks} weeks</strong> in a row
      </p>
      <p class="text-muted" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#8B7355;font-style:italic;line-height:1.5;">
        ${encouragement}
      </p>
    </td></tr>
    </table>`;
}

function renderOnThisDay(memories: OnThisDayMemory[]): string {
  if (memories.length === 0) return "";

  const items = memories.slice(0, 5).map((m, i) => `
    <tr><td style="padding:13px 20px;${i < memories.slice(0, 5).length - 1 ? "border-bottom:1px solid #F0EBE5;" : ""}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="text-primary" style="font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
          &ldquo;${escapeHtml(m.title)}&rdquo;
        </td>
        <td width="80" style="text-align:right;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#B8A99A;white-space:nowrap;">
          ${m.yearsAgo} ${m.yearsAgo === 1 ? "year" : "years"} ago
        </td>
      </tr></table>
    </td></tr>`).join("");

  return `
    ${sectionHeading("On This Day")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderCapsules(capsules: UpcomingCapsule[]): string {
  if (capsules.length === 0) return "";

  const items = capsules.slice(0, 5).map((c, i) => {
    const dateStr = new Date(c.revealDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `
    <tr><td style="padding:13px 20px;${i < capsules.slice(0, 5).length - 1 ? "border-bottom:1px solid #F0EBE5;" : ""}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="text-primary" style="font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;">
          &ldquo;${escapeHtml(c.title)}&rdquo;
        </td>
        <td width="70" style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border:1px solid #D4C5B2;border-radius:2px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;font-weight:600;color:#8B7355;letter-spacing:0.5px;text-transform:uppercase;">
            ${escapeHtml(dateStr)}
          </span>
        </td>
      </tr></table>
    </td></tr>`;
  }).join("");

  return `
    ${sectionHeading("Time Capsules Opening Soon")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderSharedActivity(activities: SharedRoomActivity[]): string {
  if (activities.length === 0) return "";

  const items = activities.slice(0, 5).map((a, i) => `
    <tr><td style="padding:13px 20px;${i < activities.slice(0, 5).length - 1 ? "border-bottom:1px solid #F0EBE5;" : ""}">
      <p class="text-primary" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
        <strong>${escapeHtml(a.contributorName)}</strong> added ${a.memoryCount} ${a.memoryCount === 1 ? "memory" : "memories"} to
        <em>&ldquo;${escapeHtml(a.roomName)}&rdquo;</em>
      </p>
    </td></tr>`).join("");

  return `
    ${sectionHeading("Shared Room Activity")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderTrack(track: TrackProgress | null): string {
  if (!track) return "";
  const pct = Math.round(track.percentComplete);
  const barWidth = Math.max(5, pct);

  // Build a compelling, specific CTA based on progress
  let encouragement: string;
  if (pct >= 90) {
    encouragement = "You&rsquo;re so close to completing this track. One final push!";
  } else if (pct >= 75) {
    encouragement = "The finish line is in sight &mdash; keep going.";
  } else if (pct >= 50) {
    encouragement = "You&rsquo;re past the halfway mark. The momentum is yours.";
  } else if (pct >= 25) {
    encouragement = "Great progress. Every step deepens your palace.";
  } else {
    encouragement = "Every memory counts. Keep building.";
  }

  // Next step hint with milestone label for a specific CTA
  const nextStepHtml = track.nextMilestoneLabel
    ? `<p class="text-primary" style="margin:10px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#2C2C2A;line-height:1.5;">
        <strong>Next:</strong> ${escapeHtml(track.nextMilestoneLabel)}
      </p>`
    : track.nextStepHint
      ? `<p class="text-primary" style="margin:10px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;color:#2C2C2A;line-height:1.5;">
          <strong>Next:</strong> ${escapeHtml(track.nextStepHint)}
        </p>`
      : "";

  return `
    ${sectionHeading("Your Progress")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
    <tr><td style="padding:20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
            <strong class="text-primary">${escapeHtml(track.icon)} ${escapeHtml(track.trackName)}</strong>
          </td>
          <td style="text-align:right;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#C9A84C;letter-spacing:-0.5px;">
            ${pct}%
          </td>
        </tr>
      </table>
      <div style="background:#E8E2DA;border-radius:3px;height:8px;overflow:hidden;margin:12px 0 0;">
        <div style="background:#4A6741;background:linear-gradient(90deg,#4A6741,#5B8040);width:${barWidth}%;height:100%;border-radius:3px;"></div>
      </div>
      <p class="text-muted" style="margin:10px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:12px;color:#4A6741;font-style:italic;line-height:1.5;">
        ${encouragement}
      </p>
      ${nextStepHtml}
    </td></tr>
    </table>`;
}

function renderQuickAddButton(siteUrl: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td style="text-align:center;padding:8px 0 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${siteUrl}/palace?action=add" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="10%" fillcolor="#C9A84C" stroke="f">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Georgia,serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">+ Add a Memory</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${siteUrl}/palace?action=add" style="display:inline-block;padding:13px 36px;background:#C9A84C;color:#FFFFFF;font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:4px;letter-spacing:1px;text-transform:uppercase;mso-hide:all;">
          + Add a Memory
        </a>
        <!--<![endif]-->
      </td></tr>
    </table>`;
}

/* ── Greeting helper ── */

function getGreeting(displayName: string): string {
  const hour = new Date().getUTCHours();
  // Approximate CET (UTC+1/+2) — target audience is European
  const cetHour = (hour + 1) % 24;

  if (cetHour >= 5 && cetHour < 12) {
    return `Good morning, ${displayName}`;
  } else if (cetHour >= 12 && cetHour < 17) {
    return `Good afternoon, ${displayName}`;
  } else if (cetHour >= 17 && cetHour < 22) {
    return `Good evening, ${displayName}`;
  }
  return `Hello, ${displayName}`;
}

/* ── Main generator ── */

export function generateDigestEmailHtml(params: DigestEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?unsubscribe=true&uid=${encodeURIComponent(params.userId)}`;

  const hasContent =
    params.weeklyStats.totalMemories > 0 ||
    params.onThisDayMemories.length > 0 ||
    params.upcomingCapsules.length > 0 ||
    params.sharedRoomActivity.length > 0 ||
    params.trackProgress !== null;

  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const greeting = getGreeting(displayName);

  const headerHtml = `
    <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
      Weekly Digest
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
      Your ${weekday} Report
    </h1>
    <p class="header-subtitle" style="margin:14px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#8B7355;line-height:1.6;">
      ${greeting}. Here is what happened in your palace this week.
    </p>`;

  const bodyHtml = hasContent
    ? `
      ${renderStats(params.weeklyStats, params.streakWeeks)}
      ${renderStreak(params.streakWeeks)}
      ${renderMemoryOfTheWeek(params.memoryOfTheWeek)}
      ${renderTrack(params.trackProgress)}
      ${renderQuickAddButton(siteUrl)}
      ${renderOnThisDay(params.onThisDayMemories)}
      ${renderCapsules(params.upcomingCapsules)}
      ${renderSharedActivity(params.sharedRoomActivity)}`
    : `
      ${ornamentalDivider()}
      <p class="text-secondary" style="margin:16px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#8B7355;line-height:1.7;text-align:center;font-style:italic;">
        Your palace is quiet this week. Why not visit and add a new memory?
        Every moment you preserve today becomes a treasure tomorrow.
      </p>
      ${ornamentalDivider()}
      ${renderQuickAddButton(siteUrl)}`;

  return emailLayout({
    preheader: params.streakWeeks >= 2
      ? `${params.displayName}, ${params.streakWeeks}-week streak! ${params.weeklyStats.memoriesThisWeek} new memories this week.`
      : `${params.displayName}, you have ${params.weeklyStats.memoriesThisWeek} new memories this week.`,
    headerHtml,
    bodyHtml,
    ctaText: "Visit Your Palace",
    ctaUrl: `${siteUrl}/palace`,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You receive this digest weekly because email notifications are enabled.
      </p>
      <a href="${unsubscribeUrl}" style="font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#9A9183;text-decoration:underline;">
        Unsubscribe from weekly digest
      </a>`,
  });
}

export function generateDigestEmailSubject(displayName: string, streakWeeks: number): string {
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  if (streakWeeks >= 4) {
    return `${streakWeeks}-week streak! Your ${weekday} Memory Digest`;
  }
  return `Your ${weekday} Memory Digest, ${displayName}`;
}

export async function sendDigestEmail(params: DigestEmailParams): Promise<{ success: boolean; error?: string }> {
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?unsubscribe=true&uid=${encodeURIComponent(params.userId)}`;

  return sendEmail({
    to: params.recipientEmail,
    subject: generateDigestEmailSubject(params.displayName, params.streakWeeks),
    html: generateDigestEmailHtml(params),
    tag: "digest",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
