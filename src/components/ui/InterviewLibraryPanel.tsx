"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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
      <div onClick={(e) => e.stopPropagation()} style={{
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
          padding: isMobile ? "20px 20px 16px" : "24px 28px 16px",
          borderBottom: `1px solid ${T.color.cream}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: T.font.display, fontSize: 24, fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
                {t("title")}
              </h2>
              <p style={{ fontFamily: T.font.body, fontSize: 13, color: T.color.muted, margin: "4px 0 0" }}>
                {t("subtitle")}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: isMobile ? 44 : 36, height: isMobile ? 44 : 36,
              borderRadius: isMobile ? 22 : 18,
              border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
              color: T.color.muted, fontSize: isMobile ? 16 : 14,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 44, minHeight: 44,
            }}>
              {"\u2715"}
            </button>
          </div>

          {/* Wing filter tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
            <FilterTab label={t("all")} active={filter === "all"} onClick={() => setFilter("all")} />
            {WING_ORDER.map((wid) => (
              <FilterTab key={wid} label={WING_ID_TO_LABEL[wid] || wid} active={filter === wid} onClick={() => setFilter(wid)} highlight={wid === highlightWingId} />
            ))}
          </div>
        </div>

        {/* Templates list */}
        <div style={{ padding: isMobile ? "16px 20px" : "20px 28px" }}>
          {filter === "all" ? (
            WING_ORDER.map((wingId) => {
              const templates = getTemplatesByWing(wingId);
              if (!templates.length) return null;
              return (
                <div key={wingId} style={{ marginBottom: 28 }}>
                  <h3 style={{
                    fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
                    color: T.color.walnut, margin: "0 0 12px",
                    textTransform: "uppercase", letterSpacing: "0.5px",
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
      padding: "8px 14px", borderRadius: 16, border: "none", whiteSpace: "nowrap",
      background: active ? T.color.charcoal : highlight ? `${T.color.terracotta}14` : T.color.warmStone,
      color: active ? "#FFF" : highlight ? T.color.terracotta : T.color.walnut,
      fontFamily: T.font.body, fontSize: 12, fontWeight: active ? 600 : 400,
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
      padding: isMobile ? "16px" : "16px 20px", borderRadius: 14,
      border: `1px solid ${isCompleted ? `${T.color.sage}30` : T.color.cream}`,
      background: isCompleted ? `${T.color.sage}06` : T.color.white,
      marginBottom: 10, cursor: "pointer",
      transition: "transform 0.15s, box-shadow 0.15s",
      display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: isCompleted ? `${T.color.sage}15` : T.color.warmStone,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>
        {isCompleted ? "\u2713" : template.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
            color: T.color.charcoal, margin: 0,
          }}>
            {template.title}
          </h4>
          {isCompleted && (
            <span style={{
              fontFamily: T.font.body, fontSize: 10, fontWeight: 600,
              color: T.color.sage, background: `${T.color.sage}15`,
              padding: "2px 8px", borderRadius: 8,
            }}>{t("done")}</span>
          )}
          {isInProgress && (
            <span style={{
              fontFamily: T.font.body, fontSize: 10, fontWeight: 600,
              color: T.color.terracotta, background: `${T.color.terracotta}15`,
              padding: "2px 8px", borderRadius: 8,
            }}>{t("continueLabel")}</span>
          )}
        </div>

        <p style={{
          fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
          lineHeight: 1.5, margin: "0 0 8px", overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
        }}>
          {template.description}
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            fontFamily: T.font.body, fontSize: 11,
            color: diff.text, background: diff.bg,
            padding: "2px 8px", borderRadius: 8,
          }}>
            {t(diff.labelKey)}
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.sandstone }}>
            ~{template.estimatedTotalMinutes} {t("minutes")}
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.sandstone }}>
            {template.questions.length} {t("questions")}
          </span>
        </div>
      </div>
    </div>
  );
}
