import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/auth/export-actions";

export const maxDuration = 60;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const result = await exportUserData(supabase, user.id);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const json = JSON.stringify(
      result.data,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    );
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
      { error: "EXPORT_FAILED" },
      { status: 500 }
    );
  }
}
