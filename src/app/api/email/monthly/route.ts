import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import {
  sendMonthlyEmail,
  type MonthMemory,
  type MonthlyAnniversary,
  type RoomGrowth,
  type MonthlyCapsule,
  type MonthlyTrackProgress,
} from "@/lib/email/send-monthly";
import { lifecycleEmailsEnabled } from "@/lib/email/lifecycle-flag";
import { fetchRecentlyEmailed, logLifecycleSend } from "@/lib/email/send-ledger";
import { TRACKS } from "@/lib/constants/tracks";
import enMessages from "@/messages/en.json";

/**
 * POST /api/email/monthly
 *
 * Monthly cron-triggered endpoint sending the "Your Month in the Palace" chapter.
 * Clones the weekly digest's auth/pagination/batching/timeout with 30-day windows,
 * the monthly_highlights AND email_digest gates, a ≥1-memory-in-month gate, and
 * the shared send-ledger.
 *
 * Secured via CRON_SECRET header. Vercel cron: 1st of month, 09:20 UTC — "20 9 1 * *"
 *
 * SAFETY: sends nothing until LIFECYCLE_EMAILS_ENABLED=true (see lifecycle-flag.ts).
 */

export const maxDuration = 60;

const PRESERVE_GOAL = 50; // first-fifty photographs milestone (SPEC §C voice)

export async function POST(request: Request) {
  const startTime = Date.now();

  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!lifecycleEmailsEnabled()) {
    return NextResponse.json(
      { paused: true, reason: "LIFECYCLE_EMAILS_ENABLED not set" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const now = new Date();
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);
  const monthStartISO = monthStart.toISOString();
  const thirtyDaysAgo = monthStart; // account-age gate reuses the same boundary

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let timedOut = false;

  // ── 1. Auth users (paginated) ──
  const allAuthUsers: Array<{ id: string; email?: string }> = [];
  let page = 1;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000, page });
    if (!data?.users?.length) break;
    allAuthUsers.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  if (!allAuthUsers.length) {
    return NextResponse.json({ sent: 0, message: "No users" }, { headers: { "Cache-Control": "no-store" } });
  }

  // ── 2. Profiles (note monthly_highlights) ──
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email_digest, monthly_highlights, last_seen_at, preferred_locale, created_at");
  const profileMap = new Map(
    (profiles || []).map((p: {
      id: string; display_name: string | null; email_digest: boolean | null;
      monthly_highlights: boolean | null; last_seen_at: string | null;
      preferred_locale: string | null; created_at: string | null;
    }) => [p.id, p]),
  );

  // ── Active-in-month by memory creation ──
  const activeByMemory = new Set<string>();
  {
    const { data: creators } = await supabase
      .from("memories").select("user_id").gte("created_at", monthStartISO);
    for (const mrow of (creators || []) as Array<{ user_id: string }>) activeByMemory.add(mrow.user_id);
  }

  // Eligible iff: email_digest !== false AND monthly_highlights !== false,
  // account > 30 days old, active in the previous ~30 days, has an email.
  const eligibleUserIds = allAuthUsers
    .filter((u) => {
      const p = profileMap.get(u.id);
      if (!u.email) return false;
      if (p?.email_digest === false) return false;
      if (p?.monthly_highlights === false) return false;
      if (p?.created_at && new Date(p.created_at) > thirtyDaysAgo) return false;
      const seen = p?.last_seen_at && new Date(p.last_seen_at) >= monthStart;
      if (!seen && !activeByMemory.has(u.id)) return false;
      return true;
    })
    .map((u) => u.id);

  if (!eligibleUserIds.length) {
    return NextResponse.json({ sent: 0, skipped: allAuthUsers.length }, { headers: { "Cache-Control": "no-store" } });
  }

  // ── 3. Scoped data fetch — only eligible users ──
  const batchSize = 500;
  const idBatches: string[][] = [];
  for (let i = 0; i < eligibleUserIds.length; i += batchSize) {
    idBatches.push(eligibleUserIds.slice(i, i + batchSize));
  }

  // All memories for eligible users (for totals, OTD, and month-in-three).
  const allMemories: Array<{ id: string; title: string; user_id: string; room_id: string; thumbnail_url: string | null; created_at: string }> = [];
  for (const batch of idBatches) {
    const { data } = await supabase
      .from("memories")
      .select("id, title, user_id, room_id, thumbnail_url, created_at")
      .in("user_id", batch)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) allMemories.push(...data);
  }

  // Capsules opening this month (next 30 days). Wrapped: reveal_date may not exist.
  const monthEndISO = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayISO = now.toISOString().slice(0, 10);
  const capsuleMemories: Array<{ id: string; title: string; user_id: string; reveal_date: string }> = [];
  try {
    for (const batch of idBatches) {
      const { data, error } = await supabase
        .from("memories")
        .select("id, title, user_id, reveal_date")
        .in("user_id", batch)
        .gte("reveal_date", todayISO)
        .lte("reveal_date", monthEndISO);
      if (error) { console.warn("[Monthly] Capsule query failed:", error.message); break; }
      if (data) capsuleMemories.push(...data);
    }
  } catch (err) {
    console.warn("[Monthly] Capsule query threw:", err);
  }

  // Rooms for eligible users (names + per-user room counts).
  const allRooms: Array<{ id: string; user_id: string; name: string }> = [];
  for (const batch of idBatches) {
    const { data } = await supabase.from("rooms").select("id, user_id, name").in("user_id", batch);
    if (data) allRooms.push(...data);
  }
  const roomNameMap = new Map<string, string>();
  for (const room of allRooms) roomNameMap.set(room.id, room.name);

  // ── 4. Build per-user structures ──
  const monthMemoryCountByUser: Record<string, number> = {};
  const totalMemoryCountByUser: Record<string, number> = {};
  const monthRoomIdsByUser: Record<string, Set<string>> = {};
  const monthThreeByUser: Record<string, MonthMemory[]> = {};
  const roomGrowthByUser: Record<string, Map<string, number>> = {};
  const otdByUser: Record<string, MonthlyAnniversary[]> = {};

  const nowMonth = now.getMonth();

  for (const mem of allMemories) {
    totalMemoryCountByUser[mem.user_id] = (totalMemoryCountByUser[mem.user_id] || 0) + 1;

    const created = new Date(mem.created_at);

    // In-month (last 30 days) aggregates
    if (mem.created_at >= monthStartISO) {
      monthMemoryCountByUser[mem.user_id] = (monthMemoryCountByUser[mem.user_id] || 0) + 1;
      if (!monthRoomIdsByUser[mem.user_id]) monthRoomIdsByUser[mem.user_id] = new Set();
      if (mem.room_id) monthRoomIdsByUser[mem.user_id].add(mem.room_id);

      // Month in three: first 3 (already newest-first)
      if (!monthThreeByUser[mem.user_id]) monthThreeByUser[mem.user_id] = [];
      if (monthThreeByUser[mem.user_id].length < 3) {
        monthThreeByUser[mem.user_id].push({
          title: mem.title,
          thumbnailUrl: mem.thumbnail_url || null,
          roomName: roomNameMap.get(mem.room_id) || "Your Palace",
        });
      }

      // Rooms that grew: count in-month memories per room
      if (mem.room_id) {
        if (!roomGrowthByUser[mem.user_id]) roomGrowthByUser[mem.user_id] = new Map();
        const g = roomGrowthByUser[mem.user_id];
        g.set(mem.room_id, (g.get(mem.room_id) || 0) + 1);
      }
    }

    // Anniversaries this month: memory created in the same calendar month in a
    // previous year (whole-month match — distinct from the weekly's ±7-day window).
    if (created.getMonth() === nowMonth && created.getFullYear() < now.getFullYear()) {
      if (!otdByUser[mem.user_id]) otdByUser[mem.user_id] = [];
      if (otdByUser[mem.user_id].length < 2) {
        otdByUser[mem.user_id].push({
          title: mem.title,
          yearsAgo: now.getFullYear() - created.getFullYear(),
          roomName: roomNameMap.get(mem.room_id) || "Your Palace",
        });
      }
    }
  }

  const capsulesByUser: Record<string, MonthlyCapsule[]> = {};
  for (const c of capsuleMemories) {
    if (!capsulesByUser[c.user_id]) capsulesByUser[c.user_id] = [];
    capsulesByUser[c.user_id].push({ title: c.title, revealDate: c.reveal_date });
  }

  // Preserve-track name (English constant — proper-ish noun; documented English leak).
  const preserveTrack = TRACKS.find((tr) => tr.id === "preserve");
  const preserveTrackName = preserveTrack
    ? ((enMessages.tracksPanel as Record<string, string>)[preserveTrack.nameKey] || preserveTrack.nameKey)
    : "Preserve";

  // ── Ledger bar (also guards the 1st-of-month-on-Monday weekly collision) ──
  const { barred, readFailures: ledgerReadFailures } = await fetchRecentlyEmailed(supabase, eligibleUserIds, now);

  // ── 5. Send ──
  const authUserMap = new Map(allAuthUsers.map((u) => [u.id, u]));
  skipped += allAuthUsers.length - eligibleUserIds.length;

  for (let i = 0; i < eligibleUserIds.length; i++) {
    if (Date.now() - startTime > 50000) { timedOut = true; break; }
    const userId = eligibleUserIds[i];

    if (barred.has(userId)) { skipped++; continue; }

    const email = authUserMap.get(userId)?.email;
    if (!email) continue;

    const memoriesThisMonth = monthMemoryCountByUser[userId] ?? 0;
    if (memoriesThisMonth < 1) { skipped++; continue; } // no memories → no chapter

    const p = profileMap.get(userId);
    const locale = p?.preferred_locale || "en";

    // Rooms that grew — top room by in-month count.
    const growth = roomGrowthByUser[userId];
    let roomsThatGrew: RoomGrowth[] = [];
    if (growth && growth.size > 0) {
      const top = [...growth.entries()].sort((a, b) => b[1] - a[1])[0];
      roomsThatGrew = [{ roomName: roomNameMap.get(top[0]) || "Your Palace", memoryCount: top[1] }];
    }

    // Track progress — Preserve toward first-fifty (only while below goal).
    const totalMemories = totalMemoryCountByUser[userId] ?? 0;
    let trackProgress: MonthlyTrackProgress | null = null;
    let crossedMilestone = false;
    if (totalMemories > 0 && totalMemories < PRESERVE_GOAL) {
      trackProgress = {
        trackName: preserveTrackName,
        keptCount: totalMemories,
        goalCount: PRESERVE_GOAL,
        percentComplete: Math.round((totalMemories / PRESERVE_GOAL) * 100),
        milestoneLabel: `${PRESERVE_GOAL}`,
      };
    } else if (totalMemories >= PRESERVE_GOAL && (totalMemories - memoriesThisMonth) < PRESERVE_GOAL) {
      // Crossed the 50-memory milestone during this month → subject variant.
      crossedMilestone = true;
    }

    // Forward-look — a gentle prompt when there is an anniversary payload absent.
    const forwardLook = (otdByUser[userId]?.length ?? 0) === 0
      ? { text: "One room is still waiting for you. When you're ready, it's there." }
      : null;

    const result = await sendMonthlyEmail({
      recipientEmail: email,
      userId,
      displayName: p?.display_name || email.split("@")[0],
      locale,
      monthDate: now.toISOString(),
      monthMemories: monthThreeByUser[userId] || [],
      monthlyStats: {
        memoriesThisMonth,
        roomsTouchedThisMonth: monthRoomIdsByUser[userId]?.size || 0,
      },
      anniversaries: otdByUser[userId] || [],
      roomsThatGrew,
      trackProgress,
      capsules: capsulesByUser[userId] || [],
      forwardLook,
      crossedMilestone,
      milestoneTotal: crossedMilestone ? totalMemories : null,
    });

    if (result.success) {
      sent++;
      await logLifecycleSend(supabase, userId, "monthly");
    } else {
      const redacted = `***@${email.split("@")[1]}`;
      console.error(`[Monthly] Failed for ${redacted}:`, result.error);
      errors++;
    }
  }

  return NextResponse.json(
    { sent, skipped, errors, ledgerReadFailures, timedOut },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Vercel Cron sends GET requests.
export async function GET(request: Request) {
  return POST(request);
}
