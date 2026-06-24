import type { SupabaseClient } from "@supabase/supabase-js";

/** Emails allowed to use admin/moderation surfaces when authenticated via session. */
export const ADMIN_EMAILS = [
  "nelissen_bram@hotmail.com",
  "bram@elyphont.com",
];

/** True if the current session belongs to a moderator/admin. */
export async function isAdminUser(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  } catch {
    return false;
  }
}
