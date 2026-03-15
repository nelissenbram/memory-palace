"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
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

  // If there's a pending invite redirect, go there instead of /palace
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
