"use client";
import React from "react";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { INTERVIEW_TEMPLATES, WING_ID_TO_LABEL_KEY, getTemplatesByWing } from "@/lib/constants/interviews";
import type { InterviewTemplate } from "@/lib/constants/interviews";
import { useTranslation } from "@/lib/hooks/useTranslation";

// ─── Wing accent colors for icon strokes ───
const WING_ACCENT: Record<string, string> = {
  roots: "#C17F59",
  nest: "#B8926A",
  craft: "#8B7355",
  travel: "#4A6741",
  passions: "#9B6B8E",
  general: "#C4A962",
};

// ─── SVG icon paths keyed by template id (20x20 viewBox, stroke-based) ───
const ICON_PATHS: Record<string, React.ReactNode> = {
  // baseline — compass star
  baseline: <>
    <circle cx="10" cy="10" r="7" />
    <polygon points="10,4 11.2,8.8 16,10 11.2,11.2 10,16 8.8,11.2 4,10 8.8,8.8" />
  </>,
  // family-traditions — candle flame
  "family-traditions": <>
    <rect x="8" y="9" width="4" height="8" rx="0.5" />
    <line x1="10" y1="9" x2="10" y2="6.5" />
    <path d="M10,3 C11.2,4.2 11.5,5.5 10,6.5 C8.5,5.5 8.8,4.2 10,3Z" fill="currentColor" fillOpacity="0.25" />
    <line x1="7" y1="17" x2="13" y2="17" />
  </>,
  // growing-up — house
  "growing-up": <>
    <path d="M3,11 L10,4 L17,11" />
    <path d="M5,11 L5,17 L15,17 L15,11" />
    <rect x="8.5" y="13" width="3" height="4" rx="0.3" />
  </>,
  // parents-grandparents — two connected hearts
  "parents-grandparents": <>
    <path d="M6,8.5 C6,6.5 3,6 3,8.5 C3,10.5 6,12.5 6,12.5 C6,12.5 9,10.5 9,8.5 C9,6 6,6.5 6,8.5Z" />
    <path d="M14,8.5 C14,6.5 11,6 11,8.5 C11,10.5 14,12.5 14,12.5 C14,12.5 17,10.5 17,8.5 C17,6 14,6.5 14,8.5Z" />
    <path d="M6,12.5 Q10,16 14,12.5" strokeDasharray="1.5 1" />
  </>,
  // love-story — heart
  "love-story": <>
    <path d="M10,16 C10,16 3,12 3,7.5 C3,5 5.5,3.5 7.5,4.5 C8.8,5.1 10,6.5 10,6.5 C10,6.5 11.2,5.1 12.5,4.5 C14.5,3.5 17,5 17,7.5 C17,12 10,16 10,16Z" />
  </>,
  // raising-children — sprout
  "raising-children": <>
    <path d="M10,17 L10,10" />
    <path d="M10,10 C10,7 7,5 5,6 C5,6 6,9 10,10Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M10,8 C10,5 13,3 15,4 C15,4 14,7 10,8Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M8,17 L12,17" />
  </>,
  // greatest-adventure — mountain with globe hint
  "greatest-adventure": <>
    <circle cx="10" cy="10" r="7" />
    <ellipse cx="10" cy="10" rx="3" ry="7" />
    <line x1="3" y1="10" x2="17" y2="10" />
  </>,
  // places-of-heart — location pin
  "places-of-heart": <>
    <path d="M10,17 C10,17 15,12 15,8 C15,5.2 12.8,3 10,3 C7.2,3 5,5.2 5,8 C5,12 10,17 10,17Z" />
    <circle cx="10" cy="8" r="2" />
  </>,
  // travel-wisdom — compass
  "travel-wisdom": <>
    <circle cx="10" cy="10" r="7" />
    <polygon points="10,5 11,9 10,10 9,9" fill="currentColor" fillOpacity="0.3" />
    <polygon points="10,15 9,11 10,10 11,11" />
    <polygon points="5,10 9,9 10,10 9,11" />
    <polygon points="15,10 11,11 10,10 11,9" fill="currentColor" fillOpacity="0.3" />
  </>,
  // early-memories — sparkle star
  "early-memories": <>
    <path d="M10,2 L11,8 L17,10 L11,12 L10,18 L9,12 L3,10 L9,8Z" />
    <line x1="15" y1="3" x2="16" y2="5" />
    <line x1="16" y1="3" x2="15" y2="5" />
  </>,
  // school-days — open book
  "school-days": <>
    <path d="M10,6 C10,6 7,4 3,5 L3,16 C7,15 10,17 10,17" />
    <path d="M10,6 C10,6 13,4 17,5 L17,16 C13,15 10,17 10,17" />
    <line x1="10" y1="6" x2="10" y2="17" />
  </>,
  // dreams-and-play — cloud
  "dreams-and-play": <>
    <path d="M5,14 C3,14 2,12.5 2.5,11 C1.5,10 2,8 4,8 C4,6 6,4 8.5,5 C9.5,3.5 12,3 14,5 C16,4.5 18,6 17.5,8.5 C18.5,9.5 18,12 16,12.5 C16.5,14 15,15 13,14.5" />
    <path d="M6,14 L14,14" />
  </>,
  // lifes-work — trophy
  "lifes-work": <>
    <path d="M6,4 L14,4 L13,10 C13,12 11,13 10,13 C9,13 7,12 7,10Z" />
    <line x1="10" y1="13" x2="10" y2="15" />
    <line x1="7" y1="15" x2="13" y2="15" />
    <path d="M6,4 C6,4 4,4 4,6 C4,8 6,8 6,8" />
    <path d="M14,4 C14,4 16,4 16,6 C16,8 14,8 14,8" />
  </>,
  // mentors-lessons — lantern
  "mentors-lessons": <>
    <rect x="8" y="3" width="4" height="1.5" rx="0.3" />
    <path d="M7,6 L7,4.5 L13,4.5 L13,6" />
    <path d="M7,6 C6,9 6,12 8,14 L12,14 C14,12 14,9 13,6Z" />
    <line x1="10" y1="8" x2="10" y2="12" />
    <line x1="8" y1="14" x2="12" y2="14" />
    <line x1="8.5" y1="15.5" x2="11.5" y2="15.5" />
  </>,
  // turning-points — forking path
  "turning-points": <>
    <path d="M10,17 L10,10" />
    <path d="M10,10 C10,8 7,5 5,3" />
    <path d="M10,10 C10,8 13,5 15,3" />
    <polyline points="3.5,5 5,3 6.5,4.5" />
    <polyline points="13.5,4.5 15,3 16.5,5" />
  </>,
  // creative-spirit — palette with brush
  "creative-spirit": <>
    <path d="M10,3 C5,3 2,7 3,12 C4,16 8,17 10,15 C11,14 10,12 9,12 C7,12 7,14 8,15 C5,16 3,13 3.5,9 C4,6 7,4 10,4 C14,4 17,8 16,13 C15.5,15 14,16 12,16" />
    <circle cx="7" cy="8" r="1" fill="currentColor" fillOpacity="0.25" />
    <circle cx="10" cy="6.5" r="1" fill="currentColor" fillOpacity="0.25" />
    <circle cx="13" cy="8" r="1" fill="currentColor" fillOpacity="0.25" />
  </>,
  // inspiration — lightbulb with spark
  inspiration: <>
    <path d="M7,11 C5.5,9.5 5,7.5 6,5.5 C7,3.5 9,3 10,3 C11,3 13,3.5 14,5.5 C15,7.5 14.5,9.5 13,11 L13,13 L7,13Z" />
    <line x1="7.5" y1="14.5" x2="12.5" y2="14.5" />
    <line x1="8" y1="16" x2="12" y2="16" />
    <line x1="10" y1="7" x2="10" y2="10" />
    <line x1="8.5" y1="8.5" x2="10" y2="10" />
    <line x1="11.5" y1="8.5" x2="10" y2="10" />
  </>,
  // life-wisdom — tree/leaf
  "life-wisdom": <>
    <path d="M10,17 L10,11" />
    <path d="M10,11 C10,7 6,4 4,5 C3,8 5,10 10,11Z" fill="currentColor" fillOpacity="0.12" />
    <path d="M10,9 C10,5 14,2 16,3 C17,6 15,8 10,9Z" fill="currentColor" fillOpacity="0.12" />
    <path d="M10,14 C8,14 7,13 7,13" />
    <path d="M10,13 C12,13 13,12 13,12" />
  </>,
  // legacy-letter — scroll/envelope
  "legacy-letter": <>
    <rect x="3" y="5" width="14" height="10" rx="1" />
    <polyline points="3,5 10,11 17,5" />
    <line x1="3" y1="15" x2="7" y2="11" />
    <line x1="17" y1="15" x2="13" y2="11" />
  </>,
  // meaning-of-it-all — seedling/tree of life
  "meaning-of-it-all": <>
    <path d="M10,17 L10,9" />
    <circle cx="10" cy="6.5" r="4.5" />
    <path d="M10,9 C8,7 7,5.5 8,4" />
    <path d="M10,8 C12,6 13,4.5 12,3.5" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </>,
};

/** Renders an SVG icon for interview templates, matching the warm Tuscan line-art style. */
export function InterviewIcon({ templateId, wingId, size = 20 }: { templateId: string; wingId: string; size?: number }) {
  const color = WING_ACCENT[wingId] || WING_ACCENT.general;
  const paths = ICON_PATHS[templateId];
  if (!paths) {
    // Fallback: generic star
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20"
        fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10,2 L11,8 L17,10 L11,12 L10,18 L9,12 L3,10 L9,8Z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20"
      fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round"
      style={{ color }}>
      {paths}
    </svg>
  );
}

/** Completed checkmark icon in sage green. */
function CompletedCheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20"
      fill="none" stroke="#4A6741" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" strokeWidth={1.25} />
      <polyline points="6.5,10 9,12.5 13.5,7.5" />
    </svg>
  );
}

interface InterviewLibraryPanelProps {
  onClose: () => void;
  highlightWingId?: string | null;
}

const WING_ORDER = ["roots", "nest", "craft", "travel", "passions", "general"];

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
              <FilterTab key={wid} label={t(WING_ID_TO_LABEL_KEY[wid] || wid)} active={filter === wid} onClick={() => setFilter(wid)} highlight={wid === highlightWingId} />
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
                    {t(WING_ID_TO_LABEL_KEY[wingId] || wingId)}
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
      padding: "0.5rem 0.875rem", borderRadius: "1rem", border: "none", whiteSpace: "nowrap", minHeight: "2.75rem",
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
        flexShrink: 0,
      }}>
        {isCompleted
          ? <CompletedCheckIcon size={22} />
          : <InterviewIcon templateId={template.id} wingId={template.wingId} size={22} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            color: T.color.charcoal, margin: 0,
          }}>
            {t(template.titleKey)}
          </h4>
          {isCompleted && (
            <>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                color: T.color.sage, background: `${T.color.sage}15`,
                padding: "0.125rem 0.5rem", borderRadius: "0.5rem",
              }}>{t("done")}</span>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                color: T.color.terracotta, background: `${T.color.terracotta}15`,
                padding: "0.125rem 0.5rem", borderRadius: "0.5rem",
              }}>{t("retake")}</span>
            </>
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
          {t(template.descKey)}
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
