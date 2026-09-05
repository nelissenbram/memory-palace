import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/shared";
import { generateDigestEmailHtml, generateDigestEmailSubject, type DigestEmailParams } from "@/lib/email/send-digest";
import { generateMonthlyEmailHtml, generateMonthlyEmailSubject, type MonthlyEmailParams } from "@/lib/email/send-monthly";
import { generateReminderEmailHtml, generateReminderEmailSubject, type ReminderEmailParams } from "@/lib/email/send-reminder";
import { generateDripEmailHtml, generateDripEmailSubject } from "@/lib/email/send-drip";

export const dynamic = "force-dynamic";

/**
 * Read-only preview/viewer for every lifecycle + drip email, rendered with
 * sample data. Renders HTML only — NEVER sends. Auth mirrors /api/admin/email-test:
 * `?secret=<CRON_SECRET>` OR a logged-in admin session.
 *
 *   /api/email/preview                      → index (links to every type × locale)
 *   /api/email/preview?type=winback&locale=nl
 */
const ADMIN_EMAILS = ["nelissen_bram@hotmail.com", "bram@elyphont.com"];

const TYPES = [
  ["weekly", "Weekly report (resurface)"],
  ["monthly", "Monthly report (chapter)"],
  ["winback", "30-day win-back (re-engage)"],
  ["drip1", "Onboarding drip · day 1"],
  ["drip3", "Onboarding drip · day 3"],
  ["drip7", "Onboarding drip · day 7"],
  ["drip14", "Onboarding drip · day 14"],
  ["capsule", "Time-capsule reveal"],
  ["goal", "Goal deadline reminder"],
] as const;
const LOCALES = ["en", "nl", "de", "es", "fr"] as const;

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const params = new URL(request.url).searchParams;
  // Dedicated preview key (works regardless of login/session state).
  const key = params.get("key");
  if (key && process.env.EMAIL_PREVIEW_KEY && key === process.env.EMAIL_PREVIEW_KEY) return true;
  const secret = params.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (secret && cronSecret) {
    const a = Buffer.from(secret), b = Buffer.from(cronSecret);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  } catch { /* fall through */ }
  return false;
}

function indexHtml(authQ: string): string {
  const q = authQ;
  const rows = TYPES.map(([type, label]) => {
    const links = LOCALES.map((l) => `<a href="?type=${type}&locale=${l}${q}" style="margin-right:10px;">${l}</a>`).join("");
    return `<tr><td style="padding:8px 16px;border-bottom:1px solid #eee;">${label}</td><td style="padding:8px 16px;border-bottom:1px solid #eee;">${links}</td></tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Email previews</title>
    <style>body{font-family:'Source Sans 3',-apple-system,Segoe UI,Arial,sans-serif;background:#FCFAF5;color:#403B36;max-width:760px;margin:40px auto;padding:0 20px;}
    h1{font-family:Georgia,serif;font-weight:400;} a{color:#B85C38;text-decoration:none;} a:hover{text-decoration:underline;}
    table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #E7D9C4;border-radius:8px;overflow:hidden;}
    .note{color:#716A5E;font-size:13px;margin:8px 0 24px;}</style></head><body>
    <h1>Lifecycle &amp; drip email previews</h1>
    <p class="note">Read-only render with sample data — nothing is sent. Pick a template and locale. (All lifecycle sends stay disabled behind <code>LIFECYCLE_EMAILS_ENABLED</code>.)</p>
    <table>${rows}</table></body></html>`;
}

function render(type: string, locale: string, to?: string): { html: string; subject: string } | null {
  const displayName = "Bram";
  const recipientEmail = to || "bram@elyphont.com";
  const userId = "preview-user";

  if (type === "weekly") {
    const p: DigestEmailParams = {
      recipientEmail, userId, displayName, locale,
      weeklyStats: { totalMemories: 47, memoriesThisWeek: 3, totalRooms: 12 },
      streakWeeks: 4,
      memoryOfTheWeek: { id: "preview-motw", title: "Opa's verhalen over de oorlog", thumbnailUrl: null, roomName: "Grootouders" },
      onThisDayMemories: [
        { id: "preview-otd-1", title: "Mama's verjaardag", yearsAgo: 1 },
        { id: "preview-otd-2", title: "Eerste schooldag van Lotte", yearsAgo: 3 },
      ],
      upcomingCapsules: [{ title: "Brief aan mijn toekomstige zelf", revealDate: "2026-09-15" }],
      sharedRoomActivity: [{ roomName: "Familie", contributorName: "Sophie", memoryCount: 2 }],
      trackProgress: { trackName: "Familiegeschiedenis", percentComplete: 62, icon: "\u{1F3DB}", nextStepHint: "Voeg herinneringen toe over je grootouders", nextMilestoneLabel: "Nog 8 herinneringen tot de volgende mijlpaal" },
    };
    return { html: generateDigestEmailHtml(p), subject: generateDigestEmailSubject(p.displayName, p.streakWeeks, locale) };
  }
  if (type === "monthly") {
    const p: MonthlyEmailParams = {
      recipientEmail, userId, displayName, locale,
      monthDate: "2026-08-01",
      monthMemories: [
        { title: "Zomer in Toscane", thumbnailUrl: null, roomName: "Vakanties" },
        { title: "Lotte's diploma", thumbnailUrl: null, roomName: "Mijlpalen" },
        { title: "Zondagse lunch bij oma", thumbnailUrl: null, roomName: "Familie" },
      ],
      monthlyStats: { memoriesThisMonth: 11, roomsTouchedThisMonth: 4 },
      anniversaries: [
        { title: "Onze trouwdag", yearsAgo: 12, roomName: "Wij" },
        { title: "Verhuizing naar Antwerpen", yearsAgo: 5, roomName: "Thuis" },
      ],
      roomsThatGrew: [{ roomName: "Vakanties", memoryCount: 5 }],
      trackProgress: { trackName: "Familiegeschiedenis", keptCount: 41, goalCount: 50, percentComplete: 82, milestoneLabel: "Nog 9 herinneringen" },
      capsules: [{ title: "Foto's van de vakantie", revealDate: "2026-08-20" }],
      forwardLook: { text: "Eén kamer wacht nog: je Reizen-vleugel. Wanneer je er klaar voor bent, staat hij er." },
      crossedMilestone: true,
    };
    return { html: generateMonthlyEmailHtml(p), subject: generateMonthlyEmailSubject(p) };
  }
  if (type === "winback") {
    const p: ReminderEmailParams = { type: "re_engagement", recipientEmail, displayName, locale, daysSinceLogin: 32, memoryCount: 47, userId };
    return { html: generateReminderEmailHtml(p), subject: generateReminderEmailSubject(p) };
  }
  if (type === "capsule") {
    const p: ReminderEmailParams = { type: "time_capsule_reveal", recipientEmail, displayName, locale, capsuleTitle: "Brief aan mijn toekomstige zelf" };
    return { html: generateReminderEmailHtml(p), subject: generateReminderEmailSubject(p) };
  }
  if (type === "goal") {
    const p: ReminderEmailParams = { type: "goal_deadline", recipientEmail, displayName, locale, goalTitle: "Familiegeschiedenis afmaken", daysRemaining: 2 };
    return { html: generateReminderEmailHtml(p), subject: generateReminderEmailSubject(p) };
  }
  const dripMatch = type.match(/^drip(1|3|7|14)$/);
  if (dripMatch) {
    const dripDay = parseInt(dripMatch[1], 10) as 1 | 3 | 7 | 14;
    const p = { recipientEmail, displayName, locale, dripDay, userId };
    return { html: generateDripEmailHtml(p), subject: generateDripEmailSubject(p) };
  }
  return null;
}

const SENDABLE = ["weekly", "monthly", "winback", "drip1", "drip3", "drip7", "drip14"];

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const locale = url.searchParams.get("locale") || "nl";
  const key = url.searchParams.get("key");
  const secret = url.searchParams.get("secret");
  const authQ = key ? `&key=${encodeURIComponent(key)}` : secret ? `&secret=${encodeURIComponent(secret)}` : "";

  // Actually SEND a test set/one email: ?send=<to-email> (with ?type=all for the whole set).
  const send = url.searchParams.get("send");
  if (send) {
    const targets = !type || type === "all" || type === "index" ? SENDABLE : [type];
    const results: Array<{ type: string; ok: boolean; error?: string }> = [];
    for (const t of targets) {
      const r = render(t, locale, send);
      if (!r) { results.push({ type: t, ok: false, error: "unknown type" }); continue; }
      const res = await sendEmail({ to: send, subject: r.subject, html: r.html, tag: `preview-${t}` });
      results.push({ type: t, ok: !!res.success, error: res.error });
    }
    return NextResponse.json({ sentTo: send, locale, results });
  }

  if (!type || type === "index") {
    return new NextResponse(indexHtml(authQ), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const r = render(type, locale);
  if (!r) return NextResponse.json({ error: "Unknown type", types: TYPES.map((t) => t[0]) }, { status: 400 });
  return new NextResponse(r.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
