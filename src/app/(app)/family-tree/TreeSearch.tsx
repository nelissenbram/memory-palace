import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";

interface TreeSearchProps {
  persons: FamilyTreePerson[];
  onSelect: (person: FamilyTreePerson) => void;
  isMobile: boolean;
}

/** Normalize accented characters for fuzzy matching */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function TreeSearch({ persons, onSelect, isMobile }: TreeSearchProps) {
  const { t } = useTranslation("familyTree");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // mobile: icon → input
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query (150ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const results = debouncedQuery.trim().length > 0
    ? persons.filter((p) => {
        const q = normalize(debouncedQuery);
        const full = normalize(`${p.first_name} ${p.last_name || ""}`);
        return full.includes(q);
      }).slice(0, 8)
    : [];

  const showDropdown = open && results.length > 0;
  const showNoResults = open && debouncedQuery.trim().length > 0 && results.length === 0;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (isMobile) setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMobile]);

  // Focus input when expanding on mobile
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSelect = useCallback((person: FamilyTreePerson) => {
    onSelect(person);
    setQuery("");
    setOpen(false);
    if (isMobile) setExpanded(false);
  }, [onSelect, isMobile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      if (isMobile) setExpanded(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && results[highlightIdx]) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    setHighlightIdx(0);
  };

  // Mobile: show magnifying glass icon that expands
  if (isMobile && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "0.75rem",
          border: `1px solid ${T.color.sandstone}40`,
          background: `${T.color.white}E0`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label={t("searchPlaceholder")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.color.walnut} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={containerRef} role="combobox" aria-expanded={showDropdown} aria-haspopup="listbox" style={{ position: "relative", flex: isMobile ? 1 : undefined }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: `${T.color.white}E0`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "0.75rem",
          border: `1px solid ${T.color.sandstone}40`,
          padding: "0 0.75rem",
          height: "2.75rem",
          minWidth: isMobile ? undefined : "14rem",
          maxWidth: isMobile ? undefined : "20rem",
          width: isMobile ? "100%" : undefined,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={t("searchPlaceholder")}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.charcoal,
            flex: 1,
            minWidth: 0,
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
            aria-label={t("close")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {(showDropdown || showNoResults) && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "0.25rem",
            background: T.color.white,
            borderRadius: "0.75rem",
            border: `1px solid ${T.color.sandstone}40`,
            boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,.12)",
            zIndex: 60,
            overflow: "hidden",
            maxHeight: "20rem",
            overflowY: "auto",
          }}
        >
          {showNoResults && (
            <div
              style={{
                padding: "0.875rem 1rem",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
                textAlign: "center",
              }}
            >
              {t("noResults")}
            </div>
          )}
          {results.map((p, i) => {
            const year = (d: string | null) => {
              if (!d) return "";
              try { return new Date(d).getFullYear().toString(); } catch { return ""; }
            };
            const lifespan = p.birth_date || p.death_date
              ? `${year(p.birth_date) || "?"}\u2013${year(p.death_date) || ""}`
              : "";

            return (
              <button
                key={p.id}
                role="option"
                aria-selected={i === highlightIdx}
                onClick={() => handleSelect(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "none",
                  background: i === highlightIdx ? `${T.color.terracotta}10` : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  borderBottom: i < results.length - 1 ? `1px solid ${T.color.cream}` : "none",
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: T.color.warmStone,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {p.photo_path ? (
                    <img
                      src={p.photo_path}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: T.font.display,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: T.color.walnut,
                      }}
                    >
                      {(p.first_name || "?")[0]}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.first_name} {p.last_name || ""}
                  </div>
                  {lifespan && (
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: T.color.muted,
                      }}
                    >
                      {lifespan}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
