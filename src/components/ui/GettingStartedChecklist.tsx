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
  // Canon: gate entrance/width animations for motion-sensitive users.
  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
          backdropFilter: "blur(0.75rem)" /* canon glass blur, rem */,
          WebkitBackdropFilter: "blur(0.75rem)",
          border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
          borderRadius: "1rem",
          padding: "0.625rem 1rem",
          minHeight: "2.75rem" /* canon touch target */,
          cursor: "pointer",
          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" /* Atrium token: S1 */,
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          animation: reduceMotion ? "none" : "fadeIn .3s ease",
          transition: reduceMotion ? "none" : "transform .2s ease, box-shadow .2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-0.1875rem)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0.5rem 1.5rem rgba(64,59,54,0.14)"; /* Atrium token: S2 */
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)";
        }}
      >
        <div
          style={{
            width: "1.75rem",
            height: "1.75rem",
            borderRadius: "0.875rem",
            background: `conic-gradient(#B85C38 ${progressPercent}%, #E3D6BC ${progressPercent}%)` /* Atrium token: ember + hairline track */,
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
              fontSize: "0.6875rem" /* Atrium token: overline step */,
              fontWeight: 700,
              color: "#9A4F2A" /* Atrium token: terracotta glyph */,
            }}
          >
            {completedCount}
          </div>
        </div>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem" /* Atrium token: meta */,
            fontWeight: 500,
            color: "#403B36" /* Atrium token: ink */,
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
        backdropFilter: "blur(0.75rem)" /* canon glass blur, rem */,
        WebkitBackdropFilter: "blur(0.75rem)",
        borderRadius: "1rem" /* Atrium token: card radius */,
        border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14), inset 0 0.0625rem 0 rgba(255,255,255,0.5)" /* Atrium token: S2 + top highlight */,
        padding: isMobile ? "1.25rem 1.125rem 1rem" : "1.375rem 1.25rem 1rem",
        animation: reduceMotion ? "none" : "fadeUp .3s ease",
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
              fontSize: "1.0625rem" /* Atrium token: titleS */,
              fontWeight: 600,
              color: "#403B36" /* Atrium token: ink */,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {allDone ? t("allDone") : t("title")}
          </h3>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem" /* Atrium token: meta */,
              color: "#716A5E" /* Atrium token: muted */,
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
            color: "#716A5E" /* Atrium token: muted */,
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
          background: "#E3D6BC" /* Atrium token: hairline (track was cream-on-cream) */,
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
              ? "#56683C" /* Atrium token: sage */
              : "linear-gradient(90deg, #9A4F2A, #B85C38)" /* Atrium token: terracotta -> ember */,
            borderRadius: "0.125rem",
            transition: reduceMotion ? "none" : "width 0.3s ease",
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
                borderRadius: "0.85rem" /* Atrium token: small-control radius */,
                border: `0.0625rem solid ${done ? "#DFE3D2" : "#E3D6BC"}` /* Atrium token: opaque hairlines */,
                background: done ? "#EFF2E8" /* Atrium token: sage tray */ : T.color.linen,
                cursor: done ? "default" : "pointer",
                textAlign: "left",
                transition: reduceMotion ? "none" : "all .2s ease",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!done)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#B85C38"; /* Atrium token: ember */
              }}
              onMouseLeave={(e) => {
                if (!done)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#E3D6BC";
              }}
            >
              {/* Checkbox / icon */}
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "0.625rem",
                  background: done
                    ? "rgba(86,104,60,0.16)" /* Atrium token: sage medallion */
                    : "rgba(154,79,42,0.11)" /* Atrium token: terracotta medallion */,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: done ? "1rem" : "1.125rem",
                  color: "#56683C" /* Atrium token: sage glyph (checkmark) */,
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
                    fontWeight: 600 /* Atrium token: display weight */,
                    color: done ? "#716A5E" : "#403B36" /* Atrium tokens: muted / ink */,
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
                      fontSize: "0.8125rem" /* Atrium token: meta */,
                      color: "#716A5E" /* Atrium token: muted */,
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
                    color: "#9A4F2A" /* Atrium token: terracotta glyph */,
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
            fontSize: "0.8125rem" /* Atrium token: meta */,
            color: "#716A5E" /* Atrium token: muted, full opacity (no double-dimming) */,
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "0.1875rem",
            padding: "0.375rem 0.75rem",
            minHeight: "2.75rem" /* canon touch target */,
            minWidth: "2.75rem",
          }}
        >
          {t("dismissPermanently")}
        </button>
      </div>
    </div>
  );
}
