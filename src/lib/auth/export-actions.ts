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
  legacy_messages: Record<string, unknown>[];
  legacy_settings: Record<string, unknown>[];
  legacy_deliveries: Record<string, unknown>[];
  connected_accounts: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  family_groups: Record<string, unknown>[];
  family_members: Record<string, unknown>[];
  family_tree_persons: Record<string, unknown>[];
  family_tree_relationships: Record<string, unknown>[];
  wing_shares: Record<string, unknown>[];
  storage_files: string[];
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Safe query helper — returns empty array if table doesn't exist or query fails */
async function safeQuery(
  supabase: SupabaseClient,
  table: string,
  column: string,
  userId: string,
): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, userId);
    if (error) {
      console.warn(`Export: skipping table "${table}":`, error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/** Safe profile query — returns null if profile doesn't exist or query fails */
async function safeProfileQuery(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("Export: skipping profiles:", error.message);
      return null;
    }
    return data || null;
  } catch {
    return null;
  }
}

export async function exportUserData(
  supabase: SupabaseClient,
  uid: string,
): Promise<{ data: UserDataExport } | { error: string }> {
  try {
    // Fetch all user data in parallel — safe queries won't throw on missing tables
    const [
      profile,
      wings,
      rooms,
      memories,
      roomShares,
      publicShares,
      interviews,
      trackProgress,
      memoryPoints,
      legacyContacts,
      legacyMessages,
      legacySettings,
      legacyDeliveries,
      connectedAccounts,
      notifications,
      familyGroups,
      familyMembers,
      familyTreePersons,
      familyTreeRels,
      wingShares,
    ] = await Promise.all([
      safeProfileQuery(supabase, uid),
      safeQuery(supabase, "wings", "user_id", uid),
      safeQuery(supabase, "rooms", "user_id", uid),
      safeQuery(supabase, "memories", "user_id", uid),
      safeQuery(supabase, "room_shares", "owner_id", uid),
      safeQuery(supabase, "public_shares", "user_id", uid),
      safeQuery(supabase, "interview_sessions", "user_id", uid),
      safeQuery(supabase, "track_progress", "user_id", uid),
      safeQuery(supabase, "memory_points", "user_id", uid),
      safeQuery(supabase, "legacy_contacts", "user_id", uid),
      safeQuery(supabase, "legacy_messages", "user_id", uid),
      safeQuery(supabase, "legacy_settings", "user_id", uid),
      safeQuery(supabase, "legacy_deliveries", "user_id", uid),
      safeQuery(supabase, "connected_accounts", "user_id", uid),
      safeQuery(supabase, "notifications", "user_id", uid),
      safeQuery(supabase, "family_groups", "owner_id", uid),
      safeQuery(supabase, "family_members", "user_id", uid),
      safeQuery(supabase, "family_tree_persons", "user_id", uid),
      safeQuery(supabase, "family_tree_relationships", "user_id", uid),
      safeQuery(supabase, "wing_shares", "owner_id", uid),
    ]);

    // Collect file paths from memories
    const storageFiles: string[] = [];
    for (const memory of memories) {
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

    // Strip sensitive fields from connected accounts (tokens)
    const sanitizedConnectedAccounts = connectedAccounts.map((account) => {
      const { access_token, refresh_token, ...safe } = account;
      void access_token;
      void refresh_token;
      return { ...safe, access_token: "[redacted]", refresh_token: "[redacted]" };
    });

    const exportData: UserDataExport = {
      exported_at: new Date().toISOString(),
      profile,
      wings,
      rooms,
      memories,
      room_shares: roomShares,
      public_shares: publicShares,
      interview_sessions: interviews,
      track_progress: trackProgress,
      memory_points: memoryPoints,
      legacy_contacts: legacyContacts,
      legacy_messages: legacyMessages,
      legacy_settings: legacySettings,
      legacy_deliveries: legacyDeliveries,
      connected_accounts: sanitizedConnectedAccounts,
      notifications,
      family_groups: familyGroups,
      family_members: familyMembers,
      family_tree_persons: familyTreePersons,
      family_tree_relationships: familyTreeRels,
      wing_shares: wingShares,
      storage_files: storageFiles,
    };

    return { data: exportData };
  } catch (err) {
    console.error("exportUserData failed:", err);
    return { error: "EXPORT_DATA_FAILED" };
  }
}
