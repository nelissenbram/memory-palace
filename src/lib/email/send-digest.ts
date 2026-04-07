import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider, signUnsubscribeToken } from "./shared";

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
  /** User's preferred locale (default "en") */
  locale?: string;
}

/* ── Translations ── */

const t: Record<string, Record<string, string>> = {
  en: {
    weeklyDigest: "Weekly Digest",
    yourReport: "Your {weekday} Report",
    goodMorning: "Good morning, {name}",
    goodAfternoon: "Good afternoon, {name}",
    goodEvening: "Good evening, {name}",
    hello: "Hello, {name}",
    hereIsWhatHappened: "Here is what happened in your palace this week.",
    memoryOfTheWeek: "Memory of the Week",
    revisitMemory: "Revisit this memory and the stories it holds.",
    inRoom: "in",
    onThisWeek: "This Week in History",
    yearAgo: "year ago",
    yearsAgo: "years ago",
    timeCapsules: "Time Capsules Opening Soon",
    sharedRoomActivity: "Shared Room Activity",
    addedMemories: "added {count} memory to",
    addedMemoriesPlural: "added {count} memories to",
    yourStreak: "Your Streak",
    weeksInARow: "weeks in a row",
    weekStreak: "Week Streak",
    yourProgress: "Your Progress",
    next: "Next:",
    addAMemory: "+ Add a Memory",
    visitYourPalace: "Walk through your Palace",
    totalMemories: "Total Memories",
    thisWeek: "This Week",
    rooms: "Rooms",
    quietWeek: "Your palace is quiet this week. Why not visit and add a new memory? Every moment you preserve today becomes a treasure tomorrow.",
    preheaderStreak: "{name}, {streak}-week streak! {count} new memories this week.",
    preheaderNormal: "{name}, you have {count} new memories this week.",
    footerNotice: "You receive this digest weekly because email notifications are enabled.",
    unsubscribe: "Unsubscribe from weekly digest",
    streakSubject: "{streak}-week streak! Your {weekday} Memory Digest",
    normalSubject: "Your {weekday} Memory Digest, {name}",
    encourageStreak12: "Remarkable dedication. Your future self will thank you.",
    encourageStreak8: "An incredible run. Your palace grows richer every week.",
    encourageStreak4: "A month of consistency. Your memories are building something lasting.",
    encourageStreakDefault: "Keep the momentum going &mdash; every week counts.",
    trackClose: "You&rsquo;re so close to completing this track. One final push!",
    trackFinish: "The finish line is in sight &mdash; keep going.",
    trackHalfway: "You&rsquo;re past the halfway mark. The momentum is yours.",
    trackQuarter: "Great progress. Every step deepens your palace.",
    trackStart: "Every memory counts. Keep building.",
  },
  nl: {
    weeklyDigest: "Weekoverzicht",
    yourReport: "Je {weekday}-rapport",
    goodMorning: "Goedemorgen, {name}",
    goodAfternoon: "Goedemiddag, {name}",
    goodEvening: "Goedenavond, {name}",
    hello: "Hallo, {name}",
    hereIsWhatHappened: "Dit is wat er deze week in je paleis is gebeurd.",
    memoryOfTheWeek: "Herinnering van de Week",
    revisitMemory: "Herleef deze herinnering en de verhalen die erbij horen.",
    inRoom: "in",
    onThisWeek: "Deze Week in de Geschiedenis",
    yearAgo: "jaar geleden",
    yearsAgo: "jaar geleden",
    timeCapsules: "Tijdcapsules die Binnenkort Opengaan",
    sharedRoomActivity: "Gedeelde Kamer-activiteit",
    addedMemories: "heeft {count} herinnering toegevoegd aan",
    addedMemoriesPlural: "heeft {count} herinneringen toegevoegd aan",
    yourStreak: "Jouw Reeks",
    weeksInARow: "weken op rij",
    weekStreak: "Weken Reeks",
    yourProgress: "Jouw Voortgang",
    next: "Volgende:",
    addAMemory: "+ Herinnering Toevoegen",
    visitYourPalace: "Wandel door je Paleis",
    totalMemories: "Totaal Herinneringen",
    thisWeek: "Deze Week",
    rooms: "Kamers",
    quietWeek: "Het is rustig in je paleis deze week. Waarom voeg je niet een nieuwe herinnering toe? Elk moment dat je vandaag bewaart, wordt morgen een schat.",
    preheaderStreak: "{name}, {streak} weken op rij! {count} nieuwe herinneringen deze week.",
    preheaderNormal: "{name}, je hebt {count} nieuwe herinneringen deze week.",
    footerNotice: "Je ontvangt dit weekoverzicht omdat e-mailmeldingen zijn ingeschakeld.",
    unsubscribe: "Uitschrijven van weekoverzicht",
    streakSubject: "{streak} weken op rij! Je {weekday} Herinneringoverzicht",
    normalSubject: "Je {weekday} Herinneringoverzicht, {name}",
    encourageStreak12: "Opmerkelijke toewijding. Je toekomstige zelf zal je dankbaar zijn.",
    encourageStreak8: "Een ongelooflijke reeks. Je paleis wordt elke week rijker.",
    encourageStreak4: "Een maand van consistentie. Je herinneringen bouwen iets blijvends.",
    encourageStreakDefault: "Houd het momentum vast &mdash; elke week telt.",
    trackClose: "Je bent er zo dichtbij. Nog een laatste zetje!",
    trackFinish: "De eindstreep is in zicht &mdash; ga zo door.",
    trackHalfway: "Je bent voorbij het halverwegepunt. Het momentum is van jou.",
    trackQuarter: "Geweldige vooruitgang. Elke stap verdiept je paleis.",
    trackStart: "Elke herinnering telt. Blijf bouwen.",
  },
};

/* ── Section renderers ── */

function sectionHeading(title: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
      <tr>
        <td style="font-family:'Cormorant Garamond',Georgia,serif;font-size:12px;font-weight:600;color:#B8922E;letter-spacing:0.16em;text-transform:uppercase;">
          ${title}
        </td>
        <td style="text-align:right;">
          <div class="divider" style="border-top:1px solid #EEEAE3;margin-top:7px;"></div>
        </td>
      </tr>
    </table>`;
}

function renderStats(stats: WeeklyStats, streakWeeks: number, l: Record<string, string>): string {
  const cell = (value: string, label: string, showBorder: boolean) => `
    <td class="stat-cell" width="${streakWeeks > 0 ? "25" : "33"}%" style="text-align:center;padding:22px 8px;${showBorder ? "border-right:1px solid #EEEAE3;" : ""}">
      <p class="text-primary" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;font-weight:400;color:#2C2C2A;line-height:1.1;letter-spacing:-1px;">
        ${value}
      </p>
      <p style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:10px;color:#8B7355;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
        ${label}
      </p>
    </td>`;

  const streakCell = streakWeeks > 0
    ? cell(`${streakWeeks}`, l.weekStreak, false)
    : "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr>
        ${cell(`${stats.totalMemories}`, l.totalMemories, true)}
        ${cell(`${stats.memoriesThisWeek}`, l.thisWeek, true)}
        ${cell(`${stats.totalRooms}`, l.rooms, streakWeeks > 0)}
        ${streakCell}
      </tr>
    </table>`;
}

function renderMemoryOfTheWeek(memory: MemoryOfTheWeek | null, l: Record<string, string>): string {
  if (!memory) return "";

  const thumbnail = memory.thumbnailUrl
    ? `<img src="${escapeHtml(memory.thumbnailUrl)}" alt="${escapeHtml(memory.title)}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:3px;border:1px solid #EEEAE3;" />`
    : `<div style="width:120px;height:120px;border-radius:3px;background:#D4AF37;background:linear-gradient(145deg,#D4AF37 0%,#8B7355 100%);text-align:center;line-height:120px;">
        <span style="font-size:32px;opacity:0.6;">&#x1f3db;</span>
      </div>`;

  return `
    ${sectionHeading(l.memoryOfTheWeek)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg motw-table" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
      <tr>
        <td class="motw-image" style="padding:20px;width:120px;" valign="top">${thumbnail}</td>
        <td class="motw-text" style="padding:20px 20px 20px 4px;" valign="middle">
          <p class="text-primary" style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:500;color:#2C2C2A;line-height:1.3;font-style:italic;">
            &ldquo;${escapeHtml(memory.title)}&rdquo;
          </p>
          <p class="text-muted" style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#9A9183;letter-spacing:0.3px;">
            ${l.inRoom} <strong style="color:#8B7355;">${escapeHtml(memory.roomName)}</strong>
          </p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;font-style:italic;line-height:1.5;">
            ${l.revisitMemory}
          </p>
        </td>
      </tr>
    </table>`;
}

function renderStreak(streakWeeks: number, l: Record<string, string>): string {
  if (streakWeeks < 2) return "";

  // Build flame icons based on streak length (max 8 for display)
  const flames = Math.min(streakWeeks, 8);
  const flameStr = "&#x1f525;".repeat(flames) + (streakWeeks > 8 ? " ..." : "");

  const encouragement = streakWeeks >= 12
    ? l.encourageStreak12
    : streakWeeks >= 8
      ? l.encourageStreak8
      : streakWeeks >= 4
        ? l.encourageStreak4
        : l.encourageStreakDefault;

  return `
    ${sectionHeading(l.yourStreak)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;padding:20px 24px;margin:0 0 28px;">
    <tr><td style="text-align:center;">
      <p style="margin:0 0 6px;font-size:20px;line-height:1;">
        ${flameStr}
      </p>
      <p class="text-primary" style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#2C2C2A;line-height:1.3;">
        <strong>${streakWeeks} ${l.weeksInARow}</strong>
      </p>
      <p class="text-muted" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#8B7355;font-style:italic;line-height:1.5;">
        ${encouragement}
      </p>
    </td></tr>
    </table>`;
}

function renderOnThisDay(memories: OnThisDayMemory[], l: Record<string, string>): string {
  if (memories.length === 0) return "";

  const items = memories.slice(0, 5).map((m, i) => `
    <tr><td style="padding:13px 20px;${i < memories.slice(0, 5).length - 1 ? "border-bottom:1px solid #F0EBE5;" : ""}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="text-primary" style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
          &ldquo;${escapeHtml(m.title)}&rdquo;
        </td>
        <td width="80" style="text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;white-space:nowrap;">
          ${m.yearsAgo} ${m.yearsAgo === 1 ? l.yearAgo : l.yearsAgo}
        </td>
      </tr></table>
    </td></tr>`).join("");

  return `
    ${sectionHeading(l.onThisWeek)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderCapsules(capsules: UpcomingCapsule[], locale: string, l: Record<string, string>): string {
  if (capsules.length === 0) return "";

  const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
  const items = capsules.slice(0, 5).map((c, i) => {
    const dateStr = new Date(c.revealDate).toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
    return `
    <tr><td style="padding:13px 20px;${i < capsules.slice(0, 5).length - 1 ? "border-bottom:1px solid #F0EBE5;" : ""}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="text-primary" style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2C2C2A;">
          &ldquo;${escapeHtml(c.title)}&rdquo;
        </td>
        <td width="70" style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border:1px solid #D4C5B2;border-radius:2px;font-family:Georgia,'Times New Roman',serif;font-size:10px;font-weight:600;color:#8B7355;letter-spacing:0.5px;text-transform:uppercase;">
            ${escapeHtml(dateStr)}
          </span>
        </td>
      </tr></table>
    </td></tr>`;
  }).join("");

  return `
    ${sectionHeading(l.timeCapsules)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderSharedActivity(activities: SharedRoomActivity[], l: Record<string, string>): string {
  if (activities.length === 0) return "";

  const items = activities.slice(0, 5).map((a, i) => {
    const addedText = a.memoryCount === 1
      ? l.addedMemories.replace("{count}", `${a.memoryCount}`)
      : l.addedMemoriesPlural.replace("{count}", `${a.memoryCount}`);
    return `
    <tr><td style="padding:13px 20px;${i < activities.slice(0, 5).length - 1 ? "border-bottom:1px solid #F0EBE5;" : ""}">
      <p class="text-primary" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
        <strong>${escapeHtml(a.contributorName)}</strong> ${addedText}
        <em>&ldquo;${escapeHtml(a.roomName)}&rdquo;</em>
      </p>
    </td></tr>`;
  }).join("");

  return `
    ${sectionHeading(l.sharedRoomActivity)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderTrack(track: TrackProgress | null, l: Record<string, string>): string {
  if (!track) return "";
  const pct = Math.round(track.percentComplete);
  const barWidth = Math.max(5, pct);

  // Build a compelling, specific CTA based on progress
  let encouragement: string;
  if (pct >= 90) {
    encouragement = l.trackClose;
  } else if (pct >= 75) {
    encouragement = l.trackFinish;
  } else if (pct >= 50) {
    encouragement = l.trackHalfway;
  } else if (pct >= 25) {
    encouragement = l.trackQuarter;
  } else {
    encouragement = l.trackStart;
  }

  // Next step hint with milestone label for a specific CTA
  const nextStepHtml = track.nextMilestoneLabel
    ? `<p class="text-primary" style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#2C2C2A;line-height:1.5;">
        <strong>${l.next}</strong> ${escapeHtml(track.nextMilestoneLabel)}
      </p>`
    : track.nextStepHint
      ? `<p class="text-primary" style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#2C2C2A;line-height:1.5;">
          <strong>${l.next}</strong> ${escapeHtml(track.nextStepHint)}
        </p>`
      : "";

  return `
    ${sectionHeading(l.yourProgress)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:#FAFAF7;border-radius:2px;border:1px solid #EEEAE3;margin:0 0 28px;">
    <tr><td style="padding:20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2C2C2A;line-height:1.5;">
            <strong class="text-primary">${escapeHtml(track.icon)} ${escapeHtml(track.trackName)}</strong>
          </td>
          <td style="text-align:right;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#D4AF37;letter-spacing:-0.5px;">
            ${pct}%
          </td>
        </tr>
      </table>
      <div style="background:#E8E2DA;border-radius:3px;height:8px;overflow:hidden;margin:12px 0 0;">
        <div style="background:#4A6741;background:linear-gradient(90deg,#4A6741,#5B8040);width:${barWidth}%;height:100%;border-radius:3px;"></div>
      </div>
      <p class="text-muted" style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#4A6741;font-style:italic;line-height:1.5;">
        ${encouragement}
      </p>
      ${nextStepHtml}
    </td></tr>
    </table>`;
}

function renderQuickAddButton(siteUrl: string, l: Record<string, string>): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td class="cta-cell" style="text-align:center;padding:8px 0 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${siteUrl}/palace?action=add" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="10%" fillcolor="#D4AF37" stroke="f">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Georgia,serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${l.addAMemory}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${siteUrl}/palace?action=add" style="display:inline-block;padding:13px 36px;background:#D4AF37;color:#FFFFFF;font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:4px;letter-spacing:1px;text-transform:uppercase;mso-hide:all;">
          ${l.addAMemory}
        </a>
        <!--<![endif]-->
      </td></tr>
    </table>`;
}

/* ── Greeting helper ── */

function getGreeting(displayName: string, l: Record<string, string>): string {
  const hour = new Date().getUTCHours();

  if (hour >= 5 && hour < 12) {
    return l.goodMorning.replace("{name}", displayName);
  } else if (hour >= 12 && hour < 18) {
    return l.goodAfternoon.replace("{name}", displayName);
  } else {
    return l.goodEvening.replace("{name}", displayName);
  }
}

/* ── Mobile CSS for memory-of-the-week stacking ── */

const motwMobileStyle = `
  @media only screen and (max-width: 480px) {
    .motw-table tr { display: block !important; }
    .motw-image { display: block !important; width: 100% !important; text-align: center !important; padding: 20px 20px 8px !important; }
    .motw-image img, .motw-image div { margin: 0 auto !important; }
    .motw-text { display: block !important; width: 100% !important; padding: 8px 20px 20px !important; }
  }
`;

/* ── Main generator ── */

export function generateDigestEmailHtml(params: DigestEmailParams): string {
  const locale = params.locale || "en";
  const l = t[locale] || t.en;
  const displayName = escapeHtml(params.displayName);
  const siteUrl = getSiteUrl();
  const unsubToken = signUnsubscribeToken(params.userId);
  const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?unsubscribe=true&uid=${unsubToken}`;

  const hasContent =
    params.weeklyStats.totalMemories > 0 ||
    params.onThisDayMemories.length > 0 ||
    params.upcomingCapsules.length > 0 ||
    params.sharedRoomActivity.length > 0 ||
    params.trackProgress !== null;

  const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
  const weekday = new Date().toLocaleDateString(dateLocale, { weekday: "long" });
  const greeting = getGreeting(displayName, l);

  const headerHtml = `
    <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:500;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      ${l.weeklyDigest}
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#2C2C2A;line-height:1.3;letter-spacing:-0.3px;">
      ${l.yourReport.replace("{weekday}", weekday)}
    </h1>
    <p class="header-subtitle" style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#8B7355;line-height:1.6;">
      ${greeting}. ${l.hereIsWhatHappened}
    </p>`;

  const bodyHtml = hasContent
    ? `
      ${renderStats(params.weeklyStats, params.streakWeeks, l)}
      ${renderStreak(params.streakWeeks, l)}
      ${renderMemoryOfTheWeek(params.memoryOfTheWeek, l)}
      ${renderTrack(params.trackProgress, l)}
      ${renderQuickAddButton(siteUrl, l)}
      ${renderOnThisDay(params.onThisDayMemories, l)}
      ${renderCapsules(params.upcomingCapsules, locale, l)}
      ${renderSharedActivity(params.sharedRoomActivity, l)}`
    : `
      ${ornamentalDivider()}
      <p class="text-secondary" style="margin:16px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#8B7355;line-height:1.7;text-align:center;font-style:italic;">
        ${l.quietWeek}
      </p>
      ${ornamentalDivider()}
      ${renderQuickAddButton(siteUrl, l)}`;

  return emailLayout({
    preheader: params.streakWeeks >= 2
      ? l.preheaderStreak.replace("{name}", params.displayName).replace("{streak}", `${params.streakWeeks}`).replace("{count}", `${params.weeklyStats.memoriesThisWeek}`)
      : l.preheaderNormal.replace("{name}", params.displayName).replace("{count}", `${params.weeklyStats.memoriesThisWeek}`),
    headerHtml,
    bodyHtml,
    ctaText: l.visitYourPalace,
    ctaUrl: `${siteUrl}/palace`,
    footerExtra: `
      <style>${motwMobileStyle}</style>
      <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#D4C5B2;">
        ${l.footerNotice}
      </p>
      <a href="${unsubscribeUrl}" style="font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#9A9183;text-decoration:underline;">
        ${l.unsubscribe}
      </a>`,
    locale,
  });
}

export function generateDigestEmailSubject(displayName: string, streakWeeks: number, locale?: string): string {
  const loc = locale || "en";
  const l = t[loc] || t.en;
  const dateLocale = loc === "nl" ? "nl-NL" : "en-US";
  const weekday = new Date().toLocaleDateString(dateLocale, { weekday: "long" });
  if (streakWeeks >= 4) {
    return l.streakSubject.replace("{streak}", `${streakWeeks}`).replace("{weekday}", weekday);
  }
  return l.normalSubject.replace("{weekday}", weekday).replace("{name}", displayName);
}

export async function sendDigestEmail(params: DigestEmailParams): Promise<{ success: boolean; error?: string }> {
  const locale = params.locale || "en";
  const siteUrl = getSiteUrl();
  const unsubToken = signUnsubscribeToken(params.userId);
  const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?unsubscribe=true&uid=${unsubToken}`;

  return sendEmail({
    to: params.recipientEmail,
    subject: generateDigestEmailSubject(params.displayName, params.streakWeeks, locale),
    html: generateDigestEmailHtml(params),
    tag: "digest",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
