import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Service-role client — bypasses RLS. Only use in server actions / API routes. */
export function createAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "public" },
    }
  );
}

/** True when the service-role key is configured (Production; Preview deploys don't carry it). */
export function hasServiceRoleKey(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Admin client when the service-role key exists, else an anon-key client with
 * no cookie binding (safe inside unstable_cache). On Preview deploys — where
 * SUPABASE_SERVICE_ROLE_KEY is absent — createAdminClient() would THROW at
 * construction ("supabaseKey is required"); this degrades to RLS-visible data
 * instead of crashing the whole server render.
 */
export function createAdminOrAnonClient() {
  if (hasServiceRoleKey()) return createAdminClient();
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "public" },
    }
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies can't be set. This is safe to ignore if middleware
            // refreshes the session.
          }
        },
      },
    }
  );
}
