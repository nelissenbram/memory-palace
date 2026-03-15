import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoMatchInvites } from "@/lib/auth/invite-actions";

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
          .select("onboarded")
          .eq("id", user.id)
          .single<{ onboarded: boolean }>();

        if (profile?.onboarded) {
          return NextResponse.redirect(`${origin}/palace`);
        }
        return NextResponse.redirect(`${origin}/palace`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
