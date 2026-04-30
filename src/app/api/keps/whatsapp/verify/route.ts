import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/keps/whatsapp/verify — Verify a WhatsApp group link
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:wa-verify:${user.id}`, 5, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  let body: { kep_id: string; wa_group_id: string; wa_group_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.kep_id || !body.wa_group_id) {
    return NextResponse.json({ error: "kep_id and wa_group_id required" }, { status: 400 });
  }

  // Verify kep ownership
  const { data: kep } = await supabase
    .from("keps")
    .select("id, source_type")
    .eq("id", body.kep_id)
    .eq("user_id", user.id)
    .single();

  if (!kep) return NextResponse.json({ error: "Kep not found" }, { status: 404 });
  if (kep.source_type !== "whatsapp") {
    return NextResponse.json({ error: "Kep is not a WhatsApp type" }, { status: 400 });
  }

  // Check if group is already linked
  const { data: existing } = await supabase
    .from("whatsapp_links")
    .select("id, kep_id")
    .eq("wa_group_id", body.wa_group_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This WhatsApp group is already linked to a Kep" },
      { status: 409 },
    );
  }

  // Create the WhatsApp link
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const { data: link, error } = await supabase
    .from("whatsapp_links")
    .insert({
      kep_id: body.kep_id,
      user_id: user.id,
      wa_group_id: body.wa_group_id,
      wa_group_name: body.wa_group_name || null,
      phone_number_id: phoneNumberId || null,
      verified: true,
      verified_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(link, { status: 201 });
}
