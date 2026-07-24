"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { getTemplate } from "@/lib/constants/interviews";
import type { InterviewSession } from "@/lib/stores/interviewStore";
import { InterviewIcon } from "@/components/ui/InterviewLibraryPanel";

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
  const { t: tTpl } = useTranslation("interviewLibrary");
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
    <div role="presentation" className="mp-ihp" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(42,34,24,.5)",
      backdropFilter: "blur(8px)", zIndex: 56,
      opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(440px, 92vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : "0.0625rem solid #E3D6BC" /* Atrium hairline */,
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)" /* Atrium S2 overlay */,
        overflowY: "auto",
        animation: "slideInRight 0.3s ease",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:translateX(0)}}
.mp-ihp button:focus-visible,.mp-ihp [role="button"]:focus-visible{outline:0.1875rem solid #D4AF37;outline-offset:0.1875rem}
@media (prefers-reduced-motion: reduce){.mp-ihp,.mp-ihp *{animation:none !important;transition:none !important}}`}</style>

        {/* Header */}
        <div style={{
          padding: isMobile ? "1.25rem" : "1.5rem 1.75rem",
          borderBottom: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36" /* Atrium ink */, margin: 0 }}>
              {t("title")}
            </h2>
            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */, margin: "0.25rem 0 0" }}>
              {completedSessions.length} {t("completed")} {completedSessions.length === 1 ? t("completedInterview") : t("completedInterviews")}
            </p>
          </div>
          <button onClick={onClose} aria-label={t("close") || "Close"} style={{
            width: isMobile ? "2.75rem" : "2.25rem", height: isMobile ? "2.75rem" : "2.25rem",
            borderRadius: isMobile ? "1.375rem" : "1.125rem",
            border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.warmStone,
            color: "#716A5E" /* Atrium muted */, fontSize: isMobile ? "0.9375rem" : "0.8125rem",
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
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                color: "#9A4F2A" /* Atrium terracotta glyph */, textTransform: "uppercase",
                letterSpacing: "0.12em", marginBottom: "0.625rem",
              }}>
                {t("inProgress")}
              </h3>
              {inProgressSessions.map((session) => {
                const template = getTemplate(session.templateId);
                return (
                  <div key={session.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleResume(session)} style={{
                    padding: "0.875rem 1rem", borderRadius: "1rem",
                    border: "0.0625rem solid #E7D9C4" /* Atrium terracotta tile border */,
                    background: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)" /* Atrium terracotta tileBg */,
                    marginBottom: "0.5rem", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {template ? <InterviewIcon templateId={template.id} wingId={template.wingId} size={22} /> : <span style={{ fontSize: "1.25rem" }}>{"\uD83D\uDCDD"}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium ink */ }}>
                        {template ? tTpl(template.titleKey) : session.templateId}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */ }}>
                        {t("answeredOf", { answered: String(session.responses.length), total: String(template?.questions.length || "?") })}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                      color: "#9A4F2A" /* Atrium terracotta glyph */, background: "rgba(154,79,42,0.11)" /* Atrium terracotta medallion */,
                      padding: "0.25rem 0.75rem", borderRadius: "2rem" /* Atrium pill */,
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
                  marginBottom: "0.625rem", borderRadius: "1rem",
                  border: `0.0625rem solid ${isExpanded ? "#7A8C64" /* Atrium sage */ : "#E3D6BC" /* Atrium hairline */}`,
                  background: T.color.white,
                  boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" /* Atrium S1 */,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}>
                  {/* Summary row */}
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setExpandedId(isExpanded ? null : session.id)} style={{
                    padding: "0.875rem 1rem", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <div style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                      background: "rgba(86,104,60,0.16)" /* Atrium sage medallion */,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.25rem", flexShrink: 0,
                    }}>
                      {template ? <InterviewIcon templateId={template.id} wingId={template.wingId} size={22} /> : "\u2713"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium ink */ }}>
                        {template ? tTpl(template.titleKey) : session.templateId}
                      </div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */, display: "flex", gap: "0.625rem" }}>
                        <span>{fmtDate(session.startedAt, locale)}</span>
                        {session.totalDurationSeconds > 0 && <span>{fmtDuration(session.totalDurationSeconds, t("minuteAbbr"), t("secondAbbr"))}</span>}
                        <span>{wordCount} {t("words")}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted */,
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
                      borderTop: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
                    }}>
                      {/* Narrative summary */}
                      {session.narrativeSummary && (
                        <div style={{ margin: "0.875rem 0" }}>
                          <p style={{
                            fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                            color: "#716A5E" /* Atrium muted */, textTransform: "uppercase",
                            letterSpacing: "0.12em", marginBottom: "0.5rem",
                          }}>
                            {t("narrative")}
                          </p>
                          <p style={{
                            fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36" /* Atrium ink */,
                            lineHeight: 1.4, margin: 0,
                            display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical" as any,
                            overflow: "hidden",
                          }}>
                            {session.narrativeSummary}
                          </p>
                        </div>
                      )}

                      {/* Individual responses */}
                      <p style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                        color: "#716A5E" /* Atrium muted */, textTransform: "uppercase",
                        letterSpacing: "0.12em", marginBottom: "0.5rem", marginTop: "0.875rem",
                      }}>
                        {t("responses")}
                      </p>
                      {session.responses.map((r, i) => {
                        const q = template?.questions.find((tq) => tq.id === r.questionId);
                        return (
                          <div key={i} style={{
                            padding: "0.625rem 0.75rem", borderRadius: "0.75rem",
                            background: T.color.warmStone, marginBottom: "0.375rem",
                          }}>
                            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium muted (walnut is non-text ink) */, fontWeight: 600, margin: "0 0 0.25rem" }}>
                              {q ? (tTpl(q.textKey) === q.textKey ? q.text : tTpl(q.textKey)) : t("questionFallback", { number: String(i + 1) })}
                            </p>
                            <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36" /* Atrium ink */, lineHeight: 1.4, margin: 0 }}>
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
                <p style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#403B36" /* Atrium ink */, marginBottom: "0.5rem" }}>
                  {t("noInterviewsTitle")}
                </p>
                <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E" /* Atrium muted */, lineHeight: 1.4 }}>
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
