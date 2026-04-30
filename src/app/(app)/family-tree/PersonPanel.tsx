"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { updatePerson } from "@/lib/auth/family-tree-actions";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";
import { T } from "@/lib/theme";
import { GoldDivider, isValidFlexDate } from "./PersonPanelShared";
import PersonPanelHeader from "./PersonPanelHeader";
import PersonPanelPhoto from "./PersonPanelPhoto";
import PersonPanelInvite from "./PersonPanelInvite";
import PersonPanelEditForm, { PersonPanelNotes, CompletenessBar } from "./PersonPanelEditForm";
import PersonPanelEvents from "./PersonPanelEvents";
import PersonPanelRelationships from "./PersonPanelRelationships";
import { PersonPanelNavActions, PersonPanelDelete } from "./PersonPanelActions";

interface PersonPanelProps {
  person: FamilyTreePerson;
  allPersons: FamilyTreePerson[];
  relationships: FamilyTreeRelationship[];
  onClose: () => void;
  onUpdate: () => void;
  onSelectPerson?: (person: FamilyTreePerson) => void;
  isMobile?: boolean;
  isCurrentUser?: boolean;
  onRecenter?: (person: FamilyTreePerson) => void;
  onFocus?: (person: FamilyTreePerson) => void;
  onViewDescendants?: (person: FamilyTreePerson) => void;
}

export default function PersonPanel({
  person,
  allPersons,
  relationships,
  onClose,
  onUpdate,
  onSelectPerson,
  isMobile = false,
  isCurrentUser = false,
  onRecenter,
  onFocus,
  onViewDescendants,
}: PersonPanelProps) {
  const { t, locale } = useTranslation("familyTree");
  const { containerRef, handleKeyDown: trapKeyDown } = useFocusTrap(true);

  /* ── Edit form state ── */
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name || "");
  const [birthDate, setBirthDate] = useState(person.birth_date || "");
  const [deathDate, setDeathDate] = useState(person.death_date || "");
  const [birthPlace, setBirthPlace] = useState(person.birth_place || "");
  const [deathPlace, setDeathPlace] = useState(person.death_place || "");
  const [gender, setGender] = useState(person.gender || "");
  const [notes, setNotes] = useState(person.notes || "");
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");
  const editFormRef = useRef<HTMLDivElement>(null);

  /* ── Dirty check for unsaved-changes warning ── */
  const isDirty = editing && (
    firstName !== person.first_name ||
    lastName !== (person.last_name || "") ||
    birthDate !== (person.birth_date || "") ||
    deathDate !== (person.death_date || "") ||
    birthPlace !== (person.birth_place || "") ||
    deathPlace !== (person.death_place || "") ||
    gender !== (person.gender || "") ||
    notes !== (person.notes || "")
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      if (!window.confirm(t("unsavedChangesWarning"))) return;
    }
    setEditing(false);
    onClose();
  }, [isDirty, t, onClose]);

  /** Switch to edit mode and scroll to a specific field */
  const handleCompletnessPillClick = useCallback((fieldId: string) => {
    setEditing(true);
    // Wait for edit form to render, then scroll to field
    setTimeout(() => {
      const el = editFormRef.current?.querySelector(`#${fieldId}`) ||
        document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLElement) el.focus();
      }
    }, 100);
  }, []);

  /* ── Relationships involving this person (deduplicated) ── */
  const personRels = useMemo(() => {
    const raw = relationships.filter(
      (r) => r.person_id === person.id || r.related_person_id === person.id
    );
    // Deduplicate forward+reverse pairs (e.g. A→B parent + B→A child)
    const seen = new Set<string>();
    return raw.filter((r) => {
      const otherId = r.person_id === person.id ? r.related_person_id : r.person_id;
      const pairKey = [person.id, otherId].sort().join("|");
      if (seen.has(pairKey)) return false;
      seen.add(pairKey);
      return true;
    });
  }, [relationships, person.id]);

  /* ── Issue 4d: Auto-derived siblings (share at least one parent) ── */
  const derivedSiblings = useMemo(() => {
    // Find all parents of this person
    const myParentIds = new Set<string>();
    for (const r of relationships) {
      if (r.relationship_type === "parent" && r.related_person_id === person.id) {
        myParentIds.add(r.person_id);
      }
      if (r.relationship_type === "child" && r.person_id === person.id) {
        myParentIds.add(r.related_person_id);
      }
    }
    if (myParentIds.size === 0) return [];
    // Find all other persons who share at least one parent
    const siblingIds = new Set<string>();
    for (const r of relationships) {
      if (r.relationship_type === "parent" && myParentIds.has(r.person_id) && r.related_person_id !== person.id) {
        siblingIds.add(r.related_person_id);
      }
      if (r.relationship_type === "child" && myParentIds.has(r.related_person_id) && r.person_id !== person.id) {
        siblingIds.add(r.person_id);
      }
    }
    return Array.from(siblingIds).map((id) => allPersons.find((p) => p.id === id)).filter(Boolean) as FamilyTreePerson[];
  }, [relationships, person.id, allPersons]);

  /* ── Issue 7: Compute relationship path to self ── */
  const relationToSelf = useMemo(() => {
    const selfPerson = allPersons.find((p) => p.is_self);
    if (!selfPerson || selfPerson.id === person.id) return selfPerson?.id === person.id ? t("relSelf") : null;

    // BFS from self to this person through relationships
    type QueueItem = { personId: string; path: { type: string; toId: string; toGender: string | null }[] };
    const queue: QueueItem[] = [{ personId: selfPerson.id, path: [] }];
    const visited = new Set<string>([selfPerson.id]);

    // Build adjacency from relationships
    const adj = new Map<string, { otherId: string; type: string }[]>();
    for (const r of relationships) {
      if (!adj.has(r.person_id)) adj.set(r.person_id, []);
      adj.get(r.person_id)!.push({ otherId: r.related_person_id, type: r.relationship_type });
    }

    let foundPath: { type: string; toId: string; toGender: string | null }[] | null = null;

    while (queue.length > 0 && !foundPath) {
      const current = queue.shift()!;
      const edges = adj.get(current.personId) || [];
      for (const edge of edges) {
        if (visited.has(edge.otherId)) continue;
        const targetPerson = allPersons.find((p) => p.id === edge.otherId);
        const newPath = [...current.path, { type: edge.type, toId: edge.otherId, toGender: targetPerson?.gender || null }];
        if (edge.otherId === person.id) {
          foundPath = newPath;
          break;
        }
        visited.add(edge.otherId);
        if (newPath.length < 8) { // limit depth
          queue.push({ personId: edge.otherId, path: newPath });
        }
      }
    }

    if (!foundPath) return t("relDistantRelative");

    // Convert path to human-readable label
    const steps = foundPath.map((s) => s.type);
    const lastGender = foundPath[foundPath.length - 1].toGender;

    // Simple cases
    if (steps.length === 1) {
      if (steps[0] === "child") return lastGender === "female" ? t("relDaughter") : lastGender === "male" ? t("relSon") : t("relDescChild");
      if (steps[0] === "parent") return lastGender === "female" ? t("relMother") : lastGender === "male" ? t("relFather") : t("relDescParent");
      if (steps[0] === "spouse") return t("relSpouse");
      if (steps[0] === "sibling") return lastGender === "female" ? t("relDescSibling") : t("relDescSibling");
    }
    // Grandparent / grandchild
    if (steps.length === 2 && steps[0] === "parent" && steps[1] === "parent") {
      return lastGender === "female" ? t("relGrandmother") : lastGender === "male" ? t("relGrandfather") : t("relDescParent");
    }
    if (steps.length === 2 && steps[0] === "child" && steps[1] === "child") {
      return lastGender === "female" ? t("relGranddaughter") : lastGender === "male" ? t("relGrandson") : t("relDescChild");
    }
    // Uncle / aunt
    if (steps.length === 2 && steps[0] === "parent" && (steps[1] === "sibling" || steps[1] === "child")) {
      if (steps[1] === "sibling") return lastGender === "female" ? t("relAunt") : t("relUncle");
    }
    if (steps.length === 3 && steps[0] === "parent" && steps[1] === "parent" && steps[2] === "child") {
      return lastGender === "female" ? t("relAunt") : t("relUncle");
    }
    // Nephew / niece
    if (steps.length === 2 && (steps[0] === "sibling" || steps[0] === "child") && steps[1] === "child") {
      if (steps[0] === "sibling") return lastGender === "female" ? t("relNiece") : t("relNephew");
    }
    // Cousin
    if (steps.length === 3 && steps[0] === "parent" && steps[1] === "sibling" && steps[2] === "child") {
      return t("relCousin");
    }
    if (steps.length === 4 && steps[0] === "parent" && steps[1] === "parent" && steps[2] === "child" && steps[3] === "child") {
      return t("relCousin");
    }
    // Great-grandparent
    if (steps.length >= 3 && steps.every((s) => s === "parent")) {
      const greats = steps.length - 2;
      const prefix = t("relGreatPrefix").repeat(greats);
      return prefix + (lastGender === "female" ? t("relGrandmother") : t("relGrandfather"));
    }
    // Great-grandchild
    if (steps.length >= 3 && steps.every((s) => s === "child")) {
      const greats = steps.length - 2;
      const prefix = t("relGreatPrefix").repeat(greats);
      return prefix + (lastGender === "female" ? t("relGranddaughter") : t("relGrandson"));
    }

    return t("relDistantRelative");
  }, [allPersons, relationships, person.id, t]);

  /* ── Save handler ── */
  const handleSave = async () => {
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
    setSaving(true);
    try {
      const result = await updatePerson(person.id, {
        first_name: firstName,
        last_name: lastName || undefined,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        birth_place: birthPlace || null,
        death_place: deathPlace || null,
        gender: (gender as "male" | "female" | "other") || null,
        notes: notes || null,
      });
      if (result && "error" in result && result.error) {
        setDateError(result.error);
        setSaving(false);
        return;
      }
      setEditing(false);
      onUpdate();
    } catch {
      setDateError(t("saveError"));
    }
    setSaving(false);
  };

  const fullName = `${person.first_name}${person.last_name ? " " + person.last_name : ""}`;

  const genderLabel =
    person.gender === "male"
      ? t("genderMale")
      : person.gender === "female"
        ? t("genderFemale")
        : person.gender === "other"
          ? t("genderOther")
          : null;

  /* ── Style tokens ── */
  const glassBackground = `linear-gradient(135deg, rgba(250,250,247,0.92), rgba(242,237,231,0.88))`;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={fullName}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
        trapKeyDown(e);
      }}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(26.25rem, 100vw)",
        background: glassBackground,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "-8px 0 40px rgba(44,44,42,.18)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "panelSlideIn .35s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <style>{`
        @keyframes panelSlideIn {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes panelSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Header ── */}
      <PersonPanelHeader
        fullName={fullName}
        isCurrentUser={isCurrentUser}
        relationToSelf={relationToSelf}
        onClose={handleClose}
      />

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
        {/* ── Photo + basic info + Invite ── */}
        <PersonPanelPhoto
          person={person}
          fullName={fullName}
          genderLabel={genderLabel}
          onUpdate={onUpdate}
          locale={locale}
        >
          <PersonPanelInvite isMobile={isMobile} personId={person.id} personName={`${person.first_name}${person.last_name ? " " + person.last_name : ""}`} />
        </PersonPanelPhoto>

        {/* ── Completeness bar (always visible) ── */}
        {!editing && (
          <div style={{ margin: "0.75rem 0 0.25rem" }}>
            <CompletenessBar
              person={person}
              photo={person.photo_path}
              birthDate={birthDate}
              birthPlace={birthPlace}
              deathDate={deathDate}
              deathPlace={deathPlace}
              notes={notes}
              onScrollToField={handleCompletnessPillClick}
            />
          </div>
        )}

        <GoldDivider />

        {/* ── Notes ── */}
        <PersonPanelNotes
          person={person}
          isMobile={isMobile}
          editing={editing}
          notes={notes}
          setNotes={setNotes}
        />

        <GoldDivider />

        {/* ── Life Events ── */}
        <PersonPanelEvents
          personId={person.id}
          isMobile={isMobile}
          locale={locale}
        />

        <GoldDivider />

        {/* ── Edit form ── */}
        <div ref={editFormRef}>
        <PersonPanelEditForm
          person={person}
          isMobile={isMobile}
          editing={editing}
          setEditing={setEditing}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          deathDate={deathDate}
          setDeathDate={setDeathDate}
          birthPlace={birthPlace}
          setBirthPlace={setBirthPlace}
          deathPlace={deathPlace}
          setDeathPlace={setDeathPlace}
          gender={gender}
          setGender={setGender}
          notes={notes}
          setNotes={setNotes}
          saving={saving}
          dateError={dateError}
          setDateError={setDateError}
          isDirty={isDirty}
          onSave={handleSave}
          onMarkSelf={onUpdate}
        />
        </div>

        {/* ── Nav actions: Recenter, Focus ── */}
        <PersonPanelNavActions
          person={person}
          isCurrentUser={isCurrentUser}
          onClose={onClose}
          onRecenter={onRecenter}
          onFocus={onFocus}
          onViewDescendants={onViewDescendants}
        />

        <GoldDivider />

        {/* ── Relationships ── */}
        <PersonPanelRelationships
          person={person}
          allPersons={allPersons}
          relationships={relationships}
          personRels={personRels}
          derivedSiblings={derivedSiblings}
          onUpdate={onUpdate}
          onSelectPerson={onSelectPerson}
          isMobile={isMobile}
        />

        <GoldDivider />

        {/* ── Delete ── */}
        <PersonPanelDelete
          person={person}
          fullName={fullName}
          onClose={onClose}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}
