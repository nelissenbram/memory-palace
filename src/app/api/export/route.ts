import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/auth/export-actions";

export async function GET() {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await exportUserData();

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const json = JSON.stringify(result.data, null, 2);
    const displayName =
      (result.data.profile as Record<string, unknown> | null)?.display_name ||
      "user";
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `memory-palace-export-${dateStr}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
