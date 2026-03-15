"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { error: "Email is required." };
  }
  if (typeof rawPassword !== "string" || !rawPassword) {
    return { error: "Password is required." };
  }

  const email = rawEmail.trim();
  const password = rawPassword;

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const displayName = (formData.get("displayName") as string) || "";
  const redirectTo = formData.get("redirect") as string | null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const baseCallbackUrl = `${siteUrl}/auth/callback`;
  const callbackUrl = redirectTo && redirectTo.startsWith("/invite/")
    ? `${baseCallbackUrl}?redirect=${encodeURIComponent(redirectTo)}`
    : baseCallbackUrl;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirect") as string | null;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Check if MFA is required (AAL1 achieved but AAL2 needed)
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    aalData &&
    aalData.currentLevel === "aal1" &&
    aalData.nextLevel === "aal2"
  ) {
    // User has MFA enrolled — return factor info so the client can prompt
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];
    if (totpFactor) {
      return {
        mfaRequired: true,
        factorId: totpFactor.id,
        redirect: redirectTo,
      };
    }
  }

  // No MFA needed — redirect as usual
  if (redirectTo && redirectTo.startsWith("/invite/")) {
    redirect(redirectTo);
  }

  redirect("/palace");
}

export async function signOut() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")}/auth/callback`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
