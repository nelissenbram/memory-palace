"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { EASE } from "./TuscanStyles";
import type { ActionGroup } from "@/lib/hooks/useActions";

interface UniversalActionsProps {
  groups: ActionGroup[];
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export default function UniversalActions({ groups, open, onClose, isMobile }: UniversalActionsProps) {
  const { t } = useTranslation("actionMenu" as any);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    // Delay to avoid immediately closing
    const timer = setTimeout(() => document.addEventListener("click", onClick), 50);
    return () => { clearTimeout(timer); document.removeEventListener("click", onClick); };
  }, [open, onClose]);

  if (!open) return null;

  if (isMobile) {
    // Mobile: bottom sheet overlay
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(42,34,24,.4)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: `atriumFadeIn 0.2s ease both`,
          }}
        />
        {/* Sheet */}
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 91,
            maxHeight: "70vh",
            overflowY: "auto",
            background: `${T.color.linen}f2`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "1.25rem 1.25rem 0 0",
            border: `1px solid ${T.color.cream}`,
            boxShadow: "0 -0.5rem 2.5rem rgba(44,44,42,.2)",
            padding: "1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px))",
            animation: `atriumSlideUp 0.3s ${EASE} both`,
          }}
        >
          {/* Handle bar */}
          <div style={{
            width: "2.5rem",
            height: "0.25rem",
            borderRadius: "0.125rem",
            background: T.color.sandstone,
            margin: "0 auto 1rem",
            opacity: 0.5,
          }} />

          {groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? "0.75rem" : 0 }}>
              <div style={{
                fontFamily: T.font.body,
                fontSize: "0.625rem",
                fontWeight: 700,
                color: T.color.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06rem",
                padding: "0.25rem 0.375rem 0.375rem",
              }}>
                {t(group.titleKey.replace("actionMenu.", ""))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { item.action(); onClose(); }}
                    aria-label={t(item.labelKey.replace("actionMenu.", ""))}
                    style={{
                      padding: "0.75rem 0.375rem",
                      borderRadius: "0.75rem",
                      border: `1px solid ${T.color.cream}`,
                      background: `${T.color.white}cc`,
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      cursor: "pointer",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.375rem",
                      minHeight: "3.5rem",
                      justifyContent: "center",
                      transition: "transform .12s, background .15s",
                    }}
                    onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
                    onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                  >
                    <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{item.icon}</span>
                    <span style={{
                      fontFamily: T.font.body,
                      fontSize: "0.6875rem",
                      color: T.color.walnut,
                      fontWeight: 500,
                      lineHeight: 1.2,
                    }}>
                      {t(item.labelKey.replace("actionMenu.", ""))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Desktop: floating popover
  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: "4.5rem",
        right: "1.5rem",
        zIndex: 90,
        width: "18rem",
        maxHeight: "70vh",
        overflowY: "auto",
        background: `${T.color.linen}f5`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 0.5rem 2.5rem rgba(44,44,42,.15), 0 0.125rem 0.5rem rgba(44,44,42,.06)",
        padding: "0.75rem",
        animation: `atriumFadeSlideUp 0.25s ${EASE} both`,
      }}
    >
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? "0.5rem" : 0 }}>
          <div style={{
            fontFamily: T.font.body,
            fontSize: "0.625rem",
            fontWeight: 700,
            color: T.color.muted,
            textTransform: "uppercase",
            letterSpacing: "0.06rem",
            padding: "0.375rem 0.5rem 0.25rem",
          }}>
            {t(group.titleKey.replace("actionMenu.", ""))}
          </div>
          {group.items.map((item) => (
            <button
              key={item.id}
              onClick={() => { item.action(); onClose(); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.5rem 0.625rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.charcoal,
                transition: `background 0.15s ease`,
                textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${T.color.cream}`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1, width: "1.5rem", textAlign: "center" }}>{item.icon}</span>
              <span>{t(item.labelKey.replace("actionMenu.", ""))}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
