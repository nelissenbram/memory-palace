import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revokeProviderToken } from "@/lib/integrations/helpers";

/**
 * GET — List all connected accounts for the current user.
 * DELETE — Disconnect a provider (pass ?provider=google_photos etc.)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from("connected_accounts")
      .select("id, provider, provider_email, connected_at, last_sync_at, metadata")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });

    if (error) {
      console.error("[integrations/accounts] GET failed:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] }, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (err: unknown) {
    console.error("[integrations/accounts] GET unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const provider = request.nextUrl.searchParams.get("provider");
    if (!provider) {
      return NextResponse.json({ error: "provider parameter required" }, { status: 400 });
    }

    const VALID_PROVIDERS = ["google_photos", "dropbox", "onedrive", "box"];
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Fetch the account to get the access token for revocation
    const { data: account } = await supabase
      .from("connected_accounts")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    // Best-effort: revoke the token at the provider before deleting locally
    if (account?.access_token) {
      await revokeProviderToken(provider, account.access_token);
    }

    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      console.error("[integrations/accounts] DELETE failed:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, disconnected: provider }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[integrations/accounts] DELETE unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
