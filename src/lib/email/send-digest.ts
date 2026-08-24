import { escapeHtml, emailLayout, sendEmail, getSiteUrl, ornamentalDivider, signUnsubscribeToken } from "./shared";

/* ── Canon tokens (SPEC §A) ── */
const INK = "#403B36";
const INK_DEEP = "#2E2A26";
const MUTED = "#716A5E";
const TRAY = "#F6EBE3";
const HAIRLINE = "#E3D6BC";
const EMBER_GLYPH = "#9A4F2A";
const CARD_BORDER = "#E7D9C4";
const GOLD = "#D4AF37"; // reserved: wing-seal + On-This-Day frame + capsule seal ONLY
const FONT_DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";
const FONT_BODY = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

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
  /**
   * Retained for API compatibility with the route; the weekly no longer renders
   * a track block (moved to the monthly report per SPEC §B). Currently unused.
   */
  trackProgress: TrackProgress | null;
  weeklyStats: WeeklyStats;
  memoryOfTheWeek: MemoryOfTheWeek | null;
  /** Number of consecutive weeks the user has added at least one memory */
  streakWeeks: number;
  /** User's preferred locale (default "en") */
  locale?: string;
}

/* ── Translations ──
 * Trimmed per SPEC §B: streak/track blocks cut, stats collapsed to one quiet
 * line, no "quiet week to everyone" spray (the route content-gate suppresses
 * genuinely-empty sends). One calm streak LINE survives (streak >= 3).
 */

const t: Record<string, Record<string, string>> = {
  en: {
    weeklyDigest: "This week in your palace",
    yourReport: "Your {weekday} report",
    goodMorning: "Good morning, {name}",
    goodAfternoon: "Good afternoon, {name}",
    goodEvening: "Good evening, {name}",
    hereIsWhatHappened: "Here is a quiet look back at your week.",
    memoryOfTheWeek: "From this week",
    revisitMemory: "Revisit this memory and the stories it holds.",
    inRoom: "in",
    onThisWeek: "On this day",
    yearAgo: "year ago",
    yearsAgo: "years ago",
    timeCapsules: "Opening soon",
    sharedRoomActivity: "Newly added",
    addedMemories: "added {count} memory to",
    addedMemoriesPlural: "added {count} memories to",
    addAMemory: "Add this memory",
    visitYourPalace: "Visit your palace",
    statLine: "{count} memories in {rooms} rooms this week.",
    streakLine: "You&rsquo;ve returned to your palace {weeks} weeks running. A habit worth keeping.",
    quietWeek: "A quiet week. Whatever you add, your palace keeps it.",
    preheaderNormal: "{name}, a quiet look back at your week in the palace.",
    footerNotice: "You receive this because email updates are on.",
    unsubscribe: "Unsubscribe",
    normalSubject: "Your week in the palace",
  },
  nl: {
    weeklyDigest: "Deze week in je paleis",
    yourReport: "Je {weekday}-rapport",
    goodMorning: "Goedemorgen, {name}",
    goodAfternoon: "Goedemiddag, {name}",
    goodEvening: "Goedenavond, {name}",
    hereIsWhatHappened: "Een rustige terugblik op je week.",
    memoryOfTheWeek: "Van deze week",
    revisitMemory: "Herleef deze herinnering en de verhalen die erbij horen.",
    inRoom: "in",
    onThisWeek: "Op deze dag",
    yearAgo: "jaar geleden",
    yearsAgo: "jaar geleden",
    timeCapsules: "Gaat binnenkort open",
    sharedRoomActivity: "Nieuw toegevoegd",
    addedMemories: "heeft {count} herinnering toegevoegd aan",
    addedMemoriesPlural: "heeft {count} herinneringen toegevoegd aan",
    addAMemory: "Voeg deze herinnering toe",
    visitYourPalace: "Bezoek je paleis",
    statLine: "{count} herinneringen in {rooms} kamers deze week.",
    streakLine: "Je bent nu {weeks} weken op rij teruggekeerd naar je paleis. Een gewoonte om te koesteren.",
    quietWeek: "Een rustige week. Wat je ook toevoegt, je paleis bewaart het.",
    preheaderNormal: "{name}, een rustige terugblik op je week in het paleis.",
    footerNotice: "Je ontvangt dit omdat e-mailupdates aanstaan.",
    unsubscribe: "Uitschrijven",
    normalSubject: "Je week in het paleis",
  },
  de: {
    weeklyDigest: "Diese Woche in deinem Palast",
    yourReport: "Dein {weekday}-Bericht",
    goodMorning: "Guten Morgen, {name}",
    goodAfternoon: "Guten Nachmittag, {name}",
    goodEvening: "Guten Abend, {name}",
    hereIsWhatHappened: "Ein ruhiger Rückblick auf deine Woche.",
    memoryOfTheWeek: "Aus dieser Woche",
    revisitMemory: "Besuche diese Erinnerung erneut und die Geschichten, die sie birgt.",
    inRoom: "in",
    onThisWeek: "An diesem Tag",
    yearAgo: "Jahr her",
    yearsAgo: "Jahre her",
    timeCapsules: "Öffnet bald",
    sharedRoomActivity: "Neu hinzugefügt",
    addedMemories: "hat {count} Erinnerung hinzugefügt zu",
    addedMemoriesPlural: "hat {count} Erinnerungen hinzugefügt zu",
    addAMemory: "Diese Erinnerung hinzufügen",
    visitYourPalace: "Besuche deinen Palast",
    statLine: "{count} Erinnerungen in {rooms} Räumen diese Woche.",
    streakLine: "Du bist nun {weeks} Wochen in Folge in deinen Palast zurückgekehrt. Eine Gewohnheit, die es wert ist.",
    quietWeek: "Eine ruhige Woche. Was auch immer du hinzufügst, dein Palast bewahrt es.",
    preheaderNormal: "{name}, ein ruhiger Rückblick auf deine Woche im Palast.",
    footerNotice: "Du erhältst dies, weil E-Mail-Updates aktiviert sind.",
    unsubscribe: "Abmelden",
    normalSubject: "Deine Woche im Palast",
  },
  es: {
    weeklyDigest: "Esta semana en tu palacio",
    yourReport: "Tu informe del {weekday}",
    goodMorning: "Buenos días, {name}",
    goodAfternoon: "Buenas tardes, {name}",
    goodEvening: "Buenas noches, {name}",
    hereIsWhatHappened: "Una mirada tranquila a tu semana.",
    memoryOfTheWeek: "De esta semana",
    revisitMemory: "Revisita este recuerdo y las historias que guarda.",
    inRoom: "en",
    onThisWeek: "En este día",
    yearAgo: "año atrás",
    yearsAgo: "años atrás",
    timeCapsules: "Se abre pronto",
    sharedRoomActivity: "Recién añadido",
    addedMemories: "añadió {count} recuerdo a",
    addedMemoriesPlural: "añadió {count} recuerdos a",
    addAMemory: "Añadir este recuerdo",
    visitYourPalace: "Visita tu palacio",
    statLine: "{count} recuerdos en {rooms} salas esta semana.",
    streakLine: "Has vuelto a tu palacio {weeks} semanas seguidas. Un hábito que vale la pena mantener.",
    quietWeek: "Una semana tranquila. Lo que añadas, tu palacio lo guarda.",
    preheaderNormal: "{name}, una mirada tranquila a tu semana en el palacio.",
    footerNotice: "Recibes esto porque las actualizaciones por correo están activadas.",
    unsubscribe: "Cancelar suscripción",
    normalSubject: "Tu semana en el palacio",
  },
  fr: {
    weeklyDigest: "Cette semaine dans votre palais",
    yourReport: "Votre rapport du {weekday}",
    goodMorning: "Bonjour, {name}",
    goodAfternoon: "Bon après-midi, {name}",
    goodEvening: "Bonsoir, {name}",
    hereIsWhatHappened: "Un regard tranquille sur votre semaine.",
    memoryOfTheWeek: "De cette semaine",
    revisitMemory: "Revisitez ce souvenir et les histoires qu'il recèle.",
    inRoom: "dans",
    onThisWeek: "Ce jour-là",
    yearAgo: "an",
    yearsAgo: "ans",
    timeCapsules: "Bientôt ouverte",
    sharedRoomActivity: "Récemment ajouté",
    addedMemories: "a ajouté {count} souvenir à",
    addedMemoriesPlural: "a ajouté {count} souvenirs à",
    addAMemory: "Ajouter ce souvenir",
    visitYourPalace: "Visitez votre palais",
    statLine: "{count} souvenirs dans {rooms} salles cette semaine.",
    streakLine: "Vous êtes revenu dans votre palais {weeks} semaines de suite. Une habitude à garder.",
    quietWeek: "Une semaine calme. Quoi que vous ajoutiez, votre palais le garde.",
    preheaderNormal: "{name}, un regard tranquille sur votre semaine dans le palais.",
    footerNotice: "Vous recevez ceci car les mises à jour par e-mail sont activées.",
    unsubscribe: "Se désabonner",
    normalSubject: "Votre semaine dans le palais",
  },
};

/* ── Section renderers ── */

function sectionHeading(title: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
      <tr>
        <td style="font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${MUTED};letter-spacing:0.16em;text-transform:uppercase;">
          ${title}
        </td>
        <td style="text-align:right;">
          <div class="divider" style="border-top:1px solid ${HAIRLINE};margin-top:7px;"></div>
        </td>
      </tr>
    </table>`;
}

/** Single quiet stat line (SPEC §B) — replaces the old tile grid. */
function renderStatLine(stats: WeeklyStats, l: Record<string, string>): string {
  if (stats.memoriesThisWeek < 1 && stats.totalRooms < 1) return "";
  const line = l.statLine
    .replace("{count}", `${stats.memoriesThisWeek}`)
    .replace("{rooms}", `${stats.totalRooms}`);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};margin:0 0 28px;">
      <tr><td style="padding:16px 24px;text-align:center;">
        <p class="text-muted" style="margin:0;font-family:${FONT_BODY};font-size:14px;color:${MUTED};line-height:1.5;letter-spacing:0.2px;">
          ${line}
        </p>
      </td></tr>
    </table>`;
}

/** Optional calm streak line (SPEC §B: only if streak >= 3, plain body text). */
function renderStreakLine(streakWeeks: number, l: Record<string, string>): string {
  if (streakWeeks < 3) return "";
  return `
    <p class="text-muted" style="margin:0 0 24px;font-family:${FONT_BODY};font-size:13px;color:${MUTED};font-style:italic;line-height:1.6;text-align:center;">
      ${l.streakLine.replace("{weeks}", `${streakWeeks}`)}
    </p>`;
}

function renderMemoryOfTheWeek(memory: MemoryOfTheWeek | null, l: Record<string, string>): string {
  if (!memory) return "";

  const thumbnail = memory.thumbnailUrl
    ? `<img src="${escapeHtml(memory.thumbnailUrl)}" alt="${escapeHtml(memory.title)}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:3px;border:1px solid ${CARD_BORDER};" />`
    : `<div style="width:120px;height:120px;border-radius:3px;background:${TRAY};text-align:center;line-height:120px;">
        <span style="font-size:32px;color:${EMBER_GLYPH};">&#x1f3db;</span>
      </div>`;

  return `
    ${sectionHeading(l.memoryOfTheWeek)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg motw-table" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};margin:0 0 28px;">
      <tr>
        <td class="motw-image" style="padding:20px;width:120px;" valign="top">${thumbnail}</td>
        <td class="motw-text" style="padding:20px 20px 20px 4px;" valign="middle">
          <p class="text-primary" style="margin:0 0 8px;font-family:${FONT_DISPLAY};font-size:20px;font-weight:500;color:${INK};line-height:1.3;font-style:italic;">
            &ldquo;${escapeHtml(memory.title)}&rdquo;
          </p>
          <p class="text-muted" style="margin:0 0 14px;font-family:${FONT_BODY};font-size:13px;color:${MUTED};letter-spacing:0.3px;">
            ${l.inRoom} <strong style="color:${INK};">${escapeHtml(memory.roomName)}</strong>
          </p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:11px;color:${MUTED};font-style:italic;line-height:1.5;">
            ${l.revisitMemory}
          </p>
        </td>
      </tr>
    </table>`;
}

/** THE HERO — On This Day. The one section allowed the GOLD frame (motif #2). */
function renderOnThisDay(memories: OnThisDayMemory[], l: Record<string, string>): string {
  if (memories.length === 0) return "";

  const shown = memories.slice(0, 5);
  const items = shown.map((m, i) => `
    <tr><td style="padding:13px 20px;${i < shown.length - 1 ? `border-bottom:1px solid ${HAIRLINE};` : ""}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="text-primary" style="font-family:${FONT_BODY};font-size:14px;color:${INK};line-height:1.5;">
          &ldquo;${escapeHtml(m.title)}&rdquo;
        </td>
        <td width="80" style="text-align:right;font-family:${FONT_BODY};font-size:11px;color:${MUTED};white-space:nowrap;">
          ${m.yearsAgo} ${m.yearsAgo === 1 ? l.yearAgo : l.yearsAgo}
        </td>
      </tr></table>
    </td></tr>`).join("");

  return `
    ${sectionHeading(l.onThisWeek)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg otd-frame" style="background:${TRAY};border-radius:2px;border:1px solid ${GOLD};overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderCapsules(capsules: UpcomingCapsule[], locale: string, l: Record<string, string>): string {
  if (capsules.length === 0) return "";

  const dateLocaleMap2: Record<string, string> = { en: "en-US", nl: "nl-NL", de: "de-DE", es: "es-ES", fr: "fr-FR" };
  const dateLocale = dateLocaleMap2[locale] || "en-US";
  const shown = capsules.slice(0, 5);
  const items = shown.map((c, i) => {
    const dateStr = new Date(c.revealDate).toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
    return `
    <tr><td style="padding:13px 20px;${i < shown.length - 1 ? `border-bottom:1px solid ${HAIRLINE};` : ""}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="text-primary" style="font-family:${FONT_BODY};font-size:14px;color:${INK};">
          <span class="seal-glyph" style="color:${GOLD};margin-right:6px;">&#9733;</span>&ldquo;${escapeHtml(c.title)}&rdquo;
        </td>
        <td width="70" style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border:1px solid ${CARD_BORDER};border-radius:2px;font-family:${FONT_BODY};font-size:10px;font-weight:600;color:${MUTED};letter-spacing:0.5px;text-transform:uppercase;">
            ${escapeHtml(dateStr)}
          </span>
        </td>
      </tr></table>
    </td></tr>`;
  }).join("");

  return `
    ${sectionHeading(l.timeCapsules)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};overflow:hidden;margin:0 0 28px;">
      ${items}
    </table>`;
}

function renderSharedActivity(activities: SharedRoomActivity[], l: Record<string, string>): string {
  if (activities.length === 0) return "";

  const shown = activities.slice(0, 5);
  const items = shown.map((a, i) => {
    const addedText = a.memoryCount === 1
      ? l.addedMemories.replace("{count}", `${a.memoryCount}`)
      : l.addedMemoriesPlural.replace("{count}", `${a.memoryCount}`);
    return `
    <tr><td style="padding:13px 20px;${i < shown.length - 1 ? `border-bottom:1px solid ${HAIRLINE};` : ""}">
      <p class="text-primary" style="margin:0;font-family:${FONT_BODY};font-size:14px;color:${INK};line-height:1.5;">
        <strong>${escapeHtml(a.contributorName)}</strong> ${addedText}
        <em>&ldquo;${escapeHtml(a.roomName)}&rdquo;</em>
      </p>
    </td></tr>`;
  }).join("");

  return `
    ${sectionHeading(l.sharedRoomActivity)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};overflow:hidden;margin:0 0 28px;">
      ${items}
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

  // Hero present = OTD or shared or capsule. The route content-gate (§E)
  // suppresses genuinely-empty sends; this branch is a defensive fallback.
  const hasHero =
    params.onThisDayMemories.length > 0 ||
    params.sharedRoomActivity.length > 0 ||
    params.upcomingCapsules.length > 0;
  const hasContent = hasHero || params.memoryOfTheWeek !== null || params.weeklyStats.memoriesThisWeek > 0;

  const dateLocaleMap: Record<string, string> = { en: "en-US", nl: "nl-NL", de: "de-DE", es: "es-ES", fr: "fr-FR" };
  const dateLocale = dateLocaleMap[locale] || "en-US";
  const weekday = new Date().toLocaleDateString(dateLocale, { weekday: "long" });
  const greeting = getGreeting(displayName, l);

  const headerHtml = `
    <p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${MUTED};letter-spacing:0.18em;text-transform:uppercase;">
      ${l.weeklyDigest}
    </p>
    <h1 class="header-title" style="margin:0;font-family:${FONT_DISPLAY};font-size:30px;font-weight:400;color:${INK_DEEP};line-height:1.3;letter-spacing:-0.3px;">
      ${l.yourReport.replace("{weekday}", weekday)}
    </h1>
    <p class="header-subtitle" style="margin:14px 0 0;font-family:${FONT_BODY};font-size:15px;color:${MUTED};line-height:1.6;">
      ${greeting}. ${l.hereIsWhatHappened}
    </p>`;

  // Hero-first order (SPEC §B): OTD -> shared -> capsule, then quiet context.
  // Single ember CTA is rendered by emailLayout; no secondary quick-add button.
  const bodyHtml = hasContent
    ? `
      ${renderOnThisDay(params.onThisDayMemories, l)}
      ${renderSharedActivity(params.sharedRoomActivity, l)}
      ${renderCapsules(params.upcomingCapsules, locale, l)}
      ${renderMemoryOfTheWeek(params.memoryOfTheWeek, l)}
      ${renderStreakLine(params.streakWeeks, l)}
      ${renderStatLine(params.weeklyStats, l)}`
    : `
      ${ornamentalDivider()}
      <p class="text-secondary" style="margin:16px 0;font-family:${FONT_DISPLAY};font-size:18px;color:${MUTED};line-height:1.7;text-align:center;font-style:italic;">
        ${l.quietWeek}
      </p>
      ${ornamentalDivider()}`;

  // CTA copy: "Add this memory" when the hero is an On-This-Day resurface,
  // otherwise "Visit your palace" (SPEC §B).
  const ctaText = params.onThisDayMemories.length > 0 ? l.addAMemory : l.visitYourPalace;

  return emailLayout({
    preheader: l.preheaderNormal
      .replace("{name}", params.displayName)
      .replace("{count}", `${params.weeklyStats.memoriesThisWeek}`),
    headerHtml,
    bodyHtml,
    ctaText,
    ctaUrl: `${siteUrl}/palace`,
    footerExtra: `
      <style>${motwMobileStyle}</style>
      <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;color:${MUTED};">
        ${l.footerNotice}
      </p>
      <a href="${unsubscribeUrl}" style="font-family:${FONT_BODY};font-size:11px;color:${MUTED};text-decoration:underline;">
        ${l.unsubscribe}
      </a>`,
    locale,
  });
}

export function generateDigestEmailSubject(displayName: string, streakWeeks: number, locale?: string): string {
  const loc = locale || "en";
  const l = t[loc] || t.en;
  // Streak subjects cut per SPEC §B; single calm subject.
  void displayName;
  void streakWeeks;
  return l.normalSubject;
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
    tag: "weekly",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
