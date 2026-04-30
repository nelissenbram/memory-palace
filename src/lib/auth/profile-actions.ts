"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { serverError } from "@/lib/i18n/server-errors";
import { revokeProviderToken } from "@/lib/integrations/helpers";
import { r2Remove, r2List, isR2Configured } from "@/lib/storage/r2";

const DEFAULT_WINGS = [
  { slug: "roots", accent_color: "#C17F59" },
  { slug: "nest", accent_color: "#7AA0C8" },
  { slug: "craft", accent_color: "#8B7355" },
  { slug: "travel", accent_color: "#4A6741" },
  { slug: "passions", accent_color: "#9B6B8E" },
];

export async function completeOnboarding(data: {
  displayName: string;
  goal: string;
  firstWing: string;
  styleEra?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { success: true }; // Skip when Supabase isn't configured
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    { const t = await serverError(); return { error: t("notAuthenticated") }; }
  }

  // Upsert profile — handles edge case where DB trigger didn't create the row
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: data.displayName,
        goal: data.goal,
        first_wing: data.firstWing,
        style_era: data.styleEra || "roman",
        onboarded: true,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return { error: profileError.message };
  }

  // Seed default wings (idempotent — skip if already exist)
  const { data: existingWings } = await supabase
    .from("wings")
    .select("slug")
    .eq("user_id", user.id);

  if (!existingWings || existingWings.length === 0) {
    const { error: wingsError } = await supabase.from("wings").insert(
      DEFAULT_WINGS.map((w, i) => ({
        user_id: user.id,
        slug: w.slug,
        accent_color: w.accent_color,
        sort_order: i,
      }))
    );

    if (wingsError) {
      return { error: wingsError.message };
    }
  }

  return { success: true };
}

/** One-time migration: rename old wing slugs → new slugs for existing users */
export async function migrateWingSlugs() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: wings } = await supabase.from("wings").select("id, slug").eq("user_id", user.id);
  if (!wings || wings.length === 0) return;

  const slugMap: Record<string, string> = { family: "roots", childhood: "roots", career: "craft", creativity: "passions" };
  const existingSlugs = new Set(wings.map(w => w.slug));

  // Skip if already migrated (has "roots" or no old slugs)
  const hasOldSlugs = wings.some(w => w.slug in slugMap);
  if (!hasOldSlugs) {
    // Just ensure "nest" exists
    if (!existingSlugs.has("nest")) {
      await supabase.from("wings").insert({ user_id: user.id, slug: "nest", accent_color: "#7AA0C8", sort_order: 1 });
    }
    return;
  }

  // Rename old slugs
  for (const wing of wings) {
    const newSlug = slugMap[wing.slug];
    if (newSlug && !existingSlugs.has(newSlug)) {
      await supabase.from("wings").update({ slug: newSlug }).eq("id", wing.id);
      existingSlugs.add(newSlug);
    } else if (newSlug && existingSlugs.has(newSlug) && wing.slug !== newSlug) {
      // Merge: move memories from old wing to the already-renamed wing, then delete old
      const targetWing = wings.find(w => w.slug === newSlug) || wings.find(w => slugMap[w.slug] === newSlug && w.id !== wing.id);
      if (targetWing) {
        await supabase.from("memories").update({ wing_id: targetWing.id }).eq("wing_id", wing.id);
        await supabase.from("wings").delete().eq("id", wing.id);
      }
    }
  }

  // Create "nest" wing if missing
  if (!existingSlugs.has("nest")) {
    await supabase.from("wings").insert({ user_id: user.id, slug: "nest", accent_color: "#7AA0C8", sort_order: 1 });
  }

  // Update sort order
  const sortOrder: Record<string, number> = { roots: 0, nest: 1, craft: 2, travel: 3, passions: 4 };
  const { data: updatedWings } = await supabase.from("wings").select("id, slug").eq("user_id", user.id);
  if (updatedWings) {
    for (const w of updatedWings) {
      if (sortOrder[w.slug] !== undefined) {
        await supabase.from("wings").update({ sort_order: sortOrder[w.slug] }).eq("id", w.id);
      }
    }
  }
}

export async function getProfile() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ? { ...profile, email: user.email } : null;
}

export async function updateProfile(data: {
  displayName?: string;
  goal?: string;
  bio?: string;
  avatarUrl?: string;
  styleEra?: string;
  bustTextureUrl?: string;
  bustModelUrl?: string;
  bustName?: string;
  bustGender?: string;
  bustPedestals?: Record<number, { faceUrl: string; name: string; gender: string }>;
  aiConsent?: boolean;
  aiBiometricConsent?: boolean;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { success: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    { const t = await serverError(); return { error: t("notAuthenticated") }; }
  }

  const updates: Record<string, unknown> = {};
  if (data.displayName !== undefined) updates.display_name = data.displayName;
  if (data.goal !== undefined) updates.goal = data.goal;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;
  if (data.styleEra !== undefined) updates.style_era = data.styleEra;
  if (data.bustTextureUrl !== undefined) updates.bust_texture_url = data.bustTextureUrl;
  if (data.bustModelUrl !== undefined) updates.bust_model_url = data.bustModelUrl;
  if (data.bustName !== undefined) updates.bust_name = data.bustName;
  if (data.bustGender !== undefined) updates.bust_gender = data.bustGender;
  if (data.bustPedestals !== undefined) updates.bust_pedestals = JSON.stringify(data.bustPedestals);
  if (data.aiConsent !== undefined) updates.ai_consent = data.aiConsent;
  if (data.aiBiometricConsent !== undefined) updates.ai_biometric_consent = data.aiBiometricConsent;

  if (Object.keys(updates).length === 0) {
    { const t = await serverError(); return { error: t("noFieldsToUpdate") }; }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function requestPasswordReset() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { success: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    { const t = await serverError(); return { error: t("notAuthenticated") }; }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAccount() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { success: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    { const t = await serverError(); return { error: t("notAuthenticated") }; }
  }

  // 0. Revoke OAuth tokens for all connected accounts (best-effort)
  try {
    const { data: connectedAccounts } = await supabase
      .from("connected_accounts")
      .select("provider, access_token")
      .eq("user_id", user.id);

    if (connectedAccounts && connectedAccounts.length > 0) {
      await Promise.allSettled(
        connectedAccounts.map((account) =>
          revokeProviderToken(account.provider, account.access_token)
        )
      );
    }
  } catch (err) {
    console.warn("Failed to revoke OAuth tokens during account deletion:", err);
  }

  // 1. Delete the profile row (cascades to wings, rooms, memories, etc.)
  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // 2. Delete user's storage files from Supabase Storage (legacy)
  try {
    const { data: files } = await supabase.storage
      .from("memories")
      .list(user.id);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("memories").remove(paths);
    }
  } catch {
    // Storage cleanup is best-effort; profile data is already deleted
  }

  // 2b. Delete user's bust storage files from Supabase Storage (legacy)
  try {
    const { data: bustFiles } = await supabase.storage
      .from("busts")
      .list(user.id);

    if (bustFiles && bustFiles.length > 0) {
      const bustPaths = bustFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("busts").remove(bustPaths);
    }
  } catch {
    // Storage cleanup is best-effort
  }

  // 2c. Delete user's files from R2 (new storage backend)
  if (isR2Configured()) {
    try {
      const r2Memories = await r2List("memories", `${user.id}/`);
      if (r2Memories.length > 0) {
        await r2Remove("memories", r2Memories.map((f) => f.name));
      }
      const r2Busts = await r2List("busts", `${user.id}/`);
      if (r2Busts.length > 0) {
        await r2Remove("busts", r2Busts.map((f) => f.name));
      }
    } catch {
      // Storage cleanup is best-effort
    }
  }

  // 3. Delete auth.users record using admin client (requires service role key)
  try {
    const adminClient = createAdminClient();
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
      user.id
    );
    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError.message);
      // Profile data is already deleted via cascade, so we proceed with sign-out
    }
  } catch (err) {
    console.error("Admin client error during account deletion:", err);
  }

  // 4. Sign out the current session
  await supabase.auth.signOut();
  return { success: true, redirect: "/login" };
}
