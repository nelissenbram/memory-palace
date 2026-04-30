import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback", "/invite", "/kep", "/public", "/legacy", "/security", "/privacy", "/terms", "/pricing", "/api/stripe/webhook", "/api/webhooks/", "/api/cron/", "/api/admin/", "/api/email/", "/api/notifications/send", "/video", "/test-palazzo"];

/** Check if path matches a public route (exact prefix boundary match) */
function isPublicPath(path: string): boolean {
  return PUBLIC_ROUTES.some((r) =>
    path === r || path.startsWith(r + "/") || (r.endsWith("/") && path.startsWith(r))
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast-path: skip auth entirely for public/static routes that never need session
  if (
    path === "/" ||
    path.startsWith("/video/") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/email/") ||
    path.startsWith("/api/notifications/send")
  ) {
    return NextResponse.next();
  }

  // Fail closed: if Supabase env vars missing, only allow public routes + static assets
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (isPublicPath(path) || path === "/") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Refresh the session and get auth state in a single getUser() call
  const { response, user } = await updateSession(request);

  const isPublicRoute = isPublicPath(path);

  // Authenticated user on public route or landing → redirect to atrium
  // Exception: invite pages and public share pages should be accessible to authenticated users
  const isInvitePage = path.startsWith("/invite");
  const isKepPage = path.startsWith("/kep");
  const isPublicSharePage = path.startsWith("/public");
  const isLegacyPage = path.startsWith("/legacy");
  const isResetPasswordPage = path.startsWith("/reset-password");
  const isApiRoute = path.startsWith("/api/");
  const isPricingPage = path.startsWith("/pricing");
  const isLegalPage = path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/security");
  if (user && (isPublicRoute || path === "/") && !isInvitePage && !isKepPage && !isPublicSharePage && !isLegacyPage && !isResetPasswordPage && !isApiRoute && !isPricingPage && !isLegalPage) {
    return NextResponse.redirect(new URL("/atrium", request.url));
  }

  // Unauthenticated user on protected route → redirect to login
  if (!user && !isPublicRoute && path !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|fallback-.*\\.js|manifest\\.json|clear\\.html|models/|draco/|textures/|video/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|wasm|hdr)$).*)",
  ],
};
