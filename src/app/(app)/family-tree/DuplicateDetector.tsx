"use client";

import { useState, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";

export interface DuplicatePair {
  a: FamilyTreePerson;
  b: FamilyTreePerson;
  reason: "exact_name" | "name_birth" | "lastname_birth";
}

function yearFromDate(d: string | null): number | null {
  if (!d) return null;
  const m = d.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function withinOneYear(d1: string | null, d2: string | null): boolean {
  const y1 = yearFromDate(d1);
  const y2 = yearFromDate(d2);
  if (y1 === null || y2 === null) return false;
  return Math.abs(y1 - y2) <= 1;
}

export function findDuplicates(persons: FamilyTreePerson[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const a = persons[i];
      const b = persons[j];
      const key = `${a.id}::${b.id}`;
      if (seen.has(key)) continue;

      const fnA = a.first_name.toLowerCase().trim();
      const fnB = b.first_name.toLowerCase().trim();
      const lnA = (a.last_name || "").toLowerCase().trim();
      const lnB = (b.last_name || "").toLowerCase().trim();

      // Exact first+last name match
      if (fnA === fnB && lnA === lnB && (fnA || lnA)) {
        seen.add(key);
        pairs.push({ a, b, reason: "exact_name" });
        continue;
      }

      // Same first name + similar birth date
      if (fnA && fnA === fnB && withinOneYear(a.birth_date, b.birth_date)) {
        seen.add(key);
        pairs.push({ a, b, reason: "name_birth" });
        continue;
      }

      // Same last name + same birth date (exact)
      if (lnA && lnA === lnB && a.birth_date && b.birth_date && a.birth_date === b.birth_date) {
        seen.add(key);
        pairs.push({ a, b, reason: "lastname_birth" });
        continue;
      }
    }
  }
  return pairs;
}

function displayName(p: FamilyTreePerson): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

interface Props {
  persons: FamilyTreePerson[];
  onMerge: (keepId: string, removeId: string) => Promise<void>;
  onClose: () => void;
  isMobile: boolean;
}

export default function DuplicateDetector({ persons, onMerge, onClose, isMobile }: Props) {
  const { t } = useTranslation("familyTree");
  const allPairs = useMemo(() => findDuplicates(persons), [persons]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState<string | null>(null);

  const activePairs = useMemo(
    () => allPairs.filter((p) => !dismissed.has(`${p.a.id}::${p.b.id}`)),
    [allPairs, dismissed]
  );

  const handleDismiss = (a: string, b: string) => {
    setDismissed((prev) => new Set(prev).add(`${a}::${b}`));
  };

  const handleMerge = async (keepId: string, removeId: string) => {
    const key = `${keepId}::${removeId}`;
    setMerging(key);
    try {
      await onMerge(keepId, removeId);
      handleDismiss(keepId, removeId);
    } finally {
      setMerging(null);
    }
  };

  const reasonLabel = (reason: DuplicatePair["reason"]): string => {
    switch (reason) {
      case "exact_name": return t("dupReasonExactName");
      case "name_birth": return t("dupReasonNameBirth");
      case "lastname_birth": return t("dupReasonLastnameBirth");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(44,44,42,0.45)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: T.color.white,
          borderRadius: "1rem",
          boxShadow: "0 1rem 3rem rgba(44,44,42,0.18)",
          width: isMobile ? "calc(100% - 2rem)" : "min(40rem, 90vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${T.color.sandstone}40`,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: T.font.display,
              fontSize: "1.25rem",
              color: T.color.charcoal,
            }}
          >
            {t("duplicatesTitle")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            style={{
              width: "2.75rem",
              height: "2.75rem",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              fontSize: "1.25rem",
              color: T.color.walnut,
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
          {activePairs.length === 0 ? (
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                color: T.color.muted,
                textAlign: "center",
                padding: "2rem 0",
              }}
            >
              {t("noDuplicates")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {activePairs.map(({ a, b, reason }) => {
                const pairKey = `${a.id}::${b.id}`;
                const isMerging = merging === pairKey || merging === `${b.id}::${a.id}`;

                return (
                  <div
                    key={pairKey}
                    style={{
                      border: `1px solid ${T.color.sandstone}50`,
                      borderRadius: "0.75rem",
                      padding: "1rem",
                      background: `${T.color.cream}40`,
                    }}
                  >
                    {/* Reason badge */}
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.6875rem",
                        color: T.color.terracotta,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {reasonLabel(reason)}
                    </div>

                    {/* Side by side comparison */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {[a, b].map((p) => (
                        <div
                          key={p.id}
                          style={{
                            fontFamily: T.font.body,
                            fontSize: "0.8125rem",
                            color: T.color.charcoal,
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                            {displayName(p)}
                          </div>
                          {p.birth_date && (
                            <div style={{ color: T.color.muted, fontSize: "0.75rem" }}>
                              {t("born")}: {p.birth_date}
                            </div>
                          )}
                          {p.death_date && (
                            <div style={{ color: T.color.muted, fontSize: "0.75rem" }}>
                              {t("died")}: {p.death_date}
                            </div>
                          )}
                          {p.birth_place && (
                            <div style={{ color: T.color.muted, fontSize: "0.75rem" }}>
                              {p.birth_place}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => handleMerge(a.id, b.id)}
                        disabled={isMerging}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          border: "none",
                          background: T.color.terracotta,
                          color: T.color.white,
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          cursor: isMerging ? "not-allowed" : "pointer",
                          opacity: isMerging ? 0.6 : 1,
                          minHeight: "2.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        {isMerging ? t("saving") : t("mergeKeep", { name: displayName(a) })}
                      </button>
                      <button
                        onClick={() => handleMerge(b.id, a.id)}
                        disabled={isMerging}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          border: `1px solid ${T.color.sandstone}60`,
                          background: T.color.white,
                          color: T.color.walnut,
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          cursor: isMerging ? "not-allowed" : "pointer",
                          opacity: isMerging ? 0.6 : 1,
                          minHeight: "2.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        {t("mergeKeep", { name: displayName(b) })}
                      </button>
                      <button
                        onClick={() => handleDismiss(a.id, b.id)}
                        disabled={isMerging}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          border: "none",
                          background: "transparent",
                          color: T.color.muted,
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                          minHeight: "2.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        {t("notDuplicate")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
