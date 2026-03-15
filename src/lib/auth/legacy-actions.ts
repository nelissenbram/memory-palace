"use server";

import { createClient } from "@/lib/supabase/server";

// ── Types ──

export interface LegacyContact {
  id: string;
  user_id: string;
  contact_name: string;
  contact_email: string;
  relationship: string | null;
  access_level: string;
  wing_access: string[];
  room_access: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegacyMessage {
  id: string;
  user_id: string;
  recipient_email: string;
  subject: string;
  message_body: string;
  deliver_on: string;
  deliver_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacySettings {
  id: string;
  inactivity_trigger_months: number;
  trusted_verifier_email: string | null;
  trusted_verifier_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Helper: authenticated user ──

async function getAuthUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { supabase: null, user: null };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ═══ LEGACY CONTACTS ═══

export async function fetchLegacyContacts(): Promise<LegacyContact[]> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return [];

  const { data } = await supabase
    .from("legacy_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data as LegacyContact[]) || [];
}

export async function createLegacyContact(input: {
  contact_name: string;
  contact_email: string;
  relationship?: string;
  access_level?: string;
  wing_access?: string[];
  room_access?: string[];
}) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("legacy_contacts")
    .insert({
      user_id: user.id,
      contact_name: input.contact_name,
      contact_email: input.contact_email.toLowerCase(),
      relationship: input.relationship || null,
      access_level: input.access_level || "full",
      wing_access: input.wing_access || [],
      room_access: input.room_access || [],
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { contact: data as LegacyContact };
}

export async function updateLegacyContact(
  contactId: string,
  updates: {
    contact_name?: string;
    contact_email?: string;
    relationship?: string;
    access_level?: string;
    wing_access?: string[];
    room_access?: string[];
  }
) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const payload: Record<string, unknown> = {};
  if (updates.contact_name !== undefined) payload.contact_name = updates.contact_name;
  if (updates.contact_email !== undefined) payload.contact_email = updates.contact_email.toLowerCase();
  if (updates.relationship !== undefined) payload.relationship = updates.relationship;
  if (updates.access_level !== undefined) payload.access_level = updates.access_level;
  if (updates.wing_access !== undefined) payload.wing_access = updates.wing_access;
  if (updates.room_access !== undefined) payload.room_access = updates.room_access;

  if (Object.keys(payload).length === 0) return { error: "No fields to update" };

  const { data, error } = await supabase
    .from("legacy_contacts")
    .update(payload)
    .eq("id", contactId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { contact: data as LegacyContact };
}

export async function deleteLegacyContact(contactId: string) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("legacy_contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ═══ LEGACY MESSAGES ═══

export async function fetchLegacyMessages(): Promise<LegacyMessage[]> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return [];

  const { data } = await supabase
    .from("legacy_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data as LegacyMessage[]) || [];
}

export async function createLegacyMessage(input: {
  recipient_email: string;
  subject: string;
  message_body: string;
  deliver_on?: string;
  deliver_date?: string;
}) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("legacy_messages")
    .insert({
      user_id: user.id,
      recipient_email: input.recipient_email.toLowerCase(),
      subject: input.subject,
      message_body: input.message_body,
      deliver_on: input.deliver_on || "death",
      deliver_date: input.deliver_date || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { message: data as LegacyMessage };
}

export async function updateLegacyMessage(
  messageId: string,
  updates: {
    recipient_email?: string;
    subject?: string;
    message_body?: string;
    deliver_on?: string;
    deliver_date?: string | null;
  }
) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const payload: Record<string, unknown> = {};
  if (updates.recipient_email !== undefined) payload.recipient_email = updates.recipient_email.toLowerCase();
  if (updates.subject !== undefined) payload.subject = updates.subject;
  if (updates.message_body !== undefined) payload.message_body = updates.message_body;
  if (updates.deliver_on !== undefined) payload.deliver_on = updates.deliver_on;
  if (updates.deliver_date !== undefined) payload.deliver_date = updates.deliver_date;

  if (Object.keys(payload).length === 0) return { error: "No fields to update" };

  const { data, error } = await supabase
    .from("legacy_messages")
    .update(payload)
    .eq("id", messageId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { message: data as LegacyMessage };
}

export async function deleteLegacyMessage(messageId: string) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("legacy_messages")
    .delete()
    .eq("id", messageId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ═══ LEGACY SETTINGS ═══

export async function fetchLegacySettings(): Promise<LegacySettings | null> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return null;

  const { data } = await supabase
    .from("legacy_settings")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as LegacySettings) || null;
}

export async function upsertLegacySettings(updates: {
  inactivity_trigger_months?: number;
  trusted_verifier_email?: string | null;
  trusted_verifier_name?: string | null;
}) {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return { error: "Not authenticated" };

  const payload: Record<string, unknown> = { id: user.id };
  if (updates.inactivity_trigger_months !== undefined) payload.inactivity_trigger_months = updates.inactivity_trigger_months;
  if (updates.trusted_verifier_email !== undefined) payload.trusted_verifier_email = updates.trusted_verifier_email;
  if (updates.trusted_verifier_name !== undefined) payload.trusted_verifier_name = updates.trusted_verifier_name;

  const { data, error } = await supabase
    .from("legacy_settings")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error: error.message };
  return { settings: data as LegacySettings };
}

// ═══ FETCH ALL LEGACY DATA ═══

export async function fetchAllLegacyData() {
  const [contacts, messages, settings] = await Promise.all([
    fetchLegacyContacts(),
    fetchLegacyMessages(),
    fetchLegacySettings(),
  ]);

  return { contacts, messages, settings };
}
