import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * /kep is a documented external marketing/store URL (see store-assets/STORE_VISUALS_GUIDE.md)
 * and is whitelisted as a PUBLIC route in middleware. The Kep landing content itself now lives
 * inside the authenticated app at /palace/keps, which is a PROTECTED route.
 *
 * If this stub blindly redirect()s everyone to /palace/keps, a LOGGED-OUT prospect who clicks
 * the marketing link gets bounced straight to /login by middleware (and the (app) layout) — the
 * acquisition funnel dead-ends at an auth wall instead of the pitch.
 *
 * So resolve the session server-side: authenticated users go to the real Kep experience; everyone
 * else is funneled into registration (carrying redirect=/kep so they land back here afterward)
 * rather than a bare login wall.
 */
export default async function KepRedirect() {
  // If Supabase isn't configured, fail closed toward the acquisition funnel (register),
  // never toward the protected /palace/keps route.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/register?redirect=/kep");
  }

  const supabase = await createClient();
  const user = await supabase.auth
    .getUser()
    .then((r) => r.data.user ?? null)
    .catch(() => null);

  redirect(user ? "/palace/keps" : "/register?redirect=/kep");
}
