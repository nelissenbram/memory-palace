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

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const type = searchParams.get("type") || "user"; // "user" | "verifier"

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // ── Rate limiting: 10 req/min per IP ──
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const { success: rateLimitOk } = rateLimit(`legacy-verify:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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

  // ── Atomic verify: single UPDATE … WHERE token = X AND not expired ──
  // This eliminates the TOCTOU race where a concurrent request could also
  // succeed between a SELECT and a separate UPDATE.
  const now = new Date().toISOString();

  if (type === "verifier") {
    // Verifier flow: atomically claim token + clear verification state.
    // Does NOT reset last_seen_at — the user themselves must log in.
    // Only allow cancellation if delivery hasn't already started.
    const { data: updated, error: updateError } = await supabase
      .from("legacy_settings")
      .update({
        verifier_confirmed_at: now,
        verifier_confirmation_token: null,
        verification_sent_at: null,
        verification_token: null,
        verification_expires_at: null,
        status: "active",
      })
      .eq("verifier_confirmation_token", token)
      .gt("verification_expires_at", now)
      .not("status", "in", "(delivering,transferred,partially_delivered)")
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      // Check if the token exists but is expired (for a distinct message)
      const { data: expired } = await supabase
        .from("legacy_settings")
        .select("id")
        .eq("verifier_confirmation_token", token)
        .lte("verification_expires_at", now)
        .maybeSingle();

      if (expired) {
        return NextResponse.redirect(`${siteUrl}/legacy/verified?status=expired`);
      }

      // Check if token was valid but delivery already started
      const { data: inProgress } = await supabase
        .from("legacy_settings")
        .select("id, status")
        .eq("verifier_confirmation_token", token)
        .gt("verification_expires_at", now)
        .in("status", ["delivering", "transferred", "partially_delivered"])
        .maybeSingle();

      if (inProgress) {
        return NextResponse.redirect(`${siteUrl}/legacy/verified?status=too_late`);
      }

      return NextResponse.redirect(`${siteUrl}/legacy/verified?status=invalid`);
    }

    return NextResponse.redirect(`${siteUrl}/legacy/verified`);
  }

  // ── User flow (default): atomically claim token + reset to active ──
  const { data: updated, error: updateError } = await supabase
    .from("legacy_settings")
    .update({
      verification_sent_at: null,
      verification_token: null,
      verification_expires_at: null,
      verifier_confirmation_token: null,
      verifier_confirmed_at: null,
      status: "active",
    })
    .eq("verification_token", token)
    .gt("verification_expires_at", now)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    // Check if expired
    const { data: expired } = await supabase
      .from("legacy_settings")
      .select("id")
      .eq("verification_token", token)
      .lte("verification_expires_at", now)
      .maybeSingle();

    if (expired) {
      return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=expired`);
    }
    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=invalid`);
  }

  // Update last_seen_at on the profile (best-effort, don't break the flow)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ last_seen_at: now })
    .eq("id", updated.id);

  if (profileError) {
    console.error("[legacy/verify] Failed to update last_seen_at for profile:", updated.id, profileError);
  }

  // Redirect to palace with success indicator
  return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=confirmed`);
}
