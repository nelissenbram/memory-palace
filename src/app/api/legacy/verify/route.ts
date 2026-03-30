import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/legacy/verify?token=xxx&type=user|verifier
 *
 * Public endpoint clicked from verification emails.
 *
 * - type=user (default): Resets last_seen_at, clears verification state,
 *   sets status='active'. Redirects to the palace.
 * - type=verifier: Sets verifier_confirmed_at = now() AND clears verification
 *   state (verification_sent_at, tokens, etc.) to prevent delivery. Does NOT
 *   reset last_seen_at (the user themselves must still be alive to do that).
 *
 * Token expiry: if verification_expires_at < now(), the link is invalid.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const type = searchParams.get("type") || "user"; // "user" | "verifier"

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // ── Rate limiting: 10 req/min per IP ──
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const { success: rateLimitOk } = rateLimit(`legacy-verify:${ip}`, 10, 60_000);
  if (!rateLimitOk) {
    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=rate_limited`);
  }

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=invalid`);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=error`);
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── Resolve token based on type ──
  const tokenColumn = type === "verifier" ? "verifier_confirmation_token" : "verification_token";

  const { data: settings, error: findError } = await supabase
    .from("legacy_settings")
    .select("id, verification_token, verifier_confirmation_token, verification_expires_at")
    .eq(tokenColumn, token)
    .single();

  if (findError || !settings) {
    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=invalid`);
  }

  // ── Check token expiry ──
  if (settings.verification_expires_at) {
    const expiresAt = new Date(settings.verification_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=invalid`);
    }
  }

  const userId = settings.id;
  const now = new Date().toISOString();

  if (type === "verifier") {
    // Verifier flow: record confirmation AND clear verification state to
    // prevent the cron from delivering. Does NOT reset last_seen_at — the
    // user themselves must log in to prove they're alive long-term.
    await supabase
      .from("legacy_settings")
      .update({
        verifier_confirmed_at: now,
        verifier_confirmation_token: null,
        verification_sent_at: null,
        verification_token: null,
        verification_expires_at: null,
        status: "active",
      })
      .eq("id", userId);

    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=verifier_confirmed`);
  }

  // ── User flow (default): reset inactivity, mark active ──
  await supabase
    .from("legacy_settings")
    .update({
      verification_sent_at: null,
      verification_token: null,
      verification_expires_at: null,
      verifier_confirmation_token: null,
      verifier_confirmed_at: null,
      status: "active",
    })
    .eq("id", userId);

  // Update last_seen_at on the profile
  await supabase
    .from("profiles")
    .update({ last_seen_at: now })
    .eq("id", userId);

  // Redirect to palace with success indicator
  return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=confirmed`);
}
