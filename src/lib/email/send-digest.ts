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
  displayName: string;
  onThisDayMemories: OnThisDayMemory[];
  upcomingCapsules: UpcomingCapsule[];
  sharedRoomActivity: SharedRoomActivity[];
  trackProgress: TrackProgress | null;
  weeklyStats: WeeklyStats;
  memoryOfTheWeek: MemoryOfTheWeek | null;
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

function renderStats(stats: WeeklyStats): string {
  const cell = (value: number, label: string, showBorder: boolean) => `
    <td class="stat-cell" width="33%" style="text-align:center;padding:22px 8px;${showBorder ? "border-right:1px solid #EEEAE3;" : ""}">
      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;font-weight:400;color:#2C2C2A;line-height:1.1;letter-spacing:-1px;">
        ${value}
      </p>
      <p style="margin:6px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:10px;color:#8B7355;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
        ${label}
      </p>
    </td>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr>
        ${cell(stats.totalMemories, "Total Memories", true)}
        ${cell(stats.memoriesThisWeek, "This Week", true)}
        ${cell(stats.totalRooms, "Rooms", false)}
      </tr>
    </table>`;
}

function renderMemoryOfTheWeek(memory: MemoryOfTheWeek | null): string {
  if (!memory) return "";

  const thumbnail = memory.thumbnailUrl
    ? `<img src="${escapeHtml(memory.thumbnailUrl)}" alt="" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:cover;border-radius:2px;" />`
    : `<div style="width:80px;height:80px;border-radius:2px;background:linear-gradient(145deg,#C17F59 0%,#8B7355 100%);"></div>`;

  return `
    ${sectionHeading("Memory of the Week")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr>
        <td style="padding:20px;width:80px;" valign="top">${thumbnail}</td>
        <td style="padding:20px 20px 20px 4px;" valign="middle">
          <p class="text-primary" style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:500;color:#2C2C2A;line-height:1.3;font-style:italic;">
            &ldquo;${escapeHtml(memory.title)}&rdquo;
          </p>
          <p class="text-muted" style="margin:0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:12px;color:#9A9183;letter-spacing:0.3px;">
            in ${escapeHtml(memory.roomName)}
          </p>
        </td>
      </tr>
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
  const encouragement = pct >= 80
    ? "Almost there &mdash; keep going."
    : pct < 30
      ? "Every memory counts. Keep building."
      : "";

  return `
    ${sectionHeading("Your Progress")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;padding:20px 24px;margin:0 0 8px;">
    <tr><td>
      <p class="text-primary" style="margin:0 0 12px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
        <strong>${pct}%</strong> through the <strong>${escapeHtml(track.trackName)}</strong> track
      </p>
      <div style="background:#E8E2DA;border-radius:2px;height:6px;overflow:hidden;">
        <div style="background:#4A6741;width:${barWidth}%;height:100%;border-radius:2px;"></div>
      </div>
      ${encouragement ? `<p style="margin:10px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:12px;color:#4A6741;font-style:italic;">${encouragement}</p>` : ""}
    </td></tr>
    </table>`;
}

/* ── Main generator ── */

export function generateDigestEmailHtml(params: DigestEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true&email=${encodeURIComponent(params.recipientEmail)}`;

  const hasContent =
    params.weeklyStats.totalMemories > 0 ||
    params.onThisDayMemories.length > 0 ||
    params.upcomingCapsules.length > 0 ||
    params.sharedRoomActivity.length > 0 ||
    params.trackProgress !== null;

  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const headerHtml = `
    <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#C17F59;letter-spacing:2.5px;text-transform:uppercase;">
      Weekly Digest
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
      Your ${weekday} Report
    </h1>
    <p class="header-subtitle" style="margin:14px 0 0;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:15px;color:#8B7355;line-height:1.6;">
      Hello, ${displayName}. Here is what happened in your palace this week.
    </p>`;

  const bodyHtml = hasContent
    ? `
      ${renderStats(params.weeklyStats)}
      ${renderMemoryOfTheWeek(params.memoryOfTheWeek)}
      ${renderOnThisDay(params.onThisDayMemories)}
      ${renderCapsules(params.upcomingCapsules)}
      ${renderSharedActivity(params.sharedRoomActivity)}
      ${renderTrack(params.trackProgress)}`
    : `
      ${ornamentalDivider()}
      <p class="text-secondary" style="margin:16px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#8B7355;line-height:1.7;text-align:center;font-style:italic;">
        Your palace is quiet this week. Why not visit and add a new memory?
        Every moment you preserve today becomes a treasure tomorrow.
      </p>
      ${ornamentalDivider()}`;

  return emailLayout({
    preheader: `${params.displayName}, you have ${params.weeklyStats.memoriesThisWeek} new memories this week.`,
    headerHtml,
    bodyHtml,
    ctaText: "Visit Your Palace",
    ctaUrl: `${getSiteUrl()}/palace`,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#D4C5B2;">
        You receive this digest weekly because email notifications are enabled.
      </p>
      <a href="${unsubscribeUrl}" style="font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:11px;color:#9A9183;text-decoration:underline;">
        Unsubscribe from weekly digest
      </a>`,
  });
}

export function generateDigestEmailSubject(displayName: string): string {
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return `Your ${weekday} Memory Digest, ${escapeHtml(displayName)}`;
}

export async function sendDigestEmail(params: DigestEmailParams): Promise<{ success: boolean; error?: string }> {
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?unsubscribe=true&email=${encodeURIComponent(params.recipientEmail)}`;

  return sendEmail({
    to: params.recipientEmail,
    subject: generateDigestEmailSubject(params.displayName),
    html: generateDigestEmailHtml(params),
    tag: "digest",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
