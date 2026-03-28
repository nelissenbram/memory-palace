"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { INTERVIEW_TEMPLATES, WING_ID_TO_LABEL, getTemplatesByWing } from "@/lib/constants/interviews";
import type { InterviewTemplate } from "@/lib/constants/interviews";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface InterviewLibraryPanelProps {
  onClose: () => void;
  highlightWingId?: string | null;
}

const WING_ORDER = ["family", "travel", "childhood", "career", "creativity", "general"];

const difficultyColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  light: { bg: "#4A674118", text: "#6A8A62", labelKey: "difficultyLight" },
  medium: { bg: "#C17F5918", text: "#C17F59", labelKey: "difficultyMedium" },
  deep: { bg: "#7A5A9E18", text: "#9A7AB8", labelKey: "difficultyDeep" },
};

export default function InterviewLibraryPanel({ onClose, highlightWingId }: InterviewLibraryPanelProps) {
  const { t } = useTranslation("interviewLibrary");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { sessions, sessionsLoaded, loadHistory, startSession, resumeSession, setShowLibrary } = useInterviewStore();
  const [filter, setFilter] = useState<string>(highlightWingId || "all");
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => { const t = setTimeout(() => setFadeIn(true), 30); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!sessionsLoaded) loadHistory(); }, [sessionsLoaded, loadHistory]);

  // Build completion map: templateId -> session status
  const completionMap: Record<string, { status: string; sessionId: string }> = {};
  for (const s of sessions) {
    if (!completionMap[s.templateId] || s.status === "completed") {
      completionMap[s.templateId] = { status: s.status, sessionId: s.id };
    }
  }

  const filteredTemplates = filter === "all"
    ? INTERVIEW_TEMPLATES
    : getTemplatesByWing(filter);

  const handleStart = async (template: InterviewTemplate) => {
    const existing = completionMap[template.id];
    if (existing && existing.status === "in_progress") {
      await resumeSession(existing.sessionId);
    } else {
      await startSession(template.id);
    }
    setShowLibrary(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(42,34,24,.5)",
      backdropFilter: "blur(8px)", zIndex: 56,
      opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(480px, 95vw)",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
        overflowY: "auto",
        animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: `${T.color.linen}f0`, backdropFilter: "blur(16px)",
          padding: isMobile ? "1.25rem 1.25rem 1rem" : "1.5rem 1.75rem 1rem",
          borderBottom: `1px solid ${T.color.cream}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
                {t("title")}
              </h2>
              <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
                {t("subtitle")}
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

          {/* Wing filter tabs */}
          <div style={{ display: "flex", gap: "0.25rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
            <FilterTab label={t("all")} active={filter === "all"} onClick={() => setFilter("all")} />
            {WING_ORDER.map((wid) => (
              <FilterTab key={wid} label={WING_ID_TO_LABEL[wid] || wid} active={filter === wid} onClick={() => setFilter(wid)} highlight={wid === highlightWingId} />
            ))}
          </div>
        </div>

        {/* Templates list */}
        <div style={{ padding: isMobile ? "1rem 1.25rem" : "1.25rem 1.75rem" }}>
          {filter === "all" ? (
            WING_ORDER.map((wingId) => {
              const templates = getTemplatesByWing(wingId);
              if (!templates.length) return null;
              return (
                <div key={wingId} style={{ marginBottom: "1.75rem" }}>
                  <h3 style={{
                    fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                    color: T.color.walnut, margin: "0 0 0.75rem",
                    textTransform: "uppercase", letterSpacing: "0.03125rem",
                  }}>
                    {WING_ID_TO_LABEL[wingId]}
                  </h3>
                  {templates.map((tmpl) => (
                    <TemplateCard key={tmpl.id} template={tmpl} completion={completionMap[tmpl.id]} onStart={() => handleStart(tmpl)} isMobile={isMobile} t={t} />
                  ))}
                </div>
              );
            })
          ) : (
            filteredTemplates.map((tmpl) => (
              <TemplateCard key={tmpl.id} template={tmpl} completion={completionMap[tmpl.id]} onStart={() => handleStart(tmpl)} isMobile={isMobile} t={t} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick, highlight }: { label: string; active: boolean; onClick: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "0.5rem 0.875rem", borderRadius: "1rem", border: "none", whiteSpace: "nowrap",
      background: active ? T.color.charcoal : highlight ? `${T.color.terracotta}14` : T.color.warmStone,
      color: active ? "#FFF" : highlight ? T.color.terracotta : T.color.walnut,
      fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: active ? 600 : 400,
      cursor: "pointer", transition: "all 0.2s",
    }}>
      {label}
    </button>
  );
}

function TemplateCard({ template, completion, onStart, isMobile, t }: {
  template: InterviewTemplate;
  completion?: { status: string; sessionId: string };
  onStart: () => void;
  isMobile: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const diff = difficultyColors[template.difficulty];
  const isCompleted = completion?.status === "completed";
  const isInProgress = completion?.status === "in_progress";

  return (
    <div onClick={onStart} style={{
      padding: isMobile ? "1rem" : "1rem 1.25rem", borderRadius: "0.875rem",
      border: `1px solid ${isCompleted ? `${T.color.sage}30` : T.color.cream}`,
      background: isCompleted ? `${T.color.sage}06` : T.color.white,
      marginBottom: "0.625rem", cursor: "pointer",
      transition: "transform 0.15s, box-shadow 0.15s",
      display: "flex", gap: "0.875rem", alignItems: "flex-start",
    }}>
      <div style={{
        width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
        background: isCompleted ? `${T.color.sage}15` : T.color.warmStone,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.375rem", flexShrink: 0,
      }}>
        {isCompleted ? "\u2713" : template.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            color: T.color.charcoal, margin: 0,
          }}>
            {template.title}
          </h4>
          {isCompleted && (
            <span style={{
              fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
              color: T.color.sage, background: `${T.color.sage}15`,
              padding: "0.125rem 0.5rem", borderRadius: "0.5rem",
            }}>{t("done")}</span>
          )}
          {isInProgress && (
            <span style={{
              fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
              color: T.color.terracotta, background: `${T.color.terracotta}15`,
              padding: "0.125rem 0.5rem", borderRadius: "0.5rem",
            }}>{t("continueLabel")}</span>
          )}
        </div>

        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
          lineHeight: 1.5, margin: "0 0 0.5rem", overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
        }}>
          {template.description}
        </p>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.6875rem",
            color: diff.text, background: diff.bg,
            padding: "0.125rem 0.5rem", borderRadius: "0.5rem",
          }}>
            {t(diff.labelKey)}
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.sandstone }}>
            ~{template.estimatedTotalMinutes} {t("minutes")}
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.sandstone }}>
            {template.questions.length} {t("questions")}
          </span>
        </div>
      </div>
    </div>
  );
}
