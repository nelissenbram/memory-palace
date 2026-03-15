import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, disconnected: provider });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
