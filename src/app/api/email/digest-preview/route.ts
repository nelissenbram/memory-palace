/** DEV ONLY — preview digest email. Remove before production. */
import { NextResponse } from "next/server";
import { generateDigestEmailHtml } from "@/lib/email/send-digest";
import type { DigestEmailParams } from "@/lib/email/send-digest";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const params: DigestEmailParams = {
    recipientEmail: "bram@elyphont.com",
    userId: "preview-user-bram",
    displayName: "Bram",
    weeklyStats: {
      totalMemories: 47,
      memoriesThisWeek: 5,
      totalRooms: 12,
    },
    streakWeeks: 12,
    memoryOfTheWeek: {
      id: "preview-motw",
      title: "Opa's verhalen over de oorlog",
      thumbnailUrl: null,
      roomName: "Grootouders",
    },
    onThisDayMemories: [
      { id: "preview-otd-1", title: "Mama's verjaardag", yearsAgo: 1 },
      { id: "preview-otd-2", title: "Eerste schooldag van Lotte", yearsAgo: 3 },
      { id: "preview-otd-3", title: "Verhuizing naar Antwerpen", yearsAgo: 5 },
    ],
    upcomingCapsules: [
      { title: "Brief aan mijn toekomstige zelf", revealDate: "2026-04-15" },
      { title: "Foto's van de vakantie in Toscane", revealDate: "2026-05-01" },
    ],
    sharedRoomActivity: [
      { roomName: "Familie", contributorName: "Sophie", memoryCount: 3 },
      { roomName: "Vakanties", contributorName: "Jan", memoryCount: 1 },
    ],
    trackProgress: {
      trackName: "Familiegeschiedenis",
      percentComplete: 62,
      icon: "\u{1F3DB}",
      nextStepHint: "Voeg herinneringen toe over je grootouders",
      nextMilestoneLabel: "Nog 8 herinneringen tot de volgende mijlpaal",
    },
    locale: "nl",
  };

  const html = generateDigestEmailHtml(params);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
