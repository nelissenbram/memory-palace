import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { UpdateKepRequest } from "@/types/kep";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/keps/[id] — Get a single kep
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("keps")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}

/**
 * PATCH /api/keps/[id] — Update a kep
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:update:${user.id}`, 30, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  let body: UpdateKepRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate status transition if provided
  if (body.status && !["draft", "active", "paused", "closed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Build update object, only including defined fields
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.source_config !== undefined) updates.source_config = body.source_config;
  if (body.default_wing_id !== undefined) updates.default_wing_id = body.default_wing_id;
  if (body.default_room_id !== undefined) updates.default_room_id = body.default_room_id;
  if (body.routing_rules !== undefined) updates.routing_rules = body.routing_rules;
  if (body.auto_route_enabled !== undefined) updates.auto_route_enabled = body.auto_route_enabled;
  if (body.status !== undefined) updates.status = body.status;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
  if (body.end_condition !== undefined) updates.end_condition = body.end_condition;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("keps")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}

/**
 * DELETE /api/keps/[id] — Delete a kep
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`keps:delete:${user.id}`, 10, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const { error } = await supabase
    .from("keps")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
