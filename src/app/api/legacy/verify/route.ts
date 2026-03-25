import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

/**
 * GET /api/legacy/verify?token=xxx
 *
 * Public endpoint that users click from the verification email.
 * Resets their last_seen_at and clears the verification state,
 * then redirects them to the palace.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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

  // Find the legacy_settings row matching this verification token
  const { data: settings, error: findError } = await supabase
    .from("legacy_settings")
    .select("id, verification_token")
    .eq("verification_token", token)
    .single();

  if (findError || !settings) {
    return NextResponse.redirect(`${siteUrl}/palace?legacy_verify=invalid`);
  }

  const userId = settings.id;
  const now = new Date().toISOString();

  // Reset verification state and mark as active
  await supabase
    .from("legacy_settings")
    .update({
      verification_sent_at: null,
      verification_token: null,
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
