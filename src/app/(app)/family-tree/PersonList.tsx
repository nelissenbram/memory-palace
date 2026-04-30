"use client";

import { useState, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";

type SortField = "name" | "birth" | "death" | "gender" | "completeness";
type SortDir = "asc" | "desc";

function completenessScore(p: FamilyTreePerson): { score: number; maxScore: number; pct: number } {
  const isDeceased = !!p.death_date || !!p.death_place;
  const photoSkipped = p.photo_path === "__none__";
  let maxScore = isDeceased ? 100 : 80;
  let score = 0;
  if (p.first_name && p.first_name !== "?") score += 20;
  if (p.photo_path && !photoSkipped) score += 20;
  if (p.birth_date) score += 20;
  if (p.birth_place) score += 20;
  if (isDeceased) {
    if (p.death_date) score += 10;
    if (p.death_place) score += 10;
  }
  if (photoSkipped) maxScore -= 20;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
  return { score, maxScore, pct };
}

function formatDate(d: string | null, locale: string, t: (key: string) => string): string {
  if (!d) return "\u2014";
  // Strip date qualifiers for display
  const stripped = d.replace(/^[~<>]/, "");
  const prefix = d.startsWith("~") ? t("datePrefixCirca") : d.startsWith("<") ? t("datePrefixBefore") : d.startsWith(">") ? t("datePrefixAfter") : "";
  // Year-only
  if (/^\d{4}$/.test(stripped)) return `${prefix}${stripped}`;
  // Year-month
  if (/^\d{4}-\d{2}$/.test(stripped)) {
    try {
      const dt = new Date(`${stripped}-01T00:00:00`);
      return `${prefix}${dt.toLocaleDateString(locale, { year: "numeric", month: "short" })}`;
    } catch { return `${prefix}${stripped}`; }
  }
  // Range
  if (stripped.includes("/")) return `${stripped.replace("/", "\u2013")}`;
  // Full date
  try {
    return `${prefix}${new Date(`${stripped}T00:00:00`).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  } catch {
    return d;
  }
}

export function PersonList({
  persons,
  relationships,
  onSelect,
  isMobile,
}: {
  persons: FamilyTreePerson[];
  relationships: FamilyTreeRelationship[];
  onSelect: (p: FamilyTreePerson) => void;
  isMobile: boolean;
}) {
  const { t, locale } = useTranslation("familyTree");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState("");

  const relCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of relationships) {
      map.set(r.person_id, (map.get(r.person_id) || 0) + 1);
    }
    return map;
  }, [relationships]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    let filtered = persons;
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      filtered = persons.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          (p.last_name || "").toLowerCase().includes(q) ||
          (p.birth_place || "").toLowerCase().includes(q) ||
          (p.death_place || "").toLowerCase().includes(q)
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name": {
          const nameA = `${a.first_name} ${a.last_name || ""}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name || ""}`.toLowerCase();
          return nameA.localeCompare(nameB) * dir;
        }
        case "birth":
          return ((a.birth_date || "") > (b.birth_date || "") ? 1 : -1) * dir;
        case "death":
          return ((a.death_date || "") > (b.death_date || "") ? 1 : -1) * dir;
        case "gender":
          return ((a.gender || "z") > (b.gender || "z") ? 1 : -1) * dir;
        case "completeness":
          return (completenessScore(a).pct - completenessScore(b).pct) * dir;
        default:
          return 0;
      }
    });
  }, [persons, sortField, sortDir, filter]);

  const arrow = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  const thStyle: React.CSSProperties = {
    padding: isMobile ? "0.5rem 0.375rem" : "0.625rem 0.75rem",
    textAlign: "left",
    fontFamily: T.font.body,
    fontSize: isMobile ? "0.6875rem" : "0.75rem",
    fontWeight: 600,
    color: T.color.muted,
    cursor: "pointer",
    whiteSpace: "nowrap",
    borderBottom: `2px solid ${T.color.cream}`,
    background: T.color.warmStone,
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
    userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: isMobile ? "0.5rem 0.375rem" : "0.625rem 0.75rem",
    fontFamily: T.font.body,
    fontSize: isMobile ? "0.8125rem" : "0.875rem",
    color: T.color.charcoal,
    borderBottom: `1px solid ${T.color.cream}`,
  };

  const genderLabel = (g: string | null) => {
    if (g === "male") return t("genderMale");
    if (g === "female") return t("genderFemale");
    if (g === "other") return t("genderOther");
    return "\u2014";
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Filter bar */}
      <div style={{ padding: isMobile ? "0.75rem" : "0.75rem 1rem", borderBottom: `1px solid ${T.color.cream}` }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("searchPersons")}
          aria-label={t("searchPersons")}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: `1px solid ${T.color.sandstone}`,
            background: T.color.white,
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.charcoal,
            outline: "none",
            minHeight: "2.75rem",
            boxSizing: "border-box",
          }}
        />
        <div style={{ marginTop: "0.375rem", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
          {sorted.length} / {persons.length} {t("personsCount")}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle} onClick={() => toggleSort("name")}>
                {t("listHeaderName")}{arrow("name")}
              </th>
              {!isMobile && (
                <th style={thStyle} onClick={() => toggleSort("gender")}>
                  {t("gender")}{arrow("gender")}
                </th>
              )}
              <th style={thStyle} onClick={() => toggleSort("birth")}>
                {t("birthDate")}{arrow("birth")}
              </th>
              {!isMobile && (
                <th style={thStyle} onClick={() => toggleSort("death")}>
                  {t("deathDate")}{arrow("death")}
                </th>
              )}
              {!isMobile && (
                <th style={{ ...thStyle, textAlign: "center" }}>
                  {t("listHeaderRels")}
                </th>
              )}
              <th style={{ ...thStyle, textAlign: "center" }} onClick={() => toggleSort("completeness")}>
                {t("listHeaderComplete")}{arrow("completeness")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const { pct } = completenessScore(p);
              const scoreColor = pct >= 80 ? T.color.sage : pct >= 40 ? "#D4A840" : T.color.error;
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  style={{
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.cream}60`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {p.photo_path ? (
                        <img
                          src={p.photo_path}
                          alt=""
                          style={{
                            width: "1.75rem",
                            height: "1.75rem",
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "1.75rem",
                            height: "1.75rem",
                            borderRadius: "50%",
                            background: T.color.warmStone,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontFamily: T.font.body,
                            fontSize: "0.6875rem",
                            color: T.color.muted,
                          }}
                        >
                          {p.first_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: isMobile ? "0.8125rem" : "0.875rem" }}>
                          {p.first_name}{p.last_name ? ` ${p.last_name}` : ""}
                          {p.is_self && (
                            <span style={{ color: T.color.gold, fontSize: "0.6875rem", fontWeight: 700, marginLeft: "0.375rem" }}>
                              {t("youLabel").toUpperCase()}
                            </span>
                          )}
                        </div>
                        {(p.birth_place || p.death_place) && !isMobile && (
                          <div style={{ fontSize: "0.75rem", color: T.color.muted }}>
                            {p.birth_place || ""}{p.birth_place && p.death_place ? " \u2192 " : ""}{p.death_place || ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {!isMobile && <td style={tdStyle}>{genderLabel(p.gender)}</td>}
                  <td style={tdStyle}>{formatDate(p.birth_date, locale, t)}</td>
                  {!isMobile && <td style={tdStyle}>{formatDate(p.death_date, locale, t)}</td>}
                  {!isMobile && (
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {relCountMap.get(p.id) || 0}
                    </td>
                  )}
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "0.75rem",
                        background: `${scoreColor}20`,
                        color: scoreColor,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      {pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && filter && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              fontFamily: T.font.body,
              color: T.color.muted,
              fontSize: "0.875rem",
            }}
          >
            {t("noSearchResults")}
          </div>
        )}
      </div>
    </div>
  );
}
