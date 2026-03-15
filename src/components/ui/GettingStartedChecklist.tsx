"use client";
import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

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
    label: "Upload your first memory",
    description: "Add a photo, video, or document to any room",
    icon: "\u{1F4F7}",
  },
  {
    id: "complete_interview",
    label: "Complete a life interview",
    description: "Let our AI guide you through your story",
    icon: "\u{1F3A4}",
  },
  {
    id: "customize_room",
    label: "Customize a room",
    description: "Change a room's name, icon, or layout",
    icon: "\u{1F3A8}",
  },
  {
    id: "share_room",
    label: "Share with someone",
    description: "Invite a family member to view a room",
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
    const interval = setInterval(refreshCompleted, 2000);
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
        style={{
          position: "absolute",
          top: isMobile ? "auto" : 100,
          bottom: isMobile ? 80 : "auto",
          left: isMobile ? 12 : 18,
          zIndex: 36,
          background: `${T.color.white}ee`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${T.color.cream}`,
          borderRadius: 16,
          padding: "10px 16px",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(44, 44, 42, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: 10,
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
            width: 28,
            height: 28,
            borderRadius: 14,
            background: `conic-gradient(${T.color.terracotta} ${progressPercent}%, ${T.color.cream} ${progressPercent}%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              background: T.color.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: T.font.body,
              fontSize: 10,
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
            fontSize: 12,
            fontWeight: 500,
            color: T.color.walnut,
          }}
        >
          Getting Started
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: isMobile ? "auto" : 100,
        bottom: isMobile ? 80 : "auto",
        left: isMobile ? 12 : 18,
        zIndex: 36,
        width: isMobile ? "calc(100% - 24px)" : 300,
        maxWidth: 340,
        background: `${T.color.white}f5`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 20,
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 8px 40px rgba(44, 44, 42, 0.14)",
        padding: isMobile ? "20px 18px 16px" : "22px 20px 16px",
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
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: 18,
              fontWeight: 600,
              color: T.color.charcoal,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {allDone ? "All done!" : "Getting Started"}
          </h3>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: 12,
              color: T.color.muted,
              margin: "4px 0 0",
            }}
          >
            {allDone
              ? "You've completed all the basics."
              : `${completedCount} of ${totalCount} completed`}
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Minimize"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: T.color.muted,
            padding: "4px 8px",
            lineHeight: 1,
          }}
        >
          {"\u2212"}
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: T.color.cream,
          borderRadius: 2,
          marginBottom: 16,
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
            borderRadius: 2,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
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
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: done
                    ? `${T.color.sage}20`
                    : `${T.color.terracotta}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: done ? 16 : 18,
                  flexShrink: 0,
                }}
              >
                {done ? "\u2713" : item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: 15,
                    fontWeight: 500,
                    color: done ? T.color.muted : T.color.charcoal,
                    textDecoration: done ? "line-through" : "none",
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </div>
                {!done && (
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: 12,
                      color: T.color.muted,
                      lineHeight: 1.4,
                      marginTop: 2,
                    }}
                  >
                    {item.description}
                  </div>
                )}
              </div>
              {!done && (
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: 11,
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
          marginTop: 14,
          textAlign: "center",
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            fontFamily: T.font.body,
            fontSize: 12,
            color: `${T.color.muted}99`,
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            padding: "6px 12px",
          }}
        >
          Dismiss permanently
        </button>
      </div>
    </div>
  );
}
