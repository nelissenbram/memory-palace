"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { getTemplate } from "@/lib/constants/interviews";
import type { InterviewSession } from "@/lib/stores/interviewStore";

interface InterviewHistoryPanelProps {
  onClose: () => void;
}

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function fmtDuration(sec: number, mAbbr: string, sAbbr: string): string {
  if (!sec) return "--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}${mAbbr} ${s}${sAbbr}` : `${s}${sAbbr}`;
}

export default function InterviewHistoryPanel({ onClose }: InterviewHistoryPanelProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("interviewHistory");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { sessions, sessionsLoaded, loadHistory, resumeSession, setShowHistory } = useInterviewStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => { const t = setTimeout(() => setFadeIn(true), 30); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!sessionsLoaded) loadHistory(); }, [sessionsLoaded, loadHistory]);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress");

  const handleResume = async (session: InterviewSession) => {
    await resumeSession(session.id);
    setShowHistory(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(42,34,24,.5)",
      backdropFilter: "blur(8px)", zIndex: 56,
      opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(440px, 92vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
        overflowY: "auto",
        animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{
          padding: isMobile ? "1.25rem" : "1.5rem 1.75rem",
          borderBottom: `1px solid ${T.color.cream}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
              {t("title")}
            </h2>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
              {completedSessions.length} {t("completed")} {completedSessions.length === 1 ? t("completedInterview") : t("completedInterviews")}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: isMobile ? "2.75rem" : "2.25rem", height: isMobile ? "2.75rem" : "2.25rem",
            borderRadius: isMobile ? "1.375rem" : "1.125rem",
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: isMobile ? "1rem" : "0.875rem",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: "2.75rem", minHeight: "2.75rem",
          }}>
            {"\u2715"}
          </button>
        </div>

        <div style={{ padding: isMobile ? "1rem 1.25rem" : "1.25rem 1.75rem" }}>
          {/* In-progress sessions */}
          {inProgressSessions.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                color: T.color.terracotta, textTransform: "uppercase",
                letterSpacing: "0.03125rem", marginBottom: "0.625rem",
              }}>
                {t("inProgress")}
              </h3>
              {inProgressSessions.map((session) => {
                const template = getTemplate(session.templateId);
                return (
                  <div key={session.id} onClick={() => handleResume(session)} style={{
                    padding: "0.875rem 1rem", borderRadius: "0.75rem",
                    border: `1px solid ${T.color.terracotta}30`,
                    background: `${T.color.terracotta}06`,
                    marginBottom: "0.5rem", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <div style={{ fontSize: "1.25rem" }}>{template?.icon || "\uD83D\uDCDD"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal }}>
                        {template?.title || session.templateId}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
                        {t("answeredOf", { answered: String(session.responses.length), total: String(template?.questions.length || "?") })}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                      color: T.color.terracotta, background: `${T.color.terracotta}15`,
                      padding: "0.25rem 0.75rem", borderRadius: "0.625rem",
                    }}>
                      {t("continue")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed sessions */}
          {completedSessions.length > 0 ? (
            completedSessions.map((session) => {
              const template = getTemplate(session.templateId);
              const isExpanded = expandedId === session.id;
              const wordCount = session.responses
                .reduce((sum, r) => sum + (r.transcript?.split(/\s+/).length || 0), 0);

              return (
                <div key={session.id} style={{
                  marginBottom: "0.625rem", borderRadius: "0.875rem",
                  border: `1px solid ${isExpanded ? T.color.sage + "40" : T.color.cream}`,
                  background: T.color.white,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}>
                  {/* Summary row */}
                  <div onClick={() => setExpandedId(isExpanded ? null : session.id)} style={{
                    padding: "0.875rem 1rem", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <div style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem",
                      background: `${T.color.sage}12`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.25rem", flexShrink: 0,
                    }}>
                      {template?.icon || "\u2713"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal }}>
                        {template?.title || session.templateId}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, display: "flex", gap: "0.625rem" }}>
                        <span>{fmtDate(session.startedAt, locale)}</span>
                        {session.totalDurationSeconds > 0 && <span>{fmtDuration(session.totalDurationSeconds, t("minuteAbbr"), t("secondAbbr"))}</span>}
                        <span>{wordCount} {t("words")}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.875rem", color: T.color.muted,
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}>
                      {"\u25BC"}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{
                      padding: "0 1rem 1rem",
                      borderTop: `1px solid ${T.color.cream}`,
                    }}>
                      {/* Narrative summary */}
                      {session.narrativeSummary && (
                        <div style={{ margin: "0.875rem 0" }}>
                          <p style={{
                            fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                            color: T.color.muted, textTransform: "uppercase",
                            letterSpacing: "0.03125rem", marginBottom: "0.5rem",
                          }}>
                            {t("narrative")}
                          </p>
                          <p style={{
                            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
                            lineHeight: 1.7, margin: 0,
                            display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical" as any,
                            overflow: "hidden",
                          }}>
                            {session.narrativeSummary}
                          </p>
                        </div>
                      )}

                      {/* Individual responses */}
                      <p style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                        color: T.color.muted, textTransform: "uppercase",
                        letterSpacing: "0.03125rem", marginBottom: "0.5rem", marginTop: "0.875rem",
                      }}>
                        {t("responses")}
                      </p>
                      {session.responses.map((r, i) => {
                        const q = template?.questions.find((tq) => tq.id === r.questionId);
                        return (
                          <div key={i} style={{
                            padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
                            background: T.color.warmStone, marginBottom: "0.375rem",
                          }}>
                            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, fontWeight: 600, margin: "0 0 0.25rem" }}>
                              {q?.text || t("questionFallback", { number: String(i + 1) })}
                            </p>
                            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, lineHeight: 1.6, margin: 0 }}>
                              {r.transcript || t("noTranscript")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            !inProgressSessions.length && (
              <div style={{ textAlign: "center", padding: "2.5rem 1.25rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{"\uD83C\uDF99\uFE0F"}</div>
                <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal, marginBottom: "0.5rem" }}>
                  {t("noInterviewsTitle")}
                </p>
                <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, lineHeight: 1.6 }}>
                  {t("noInterviewsDescription")}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
