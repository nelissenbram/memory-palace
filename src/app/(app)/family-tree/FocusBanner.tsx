import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FamilyTreePerson, FamilyTreeRelationship } from "@/lib/auth/family-tree-actions";

interface FocusBannerProps {
  person: FamilyTreePerson;
  onExit: () => void;
}

export function FocusBanner({ person, onExit }: FocusBannerProps) {
  const { t } = useTranslation("familyTree");
  const name = `${person.first_name}${person.last_name ? " " + person.last_name : ""}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        background: `${T.color.terracotta}15`,
        borderBottom: `1px solid ${T.color.terracotta}30`,
        fontFamily: T.font.body,
        fontSize: "0.875rem",
        color: T.color.charcoal,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {t("focusedOn", { name })}
      </span>
      <button
        onClick={onExit}
        style={{
          padding: "0.25rem 0.75rem",
          borderRadius: "0.5rem",
          border: `1px solid ${T.color.terracotta}40`,
          background: T.color.white,
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: T.color.terracotta,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {t("exitFocus")}
      </button>
    </div>
  );
}

/**
 * Filter persons + relationships to only the focus person's immediate family:
 * parents, children, spouses, ex-spouses, siblings
 */
export function filterToFocus(
  persons: FamilyTreePerson[],
  relationships: FamilyTreeRelationship[],
  focusId: string
): { persons: FamilyTreePerson[]; relationships: FamilyTreeRelationship[] } {
  const keepIds = new Set<string>([focusId]);

  for (const rel of relationships) {
    const isAbout = rel.person_id === focusId || rel.related_person_id === focusId;
    if (!isAbout) continue;

    const otherId = rel.person_id === focusId ? rel.related_person_id : rel.person_id;

    if (
      rel.relationship_type === "parent" ||
      rel.relationship_type === "child" ||
      rel.relationship_type === "spouse" ||
      (rel.relationship_type as string) === "ex-spouse" ||
      rel.relationship_type === "sibling" ||
      (rel.relationship_type as string) === "half-sibling" ||
      (rel.relationship_type as string) === "stepparent" ||
      (rel.relationship_type as string) === "stepchild"
    ) {
      keepIds.add(otherId);
    }
  }

  // Also find siblings via shared parents
  const myParents = new Set<string>();
  for (const rel of relationships) {
    if (rel.relationship_type === "parent" && rel.related_person_id === focusId) {
      myParents.add(rel.person_id);
    }
    if (rel.relationship_type === "child" && rel.person_id === focusId) {
      myParents.add(rel.related_person_id);
    }
  }
  for (const rel of relationships) {
    if (rel.relationship_type === "parent" && myParents.has(rel.person_id)) {
      keepIds.add(rel.related_person_id);
    }
    if (rel.relationship_type === "child" && myParents.has(rel.related_person_id)) {
      keepIds.add(rel.person_id);
    }
  }

  const filteredPersons = persons.filter((p) => keepIds.has(p.id));
  const filteredRels = relationships.filter(
    (r) => keepIds.has(r.person_id) && keepIds.has(r.related_person_id)
  );

  return { persons: filteredPersons, relationships: filteredRels };
}
