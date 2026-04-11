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
}

/* ── Relationship types ── */
const REL_TYPES = ["parent", "child", "spouse", "sibling", "ex-spouse"] as const;
type RelType = (typeof REL_TYPES)[number];

/* ── Gender icon helper ── */
function GenderIcon({ gender }: { gender: string | null }) {
  if (gender === "male")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="9.5" r="4" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="9.5" y1="6.5" x2="14" y2="2" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="11" y1="2" x2="14" y2="2" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="14" y1="2" x2="14" y2="5" stroke={T.color.walnut} strokeWidth="1.5" />
      </svg>
    );
  if (gender === "female")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="6" r="4" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="8" y1="10" x2="8" y2="15" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="5.5" y1="12.5" x2="10.5" y2="12.5" stroke={T.color.walnut} strokeWidth="1.5" />
      </svg>
    );
  if (gender === "other")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="4" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="8" y1="12" x2="8" y2="15.5" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="11" y1="5" x2="14" y2="2" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="11.5" y1="2" x2="14" y2="2" stroke={T.color.walnut} strokeWidth="1.5" />
        <line x1="14" y1="2" x2="14" y2="4.5" stroke={T.color.walnut} strokeWidth="1.5" />
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

  /* ── Relationships involving this person ── */
  const personRels = relationships.filter(
    (r) => r.person_id === person.id || r.related_person_id === person.id
  );

  const getPersonById = (id: string) => allPersons.find((x) => x.id === id);

  const getPersonName = (id: string) => {
    const p = getPersonById(id);
    return p ? `${p.first_name}${p.last_name ? " " + p.last_name : ""}` : t("unknown");
  };

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
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `family-tree/${person.id}_${Date.now()}.${ext}`;
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
  const relTypeLabel = (rt: RelType): string => {
    const map: Record<RelType, string> = {
      parent: t("relDescParent"),
      child: t("relDescChild"),
      spouse: t("relDescSpouse"),
      sibling: t("relDescSibling"),
      "ex-spouse": t("exSpouse"),
    };
    return map[rt] || rt;
  };

  const relOfNameLabel = (rt: RelType): string => {
    const map: Record<RelType, string> = {
      parent: t("parentOfName", { name: person.first_name }),
      child: t("childOfName", { name: person.first_name }),
      spouse: t("spouseOfName", { name: person.first_name }),
      sibling: t("siblingOfName", { name: person.first_name }),
      "ex-spouse": t("exSpouseOfName", { name: person.first_name }),
    };
    return map[rt] || rt;
  };

  const relPreviewKey = (rt: RelType): string => {
    const map: Record<RelType, string> = {
      parent: t("relPreviewParent"),
      child: t("relPreviewChild"),
      spouse: t("relPreviewSpouse"),
      sibling: t("relPreviewSibling"),
      "ex-spouse": t("relPreviewExSpouse"),
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
              ) : person.gender === "female" ? (
                "\u{1F469}"
              ) : person.gender === "male" ? (
                "\u{1F468}"
              ) : (
                "\u{1F9D1}"
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
                  <label style={labelStyle}>{t("firstNameLabel")}</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t("lastNameLabel")}</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                          ) : otherPerson.gender === "female" ? (
                            "\u{1F469}"
                          ) : otherPerson.gender === "male" ? (
                            "\u{1F468}"
                          ) : (
                            "\u{1F9D1}"
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
                              ) : p.gender === "female" ? (
                                "\u{1F469}"
                              ) : p.gender === "male" ? (
                                "\u{1F468}"
                              ) : (
                                "\u{1F9D1}"
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
                      ) : person.gender === "female" ? "\u{1F469}" : person.gender === "male" ? "\u{1F468}" : "\u{1F9D1}"}
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
                          ) : op?.gender === "female" ? "\u{1F469}" : op?.gender === "male" ? "\u{1F468}" : "\u{1F9D1}"}
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
    default:
      return type;
  }
}
