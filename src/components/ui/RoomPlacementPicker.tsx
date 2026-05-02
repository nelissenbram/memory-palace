"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface WingOption {
  id: string;
  slug: string;
  name: string;
  icon: string;
  accent: string;
}

interface RoomPlacementPickerProps {
  wings: WingOption[];
  onSelect: (wingId: string) => void;
  onCreateSharedWing: () => void;
  onClose?: () => void;
  loading?: boolean;
}

export default function RoomPlacementPicker({
  wings,
  onSelect,
  onCreateSharedWing,
  onClose,
  loading = false,
}: RoomPlacementPickerProps) {
  const { t } = useTranslation("roomPlacement");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleSelect = (wingId: string) => {
    if (loading) return;
    setSelectedId(wingId);
    onSelect(wingId);
  };

  /* ---- Focus trap ---- */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element inside dialog
    const timer = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])");
      first?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(timer);
      previousFocusRef.current?.focus();
    };
  }, [handleKeyDown]);

  return (
    <>
      <style>{`
        @keyframes rppFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rppSlideUp {
          from { opacity: 0; transform: translateY(1.25rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rppSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (min-width: 40rem) {
          .rpp-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        [data-rpp-dialog] button:focus-visible {
          outline: 0.125rem solid ${T.color.gold};
          outline-offset: 0.125rem;
        }
      `}</style>

      {/* Overlay backdrop */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          background: "rgba(44, 44, 42, 0.5)",
          backdropFilter: "blur(0.5rem)",
          WebkitBackdropFilter: "blur(0.5rem)",
          animation: "rppFadeIn 0.3s ease",
        }}
      >
        {/* Modal card */}
        <div
          ref={dialogRef}
          data-rpp-dialog
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogLabel")}
          style={{
            width: "100%",
            maxWidth: "36rem",
            maxHeight: "calc(100vh - 2.5rem)",
            overflowY: "auto",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(1.25rem)",
            WebkitBackdropFilter: "blur(1.25rem)",
            borderRadius: "1.25rem",
            border: `1px solid ${T.color.cream}`,
            boxShadow: "0 1.5rem 4rem rgba(44, 44, 42, 0.2)",
            padding: "2.25rem 2rem",
            animation: "rppSlideUp 0.4s ease",
          }}
        >
          {/* Heading */}
          <h2
            style={{
              fontFamily: T.font.display,
              fontSize: "1.625rem",
              fontWeight: 500,
              color: T.color.charcoal,
              margin: "0 0 0.5rem",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {t("title")}
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              color: T.color.muted,
              lineHeight: 1.5,
              textAlign: "center",
              margin: "0 0 1.75rem",
            }}
          >
            {t("subtitle")}
          </p>

          {/* Wing cards grid */}
          <div
            className="rpp-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {wings.map((wing) => {
              const isSelected = selectedId === wing.id;
              const isHovered = hoveredId === wing.id;
              const isPlacing = loading && isSelected;

              return (
                <button
                  key={wing.id}
                  onClick={() => handleSelect(wing.id)}
                  onMouseEnter={() => setHoveredId(wing.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  disabled={loading}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "1.25rem 1rem",
                    borderRadius: "0.875rem",
                    border: `1px solid ${isSelected ? wing.accent : T.color.cream}`,
                    borderLeft: `0.25rem solid ${wing.accent}`,
                    background: isSelected
                      ? `${wing.accent}08`
                      : isHovered
                        ? T.color.linen
                        : "rgba(255, 255, 255, 0.8)",
                    cursor: loading ? "default" : "pointer",
                    transition: "all 0.2s ease",
                    transform: isHovered && !loading ? "translateY(-0.125rem)" : "none",
                    boxShadow: isHovered && !loading
                      ? `0 0.5rem 1.5rem ${wing.accent}20`
                      : "0 0.125rem 0.5rem rgba(44, 44, 42, 0.04)",
                    opacity: loading && !isSelected ? 0.5 : 1,
                    fontFamily: T.font.body,
                    outline: "none",
                  }}
                >
                  {/* Wing icon */}
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>
                    {wing.icon}
                  </span>

                  {/* Wing name */}
                  <span
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {wing.name}
                  </span>

                  {/* Placing state */}
                  {isPlacing && (
                    <span
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: wing.accent,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "0.75rem",
                          height: "0.75rem",
                          border: `0.125rem solid ${wing.accent}40`,
                          borderTopColor: wing.accent,
                          borderRadius: "50%",
                          animation: "rppSpin 0.8s linear infinite",
                        }}
                      />
                      {t("placing")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create Shared Wing card */}
          <button
            onClick={() => {
              if (!loading) onCreateSharedWing();
            }}
            disabled={loading}
            onMouseEnter={() => setHoveredId("__create__")}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.375rem",
              padding: "1.25rem 1rem",
              borderRadius: "0.875rem",
              border: `0.125rem dashed ${
                hoveredId === "__create__" ? T.color.terracotta : T.color.sandstone
              }`,
              background:
                hoveredId === "__create__"
                  ? `${T.color.terracotta}06`
                  : "transparent",
              cursor: loading ? "default" : "pointer",
              transition: "all 0.2s ease",
              opacity: loading ? 0.5 : 1,
              fontFamily: T.font.body,
              outline: "none",
              marginTop: "0.25rem",
            }}
          >
            <span
              style={{
                fontSize: "1.5rem",
                lineHeight: 1,
                color: T.color.muted,
              }}
            >
              +
            </span>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.walnut,
              }}
            >
              {t("createSharedWing")}
            </span>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.muted,
                lineHeight: 1.4,
                textAlign: "center",
                maxWidth: "20rem",
              }}
            >
              {t("sharedWingDesc")}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
