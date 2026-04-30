"use client";

import { useState, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";
import { markAsSelf } from "@/lib/auth/family-tree-actions";
import {
  Spinner,
  SectionCard,
  smallPillStyle,
  pillBtnStyle,
  labelStyle,
  getInputStyle,
} from "./PersonPanelShared";
import { DateInputAssisted } from "./DateInputAssisted";

/* ── Notes section (always visible, editable when editing) ── */

interface PersonPanelNotesProps {
  person: FamilyTreePerson;
  isMobile: boolean;
  editing: boolean;
  notes: string;
  setNotes: (v: string) => void;
}

export function PersonPanelNotes({
  person,
  isMobile,
  editing,
  notes,
  setNotes,
}: PersonPanelNotesProps) {
  const { t } = useTranslation("familyTree");
  const inputStyle = getInputStyle(isMobile);

  return (
    <SectionCard>
      <label style={labelStyle}>{t("notes")}</label>
      {editing ? (
        <textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("notesPlaceholder")}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: "4rem",
            borderRadius: "0.75rem",
          }}
        />
      ) : (
        <div
          style={{
            padding: "0.75rem 0.875rem",
            borderRadius: "0.75rem",
            background: `rgba(255,255,255,0.5)`,
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: person.notes ? T.color.charcoal : T.color.muted,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            minHeight: "2.5rem",
            fontStyle: person.notes ? "normal" : "italic",
          }}
        >
          {person.notes || t("notesEmpty")}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Profile completeness calculation ── */

interface CompletenessResult {
  score: number;
  max: number;
  pct: number;
  missing: { key: string; fieldId: string }[];
}

function computeCompleteness(
  person: FamilyTreePerson,
  photo: string | null | undefined,
  birthDate: string,
  birthPlace: string,
  deathDate: string,
  deathPlace: string,
  _notes: string,
): CompletenessResult {
  const isDeceased = !!(person.death_date || person.death_place || deathDate || deathPlace);
  const photoSkipped = photo === "__none__";
  let score = 0;
  let max = isDeceased ? 100 : 80;
  const missing: { key: string; fieldId: string }[] = [];

  // first_name: 20 — always assumed present
  score += 20;

  // photo: 20 (skip from scoring if marked as unavailable)
  if (photoSkipped) {
    max -= 20;
  } else if (photo) {
    score += 20;
  } else {
    missing.push({ key: "addPhoto", fieldId: "photo-upload" });
  }

  // birth_date: 20
  if (birthDate) {
    score += 20;
  } else {
    missing.push({ key: "addBirthDate", fieldId: "edit-birth-date" });
  }

  // birth_place: 20
  if (birthPlace) {
    score += 20;
  } else {
    missing.push({ key: "addBirthPlace", fieldId: "edit-birth-place" });
  }

  // death_date: 10 — only for deceased
  if (isDeceased) {
    if (deathDate) {
      score += 10;
    } else {
      missing.push({ key: "addDeathDate", fieldId: "edit-death-date" });
    }
  }

  // death_place: 10 — only for deceased
  if (isDeceased) {
    if (deathPlace) {
      score += 10;
    } else {
      missing.push({ key: "addDeathPlace", fieldId: "edit-death-place" });
    }
  }

  const pct = max > 0 ? Math.round((score / max) * 100) : 100;
  return { score, max, pct, missing };
}

/* ── Completeness bar component ── */

export function CompletenessBar({
  person,
  photo,
  birthDate,
  birthPlace,
  deathDate,
  deathPlace,
  notes,
  onScrollToField,
}: {
  person: FamilyTreePerson;
  photo: string | null | undefined;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  notes: string;
  onScrollToField: (fieldId: string) => void;
}) {
  const { t } = useTranslation("familyTree");
  const { pct, missing } = computeCompleteness(person, photo, birthDate, birthPlace, deathDate, deathPlace, notes);

  const barColor = pct >= 80 ? T.color.sage : pct >= 40 ? "#D4A840" : T.color.error;
  const isComplete = missing.length === 0;

  return (
    <div style={{ marginBottom: "0.25rem" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.375rem",
        }}
      >
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: T.color.walnut,
          }}
        >
          {t("profileCompleteness")}
        </span>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 700,
            color: barColor,
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: "0.375rem",
          borderRadius: "0.25rem",
          background: `${T.color.sandstone}40`,
          overflow: "hidden",
          marginBottom: "0.5rem",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "0.25rem",
            background: barColor,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Missing field hints or "complete" message */}
      {isComplete ? (
        <>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.sage,
              fontWeight: 500,
            }}
          >
            {t("profileComplete")}
          </div>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: T.color.muted,
              marginTop: "0.25rem",
              fontStyle: "italic",
            }}
          >
            {t("optionalEnrichments")}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {missing.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onScrollToField(m.fieldId)}
              style={{
                padding: "0.1875rem 0.5rem",
                borderRadius: "999rem",
                border: `1px solid ${T.color.sandstone}`,
                background: `${T.color.terracotta}08`,
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: T.color.terracotta,
                cursor: "pointer",
                transition: "all 0.12s ease",
                whiteSpace: "nowrap",
              }}
            >
              {t(m.key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Edit form with all fields ── */

interface PersonPanelEditFormProps {
  person: FamilyTreePerson;
  isMobile: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  deathDate: string;
  setDeathDate: (v: string) => void;
  birthPlace: string;
  setBirthPlace: (v: string) => void;
  deathPlace: string;
  setDeathPlace: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  saving: boolean;
  dateError: string;
  setDateError: (v: string) => void;
  isDirty: boolean;
  onSave: () => void;
  onMarkSelf?: () => void;
}

export default function PersonPanelEditForm({
  person,
  isMobile,
  editing,
  setEditing,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  birthDate,
  setBirthDate,
  deathDate,
  setDeathDate,
  birthPlace,
  setBirthPlace,
  deathPlace,
  setDeathPlace,
  gender,
  setGender,
  notes,
  setNotes,
  saving,
  dateError,
  setDateError,
  isDirty,
  onSave,
  onMarkSelf,
}: PersonPanelEditFormProps) {
  const { t } = useTranslation("familyTree");
  const inputStyle = getInputStyle(isMobile);
  const [markingSelf, setMarkingSelf] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToField = useCallback((fieldId: string) => {
    if (!formRef.current) return;
    const el = formRef.current.querySelector(`#${fieldId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLElement) el.focus();
    }
  }, []);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          ...pillBtnStyle,
          width: "100%",
          background: "rgba(255,255,255,0.6)",
          color: T.color.walnut,
          border: `1px solid ${T.color.sandstone}`,
          marginBottom: "1rem",
        }}
      >
        {t("editDetails")}
      </button>
    );
  }

  const handleToggleSelf = async () => {
    setMarkingSelf(true);
    try {
      const result = await markAsSelf(person.id);
      if ("error" in result && result.error) {
        console.error("markAsSelf error:", result.error);
      } else {
        onMarkSelf?.();
      }
    } finally {
      setMarkingSelf(false);
    }
  };

  return (
    <SectionCard>
      <div ref={formRef} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Profile completeness bar */}
        <CompletenessBar
          person={person}
          photo={person.photo_path}
          birthDate={birthDate}
          birthPlace={birthPlace}
          deathDate={deathDate}
          deathPlace={deathPlace}
          notes={notes}
          onScrollToField={scrollToField}
        />

        {/* This is me toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0.625rem 0.875rem",
            borderRadius: "0.75rem",
            background: person.is_self
              ? `linear-gradient(135deg, ${T.color.gold}18, ${T.color.terracotta}12)`
              : "rgba(255,255,255,0.5)",
            border: `1px solid ${person.is_self ? T.color.gold + "50" : T.color.sandstone}`,
            cursor: markingSelf ? "wait" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <input
            type="checkbox"
            checked={person.is_self}
            onChange={handleToggleSelf}
            disabled={markingSelf || person.is_self}
            style={{
              width: "1.125rem",
              height: "1.125rem",
              accentColor: T.color.terracotta,
              cursor: markingSelf ? "wait" : "pointer",
            }}
          />
          <span style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: person.is_self ? T.color.terracotta : T.color.walnut,
          }}>
            {t("thisIsMe")}
          </span>
          {markingSelf && <Spinner size="0.75rem" color={T.color.terracotta} />}
          {!person.is_self && (
            <span style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              marginLeft: "auto",
            }}>
              {t("thisIsMeHint")}
            </span>
          )}
        </label>

        {/* Name row */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor={`edit-first-${person.id}`} style={labelStyle}>{t("firstNameLabel")}</label>
            <input
              id={`edit-first-${person.id}`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor={`edit-last-${person.id}`} style={labelStyle}>{t("lastNameLabel")}</label>
            <input
              id={`edit-last-${person.id}`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="off"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Date row */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t("born")}</label>
            <DateInputAssisted
              id="edit-birth-date"
              value={birthDate}
              onChange={(v) => {
                setBirthDate(v);
                setDateError("");
              }}
              isMobile={isMobile}
              style={{
                borderRadius: "0.625rem",
                minHeight: isMobile ? "3rem" : "2.75rem",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t("died")}</label>
            <DateInputAssisted
              id="edit-death-date"
              value={deathDate}
              onChange={(v) => {
                setDeathDate(v);
                setDateError("");
              }}
              isMobile={isMobile}
              style={{
                borderRadius: "0.625rem",
                minHeight: isMobile ? "3rem" : "2.75rem",
              }}
            />
          </div>
        </div>

        {/* Place row */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="edit-birth-place" style={labelStyle}>{t("birthPlace")}</label>
            <input
              id="edit-birth-place"
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder={t("birthPlacePlaceholder")}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="edit-death-place" style={labelStyle}>{t("deathPlace")}</label>
            <input
              id="edit-death-place"
              type="text"
              value={deathPlace}
              onChange={(e) => setDeathPlace(e.target.value)}
              placeholder={t("deathPlacePlaceholder")}
              style={inputStyle}
            />
          </div>
        </div>

        {dateError && (
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.error,
            }}
          >
            {dateError}
          </div>
        )}

        {/* Gender */}
        <div>
          <label style={labelStyle}>{t("gender")}</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(gender === g ? "" : g)}
                style={{
                  ...smallPillStyle,
                  background: gender === g ? T.color.walnut : T.color.white,
                  color: gender === g ? T.color.white : T.color.walnut,
                  borderColor: gender === g ? T.color.walnut : T.color.sandstone,
                }}
              >
                {t(g === "male" ? "genderMale" : g === "female" ? "genderFemale" : "genderOther")}
              </button>
            ))}
          </div>
        </div>

        {/* Save / Cancel */}
        <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.25rem" }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              ...pillBtnStyle,
              background: T.color.terracotta,
              color: T.color.white,
              flex: 1,
            }}
          >
            {saving ? (
              <>
                <Spinner size="0.875rem" color={T.color.white} />{" "}
                <span style={{ marginLeft: "0.375rem" }}>{t("saving")}</span>
              </>
            ) : (
              t("save")
            )}
          </button>
          <button
            onClick={() => {
              if (isDirty && !window.confirm(t("unsavedChangesWarning"))) return;
              setEditing(false);
              setFirstName(person.first_name);
              setLastName(person.last_name || "");
              setBirthDate(person.birth_date || "");
              setDeathDate(person.death_date || "");
              setBirthPlace(person.birth_place || "");
              setDeathPlace(person.death_place || "");
              setGender(person.gender || "");
              setNotes(person.notes || "");
              setDateError("");
            }}
            style={{
              ...pillBtnStyle,
              background: T.color.white,
              color: T.color.muted,
              border: `1px solid ${T.color.cream}`,
            }}
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
