"use server";

import { createClient } from "@/lib/supabase/server";
import { sendTrusteeWelcomeEmail } from "@/lib/email/send-legacy";

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
  verification_sent_at: string | null;
  verification_token: string | null;
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
    .select("id, user_id, contact_name, contact_email, relationship, access_level, wing_access, room_access, is_active, created_at, updated_at")
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

  // Validate wing_access and room_access IDs belong to this user
  if (input.wing_access && input.wing_access.length > 0) {
    const { data: wings } = await supabase
      .from("wings")
      .select("id")
      .eq("user_id", user.id)
      .in("id", input.wing_access);
    if (!wings || wings.length !== input.wing_access.length) {
      return { error: "Invalid wing or room access" };
    }
  }
  if (input.room_access && input.room_access.length > 0) {
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id")
      .eq("user_id", user.id)
      .in("id", input.room_access);
    if (!rooms || rooms.length !== input.room_access.length) {
      return { error: "Invalid wing or room access" };
    }
  }

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

  // Send welcome email to the new trustee (non-blocking)
  try {
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name, locale")
      .eq("id", user.id)
      .single();
    const senderName =
      (senderProfile?.display_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "A friend";
    const result = await sendTrusteeWelcomeEmail({
      recipientEmail: input.contact_email.toLowerCase(),
      recipientName: input.contact_name,
      senderName,
      relationship: input.relationship || null,
      locale: (senderProfile?.locale as string | undefined) || "en",
    });
    if (!result.success) {
      console.error("[createLegacyContact] Email send failed:", result.error);
    }
  } catch (e) {
    console.error("[createLegacyContact] Email send exception:", e);
  }

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

  // Validate wing_access and room_access IDs belong to this user
  if (updates.wing_access && updates.wing_access.length > 0) {
    const { data: wings } = await supabase
      .from("wings")
      .select("id")
      .eq("user_id", user.id)
      .in("id", updates.wing_access);
    if (!wings || wings.length !== updates.wing_access.length) {
      return { error: "Invalid wing or room access" };
    }
  }
  if (updates.room_access && updates.room_access.length > 0) {
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id")
      .eq("user_id", user.id)
      .in("id", updates.room_access);
    if (!rooms || rooms.length !== updates.room_access.length) {
      return { error: "Invalid wing or room access" };
    }
  }

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

  // Guard: block deletion of last active contact while delivery is pending
  const { data: settings } = await supabase
    .from("legacy_settings")
    .select("status")
    .eq("id", user.id)
    .single();

  if (settings?.status === "triggered" || settings?.status === "delivering") {
    const { count } = await supabase
      .from("legacy_contacts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if ((count ?? 0) <= 1) {
      return { error: "Cannot delete last contact while legacy delivery is pending" };
    }
  }

  const { error } = await supabase
    .from("legacy_contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ═══ USER ROOMS (for room picker) ═══

export interface UserRoom {
  id: string;
  name: string;
  wing_id: string;
}

export async function fetchUserRooms(): Promise<UserRoom[]> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return [];

  const { data } = await supabase
    .from("rooms")
    .select("id, name, wing_id")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  return (data as UserRoom[]) || [];
}

// ═══ LEGACY MESSAGES ═══

export async function fetchLegacyMessages(): Promise<LegacyMessage[]> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return [];

  const { data } = await supabase
    .from("legacy_messages")
    .select("id, user_id, recipient_email, subject, message_body, deliver_on, deliver_date, created_at, updated_at")
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
    .select("id, inactivity_trigger_months, trusted_verifier_email, trusted_verifier_name, status, verification_sent_at, verification_token, created_at, updated_at")
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

  if (updates.inactivity_trigger_months !== undefined && (updates.inactivity_trigger_months < 1 || updates.inactivity_trigger_months > 60)) {
    return { error: "Inactivity period must be between 1 and 60 months" };
  }

  const payload: Record<string, unknown> = { id: user.id };
  if (updates.inactivity_trigger_months !== undefined) payload.inactivity_trigger_months = updates.inactivity_trigger_months;
  if (updates.trusted_verifier_email !== undefined) payload.trusted_verifier_email = updates.trusted_verifier_email;
  if (updates.trusted_verifier_name !== undefined) payload.trusted_verifier_name = updates.trusted_verifier_name;

  // When inactivity_trigger_months changes, clear any triggered state so the
  // inactivity timer restarts with the new threshold. Don't clear if already
  // transferred (delivery already happened).
  if (updates.inactivity_trigger_months !== undefined) {
    const { data: current } = await supabase
      .from("legacy_settings")
      .select("status")
      .eq("id", user.id)
      .single();

    if (current?.status === "triggered") {
      payload.status = "active";
      payload.verification_sent_at = null;
      payload.verification_token = null;
      payload.verification_expires_at = null;
      payload.verifier_confirmation_token = null;
    }
  }

  const { data, error } = await supabase
    .from("legacy_settings")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error: error.message };
  return { settings: data as LegacySettings };
}

// ═══ FETCH USER WINGS ═══

export interface UserWing {
  id: string;
  slug: string;
  name: string;
}

export async function fetchUserWings(): Promise<UserWing[]> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) return [];

  const { data } = await supabase
    .from("wings")
    .select("id, slug, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data as UserWing[]) || [];
}

// ═══ FETCH ALL LEGACY DATA ═══

export async function retryLegacyDelivery(): Promise<{ success: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify user has partially_delivered status
  const { data: settings } = await supabase
    .from("legacy_settings")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!settings || settings.status !== "partially_delivered") {
    return { success: false, error: "No partial delivery to retry" };
  }

  // Call the deliver endpoint internally
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return { success: false, error: "Server not configured" };

  const res = await fetch(`${siteUrl}/api/legacy/deliver`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ userId: user.id, retry: true }),
  });

  if (!res.ok) {
    return { success: false, error: "Delivery failed" };
  }

  const data = await res.json();
  return { success: true, sent: data.sent };
}

export async function fetchAllLegacyData() {
  const [contacts, messages, settings, wings] = await Promise.all([
    fetchLegacyContacts(),
    fetchLegacyMessages(),
    fetchLegacySettings(),
    fetchUserWings(),
  ]);

  return { contacts, messages, settings, wings };
}
