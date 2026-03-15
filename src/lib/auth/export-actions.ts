"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserDataExport {
  exported_at: string;
  profile: Record<string, unknown> | null;
  wings: Record<string, unknown>[];
  rooms: Record<string, unknown>[];
  memories: Record<string, unknown>[];
  room_shares: Record<string, unknown>[];
  public_shares: Record<string, unknown>[];
  interview_sessions: Record<string, unknown>[];
  track_progress: Record<string, unknown>[];
  memory_points: Record<string, unknown>[];
  legacy_contacts: Record<string, unknown>[];
  connected_accounts: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  storage_files: string[];
}

export async function exportUserData(): Promise<
  { data: UserDataExport } | { error: string }
> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { error: "Supabase is not configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  // Fetch all user data in parallel
  const [
    profileRes,
    wingsRes,
    roomsRes,
    memoriesRes,
    roomSharesRes,
    publicSharesRes,
    interviewsRes,
    trackProgressRes,
    memoryPointsRes,
    legacyContactsRes,
    connectedAccountsRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("wings").select("*").eq("user_id", user.id),
    supabase.from("rooms").select("*").eq("user_id", user.id),
    supabase.from("memories").select("*").eq("user_id", user.id),
    supabase
      .from("room_shares")
      .select("*")
      .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`),
    supabase.from("public_shares").select("*").eq("user_id", user.id),
    supabase
      .from("interview_sessions")
      .select("*")
      .eq("user_id", user.id),
    supabase.from("track_progress").select("*").eq("user_id", user.id),
    supabase.from("memory_points").select("*").eq("user_id", user.id),
    supabase.from("legacy_contacts").select("*").eq("user_id", user.id),
    supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_id", user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id),
  ]);

  // Collect file paths from memories
  const storageFiles: string[] = [];
  if (memoriesRes.data) {
    for (const memory of memoriesRes.data) {
      if (memory.file_path) {
        storageFiles.push(memory.file_path as string);
      }
      if (
        memory.file_url &&
        typeof memory.file_url === "string" &&
        !storageFiles.includes(memory.file_url)
      ) {
        storageFiles.push(memory.file_url);
      }
    }
  }

  // Strip sensitive fields from connected accounts (tokens)
  const sanitizedConnectedAccounts = (connectedAccountsRes.data || []).map(
    (account) => {
      const { access_token, refresh_token, ...safe } = account as Record<
        string,
        unknown
      >;
      void access_token;
      void refresh_token;
      return { ...safe, access_token: "[redacted]", refresh_token: "[redacted]" };
    }
  );

  const exportData: UserDataExport = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data || null,
    wings: wingsRes.data || [],
    rooms: roomsRes.data || [],
    memories: memoriesRes.data || [],
    room_shares: roomSharesRes.data || [],
    public_shares: publicSharesRes.data || [],
    interview_sessions: interviewsRes.data || [],
    track_progress: trackProgressRes.data || [],
    memory_points: memoryPointsRes.data || [],
    legacy_contacts: legacyContactsRes.data || [],
    connected_accounts: sanitizedConnectedAccounts,
    notifications: notificationsRes.data || [],
    storage_files: storageFiles,
  };

  return { data: exportData };
}
