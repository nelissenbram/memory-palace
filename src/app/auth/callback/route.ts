import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { autoMatchInvites } from "@/lib/auth/invite-actions";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { captureServer, detectRequestPlatform } from "@/lib/analytics-server";

// The OAuth landing must never be cached at any layer (SW/CDN/browser) — a
// cached copy is what left users on a stale /atrium after Apple sign-in.
export const dynamic = "force-dynamic";

/**
 * Ensure a profiles row exists for this user.
 * The DB trigger `handle_new_user` on auth.users should create it,
 * but OAuth sign-ups can race or the trigger may be missing/broken.
 * Uses the admin (service-role) client to bypass RLS.
 */
async function ensureProfile(userId: string, displayName: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").upsert(
      { id: userId, display_name: displayName },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (error) {
      console.error("ensureProfile upsert error:", error);
    }
  } catch (e) {
    console.error("ensureProfile unexpected error:", e);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Detect password recovery flow — redirect to set new password
        // Supabase sets this in user_metadata or the session type after recovery
        const isRecovery =
          searchParams.get("type") === "recovery" ||
          user.user_metadata?.recovery === true;
        if (isRecovery) {
          // Forward the recovery flag so the reset-password page's
          // urlIsRecovery gate fires. Admin-generated recovery sessions do NOT
          // reliably stamp an amr:'recovery' claim, so without this a valid link
          // would fall through to the "expired or invalid" screen.
          return NextResponse.redirect(`${origin}/reset-password?type=recovery`);
        }

        // Ensure a profile row exists (defense-in-depth for OAuth sign-ups)
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "";
        await ensureProfile(user.id, displayName);

        // Server-side signup count for OAuth users. Email signups are already
        // captured in the signUp action (this callback also handles their email
        // confirmation, so skip provider "email" to avoid double counting). The
        // created_at window separates a first OAuth sign-in from later logins.
        const provider = user.app_metadata?.provider;
        const isNewUser =
          Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000;
        if (provider && provider !== "email" && isNewUser) {
          // OPS-010: platform + signup_method props for the signup funnel.
          const platform = await detectRequestPlatform();
          await captureServer(user.id, "user_signed_up", {
            method: "oauth",
            provider,
            signup_method: provider,
            ...(platform ? { platform } : {}),
            // Person-property zodat de owner in PostHog namen ziet i.p.v. kale
            // uids (owner-keuze 2026-09-05, LEG-012: display_name, geen e-mail).
            ...(displayName ? { $set: { name: displayName } } : {}),
          });
        }

        // Auto-match any pending invites for this user's email
        if (user.email) {
          try {
            await autoMatchInvites(user.id, user.email);
          } catch (e) {
            console.error("Auto-match invites error:", e);
          }
        }

        // If there's a pending redirect (e.g., from invite flow), go there
        if (redirectTo && redirectTo.startsWith("/invite/")) {
          return NextResponse.redirect(`${origin}${redirectTo}`);
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("onboarded, preferred_locale, welcome_email_sent_at")
          .eq("id", user.id)
          .single<{ onboarded: boolean; preferred_locale: string | null; welcome_email_sent_at: string | null }>();

        // Send the welcome email EXACTLY ONCE per account, gated on an idempotent
        // marker — never on the onboarded flag (which re-fires on every not-yet-
        // onboarded login) and never on a profile READ FAILURE (profile null →
        // the old `!profile?.onboarded` was true, spamming the email).
        if (!profileErr && profile && profile.onboarded === false && !profile.welcome_email_sent_at && user.email) {
          // Mark first (best-effort) so a double auth callback can't double-send.
          supabase.from("profiles").update({ welcome_email_sent_at: new Date().toISOString() } as never).eq("id", user.id).then(() => {}, () => {});
          // Fire-and-forget: don't block the redirect
          sendWelcomeEmail({
            recipientEmail: user.email,
            displayName,
            locale: profile?.preferred_locale || undefined,
          }).catch((e) => {
            console.error("Welcome email error:", e);
          });
        }

        // Always land on the Atrium (the app's home), matching email/password
        // login. First-time users still get onboarding — MemoryPalace gates that
        // on !onboarded, not the URL — so /atrium is correct for new and returning
        // users alike. (Previously /palace, which is why social/email-confirm
        // logins intermittently dropped users into the 3D palace instead.)
        const res = NextResponse.redirect(`${origin}/atrium`);
        res.headers.set("Cache-Control", "no-store, must-revalidate");
        return res;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
