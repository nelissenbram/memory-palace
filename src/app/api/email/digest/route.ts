import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import {
  sendDigestEmail,
  type OnThisDayMemory,
  type UpcomingCapsule,
  type SharedRoomActivity,
  type TrackProgress,
} from "@/lib/email/send-digest";
import { TRACKS } from "@/lib/constants/tracks";

/**
 * POST /api/email/digest
 *
 * Weekly cron-triggered endpoint that sends personalized digest emails.
 * Secured via CRON_SECRET header (same pattern as /api/notifications/send).
 *
 * Vercel cron: every Monday at 9:00 AM — "0 9 * * 1"
 *
 * -- Supabase migration (run once in SQL editor): --
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_digest BOOLEAN DEFAULT true;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
 * ---
 */

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function POST(request: Request) {
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
  const month = now.getMonth() + 1;
  const day = now.getDate();

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

  // ── 1. Get all users who have email digest enabled ──
  // We need users from auth.users for email, joined with profiles
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (!authUsers?.users?.length) {
    return NextResponse.json({ sent: 0, message: "No users found" });
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email_digest, last_seen_at");

  const profileMap = new Map(
    (profiles || []).map((p: { id: string; display_name: string | null; email_digest: boolean | null; last_seen_at: string | null }) => [
      p.id,
      p,
    ])
  );

  // ── 2. Pre-fetch all memories for "On This Day" ──
  const { data: allMemories } = await supabase
    .from("memories")
    .select("id, title, user_id, created_at");

  // Group On This Day memories by user (memories from this week in prior years)
  const otdByUser: Record<string, OnThisDayMemory[]> = {};
  if (allMemories) {
    for (const mem of allMemories) {
      const created = new Date(mem.created_at);
      // Check if the anniversary falls within this week (today through next 6 days)
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
  }

  // ── 3. Pre-fetch upcoming time capsules (next 7 days) ──
  const { data: capsuleMemories } = await supabase
    .from("memories")
    .select("id, title, user_id, reveal_date")
    .gte("reveal_date", todayISO)
    .lte("reveal_date", weekAheadISO);

  const capsulesByUser: Record<string, UpcomingCapsule[]> = {};
  if (capsuleMemories) {
    for (const mem of capsuleMemories) {
      if (!capsulesByUser[mem.user_id]) capsulesByUser[mem.user_id] = [];
      capsulesByUser[mem.user_id].push({
        title: mem.title,
        revealDate: mem.reveal_date,
      });
    }
  }

  // ── 4. Pre-fetch shared room activity (last 7 days) ──
  const { data: sharedRooms } = await supabase
    .from("room_shares")
    .select("room_id, owner_id, shared_with_id");

  // Get recent memories in shared rooms
  const sharedRoomIds = [...new Set((sharedRooms || []).map((s: { room_id: string }) => s.room_id))];
  const activityByUser: Record<string, SharedRoomActivity[]> = {};

  if (sharedRoomIds.length > 0) {
    const { data: recentMemories } = await supabase
      .from("memories")
      .select("id, title, user_id, room_id, created_at")
      .in("room_id", sharedRoomIds)
      .gte("created_at", weekAgoISO);

    if (recentMemories && recentMemories.length > 0) {
      // Get room names
      const roomIds = [...new Set(recentMemories.map((m: { room_id: string }) => m.room_id))];
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name")
        .in("id", roomIds);

      const roomNameMap = new Map(
        (rooms || []).map((r: { id: string; name: string }) => [r.id, r.name])
      );

      // Group by contributor+room, then notify room participants
      const activityMap: Record<string, { roomName: string; contributorId: string; count: number }> = {};
      for (const mem of recentMemories) {
        const key = `${mem.user_id}:${mem.room_id}`;
        if (!activityMap[key]) {
          activityMap[key] = {
            roomName: roomNameMap.get(mem.room_id) || "Shared Room",
            contributorId: mem.user_id,
            count: 0,
          };
        }
        activityMap[key].count++;
      }

      // Map contributor IDs to display names
      const contributorIds = [...new Set(Object.values(activityMap).map((a) => a.contributorId))];
      const contributorNames = new Map<string, string>();
      for (const cid of contributorIds) {
        const profile = profileMap.get(cid);
        contributorNames.set(cid, profile?.display_name || "Someone");
      }

      // Notify room owners and shared users about activity from others
      for (const share of sharedRooms || []) {
        const participants = [share.owner_id, share.shared_with_id].filter(Boolean) as string[];
        for (const userId of participants) {
          for (const [, activity] of Object.entries(activityMap)) {
            // Don't notify users about their own contributions
            if (activity.contributorId === userId) continue;
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

  // ── 5. Pre-fetch track progress per user ──
  const memoryCountByUser: Record<string, number> = {};
  if (allMemories) {
    for (const mem of allMemories) {
      memoryCountByUser[mem.user_id] = (memoryCountByUser[mem.user_id] || 0) + 1;
    }
  }

  // ── 6. Send digest to each eligible user ──
  for (const authUser of authUsers.users) {
    const userId = authUser.id;
    const email = authUser.email;
    if (!email) continue;

    const profile = profileMap.get(userId);

    // Skip users who have opted out of email digest
    // Default is true (opt-in), so null/undefined means they want it
    if (profile?.email_digest === false) {
      skipped++;
      continue;
    }

    // Skip users who were active today (don't spam active users)
    if (profile?.last_seen_at) {
      const lastSeen = new Date(profile.last_seen_at);
      if (lastSeen.toISOString().slice(0, 10) === todayISO) {
        skipped++;
        continue;
      }
    }

    const displayName = profile?.display_name || email.split("@")[0];

    // Determine best track progress to show
    let trackProgress: TrackProgress | null = null;
    const totalMemories = memoryCountByUser[userId] || 0;
    if (totalMemories > 0 && TRACKS.length > 0) {
      // Simple heuristic: show the Preserve track progress based on memory count
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
          trackProgress = {
            trackName: preserveTrack.name,
            percentComplete: pct,
            icon: preserveTrack.icon,
          };
        }
      }
    }

    const result = await sendDigestEmail({
      recipientEmail: email,
      displayName,
      onThisDayMemories: otdByUser[userId] || [],
      upcomingCapsules: capsulesByUser[userId] || [],
      sharedRoomActivity: activityByUser[userId] || [],
      trackProgress,
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
    totalUsers: authUsers.users.length,
  });
}

// Also support GET for Vercel cron (which sends GET requests)
export async function GET(request: Request) {
  return POST(request);
}
