"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendResetEmail } from "@/lib/email/send-reset";
import { serverError } from "@/lib/i18n/server-errors";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const t = await serverError();

  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { error: t("emailRequired") };
  }
  if (typeof rawPassword !== "string" || !rawPassword) {
    return { error: t("passwordRequired") };
  }

  const email = rawEmail.trim();
  const password = rawPassword;

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: t("invalidEmail") };
  }

  if (password.length < 8) {
    return { error: t("passwordTooShort") };
  }

  const displayName = (formData.get("displayName") as string) || "";
  const redirectTo = formData.get("redirect") as string | null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const baseCallbackUrl = `${siteUrl}/auth/callback`;
  const callbackUrl = redirectTo && (redirectTo.startsWith("/invite/") || redirectTo.startsWith("/kep/"))
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
  const t = await serverError();

  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { error: t("emailRequired") };
  }
  if (typeof rawPassword !== "string" || !rawPassword) {
    return { error: t("passwordRequired") };
  }

  const email = rawEmail.trim();
  const password = rawPassword;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: t("invalidEmail") };
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

  // No MFA needed — return success so client can redirect
  if (redirectTo && (redirectTo.startsWith("/invite/") || redirectTo.startsWith("/kep/"))) {
    return { success: true, redirect: redirectTo };
  }

  return { success: true, redirect: "/atrium" };
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
  const t = await serverError();
  const rawEmail = formData.get("email");
  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { error: t("emailRequired") };
  }

  const email = rawEmail.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: t("invalidEmail") };
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
    // Look up user's preferred locale for email i18n
    let locale: string | undefined;
    try {
      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await admin.from("profiles")
          .select("preferred_locale")
          .eq("id", userId)
          .single<{ preferred_locale: string | null }>();
        locale = profile?.preferred_locale || undefined;
      }
    } catch { /* non-critical — fall back to English */ }

    // Send branded email via Resend
    const result = await sendResetEmail({
      recipientEmail: email,
      resetLink: actionLink,
      locale,
    });
    if (!result.success) {
      console.error("Reset email send error:", result.error);
    }
  }

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const t = await serverError();

  const rawPassword = formData.get("password");
  if (typeof rawPassword !== "string" || !rawPassword) {
    return { error: t("passwordRequired") };
  }

  const password = rawPassword;
  if (password.length < 8) {
    return { error: t("passwordTooShort") };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/atrium");
}
