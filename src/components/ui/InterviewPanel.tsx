"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Mem } from "@/lib/constants/defaults";

interface InterviewPanelProps {
  onClose: () => void;
  onCreateMemory?: (mem: Mem, wingId: string) => void;
}

// Format seconds to mm:ss
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InterviewPanel({ onClose, onCreateMemory }: InterviewPanelProps) {
  const isMobile = useIsMobile();
  const { userName } = useUserStore();
  const { t } = useTranslation("interview");
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
  const handleStartRecording = async () => {
    setApiError("");
    setTranscript("");
    recorder.reset();
    speech.resetTranscript();
    await recorder.startRecording();
    speech.startListening("nl-NL"); // Dutch primary, also picks up English
    setPhase("recording");
  };

  // Stop recording — grab the speech transcript directly (no API call needed)
  const handleStopRecording = async () => {
    await recorder.stopRecording();
    const spokenText = speech.stopListening();
    const finalText = spokenText || speech.transcript;

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
        return { questionText: q?.text || "", response: r.transcript };
      });

      const res = await fetch("/api/ai-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: currentTemplate?.id,
          questionId: question?.id,
          questionText: question?.text || "",
          userResponse: responseText,
          previousResponses,
          userName,
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
        return { questionText: q?.text || "", answer: r.transcript };
      });

      const res = await fetch("/api/ai-interview/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewTitle: currentTemplate.title,
          responses,
          userName,
          writingStyle,
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

    const title = suggestedTitle || currentTemplate.title;
    const hue = Math.floor(Math.random() * 360);
    const mem: Mem = {
      id: Date.now().toString(),
      title,
      hue,
      s: 40 + Math.floor(Math.random() * 15),
      l: 55 + Math.floor(Math.random() * 15),
      type: "voice",
      desc: narrative,
      voiceBlob: true,
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
  const bg = "linear-gradient(165deg, #2C2A26 0%, #3A352D 30%, #2E2921 60%, #1F1D19 100%)";
  const questionColor = "#F5F0E8";
  const bodyColor = "#D4CFC5";
  const accentColor = T.color.terracotta;
  const aiColor = T.color.sage;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") handleExit(); handleKeyDown(e); }} style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: bg,
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
        padding: isMobile ? "16px 20px" : "20px 32px",
        flexShrink: 0,
      }}>
        <div>
          {currentTemplate && phase !== "intro" && (
            <div style={{ fontFamily: T.font.body, fontSize: 12, color: "#9A917F", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {currentTemplate.title}
            </div>
          )}
          {phase !== "intro" && phase !== "summary" && phase !== "complete" && question && (
            <div style={{ fontFamily: T.font.body, fontSize: 13, color: "#7A7368", marginTop: 2 }}>
              {t("questionProgress", { current: String(progress.current), total: String(progress.total) })}
            </div>
          )}
        </div>
        <button onClick={handleExit} style={{
          width: isMobile ? 44 : 36, height: isMobile ? 44 : 36, borderRadius: isMobile ? 22 : 18,
          border: "1px solid #4A453D", background: "#3A352D",
          color: "#9A917F", fontSize: isMobile ? 16 : 14,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {"\u2715"}
        </button>
      </div>

      {/* Progress bar */}
      {phase !== "intro" && phase !== "complete" && currentTemplate && (
        <div style={{ padding: isMobile ? "0 20px" : "0 32px", flexShrink: 0 }}>
          <div style={{ height: 3, borderRadius: 2, background: "#3A352D", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
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
        padding: isMobile ? "20px 24px" : "32px 48px",
        overflowY: "auto",
        maxWidth: 640, width: "100%", margin: "0 auto",
      }}>

        {/* ═══ INTRO PHASE ═══ */}
        {phase === "intro" && currentTemplate && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.8s ease both" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>{currentTemplate.icon}</div>
            <h1 style={{
              fontFamily: T.font.display, fontSize: isMobile ? 28 : 36, fontWeight: 400,
              color: questionColor, lineHeight: 1.3, marginBottom: 16,
            }}>
              {currentTemplate.title}
            </h1>
            <p style={{
              fontFamily: T.font.body, fontSize: isMobile ? 16 : 18, color: bodyColor,
              lineHeight: 1.7, marginBottom: 32, maxWidth: 480,
            }}>
              {currentTemplate.description}
            </p>
            <p style={{
              fontFamily: T.font.display, fontSize: isMobile ? 16 : 18, color: "#B8AE9C",
              fontStyle: "italic", lineHeight: 1.6, marginBottom: 40,
            }}>
              {t("encouragement1")}<br />
              {t("encouragement2")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button onClick={handleStart} style={{
                padding: isMobile ? "18px 48px" : "16px 40px", borderRadius: 28,
                border: "none", background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: isMobile ? 18 : 16, fontWeight: 600,
                cursor: "pointer", boxShadow: `0 8px 32px ${accentColor}40`,
                transition: "transform 0.2s", minHeight: 56,
              }}>
                {t("beginInterview")}
              </button>
              <p style={{ fontFamily: T.font.body, fontSize: 13, color: "#7A7368" }}>
                {t("aboutMinutes", { minutes: String(currentTemplate.estimatedTotalMinutes), count: String(currentTemplate.questions.length) })}
              </p>
            </div>

            {/* Input mode toggle */}
            <div style={{ marginTop: 32, display: "flex", gap: 8, justifyContent: "center" }}>
              {(["voice", "text"] as const).map((mode) => (
                <button key={mode} onClick={() => setInputMode(mode)} style={{
                  padding: "10px 20px", borderRadius: 20,
                  border: inputMode === mode ? `1px solid ${accentColor}60` : "1px solid #4A453D",
                  background: inputMode === mode ? `${accentColor}18` : "transparent",
                  color: inputMode === mode ? accentColor : "#7A7368",
                  fontFamily: T.font.body, fontSize: 13, cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                  {mode === "voice" ? `\uD83C\uDF99\uFE0F ${t("speakAnswers")}` : `\u2328\uFE0F ${t("typeAnswers")}`}
                </button>
              ))}
            </div>

            {/* Writing style selector */}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontFamily: T.font.body, fontSize: 12, color: "#7A7368", marginBottom: 8 }}>
                {t("writingStyleTitle")}
              </p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {([
                  { id: "literary" as const, label: `\u270D\uFE0F ${t("styleLiterary")}`, desc: t("styleLiteraryDesc") },
                  { id: "balanced" as const, label: `\u2696\uFE0F ${t("styleBalanced")}`, desc: t("styleBalancedDesc") },
                  { id: "factual" as const, label: `\uD83D\uDCCB ${t("styleFactual")}`, desc: t("styleFactualDesc") },
                ]).map((s) => (
                  <button key={s.id} onClick={() => setWritingStyle(s.id)} title={s.desc} style={{
                    padding: "8px 16px", borderRadius: 16,
                    border: writingStyle === s.id ? `1px solid ${aiColor}60` : "1px solid #4A453D",
                    background: writingStyle === s.id ? `${aiColor}18` : "transparent",
                    color: writingStyle === s.id ? aiColor : "#7A7368",
                    fontFamily: T.font.body, fontSize: 12, cursor: "pointer",
                    transition: "all 0.2s",
                  }}>
                    {s.label}
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
              fontFamily: T.font.display, fontSize: isMobile ? 24 : 30, fontWeight: 400,
              color: questionColor, lineHeight: 1.4, marginBottom: 40,
              maxWidth: 520, margin: "0 auto 40px",
            }}>
              {question.text}
            </h2>

            {apiError && (
              <div role="alert" style={{
                fontFamily: T.font.body, fontSize: 14, color: "#D4A07A",
                background: "#D4A07A14", padding: "12px 20px", borderRadius: 12,
                marginBottom: 24, maxWidth: 400, margin: "0 auto 24px",
              }}>
                {apiError}
              </div>
            )}

            {inputMode === "voice" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <button onClick={handleStartRecording} aria-label={t("tapToRecord")} style={{
                  width: isMobile ? 88 : 80, height: isMobile ? 88 : 80, borderRadius: "50%",
                  border: "none", background: `linear-gradient(135deg, ${accentColor}, #D4926A)`,
                  color: "#FFF", fontSize: 28, cursor: "pointer",
                  boxShadow: `0 8px 32px ${accentColor}50`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minWidth: 80, minHeight: 80,
                }}>
                  {"\uD83C\uDF99\uFE0F"}
                </button>
                <p style={{ fontFamily: T.font.body, fontSize: 14, color: "#9A917F" }}>
                  {t("tapToRecord")}
                </p>
              </div>
            ) : (
              <div style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t("typeAnswerPlaceholder")}
                  rows={5}
                  style={{
                    width: "100%", padding: "16px 20px", borderRadius: 16,
                    border: "1px solid #4A453D", background: "#2E2921",
                    fontFamily: T.font.body, fontSize: isMobile ? 16 : 15,
                    color: bodyColor, lineHeight: 1.7, resize: "vertical",
                    outline: "none", boxSizing: "border-box",
                    minHeight: isMobile ? 160 : 120,
                  }}
                />
                <button onClick={handleSubmitText} disabled={!textInput.trim()} style={{
                  marginTop: 16, padding: "14px 32px", borderRadius: 24,
                  border: "none",
                  background: textInput.trim() ? `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})` : "#3A352D",
                  color: textInput.trim() ? "#FFF" : "#6A6358",
                  fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                  cursor: textInput.trim() ? "pointer" : "default",
                  transition: "all 0.2s", minHeight: 48,
                }}>
                  {t("shareAnswer")}
                </button>
              </div>
            )}

            {/* Skip button */}
            <button onClick={() => { skipQuestion(); setPhase("question"); setTranscript(""); setApiError(""); recorder.reset(); }} style={{
              marginTop: 32, padding: "8px 20px", borderRadius: 16,
              border: "none", background: "transparent",
              color: "#6A6358", fontFamily: T.font.body, fontSize: 13,
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
              fontFamily: T.font.display, fontSize: isMobile ? 22 : 26, fontWeight: 400,
              color: questionColor, lineHeight: 1.4, marginBottom: 32,
              maxWidth: 480, margin: "0 auto 32px", opacity: 0.7,
            }}>
              {question?.text}
            </h2>

            {/* Waveform visualization */}
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 24, height: 60, alignItems: "center" }}>
              {Array.from({ length: 20 }).map((_, i) => {
                const delay = i * 0.05;
                const height = 8 + recorder.audioLevel * 52 * (0.4 + 0.6 * Math.sin((Date.now() / 200 + i) * 0.8));
                return (
                  <div key={i} style={{
                    width: 4, borderRadius: 2,
                    height: Math.max(8, height),
                    background: `linear-gradient(180deg, #D4A07A, ${accentColor})`,
                    transition: "height 0.1s ease",
                    opacity: 0.6 + recorder.audioLevel * 0.4,
                  }} />
                );
              })}
            </div>

            {/* Timer */}
            <div style={{
              fontFamily: T.font.body, fontSize: 32, fontWeight: 300,
              color: questionColor, marginBottom: 8, fontVariantNumeric: "tabular-nums",
            }}>
              {fmtTime(recorder.duration)}
            </div>
            <p style={{ fontFamily: T.font.body, fontSize: 13, color: "#9A917F", marginBottom: 16 }}>
              {t("recording")}
            </p>

            {/* Live transcript preview */}
            {(speech.transcript || speech.interimTranscript) && (
              <div style={{
                padding: "12px 20px", borderRadius: 12,
                background: "#3A352D80", border: "1px solid #4A453D40",
                marginBottom: 24, maxWidth: 440, margin: "0 auto 24px",
                maxHeight: 120, overflowY: "auto",
              }}>
                <p style={{ fontFamily: T.font.body, fontSize: 14, color: bodyColor, lineHeight: 1.6, margin: 0 }}>
                  {speech.transcript}{" "}
                  <span style={{ color: "#7A736880" }}>{speech.interimTranscript}</span>
                </p>
              </div>
            )}

            {/* Stop button */}
            <button onClick={handleStopRecording} aria-label="Stop recording" style={{
              width: isMobile ? 88 : 80, height: isMobile ? 88 : 80, borderRadius: "50%",
              border: "3px solid #FFF3",
              background: `linear-gradient(135deg, #C75040, #A03030)`,
              color: "#FFF", fontSize: 24, cursor: "pointer",
              boxShadow: "0 8px 32px rgba(199, 80, 64, 0.4)",
              animation: "gentlePulse 2s ease infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 80, minHeight: 80,
            }}>
              {"\u23F9"}
            </button>

            {/* Pause/resume */}
            <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
              {recorder.isPaused ? (
                <button onClick={recorder.resumeRecording} style={smallBtn}>Resume</button>
              ) : (
                <button onClick={recorder.pauseRecording} style={smallBtn}>Pause</button>
              )}
            </div>
          </div>
        )}

        {/* ═══ AI-RESPONDING PHASE ═══ */}
        {phase === "ai-responding" && (
          <div style={{ textAlign: "center", animation: "fadeInSlow 0.4s ease both" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32, margin: "0 auto 24px",
              background: `${aiColor}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16,
                border: "3px solid transparent",
                borderTopColor: aiColor,
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
            <p style={{
              fontFamily: T.font.body, fontSize: 16, color: bodyColor,
            }}>
              {t("reflecting")}
            </p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ REVIEW AI RESPONSE ═══ */}
        {phase === "review-ai" && (
          <div style={{ animation: "fadeInSlow 0.6s ease both", width: "100%", maxWidth: 520, margin: "0 auto" }}>
            {/* Show user's transcript */}
            {transcript && (
              <div style={{
                padding: "16px 20px", borderRadius: 16,
                background: "#3A352D", border: "1px solid #4A453D",
                marginBottom: 24,
              }}>
                <p style={{ fontFamily: T.font.body, fontSize: 11, color: "#7A7368", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  {t("youSaid")}
                </p>
                <p style={{ fontFamily: T.font.body, fontSize: isMobile ? 15 : 14, color: bodyColor, lineHeight: 1.7, margin: 0 }}>
                  {transcript}
                </p>
              </div>
            )}

            {/* AI acknowledgment */}
            {aiAck && (
              <div style={{
                padding: "20px 24px", borderRadius: 16,
                background: `${aiColor}10`, border: `1px solid ${aiColor}30`,
                marginBottom: 16,
              }}>
                <p style={{
                  fontFamily: T.font.display, fontSize: isMobile ? 17 : 18,
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
                padding: "16px 20px", borderRadius: 16,
                background: `${aiColor}08`, border: `1px solid ${aiColor}20`,
                marginBottom: 32,
              }}>
                <p style={{ fontFamily: T.font.body, fontSize: 11, color: aiColor, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  {t("thoughtToExplore")}
                </p>
                <p style={{
                  fontFamily: T.font.display, fontSize: isMobile ? 18 : 20,
                  color: questionColor, lineHeight: 1.5, margin: 0, fontWeight: 400,
                }}>
                  {aiFollowUp}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button onClick={handleContinue} style={{
                padding: "14px 36px", borderRadius: 24, border: "none",
                background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s", minHeight: 48,
              }}>
                {isLastQuestion ? t("finishInterview") : t("nextQuestion")}
              </button>
            </div>
          </div>
        )}

        {/* ═══ SUMMARY PHASE ═══ */}
        {phase === "summary" && (
          <div style={{ animation: "fadeInSlow 0.6s ease both", width: "100%", maxWidth: 540, margin: "0 auto" }}>
            <h2 style={{
              fontFamily: T.font.display, fontSize: isMobile ? 24 : 28, fontWeight: 400,
              color: questionColor, textAlign: "center", marginBottom: 8,
            }}>
              {t("yourStory")}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: "#7A7368",
              textAlign: "center", marginBottom: 24,
            }}>
              {t("storyIntro")}
            </p>

            {!narrative ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 16, margin: "0 auto 16px",
                  border: `3px solid transparent`, borderTopColor: accentColor,
                  animation: "spin 0.8s linear infinite",
                }} />
                <p style={{ fontFamily: T.font.body, fontSize: 14, color: bodyColor }}>
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
                      width: "100%", minHeight: 300, padding: "20px 24px", borderRadius: 16,
                      border: `1px solid ${accentColor}40`, background: "#2E2921",
                      fontFamily: T.font.body, fontSize: isMobile ? 16 : 15,
                      color: bodyColor, lineHeight: 1.8, resize: "vertical",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "24px 28px", borderRadius: 16,
                    background: "#2E292180", border: "1px solid #4A453D",
                    maxHeight: 400, overflowY: "auto",
                  }}>
                    {narrative.split("\n\n").map((para, i) => (
                      <p key={i} style={{
                        fontFamily: T.font.body, fontSize: isMobile ? 16 : 15,
                        color: bodyColor, lineHeight: 1.8,
                        marginBottom: i < narrative.split("\n\n").length - 1 ? 16 : 0,
                        margin: i === 0 ? "0 0 16px" : i < narrative.split("\n\n").length - 1 ? "0 0 16px" : 0,
                      }}>
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
                  <button onClick={() => setEditingNarrative(!editingNarrative)} style={{
                    padding: "10px 20px", borderRadius: 20,
                    border: "1px solid #4A453D", background: "transparent",
                    color: "#9A917F", fontFamily: T.font.body, fontSize: 13,
                    cursor: "pointer",
                  }}>
                    {editingNarrative ? t("doneEditing") : t("editStory")}
                  </button>
                  <button onClick={handleComplete} style={{
                    padding: "14px 32px", borderRadius: 24, border: "none",
                    background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                    color: "#FFF", fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                    cursor: "pointer", minHeight: 48,
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
            <div style={{ fontSize: 56, marginBottom: 20 }}>{"\u2728"}</div>
            <h2 style={{
              fontFamily: T.font.display, fontSize: isMobile ? 26 : 32, fontWeight: 400,
              color: questionColor, marginBottom: 12,
            }}>
              {t("beautifully")}
            </h2>
            <p style={{
              fontFamily: T.font.body, fontSize: isMobile ? 16 : 17, color: bodyColor,
              lineHeight: 1.7, marginBottom: 8, maxWidth: 420, margin: "0 auto",
            }}>
              {t("storySaved", { title: currentTemplate.title })}
            </p>
            <p style={{
              fontFamily: T.font.display, fontSize: 15, color: "#9A917F",
              fontStyle: "italic", lineHeight: 1.6, margin: "16px auto 40px", maxWidth: 380,
            }}>
              {t("giftMessage")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              {onCreateMemory && (
                <button onClick={handleCreateMemory} style={{
                  padding: "16px 36px", borderRadius: 28, border: "none",
                  background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
                  color: "#FFF", fontFamily: T.font.body, fontSize: 16, fontWeight: 600,
                  cursor: "pointer", boxShadow: `0 8px 32px ${accentColor}40`,
                  minHeight: 56,
                }}>
                  {t("addToPalace")}
                </button>
              )}
              <button onClick={onClose} style={{
                padding: "12px 28px", borderRadius: 20,
                border: "1px solid #4A453D", background: "transparent",
                color: "#9A917F", fontFamily: T.font.body, fontSize: 14,
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
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            padding: "12px 24px", borderRadius: 16,
            background: "#5A303080", border: "1px solid #8A505050",
            fontFamily: T.font.body, fontSize: 14, color: "#E0A0A0",
            maxWidth: 400, textAlign: "center",
            animation: "fadeInSlow 0.3s ease",
          }}>
            {recorder.error}
          </div>
        )}
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 16,
  border: "1px solid #4A453D",
  background: "transparent",
  color: "#9A917F",
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};
