import { NextRequest, NextResponse } from "next/server";
import { sendDigestEmail } from "@/lib/email/send-digest";
import { sendInviteEmail } from "@/lib/email/send-invite";

// Temporary test endpoint — remove after testing
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-test-secret");
  if (secret !== "mp-email-test-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = (await req.json()) as { email: string };
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  // 1. Send weekly digest with fictive data
  const digestResult = await sendDigestEmail({
    recipientEmail: email,
    displayName: "Bram",
    weeklyStats: {
      totalMemories: 47,
      memoriesThisWeek: 5,
      totalRooms: 12,
    },
    memoryOfTheWeek: {
      title: "Summer holiday in Tuscany, 2019",
      thumbnailUrl: null,
      roomName: "Travel Adventures",
    },
    onThisDayMemories: [
      { title: "First day at university", yearsAgo: 8 },
      { title: "Family reunion in Bruges", yearsAgo: 3 },
    ],
    upcomingCapsules: [
      { title: "Letter to future self", revealDate: "2026-04-03" },
    ],
    sharedRoomActivity: [
      { roomName: "Family Holidays", contributorName: "Sophie", memoryCount: 3 },
    ],
    trackProgress: {
      trackName: "Preserve",
      percentComplete: 88,
      icon: "\uD83C\uDFC6",
    },
  });
  results.digest = digestResult;

  // 2. Send wing sharing invite
  const inviteResult = await sendInviteEmail({
    inviterName: "Bram Nelissen",
    recipientEmail: email,
    roomName: "Family Holidays",
    wingName: "Family",
    shareId: "test-share-demo-123",
    permission: "contribute",
    personalMessage: "Hey! I'd love for you to add your memories to our Family Holidays room. We can build this together!",
  });
  results.invite = inviteResult;

  return NextResponse.json({ ok: true, results });
}
