import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/auth/callback", "/invite"];

export async function middleware(request: NextRequest) {
  // Skip Supabase session refresh if env vars aren't configured yet
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  // Refresh the session first
  const response = await updateSession(request);

  // Check auth state for route protection
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // TEMPORARY: Force cache bust — redirect to /clear.html once per session
  if (path === "/palace" && !request.nextUrl.searchParams.has("cb")) {
    return NextResponse.redirect(new URL("/clear.html", request.url));
  }

  const isPublicRoute = PUBLIC_ROUTES.some((r) => path.startsWith(r));

  // Authenticated user on public route or landing → redirect to palace
  // Exception: invite pages should be accessible to authenticated users (they need to accept)
  const isInvitePage = path.startsWith("/invite");
  if (user && (isPublicRoute || path === "/") && !isInvitePage) {
    return NextResponse.redirect(new URL("/palace", request.url));
  }

  // Unauthenticated user on protected route → redirect to login
  if (!user && !isPublicRoute && path !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|fallback-.*\\.js|manifest\\.json|clear\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
