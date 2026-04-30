"use server";

import { createClient } from "@/lib/supabase/server";
import { serverError } from "@/lib/i18n/server-errors";
import { serverT, getServerLocale } from "@/lib/i18n/server";

export interface FamilyTreePerson {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  death_place: string | null;
  gender: "male" | "female" | "other" | null;
  photo_path: string | null;
  notes: string | null;
  is_self: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyTreeRelationship {
  id: string;
  user_id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: "parent" | "child" | "spouse" | "sibling" | "ex-spouse" | "stepparent" | "stepchild" | "half-sibling";
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

  if (error) {
    console.error("getPersons error:", error.message);
    return { persons: [] };
  }
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

  if (error) {
    console.error("getRelationships error:", error.message);
    return { relationships: [] };
  }
  return { relationships: (data || []) as FamilyTreeRelationship[] };
}

export async function addPerson(data: {
  first_name: string;
  last_name?: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
  is_self?: boolean;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const t = await serverError();
  if (!data.first_name.trim()) return { error: t("firstNameRequired") };

  const { data: person, error } = await supabase
    .from("family_tree_persons")
    .insert({
      user_id: user.id,
      first_name: data.first_name.trim(),
      last_name: data.last_name?.trim() || null,
      birth_date: data.birth_date || null,
      death_date: data.death_date || null,
      birth_place: data.birth_place?.trim() || null,
      death_place: data.death_place?.trim() || null,
      gender: data.gender || null,
      notes: data.notes?.trim() || null,
      is_self: data.is_self ?? false,
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
  birth_place?: string | null;
  death_place?: string | null;
  gender?: "male" | "female" | "other" | null;
  photo_path?: string | null;
  notes?: string | null;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const t = await serverError();
  const cleanUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.first_name !== undefined) {
    const trimmed = updates.first_name.trim();
    if (!trimmed) return { error: t("firstNameRequired") };
    cleanUpdates.first_name = trimmed;
  }
  if (updates.last_name !== undefined) cleanUpdates.last_name = updates.last_name?.trim() || null;
  if (updates.birth_date !== undefined) cleanUpdates.birth_date = updates.birth_date || null;
  if (updates.death_date !== undefined) cleanUpdates.death_date = updates.death_date || null;
  if (updates.birth_place !== undefined) cleanUpdates.birth_place = updates.birth_place?.trim() || null;
  if (updates.death_place !== undefined) cleanUpdates.death_place = updates.death_place?.trim() || null;
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
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Delete all relationships involving this person first (cascade)
  await supabase
    .from("family_tree_relationships")
    .delete()
    .eq("user_id", user.id)
    .eq("person_id", id);
  await supabase
    .from("family_tree_relationships")
    .delete()
    .eq("user_id", user.id)
    .eq("related_person_id", id);

  const { error } = await supabase
    .from("family_tree_persons")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

type RelationshipType = "parent" | "child" | "spouse" | "sibling" | "ex-spouse" | "stepparent" | "stepchild" | "half-sibling";

function getReverseType(type: RelationshipType): RelationshipType {
  switch (type) {
    case "parent": return "child";
    case "child": return "parent";
    case "spouse": return "spouse";
    case "sibling": return "sibling";
    case "ex-spouse": return "ex-spouse";
    case "stepparent": return "stepchild";
    case "stepchild": return "stepparent";
    case "half-sibling": return "half-sibling";
    default: return type; // fallback: symmetric
  }
}

export async function addRelationship(
  personId: string,
  relatedPersonId: string,
  type: RelationshipType
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const t = await serverError();
  if (personId === relatedPersonId) return { error: t("cannotRelateSelf") };

  // Check if forward relationship already exists
  const { data: existingFwd } = await supabase
    .from("family_tree_relationships")
    .select("id")
    .eq("user_id", user.id)
    .eq("person_id", personId)
    .eq("related_person_id", relatedPersonId)
    .eq("relationship_type", type)
    .maybeSingle();

  if (existingFwd) return { error: t("relationshipAlreadyExists") };

  // Insert the forward relationship
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

  // Insert the reverse relationship (upsert-style: check if it already exists first)
  const reverseType = getReverseType(type);

  const { data: existing } = await supabase
    .from("family_tree_relationships")
    .select("id")
    .eq("user_id", user.id)
    .eq("person_id", relatedPersonId)
    .eq("related_person_id", personId)
    .eq("relationship_type", reverseType)
    .maybeSingle();

  if (!existing) {
    const { error: reverseError } = await supabase
      .from("family_tree_relationships")
      .insert({
        user_id: user.id,
        person_id: relatedPersonId,
        related_person_id: personId,
        relationship_type: reverseType,
      });
    if (reverseError) {
      console.error("Failed to create reverse relationship:", reverseError.message);
    }
  }

  return { relationship: rel as FamilyTreeRelationship };
}

export async function removeRelationship(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Fetch the relationship first so we can find and remove its reverse
  const { data: rel } = await supabase
    .from("family_tree_relationships")
    .select("person_id, related_person_id, relationship_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Delete the forward relationship
  const { error } = await supabase
    .from("family_tree_relationships")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Delete the reverse relationship if the original was found
  if (rel) {
    const reverseType = getReverseType(rel.relationship_type as RelationshipType);
    await supabase
      .from("family_tree_relationships")
      .delete()
      .eq("user_id", user.id)
      .eq("person_id", rel.related_person_id)
      .eq("related_person_id", rel.person_id)
      .eq("relationship_type", reverseType);
  }

  return { success: true };
}

/* ════════════════════════════════════ SOURCES ════════════════════════════════ */

export interface FamilyTreeSource {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  citation: string | null;
  notes: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyTreeSourceLink {
  id: string;
  user_id: string;
  source_id: string;
  person_id: string;
  fact_type: string;
  event_id: string | null;
  created_at: string;
}

export async function getSources(): Promise<{ sources: FamilyTreeSource[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { sources: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sources: [] };

  const { data, error } = await supabase
    .from("family_tree_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSources error:", error.message);
    return { sources: [] };
  }
  return { sources: (data || []) as FamilyTreeSource[] };
}

export async function addSource(data: {
  title: string;
  url?: string;
  citation?: string;
  notes?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const tSrc = await serverError();
  if (!data.title.trim()) return { error: tSrc("titleRequired") };

  const { data: source, error } = await supabase
    .from("family_tree_sources")
    .insert({
      user_id: user.id,
      title: data.title.trim(),
      url: data.url?.trim() || null,
      citation: data.citation?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { source: source as FamilyTreeSource };
}

export async function updateSource(id: string, updates: {
  title?: string;
  url?: string | null;
  citation?: string | null;
  notes?: string | null;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const tUpd = await serverError();
  const cleanUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) return { error: tUpd("titleRequired") };
    cleanUpdates.title = trimmed;
  }
  if (updates.url !== undefined) cleanUpdates.url = updates.url?.trim() || null;
  if (updates.citation !== undefined) cleanUpdates.citation = updates.citation?.trim() || null;
  if (updates.notes !== undefined) cleanUpdates.notes = updates.notes?.trim() || null;

  const { data: source, error } = await supabase
    .from("family_tree_sources")
    .update(cleanUpdates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { source: source as FamilyTreeSource };
}

export async function removeSource(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { error } = await supabase
    .from("family_tree_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getSourceLinks(personId: string): Promise<{ links: FamilyTreeSourceLink[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { links: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { links: [] };

  const { data, error } = await supabase
    .from("family_tree_source_links")
    .select("*")
    .eq("user_id", user.id)
    .eq("person_id", personId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getSourceLinks error:", error.message);
    return { links: [] };
  }
  return { links: (data || []) as FamilyTreeSourceLink[] };
}

export async function addSourceLink(data: {
  source_id: string;
  person_id: string;
  fact_type: string;
  event_id?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { data: link, error } = await supabase
    .from("family_tree_source_links")
    .insert({
      user_id: user.id,
      source_id: data.source_id,
      person_id: data.person_id,
      fact_type: data.fact_type,
      event_id: data.event_id || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { link: link as FamilyTreeSourceLink };
}

export async function removeSourceLink(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { error } = await supabase
    .from("family_tree_source_links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/* ══════════════════════════════════════════
   Family Tree Events
   ══════════════════════════════════════════ */

export type FamilyTreeEventType =
  | "marriage" | "divorce" | "burial" | "baptism" | "christening"
  | "immigration" | "emigration" | "naturalization"
  | "occupation" | "education" | "military" | "residence"
  | "retirement" | "census" | "other";

export interface FamilyTreeEvent {
  id: string;
  user_id: string;
  person_id: string;
  event_type: FamilyTreeEventType;
  event_date: string | null;
  event_place: string | null;
  description: string | null;
  related_person_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getEvents(): Promise<{ events: FamilyTreeEvent[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { events: [] };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { events: [] };

  const { data, error } = await supabase
    .from("family_tree_events")
    .select("*")
    .eq("user_id", user.id)
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("getEvents error:", error.message);
    return { events: [] };
  }
  return { events: (data || []) as FamilyTreeEvent[] };
}

export async function addEvent(personId: string, data: {
  event_type: FamilyTreeEventType;
  event_date?: string;
  event_place?: string;
  description?: string;
  related_person_id?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { data: event, error } = await supabase
    .from("family_tree_events")
    .insert({
      user_id: user.id,
      person_id: personId,
      event_type: data.event_type,
      event_date: data.event_date || null,
      event_place: data.event_place?.trim() || null,
      description: data.description?.trim() || null,
      related_person_id: data.related_person_id || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { event: event as FamilyTreeEvent };
}

export async function updateEvent(id: string, updates: {
  event_type?: FamilyTreeEventType;
  event_date?: string | null;
  event_place?: string | null;
  description?: string | null;
  related_person_id?: string | null;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const cleanUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.event_type !== undefined) cleanUpdates.event_type = updates.event_type;
  if (updates.event_date !== undefined) cleanUpdates.event_date = updates.event_date || null;
  if (updates.event_place !== undefined) cleanUpdates.event_place = updates.event_place?.trim() || null;
  if (updates.description !== undefined) cleanUpdates.description = updates.description?.trim() || null;
  if (updates.related_person_id !== undefined) cleanUpdates.related_person_id = updates.related_person_id || null;

  const { data: event, error } = await supabase
    .from("family_tree_events")
    .update(cleanUpdates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { event: event as FamilyTreeEvent };
}

/* ══════════════════════════════════════════
   Merge duplicate persons
   ══════════════════════════════════════════ */

export async function mergePersons(keepId: string, removeId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const tMerge = await serverError();
  if (keepId === removeId) return { error: tMerge("cannotMergeSelf") };

  // Fetch both persons (scoped to user)
  const { data: keepPerson } = await supabase
    .from("family_tree_persons")
    .select("*")
    .eq("id", keepId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: removePerson } = await supabase
    .from("family_tree_persons")
    .select("*")
    .eq("id", removeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!keepPerson || !removePerson) { const t = await serverError(); return { error: t("personsNotFound") }; }

  // Fill in null fields on keepPerson from removePerson
  const fillUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fillableFields = ["last_name", "birth_date", "death_date", "birth_place", "death_place", "gender", "photo_path", "notes"] as const;
  for (const field of fillableFields) {
    if (keepPerson[field] === null && removePerson[field] !== null) {
      fillUpdates[field] = removePerson[field];
    }
  }

  if (Object.keys(fillUpdates).length > 1) {
    await supabase
      .from("family_tree_persons")
      .update(fillUpdates)
      .eq("id", keepId)
      .eq("user_id", user.id);
  }

  // Transfer relationships from removePerson to keepPerson
  // Update person_id references
  const { data: relsAsSubject } = await supabase
    .from("family_tree_relationships")
    .select("*")
    .eq("user_id", user.id)
    .eq("person_id", removeId);

  if (relsAsSubject) {
    for (const rel of relsAsSubject) {
      // Skip if this would create a self-referencing relationship
      if (rel.related_person_id === keepId) {
        await supabase.from("family_tree_relationships").delete().eq("id", rel.id);
        continue;
      }
      // Check if this relationship already exists for keepPerson
      const { data: existing } = await supabase
        .from("family_tree_relationships")
        .select("id")
        .eq("user_id", user.id)
        .eq("person_id", keepId)
        .eq("related_person_id", rel.related_person_id)
        .eq("relationship_type", rel.relationship_type)
        .maybeSingle();

      if (existing) {
        // Duplicate — delete the old one
        await supabase.from("family_tree_relationships").delete().eq("id", rel.id);
      } else {
        await supabase
          .from("family_tree_relationships")
          .update({ person_id: keepId })
          .eq("id", rel.id);
      }
    }
  }

  // Update related_person_id references
  const { data: relsAsRelated } = await supabase
    .from("family_tree_relationships")
    .select("*")
    .eq("user_id", user.id)
    .eq("related_person_id", removeId);

  if (relsAsRelated) {
    for (const rel of relsAsRelated) {
      if (rel.person_id === keepId) {
        await supabase.from("family_tree_relationships").delete().eq("id", rel.id);
        continue;
      }
      const { data: existing } = await supabase
        .from("family_tree_relationships")
        .select("id")
        .eq("user_id", user.id)
        .eq("person_id", rel.person_id)
        .eq("related_person_id", keepId)
        .eq("relationship_type", rel.relationship_type)
        .maybeSingle();

      if (existing) {
        await supabase.from("family_tree_relationships").delete().eq("id", rel.id);
      } else {
        await supabase
          .from("family_tree_relationships")
          .update({ related_person_id: keepId })
          .eq("id", rel.id);
      }
    }
  }

  // Transfer events from removePerson to keepPerson
  await supabase
    .from("family_tree_events")
    .update({ person_id: keepId })
    .eq("person_id", removeId)
    .eq("user_id", user.id);

  // Transfer source links from removePerson to keepPerson
  await supabase
    .from("family_tree_source_links")
    .update({ person_id: keepId })
    .eq("person_id", removeId)
    .eq("user_id", user.id);

  // Delete the removed person
  const { error } = await supabase
    .from("family_tree_persons")
    .delete()
    .eq("id", removeId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markAsSelf(personId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Set all user's persons to is_self = false
  await supabase
    .from("family_tree_persons")
    .update({ is_self: false })
    .eq("user_id", user.id);

  // Then set the specific person to is_self = true
  const { error } = await supabase
    .from("family_tree_persons")
    .update({ is_self: true, updated_at: new Date().toISOString() })
    .eq("id", personId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeEvent(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { error } = await supabase
    .from("family_tree_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/* ══════════════════════════════════════════
   Family Tree Sharing
   ══════════════════════════════════════════ */

export interface FamilyTreeShare {
  id: string;
  user_id: string;
  share_token: string;
  is_active: boolean;
  created_at: string;
}

/** Get the current user's active share link, if any. */
export async function getActiveShare(): Promise<{ share?: FamilyTreeShare; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { data } = await supabase
    .from("family_tree_shares")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data ? { share: data as FamilyTreeShare } : {};
}

/** Create a share link for the current user's tree, or return the existing active one. */
export async function createShareLink(): Promise<{ share?: FamilyTreeShare; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Check for existing active share
  const { data: existing } = await supabase
    .from("family_tree_shares")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) return { share: existing as FamilyTreeShare };

  // Create new share
  const { data: share, error } = await supabase
    .from("family_tree_shares")
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  return { share: share as FamilyTreeShare };
}

/** Deactivate a share link. */
export async function deactivateShareLink(id: string): Promise<{ success?: boolean; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { error } = await supabase
    .from("family_tree_shares")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/** Fetch shared tree data by token (no auth required). Uses admin client to read the owner's data. */
export async function getSharedTree(token: string): Promise<{
  ownerName?: string;
  persons?: FamilyTreePerson[];
  relationships?: FamilyTreeRelationship[];
  error?: string;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();

  // Look up the share token
  const { data: share, error: shareError } = await admin
    .from("family_tree_shares")
    .select("user_id, is_active")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (shareError || !share) { const t = await serverError(); return { error: t("shareNotFoundOrInactive") }; }

  const userId = share.user_id;

  // Fetch the owner's display name
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  // Fetch persons
  const { data: persons, error: pError } = await admin
    .from("family_tree_persons")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (pError) return { error: pError.message };

  // Fetch relationships
  const { data: relationships, error: rError } = await admin
    .from("family_tree_relationships")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (rError) return { error: rError.message };

  return {
    ownerName: profile?.display_name || serverT("someone", await getServerLocale()),
    persons: (persons || []) as FamilyTreePerson[],
    relationships: (relationships || []) as FamilyTreeRelationship[],
  };
}
