"use server";

import { createClient } from "@/lib/supabase/server";

function isSupabaseReady() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }

// ─── Track Progress ───

export async function fetchTrackProgress() {
  if (!isSupabaseReady()) return { tracks: [], points: 0, history: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tracks: [], points: 0, history: [] };

  try {
    const [tracksRes, pointsRes] = await Promise.all([
      supabase.from("track_progress").select("*").eq("user_id", user.id),
      supabase.from("memory_points").select("*").eq("user_id", user.id)
        .order("earned_at", { ascending: false }).limit(50),
    ]);

    if (tracksRes.error || pointsRes.error) return { tracks: [], points: 0, history: [] };

    const tracks = tracksRes.data;
    const pointRows = pointsRes.data;

    const totalPoints = (pointRows || []).reduce((sum: number, r: any) => sum + r.points, 0);

    return {
      tracks: tracks || [],
      points: totalPoints,
      history: pointRows || [],
    };
  } catch {
    return { tracks: [], points: 0, history: [] };
  }
}

export async function completeTrackStep(trackId: string, stepId: string, pointValue: number) {
  if (!isSupabaseReady()) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get or create track progress
  const { data: existing } = await supabase
    .from("track_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .single();

  const currentSteps: string[] = existing?.steps_completed || [];
  if (currentSteps.includes(stepId)) return { success: true, alreadyCompleted: true };

  const newSteps = [...currentSteps, stepId];

  if (existing) {
    await supabase
      .from("track_progress")
      .update({
        steps_completed: newSteps,
        percentage: Math.round((newSteps.length / getTrackStepCount(trackId)) * 100),
        started_at: existing.started_at || new Date().toISOString(),
        ...(newSteps.length >= getTrackStepCount(trackId)
          ? { completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("track_progress").insert({
      user_id: user.id,
      track_id: trackId,
      steps_completed: newSteps,
      percentage: Math.round((newSteps.length / getTrackStepCount(trackId)) * 100),
      started_at: new Date().toISOString(),
      ...(newSteps.length >= getTrackStepCount(trackId)
        ? { completed_at: new Date().toISOString() }
        : {}),
    });
  }

  // Award points
  await supabase.from("memory_points").insert({
    user_id: user.id,
    points: pointValue,
    reason: "track_step",
    reference_id: trackId,
    step_id: stepId,
  });

  return { success: true };
}

export async function completeTrackBonus(trackId: string, bonusPoints: number) {
  if (!isSupabaseReady()) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if bonus already awarded
  const { data: existing } = await supabase
    .from("memory_points")
    .select("id")
    .eq("user_id", user.id)
    .eq("reason", "track_complete")
    .eq("reference_id", trackId)
    .single();

  if (existing) return { success: true, alreadyAwarded: true };

  await supabase.from("memory_points").insert({
    user_id: user.id,
    points: bonusPoints,
    reason: "track_complete",
    reference_id: trackId,
  });

  return { success: true };
}

// Step counts per track (must match tracks.ts definitions)
function getTrackStepCount(trackId: string): number {
  const counts: Record<string, number> = {
    preserve: 10, visualize: 7, enhance: 6,
    resolutions: 5, legacy: 4, cocreate: 5,
  };
  return counts[trackId] || 1;
}

// ─── Legacy Contacts ───

export async function fetchLegacyContacts() {
  if (!isSupabaseReady()) return { contacts: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { contacts: [] };

  try {
    const { data: contacts, error } = await supabase
      .from("legacy_contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) return { contacts: [] };
    return { contacts: contacts || [] };
  } catch {
    return { contacts: [] };
  }
}

export async function addLegacyContact(data: {
  contactName: string;
  contactEmail: string;
  relationship: string;
  accessLevel: string;
  accessibleWings?: string[];
  accessibleRooms?: string[];
}) {
  if (!isSupabaseReady()) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: contact, error } = await supabase
    .from("legacy_contacts")
    .insert({
      user_id: user.id,
      contact_name: data.contactName,
      contact_email: data.contactEmail.toLowerCase(),
      relationship: data.relationship,
      access_level: data.accessLevel,
      accessible_wings: data.accessibleWings || [],
      accessible_rooms: data.accessibleRooms || [],
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { contact };
}

export async function updateLegacyContact(
  contactId: string,
  updates: {
    contactName?: string;
    contactEmail?: string;
    relationship?: string;
    accessLevel?: string;
    accessibleWings?: string[];
    accessibleRooms?: string[];
  },
) {
  if (!isSupabaseReady()) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const dbUpdates: Record<string, unknown> = {};
  if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
  if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail.toLowerCase();
  if (updates.relationship !== undefined) dbUpdates.relationship = updates.relationship;
  if (updates.accessLevel !== undefined) dbUpdates.access_level = updates.accessLevel;
  if (updates.accessibleWings !== undefined) dbUpdates.accessible_wings = updates.accessibleWings;
  if (updates.accessibleRooms !== undefined) dbUpdates.accessible_rooms = updates.accessibleRooms;

  const { error } = await supabase
    .from("legacy_contacts")
    .update(dbUpdates)
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeLegacyContact(contactId: string) {
  if (!isSupabaseReady()) return { success: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("legacy_contacts")
    .update({ is_active: false })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
