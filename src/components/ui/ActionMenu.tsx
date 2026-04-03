"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

export interface ActionItem {
  icon: string;
  label: string;
  action: () => void;
  hidden?: boolean;
}

interface ActionMenuProps {
  primary: ActionItem;
  secondary: ActionItem[];
  accent?: string;
}

export default function ActionMenu({ primary, secondary, accent }: ActionMenuProps) {
  const { t } = useTranslation("actionMenu");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accentColor = accent || T.color.terracotta;

  const visibleSecondary = secondary.filter(a => !a.hidden);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div ref={ref} style={{
      position: "absolute", bottom: "4.375rem", right: "1.75rem", zIndex: 35,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.625rem",
    }}>
      {/* Secondary actions — fan upward */}
      {open && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.375rem",
          background: `${T.color.linen}e6`,
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          borderRadius: "1rem",
          padding: "0.625rem",
          border: `1px solid ${T.color.cream}`,
          boxShadow: "0 0.5rem 2rem rgba(44,44,42,.12)",
        }}>
          {visibleSecondary.map((item, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); item.action(); }}
              aria-label={item.label}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.375rem 0.75rem 0.375rem 0.5rem",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: "0.75rem",
                width: "100%",
                minHeight: "2.75rem",
                transition: "background .15s",
                animation: `fadeUp .25s ease ${i * 0.04}s both`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}22`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem",
                background: `${T.color.white}cc`,
                border: `1px solid ${T.color.cream}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.125rem", flexShrink: 0,
              }}>{item.icon}</div>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                color: T.color.charcoal, whiteSpace: "nowrap",
              }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom row: toggle + primary */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        {/* Toggle button */}
        {visibleSecondary.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onKeyDown={(e) => { if (e.key === "Escape" && open) setOpen(false); }}
            style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem",
              border: `1px solid ${T.color.cream}`,
              background: open ? `${T.color.sandstone}30` : `${T.color.white}e6`,
              backdropFilter: "blur(0.75rem)",
              WebkitBackdropFilter: "blur(0.75rem)",
              color: T.color.walnut,
              fontSize: "1.125rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0.25rem 1rem rgba(44,44,42,.1)",
              transition: "transform .2s, background .2s",
              transform: open ? "rotate(45deg)" : "none",
            }}
          >+</button>
        )}

        {/* Primary FAB */}
        <button
          onClick={() => { setOpen(false); primary.action(); }}
          aria-label={primary.label}
          style={{
            width: "3.5rem", height: "3.5rem", borderRadius: "1.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
            color: T.color.white,
            fontSize: primary.icon === "+" ? "1.75rem" : "1.375rem",
            fontWeight: 300,
            cursor: "pointer",
            boxShadow: `0 0.5rem 1.75rem ${T.color.walnut}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform .2s, box-shadow .2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 0.75rem 2.25rem ${T.color.walnut}55`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "none";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 0.5rem 1.75rem ${T.color.walnut}40`;
          }}
          title={primary.label}
        >{primary.icon}</button>
      </div>
    </div>
  );
}
