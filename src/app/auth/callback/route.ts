import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { autoMatchInvites } from "@/lib/auth/invite-actions";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

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
          return NextResponse.redirect(`${origin}/reset-password`);
        }

        // Ensure a profile row exists (defense-in-depth for OAuth sign-ups)
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "";
        await ensureProfile(user.id, displayName);

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded, preferred_locale")
          .eq("id", user.id)
          .single<{ onboarded: boolean; preferred_locale: string | null }>();

        // Send welcome email for new users (not yet onboarded)
        if (!profile?.onboarded && user.email) {
          // Fire-and-forget: don't block the redirect
          sendWelcomeEmail({
            recipientEmail: user.email,
            displayName,
            locale: profile?.preferred_locale || undefined,
          }).catch((e) => {
            console.error("Welcome email error:", e);
          });
        }

        return NextResponse.redirect(`${origin}/palace`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
