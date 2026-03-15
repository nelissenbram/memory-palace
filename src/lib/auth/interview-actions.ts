"use server";

import { createClient } from "@/lib/supabase/server";

const supabaseReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function startInterview(templateId: string) {
  if (!supabaseReady) return { error: "Supabase not configured" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      interview_template_id: templateId,
      status: "in_progress",
      responses: [],
      metadata: {},
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { session };
}

export async function saveResponse(
  sessionId: string,
  questionId: string,
  audioUrl: string | null,
  transcript: string
) {
  if (!supabaseReady) return { error: "Supabase not configured" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch current responses
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("responses")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return { error: "Session not found" };

  const responses = [...(session.responses || [])];
  responses.push({
    questionId,
    audioUrl,
    transcript,
    answeredAt: new Date().toISOString(),
  });

  const { error } = await supabase
    .from("interview_sessions")
    .update({ responses })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function completeInterview(sessionId: string, narrativeSummary: string) {
  if (!supabaseReady) return { error: "Supabase not configured" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      status: "completed",
      narrative_summary: narrativeSummary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function fetchInterviewSessions() {
  if (!supabaseReady) return { sessions: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sessions: [] };

  const { data: sessions, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (error) return { sessions: [] };
  return { sessions: sessions || [] };
}

export async function fetchInterviewSession(sessionId: string) {
  if (!supabaseReady) return { error: "Supabase not configured" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  return { session };
}

export async function updateInterviewMemoryId(sessionId: string, memoryId: string) {
  if (!supabaseReady) return { error: "Supabase not configured" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("interview_sessions")
    .update({ generated_memory_id: memoryId })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
