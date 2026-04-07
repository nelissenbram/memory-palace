"use client";
import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

const STORAGE_KEY = "mp_getting_started";
const DISMISSED_KEY = "mp_getting_started_dismissed";
const ONBOARD_DATE_KEY = "mp_onboard_date";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: "upload_memory",
    label: "uploadFirst",
    description: "uploadFirstDesc",
    icon: "\u{1F4F7}",
  },
  {
    id: "complete_interview",
    label: "completeInterview",
    description: "completeInterviewDesc",
    icon: "\u{1F3A4}",
  },
  {
    id: "customize_room",
    label: "customizeRoom",
    description: "customizeRoomDesc",
    icon: "\u{1F3A8}",
  },
  {
    id: "share_room",
    label: "shareWithSomeone",
    description: "shareWithSomeoneDesc",
    icon: "\u{1F91D}",
  },
];

function getCompletedItems(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function isWithinFirstWeek(): boolean {
  try {
    const dateStr = localStorage.getItem(ONBOARD_DATE_KEY);
    if (!dateStr) {
      // Set onboard date now if not set
      localStorage.setItem(ONBOARD_DATE_KEY, new Date().toISOString());
      return true;
    }
    const onboardDate = new Date(dateStr);
    const now = new Date();
    const daysDiff =
      (now.getTime() - onboardDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  } catch {
    return true;
  }
}

/** Call this from other components to mark a checklist item as done */
export function markChecklistItem(itemId: string) {
  try {
    const completed = getCompletedItems();
    if (!completed.includes(itemId)) {
      completed.push(itemId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {}
}

/** Set the onboard date (call once after onboarding finishes) */
export function setOnboardDate() {
  try {
    if (!localStorage.getItem(ONBOARD_DATE_KEY)) {
      localStorage.setItem(ONBOARD_DATE_KEY, new Date().toISOString());
    }
  } catch {}
}

interface GettingStartedChecklistProps {
  onUpload: () => void;
  onInterview: () => void;
  onCustomize: () => void;
  onShare: () => void;
}

export default function GettingStartedChecklist({
  onUpload,
  onInterview,
  onCustomize,
  onShare,
}: GettingStartedChecklistProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("gettingStarted");
  const [completed, setCompleted] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Refresh completed items periodically
  const refreshCompleted = useCallback(() => {
    setCompleted(getCompletedItems());
  }, []);

  useEffect(() => {
    // Check if should show
    if (isDismissed()) {
      setDismissed(true);
      return;
    }
    if (!isWithinFirstWeek()) {
      setDismissed(true);
      return;
    }
    setDismissed(false);
    refreshCompleted();

    // Poll for changes every 2 seconds (other components may mark items)
    const interval = setInterval(refreshCompleted, 5000);
    return () => clearInterval(interval);
  }, [refreshCompleted]);

  if (dismissed) return null;

  const completedCount = completed.length;
  const totalCount = ITEMS.length;
  const allDone = completedCount === totalCount;
  const progressPercent = (completedCount / totalCount) * 100;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {}
    setDismissed(true);
  };

  const actionMap: Record<string, () => void> = {
    upload_memory: onUpload,
    complete_interview: onInterview,
    customize_room: onCustomize,
    share_room: onShare,
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-expanded={false}
        style={{
          position: "absolute",
          top: "6.25rem",
          bottom: "auto",
          left: isMobile ? "0.75rem" : "1.125rem",
          zIndex: 36,
          background: `${T.color.white}ee`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${T.color.cream}`,
          borderRadius: "1rem",
          padding: "0.625rem 1rem",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(44, 44, 42, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          animation: "fadeIn .4s ease",
          transition: "transform .2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        <div
          style={{
            width: "1.75rem",
            height: "1.75rem",
            borderRadius: "0.875rem",
            background: `conic-gradient(${T.color.terracotta} ${progressPercent}%, ${T.color.cream} ${progressPercent}%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "1.25rem",
              height: "1.25rem",
              borderRadius: "0.625rem",
              background: T.color.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              fontWeight: 700,
              color: T.color.terracotta,
            }}
          >
            {completedCount}
          </div>
        </div>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 500,
            color: T.color.walnut,
          }}
        >
          {t("title")}
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "6.25rem",
        bottom: "auto",
        left: isMobile ? "0.75rem" : "1.125rem",
        zIndex: 36,
        width: isMobile ? "calc(100% - 1.5rem)" : "18.75rem",
        maxWidth: "21.25rem",
        background: `${T.color.white}f5`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "1.25rem",
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 8px 40px rgba(44, 44, 42, 0.14)",
        padding: isMobile ? "1.25rem 1.125rem 1rem" : "1.375rem 1.25rem 1rem",
        animation: "fadeUp .5s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.875rem",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: T.color.charcoal,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {allDone ? t("allDone") : t("title")}
          </h3>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              margin: "0.25rem 0 0",
            }}
          >
            {allDone
              ? t("completedBasics")
              : `${completedCount} / ${totalCount} ${t("completedCount")}`}
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title={t("minimize")}
          aria-expanded={true}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            color: T.color.muted,
            padding: "0.25rem 0.5rem",
            lineHeight: 1,
            minWidth: "2.75rem",
            minHeight: "2.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {"\u2212"}
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "0.25rem",
          background: T.color.cream,
          borderRadius: "0.125rem",
          marginBottom: "1rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: allDone
              ? T.color.sage
              : `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
            borderRadius: "0.125rem",
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {ITEMS.map((item) => {
          const done = completed.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!done) actionMap[item.id]?.();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 0.875rem",
                borderRadius: "0.875rem",
                border: `1.5px solid ${done ? `${T.color.sage}30` : T.color.cream}`,
                background: done ? `${T.color.sage}08` : T.color.linen,
                cursor: done ? "default" : "pointer",
                textAlign: "left",
                transition: "all .2s",
                opacity: done ? 0.7 : 1,
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!done)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    T.color.terracotta;
              }}
              onMouseLeave={(e) => {
                if (!done)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    T.color.cream;
              }}
            >
              {/* Checkbox / icon */}
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "0.625rem",
                  background: done
                    ? `${T.color.sage}20`
                    : `${T.color.terracotta}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: done ? "1rem" : "1.125rem",
                  flexShrink: 0,
                }}
              >
                {done ? "\u2713" : item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: done ? T.color.muted : T.color.charcoal,
                    textDecoration: done ? "line-through" : "none",
                    lineHeight: 1.3,
                  }}
                >
                  {t(item.label)}
                </div>
                {!done && (
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      lineHeight: 1.4,
                      marginTop: "0.125rem",
                    }}
                  >
                    {t(item.description)}
                  </div>
                )}
              </div>
              {!done && (
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.terracotta,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {"\u2192"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dismiss button */}
      <div
        style={{
          marginTop: "0.875rem",
          textAlign: "center",
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: `${T.color.muted}99`,
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "0.1875rem",
            padding: "0.375rem 0.75rem",
          }}
        >
          {t("dismissPermanently")}
        </button>
      </div>
    </div>
  );
}
