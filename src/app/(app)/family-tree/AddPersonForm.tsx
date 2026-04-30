import { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";
import { CloseIcon } from "./PersonCard";
import { DateInputAssisted } from "./DateInputAssisted";

export interface AddPersonData {
  first_name: string;
  last_name?: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  gender?: "male" | "female" | "other";
  relatedToId?: string;
  relationType?: string;
}

export function AddPersonForm({
  persons,
  onAdd,
  onCancel,
  isMobile,
  defaultRelationType,
  defaultRelatedToId,
}: {
  persons: FamilyTreePerson[];
  onAdd: (data: AddPersonData) => Promise<void> | void;
  onCancel: () => void;
  isMobile: boolean;
  defaultRelationType?: string;
  defaultRelatedToId?: string;
}) {
  const { t } = useTranslation("familyTree");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [deathPlace, setDeathPlace] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [relatedTo, setRelatedTo] = useState(defaultRelatedToId || "");
  const [relationType, setRelationType] = useState(defaultRelationType || "");
  const [dateError, setDateError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputStyle: React.CSSProperties = {
    padding: "0.625rem 0.875rem",
    borderRadius: "0.625rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    color: T.color.charcoal,
    outline: "none",
    minHeight: "2.75rem",
    boxSizing: "border-box",
  };

  const genderPills: { value: "male" | "female" | "other"; label: string }[] = [
    { value: "male", label: t("genderMale") },
    { value: "female", label: t("genderFemale") },
    { value: "other", label: t("genderOther") },
  ];

  const isValidFlexDate = (d: string): boolean => {
    if (!d) return true;
    // Strip optional qualifier prefix (~, <, >)
    const stripped = d.replace(/^[~<>]\s*/, "");
    return /^\d{4}$/.test(stripped) || /^\d{4}-\d{2}$/.test(stripped) || /^\d{4}-\d{2}-\d{2}$/.test(stripped);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (birthDate && !isValidFlexDate(birthDate)) {
      setDateError(t("dateFormatError"));
      return;
    }
    if (deathDate && !isValidFlexDate(deathDate)) {
      setDateError(t("dateFormatError"));
      return;
    }
    if (birthDate && deathDate && deathDate < birthDate) {
      setDateError(t("dateValidationError"));
      return;
    }
    setDateError("");
    setSubmitting(true);
    try {
      const name = first.trim() || t("unknownPerson");
      await onAdd({
        first_name: name,
        last_name: last.trim() || undefined,
        birth_date: birthDate || undefined,
        death_date: deathDate || undefined,
        birth_place: birthPlace.trim() || undefined,
        death_place: deathPlace.trim() || undefined,
        gender: gender || undefined,
        relatedToId: relatedTo || undefined,
        relationType: relationType || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: isMobile ? "1rem" : "1.25rem 1.5rem",
        background: `${T.color.warmStone}E8`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.color.cream}`,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
          }}
        >
          {t("addPersonTitle")}
        </h3>
        <button
          onClick={onCancel}
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "50%",
            border: `1px solid ${T.color.cream}`,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={t("cancel")}
        >
          <CloseIcon size={16} color={T.color.muted} />
        </button>
      </div>

      {/* Names row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <input
          id="family-tree-first-name"
          aria-label={t("firstName")}
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder={t("firstName")}
          style={{ ...inputStyle, flex: "1 1 7rem" }}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <input
          id="family-tree-last-name"
          aria-label={t("lastName")}
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder={t("lastName")}
          style={{ ...inputStyle, flex: "1 1 7rem" }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {/* Dates row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 7rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label
            htmlFor="family-tree-birth"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("birthDate")}
          </label>
          <DateInputAssisted
            id="family-tree-birth"
            value={birthDate}
            onChange={(v) => { setBirthDate(v); setDateError(""); }}
            isMobile={isMobile}
          />
        </div>
        <div style={{ flex: "1 1 7rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label
            htmlFor="family-tree-death"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("deathDate")}
          </label>
          <DateInputAssisted
            id="family-tree-death"
            value={deathDate}
            onChange={(v) => { setDeathDate(v); setDateError(""); }}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Places row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 7rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label
            htmlFor="family-tree-birth-place"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("birthPlace")}
          </label>
          <input
            id="family-tree-birth-place"
            type="text"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder={t("birthPlacePlaceholder")}
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div style={{ flex: "1 1 7rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label
            htmlFor="family-tree-death-place"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("deathPlace")}
          </label>
          <input
            id="family-tree-death-place"
            type="text"
            value={deathPlace}
            onChange={(e) => setDeathPlace(e.target.value)}
            placeholder={t("deathPlacePlaceholder")}
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
      </div>

      {dateError && (
        <p
          style={{
            margin: 0,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: "#b91c1c",
          }}
        >
          {dateError}
        </p>
      )}

      {/* Gender pills */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            marginRight: "0.25rem",
          }}
        >
          {t("gender")}
        </span>
        {genderPills.map((gp) => (
          <button
            key={gp.value}
            type="button"
            onClick={() => setGender(gender === gp.value ? "" : gp.value)}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "1.25rem",
              border: `1px solid ${gender === gp.value ? T.color.terracotta : T.color.sandstone}`,
              background: gender === gp.value ? `${T.color.terracotta}18` : T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: gender === gp.value ? T.color.terracotta : T.color.charcoal,
              cursor: "pointer",
              minHeight: "2.75rem",
              fontWeight: gender === gp.value ? 600 : 400,
              transition: "all 0.15s ease",
            }}
          >
            {gp.label}
          </button>
        ))}
      </div>

      {/* Relate to existing person */}
      {persons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Relationship type pills */}
          <div>
            <label
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.muted,
                marginBottom: "0.25rem",
                display: "block",
              }}
            >
              {first.trim()
                ? t("relSentenceLabel", { name: first.trim() })
                : t("relationshipType")}
            </label>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {(["parent", "child", "spouse", "ex-spouse", "stepparent", "stepchild", "half-sibling"] as const).map((rt) => {
                const isSubdued = rt === "ex-spouse";
                const labelMap: Record<string, string> = {
                  parent: t("relDescParent"),
                  child: t("relDescChild"),
                  spouse: t("relDescSpouse"),
                  "ex-spouse": t("relDescExSpouse"),
                  stepparent: t("stepparent"),
                  stepchild: t("stepchild"),
                  "half-sibling": t("halfSibling"),
                };
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRelationType(relationType === rt ? "" : rt)}
                    style={{
                      padding: "0.375rem 0.875rem",
                      borderRadius: "1.25rem",
                      border: `1px solid ${relationType === rt
                        ? isSubdued ? T.color.muted : T.color.walnut
                        : T.color.sandstone}`,
                      background: relationType === rt
                        ? isSubdued ? T.color.muted : T.color.walnut
                        : T.color.white,
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: relationType === rt ? T.color.white : T.color.walnut,
                      cursor: "pointer",
                      minHeight: "2.75rem",
                      fontWeight: relationType === rt ? 600 : 400,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {labelMap[rt] || rt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirmation sentence */}
          {relationType && relatedTo && (() => {
            const selectedPerson = persons.find((p) => p.id === relatedTo);
            if (!selectedPerson) return null;
            const newName = first.trim() || t("unknownPerson");
            const otherName = `${selectedPerson.first_name}${selectedPerson.last_name ? " " + selectedPerson.last_name : ""}`;
            const relLabelMap: Record<string, string> = {
              parent: t("relPreviewParent"),
              child: t("relPreviewChild"),
              spouse: t("relPreviewSpouse"),
              "ex-spouse": t("relPreviewExSpouse"),
              stepparent: t("relPreviewStepparent"),
              stepchild: t("relPreviewStepchild"),
              "half-sibling": t("relPreviewHalfSibling"),
            };
            const relLabel = relLabelMap[relationType] || relationType;
            return (
              <p
                style={{
                  margin: 0,
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  color: T.color.walnut,
                  fontWeight: 600,
                  padding: "0.5rem 0.75rem",
                  background: `${T.color.gold}18`,
                  borderRadius: "0.5rem",
                  border: `1px solid ${T.color.gold}40`,
                }}
              >
                {t("relPreview", { person: newName, relType: relLabel, other: otherName })}
              </p>
            );
          })()}

          {/* Person search / select */}
          {relationType && (
            <div>
              <label
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.muted,
                  marginBottom: "0.25rem",
                  display: "block",
                }}
              >
                {t("relateToExisting")}
              </label>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {persons.map((p) => {
                  const isSelected = relatedTo === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRelatedTo(isSelected ? "" : p.id)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "1.25rem",
                        border: `1px solid ${isSelected ? T.color.terracotta : T.color.sandstone}`,
                        background: isSelected ? `${T.color.terracotta}18` : T.color.white,
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: isSelected ? T.color.terracotta : T.color.charcoal,
                        cursor: "pointer",
                        minHeight: "2.75rem",
                        fontWeight: isSelected ? 600 : 400,
                        transition: "all 0.15s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      {p.first_name} {p.last_name || ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          disabled={submitting}
          onClick={async () => {
            if (submitting) return;
            setSubmitting(true);
            try {
              await onAdd({
                first_name: t("unknownPerson"),
                last_name: undefined,
                birth_date: undefined,
                death_date: undefined,
                gender: undefined,
                relatedToId: relatedTo || undefined,
                relationType: relationType || undefined,
              });
            } finally {
              setSubmitting(false);
            }
          }}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            border: `1px solid ${T.color.sandstone}`,
            background: "transparent",
            color: T.color.walnut,
            minHeight: "2.75rem",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {t("addUnknown")}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            border: `1px solid ${T.color.cream}`,
            background: "transparent",
            color: T.color.muted,
            minHeight: "2.75rem",
          }}
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            border: "none",
            background: T.color.sage,
            color: T.color.white,
            minHeight: "2.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? t("adding") : t("add")}
        </button>
      </div>
    </div>
  );
}
