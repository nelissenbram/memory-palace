import { redirect } from "next/navigation";
import { createClient, createAdminOrAnonClient } from "@/lib/supabase/server";
import { isIOSRequest } from "@/lib/auth/plan-limits";
import MeClient from "./MeClient";

/**
 * /me — identity-first landing for the "Me" tab (Explore/Me revision, change 15).
 * Server-rendered: portrait + name + three stewardship stats + two actions +
 * quiet doors to the settings sub-pages (which remain the canonical deep links).
 */

export const dynamic = "force-dynamic";

export default async function MePage() {
  // Supabase not configured (local shell builds) — render the empty client shell.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <MeClient
        profile={{ displayName: null, username: null, bio: null, avatarUrl: null, isPublic: false, email: null }}
        stats={{ wings: 0, memories: 0, visitors: 0 }}
        isNativeIOS={await isIOSRequest()}
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Visitors uses the admin client (palace_visits rows belong to the visitor
  // under RLS) — scoped strictly to the authed keeper's own owner_id. On
  // Preview deploys (no service key) this degrades to a count of 0.
  const admin = createAdminOrAnonClient();

  const [profileRes, wingsRes, memoriesRes, visitorsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_url, is_public")
      .eq("id", user.id)
      .single(),
    supabase.from("wings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("memories").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("palace_visits").select("owner_id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);

  const p = profileRes.data;

  return (
    <MeClient
      profile={{
        displayName: p?.display_name || null,
        username: p?.username || null,
        bio: p?.bio || null,
        avatarUrl: p?.avatar_url || null,
        isPublic: !!p?.is_public,
        email: user.email || null,
      }}
      stats={{
        wings: wingsRes.count ?? 0,
        memories: memoriesRes.count ?? 0,
        visitors: visitorsRes.count ?? 0,
      }}
      isNativeIOS={await isIOSRequest()}
    />
  );
}
