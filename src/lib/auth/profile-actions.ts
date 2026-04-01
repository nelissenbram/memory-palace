"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

const DEFAULT_WINGS = [
  { slug: "family", accent_color: "#C17F59" },
  { slug: "travel", accent_color: "#4A6741" },
  { slug: "childhood", accent_color: "#B8926A" },
  { slug: "career", accent_color: "#8B7355" },
  { slug: "creativity", accent_color: "#9B6B8E" },
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
    return { error: "Not authenticated" };
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: data.displayName,
      goal: data.goal,
      first_wing: data.firstWing,
      style_era: data.styleEra || "roman",
      onboarded: true,
    })
    .eq("id", user.id);

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
    return { error: "Not authenticated" };
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
    return { error: "No fields to update" };
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
    return { error: "Not authenticated" };
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
    return { error: "Not authenticated" };
  }

  // 1. Delete the profile row (cascades to wings, rooms, memories, etc.)
  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // 2. Delete user's storage files (uploaded memories/media)
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

  // 2b. Delete user's bust storage files
  try {
    const { data: bustFiles } = await supabase.storage
      .from("busts")
      .list(user.id);

    if (bustFiles && bustFiles.length > 0) {
      const bustPaths = bustFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("busts").remove(bustPaths);
    }
  } catch {
    // Storage cleanup is best-effort; profile data is already deleted
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
