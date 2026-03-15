import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * GET /api/email/unsubscribe?unsubscribe=true&email={email}
 *
 * One-click unsubscribe endpoint for email digest.
 * Sets email_digest = false for the user matching the given email.
 * Returns an HTML confirmation page.
 *
 * -- Requires the profiles.email_digest column (see digest route migration) --
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unsubscribe = searchParams.get("unsubscribe");
  const email = searchParams.get("email");

  if (unsubscribe !== "true" || !email) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(renderPage("error", "Service temporarily unavailable. Please try again later."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Find the user by email via auth admin API
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUser = authUsers?.users?.find((u) => u.email === email);

  if (!authUser) {
    // Don't reveal whether the email exists — just show success
    return new NextResponse(renderPage("success", ""), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Update the profile to disable email digest
  const { error } = await supabase
    .from("profiles")
    .update({ email_digest: false })
    .eq("id", authUser.id);

  if (error) {
    console.error("[Unsubscribe] Failed to update profile:", error);
    return new NextResponse(renderPage("error", "Something went wrong. Please try again or disable digest emails in your settings."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(renderPage("success", ""), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderPage(type: "success" | "error", errorMessage: string): string {
  const palaceUrl = `${SITE_URL}/palace`;
  const settingsUrl = `${SITE_URL}/settings/notifications`;

  if (type === "error") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - Memory Palace</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:'Georgia',serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;width:100%;padding:40px 24px;text-align:center;">
    <div style="font-size:48px;margin-bottom:20px;">&#x26A0;&#xFE0F;</div>
    <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#2C2C2A;margin:0 0 16px;">
      Something Went Wrong
    </h1>
    <p style="font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.6;margin:0 0 28px;">
      ${errorMessage}
    </p>
    <a href="${settingsUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">
      Go to Settings
    </a>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Memory Palace</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:'Georgia',serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;width:100%;padding:40px 24px;text-align:center;">
    <div style="font-size:48px;margin-bottom:20px;">&#x1F3DB;&#xFE0F;</div>
    <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#2C2C2A;margin:0 0 16px;">
      You&rsquo;ve Been Unsubscribed
    </h1>
    <p style="font-family:'Georgia',serif;font-size:15px;color:#8B7355;line-height:1.6;margin:0 0 8px;">
      You won&rsquo;t receive weekly digest emails anymore.
    </p>
    <p style="font-family:'Georgia',serif;font-size:14px;color:#9A9183;line-height:1.6;margin:0 0 28px;">
      You can always re-enable this in your
      <a href="${settingsUrl}" style="color:#C17F59;text-decoration:underline;">notification settings</a>.
    </p>
    <a href="${palaceUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#C17F59,#8B7355);color:#FFFFFF;font-family:'Georgia',serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">
      Return to Your Palace
    </a>
  </div>
</body>
</html>`;
}
