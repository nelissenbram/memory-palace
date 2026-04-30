import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { CreateKepRequest } from "@/types/kep";
import crypto from "crypto";

/**
 * GET /api/keps — List user's keps
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:list:${user.id}`, 60, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const { data, error } = await supabase
    .from("keps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/**
 * POST /api/keps — Create a new kep
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:create:${user.id}`, 10, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  let body: CreateKepRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.source_type || !["whatsapp", "photos"].includes(body.source_type)) {
    return NextResponse.json({ error: "Invalid source_type" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("keps")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      icon: body.icon || "📥",
      source_type: body.source_type,
      source_config: body.source_config || {},
      default_wing_id: body.default_wing_id || null,
      default_room_id: body.default_room_id || null,
      routing_rules: body.routing_rules || [],
      auto_route_enabled: body.auto_route_enabled ?? true,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      end_condition: body.end_condition || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-generate invite_code on associated whatsapp_links rows
  if (data && data.id) {
    const inviteCode = `KEP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await supabase
      .from("whatsapp_links")
      .update({ invite_code: inviteCode })
      .eq("kep_id", data.id)
      .is("invite_code", null);
  }

  return NextResponse.json(data, { status: 201 });
}
