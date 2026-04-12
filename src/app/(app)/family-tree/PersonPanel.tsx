"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import Image from "next/image";
import {
  updatePerson,
  deletePerson,
  addRelationship,
  removeRelationship,
} from "@/lib/auth/family-tree-actions";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";

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
}

/* ── Relationship types ── */
const REL_TYPES = ["parent", "child", "spouse", "ex-spouse", "stepparent", "stepchild", "half-sibling"] as const;
type RelType = (typeof REL_TYPES)[number];

/* ── Gender icon helper (Roman-inspired symbols) ── */
function GenderIcon({ gender }: { gender: string | null }) {
  const c = T.color.walnut;
  if (gender === "male")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {/* Mars symbol with laurel hint */}
        <circle cx="6.5" cy="9.5" r="4" stroke={c} strokeWidth="1.5" />
        <line x1="9.5" y1="6.5" x2="14" y2="2" stroke={c} strokeWidth="1.5" />
        <line x1="11" y1="2" x2="14" y2="2" stroke={c} strokeWidth="1.5" />
        <line x1="14" y1="2" x2="14" y2="5" stroke={c} strokeWidth="1.5" />
        {/* Laurel leaf accents */}
        <path d="M3.5 7 Q4.5 6 5 7.5" stroke={c} strokeWidth="0.5" opacity="0.3" fill="none" />
        <path d="M3.5 12 Q4.5 13 5 11.5" stroke={c} strokeWidth="0.5" opacity="0.3" fill="none" />
      </svg>
    );
  if (gender === "female")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {/* Venus symbol with stola hint */}
        <circle cx="8" cy="6" r="4" stroke={c} strokeWidth="1.5" />
        <line x1="8" y1="10" x2="8" y2="15" stroke={c} strokeWidth="1.5" />
        <line x1="5.5" y1="12.5" x2="10.5" y2="12.5" stroke={c} strokeWidth="1.5" />
        {/* Hair wave accent */}
        <path d="M5 4 Q6 2.5 8 2.5 Q10 2.5 11 4" stroke={c} strokeWidth="0.5" opacity="0.3" fill="none" />
      </svg>
    );
  if (gender === "other")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {/* Column/neutral symbol */}
        <rect x="6" y="2" width="4" height="1" rx="0.3" stroke={c} strokeWidth="0.8" fill="none" />
        <rect x="6.5" y="3" width="3" height="9" rx="0.3" stroke={c} strokeWidth="1.2" fill="none" />
        <rect x="5.5" y="12" width="5" height="1" rx="0.3" stroke={c} strokeWidth="0.8" fill="none" />
        {/* Fluting lines */}
        <line x1="8" y1="3.5" x2="8" y2="11.5" stroke={c} strokeWidth="0.4" opacity="0.3" />
      </svg>
    );
  return null;
}

/* ── Mail icon ── */
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke={T.color.sage} strokeWidth="1.3" />
      <path d="M1.5 5l6.5 4 6.5-4" stroke={T.color.sage} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Age category helper ── */
function getAgeCategory(birthDate: string | null, deathDate: string | null): "baby" | "child" | "teen" | "adult" | "elder" {
  if (!birthDate) return "adult";
  const refDate = deathDate ? new Date(deathDate) : new Date();
  const birth = new Date(birthDate);
  let age = refDate.getFullYear() - birth.getFullYear();
  const m = refDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) age--;
  if (age < 4) return "baby";
  if (age < 13) return "child";
  if (age < 18) return "teen";
  if (age < 65) return "adult";
  return "elder";
}

/* ── Roman silhouette avatar (age/gender aware, Tuscan-inspired) ── */
function SilhouetteAvatar({ gender, size = 24, birthDate, deathDate }: {
  gender: string | null; size?: number;
  birthDate?: string | null; deathDate?: string | null;
}) {
  const age = getAgeCategory(birthDate || null, deathDate || null);
  const isDead = !!deathDate;
  const c = isDead ? T.color.muted : T.color.walnut;
  const opacity = isDead ? 0.3 : 0.45;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={c} opacity={opacity} style={{ display: "block" }}>
      {age === "baby" ? (
        /* Baby: swaddled Roman infant */
        <>
          <circle cx="12" cy="7.5" r="3.2" />
          <ellipse cx="12" cy="16" rx="5" ry="5.5" />
          <path d="M8.5 13 Q12 11 15.5 13" fill="none" stroke={c} strokeWidth="0.6" opacity="0.4" />
          <path d="M9 15.5 Q12 13.5 15 15.5" fill="none" stroke={c} strokeWidth="0.5" opacity="0.3" />
          <path d="M9.5 18 Q12 16 14.5 18" fill="none" stroke={c} strokeWidth="0.5" opacity="0.3" />
        </>
      ) : age === "child" ? (
        /* Child: small toga figure */
        <>
          <circle cx="12" cy="7" r="3.2" />
          <path d="M12 10.2 C8 10.2 6.5 14.5 6.5 19 L17.5 19 C17.5 14.5 16 10.2 12 10.2Z" />
          <path d="M8 12 Q10 10.8 12 11.2 Q14 10.8 15.5 12" fill="none" stroke={c} strokeWidth="0.6" opacity="0.35" />
          <path d="M9 14.5 L9 18" fill="none" stroke={c} strokeWidth="0.4" opacity="0.25" />
        </>
      ) : age === "elder" ? (
        /* Elder: stooped figure with toga drape */
        gender === "female" ? (
          <>
            <circle cx="12" cy="6.5" r="3.4" />
            <ellipse cx="12" cy="4.2" rx="2" ry="1.2" fill={c} opacity="0.3" />
            <path d="M12.5 10 C6 10.5 3.5 15.5 3.5 20.5 L20.5 20.5 C20.5 15.5 17.5 10 12.5 10Z" />
            <path d="M6 12 Q9 10 12 11 Q15 10 18 12" fill="none" stroke={c} strokeWidth="0.7" opacity="0.4" />
            <path d="M10 14 L9.5 20" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <path d="M14 14 L14.5 20" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
          </>
        ) : (
          <>
            <circle cx="12" cy="6.5" r="3.4" />
            <path d="M8.5 5.5 Q10 3.5 12 3.8 Q14 3.5 15.5 5.5" fill="none" stroke={c} strokeWidth="0.6" opacity="0.35" />
            <path d="M12.5 10 C6 10 4 15 4 20.5 L20 20.5 C20 15 18 10 12.5 10Z" />
            <path d="M7 12 Q10 10.5 12 11.5 Q14 10.5 17 12" fill="none" stroke={c} strokeWidth="0.7" opacity="0.4" />
            <path d="M10 13 L9 20" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <path d="M14 13 L15 20" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
          </>
        )
      ) : (
        /* Adult: refined Roman silhouette */
        gender === "female" ? (
          <>
            <circle cx="12" cy="6.5" r="3.6" />
            <ellipse cx="12" cy="4" rx="2.2" ry="1.3" fill={c} opacity="0.3" />
            <path d="M12 10 C6 10 4 16 4 21 L20 21 C20 16 18 10 12 10Z" />
            <path d="M6.5 12 Q9 10 12 11 Q15 10 17.5 12" fill="none" stroke={c} strokeWidth="0.7" opacity="0.4" />
            <path d="M10 13 L9 20.5" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <path d="M14 13 L15 20.5" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
          </>
        ) : gender === "male" ? (
          <>
            <circle cx="12" cy="6" r="3.6" />
            <path d="M7.8 5 Q9.5 2.5 12 3 Q14.5 2.5 16.2 5" fill="none" stroke={c} strokeWidth="0.7" opacity="0.4" />
            <path d="M12 9.5 C6 9.5 4 15.5 4 21 L20 21 C20 15.5 18 9.5 12 9.5Z" />
            <path d="M6 11.5 Q9.5 9.5 12 11 Q14 12 17 11" fill="none" stroke={c} strokeWidth="0.7" opacity="0.4" />
            <path d="M9.5 12.5 L8.5 20.5" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <path d="M14.5 12.5 L15.5 20.5" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
          </>
        ) : (
          /* Other/Unknown: Classical column */
          <>
            <rect x="8" y="3" width="8" height="2" rx="0.5" fill={c} opacity="0.6" />
            <rect x="7" y="2.5" width="10" height="1.2" rx="0.3" fill={c} opacity="0.4" />
            <rect x="8.5" y="5" width="7" height="13" rx="0.5" />
            <path d="M9.8 5 L9.8 18" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <path d="M12 5 L12 18" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <path d="M14.2 5 L14.2 18" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2" />
            <rect x="7.5" y="18" width="9" height="1.2" rx="0.3" fill={c} opacity="0.5" />
            <rect x="7" y="19" width="10" height="1.5" rx="0.4" fill={c} opacity="0.6" />
          </>
        )
      )}
    </svg>
  );
}

/* ── Spinner ── */
function Spinner({ size = "1rem", color = T.color.walnut }: { size?: string; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}30`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "panelSpin .6s linear infinite",
        verticalAlign: "middle",
      }}
    />
  );
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
}: PersonPanelProps) {
  const { t, locale } = useTranslation("familyTree");
  const { containerRef, handleKeyDown: trapKeyDown } = useFocusTrap(true);

  /* ── Edit form state ── */
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name || "");
  const [birthDate, setBirthDate] = useState(person.birth_date || "");
  const [deathDate, setDeathDate] = useState(person.death_date || "");
  const [gender, setGender] = useState(person.gender || "");
  const [notes, setNotes] = useState(person.notes || "");
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");

  /* ── Photo state ── */
  const [uploading, setUploading] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Relationship state ── */
  const [showAddRel, setShowAddRel] = useState(false);
  const [relPersonId, setRelPersonId] = useState("");
  const [relType, setRelType] = useState<RelType>("parent");
  const [relError, setRelError] = useState("");
  const [relSearch, setRelSearch] = useState("");
  const [relDropdownOpen, setRelDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Delete state ── */
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── Invite state ── */
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

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

  const getPersonById = (id: string) => allPersons.find((x) => x.id === id);

  const getPersonName = (id: string) => {
    const p = getPersonById(id);
    return p ? `${p.first_name}${p.last_name ? " " + p.last_name : ""}` : t("unknown");
  };

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
    // Normalize: "child" from self means "my child", "parent" means "my parent"
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
    // Uncle / aunt: parent -> sibling or parent -> parent -> child
    if (steps.length === 2 && steps[0] === "parent" && (steps[1] === "sibling" || steps[1] === "child")) {
      // parent's sibling = uncle/aunt; parent's child could be sibling (if not self)
      if (steps[1] === "sibling") return lastGender === "female" ? t("relAunt") : t("relUncle");
    }
    if (steps.length === 3 && steps[0] === "parent" && steps[1] === "parent" && steps[2] === "child") {
      return lastGender === "female" ? t("relAunt") : t("relUncle");
    }
    // Nephew / niece: sibling -> child
    if (steps.length === 2 && (steps[0] === "sibling" || steps[0] === "child") && steps[1] === "child") {
      if (steps[0] === "sibling") return lastGender === "female" ? t("relNiece") : t("relNephew");
    }
    // Cousin: parent -> sibling -> child OR parent -> parent -> child -> child
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

  /** Format an ISO date string in a human-friendly way using the active locale */
  const formatDateHuman = (d: string | null): string => {
    if (!d) return "";
    try {
      const date = new Date(d + "T00:00:00");
      return date.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  /* ── Save handler ── */
  const handleSave = async () => {
    if (birthDate && deathDate && deathDate < birthDate) {
      setDateError(t("dateValidationError"));
      return;
    }
    setDateError("");
    setSaving(true);
    await updatePerson(person.id, {
      first_name: firstName,
      last_name: lastName || undefined,
      birth_date: birthDate || null,
      death_date: deathDate || null,
      gender: (gender as "male" | "female" | "other") || null,
      notes: notes || null,
    });
    setSaving(false);
    setEditing(false);
    onUpdate();
  };

  /* ── Delete handler ── */
  const handleDelete = async () => {
    await deletePerson(person.id);
    onUpdate();
    onClose();
  };

  /* ── Relationship handler ── */
  const handleAddRelationship = async () => {
    if (!relPersonId) return;
    setRelError("");
    const result = await addRelationship(person.id, relPersonId, relType);
    if (result?.error) {
      setRelError(t("relationshipAddError"));
      return;
    }
    setShowAddRel(false);
    setRelPersonId("");
    setRelSearch("");
    onUpdate();
  };

  const handleRemoveRel = async (relId: string) => {
    await removeRelationship(relId);
    onUpdate();
  };

  /* ── Photo upload (robust version with drag-drop + preview) ── */
  const processPhotoFile = useCallback(async (file: File) => {
    setUploading(true);
    setPhotoError("");

    // Show immediate preview
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPhotoError(t("photoUploadError")); setUploading(false); return; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/family-tree/${person.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("memories")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        console.error("Photo upload error:", upErr);
        setPhotoError(t("photoUploadError") + ": " + upErr.message);
        setPhotoPreview(null);
      } else {
        const { data: urlData } = supabase.storage
          .from("memories")
          .getPublicUrl(path);
        await updatePerson(person.id, { photo_path: urlData.publicUrl });
        setPhotoPreview(null);
        onUpdate();
      }
    } catch (err) {
      console.error("Photo upload exception:", err);
      setPhotoError(t("photoUploadError"));
      setPhotoPreview(null);
    }
    setUploading(false);
  }, [person.id, t, onUpdate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPhotoFile(file);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        await processPhotoFile(file);
      }
    },
    [processPhotoFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    setPhotoError("");
    try {
      await updatePerson(person.id, { photo_path: null });
      onUpdate();
    } catch {
      setPhotoError(t("photoRemoveError"));
    }
    setRemovingPhoto(false);
  };

  /* ── Searchable person list for add-relationship ── */
  const filteredPersons = useMemo(() => {
    const others = allPersons.filter((p) => p.id !== person.id);
    if (!relSearch.trim()) return others;
    const q = relSearch.toLowerCase();
    return others.filter((p) => {
      const name = `${p.first_name} ${p.last_name || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [allPersons, person.id, relSearch]);

  const fullName = `${person.first_name}${person.last_name ? " " + person.last_name : ""}`;

  const genderLabel =
    person.gender === "male"
      ? t("genderMale")
      : person.gender === "female"
        ? t("genderFemale")
        : person.gender === "other"
          ? t("genderOther")
          : null;

  const displayPhoto = photoPreview || person.photo_path;

  /* ── Rel type i18n maps ── */
  const relTypeLabel = (rt: RelType | string): string => {
    const map: Record<string, string> = {
      parent: t("relDescParent"),
      child: t("relDescChild"),
      spouse: t("relDescSpouse"),
      sibling: t("relDescSibling"),
      "ex-spouse": t("exSpouse"),
      stepparent: t("stepparent"),
      stepchild: t("stepchild"),
      "half-sibling": t("halfSibling"),
    };
    return map[rt] || rt;
  };

  const relOfNameLabel = (rt: RelType): string => {
    const map: Record<string, string> = {
      parent: t("parentOfName", { name: person.first_name }),
      child: t("childOfName", { name: person.first_name }),
      spouse: t("spouseOfName", { name: person.first_name }),
      sibling: t("siblingOfName", { name: person.first_name }),
      "ex-spouse": t("exSpouseOfName", { name: person.first_name }),
      stepparent: t("relStepparentOfName", { name: person.first_name }),
      stepchild: t("relStepchildOfName", { name: person.first_name }),
      "half-sibling": t("relHalfSiblingOfName", { name: person.first_name }),
    };
    return map[rt] || rt;
  };

  const relPreviewKey = (rt: RelType): string => {
    const map: Record<string, string> = {
      parent: t("relPreviewParent"),
      child: t("relPreviewChild"),
      spouse: t("relPreviewSpouse"),
      sibling: t("relPreviewSibling"),
      "ex-spouse": t("relPreviewExSpouse"),
      stepparent: t("relPreviewStepparent"),
      stepchild: t("relPreviewStepchild"),
      "half-sibling": t("relPreviewHalfSibling"),
    };
    return map[rt] || rt;
  };

  /* ── Style tokens ── */
  const glassBackground = `linear-gradient(135deg, rgba(250,250,247,0.92), rgba(242,237,231,0.88))`;
  const glassBorder = `1px solid rgba(212,197,178,0.4)`;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: isMobile ? "0.75rem 0.875rem" : "0.625rem 0.875rem",
    borderRadius: "1.25rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: isMobile ? "1rem" : "0.875rem",
    color: T.color.charcoal,
    outline: "none",
    boxSizing: "border-box",
    minHeight: "2.75rem",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: isMobile ? "0.875rem" : "0.75rem",
    fontWeight: 600,
    color: T.color.walnut,
    marginBottom: "0.25rem",
    display: "block",
  };

  const pillBtnStyle: React.CSSProperties = {
    padding: "0.625rem 1.25rem",
    borderRadius: "999rem",
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    minHeight: "2.75rem",
    minWidth: "2.75rem",
    transition: "all .15s ease",
  };

  const smallPillStyle: React.CSSProperties = {
    padding: "0.375rem 0.875rem",
    borderRadius: "999rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.75rem",
    color: T.color.walnut,
    cursor: "pointer",
    minHeight: "2.75rem",
    minWidth: "2.75rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .15s ease",
  };

  /* ── Gold divider ── */
  const GoldDivider = () => (
    <div
      style={{
        height: "1px",
        background: `linear-gradient(90deg, transparent, ${T.color.gold}60, transparent)`,
        margin: "1.25rem 0",
      }}
    />
  );

  /* ── Section card wrapper ── */
  const SectionCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "1rem",
        background: `rgba(255,255,255,0.55)`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: glassBorder,
        marginBottom: "1rem",
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={fullName}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
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
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: `1px solid ${T.color.gold}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.3)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: "1.375rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {fullName}
            </h2>
            {isCurrentUser && (
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: T.color.sage,
                  background: `${T.color.sage}18`,
                  padding: "0.125rem 0.5rem",
                  borderRadius: "999rem",
                }}
              >
                {t("isYou")}
              </span>
            )}
          </div>
          {/* Relationship to user */}
          {relationToSelf && !isCurrentUser && (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.muted,
                fontStyle: "italic",
                marginTop: "0.125rem",
              }}
            >
              {t("relationToYou", { relation: relationToSelf })}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label={t("close")}
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "999rem",
            border: glassBorder,
            background: "rgba(255,255,255,0.6)",
            fontSize: "1.125rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.color.muted,
            minWidth: "2.75rem",
            minHeight: "2.75rem",
            transition: "all .15s ease",
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
        {/* ── Photo + basic info ── */}
        <SectionCard>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
            }}
          >
            {/* Photo avatar with drag-drop */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileRef.current?.click()}
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "2.5rem",
                border: dragOver
                  ? `3px dashed ${T.color.terracotta}`
                  : `3px solid ${T.color.walnut}`,
                background: dragOver
                  ? `${T.color.terracotta}15`
                  : `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                color: T.color.walnut,
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
                cursor: "pointer",
                transition: "border-color .2s ease",
              }}
              title={t("uploadPhoto")}
            >
              {uploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    borderRadius: "50%",
                  }}
                >
                  <Spinner size="1.5rem" color={T.color.terracotta} />
                </div>
              )}
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  alt={fullName}
                  fill
                  sizes="80px"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <SilhouetteAvatar gender={person.gender} size={36} birthDate={person.birth_date} deathDate={person.death_date} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.display,
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: T.color.charcoal,
                }}
              >
                {fullName}
              </div>
              {/* Gender display with icon */}
              {genderLabel && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    marginTop: "0.125rem",
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: T.color.walnut,
                  }}
                >
                  <GenderIcon gender={person.gender} />
                  <span>{genderLabel}</span>
                </div>
              )}
              {/* Lifespan with human-friendly dates */}
              {(person.birth_date || person.death_date) && (
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: T.color.muted,
                    marginTop: "0.125rem",
                  }}
                  title={
                    [
                      person.birth_date ? `${t("born")}: ${formatDateHuman(person.birth_date)}` : "",
                      person.death_date ? `${t("died")}: ${formatDateHuman(person.death_date)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" \u2014 ")
                  }
                >
                  {person.birth_date ? formatDateHuman(person.birth_date) : "?"} {"\u2013"}{" "}
                  {person.death_date ? formatDateHuman(person.death_date) : ""}
                </div>
              )}

              {/* Photo actions */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                  disabled={uploading}
                  style={smallPillStyle}
                >
                  {uploading ? (
                    <>
                      <Spinner size="0.75rem" color={T.color.walnut} />{" "}
                      <span style={{ marginLeft: "0.375rem" }}>{t("uploadingPhoto")}</span>
                    </>
                  ) : (
                    t("uploadPhoto")
                  )}
                </button>
                {person.photo_path && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={removingPhoto}
                    style={{
                      ...smallPillStyle,
                      color: T.color.error,
                      borderColor: `${T.color.error}40`,
                    }}
                  >
                    {removingPhoto ? t("removingPhoto") : t("removePhoto")}
                  </button>
                )}
              </div>
              {photoError && (
                <div
                  style={{
                    marginTop: "0.375rem",
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.error,
                  }}
                >
                  {photoError}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* ── Invite button ── */}
          <div style={{ marginTop: "0.875rem" }}>
            {!showInvite ? (
              <button
                onClick={() => setShowInvite(true)}
                style={{
                  ...smallPillStyle,
                  color: T.color.sage,
                  borderColor: `${T.color.sage}50`,
                  gap: "0.375rem",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <MailIcon />
                <span>{t("invitePerson")}</span>
              </button>
            ) : (
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: `${T.color.sage}0A`,
                  border: `1px solid ${T.color.sage}30`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <label
                  style={{
                    ...labelStyle,
                    color: T.color.sage,
                  }}
                >
                  {t("inviteEmail")}
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("invitePlaceholder")}
                  style={{
                    ...inputStyle,
                    borderColor: `${T.color.sage}40`,
                  }}
                />
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.muted,
                    fontStyle: "italic",
                  }}
                >
                  {t("inviteHint")}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    disabled={!inviteEmail.includes("@")}
                    style={{
                      ...pillBtnStyle,
                      background: inviteEmail.includes("@") ? T.color.sage : T.color.sandstone,
                      color: T.color.white,
                      flex: 1,
                      fontSize: "0.8125rem",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    {t("inviteSend")}
                  </button>
                  <button
                    onClick={() => {
                      setShowInvite(false);
                      setInviteEmail("");
                    }}
                    style={{
                      ...pillBtnStyle,
                      background: T.color.white,
                      color: T.color.muted,
                      border: `1px solid ${T.color.cream}`,
                      fontSize: "0.8125rem",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <GoldDivider />

        {/* ── Notes section ── */}
        <SectionCard>
          <label style={labelStyle}>{t("notes")}</label>
          {editing ? (
            <textarea
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

        <GoldDivider />

        {/* ── Edit form — all fields at once ── */}
        {editing ? (
          <SectionCard>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(e.target.value);
                      setDateError("");
                    }}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t("died")}</label>
                  <input
                    type="date"
                    value={deathDate}
                    onChange={(e) => {
                      setDeathDate(e.target.value);
                      setDateError("");
                    }}
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

              {/* Notes (already shown above, but editable inline in that section) */}

              {/* Save / Cancel */}
              <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.25rem" }}>
                <button
                  onClick={handleSave}
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
                    setEditing(false);
                    setFirstName(person.first_name);
                    setLastName(person.last_name || "");
                    setBirthDate(person.birth_date || "");
                    setDeathDate(person.death_date || "");
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
        ) : (
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
        )}

        {/* View This Tree button — re-center tree on this person */}
        {onRecenter && !isCurrentUser && (
          <button
            onClick={() => {
              onRecenter(person);
              onClose();
            }}
            style={{
              width: "100%",
              padding: "0.625rem 1rem",
              borderRadius: "0.75rem",
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              background: `${T.color.sage}18`,
              color: T.color.sage,
              border: `1px solid ${T.color.sage}40`,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: "2.75rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.sage} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
            {t("viewThisTree")}
          </button>
        )}

        <GoldDivider />

        {/* ── Relationships ── */}
        <SectionCard>
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: T.color.charcoal,
              marginBottom: "0.75rem",
              marginTop: 0,
            }}
          >
            {t("relationships")}
          </h3>

          {personRels.length === 0 ? (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.muted,
                fontStyle: "italic",
              }}
            >
              {t("noRelationships")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {personRels.map((rel) => {
                const otherId =
                  rel.person_id === person.id
                    ? rel.related_person_id
                    : rel.person_id;
                const otherPerson = getPersonById(otherId);
                const otherName = getPersonName(otherId);
                const rawLabel =
                  rel.person_id === person.id
                    ? rel.relationship_type
                    : reverseRelType(rel.relationship_type);
                const isExSpouse = rawLabel === "ex-spouse";
                const relDescMap: Record<string, string> = {
                  parent: t("relDescParent"),
                  child: t("relDescChild"),
                  spouse: t("relDescSpouse"),
                  sibling: t("relDescSibling"),
                  "ex-spouse": t("exSpouse"),
                  stepparent: t("stepparent"),
                  stepchild: t("stepchild"),
                  "half-sibling": t("halfSibling"),
                };
                const relDesc = relDescMap[rawLabel] || rawLabel;

                return (
                  <div
                    key={rel.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.625rem 0.875rem",
                      borderRadius: "0.75rem",
                      background: isExSpouse
                        ? `rgba(116,107,96,0.06)`
                        : `rgba(255,255,255,0.5)`,
                      border: glassBorder,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {/* Small photo thumbnail in relationship row */}
                      {otherPerson && (
                        <div
                          style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "1rem",
                            border: `2px solid ${isExSpouse ? T.color.muted : T.color.walnut}`,
                            background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                            overflow: "hidden",
                            flexShrink: 0,
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.875rem",
                            opacity: isExSpouse ? 0.6 : 1,
                          }}
                        >
                          {otherPerson.photo_path ? (
                            <Image
                              src={otherPerson.photo_path}
                              alt={otherName}
                              fill
                              sizes="32px"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <SilhouetteAvatar gender={otherPerson.gender} size={20} birthDate={otherPerson.birth_date} deathDate={otherPerson.death_date} />
                          )}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.0625rem",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: T.font.body,
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: isExSpouse ? T.color.muted : T.color.walnut,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            textDecoration: isExSpouse ? "line-through" : "none",
                          }}
                        >
                          {relDesc}
                        </span>
                        <button
                          onClick={() => {
                            if (onSelectPerson && otherPerson) {
                              onSelectPerson(otherPerson);
                            }
                          }}
                          disabled={!onSelectPerson || !otherPerson}
                          style={{
                            fontFamily: T.font.display,
                            fontSize: "0.9375rem",
                            fontWeight: 600,
                            color: isExSpouse
                              ? T.color.muted
                              : onSelectPerson && otherPerson
                                ? T.color.terracotta
                                : T.color.charcoal,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: onSelectPerson && otherPerson ? "pointer" : "default",
                            textAlign: "left",
                            textDecoration: onSelectPerson && otherPerson ? "underline" : "none",
                            textDecorationColor: `${T.color.terracotta}40`,
                            textUnderlineOffset: "0.125rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            opacity: isExSpouse ? 0.7 : 1,
                          }}
                          title={otherName}
                        >
                          {otherName}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRel(rel.id)}
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        borderRadius: "999rem",
                        border: glassBorder,
                        background: "rgba(255,255,255,0.6)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        color: T.color.muted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        minWidth: "2.75rem",
                        minHeight: "2.75rem",
                      }}
                      title={t("removeRelationship")}
                      aria-label={t("removeRelationship")}
                    >
                      {"\u2715"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Auto-derived siblings (Issue 4d) ── */}
          {derivedSiblings.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: T.color.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "0.375rem",
                }}
              >
                {t("siblings")}
                <span
                  style={{
                    fontWeight: 400,
                    fontStyle: "italic",
                    textTransform: "none",
                    marginLeft: "0.375rem",
                    fontSize: "0.625rem",
                  }}
                >
                  ({t("siblingAutoDesc")})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {derivedSiblings.map((sib) => {
                  const sibName = `${sib.first_name}${sib.last_name ? " " + sib.last_name : ""}`;
                  return (
                    <div
                      key={sib.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.5rem 0.875rem",
                        borderRadius: "0.75rem",
                        background: `${T.color.sage}08`,
                        border: `1px solid ${T.color.sage}20`,
                      }}
                    >
                      <div
                        style={{
                          width: "1.75rem",
                          height: "1.75rem",
                          borderRadius: "0.875rem",
                          border: `2px solid ${T.color.sage}60`,
                          background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                          overflow: "hidden",
                          flexShrink: 0,
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {sib.photo_path ? (
                          <Image src={sib.photo_path} alt={sibName} fill sizes="28px" style={{ objectFit: "cover" }} />
                        ) : (
                          <SilhouetteAvatar gender={sib.gender} size={16} birthDate={sib.birth_date} deathDate={sib.death_date} />
                        )}
                      </div>
                      <button
                        onClick={() => onSelectPerson && onSelectPerson(sib)}
                        disabled={!onSelectPerson}
                        style={{
                          fontFamily: T.font.display,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: onSelectPerson ? T.color.terracotta : T.color.charcoal,
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: onSelectPerson ? "pointer" : "default",
                          textDecoration: onSelectPerson ? "underline" : "none",
                          textDecorationColor: `${T.color.terracotta}40`,
                          textUnderlineOffset: "0.125rem",
                        }}
                      >
                        {sibName}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Add relationship (sentence-based UI) ── */}
          {showAddRel ? (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "rgba(255,255,255,0.5)",
                border: glassBorder,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {/* Sentence builder: "[Person] is [type] of [other]" */}
              <div
                style={{
                  fontFamily: T.font.display,
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: T.color.charcoal,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: T.color.terracotta }}>{person.first_name}</span>{" "}
                <span style={{ color: T.color.muted, fontWeight: 400 }}>{t("relPreview", { person: "", relType: "", other: "" }).trim() === "" ? "is" : ""}</span>
              </div>

              {/* Pill buttons for relationship type */}
              <div>
                <label style={labelStyle}>{t("relationshipType")}</label>
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  {REL_TYPES.map((rt) => (
                    <button
                      key={rt}
                      onClick={() => setRelType(rt)}
                      style={{
                        ...smallPillStyle,
                        background: relType === rt
                          ? rt === "ex-spouse"
                            ? T.color.muted
                            : T.color.walnut
                          : T.color.white,
                        color: relType === rt ? T.color.white : T.color.walnut,
                        borderColor: relType === rt
                          ? rt === "ex-spouse"
                            ? T.color.muted
                            : T.color.walnut
                          : T.color.sandstone,
                        fontSize: "0.75rem",
                        minHeight: "2.75rem",
                      }}
                    >
                      {relTypeLabel(rt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sentence context */}
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                  fontStyle: "italic",
                }}
              >
                {relOfNameLabel(relType)}
              </div>

              {/* Search person */}
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>{t("relatedPerson")}</label>
                <input
                  ref={searchRef}
                  type="text"
                  value={relPersonId ? getPersonName(relPersonId) : relSearch}
                  onChange={(e) => {
                    setRelSearch(e.target.value);
                    setRelPersonId("");
                    setRelDropdownOpen(true);
                  }}
                  onFocus={() => setRelDropdownOpen(true)}
                  placeholder={t("searchPerson")}
                  style={inputStyle}
                  autoComplete="off"
                />
                {relPersonId && (
                  <button
                    onClick={() => {
                      setRelPersonId("");
                      setRelSearch("");
                      searchRef.current?.focus();
                    }}
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "calc(0.25rem + 1.125rem + 0.625rem)",
                      width: "1.5rem",
                      height: "1.5rem",
                      borderRadius: "999rem",
                      border: "none",
                      background: T.color.sandstone,
                      color: T.color.white,
                      fontSize: "0.625rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label={t("clearSelection")}
                  >
                    {"\u2715"}
                  </button>
                )}
                {relDropdownOpen && !relPersonId && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      maxHeight: "12rem",
                      overflowY: "auto",
                      background: T.color.white,
                      border: `1px solid ${T.color.sandstone}`,
                      borderRadius: "0.75rem",
                      boxShadow: "0 4px 16px rgba(44,44,42,.12)",
                      zIndex: 10,
                    }}
                  >
                    {filteredPersons.length === 0 ? (
                      <div
                        style={{
                          padding: "0.625rem 0.875rem",
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
                          color: T.color.muted,
                          fontStyle: "italic",
                        }}
                      >
                        {t("noPersonFound")}
                      </div>
                    ) : (
                      filteredPersons.map((p) => {
                        const pName = `${p.first_name}${p.last_name ? " " + p.last_name : ""}`;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              setRelPersonId(p.id);
                              setRelSearch("");
                              setRelDropdownOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.625rem",
                              width: "100%",
                              padding: "0.5rem 0.875rem",
                              fontFamily: T.font.body,
                              fontSize: "0.875rem",
                              color: T.color.charcoal,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              minHeight: "2.75rem",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = T.color.warmStone;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "none";
                            }}
                          >
                            {/* Person card mini-avatar */}
                            <div
                              style={{
                                width: "1.75rem",
                                height: "1.75rem",
                                borderRadius: "0.875rem",
                                border: `2px solid ${T.color.sandstone}`,
                                background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                                overflow: "hidden",
                                flexShrink: 0,
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                              }}
                            >
                              {p.photo_path ? (
                                <Image
                                  src={p.photo_path}
                                  alt={pName}
                                  fill
                                  sizes="28px"
                                  style={{ objectFit: "cover" }}
                                />
                              ) : (
                                <SilhouetteAvatar gender={p.gender} size={16} birthDate={p.birth_date} deathDate={p.death_date} />
                              )}
                            </div>
                            <span>{pName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Click-away handler for dropdown */}
              {relDropdownOpen && !relPersonId && (
                <div
                  onClick={() => setRelDropdownOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 5,
                  }}
                />
              )}

              {/* Relationship preview */}
              {relPersonId && (
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    background: relType === "ex-spouse"
                      ? `${T.color.muted}12`
                      : `${T.color.sage}12`,
                    border: `1px solid ${relType === "ex-spouse" ? T.color.muted : T.color.sage}30`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {/* Preview avatars */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "1rem",
                        border: `2px solid ${T.color.walnut}`,
                        background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                        overflow: "hidden",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                      }}
                    >
                      {person.photo_path ? (
                        <Image src={person.photo_path} alt={person.first_name} fill sizes="32px" style={{ objectFit: "cover" }} />
                      ) : <SilhouetteAvatar gender={person.gender} size={20} birthDate={person.birth_date} deathDate={person.death_date} />}
                    </div>
                    <div
                      style={{
                        width: "1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        color: T.color.muted,
                      }}
                    >
                      {"\u2192"}
                    </div>
                    {(() => {
                      const op = getPersonById(relPersonId);
                      return (
                        <div
                          style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "1rem",
                            border: `2px solid ${T.color.walnut}`,
                            background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                            overflow: "hidden",
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.875rem",
                          }}
                        >
                          {op?.photo_path ? (
                            <Image src={op.photo_path} alt={getPersonName(relPersonId)} fill sizes="32px" style={{ objectFit: "cover" }} />
                          ) : <SilhouetteAvatar gender={op?.gender || null} size={20} birthDate={op?.birth_date} deathDate={op?.death_date} />}
                        </div>
                      );
                    })()}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: T.color.charcoal,
                      fontStyle: "italic",
                      flex: 1,
                    }}
                  >
                    {t("relPreview", {
                      person: person.first_name,
                      relType: relPreviewKey(relType),
                      other: getPersonName(relPersonId),
                    })}
                  </div>
                </div>
              )}

              {relError && (
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.error,
                  }}
                >
                  {relError}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.625rem" }}>
                <button
                  onClick={handleAddRelationship}
                  disabled={!relPersonId}
                  style={{
                    ...pillBtnStyle,
                    background: relPersonId ? T.color.terracotta : T.color.sandstone,
                    color: T.color.white,
                    flex: 1,
                    fontSize: "0.8125rem",
                    padding: "0.5rem 1rem",
                  }}
                >
                  {t("add")}
                </button>
                <button
                  onClick={() => {
                    setShowAddRel(false);
                    setRelSearch("");
                    setRelPersonId("");
                    setRelError("");
                  }}
                  style={{
                    ...pillBtnStyle,
                    background: T.color.white,
                    color: T.color.muted,
                    border: `1px solid ${T.color.cream}`,
                    fontSize: "0.8125rem",
                    padding: "0.5rem 1rem",
                  }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRel(true)}
              style={{
                ...pillBtnStyle,
                width: "100%",
                marginTop: "0.75rem",
                background: "rgba(255,255,255,0.5)",
                color: T.color.sage,
                border: `1px solid ${T.color.sage}40`,
                fontSize: "0.8125rem",
              }}
            >
              {t("addRelationship")}
            </button>
          )}
        </SectionCard>

        <GoldDivider />

        {/* ── Delete ── */}
        <div
          style={{
            paddingTop: "0.25rem",
          }}
        >
          {confirmDelete ? (
            <SectionCard
              style={{
                border: `1px solid ${T.color.error}30`,
                background: `${T.color.error}08`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    color: T.color.error,
                    textAlign: "center",
                  }}
                >
                  {t("confirmDelete", { name: fullName })}
                </span>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button
                    onClick={handleDelete}
                    style={{
                      ...pillBtnStyle,
                      background: T.color.error,
                      color: T.color.white,
                      fontSize: "0.8125rem",
                      padding: "0.5rem 1.25rem",
                    }}
                  >
                    {t("yesDelete")}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      ...pillBtnStyle,
                      background: T.color.white,
                      color: T.color.muted,
                      border: `1px solid ${T.color.cream}`,
                      fontSize: "0.8125rem",
                      padding: "0.5rem 1.25rem",
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </SectionCard>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                ...pillBtnStyle,
                width: "100%",
                background: "transparent",
                color: T.color.muted,
                border: `1px solid ${T.color.cream}`,
                fontSize: "0.8125rem",
              }}
            >
              {t("deletePerson")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function reverseRelType(type: string): string {
  switch (type) {
    case "parent":
      return "child";
    case "child":
      return "parent";
    case "spouse":
      return "spouse";
    case "sibling":
      return "sibling";
    case "ex-spouse":
      return "ex-spouse";
    case "stepparent":
      return "stepchild";
    case "stepchild":
      return "stepparent";
    case "half-sibling":
      return "half-sibling";
    default:
      return type;
  }
}
