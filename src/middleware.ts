import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { IAP_ENABLED } from "@/lib/native/iap-flags";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback", "/invite", "/kep", "/public", "/legacy", "/security", "/privacy", "/terms", "/help", "/pricing", "/blog", "/api/stripe/webhook", "/api/webhooks/", "/api/cron/", "/api/admin/", "/api/email/", "/api/notifications/send", "/api/legacy/", "/api/report", "/video", "/test-palazzo", "/explore", "/u", "/visit", "/api/og"];

/** Check if path matches a public route (exact prefix boundary match) */
function isPublicPath(path: string): boolean {
  return PUBLIC_ROUTES.some((r) =>
    path === r || path.startsWith(r + "/") || (r.endsWith("/") && path.startsWith(r))
  );
}

/**
 * Build a redirect that carries over the auth cookies updateSession() rotated onto
 * `res`. A bare NextResponse.redirect drops those refreshed tokens, so the next
 * request presents a stale refresh token → spontaneous logout and /login⇄/atrium
 * ping-pong. Copy them so the redirect commits the rotation. (Ships together with
 * the signOut cookie-clear — never alone, or it would strengthen an un-cleared
 * session.)
 */
function redirectWith(path: string, request: NextRequest, res: NextResponse): NextResponse {
  const r = NextResponse.redirect(new URL(path, request.url));
  res.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Anti-steering (Apple Guideline 3.1.1): while IAP is disabled, iOS is free-tier
  // and the /pricing page must never render in the WKWebView — redirect at the edge
  // (before the client guard) so there's no one-frame flash. When IAP is enabled,
  // /pricing is the IAP paywall (IAP-only, no Stripe), so iOS is allowed through.
  const isNativeIOS =
    request.cookies.get("mp_platform")?.value === "ios" ||
    (request.headers.get("user-agent") || "").includes("MemoryPalace-iOS");
  if (isNativeIOS && !IAP_ENABLED && path.startsWith("/pricing")) {
    return NextResponse.redirect(new URL("/atrium", request.url));
  }

  // Fast-path: skip auth entirely for public/static routes that never need session
  if (
    path === "/" ||
    path.startsWith("/.well-known/") ||
    path.startsWith("/video/") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/apple/webhook") ||
    // /api/media/ fully authenticates + authorizes itself (route.ts calls
    // supabase.auth.getUser() plus ownership/share/published-wing checks), so the
    // middleware's updateSession()->getUser() here is pure duplicate cost. A 3D room
    // render fans out one /api/media/ request per thumbnail + full asset, so skipping
    // the middleware Auth round-trip here removes one GoTrue round-trip per image with
    // zero security loss.
    path.startsWith("/api/media/") ||
    // Note: /api/admin/ is NOT fast-pathed — it needs session refresh for admin auth fallback
    path.startsWith("/api/email/") ||
    path.startsWith("/api/legacy/") ||
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
  const { response, user, mfaPending } = await updateSession(request);

  const isPublicRoute = isPublicPath(path);

  // Server-side AAL2 enforcement: a session that has MFA enrolled but has only
  // reached AAL1 (second factor not yet verified) is NOT fully authenticated.
  // Treat it as such for protected routes so a scripted client that ignores the
  // client-side mfaRequired prompt cannot reach protected pages/APIs with a bare
  // AAL1 session. The user is still allowed onto public routes (notably /login,
  // where the MFA challenge is completed) so they can finish stepping up.
  const fullyAuthed = !!user && !mfaPending;

  // Authenticated user on public route or landing → redirect to atrium
  // Exception: invite pages and public share pages should be accessible to authenticated users
  const isInvitePage = path.startsWith("/invite");
  const isKepPage = path.startsWith("/kep");
  const isPublicSharePage = path.startsWith("/public");
  const isLegacyPage = path.startsWith("/legacy");
  const isResetPasswordPage = path.startsWith("/reset-password");
  const isApiRoute = path.startsWith("/api/");
  const isPricingPage = path.startsWith("/pricing");
  const isLegalPage = path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/security") || path.startsWith("/help");
  const isBlogPage = path.startsWith("/blog");
  const isSocialPage = path.startsWith("/explore") || path.startsWith("/u/") || path.startsWith("/visit/");
  if (fullyAuthed && (isPublicRoute || path === "/") && !isInvitePage && !isKepPage && !isPublicSharePage && !isLegacyPage && !isResetPasswordPage && !isApiRoute && !isPricingPage && !isLegalPage && !isBlogPage && !isSocialPage) {
    return redirectWith("/atrium", request, response);
  }

  // Unauthenticated user on protected route → redirect to login.
  // A session that is authenticated but MFA-pending (AAL1 with AAL2 required) is
  // NOT fully authenticated: send it to /login?mfa so the second factor is
  // completed before any protected page or API renders.
  if (!fullyAuthed && !isPublicRoute && path !== "/") {
    const target = user && mfaPending ? "/login?mfa=1" : "/login";
    return redirectWith(target, request, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|fallback-.*\\.js|manifest\\.json|clear\\.html|models/|draco/|textures/|video/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|wasm|hdr)$).*)",
  ],
};
