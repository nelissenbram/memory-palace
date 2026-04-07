"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { TYPE_ICONS, TypeIcon } from "@/lib/constants/type-icons";

/* ── Animations (injected once) ── */
const STYLE_ID = "library-search-animations";
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes lsFilterChipIn {
      from { opacity: 0; transform: translateY(0.375rem) scale(0.92); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes lsSearchFocus {
      from { box-shadow: 0 0 0 0px transparent; }
      to   { box-shadow: 0 0 0 3px var(--ls-accent-glow); }
    }
    @keyframes lsResultBadgeIn {
      from { opacity: 0; transform: translateX(0.5rem); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes lsClearIn {
      from { opacity: 0; transform: scale(0.6); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes lsKbdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════
   LibrarySearch — Spotlight-quality search bar
   ═══════════════════════════════════════════════════════ */

export interface LibrarySearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  accent: string;
  resultCount?: number;
  totalCount?: number;
  isMobile: boolean;
}

export function LibrarySearch({
  query, onQueryChange, accent, resultCount, totalCount, isMobile,
}: LibrarySearchProps) {
  const { t } = useTranslation("library");
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when parent clears the query externally
  useEffect(() => {
    if (query !== localQuery) {
      setLocalQuery(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Debounced query change handler (300ms)
  const handleQueryChange = useCallback((value: string) => {
    setLocalQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === "") {
      // Clear immediately for better UX
      onQueryChange("");
    } else {
      debounceRef.current = setTimeout(() => {
        onQueryChange(value);
      }, 300);
    }
  }, [onQueryChange]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => { ensureStyles(); }, []);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // "/" shortcut when not focused on an input
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasQuery = localQuery.length > 0;
  const showResultBadge = hasQuery && resultCount !== undefined;

  const accentGlow = accent + "20";

  return (
    <div
      style={{
        position: "relative",
        width: isMobile ? "100%" : (focused ? "min(24rem, 100%)" : "min(20rem, 100%)"),
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 1,
        minWidth: isMobile ? 0 : "12rem",
      }}
    >
      {/* Magnifying glass icon — clickable when query present */}
      <button
        type="button"
        onClick={() => {
          if (hasQuery) {
            // Submit: flush debounce immediately
            if (debounceRef.current) clearTimeout(debounceRef.current);
            onQueryChange(localQuery);
          }
          inputRef.current?.focus();
        }}
        style={{
          position: "absolute",
          left: "0.5rem",
          top: "50%",
          transform: "translateY(-50%)",
          color: focused ? accent : T.color.muted,
          pointerEvents: hasQuery ? "auto" : "none",
          cursor: hasQuery ? "pointer" : "default",
          transition: "color 0.2s ease",
          zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "none", padding: "0.375rem",
          borderRadius: "50%",
        }}
        aria-label={hasQuery ? t("searchPlaceholder") : undefined}
        aria-hidden={!hasQuery}
        tabIndex={hasQuery ? 0 : -1}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="text"
        value={localQuery}
        onChange={e => handleQueryChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        style={{
          width: "100%",
          height: isMobile ? "2.5rem" : "2.75rem",
          padding: `0 ${hasQuery || showResultBadge ? "5.5rem" : "2.5rem"} 0 2.5rem`,
          border: `1px solid ${focused ? accent : T.color.cream}`,
          borderRadius: "1.5rem",
          fontFamily: T.font.body,
          fontSize: isMobile ? "1rem" : "0.875rem",
          fontStyle: query ? "normal" : "italic",
          color: T.color.charcoal,
          background: T.color.linen,
          outline: "none",
          boxShadow: focused
            ? `0 0 0 3px ${accentGlow}, inset 0 1px 2px rgba(0,0,0,0.04)`
            : "inset 0 1px 2px rgba(0,0,0,0.04)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxSizing: "border-box",
        }}
      />

      {/* Right side container */}
      <div
        style={{
          position: "absolute",
          right: "0.625rem",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          pointerEvents: hasQuery ? "auto" : "none",
        }}
      >
        {/* Result count badge */}
        {showResultBadge && (
          <span
            style={{
              animation: "lsResultBadgeIn 0.2s ease both",
              background: `${accent}14`,
              color: accent,
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              padding: "0.125rem 0.5rem",
              borderRadius: "0.625rem",
              whiteSpace: "nowrap",
              lineHeight: 1.4,
            }}
          >
            {t("foundCount", { count: String(resultCount) })}
          </span>
        )}

        {/* Clear button */}
        {hasQuery && (
          <button
            onClick={() => { handleQueryChange(""); inputRef.current?.focus(); }}
            aria-label={t("clearSearch")}
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "50%",
              border: "none",
              background: T.color.cream,
              color: T.color.walnut,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8125rem",
              lineHeight: 1,
              fontFamily: T.font.body,
              fontWeight: 600,
              animation: "lsClearIn 0.15s ease both",
              transition: "background 0.15s ease",
              pointerEvents: "auto",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.color.sandstone; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.color.cream; }}
          >
            {"\u00D7"}
          </button>
        )}

        {/* Keyboard shortcut hint — desktop only, when not focused and no query */}
        {!isMobile && !focused && !hasQuery && (
          <span
            style={{
              animation: "lsKbdFade 0.3s ease both",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "1.375rem",
              height: "1.375rem",
              padding: "0 0.25rem",
              borderRadius: "0.25rem",
              border: `1px solid ${T.color.cream}`,
              background: T.color.warmStone,
              color: T.color.muted,
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              fontWeight: 600,
              lineHeight: 1,
              pointerEvents: "none",
            }}
          >
            /
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LibraryFilterBar — Horizontal chip row
   ═══════════════════════════════════════════════════════ */

export interface LibraryFilterBarProps {
  types: string[];
  activeType: string | null;
  onFilterChange: (type: string | null) => void;
  accent: string;
  typeCounts?: Record<string, number>;
}

export function LibraryFilterBar({
  types, activeType, onFilterChange, accent, typeCounts,
}: LibraryFilterBarProps) {
  const { t } = useTranslation("library");

  useEffect(() => { ensureStyles(); }, []);

  const totalCount = typeCounts
    ? Object.values(typeCounts).reduce((a, b) => a + b, 0)
    : undefined;

  return (
    <div
      style={{
        padding: "0.5rem 1rem",
        display: "flex",
        gap: "0.375rem",
        overflowX: "auto",
        flexShrink: 0,
        borderBottom: `1px solid ${T.color.cream}`,
        background: T.color.white,
        /* hide scrollbar */
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        maskImage: "linear-gradient(to right, transparent 0, black 0.75rem, black calc(100% - 0.75rem), transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0, black 0.75rem, black calc(100% - 0.75rem), transparent 100%)",
      }}
      /* webkit scrollbar hide via inline won't work; we handle it below */
    >
      {/* "All" chip */}
      <Chip
        label={t("all")}
        count={totalCount}
        active={!activeType}
        accent={accent}
        index={0}
        onClick={() => onFilterChange(null)}
      />

      {/* Type chips */}
      {types.map((type, i) => (
        <Chip
          key={type}
          iconNode={<TypeIcon type={type} size={13} color={activeType === type ? "#fff" : accent} />}
          label={type}
          count={typeCounts?.[type]}
          active={activeType === type}
          accent={accent}
          index={i + 1}
          onClick={() => onFilterChange(activeType === type ? null : type)}
        />
      ))}

      {/* Inject scrollbar-hide for webkit */}
      <style>{`
        div:has(> [data-ls-chip]) { -ms-overflow-style: none; scrollbar-width: none; }
        div:has(> [data-ls-chip])::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ── Single chip ── */
function Chip({ icon, iconNode, label, count, active, accent, index, onClick }: {
  icon?: string; iconNode?: React.ReactNode; label: string; count?: number; active: boolean;
  accent: string; index: number; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-ls-chip=""
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.3125rem 0.75rem",
        borderRadius: "1rem",
        border: `1px solid ${active ? accent : hovered ? T.color.sandstone : T.color.cream}`,
        background: active ? accent : T.color.white,
        color: active ? T.color.white : T.color.walnut,
        cursor: "pointer",
        fontFamily: T.font.body,
        fontSize: "0.75rem",
        fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap",
        flexShrink: 0,
        lineHeight: 1.4,
        boxShadow: active ? `0 1px 4px ${accent}30` : "none",
        transform: hovered && !active ? "translateY(-1px)" : "none",
        transition: "all 0.15s ease",
        animation: `lsFilterChipIn 0.25s ease both`,
        animationDelay: `${index * 0.04}s`,
      }}
    >
      {iconNode ? <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}>{iconNode}</span> : icon ? <span style={{ fontSize: "0.8125rem", lineHeight: 1 }}>{icon}</span> : null}
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "1.125rem",
            height: "1.125rem",
            padding: "0 0.25rem",
            borderRadius: "0.5625rem",
            background: active ? "rgba(255,255,255,0.25)" : `${accent}12`,
            color: active ? T.color.white : accent,
            fontSize: "0.625rem",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
