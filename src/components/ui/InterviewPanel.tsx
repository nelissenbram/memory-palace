"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Mem } from "@/lib/constants/defaults";
import { InterviewIcon } from "@/components/ui/InterviewLibraryPanel";
import enMessages from "@/messages/en.json";

/** Dark interview palette — extracted so scattered hex values are referenced by name */
const DARK = {
  bg: "#2E2921",
  surface: "#3A352D",
  border: "#4A453D",
  text: "#F5F0E8",
  textMuted: "#D4CFC5",
  textDim: "#9A917F",
  textFaint: "#7A7368",
  textSubtle: "#6A6358",
  highlight: "#B8AE9C",
  accent: "#D4A07A",
  success: "#A8BFA0",
} as const;

/** Dark interview palette — ambient tones for the dark-mode interview UI */
const DARK_PALETTE = {
  bg: `linear-gradient(165deg, #2C2A26 0%, ${DARK.surface} 30%, ${DARK.bg} 60%, #1F1D19 100%)`,
  question: DARK.text,
  body: DARK.textMuted,
  label: DARK.textDim,
  sublabel: DARK.textFaint,
  dimText: DARK.textSubtle,
  softAccent: DARK.highlight,
  border: DARK.border,
  surface: DARK.surface,
  deep: DARK.bg,
  base: "#1F1D19",
  overlay: "#2C2A26",
  warmHighlight: DARK.accent,
  aiSoft: DARK.success,
} as const;

/* ── Inline SVG icons replacing emojis ── */
const iconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function MicIcon({ size = 16 }: { size?: number }) {
  return <svg {...iconProps} width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.375rem" }}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M7 13a5 5 0 0010 0" /><line x1="12" y1="18" x2="12" y2="21" /><line x1="9" y1="21" x2="15" y2="21" /></svg>;
}
function KeyboardIcon({ size = 16 }: { size?: number }) {
  return <svg {...iconProps} width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.375rem" }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="6" y1="9" x2="6" y2="9.01" /><line x1="10" y1="9" x2="10" y2="9.01" /><line x1="14" y1="9" x2="14" y2="9.01" /><line x1="18" y1="9" x2="18" y2="9.01" /><line x1="8" y1="13" x2="16" y2="13" /></svg>;
}
function PenIcon({ size = 16 }: { size?: number }) {
  return <svg {...iconProps} width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.375rem" }}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
}
function ScaleIcon({ size = 16 }: { size?: number }) {
  return <svg {...iconProps} width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.375rem" }}><path d="M12 3v18" /><path d="M5 8l7-5 7 5" /><path d="M3 13l2-5 2 5a4 4 0 01-4 0z" /><path d="M17 13l2-5 2 5a4 4 0 01-4 0z" /></svg>;
}
function ClipboardIcon({ size = 16 }: { size?: number }) {
  return <svg {...iconProps} width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.375rem" }}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="13" y2="15" /></svg>;
}
function StopIcon({ size = 16 }: { size?: number }) {
  return <svg {...iconProps} width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" /></svg>;
}
function SparklesIcon({ size = 48 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto" }}><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /><path d="M19 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" opacity="0.5" /><path d="M5 16l0.5 1.5L7 18l-1.5 0.5L5 20l-0.5-1.5L3 18l1.5-0.5z" opacity="0.4" /></svg>;
}

interface InterviewPanelProps {
  onClose: () => void;
  onCreateMemory?: (mem: Mem, wingId: string) => void;
}

// Resolve a translation key to English (for AI API calls)
const enTpl = (enMessages as any).interviewLibrary as Record<string, string> | undefined;
function enText(key: string): string { return enTpl?.[key] ?? key; }

// Format seconds to mm:ss
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InterviewPanel({ onClose, onCreateMemory }: InterviewPanelProps) {
  const isMobile = useIsMobile();
  const { userName } = useUserStore();
  const { t, locale } = useTranslation("interview");
  const { t: tc } = useTranslation("common");
  const { t: tTpl } = useTranslation("interviewLibrary");
  const { containerRef, handleKeyDown } = useFocusTrap(true);

  const {
    currentSession, currentTemplate, currentQuestionIndex, isFollowUp,
    isTranscribing, isAiResponding, inputMode,
    setInputMode, setIsTranscribing, setIsAiResponding,
    nextQuestion, skipQuestion, saveCurrentResponse, completeCurrentSession, abandonSession,
    getCurrentQuestion, getProgress,
  } = useInterviewStore();

  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition();

  // Local states
  const [phase, setPhase] = useState<"intro" | "question" | "recording" | "transcribing" | "ai-responding" | "review-ai" | "summary" | "complete">("intro");
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [aiAck, setAiAck] = useState("");
  const [aiFollowUp, setAiFollowUp] = useState("");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [writingStyle, setWritingStyle] = useState<"literary" | "balanced" | "factual">("balanced");
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [apiError, setApiError] = useState("");
  const [fadeIn, setFadeIn] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSummaryTriggered = useRef(false);
  const handleGenerateSummaryRef = useRef<() => void>(() => {});

  // Standalone recording timer (works even without MediaRecorder on mobile)
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (phase === "recording") {
      setRecordingSeconds(0);
      const start = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - start) / 1000));
      }, 250);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [phase]);

  const question = getCurrentQuestion();
  const progress = getProgress();
  const isLastQuestion = currentTemplate ? currentQuestionIndex >= currentTemplate.questions.length - 1 : false;
  const isComplete = currentTemplate ? currentQuestionIndex >= currentTemplate.questions.length : false;

  // Fade-in animation
  useEffect(() => { const t = setTimeout(() => setFadeIn(true), 50); return () => clearTimeout(t); }, []);

  // Auto-trigger summary when all questions have been answered
  useEffect(() => {
    if (phase === "question" && isComplete && !autoSummaryTriggered.current) {
      autoSummaryTriggered.current = true;
      handleGenerateSummaryRef.current();
    }
  }, [phase, isComplete]);

  // Start interview flow
  const handleStart = () => {
    setPhase("question");
  };

  // Begin recording — uses browser Speech Recognition for live transcription
  // On mobile, we skip MediaRecorder to avoid mic contention that prevents
  // SpeechRecognition from capturing words (voice detected but no transcript).
  const handleStartRecording = async () => {
    setApiError("");
    setTranscript("");
    recorder.reset();
    speech.resetTranscript();
    setPhase("recording");
    const speechLocale = localeDateCodes[locale as Locale] || navigator.language || "en-US";
    if (isMobile) {
      // Mobile: SpeechRecognition only — no MediaRecorder mic contention
      speech.startListening(speechLocale);
    } else {
      // Desktop: both MediaRecorder (for audio save) + SpeechRecognition
      await recorder.startRecording();
      await new Promise((r) => setTimeout(r, 300));
      speech.startListening(speechLocale);
    }
  };

  // Stop recording — grab the speech transcript directly (no API call needed)
  const handleStopRecording = async () => {
    const spokenText = await speech.stopListening();
    if (!isMobile) {
      await recorder.stopRecording();
    }
    const finalText = (spokenText || speech.transcript || "").trim();

    if (!finalText.trim()) {
      setApiError(t("noWordsDetected"));
      setInputMode("text");
      setPhase("question");
      return;
    }

    setTranscript(finalText);
    await processResponse(finalText);
  };

  // Submit text input
  const handleSubmitText = async () => {
    if (!textInput.trim()) return;
    setTranscript(textInput.trim());
    setTextInput("");
    await processResponse(textInput.trim());
  };

  // Send response to AI for acknowledgment + follow-up
  const processResponse = async (responseText: string) => {
    setPhase("ai-responding");
    setIsAiResponding(true);
    setApiError("");

    try {
      const previousResponses = (currentSession?.responses || []).map((r) => {
        const q = currentTemplate?.questions.find((tq) => tq.id === r.questionId);
        const qText = q ? (tTpl(q.textKey) !== q.textKey ? tTpl(q.textKey) : q.text) : "";
        return { questionText: qText, response: r.transcript };
      });

      // Send the translated question text so the AI sees the user's language
      const translatedQ = question ? (tTpl(question.textKey) !== question.textKey ? tTpl(question.textKey) : question.text) : "";

      const res = await fetch("/api/ai-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: currentTemplate?.id,
          questionId: question?.id,
          questionText: translatedQ,
          userResponse: responseText,
          previousResponses,
          userName,
          locale,
        }),
      });

      const data = await res.json();

      if (data.error) {
        // Save without AI but continue
        await saveCurrentResponse(recorder.audioUrl, responseText);
        if (isComplete || (currentQuestionIndex >= (currentTemplate?.questions.length || 0) - 1)) {
          handleGenerateSummary();
        } else {
          nextQuestion();
          setPhase("question");
        }
      } else {
        setAiAck(data.acknowledgment || "");
        setAiFollowUp(data.followUp || "");
        setSuggestedTitle(data.suggestedTitle || "");
        await saveCurrentResponse(recorder.audioUrl, responseText, {
          acknowledgment: data.acknowledgment,
          followUp: data.followUp,
          suggestedTitle: data.suggestedTitle,
        });
        setPhase("review-ai");
      }
    } catch {
      await saveCurrentResponse(recorder.audioUrl, responseText);
      nextQuestion();
      setPhase("question");
    } finally {
      setIsAiResponding(false);
    }
  };

  // Move to next question after reviewing AI response
  const handleContinue = () => {
    setAiAck("");
    setAiFollowUp("");
    setTranscript("");
    recorder.reset();

    if (currentQuestionIndex >= (currentTemplate?.questions.length || 0) - 1) {
      handleGenerateSummary();
    } else {
      nextQuestion();
      setPhase("question");
    }
  };

  // Generate narrative summary
  const handleGenerateSummary = async () => {
    setPhase("summary");

    if (!currentSession || !currentTemplate) {
      const basicSummary = (currentSession?.responses || [])
        .map((r) => r.transcript)
        .filter(Boolean)
        .join("\n\n");
      setNarrative(basicSummary || t("storiesRecorded"));
      return;
    }

    try {
      const responses = (currentSession.responses || []).map((r) => {
        const q = currentTemplate.questions.find((tq) => tq.id === r.questionId);
        const qText = q ? (tTpl(q.textKey) !== q.textKey ? tTpl(q.textKey) : q.text) : "";
        return { questionText: qText, answer: r.transcript };
      });

      // Send translated interview title instead of English-only
      const translatedTitle = tTpl(currentTemplate.titleKey) !== currentTemplate.titleKey
        ? tTpl(currentTemplate.titleKey)
        : enText(currentTemplate.titleKey);

      const res = await fetch("/api/ai-interview/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewTitle: translatedTitle,
          responses,
          userName,
          writingStyle,
          locale,
        }),
      });

      const data = await res.json();
      setNarrative(data.narrative || data.error || t("storiesRecorded"));
    } catch {
      const fallback = (currentSession.responses || []).map((r) => r.transcript).filter(Boolean).join("\n\n");
      setNarrative(fallback || t("storiesRecorded"));
    }
  };

  // Keep ref in sync for the auto-trigger effect
  handleGenerateSummaryRef.current = handleGenerateSummary;

  // Complete the interview
  const handleComplete = async () => {
    if (!currentSession || !currentTemplate) return;
    await completeCurrentSession(narrative);
    setPhase("complete");
  };

  // Create memory from interview
  const handleCreateMemory = () => {
    if (!currentSession || !currentTemplate || !onCreateMemory) return;

    const title = suggestedTitle || tTpl(currentTemplate.titleKey);
    const hue = Math.floor(Math.random() * 360);
    const mem: Mem = {
      id: Date.now().toString(),
      title,
      hue,
      s: 40 + Math.floor(Math.random() * 15),
      l: 55 + Math.floor(Math.random() * 15),
      type: "interview",
      desc: narrative,
      createdAt: new Date().toISOString(),
    };
    onCreateMemory(mem, currentTemplate.wingId);
    onClose();
  };

  const handleExit = () => {
    if (phase !== "intro" && phase !== "complete") {
      if (!confirm(t("leaveConfirm"))) return;
    }
    abandonSession();
    onClose();
  };

  // ═══ STYLES ═══
  const accentColor = T.color.terracotta;
  const aiColor = T.color.sage;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") handleExit(); handleKeyDown(e); }} style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: DARK_PALETTE.bg,
      opacity: fadeIn ? 1 : 0,
      transition: "opacity 0.6s ease",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes gentlePulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
        @keyframes waveBar { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes fadeInSlow { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isMobile ? "1rem 1.25rem" : "1.25rem 2rem",
        flexShrink: 0,
      }}>
        <div>
          {currentTemplate && phase !== "intro" && (
            <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: DARK_PALETTE.label, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {tTpl(currentTemplate.titleKey)}
            </div>
          )}
          {phase !== "intro" && phase !== "summary" && phase !== "complete" && question && (
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: DARK_PALETTE.sublabel, marginTop: "0.125rem" }}>
              {t("questionProgress", { current: String(progress.current), total: String(progress.total) })}
            </div>
          )}
        </div>
        <button onClick={handleExit} aria-label={tc("close")} style={{
          width: isMobile ? "2.75rem" : "2.25rem", height: isMobile ? "2.75rem" : "2.25rem", borderRadius: isMobile ? "1.375rem" : "1.125rem",
          border: `1px solid ${DARK_PALETTE.border}`, background: DARK_PALETTE.surface,
          color: DARK_PALETTE.label, fontSize: isMobile ? "1rem" : "0.875rem",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {"\u2715"}
        </button>
      </div>

      {/* Progress bar */}
      {phase !== "intro" && phase !== "complete" && currentTemplate && (
        <div style={{ padding: isMobile ? "0 1.25rem" : "0 2rem", flexShrink: 0 }}>
          <div style={{ height: "0.1875rem", borderRadius: "0.125rem", background: DARK_PALETTE.surface, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "0.125rem",
              background: `linear-gradient(90deg, ${accentColor}, ${T.color.walnut})`,
              width: `${(progress.current / progress.total) * 100}%`,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "1.25rem 1.5rem" : "2rem 3rem",
        overflowY: "auto",
        maxWidth: "40rem", width: "100%", margin: "0 auto",
      }}>

        {/* ═══ INTRO PHASE ═══ */}
        {phase === "intro" && currentTemplate && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.8s ease both" }}>
            <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "center" }}>
              <InterviewIcon templateId={currentTemplate.id} wingId={currentTemplate.wingId} size={48} />
            </div>
            <h1 style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1.75rem" : "2.25rem", fontWeight: 400,
              color: DARK_PALETTE.question, lineHeight: 1.3, marginBottom: "1rem",
            }}>
              {tTpl(currentTemplate.titleKey)}
            </h1>
            <p style={{
              fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "1.125rem", color: DARK_PALETTE.body,
              lineHeight: 1.7, marginBottom: "2rem", maxWidth: "30rem",
            }}>
              {tTpl(currentTemplate.descKey)}
            </p>
            <p style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1rem" : "1.125rem", color: DARK_PALETTE.softAccent,
              fontStyle: "italic", lineHeight: 1.6, marginBottom: "2.5rem",
            }}>
              {t("encouragement1")}<br />
              {t("encouragement2")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={handleStart} style={{
                padding: isMobile ? "1.125rem 3rem" : "1rem 2.5rem", borderRadius: "1.75rem",
                border: "none", background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: isMobile ? "1.125rem" : "1rem", fontWeight: 600,
                cursor: "pointer", boxShadow: `0 8px 32px ${accentColor}40`,
                transition: "transform 0.2s", minHeight: "3.5rem",
              }}>
                {t("beginInterview")}
              </button>
              <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: DARK_PALETTE.sublabel }}>
                {t("aboutMinutes", { minutes: String(currentTemplate.estimatedTotalMinutes), count: String(currentTemplate.questions.length) })}
              </p>
            </div>

            {/* Input mode toggle */}
            <div style={{ marginTop: "2rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              {(["voice", "text"] as const).map((mode) => (
                <button key={mode} onClick={() => setInputMode(mode)} style={{
                  padding: "0.625rem 1.25rem", borderRadius: "1.25rem",
                  border: inputMode === mode ? `1px solid ${accentColor}60` : "1px solid #4A453D",
                  background: inputMode === mode ? `${accentColor}18` : "transparent",
                  color: inputMode === mode ? accentColor : "#7A7368",
                  fontFamily: T.font.body, fontSize: "0.8125rem", cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                  {mode === "voice" ? <><MicIcon />{t("speakAnswers")}</> : <><KeyboardIcon />{t("typeAnswers")}</>}
                </button>
              ))}
            </div>

            {/* Writing style selector */}
            <div style={{ marginTop: "1.25rem" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: DARK_PALETTE.sublabel, marginBottom: "0.5rem" }}>
                {t("writingStyleTitle")}
              </p>
              <div style={{ display: "flex", gap: "0.375rem", justifyContent: "center" }}>
                {([
                  { id: "literary" as const, icon: <PenIcon />, label: t("styleLiterary"), desc: t("styleLiteraryDesc") },
                  { id: "balanced" as const, icon: <ScaleIcon />, label: t("styleBalanced"), desc: t("styleBalancedDesc") },
                  { id: "factual" as const, icon: <ClipboardIcon />, label: t("styleFactual"), desc: t("styleFactualDesc") },
                ]).map((s) => (
                  <button key={s.id} onClick={() => setWritingStyle(s.id)} title={s.desc} style={{
                    padding: "0.5rem 1rem", borderRadius: "1rem",
                    border: writingStyle === s.id ? `1px solid ${aiColor}60` : "1px solid #4A453D",
                    background: writingStyle === s.id ? `${aiColor}18` : "transparent",
                    color: writingStyle === s.id ? aiColor : "#7A7368",
                    fontFamily: T.font.body, fontSize: "0.75rem", cursor: "pointer",
                    transition: "all 0.2s",
                  }}>
                    {s.icon}{s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ QUESTION PHASE ═══ */}
        {phase === "question" && question && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.6s ease both", width: "100%" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.875rem", fontWeight: 400,
              color: DARK_PALETTE.question, lineHeight: 1.4, marginBottom: "2.5rem",
              maxWidth: "32.5rem", margin: "0 auto 2.5rem",
            }}>
              {tTpl(question.textKey) === question.textKey ? question.text : tTpl(question.textKey)}
            </h2>

            {apiError && (
              <div role="alert" style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: "#D4A07A",
                background: "#D4A07A14", padding: "0.75rem 1.25rem", borderRadius: "0.75rem",
                marginBottom: "1.5rem", maxWidth: "25rem", margin: "0 auto 1.5rem",
              }}>
                {apiError}
              </div>
            )}

            {inputMode === "voice" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <button onClick={handleStartRecording} aria-label={t("tapToRecord")} style={{
                  width: isMobile ? "5.5rem" : "5rem", height: isMobile ? "5.5rem" : "5rem", borderRadius: "50%",
                  border: "none", background: `linear-gradient(135deg, ${accentColor}, #D4926A)`,
                  color: "#FFF", fontSize: "1.75rem", cursor: "pointer",
                  boxShadow: `0 8px 32px ${accentColor}50`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minWidth: "5rem", minHeight: "5rem",
                }}>
                  <MicIcon size={28} />
                </button>
                <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: DARK_PALETTE.label }}>
                  {t("tapToRecord")}
                </p>
              </div>
            ) : (
              <div style={{ width: "100%", maxWidth: "30rem", margin: "0 auto" }}>
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t("typeAnswerPlaceholder")}
                  rows={5}
                  style={{
                    width: "100%", padding: "1rem 1.25rem", borderRadius: "1rem",
                    border: "1px solid #4A453D", background: "#2E2921",
                    fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.9375rem",
                    color: DARK_PALETTE.body, lineHeight: 1.7, resize: "vertical",
                    outline: "none", boxSizing: "border-box",
                    minHeight: isMobile ? "10rem" : "7.5rem",
                  }}
                />
                <button onClick={handleSubmitText} disabled={!textInput.trim()} style={{
                  marginTop: "1rem", padding: "0.875rem 2rem", borderRadius: "1.5rem",
                  border: "none",
                  background: textInput.trim() ? `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})` : "#3A352D",
                  color: textInput.trim() ? "#FFF" : "#6A6358",
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  cursor: textInput.trim() ? "pointer" : "default",
                  transition: "all 0.2s", minHeight: "3rem",
                }}>
                  {t("shareAnswer")}
                </button>
              </div>
            )}

            {/* Skip button */}
            <button onClick={() => { skipQuestion(); setPhase("question"); setTranscript(""); setApiError(""); recorder.reset(); }} style={{
              marginTop: "2rem", padding: "0.5rem 1.25rem", borderRadius: "1rem",
              border: "none", background: "transparent",
              color: DARK_PALETTE.dimText, fontFamily: T.font.body, fontSize: "0.8125rem",
              cursor: "pointer", transition: "color 0.2s",
            }}>
              {t("skipQuestion")}
            </button>
          </div>
        )}

        {/* ═══ RECORDING PHASE ═══ */}
        {phase === "recording" && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.4s ease both", width: "100%" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1.375rem" : "1.625rem", fontWeight: 400,
              color: DARK_PALETTE.question, lineHeight: 1.4, marginBottom: "2rem",
              maxWidth: "30rem", margin: "0 auto 2rem", opacity: 0.7,
            }}>
              {question ? (tTpl(question.textKey) === question.textKey ? question.text : tTpl(question.textKey)) : ""}
            </h2>

            {/* Waveform visualization */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.1875rem", marginBottom: "1.5rem", height: "3.75rem", alignItems: "center" }}>
              {Array.from({ length: 20 }).map((_, i) => {
                // On mobile (no MediaRecorder), simulate gentle pulse when listening
                const level = isMobile
                  ? (speech.isListening ? 0.3 + 0.15 * Math.sin((Date.now() / 400 + i) * 0.6) : 0)
                  : recorder.audioLevel;
                const height = 8 + level * 52 * (0.4 + 0.6 * Math.sin((Date.now() / 200 + i) * 0.8));
                return (
                  <div key={i} style={{
                    width: "0.25rem", borderRadius: "0.125rem",
                    height: Math.max(8, height),
                    background: `linear-gradient(180deg, #D4A07A, ${accentColor})`,
                    transition: "height 0.1s ease",
                    opacity: 0.6 + level * 0.4,
                  }} />
                );
              })}
            </div>

            {/* Timer */}
            <div style={{
              fontFamily: T.font.body, fontSize: "2rem", fontWeight: 300,
              color: DARK_PALETTE.question, marginBottom: "0.5rem", fontVariantNumeric: "tabular-nums",
            }}>
              {fmtTime(recordingSeconds)}
            </div>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: DARK_PALETTE.label, marginBottom: "1rem" }}>
              {t("recording")}
            </p>

            {/* Live transcript preview */}
            {(speech.transcript || speech.interimTranscript) && (
              <div style={{
                padding: "0.75rem 1.25rem", borderRadius: "0.75rem",
                background: "#3A352D80", border: "1px solid #4A453D40",
                marginBottom: "1.5rem", maxWidth: "27.5rem", margin: "0 auto 1.5rem",
                maxHeight: "7.5rem", overflowY: "auto",
              }}>
                <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: DARK_PALETTE.body, lineHeight: 1.6, margin: 0 }}>
                  {speech.transcript}{" "}
                  <span style={{ color: "#7A736880" }}>{speech.interimTranscript}</span>
                </p>
              </div>
            )}

            {/* Stop button */}
            <button onClick={handleStopRecording} aria-label={t("stopRecording")} style={{
              width: isMobile ? "5.5rem" : "5rem", height: isMobile ? "5.5rem" : "5rem", borderRadius: "50%",
              border: "3px solid #FFF3",
              background: `linear-gradient(135deg, #C75040, #A03030)`,
              color: "#FFF", fontSize: "1.5rem", cursor: "pointer",
              boxShadow: "0 8px 32px rgba(199, 80, 64, 0.4)",
              animation: "gentlePulse 2s ease infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: "5rem", minHeight: "5rem",
            }}>
              <StopIcon size={28} />
            </button>

            {/* Pause/resume (desktop only — mobile has no MediaRecorder) */}
            {!isMobile && (
              <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                {recorder.isPaused ? (
                  <button onClick={recorder.resumeRecording} style={smallBtn}>{t("resume")}</button>
                ) : (
                  <button onClick={recorder.pauseRecording} style={smallBtn}>{t("pause")}</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ AI-RESPONDING PHASE ═══ */}
        {phase === "ai-responding" && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.4s ease both" }}>
            <div style={{
              width: "4rem", height: "4rem", borderRadius: "2rem", margin: "0 auto 1.5rem",
              background: `${aiColor}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: "2rem", height: "2rem", borderRadius: "1rem",
                border: "3px solid transparent",
                borderTopColor: aiColor,
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: "1rem", color: DARK_PALETTE.body,
            }}>
              {t("reflecting")}
            </p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ REVIEW AI RESPONSE ═══ */}
        {phase === "review-ai" && (
          <div style={{ animation: "fadeInSlow 0.6s ease both", width: "100%", maxWidth: "32.5rem", margin: "0 auto" }}>
            {/* Show user's transcript */}
            {transcript && (
              <div style={{
                padding: "1rem 1.25rem", borderRadius: "1rem",
                background: "#3A352D", border: "1px solid #4A453D",
                marginBottom: "1.5rem",
              }}>
                <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: DARK_PALETTE.sublabel, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
                  {t("youSaid")}
                </p>
                <p style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.9375rem" : "0.875rem", color: DARK_PALETTE.body, lineHeight: 1.7, margin: 0 }}>
                  {transcript}
                </p>
              </div>
            )}

            {/* AI acknowledgment */}
            {aiAck && (
              <div style={{
                padding: "1.25rem 1.5rem", borderRadius: "1rem",
                background: `${aiColor}10`, border: `1px solid ${aiColor}30`,
                marginBottom: "1rem",
              }}>
                <p style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "1.0625rem" : "1.125rem",
                  fontStyle: "italic", color: "#A8BFA0",
                  lineHeight: 1.6, margin: 0,
                }}>
                  {aiAck}
                </p>
              </div>
            )}

            {/* AI follow-up */}
            {aiFollowUp && (
              <div style={{
                padding: "1rem 1.25rem", borderRadius: "1rem",
                background: `${aiColor}08`, border: `1px solid ${aiColor}20`,
                marginBottom: "2rem",
              }}>
                <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: aiColor, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
                  {t("thoughtToExplore")}
                </p>
                <p style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.25rem",
                  color: DARK_PALETTE.question, lineHeight: 1.5, margin: 0, fontWeight: 400,
                }}>
                  {aiFollowUp}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={handleContinue} style={{
                padding: "0.875rem 2.25rem", borderRadius: "1.5rem", border: "none",
                background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s", minHeight: "3rem",
              }}>
                {isLastQuestion ? t("finishInterview") : t("nextQuestion")}
              </button>
              <button onClick={() => {
                setTranscript(""); setApiError(""); recorder.reset(); speech.resetTranscript();
                setAiAck(""); setAiFollowUp("");
                setPhase("question");
              }} style={{
                padding: "0.5rem 1.25rem", borderRadius: "1rem", border: "none",
                background: "transparent", color: DARK_PALETTE.dimText,
                fontFamily: T.font.body, fontSize: "0.8125rem", cursor: "pointer",
                transition: "color 0.2s",
              }}>
                {t("recordAgain")}
              </button>
            </div>
          </div>
        )}

        {/* ═══ SUMMARY PHASE ═══ */}
        {phase === "summary" && (
          <div style={{ animation: "fadeInSlow 0.6s ease both", width: "100%", maxWidth: "33.75rem", margin: "0 auto" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem", fontWeight: 400,
              color: DARK_PALETTE.question, textAlign: "center", marginBottom: "0.5rem",
            }}>
              {t("yourStory")}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: DARK_PALETTE.sublabel,
              textAlign: "center", marginBottom: "1.5rem",
            }}>
              {t("storyIntro")}
            </p>

            {!narrative ? (
              <div style={{ textAlign: "center", padding: "2.5rem" }}>
                <div style={{
                  width: "2rem", height: "2rem", borderRadius: "1rem", margin: "0 auto 1rem",
                  border: `3px solid transparent`, borderTopColor: accentColor,
                  animation: "spin 0.8s linear infinite",
                }} />
                <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: DARK_PALETTE.body }}>
                  {t("weavingStories")}
                </p>
              </div>
            ) : (
              <>
                {editingNarrative ? (
                  <textarea
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    style={{
                      width: "100%", minHeight: "18.75rem", padding: "1.25rem 1.5rem", borderRadius: "1rem",
                      border: `1px solid ${accentColor}40`, background: "#2E2921",
                      fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.9375rem",
                      color: DARK_PALETTE.body, lineHeight: 1.8, resize: "vertical",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "1.5rem 1.75rem", borderRadius: "1rem",
                    background: "#2E292180", border: "1px solid #4A453D",
                    maxHeight: "25rem", overflowY: "auto",
                  }}>
                    {narrative.split("\n\n").map((para, i) => (
                      <p key={i} style={{
                        fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.9375rem",
                        color: DARK_PALETTE.body, lineHeight: 1.8,
                        marginBottom: i < narrative.split("\n\n").length - 1 ? "1rem" : 0,
                        margin: i === 0 ? "0 0 1rem" : i < narrative.split("\n\n").length - 1 ? "0 0 1rem" : 0,
                      }}>
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
                  <button onClick={() => setEditingNarrative(!editingNarrative)} style={{
                    padding: "0.625rem 1.25rem", borderRadius: "1.25rem",
                    border: "1px solid #4A453D", background: "transparent",
                    color: DARK_PALETTE.label, fontFamily: T.font.body, fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}>
                    {editingNarrative ? t("doneEditing") : t("editStory")}
                  </button>
                  <button onClick={handleComplete} style={{
                    padding: "0.875rem 2rem", borderRadius: "1.5rem", border: "none",
                    background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                    color: "#FFF", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                    cursor: "pointer", minHeight: "3rem",
                  }}>
                    {t("saveStory")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ COMPLETE PHASE ═══ */}
        {phase === "complete" && currentTemplate && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.8s ease both" }}>
            <div style={{ marginBottom: "1.25rem" }}><SparklesIcon size={56} /></div>
            <h2 style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1.625rem" : "2rem", fontWeight: 400,
              color: DARK_PALETTE.question, marginBottom: "0.75rem",
            }}>
              {t("beautifully")}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "1.0625rem", color: DARK_PALETTE.body,
              lineHeight: 1.7, marginBottom: "0.5rem", maxWidth: "26.25rem", margin: "0 auto",
            }}>
              {t("storySaved", { title: tTpl(currentTemplate.titleKey) })}
            </p>
            <p style={{
              fontFamily: T.font.display, fontSize: "0.9375rem", color: DARK_PALETTE.label,
              fontStyle: "italic", lineHeight: 1.6, margin: "1rem auto 2.5rem", maxWidth: "23.75rem",
            }}>
              {t("giftMessage")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
              {onCreateMemory && (
                <button onClick={handleCreateMemory} style={{
                  padding: "1rem 2.25rem", borderRadius: "1.75rem", border: "none",
                  background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                  color: "#FFF", fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
                  cursor: "pointer", boxShadow: `0 8px 32px ${accentColor}40`,
                  minHeight: "3.5rem",
                }}>
                  {t("addToPalace")}
                </button>
              )}
              <button onClick={onClose} style={{
                padding: "0.75rem 1.75rem", borderRadius: "1.25rem",
                border: "1px solid #4A453D", background: "transparent",
                color: DARK_PALETTE.label, fontFamily: T.font.body, fontSize: "0.875rem",
                cursor: "pointer",
              }}>
                {t("done")}
              </button>
            </div>
          </div>
        )}

        {/* Note: auto-trigger for last question handled by useEffect below */}

        {/* Recorder error */}
        {recorder.error && (
          <div style={{
            position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
            padding: "0.75rem 1.5rem", borderRadius: "1rem",
            background: "#5A303080", border: "1px solid #8A505050",
            fontFamily: T.font.body, fontSize: "0.875rem", color: "#E0A0A0",
            maxWidth: "25rem", textAlign: "center",
            animation: "fadeInSlow 0.3s ease",
          }}>
            {t("recorderError")}
          </div>
        )}
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  borderRadius: "1rem",
  border: "1px solid #4A453D",
  background: "transparent",
  color: DARK_PALETTE.label,
  fontFamily: T.font.body,
  fontSize: "0.8125rem",
  cursor: "pointer",
};
