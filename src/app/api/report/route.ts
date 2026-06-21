import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set([
  "user",
  "comment",
  "wing",
  "room",
  "memory",
  "palace",
  "gallery",
  "family_tree",
]);

/**
 * Public content-report endpoint (Apple Guideline 1.2). Works for both
 * authenticated and anonymous viewers (public gallery, shared family tree),
 * so objectionable content can always be flagged. Reports are written with
 * the service role and reviewed by moderators within 24h.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const targetType = String(body.targetType || "");
  const targetId = String(body.targetId || "");
  if (!ALLOWED_TYPES.has(targetType) || !targetId) {
    return NextResponse.json({ ok: false, error: "Invalid target" }, { status: 400 });
  }

  const reason = String(body.reason || "other").slice(0, 100);
  const details = body.details ? String(body.details).slice(0, 2000) : null;
  const targetUserId = body.targetUserId ? String(body.targetUserId) : null;

  // Attach reporter identity when available (anonymous otherwise)
  let reporterId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    reporterId = user?.id ?? null;
  } catch {
    reporterId = null;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("content_reports").insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId,
      reason,
      details,
    });
    if (error && error.code !== "23505") {
      return NextResponse.json({ ok: false, error: "Could not file report" }, { status: 500 });
    }

    try {
      const { notifyModerators } = await import("@/lib/social/moderation-notify");
      await notifyModerators({
        reporterId: reporterId || "anonymous",
        targetType,
        targetId,
        targetUserId: targetUserId || undefined,
        reason,
        details,
      });
    } catch {
      // notification is best-effort
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not file report" }, { status: 500 });
  }
}
