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

export interface OnThisDayMemory {
  title: string;
  yearsAgo: number;
}

export interface UpcomingCapsule {
  title: string;
  revealDate: string; // ISO date string
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

export interface DigestEmailParams {
  recipientEmail: string;
  displayName: string;
  onThisDayMemories: OnThisDayMemory[];
  upcomingCapsules: UpcomingCapsule[];
  sharedRoomActivity: SharedRoomActivity[];
  trackProgress: TrackProgress | null;
}

function renderOnThisDaySection(memories: OnThisDayMemory[]): string {
  if (memories.length === 0) return "";

  const items = memories
    .slice(0, 5)
    .map(
      (m) => `
    <tr><td style="padding:10px 16px;border-bottom:1px solid #EEEAE3;">
      <p style="margin:0;font-family:'Georgia',serif;font-size:15px;color:#2C2C2A;line-height:1.5;">
        &ldquo;${escapeHtml(m.title)}&rdquo;
        <span style="color:#9A9183;font-size:13px;"> &mdash; ${m.yearsAgo} ${m.yearsAgo === 1 ? "year" : "years"} ago</span>
      </p>
    </td></tr>`
    )
    .join("");

  return `
    <!-- On This Day -->
    <tr><td style="padding:28px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td>
        <h2 style="margin:0 0 4px;font-family:'Georgia',serif;font-size:18px;font-weight:600;color:#2C2C2A;">
          &#x1F4C5; On This Day
        </h2>
        <p style="margin:0 0 12px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.4;">
          Memories with anniversaries this week
        </p>
      </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border-radius:12px;border:1px solid #EEEAE3;overflow:hidden;">
        ${items}
      </table>
    </td></tr>`;
}

function renderUpcomingCapsulesSection(capsules: UpcomingCapsule[]): string {
  if (capsules.length === 0) return "";

  const items = capsules
    .slice(0, 5)
    .map((c) => {
      const date = new Date(c.revealDate);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `
    <tr><td style="padding:10px 16px;border-bottom:1px solid #EEEAE3;display:flex;align-items:center;gap:10px;">
      <div style="display:inline-block;padding:4px 10px;background:#C17F5918;border-radius:8px;font-family:'Georgia',serif;font-size:12px;color:#C17F59;font-weight:600;">
        ${escapeHtml(dateStr)}
      </div>
      <span style="font-family:'Georgia',serif;font-size:14px;color:#2C2C2A;">
        &ldquo;${escapeHtml(c.title)}&rdquo;
      </span>
    </td></tr>`;
    })
    .join("");

  return `
    <!-- Time Capsules -->
    <tr><td style="padding:24px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td>
        <h2 style="margin:0 0 4px;font-family:'Georgia',serif;font-size:18px;font-weight:600;color:#2C2C2A;">
          &#x23F3; Time Capsules Opening Soon
        </h2>
        <p style="margin:0 0 12px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.4;">
          These memories are almost ready to be revealed
        </p>
      </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border-radius:12px;border:1px solid #EEEAE3;overflow:hidden;">
        ${items}
      </table>
    </td></tr>`;
}

function renderSharedRoomSection(activities: SharedRoomActivity[]): string {
  if (activities.length === 0) return "";

  const items = activities
    .slice(0, 5)
    .map(
      (a) => `
    <tr><td style="padding:10px 16px;border-bottom:1px solid #EEEAE3;">
      <p style="margin:0;font-family:'Georgia',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
        <strong>${escapeHtml(a.contributorName)}</strong> added ${a.memoryCount} ${a.memoryCount === 1 ? "memory" : "memories"} to
        <em>&ldquo;${escapeHtml(a.roomName)}&rdquo;</em>
      </p>
    </td></tr>`
    )
    .join("");

  return `
    <!-- Shared Room Activity -->
    <tr><td style="padding:24px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td>
        <h2 style="margin:0 0 4px;font-family:'Georgia',serif;font-size:18px;font-weight:600;color:#2C2C2A;">
          &#x1F91D; Shared Room Activity
        </h2>
        <p style="margin:0 0 12px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.4;">
          New contributions to rooms you share
        </p>
      </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border-radius:12px;border:1px solid #EEEAE3;overflow:hidden;">
        ${items}
      </table>
    </td></tr>`;
}

function renderTrackProgressSection(track: TrackProgress | null): string {
  if (!track) return "";

  const pct = Math.round(track.percentComplete);
  // Width of progress bar clamped to 5-100% for visibility
  const barWidth = Math.max(5, pct);

  return `
    <!-- Track Progress -->
    <tr><td style="padding:24px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border-radius:12px;border:1px solid #EEEAE3;padding:16px 20px;">
      <tr><td>
        <p style="margin:0 0 8px;font-family:'Georgia',serif;font-size:15px;color:#2C2C2A;line-height:1.5;">
          ${escapeHtml(track.icon)} You&rsquo;re <strong>${pct}%</strong> through the <strong>${escapeHtml(track.trackName)}</strong> track!
        </p>
        <div style="background:#EEEAE3;border-radius:6px;height:10px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#4A6741,#5A7751);width:${barWidth}%;height:100%;border-radius:6px;"></div>
        </div>
        ${pct >= 80 ? `<p style="margin:8px 0 0;font-family:'Georgia',serif;font-size:13px;color:#4A6741;">Almost there &mdash; keep going!</p>` : ""}
        ${pct < 30 ? `<p style="margin:8px 0 0;font-family:'Georgia',serif;font-size:13px;color:#8B7355;">Every memory counts. Keep building!</p>` : ""}
      </td></tr>
      </table>
    </td></tr>`;
}

export function generateDigestEmailHtml(params: DigestEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const palaceUrl = `${SITE_URL}/palace`;
  const unsubscribeUrl = `${SITE_URL}/api/email/unsubscribe?unsubscribe=true&email=${encodeURIComponent(params.recipientEmail)}`;

  const hasContent =
    params.onThisDayMemories.length > 0 ||
    params.upcomingCapsules.length > 0 ||
    params.sharedRoomActivity.length > 0 ||
    params.trackProgress !== null;

  const fallbackMessage = !hasContent
    ? `
    <tr><td style="padding:28px 32px 0;">
      <p style="margin:0;font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.7;text-align:center;">
        Your palace is quiet this week. Why not visit and add a new memory?
        Every moment you preserve today becomes a treasure tomorrow.
      </p>
    </td></tr>`
    : "";

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
      Your Weekly Memory Digest
    </h1>
    <p style="margin:8px 0 0;font-family:'Georgia',serif;font-size:14px;color:#FFFFFF;opacity:0.85;">
      Hello, ${displayName}. Here&rsquo;s what&rsquo;s happening in your palace.
    </p>
  </td></tr>

  ${renderOnThisDaySection(params.onThisDayMemories)}
  ${renderUpcomingCapsulesSection(params.upcomingCapsules)}
  ${renderSharedRoomSection(params.sharedRoomActivity)}
  ${renderTrackProgressSection(params.trackProgress)}
  ${fallbackMessage}

  <!-- CTA Button -->
  <tr><td style="padding:28px 32px 24px;text-align:center;">
    <a href="${palaceUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(193,127,89,0.3);">
      Visit Your Palace
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #EEEAE3;text-align:center;">
    <p style="margin:0 0 8px;font-family:'Georgia',serif;font-size:13px;color:#9A9183;line-height:1.5;">
      The Memory Palace &mdash; Embrace Eternity
    </p>
    <p style="margin:0 0 12px;font-family:'Georgia',serif;font-size:11px;color:#D4C5B2;">
      You receive this digest weekly because you have email notifications enabled.
    </p>
    <a href="${unsubscribeUrl}" style="font-family:'Georgia',serif;font-size:11px;color:#9A9183;text-decoration:underline;">
      Unsubscribe from weekly digest
    </a>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateDigestEmailSubject(displayName: string): string {
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return `Your ${weekday} Memory Digest, ${escapeHtml(displayName)}`;
}

export async function sendDigestEmail(params: DigestEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = generateDigestEmailHtml(params);
  const subject = generateDigestEmailSubject(params.displayName);

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
  console.log(`[Digest Email] Would send to ${params.recipientEmail}: ${subject}`);
  return { success: true };
}
