"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendResetEmail } from "@/lib/email/send-reset";

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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

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
  const rawEmail = formData.get("email");
  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { error: "Email is required." };
  }

  const email = rawEmail.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  // Use admin client to generate reset link without sending Supabase's default email
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    },
  });

  if (error) {
    // Don't reveal whether email exists — always show success
    console.error("generateLink error:", error.message);
    return { success: true };
  }

  // Extract the hashed_token and build the verification URL
  // Supabase generateLink returns properties.action_link with the full link
  const actionLink = data.properties?.action_link;
  if (actionLink) {
    // Send branded email via Resend
    const result = await sendResetEmail({
      recipientEmail: email,
      resetLink: actionLink,
    });
    if (!result.success) {
      console.error("Reset email send error:", result.error);
    }
  }

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const rawPassword = formData.get("password");
  if (typeof rawPassword !== "string" || !rawPassword) {
    return { error: "Password is required." };
  }

  const password = rawPassword;
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/palace");
}
