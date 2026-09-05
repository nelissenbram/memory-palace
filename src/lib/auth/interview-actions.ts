"use server";

import { createClient } from "@/lib/supabase/server";
import { serverError } from "@/lib/i18n/server-errors";
import { checkInterviewQuota } from "@/lib/auth/plan-limits";
import { getTemplate } from "@/lib/constants/interviews";
import { captureServer } from "@/lib/analytics-server";

const supabaseReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function startInterview(templateId: string) {
  if (!supabaseReady) { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Validate templateId against the known template set so the free-text
  // interview_template_id column can't hold arbitrary attacker-supplied values.
  if (!getTemplate(templateId)) { const t = await serverError(); return { error: t("sessionNotFound") }; }

  // Enforce the paid-tier interview quota at the row-creation layer, mirroring
  // the /api/ai-interview guard. Without this a free user (or a script) could
  // create unlimited in_progress sessions and bypass the limit.
  const quota = await checkInterviewQuota(user.id);
  if (!quota.allowed) {
    return {
      error: "quotaReached",
      quota: { used: quota.used, limit: quota.limit, nextRespawnDate: quota.nextRespawnDate },
    };
  }

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
  if (!supabaseReady) { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  // Fetch current responses
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("responses")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) { const t = await serverError(); return { error: t("sessionNotFound") }; }

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
  if (!supabaseReady) { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

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
  void captureServer(user.id, "interview_completed", {});
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
  if (!supabaseReady) { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

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
  if (!supabaseReady) { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { error } = await supabase
    .from("interview_sessions")
    .update({ generated_memory_id: memoryId })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
