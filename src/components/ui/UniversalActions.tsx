"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { EASE } from "./TuscanStyles";
import type { ActionGroup } from "@/lib/hooks/useActions";

function ActionIcon({ name, size = 16 }: { name: string; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    /* Content icons */
    case "plus": return <svg {...s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "upload": return <svg {...s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
    case "mic": return <svg {...s}><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>;
    case "quill": return <svg {...s}><path d="M20 2C14 4 10 10 9 14l-1 4 4-1c4-1 10-5 12-11"/><path d="M9 14c-2 0-4 1-5 3 2 0 4-1 5-3z"/></svg>;
    /* Explore icons */
    case "map": return <svg {...s}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M12 3c3 3 4.5 6 4.5 9s-1.5 6-4.5 9M12 3c-3 3-4.5 6-4.5 9s1.5 6 4.5 9"/></svg>;
    case "timeline": return <svg {...s}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="10"/></svg>;
    case "chart": return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
    case "tree": return <svg {...s}><circle cx="12" cy="5" r="2"/><circle cx="6" cy="14" r="2"/><circle cx="18" cy="14" r="2"/><path d="M12 7v3M12 10l-6 2M12 10l6 2"/><line x1="6" y1="16" x2="6" y2="20"/><line x1="18" y1="16" x2="18" y2="20"/></svg>;
    /* Social icons */
    case "share": return <svg {...s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
    case "mail": return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>;
    case "users": return <svg {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    default: return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }}>{name}</span>;
  }
}

interface UniversalActionsProps {
  groups: ActionGroup[];
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export default function UniversalActions({ groups, open, onClose, isMobile }: UniversalActionsProps) {
  const { t } = useTranslation("actionMenu");
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
          role="dialog"
          aria-modal="true"
          aria-label={t("more")}
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
                    <ActionIcon name={item.icon} size={20} />
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
      role="dialog"
      aria-modal="true"
      aria-label={t("more")}
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
              aria-label={t(item.labelKey.replace("actionMenu.", ""))}
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
              <span style={{ lineHeight: 1, width: "1.5rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}><ActionIcon name={item.icon} size={16} /></span>
              <span>{t(item.labelKey.replace("actionMenu.", ""))}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
