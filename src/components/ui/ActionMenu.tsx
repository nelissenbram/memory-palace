"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";

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
      position: "absolute", bottom: 70, right: 28, zIndex: 35,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
    }}>
      {/* Secondary actions — fan upward */}
      {open && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
          background: `${T.color.linen}e6`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 16,
          padding: "10px 10px 10px 10px",
          border: `1px solid ${T.color.cream}`,
          boxShadow: "0 8px 32px rgba(44,44,42,.12)",
        }}>
          {visibleSecondary.map((item, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); item.action(); }}
              aria-label={item.label}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 12px 6px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: 12,
                width: "100%",
                minHeight: 44,
                transition: "background .15s",
                animation: `fadeUp .25s ease ${i * 0.04}s both`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}22`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${T.color.white}cc`,
                border: `1px solid ${T.color.cream}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>{item.icon}</div>
              <span style={{
                fontFamily: T.font.body, fontSize: 12, fontWeight: 500,
                color: T.color.charcoal, whiteSpace: "nowrap",
              }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom row: toggle + primary */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Toggle button */}
        {visibleSecondary.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onKeyDown={(e) => { if (e.key === "Escape" && open) setOpen(false); }}
            style={{
              width: 44, height: 44, borderRadius: 22,
              border: `1px solid ${T.color.cream}`,
              background: open ? `${T.color.sandstone}30` : `${T.color.white}e6`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: T.color.walnut,
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(44,44,42,.1)",
              transition: "transform .2s, background .2s",
              transform: open ? "rotate(45deg)" : "none",
            }}
          >+</button>
        )}

        {/* Primary FAB */}
        <button
          onClick={() => { setOpen(false); primary.action(); }}
          style={{
            width: 56, height: 56, borderRadius: 28,
            border: "none",
            background: `linear-gradient(135deg, ${accentColor}, ${T.color.walnut})`,
            color: "#FFF",
            fontSize: primary.icon === "+" ? 28 : 22,
            fontWeight: 300,
            cursor: "pointer",
            boxShadow: `0 8px 28px ${T.color.walnut}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform .2s, box-shadow .2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 36px ${T.color.walnut}55`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "none";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${T.color.walnut}40`;
          }}
          title={primary.label}
        >{primary.icon}</button>
      </div>
    </div>
  );
}
