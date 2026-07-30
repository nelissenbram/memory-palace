import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Reject path segments that could cause traversal or injection. */
export function isPathSafe(segments: string[]): boolean {
  for (const seg of segments) {
    if (
      seg === "" ||
      seg === "." ||
      seg === ".." ||
      seg.includes("\0") ||
      seg.includes("\\")
    ) return false;
  }
  return true;
}

export interface MediaAuthResult {
  authorized: boolean;
  status: number; // suggested HTTP status when not authorized
  error?: string;
}

/**
 * Authorize a read of a private media object at `/api/media/{bucket}/{user_id}/{filename}`.
 *
 * Mirrors the authorization performed by the /api/media proxy route so that any
 * server-side code that downloads directly from storage (bypassing the proxy)
 * enforces the same ownership / share / published-wing checks and never leaks
 * another user's private image. `busts` is public; `memories` is private.
 *
 * The caller passes the already-validated bucket and filePath (segments joined).
 * This function performs its OWN path-safety and bucket validation defensively.
 */
export async function authorizeMediaRead(
  bucketRaw: string,
  segments: string[],
): Promise<MediaAuthResult> {
  // Validate bucket + path defensively (never trust caller).
  if (!isPathSafe(segments)) {
    return { authorized: false, status: 400, error: "Invalid path" };
  }
  if (bucketRaw !== "memories" && bucketRaw !== "busts") {
    return { authorized: false, status: 400, error: "Unknown bucket" };
  }

  // Busts are public.
  if (bucketRaw === "busts") {
    return { authorized: true, status: 200 };
  }

  const bucket = "memories" as const;
  const filePath = segments.join("/");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Prefer the admin client (bypasses RLS for shared/published lookups); fall
  // back to the session client on environments without a service-role key.
  let adminClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> = supabase;
  let hasAdmin = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      adminClient = createAdminClient();
      hasAdmin = true;
    } catch (err) {
      console.error("[media-access] admin client unavailable, using session client:", err);
    }
  }

  if (!user && !hasAdmin) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  // Look up the memory row by file_path or thumbnail_url.
  let { data: memory } = await adminClient
    .from("memories")
    .select("id, user_id, room_id")
    .eq("file_path", filePath)
    .maybeSingle();

  if (!memory) {
    const { data: thumbMatch } = await adminClient
      .from("memories")
      .select("id, user_id, room_id")
      .ilike("thumbnail_url", `%${filePath}%`)
      .limit(1)
      .maybeSingle();
    memory = thumbMatch;
  }

  if (!memory) {
    return { authorized: false, status: 404, error: "Not found" };
  }

  let authorized = !!user && memory.user_id === user.id;

  // Shared access (accepted room_share) — authenticated users only.
  if (!authorized && user) {
    const { data: share } = await supabase
      .from("room_shares")
      .select("id")
      .eq("room_id", memory.room_id)
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();
    authorized = !!share;
  }

  // Published-wing access.
  if (!authorized && memory.room_id) {
    const { data: room } = await adminClient
      .from("rooms")
      .select("wing_id")
      .eq("id", memory.room_id)
      .maybeSingle();
    if (room) {
      const { data: wing } = await adminClient
        .from("wings")
        .select("id")
        .eq("id", room.wing_id)
        .not("published_at", "is", null)
        .maybeSingle();
      authorized = !!wing;
    }
  }

  if (!authorized) {
    return { authorized: false, status: 403, error: "Forbidden" };
  }

  return { authorized: true, status: 200 };
}
