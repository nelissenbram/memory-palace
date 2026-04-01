import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/auth/callback", "/invite", "/public", "/legacy", "/api/stripe/webhook", "/api/cron/", "/api/email/", "/api/notifications/send"];

/** Check if path matches a public route (exact prefix boundary match) */
function isPublicPath(path: string): boolean {
  return PUBLIC_ROUTES.some((r) =>
    path === r || path.startsWith(r + "/") || (r.endsWith("/") && path.startsWith(r))
  );
}

export async function middleware(request: NextRequest) {
  // Fail closed: if Supabase env vars missing, only allow public routes + static assets
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const path = request.nextUrl.pathname;
    if (isPublicPath(path) || path === "/") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Refresh the session and get auth state in a single getUser() call
  const { response, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isPublicRoute = isPublicPath(path);

  // Authenticated user on public route or landing → redirect to palace
  // Exception: invite pages and public share pages should be accessible to authenticated users
  const isInvitePage = path.startsWith("/invite");
  const isPublicSharePage = path.startsWith("/public");
  const isLegacyPage = path.startsWith("/legacy");
  if (user && (isPublicRoute || path === "/") && !isInvitePage && !isPublicSharePage && !isLegacyPage) {
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
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|fallback-.*\\.js|manifest\\.json|clear\\.html|models/|draco/|textures/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|wasm|hdr)$).*)",
  ],
};
