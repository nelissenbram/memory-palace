"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  // Enforce the age attestation server-side (the client checkbox merely gates
  // the button). Reject when the confirmation is absent/false so the
  // attestation cannot be bypassed by scripting the form. Uses the generic
  // localized message — this path is only reachable by a bypassed client, and a
  // dedicated key would require adding to server-errors.ts (out of scope here).
  if (formData.get("ageConfirmed") !== "true") {
    return { error: t("somethingWentWrong") };
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
    // Never hand a raw, unlocalized, provider-worded Supabase string to the UI.
    // Collapse every sign-in failure (bad credentials, unconfirmed email,
    // rate-limit, etc.) to the generic localized message so the copy stays in
    // the user's language and does not leak provider internals. (Granular
    // per-code copy would need new localized keys in server-errors.ts.)
    console.error("[auth] signIn error:", (error as { code?: string }).code ?? error.status, error.message);
    return { error: t("somethingWentWrong") };
  }

  // Check if MFA is required (AAL1 achieved but AAL2 needed)
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    aalData &&
    aalData.currentLevel === "aal1" &&
    aalData.nextLevel === "aal2"
  ) {
    // User has MFA enrolled — return factor info so the client can prompt.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0] ?? factors?.phone?.[0];
    if (factor) {
      return {
        mfaRequired: true,
        factorId: factor.id,
        redirect: redirectTo,
      };
    }
    // MFA is required but no usable factor was returned (e.g. a flaky listFactors
    // call). Fail CLOSED — never fall through to success and hand out a live AAL1
    // session that skips the second factor. Tear the partial session down and ask
    // the user to retry.
    await supabase.auth.signOut({ scope: "local" });
    return { error: t("mfaUnavailable") };
  }

  // No MFA needed — return success so client can redirect
  if (redirectTo && (redirectTo.startsWith("/invite/") || redirectTo.startsWith("/kep/"))) {
    return { success: true, redirect: redirectTo };
  }

  return { success: true, redirect: "/atrium" };
}

export async function signOut() {
  const store = await cookies();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      // Best-effort server-side revoke, but time-boxed: a hung POST /logout must
      // never outlast useSignOut's fallback nor block the authoritative cookie
      // clear below. scope:"local" = per-device semantics (don't kill the user's
      // other sessions on a routine sign-out).
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    } catch {
      // fall through — the explicit cookie purge below is what actually logs out
    }
  }
  // LOAD-BEARING (Apple S2 fix): expire EVERY Supabase auth cookie regardless of
  // the revoke outcome. auth-js does the network logout first and, on a retryable
  // network error, returns before removing the session — leaving sb-* cookies live
  // so middleware treats the next visit as authenticated ("auto-logged-in"). This
  // loop guarantees the session is gone. Covers chunked sb-<ref>-auth-token.0/.1
  // and the PKCE code-verifier; preserves mp_platform / mp_locale.
  for (const c of store.getAll()) {
    if (c.name.startsWith("sb-")) {
      store.set(c.name, "", { maxAge: 0, path: "/" });
    }
  }
  return { success: true };
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
