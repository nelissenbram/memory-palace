import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

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
 * Resolve the TRUE owner of a reported target server-side from its id, so the
 * stored target_user_id can never be forged by the reporter (IDOR). Returns:
 *   - { owner } when the target row exists (owner may be null for types with
 *     no distinct owner column, e.g. gallery/family_tree collections).
 *   - null when the target does not exist / is not reportable.
 * For `user`/`palace` the target itself IS the profile, so the owner is its id.
 */
async function resolveTargetOwner(
  admin: ReturnType<typeof createAdminClient>,
  targetType: string,
  targetId: string,
): Promise<{ owner: string | null } | null> {
  const OWNER_TABLE: Record<string, { table: string; ownerCol: string }> = {
    comment: { table: "comments", ownerCol: "user_id" },
    memory: { table: "memories", ownerCol: "user_id" },
    wing: { table: "wings", ownerCol: "user_id" },
    room: { table: "rooms", ownerCol: "user_id" },
  };

  if (targetType === "user" || targetType === "palace") {
    // The target IS a profile row; verify it exists and use its id as owner.
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return null;
    return { owner: (data as { id: string }).id };
  }

  const map = OWNER_TABLE[targetType];
  if (map) {
    const { data } = await admin
      .from(map.table)
      .select(map.ownerCol)
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return null;
    return { owner: (data as unknown as Record<string, string | null>)[map.ownerCol] ?? null };
  }

  // gallery / family_tree: no single owner column we can trust from this id.
  // Store no owner (null) rather than a forged one; moderator `hideOwner`
  // becomes a safe no-op unless a verified owner exists.
  return { owner: null };
}

/**
 * Public content-report endpoint (Apple Guideline 1.2). Works for both
 * authenticated and anonymous viewers (public gallery, shared family tree),
 * so objectionable content can always be flagged. Reports are written with
 * the service role and reviewed by moderators within 24h.
 */
export async function POST(req: NextRequest) {
  // ── Anti-spam: per-IP rate limit before any service-role write ──
  // The endpoint is public and writes with the service role (bypasses RLS),
  // so it must be throttled independently of the (NULL for anon) dedup index.
  const ip = getClientIp(req);
  const rl = await rateLimit(`report:${ip}`, 10, 3_600_000);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const targetType = String(body.targetType || "");
  const targetId = String(body.targetId || "").slice(0, 200);
  if (!ALLOWED_TYPES.has(targetType) || !targetId) {
    return NextResponse.json({ ok: false, error: "Invalid target" }, { status: 400 });
  }

  const reason = String(body.reason || "other").slice(0, 100);
  const details = body.details ? String(body.details).slice(0, 2000) : null;

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

    // NEVER trust a client-supplied targetUserId (IDOR). Resolve the real owner
    // from the target row and reject reports against non-existent targets, so a
    // report can't be primed to delete/un-publish an innocent third user.
    const resolved = await resolveTargetOwner(admin, targetType, targetId);
    if (!resolved) {
      return NextResponse.json({ ok: false, error: "Invalid target" }, { status: 400 });
    }
    const targetUserId = resolved.owner;

    // Dedup: the partial unique index on (reporter_id, target_type, target_id)
    // never fires for anonymous reports (reporter_id NULL, NULL != NULL). Do a
    // coarse app-level check so we don't spam the table / inbox on the same
    // target, and so we only email moderators on the FIRST pending report.
    let alreadyPending = false;
    try {
      const { data: existing } = await admin
        .from("content_reports")
        .select("id")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      alreadyPending = !!existing;
    } catch {
      // If the dedup lookup fails, fall through and let the insert proceed;
      // the unique index still guards authenticated duplicates.
      alreadyPending = false;
    }

    const { error } = await admin.from("content_reports").insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId,
      reason,
      details,
    });
    // 23505 = unique_violation (duplicate pending report from same reporter).
    // 22P02 = invalid_text_representation (a slug/token in a UUID column before
    // the target_id→TEXT migration is applied). Both are client-side / benign
    // conditions — treat as a successful/handled report, never a 500.
    if (error && error.code !== "23505") {
      if (error.code === "22P02") {
        return NextResponse.json(
          { ok: false, error: "Invalid target" },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: false, error: "Could not file report" }, { status: 500 });
    }

    // Only email moderators the first time a target enters the pending queue.
    if (!alreadyPending) {
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
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not file report" }, { status: 500 });
  }
}
