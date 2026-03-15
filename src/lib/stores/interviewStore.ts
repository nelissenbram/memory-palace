import { create } from "zustand";
import {
  startInterview,
  saveResponse,
  completeInterview,
  fetchInterviewSessions,
  fetchInterviewSession,
} from "@/lib/auth/interview-actions";
import { getTemplate } from "@/lib/constants/interviews";
import type { InterviewTemplate, InterviewQuestion } from "@/lib/constants/interviews";

export interface InterviewResponse {
  questionId: string;
  audioUrl: string | null;
  transcript: string;
  aiAcknowledgment?: string;
  aiFollowUp?: string;
  suggestedTitle?: string;
  answeredAt: string;
}

export interface InterviewSession {
  id: string;
  templateId: string;
  status: "in_progress" | "completed" | "abandoned";
  responses: InterviewResponse[];
  narrativeSummary: string | null;
  generatedMemoryId: string | null;
  metadata: Record<string, any>;
  startedAt: string;
  completedAt: string | null;
  totalDurationSeconds: number;
}

interface InterviewState {
  // Current session
  currentSession: InterviewSession | null;
  currentTemplate: InterviewTemplate | null;
  currentQuestionIndex: number;
  isFollowUp: boolean; // whether we're showing an AI follow-up vs a template question

  // History
  sessions: InterviewSession[];
  sessionsLoaded: boolean;

  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  transcript: string;
  isTranscribing: boolean;
  isAiResponding: boolean;

  // UI state
  showLibrary: boolean;
  showHistory: boolean;
  showInterview: boolean;
  inputMode: "voice" | "text";

  // Actions
  setShowLibrary: (v: boolean) => void;
  setShowHistory: (v: boolean) => void;
  setShowInterview: (v: boolean) => void;
  setInputMode: (m: "voice" | "text") => void;
  setIsRecording: (v: boolean) => void;
  setIsPaused: (v: boolean) => void;
  setTranscript: (t: string) => void;
  setIsTranscribing: (v: boolean) => void;
  setIsAiResponding: (v: boolean) => void;

  // Session actions
  startSession: (templateId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  nextQuestion: () => void;
  skipQuestion: () => void;
  saveCurrentResponse: (audioUrl: string | null, transcript: string, aiData?: { acknowledgment?: string; followUp?: string; suggestedTitle?: string }) => Promise<void>;
  answerFollowUp: () => void;
  completeCurrentSession: (narrativeSummary: string) => Promise<void>;
  abandonSession: () => void;
  loadHistory: () => Promise<void>;

  // Helpers
  getCurrentQuestion: () => InterviewQuestion | null;
  getProgress: () => { current: number; total: number };
}

const RESUME_KEY = "mp_interview_session";

export const useInterviewStore = create<InterviewState>((set, get) => ({
  currentSession: null,
  currentTemplate: null,
  currentQuestionIndex: 0,
  isFollowUp: false,

  sessions: [],
  sessionsLoaded: false,

  isRecording: false,
  isPaused: false,
  transcript: "",
  isTranscribing: false,
  isAiResponding: false,

  showLibrary: false,
  showHistory: false,
  showInterview: false,
  inputMode: "voice",

  setShowLibrary: (v) => set({ showLibrary: v }),
  setShowHistory: (v) => set({ showHistory: v }),
  setShowInterview: (v) => set({ showInterview: v }),
  setInputMode: (m) => set({ inputMode: m }),
  setIsRecording: (v) => set({ isRecording: v }),
  setIsPaused: (v) => set({ isPaused: v }),
  setTranscript: (t) => set({ transcript: t }),
  setIsTranscribing: (v) => set({ isTranscribing: v }),
  setIsAiResponding: (v) => set({ isAiResponding: v }),

  startSession: async (templateId) => {
    const template = getTemplate(templateId);
    if (!template) return;

    const result = await startInterview(templateId);
    if (result.error || !result.session) {
      console.error("Failed to start interview:", result.error);
      return;
    }

    const session: InterviewSession = {
      id: result.session.id,
      templateId,
      status: "in_progress",
      responses: [],
      narrativeSummary: null,
      generatedMemoryId: null,
      metadata: {},
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalDurationSeconds: 0,
    };

    try { localStorage.setItem(RESUME_KEY, session.id); } catch {}

    set({
      currentSession: session,
      currentTemplate: template,
      currentQuestionIndex: 0,
      isFollowUp: false,
      transcript: "",
      showInterview: true,
      showLibrary: false,
    });
  },

  resumeSession: async (sessionId) => {
    const result = await fetchInterviewSession(sessionId);
    if (result.error || !result.session) return;

    const s = result.session;
    const template = getTemplate(s.interview_template_id);
    if (!template) return;

    const responses: InterviewResponse[] = (s.responses || []).map((r: any) => ({
      questionId: r.questionId,
      audioUrl: r.audioUrl,
      transcript: r.transcript,
      aiAcknowledgment: r.aiAcknowledgment,
      aiFollowUp: r.aiFollowUp,
      suggestedTitle: r.suggestedTitle,
      answeredAt: r.answeredAt,
    }));

    const session: InterviewSession = {
      id: s.id,
      templateId: s.interview_template_id,
      status: s.status,
      responses,
      narrativeSummary: s.narrative_summary,
      generatedMemoryId: s.generated_memory_id,
      metadata: s.metadata || {},
      startedAt: s.started_at,
      completedAt: s.completed_at,
      totalDurationSeconds: s.total_duration_seconds || 0,
    };

    // Find the next unanswered question
    const answeredIds = new Set(responses.map((r) => r.questionId));
    let nextIndex = template.questions.findIndex((q) => !answeredIds.has(q.id));
    if (nextIndex === -1) nextIndex = template.questions.length;

    set({
      currentSession: session,
      currentTemplate: template,
      currentQuestionIndex: nextIndex,
      isFollowUp: false,
      transcript: "",
      showInterview: true,
      showLibrary: false,
    });
  },

  nextQuestion: () => {
    const { currentTemplate, currentQuestionIndex, isFollowUp } = get();
    if (!currentTemplate) return;

    if (isFollowUp) {
      // Move from follow-up to the next template question
      set({ isFollowUp: false, transcript: "" });
    } else {
      // Move to the next template question
      set({ currentQuestionIndex: currentQuestionIndex + 1, isFollowUp: false, transcript: "" });
    }
  },

  skipQuestion: () => {
    const { currentTemplate, currentQuestionIndex } = get();
    if (!currentTemplate) return;
    set({ currentQuestionIndex: currentQuestionIndex + 1, isFollowUp: false, transcript: "" });
  },

  saveCurrentResponse: async (audioUrl, transcript, aiData) => {
    const { currentSession, currentTemplate, currentQuestionIndex } = get();
    if (!currentSession || !currentTemplate) return;

    const question = currentTemplate.questions[currentQuestionIndex];
    if (!question) return;

    const response: InterviewResponse = {
      questionId: question.id,
      audioUrl,
      transcript,
      aiAcknowledgment: aiData?.acknowledgment,
      aiFollowUp: aiData?.followUp,
      suggestedTitle: aiData?.suggestedTitle,
      answeredAt: new Date().toISOString(),
    };

    const updatedResponses = [...currentSession.responses, response];
    set({
      currentSession: { ...currentSession, responses: updatedResponses },
      isFollowUp: !!aiData?.followUp,
    });

    // Persist to DB
    await saveResponse(currentSession.id, question.id, audioUrl, transcript);
  },

  answerFollowUp: () => {
    // After answering a follow-up, move to the next template question
    const { currentQuestionIndex } = get();
    set({ currentQuestionIndex: currentQuestionIndex + 1, isFollowUp: false, transcript: "" });
  },

  completeCurrentSession: async (narrativeSummary) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const updated = {
      ...currentSession,
      status: "completed" as const,
      narrativeSummary,
      completedAt: new Date().toISOString(),
    };

    set({ currentSession: updated });

    await completeInterview(currentSession.id, narrativeSummary);

    try { localStorage.removeItem(RESUME_KEY); } catch {}
  },

  abandonSession: () => {
    set({
      currentSession: null,
      currentTemplate: null,
      currentQuestionIndex: 0,
      isFollowUp: false,
      transcript: "",
      showInterview: false,
    });
    try { localStorage.removeItem(RESUME_KEY); } catch {}
  },

  loadHistory: async () => {
    const result = await fetchInterviewSessions();
    if (!result.sessions) return;

    const sessions: InterviewSession[] = result.sessions.map((s: any) => ({
      id: s.id,
      templateId: s.interview_template_id,
      status: s.status,
      responses: s.responses || [],
      narrativeSummary: s.narrative_summary,
      generatedMemoryId: s.generated_memory_id,
      metadata: s.metadata || {},
      startedAt: s.started_at,
      completedAt: s.completed_at,
      totalDurationSeconds: s.total_duration_seconds || 0,
    }));

    set({ sessions, sessionsLoaded: true });
  },

  getCurrentQuestion: () => {
    const { currentTemplate, currentQuestionIndex } = get();
    if (!currentTemplate) return null;
    return currentTemplate.questions[currentQuestionIndex] || null;
  },

  getProgress: () => {
    const { currentTemplate, currentQuestionIndex } = get();
    if (!currentTemplate) return { current: 0, total: 0 };
    return { current: Math.min(currentQuestionIndex + 1, currentTemplate.questions.length), total: currentTemplate.questions.length };
  },
}));
