import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null; mfaPending: boolean }> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token with a timeout to prevent 504 GATEWAY_TIMEOUT
  let user: User | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 4000)
      ),
    ]);
    user = result.data.user;
  } catch {
    // On timeout or error, treat as unauthenticated rather than 504
  }

  // Server-side MFA (AAL2) enforcement. signInWithPassword() mints a live AAL1
  // session BEFORE the second factor is verified; a scripted client that ignores
  // the mfaRequired hint would otherwise hold a valid session cookie and reach
  // every protected page. When the user has MFA enrolled (nextLevel === "aal2")
  // but has only reached "aal1", we flag the session as MFA-pending so the caller
  // treats it as NOT fully authenticated. AAL is derived from the (already
  // verified) getUser JWT, so this adds no extra round-trip cost on the hot path.
  let mfaPending = false;
  if (user) {
    try {
      const { data: aal } = await Promise.race([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AAL timeout")), 4000)
        ),
      ]);
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        mfaPending = true;
      }
    } catch {
      // Fail closed: if we cannot determine the AAL for an authenticated user,
      // do NOT treat the session as fully authenticated — force re-auth rather
      // than silently grant AAL2-gated access.
      mfaPending = true;
    }
  }

  return { response: supabaseResponse, user, mfaPending };
}
