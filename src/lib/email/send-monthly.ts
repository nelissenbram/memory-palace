import { escapeHtml, emailLayout, sendEmail, getSiteUrl, signUnsubscribeToken } from "./shared";

/* ── Canon tokens (SPEC §A) ── */
const INK = "#403B36";
const INK_DEEP = "#2E2A26";
const MUTED = "#716A5E";
const TRAY = "#F6EBE3";
const HAIRLINE = "#E3D6BC";
const EMBER_GLYPH = "#9A4F2A";
const CARD_BORDER = "#E7D9C4";
const SAGE = "#56683C";
const GOLD = "#D4AF37"; // reserved: On-This-Day frame + capsule seal ONLY
const FONT_DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";
const FONT_BODY = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

type Locale = "en" | "nl" | "de" | "es" | "fr";

/* ── Data shapes ── */

export interface MonthMemory {
  title: string;
  thumbnailUrl: string | null;
  roomName: string;
}

export interface MonthlyAnniversary {
  title: string;
  yearsAgo: number;
  roomName: string;
}

export interface RoomGrowth {
  roomName: string;
  memoryCount: number;
}

export interface MonthlyStats {
  memoriesThisMonth: number;
  roomsTouchedThisMonth: number;
}

export interface MonthlyTrackProgress {
  trackName: string;
  keptCount: number;
  goalCount: number;
  percentComplete: number;
  /** Localized milestone phrase, e.g. "your first fifty photographs". */
  milestoneLabel: string;
}

export interface MonthlyCapsule {
  title: string;
  revealDate: string; // ISO
}

export interface MonthlyForwardLook {
  /** A soft, single-line prompt already localized by the caller. */
  text: string;
}

export interface MonthlyEmailParams {
  recipientEmail: string;
  userId: string;
  displayName: string;
  /** ISO date within the reported month (defaults to now). */
  monthDate?: string;
  monthMemories: MonthMemory[];        // "the month in three" — up to 3
  monthlyStats: MonthlyStats;
  anniversaries: MonthlyAnniversary[]; // On This Day — up to 2, gold frame
  roomsThatGrew: RoomGrowth[];         // rendered as a single line, top room
  trackProgress: MonthlyTrackProgress | null;
  capsules: MonthlyCapsule[];          // opening this month — conditional
  forwardLook: MonthlyForwardLook | null;
  /** Track threshold crossed this month → subject variant. */
  crossedMilestone?: boolean;
  milestoneTotal?: number | null;
  locale?: string;
}

/* ── Translations (key-first: mt[key][locale]) ── */

const mt: Record<string, Record<Locale, string>> = {
  eyebrow: {
    en: "Your month in the palace",
    nl: "Je maand in het paleis",
    de: "Dein Monat im Palast",
    es: "Tu mes en el palacio",
    fr: "Votre mois dans le palais",
  },
  chapterOpener: {
    en: "{month}, the way you kept it.",
    nl: "{month}, zoals jij het bewaarde.",
    de: "{month}, so wie du ihn bewahrt hast.",
    es: "{month}, tal como lo guardaste.",
    fr: "{month}, tel que vous l’avez gardé.",
  },
  chapterBody: {
    en: "Here’s {month}, the way you kept it — a few rooms, a few days, set down for good.",
    nl: "Hier is {month}, zoals jij het bewaarde — een paar kamers, een paar dagen, voorgoed vastgelegd.",
    de: "Hier ist {month}, so wie du ihn bewahrt hast — ein paar Räume, ein paar Tage, für immer festgehalten.",
    es: "Aquí está {month}, tal como lo guardaste — unas salas, unos días, guardados para siempre.",
    fr: "Voici {month}, tel que vous l’avez gardé — quelques salles, quelques jours, consignés pour toujours.",
  },
  monthInThree: {
    en: "The month in three",
    nl: "De maand in drie",
    de: "Der Monat in dreien",
    es: "El mes en tres",
    fr: "Le mois en trois",
  },
  inRoom: { en: "in", nl: "in", de: "in", es: "en", fr: "dans" },
  monthInNumbers: {
    en: "{memories} memories across {rooms} rooms this month.",
    nl: "{memories} herinneringen in {rooms} kamers deze maand.",
    de: "{memories} Erinnerungen in {rooms} Räumen diesen Monat.",
    es: "{memories} recuerdos en {rooms} salas este mes.",
    fr: "{memories} souvenirs dans {rooms} salles ce mois-ci.",
  },
  monthInNumbersOne: {
    en: "One memory, in one room, this month.",
    nl: "Één herinnering, in één kamer, deze maand.",
    de: "Eine Erinnerung, in einem Raum, diesen Monat.",
    es: "Un recuerdo, en una sala, este mes.",
    fr: "Un souvenir, dans une salle, ce mois-ci.",
  },
  anniversaries: {
    en: "Anniversaries this month",
    nl: "Verjaardagen deze maand",
    de: "Jahrestage diesen Monat",
    es: "Aniversarios este mes",
    fr: "Anniversaires ce mois-ci",
  },
  yearAgo: { en: "year ago", nl: "jaar geleden", de: "Jahr her", es: "año atrás", fr: "an" },
  yearsAgo: { en: "years ago", nl: "jaar geleden", de: "Jahre her", es: "años atrás", fr: "ans" },
  roomsThatGrew: {
    en: "Rooms that grew",
    nl: "Kamers die groeiden",
    de: "Räume, die gewachsen sind",
    es: "Salas que crecieron",
    fr: "Salles qui ont grandi",
  },
  roomGrewLine: {
    en: "Your {room} wing gained {count} memories.",
    nl: "Je vleugel {room} kreeg er {count} herinneringen bij.",
    de: "Dein Flügel {room} gewann {count} Erinnerungen.",
    es: "Tu ala {room} ganó {count} recuerdos.",
    fr: "Votre aile {room} a gagné {count} souvenirs.",
  },
  roomGrewLineOne: {
    en: "Your {room} wing gained one memory.",
    nl: "Je vleugel {room} kreeg er één herinnering bij.",
    de: "Dein Flügel {room} gewann eine Erinnerung.",
    es: "Tu ala {room} ganó un recuerdo.",
    fr: "Votre aile {room} a gagné un souvenir.",
  },
  trackHeading: {
    en: "Your progress",
    nl: "Jouw voortgang",
    de: "Dein Fortschritt",
    es: "Tu progreso",
    fr: "Votre progression",
  },
  trackLine: {
    en: "You’re most of the way to {milestone} — {kept} kept, {left} to go. No rush. The palace keeps.",
    nl: "Je bent bijna bij {milestone} — {kept} bewaard, nog {left} te gaan. Geen haast. Het paleis bewaart.",
    de: "Du bist fast bei {milestone} — {kept} bewahrt, {left} verbleiben. Keine Eile. Der Palast bewahrt.",
    es: "Estás a punto de alcanzar {milestone} — {kept} guardados, faltan {left}. Sin prisa. El palacio conserva.",
    fr: "Vous approchez de {milestone} — {kept} gardés, encore {left}. Rien ne presse. Le palais garde.",
  },
  milestoneFallback: {
    en: "your next milestone",
    nl: "je volgende mijlpaal",
    de: "deinen nächsten Meilenstein",
    es: "tu próximo hito",
    fr: "votre prochain jalon",
  },
  capsules: {
    en: "Time capsules opening this month",
    nl: "Tijdcapsules die deze maand opengaan",
    de: "Zeitkapseln, die diesen Monat öffnen",
    es: "Cápsulas del tiempo que se abren este mes",
    fr: "Capsules temporelles qui s’ouvrent ce mois-ci",
  },
  forwardLook: {
    en: "Looking ahead",
    nl: "Vooruitblik",
    de: "Ausblick",
    es: "Mirando adelante",
    fr: "Regard vers l’avenir",
  },
  cta: {
    en: "Walk your palace",
    nl: "Wandel door je paleis",
    de: "Durch deinen Palast wandeln",
    es: "Recorre tu palacio",
    fr: "Parcourez votre palais",
  },
  footerNotice: {
    en: "You receive this monthly look-back because email updates are on.",
    nl: "Je ontvangt deze maandelijkse terugblik omdat e-mailupdates aanstaan.",
    de: "Du erhältst diesen monatlichen Rückblick, weil E-Mail-Updates aktiviert sind.",
    es: "Recibes este resumen mensual porque las actualizaciones por correo están activadas.",
    fr: "Vous recevez ce bilan mensuel car les mises à jour par e-mail sont activées.",
  },
  unsubscribe: {
    en: "Unsubscribe from monthly highlights",
    nl: "Uitschrijven van maandelijkse hoogtepunten",
    de: "Von monatlichen Höhepunkten abmelden",
    es: "Cancelar los resúmenes mensuales",
    fr: "Se désabonner des temps forts mensuels",
  },
  subject: {
    en: "{month} at your palace",
    nl: "{month} in je paleis",
    de: "{month} in deinem Palast",
    es: "{month} en tu palacio",
    fr: "{month} dans votre palais",
  },
  subjectMilestone: {
    en: "You’ve preserved {count} memories",
    nl: "Je hebt {count} herinneringen bewaard",
    de: "Du hast {count} Erinnerungen bewahrt",
    es: "Has preservado {count} recuerdos",
    fr: "Vous avez préservé {count} souvenirs",
  },
  preheader: {
    en: "Three memories you kept, and a room still waiting.",
    nl: "Drie herinneringen die je bewaarde, en een kamer die nog wacht.",
    de: "Drei Erinnerungen, die du bewahrt hast, und ein Raum, der noch wartet.",
    es: "Tres recuerdos que guardaste, y una sala que aún espera.",
    fr: "Trois souvenirs que vous avez gardés, et une salle qui attend encore.",
  },
  preheaderMilestone: {
    en: "A look back at the month you built.",
    nl: "Een terugblik op de maand die je bouwde.",
    de: "Ein Rückblick auf den Monat, den du gebaut hast.",
    es: "Una mirada al mes que construiste.",
    fr: "Un regard sur le mois que vous avez bâti.",
  },
};

function resolveLocale(locale?: string): Locale {
  if (locale === "nl" || locale === "de" || locale === "es" || locale === "fr") return locale;
  return "en";
}

/** key-first lookup with English fallback (mirrors send-reminder.ts's r()). */
function m(key: string, locale: Locale): string {
  return mt[key]?.[locale] || mt[key]?.en || key;
}

const DATE_LOCALE: Record<Locale, string> = { en: "en-US", nl: "nl-NL", de: "de-DE", es: "es-ES", fr: "fr-FR" };

function monthName(monthDate: string | undefined, locale: Locale): string {
  const dl = DATE_LOCALE[locale] || "en-US";
  const d = monthDate ? new Date(monthDate) : new Date();
  const name = d.toLocaleDateString(dl, { month: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

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

function renderChapterOpener(month: string, locale: Locale): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
      <tr><td style="text-align:center;">
        <h1 class="header-title" style="margin:0;font-family:${FONT_DISPLAY};font-size:30px;font-weight:400;color:${INK_DEEP};line-height:1.3;letter-spacing:-0.3px;font-style:italic;">
          ${escapeHtml(m("chapterOpener", locale).replace("{month}", month))}
        </h1>
        <p class="text-muted" style="margin:14px 0 0;font-family:${FONT_BODY};font-size:15px;color:${MUTED};line-height:1.6;">
          ${m("chapterBody", locale).replace(/\{month\}/g, escapeHtml(month))}
        </p>
      </td></tr>
    </table>`;
}

/** The month in three — up to 3 memories, calm STACKED list (not a grid). */
function renderMonthInThree(memories: MonthMemory[], locale: Locale): string {
  if (memories.length === 0) return "";

  const shown = memories.slice(0, 3);
  const rows = shown.map((mem, i) => {
    const thumb = mem.thumbnailUrl
      ? `<img src="${escapeHtml(mem.thumbnailUrl)}" alt="${escapeHtml(mem.title)}" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:3px;border:1px solid ${CARD_BORDER};" />`
      : `<div style="width:72px;height:72px;border-radius:3px;background:${TRAY};text-align:center;line-height:72px;">
          <span style="font-size:22px;color:${EMBER_GLYPH};">&#10086;</span>
        </div>`;
    return `
      <tr><td style="padding:14px 20px;${i < shown.length - 1 ? `border-bottom:1px solid ${HAIRLINE};` : ""}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="72" valign="top" style="width:72px;">${thumb}</td>
          <td valign="middle" style="padding-left:16px;">
            <p class="text-primary" style="margin:0 0 4px;font-family:${FONT_DISPLAY};font-size:17px;font-weight:400;color:${INK_DEEP};line-height:1.35;font-style:italic;">
              &ldquo;${escapeHtml(mem.title)}&rdquo;
            </p>
            <p class="text-muted" style="margin:0;font-family:${FONT_BODY};font-size:12px;color:${MUTED};letter-spacing:0.3px;">
              ${m("inRoom", locale)} <strong style="color:${INK};">${escapeHtml(mem.roomName)}</strong>
            </p>
          </td>
        </tr></table>
      </td></tr>`;
  }).join("");

  return `
    ${sectionHeading(m("monthInThree", locale))}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};overflow:hidden;margin:0 0 28px;">
      ${rows}
    </table>`;
}

/** The month in numbers — one quiet line, milestone not scoreboard. */
function renderMonthInNumbers(stats: MonthlyStats, locale: Locale): string {
  if (stats.memoriesThisMonth < 1) return "";
  const key = stats.memoriesThisMonth === 1 ? "monthInNumbersOne" : "monthInNumbers";
  const line = m(key, locale)
    .replace("{memories}", `${stats.memoriesThisMonth}`)
    .replace("{rooms}", `${stats.roomsTouchedThisMonth}`);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td style="text-align:center;">
        <p class="text-secondary" style="margin:0;font-family:${FONT_DISPLAY};font-size:18px;font-weight:400;color:${INK};line-height:1.6;font-style:italic;">
          ${escapeHtml(line)}
        </p>
      </td></tr>
    </table>`;
}

/** Anniversaries — On This Day, up to 2, GOLD frame (canon gold motif). */
function renderAnniversaries(items: MonthlyAnniversary[], locale: Locale): string {
  if (items.length === 0) return "";

  const rows = items.slice(0, 2).map((a) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="otd-frame section-bg" style="background:${TRAY};border:1px solid ${GOLD};border-radius:2px;margin:0 0 12px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td class="text-primary" style="font-family:${FONT_DISPLAY};font-size:16px;color:${INK_DEEP};line-height:1.4;font-style:italic;">
            &ldquo;${escapeHtml(a.title)}&rdquo;
            <span class="text-muted" style="display:block;margin-top:4px;font-family:${FONT_BODY};font-size:12px;font-style:normal;color:${MUTED};">
              ${m("inRoom", locale)} ${escapeHtml(a.roomName)}
            </span>
          </td>
          <td width="80" style="text-align:right;font-family:${FONT_BODY};font-size:11px;color:${MUTED};white-space:nowrap;vertical-align:top;">
            ${a.yearsAgo} ${a.yearsAgo === 1 ? m("yearAgo", locale) : m("yearsAgo", locale)}
          </td>
        </tr></table>
      </td></tr>
    </table>`).join("");

  return `
    ${sectionHeading(m("anniversaries", locale))}
    <div style="margin:0 0 16px;">${rows}</div>`;
}

/** Rooms that grew — one line, top room only. */
function renderRoomsThatGrew(rooms: RoomGrowth[], locale: Locale): string {
  if (rooms.length === 0) return "";
  const top = rooms[0];
  const key = top.memoryCount === 1 ? "roomGrewLineOne" : "roomGrewLine";
  const line = m(key, locale)
    .replace("{room}", escapeHtml(top.roomName))
    .replace("{count}", `${top.memoryCount}`);
  return `
    ${sectionHeading(m("roomsThatGrew", locale))}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td>
        <p class="text-primary" style="margin:0;font-family:${FONT_BODY};font-size:14px;color:${INK};line-height:1.6;">
          ${line}
        </p>
      </td></tr>
    </table>`;
}

/** Track progress — SAGE bar on TRAY track (moved from weekly). */
function renderTrack(track: MonthlyTrackProgress | null, locale: Locale): string {
  if (!track) return "";
  const pct = Math.round(track.percentComplete);
  const barWidth = Math.max(5, Math.min(100, pct));
  const left = Math.max(0, track.goalCount - track.keptCount);
  const milestone = track.milestoneLabel || m("milestoneFallback", locale);
  const line = m("trackLine", locale)
    .replace("{milestone}", escapeHtml(milestone))
    .replace("{kept}", `${track.keptCount}`)
    .replace("{left}", `${left}`);

  return `
    ${sectionHeading(m("trackHeading", locale))}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};margin:0 0 28px;">
    <tr><td style="padding:20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:${FONT_BODY};font-size:14px;color:${INK};line-height:1.5;">
            <strong class="text-primary">${escapeHtml(track.trackName)}</strong>
          </td>
          <td style="text-align:right;font-family:${FONT_DISPLAY};font-size:22px;font-weight:400;color:${SAGE};letter-spacing:-0.5px;">
            ${pct}%
          </td>
        </tr>
      </table>
      <div style="background:${TRAY};border:1px solid ${CARD_BORDER};border-radius:3px;height:8px;overflow:hidden;margin:12px 0 0;">
        <div style="background:${SAGE};width:${barWidth}%;height:100%;border-radius:3px;"></div>
      </div>
      <p class="text-muted" style="margin:12px 0 0;font-family:${FONT_BODY};font-size:13px;color:${MUTED};line-height:1.6;">
        ${line}
      </p>
    </td></tr>
    </table>`;
}

/** Time capsules opening this month — GOLD seal (canon gold motif). */
function renderCapsules(capsules: MonthlyCapsule[], locale: Locale): string {
  if (capsules.length === 0) return "";
  const dl = DATE_LOCALE[locale] || "en-US";

  const shown = capsules.slice(0, 4);
  const rows = shown.map((c, i) => {
    const dateStr = new Date(c.revealDate).toLocaleDateString(dl, { month: "short", day: "numeric" });
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
    ${sectionHeading(m("capsules", locale))}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="section-bg" style="background:${TRAY};border-radius:2px;border:1px solid ${CARD_BORDER};overflow:hidden;margin:0 0 28px;">
      ${rows}
    </table>`;
}

/** One gentle forward-look — a single soft line. */
function renderForwardLook(look: MonthlyForwardLook | null, locale: Locale): string {
  if (!look) return "";
  return `
    ${sectionHeading(m("forwardLook", locale))}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td>
        <p class="text-secondary" style="margin:0;font-family:${FONT_DISPLAY};font-size:16px;color:${INK};line-height:1.6;font-style:italic;">
          ${escapeHtml(look.text)}
        </p>
      </td></tr>
    </table>`;
}

/* ── Main generator ── */

function scopedUnsubUrl(userId: string): string {
  const siteUrl = getSiteUrl();
  const unsubToken = signUnsubscribeToken(userId);
  // Scoped unsubscribe → flips only monthly_highlights (SPEC §E).
  return `${siteUrl}/api/email/unsubscribe?unsubscribe=true&scope=monthly&uid=${unsubToken}`;
}

export function generateMonthlyEmailHtml(params: MonthlyEmailParams): string {
  const locale = resolveLocale(params.locale);
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = scopedUnsubUrl(params.userId);
  const month = monthName(params.monthDate, locale);

  const headerHtml = `
    <p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${MUTED};letter-spacing:0.18em;text-transform:uppercase;">
      ${m("eyebrow", locale)}
    </p>
    ${renderChapterOpener(month, locale)}`;

  const bodyHtml = `
    ${renderMonthInThree(params.monthMemories, locale)}
    ${renderMonthInNumbers(params.monthlyStats, locale)}
    ${renderAnniversaries(params.anniversaries, locale)}
    ${renderRoomsThatGrew(params.roomsThatGrew, locale)}
    ${renderTrack(params.trackProgress, locale)}
    ${renderCapsules(params.capsules, locale)}
    ${renderForwardLook(params.forwardLook, locale)}`;

  const preheader = params.crossedMilestone
    ? m("preheaderMilestone", locale)
    : m("preheader", locale);

  return emailLayout({
    preheader,
    headerHtml,
    bodyHtml,
    ctaText: m("cta", locale),
    ctaUrl: `${siteUrl}/palace`,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;color:${MUTED};">
        ${m("footerNotice", locale)}
      </p>
      <a href="${unsubscribeUrl}" style="font-family:${FONT_BODY};font-size:11px;color:${MUTED};text-decoration:underline;">
        ${m("unsubscribe", locale)}
      </a>`,
    locale,
  });
}

export function generateMonthlyEmailSubject(params: MonthlyEmailParams): string {
  const locale = resolveLocale(params.locale);
  const month = monthName(params.monthDate, locale);
  if (params.crossedMilestone && params.milestoneTotal) {
    return m("subjectMilestone", locale).replace("{count}", `${params.milestoneTotal}`);
  }
  return m("subject", locale).replace("{month}", month);
}

export async function sendMonthlyEmail(params: MonthlyEmailParams): Promise<{ success: boolean; error?: string }> {
  const unsubscribeUrl = scopedUnsubUrl(params.userId);

  return sendEmail({
    to: params.recipientEmail,
    subject: generateMonthlyEmailSubject(params),
    html: generateMonthlyEmailHtml(params),
    tag: "monthly",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
