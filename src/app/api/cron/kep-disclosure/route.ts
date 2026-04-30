import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { sendDisclosureMessage } from "@/lib/kep/whatsapp-disclosure";

/**
 * GET /api/cron/kep-disclosure
 * Checks for active WhatsApp keps that haven't sent disclosure yet.
 * Runs daily via Vercel Cron.
 */
export const maxDuration = 30;

export async function GET(request: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Find active WhatsApp links without disclosure sent
  const { data: links, error } = await supabase
    .from("whatsapp_links")
    .select("*, keps!inner(status, user_id)")
    .eq("disclosure_sent", false)
    .eq("verified", true)
    .eq("keps.status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const link of links || []) {
    const success = await sendDisclosureMessage(link.wa_group_id);

    if (success) {
      await supabase
        .from("whatsapp_links")
        .update({
          disclosure_sent: true,
          disclosure_sent_at: new Date().toISOString(),
        })
        .eq("id", link.id);
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json(
    { sent, failed, total: links?.length || 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
