"use server";

import { createClient } from "@/lib/supabase/server";

export interface FamilyTreePerson {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  gender: "male" | "female" | "other" | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyTreeRelationship {
  id: string;
  user_id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: "parent" | "child" | "spouse" | "sibling";
  created_at: string;
}

export async function getPersons(): Promise<{ persons: FamilyTreePerson[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { persons: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { persons: [] };

  const { data, error } = await supabase
    .from("family_tree_persons")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return { persons: [] };
  return { persons: (data || []) as FamilyTreePerson[] };
}

export async function getRelationships(): Promise<{ relationships: FamilyTreeRelationship[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { relationships: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { relationships: [] };

  const { data, error } = await supabase
    .from("family_tree_relationships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return { relationships: [] };
  return { relationships: (data || []) as FamilyTreeRelationship[] };
}

export async function addPerson(data: {
  first_name: string;
  last_name?: string;
  birth_date?: string;
  death_date?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!data.first_name.trim()) return { error: "First name is required" };

  const { data: person, error } = await supabase
    .from("family_tree_persons")
    .insert({
      user_id: user.id,
      first_name: data.first_name.trim(),
      last_name: data.last_name?.trim() || null,
      birth_date: data.birth_date || null,
      death_date: data.death_date || null,
      gender: data.gender || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { person: person as FamilyTreePerson };
}

export async function updatePerson(id: string, updates: {
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  death_date?: string | null;
  gender?: "male" | "female" | "other" | null;
  photo_path?: string | null;
  notes?: string | null;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cleanUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.first_name !== undefined) cleanUpdates.first_name = updates.first_name.trim();
  if (updates.last_name !== undefined) cleanUpdates.last_name = updates.last_name?.trim() || null;
  if (updates.birth_date !== undefined) cleanUpdates.birth_date = updates.birth_date || null;
  if (updates.death_date !== undefined) cleanUpdates.death_date = updates.death_date || null;
  if (updates.gender !== undefined) cleanUpdates.gender = updates.gender || null;
  if (updates.photo_path !== undefined) cleanUpdates.photo_path = updates.photo_path || null;
  if (updates.notes !== undefined) cleanUpdates.notes = updates.notes?.trim() || null;

  const { data: person, error } = await supabase
    .from("family_tree_persons")
    .update(cleanUpdates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { person: person as FamilyTreePerson };
}

export async function deletePerson(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("family_tree_persons")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addRelationship(
  personId: string,
  relatedPersonId: string,
  type: "parent" | "child" | "spouse" | "sibling"
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (personId === relatedPersonId) return { error: "Cannot relate a person to themselves" };

  const { data: rel, error } = await supabase
    .from("family_tree_relationships")
    .insert({
      user_id: user.id,
      person_id: personId,
      related_person_id: relatedPersonId,
      relationship_type: type,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { relationship: rel as FamilyTreeRelationship };
}

export async function removeRelationship(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("family_tree_relationships")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
