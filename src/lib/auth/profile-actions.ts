"use server";

import { createClient } from "@/lib/supabase/server";

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

  return profile;
}
