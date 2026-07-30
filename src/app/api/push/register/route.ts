import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/register
 *
 * NOTE: Native push (APNs/FCM) is NOT implemented. There is no send path that
 * reads native `push_tokens` — real-time delivery uses web-push
 * (`push_subscriptions`) only. Previously this route upserted native tokens into
 * a write-only `push_tokens` table where they accumulated forever, never got
 * delivered to, and were never pruned.
 *
 * Until a native APNs/FCM send path (with dead-token cleanup) is wired up, this
 * endpoint is a no-op: it still authenticates and validates the request so the
 * native client's best-effort fetch succeeds, but it does NOT persist orphaned
 * tokens. See migration `20260730_drop_push_tokens.sql` to remove the table.
 */
export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { token } = body ?? {};

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Intentionally do not persist: native push is not implemented, so storing the
  // token would only re-create a write-only orphan. Acknowledge without writing.
  return NextResponse.json(
    { success: true, delivered: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
