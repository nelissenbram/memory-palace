import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import {
  sendDigestEmail,
  type OnThisDayMemory,
  type UpcomingCapsule,
  type SharedRoomActivity,
  type TrackProgress,
  type MemoryOfTheWeek,
  type WeeklyStats,
} from "@/lib/email/send-digest";
import { TRACKS } from "@/lib/constants/tracks";
import enMessages from "@/messages/en.json";

/**
 * POST /api/email/digest
 *
 * Weekly cron-triggered endpoint that sends personalized digest emails.
 * Secured via CRON_SECRET header (same pattern as /api/notifications/send).
 *
 * Vercel cron: every Monday at 9:00 AM — "0 9 * * 1"
 */

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * Calculate how many consecutive weeks (ending with the current week)
 * a user has added at least one memory.
 *
 * Works backwards from the current week. A "week" is Mon-Sun aligned.
 * Returns 0 if no memory was added in the current or most recent week,
 * otherwise the count of consecutive weeks with activity.
 */
function calculateStreakWeeks(memoryDates: string[], now: Date): number {
  if (memoryDates.length === 0) return 0;

  // Find the Monday of the current week (ISO week: Monday = start)
  const currentMonday = new Date(now);
  const dayOfWeek = currentMonday.getDay(); // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentMonday.setDate(currentMonday.getDate() - daysToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // Build a Set of "week indices" where the user has memories
  // Week index 0 = current week, 1 = last week, etc.
  const weeksWithActivity = new Set<number>();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const dateStr of memoryDates) {
    const d = new Date(dateStr);
    const diffMs = currentMonday.getTime() - d.getTime();
    if (diffMs <= 0) {
      // Current week (the date is on or after this Monday)
      weeksWithActivity.add(0);
    } else {
      // Past weeks: find which Monday this date falls under.
      // diffMs > 0 means the memory is before currentMonday.
      // A memory on the previous Monday (diffMs = exactly weekMs) belongs to week 1,
      // while a memory just before currentMonday (diffMs = 1ms) also belongs to week 1.
      // Formula: ceil(diffMs / weekMs) gives the correct week index.
      const weekIndex = Math.ceil(diffMs / weekMs);
      weeksWithActivity.add(weekIndex);
    }
  }

  // Count consecutive weeks starting from week 0 (current week)
  // If current week has no activity, start from week 1 (allow the current week to be "in progress")
  const startWeek = weeksWithActivity.has(0) ? 0 : 1;
  if (!weeksWithActivity.has(startWeek)) return 0;

  let streak = 0;
  for (let w = startWeek; w < 200; w++) {
    if (weeksWithActivity.has(w)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Determine the next incomplete step on the Preserve track and produce
 * a human-readable milestone label like "Add 15 more memories to reach 50".
 */
function getPreserveNextMilestone(
  totalMemories: number,
  totalRooms: number,
): { nextStepHint: string | null; nextMilestoneLabel: string | null } {
  // Memory count milestones on the Preserve track
  const milestones: Array<{ threshold: number; stepId: string; label: string }> = [
    { threshold: 1, stepId: "p_first_photo", label: "Add your first memory" },
    { threshold: 10, stepId: "p_10_photos", label: "Reach 10 memories" },
    { threshold: 50, stepId: "p_50_photos", label: "Reach 50 memories" },
    { threshold: 100, stepId: "p_100_photos", label: "Reach 100 memories" },
  ];

  for (const m of milestones) {
    if (totalMemories < m.threshold) {
      const remaining = m.threshold - totalMemories;
      const label = remaining === 1
        ? `Add 1 more memory to ${m.label.toLowerCase().replace("reach ", "reach ")}`
        : `Add ${remaining} more memories to ${m.label.toLowerCase()}`;
      return { nextStepHint: m.label, nextMilestoneLabel: label };
    }
  }

  // All memory milestones done — check rooms
  if (totalRooms < 3) {
    const remaining = 3 - totalRooms;
    return {
      nextStepHint: "Create 3 rooms",
      nextMilestoneLabel: `Create ${remaining} more room${remaining === 1 ? "" : "s"} to continue`,
    };
  }

  return { nextStepHint: null, nextMilestoneLabel: null };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  // Date range for "this week" (past 7 days for anniversaries and activity)
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  // Date range for upcoming capsules (next 7 days)
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadISO = weekAhead.toISOString().slice(0, 10);

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let timedOut = false;

  // ── 1. Get all auth users (with pagination) ──
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
    return NextResponse.json({ sent: 0, message: "No users found" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // ── 2. Get eligible profiles (digest enabled) ──
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email_digest, last_seen_at, preferred_locale, created_at");

  const profileMap = new Map(
    (profiles || []).map((p: { id: string; display_name: string | null; email_digest: boolean | null; last_seen_at: string | null; preferred_locale: string | null; created_at: string | null }) => [
      p.id,
      p,
    ])
  );

  // Filter to eligible user IDs (digest not explicitly disabled, not active today, account > 7 days old)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const eligibleUserIds = allAuthUsers
    .filter((u) => {
      const profile = profileMap.get(u.id);
      if (profile?.email_digest === false) return false;
      // Skip users whose account is less than 7 days old
      if (profile?.created_at) {
        const createdAt = new Date(profile.created_at);
        if (createdAt > sevenDaysAgo) return false;
      }
      if (profile?.last_seen_at) {
        const lastSeen = new Date(profile.last_seen_at);
        if (lastSeen.toISOString().slice(0, 10) === todayISO) return false;
      }
      return !!u.email;
    })
    .map((u) => u.id);

  if (!eligibleUserIds.length) {
    return NextResponse.json({ sent: 0, skipped: allAuthUsers.length, message: "No eligible users" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // ── 3. Scoped data fetching — only for eligible users ──

  // Batch eligible IDs (Supabase .in() has practical limits ~1000)
  const batchSize = 500;
  const idBatches: string[][] = [];
  for (let i = 0; i < eligibleUserIds.length; i += batchSize) {
    idBatches.push(eligibleUserIds.slice(i, i + batchSize));
  }

  // Fetch all memories for eligible users only
  const allMemories: Array<{ id: string; title: string; user_id: string; room_id: string; thumbnail_url: string | null; created_at: string }> = [];
  for (const batch of idBatches) {
    const { data } = await supabase
      .from("memories")
      .select("id, title, user_id, room_id, thumbnail_url, created_at")
      .in("user_id", batch);
    if (data) allMemories.push(...data);
  }

  // Fetch upcoming time capsules (already filtered by date, just scope to eligible users)
  // Wrapped in try/catch because reveal_date column may not exist yet
  const capsuleMemories: Array<{ id: string; title: string; user_id: string; reveal_date: string }> = [];
  try {
    for (const batch of idBatches) {
      const { data, error } = await supabase
        .from("memories")
        .select("id, title, user_id, reveal_date")
        .in("user_id", batch)
        .gte("reveal_date", todayISO)
        .lte("reveal_date", weekAheadISO);
      if (error) {
        console.warn("[Digest] Time capsules query failed (reveal_date column may not exist yet):", error.message);
        break;
      }
      if (data) capsuleMemories.push(...data);
    }
  } catch (err) {
    console.warn("[Digest] Time capsules query threw unexpectedly:", err);
    // capsuleMemories stays empty — upcoming_capsules will be [] for all users
  }

  // Fetch shared rooms for eligible users only
  const sharedRooms: Array<{ room_id: string; owner_id: string; shared_with_id: string }> = [];
  for (const batch of idBatches) {
    const { data: owned } = await supabase
      .from("room_shares")
      .select("room_id, owner_id, shared_with_id")
      .in("owner_id", batch);
    if (owned) sharedRooms.push(...owned);

    const { data: shared } = await supabase
      .from("room_shares")
      .select("room_id, owner_id, shared_with_id")
      .in("shared_with_id", batch);
    if (shared) sharedRooms.push(...shared);
  }

  // Fetch rooms for eligible users only
  const allRooms: Array<{ id: string; user_id: string; name: string }> = [];
  for (const batch of idBatches) {
    const { data } = await supabase
      .from("rooms")
      .select("id, user_id, name")
      .in("user_id", batch);
    if (data) allRooms.push(...data);
  }

  // ── 4. Build per-user data structures ──

  // On This Day memories
  const otdByUser: Record<string, OnThisDayMemory[]> = {};
  for (const mem of allMemories) {
    const created = new Date(mem.created_at);
    for (let offset = 0; offset < 7; offset++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + offset);
      if (
        created.getMonth() + 1 === checkDate.getMonth() + 1 &&
        created.getDate() === checkDate.getDate() &&
        created.getFullYear() < now.getFullYear()
      ) {
        if (!otdByUser[mem.user_id]) otdByUser[mem.user_id] = [];
        otdByUser[mem.user_id].push({
          title: mem.title,
          yearsAgo: now.getFullYear() - created.getFullYear(),
        });
        break;
      }
    }
  }

  // Capsules by user
  const capsulesByUser: Record<string, UpcomingCapsule[]> = {};
  for (const mem of capsuleMemories) {
    if (!capsulesByUser[mem.user_id]) capsulesByUser[mem.user_id] = [];
    capsulesByUser[mem.user_id].push({
      title: mem.title,
      revealDate: mem.reveal_date,
    });
  }

  // Shared room activity
  // Deduplicate shared rooms (same row can be fetched via owner_id and shared_with_id queries)
  const uniqueSharedRooms = Array.from(
    new Map(
      sharedRooms.map((s) => [`${s.room_id}:${s.owner_id}:${s.shared_with_id}`, s])
    ).values()
  );
  const sharedRoomIds = [...new Set(uniqueSharedRooms.map((s) => s.room_id))];
  const activityByUser: Record<string, SharedRoomActivity[]> = {};

  if (sharedRoomIds.length > 0) {
    const { data: recentMemories } = await supabase
      .from("memories")
      .select("id, title, user_id, room_id, created_at")
      .in("room_id", sharedRoomIds.slice(0, 500))
      .gte("created_at", weekAgoISO);

    if (recentMemories && recentMemories.length > 0) {
      const roomIds = [...new Set(recentMemories.map((m: { room_id: string }) => m.room_id))];
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name")
        .in("id", roomIds);

      const sharedRoomNameMap = new Map(
        (rooms || []).map((r: { id: string; name: string }) => [r.id, r.name])
      );

      // Build activity map: contributor + room -> count
      const activityMap: Record<string, { roomId: string; roomName: string; contributorId: string; count: number }> = {};
      for (const mem of recentMemories) {
        const key = `${mem.user_id}:${mem.room_id}`;
        if (!activityMap[key]) {
          activityMap[key] = {
            roomId: mem.room_id,
            roomName: sharedRoomNameMap.get(mem.room_id) || "Shared Room",
            contributorId: mem.user_id,
            count: 0,
          };
        }
        activityMap[key].count++;
      }

      const contributorNames = new Map<string, string>();
      for (const a of Object.values(activityMap)) {
        const profile = profileMap.get(a.contributorId);
        contributorNames.set(a.contributorId, profile?.display_name || "Someone");
      }

      // For each share, only show activity in THAT room to THAT share's participants
      const seenActivity = new Set<string>();
      for (const share of uniqueSharedRooms) {
        const participants = [share.owner_id, share.shared_with_id].filter(Boolean) as string[];
        for (const userId of participants) {
          for (const activity of Object.values(activityMap)) {
            // Only include activity from this share's room
            if (activity.roomId !== share.room_id) continue;
            // Don't show user their own activity
            if (activity.contributorId === userId) continue;
            // Deduplicate: same user should not see the same activity twice
            const dedupeKey = `${userId}:${activity.contributorId}:${activity.roomId}`;
            if (seenActivity.has(dedupeKey)) continue;
            seenActivity.add(dedupeKey);

            if (!activityByUser[userId]) activityByUser[userId] = [];
            activityByUser[userId].push({
              roomName: activity.roomName,
              contributorName: contributorNames.get(activity.contributorId) || "Someone",
              memoryCount: activity.count,
            });
          }
        }
      }
    }
  }

  // Memory counts, room counts, creation dates for streak, and recent memories
  const memoryCountByUser: Record<string, number> = {};
  const memoriesThisWeekByUser: Record<string, number> = {};
  const roomIdsByUser: Record<string, Set<string>> = {};
  const recentMemoriesByUser: Record<string, { title: string; thumbnailUrl: string | null; roomId: string }[]> = {};
  const memoryDatesByUser: Record<string, string[]> = {};

  for (const mem of allMemories) {
    memoryCountByUser[mem.user_id] = (memoryCountByUser[mem.user_id] || 0) + 1;

    // Collect all creation dates for streak calculation
    if (!memoryDatesByUser[mem.user_id]) memoryDatesByUser[mem.user_id] = [];
    memoryDatesByUser[mem.user_id].push(mem.created_at);

    if (mem.created_at >= weekAgoISO) {
      memoriesThisWeekByUser[mem.user_id] = (memoriesThisWeekByUser[mem.user_id] || 0) + 1;
      if (!recentMemoriesByUser[mem.user_id]) recentMemoriesByUser[mem.user_id] = [];
      recentMemoriesByUser[mem.user_id].push({
        title: mem.title,
        thumbnailUrl: mem.thumbnail_url || null,
        roomId: mem.room_id || "",
      });
    }
  }

  const roomNameMap = new Map<string, string>();
  for (const room of allRooms) {
    if (!roomIdsByUser[room.user_id]) roomIdsByUser[room.user_id] = new Set();
    roomIdsByUser[room.user_id].add(room.id);
    roomNameMap.set(room.id, room.name);
  }

  // ── 5. Send digest to each eligible user ──
  const authUserMap = new Map(allAuthUsers.map((u) => [u.id, u]));
  const skippedFromAuth = allAuthUsers.length - eligibleUserIds.length;
  skipped += skippedFromAuth;

  let usersSkipped = 0;

  for (let i = 0; i < eligibleUserIds.length; i++) {
    const userId = eligibleUserIds[i];
    // Timeout check (50s of 60s limit)
    if (Date.now() - startTime > 50000) {
      timedOut = true;
      usersSkipped = eligibleUserIds.length - i;
      console.warn(`[Digest] Timed out with ${usersSkipped} users remaining unprocessed`);
      break;
    }

    const authUser = authUserMap.get(userId);
    const email = authUser?.email;
    if (!email) continue;

    const profile = profileMap.get(userId);
    const displayName = profile?.display_name || email.split("@")[0];
    const locale = profile?.preferred_locale || "en";

    // Calculate streak
    const streakWeeks = calculateStreakWeeks(memoryDatesByUser[userId] || [], now);

    // Determine best track progress to show
    const totalMemories = memoryCountByUser[userId] || 0;
    const totalRooms = roomIdsByUser[userId]?.size || 0;
    let trackProgress: TrackProgress | null = null;

    if (totalMemories > 0 && TRACKS.length > 0) {
      const preserveTrack = TRACKS.find((t) => t.id === "preserve");
      if (preserveTrack) {
        const completedSteps = preserveTrack.steps.filter((step) => {
          if (step.id === "p_first_photo") return totalMemories >= 1;
          if (step.id === "p_10_photos") return totalMemories >= 10;
          if (step.id === "p_50_photos") return totalMemories >= 50;
          if (step.id === "p_100_photos") return totalMemories >= 100;
          return false;
        }).length;
        const pct = Math.round((completedSteps / preserveTrack.steps.length) * 100);
        if (pct > 0 && pct < 100) {
          const { nextStepHint, nextMilestoneLabel } = getPreserveNextMilestone(totalMemories, totalRooms);
          trackProgress = {
            trackName: (enMessages.tracksPanel as Record<string, string>)[preserveTrack.nameKey] || preserveTrack.nameKey,
            percentComplete: pct,
            icon: preserveTrack.icon,
            nextStepHint,
            nextMilestoneLabel,
          };
        }
      }
    }

    const weeklyStats: WeeklyStats = {
      totalMemories: memoryCountByUser[userId] || 0,
      memoriesThisWeek: memoriesThisWeekByUser[userId] || 0,
      totalRooms,
    };

    let memoryOfTheWeek: MemoryOfTheWeek | null = null;
    const candidates = recentMemoriesByUser[userId];
    if (candidates && candidates.length > 0) {
      const withThumbs = candidates.filter((c) => c.thumbnailUrl);
      const pool = withThumbs.length > 0 ? withThumbs : candidates;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      memoryOfTheWeek = {
        title: pick.title,
        thumbnailUrl: pick.thumbnailUrl,
        roomName: roomNameMap.get(pick.roomId) || "Your Palace",
      };
    }

    const result = await sendDigestEmail({
      recipientEmail: email,
      userId,
      displayName,
      onThisDayMemories: otdByUser[userId] || [],
      upcomingCapsules: capsulesByUser[userId] || [],
      sharedRoomActivity: activityByUser[userId] || [],
      trackProgress,
      weeklyStats,
      memoryOfTheWeek,
      streakWeeks,
      locale,
    });

    if (result.success) {
      sent++;
    } else {
      console.error(`[Digest] Failed for ${email}:`, result.error);
      errors++;
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    errors,
    totalUsers: allAuthUsers.length,
    eligibleUsers: eligibleUserIds.length,
    timedOut,
    usersSkipped,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// Also support GET for Vercel cron (which sends GET requests)
export async function GET(request: Request) {
  return POST(request);
}
