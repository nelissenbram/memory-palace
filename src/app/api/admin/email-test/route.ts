import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { sendDigestEmail } from "@/lib/email/send-digest";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { sendResetEmail } from "@/lib/email/send-reset";
import {
  sendVerificationEmail,
  sendTrustedVerifierEmail,
  sendDeliveryEmail,
} from "@/lib/email/send-legacy";

export const dynamic = "force-dynamic";

/**
 * One-shot endpoint to send sample versions of every email template to a recipient.
 * Guarded by CRON_SECRET.
 *
 * Usage: GET /api/admin/email-test?to=bram@elyphont.com&secret=...
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const to = url.searchParams.get("to");
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!to) {
    return NextResponse.json({ error: "Missing ?to=" }, { status: 400 });
  }

  const results: Array<{ template: string; success: boolean; error?: string }> = [];

  // 1. Welcome
  results.push({
    template: "welcome",
    ...(await sendWelcomeEmail({ recipientEmail: to, displayName: "Bram" })),
  });

  // 2. Weekly digest
  results.push({
    template: "digest",
    ...(await sendDigestEmail({
      recipientEmail: to,
      userId: "00000000-0000-0000-0000-000000000000",
      displayName: "Bram",
      onThisDayMemories: [
        { title: "Trip to Rome", yearsAgo: 1 },
        { title: "Christmas at the lake house", yearsAgo: 3 },
      ],
      upcomingCapsules: [
        { title: "Letter to my future self", revealDate: "2027-04-12" },
      ],
      sharedRoomActivity: [
        { roomName: "Family Holidays", contributorName: "Sofia", memoryCount: 4 },
      ],
      trackProgress: {
        trackName: "Family Wing",
        percentComplete: 62,
        icon: "❦",
        nextStepHint: "Add three more childhood photos",
        nextMilestoneLabel: "3 more memories",
      },
      weeklyStats: { totalMemories: 184, memoriesThisWeek: 7, totalRooms: 12 },
      memoryOfTheWeek: {
        title: "Sunday lunch in Lucca",
        thumbnailUrl: null,
        roomName: "Travel · Italy 2024",
      },
      streakWeeks: 5,
      locale: "en",
    })),
  });

  // 3. Invite
  results.push({
    template: "invite",
    ...(await sendInviteEmail({
      inviterName: "Sofia Rinaldi",
      recipientEmail: to,
      roomName: "Christmas at the lake house",
      wingName: "Family",
      shareId: "preview-share-id",
      permission: "contribute",
      personalMessage: "Bram, I added some photos from last year — would love your help filling in the stories.",
    })),
  });

  // 4. Reminder (re_engagement)
  results.push({
    template: "reminder",
    ...(await sendReminderEmail({
      type: "re_engagement",
      recipientEmail: to,
      displayName: "Bram",
      daysSinceLogin: 21,
      memoryCount: 184,
    })),
  });

  // 5. Legacy delivery (the most evocative of the three)
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  results.push({
    template: "legacy-delivery",
    ...(await sendDeliveryEmail({
      recipientEmail: to,
      recipientName: "Bram",
      senderName: "Eleonora Visconti",
      messageSubject: "For when I'm no longer here",
      messageBody:
        "If you are reading this, the time has come. I leave you the rooms of my life — keep the lights on.\n\nWalk through them slowly. Every photograph has a story I never had time to tell you in person.",
      accessToken: "preview-token",
      expiresAt,
      locale: "en",
    })),
  });

  // 6. Password reset
  results.push({
    template: "reset",
    ...(await sendResetEmail({
      recipientEmail: to,
      resetLink: "https://thememorypalace.ai/reset-password?token=preview",
    })),
  });

  // Bonus: verification + trusted verifier (legacy variants)
  results.push({
    template: "legacy-verification",
    ...(await sendVerificationEmail({
      recipientEmail: to,
      displayName: "Bram",
      inactiveDays: 60,
      verificationToken: "preview-token",
      locale: "en",
    })),
  });

  results.push({
    template: "legacy-trusted-verifier",
    ...(await sendTrustedVerifierEmail({
      recipientEmail: to,
      recipientName: "Marco",
      userName: "Eleonora Visconti",
      inactiveDays: 60,
      verificationToken: "preview-token",
      locale: "en",
    })),
  });

  return NextResponse.json({ to, results });
}
