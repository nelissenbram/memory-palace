"use client";

import { useState, useRef } from "react";
import { T } from "@/lib/theme";
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
}

export default function PersonPanel({
  person,
  allPersons,
  relationships,
  onClose,
  onUpdate,
}: PersonPanelProps) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name || "");
  const [birthDate, setBirthDate] = useState(person.birth_date || "");
  const [deathDate, setDeathDate] = useState(person.death_date || "");
  const [gender, setGender] = useState(person.gender || "");
  const [notes, setNotes] = useState(person.notes || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);
  const [relPersonId, setRelPersonId] = useState("");
  const [relType, setRelType] = useState<"parent" | "child" | "spouse" | "sibling">("parent");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Relationships involving this person
  const personRels = relationships.filter(
    (r) => r.person_id === person.id || r.related_person_id === person.id
  );

  const getPersonName = (id: string) => {
    const p = allPersons.find((x) => x.id === id);
    return p ? `${p.first_name}${p.last_name ? " " + p.last_name : ""}` : "Unknown";
  };

  const handleSave = async () => {
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

  const handleDelete = async () => {
    await deletePerson(person.id);
    onUpdate();
    onClose();
  };

  const handleAddRelationship = async () => {
    if (!relPersonId) return;
    await addRelationship(person.id, relPersonId, relType);
    setShowAddRel(false);
    setRelPersonId("");
    onUpdate();
  };

  const handleRemoveRel = async (relId: string) => {
    await removeRelationship(relId);
    onUpdate();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `family-tree/${person.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("memories")
        .upload(path, file, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("memories")
          .getPublicUrl(path);
        await updatePerson(person.id, { photo_path: urlData.publicUrl });
        onUpdate();
      }
    } catch {
      // ignore upload errors
    }
    setUploading(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).getFullYear().toString();
    } catch {
      return d;
    }
  };

  const fullName = `${person.first_name}${person.last_name ? " " + person.last_name : ""}`;
  const lifespan =
    person.birth_date || person.death_date
      ? `${formatDate(person.birth_date) || "?"} - ${person.death_date ? formatDate(person.death_date) : ""}`
      : "";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: 14,
    color: T.color.charcoal,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: 12,
    fontWeight: 600,
    color: T.color.walnut,
    marginBottom: 4,
    display: "block",
  };

  const btnStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 12,
    fontFamily: T.font.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    minHeight: 44,
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(420px, 100vw)",
        background: T.color.linen,
        boxShadow: "-8px 0 40px rgba(44,44,42,.15)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight .3s ease",
      }}
    >
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${T.color.cream}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: 22,
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
          }}
        >
          {fullName}
        </h2>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: `1px solid ${T.color.cream}`,
            background: T.color.white,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.color.muted,
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {/* Photo + basic info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              border: `3px solid ${T.color.walnut}`,
              background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: T.color.walnut,
              overflow: "hidden",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {person.photo_path ? (
              <img
                src={person.photo_path}
                alt={fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : person.gender === "female" ? (
              "\u{1F469}"
            ) : person.gender === "male" ? (
              "\u{1F468}"
            ) : (
              "\u{1F9D1}"
            )}
          </div>
          <div>
            <div
              style={{
                fontFamily: T.font.display,
                fontSize: 18,
                fontWeight: 600,
                color: T.color.charcoal,
              }}
            >
              {fullName}
            </div>
            {lifespan && (
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: 14,
                  color: T.color.muted,
                  marginTop: 2,
                }}
              >
                {lifespan}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                marginTop: 8,
                padding: "6px 14px",
                borderRadius: 8,
                border: `1px solid ${T.color.sandstone}`,
                background: T.color.white,
                fontFamily: T.font.body,
                fontSize: 12,
                color: T.color.walnut,
                cursor: "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Upload Photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Notes */}
        {person.notes && !editing && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: T.color.warmStone,
              marginBottom: 20,
              fontFamily: T.font.body,
              fontSize: 14,
              color: T.color.charcoal,
              lineHeight: 1.6,
            }}
          >
            {person.notes}
          </div>
        )}

        {/* Edit form */}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Born</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Died</label>
                <input
                  type="date"
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={inputStyle}
              >
                <option value="">--</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...btnStyle,
                  background: T.color.terracotta,
                  color: T.color.white,
                  flex: 1,
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  ...btnStyle,
                  background: T.color.white,
                  color: T.color.muted,
                  border: `1px solid ${T.color.cream}`,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              ...btnStyle,
              width: "100%",
              background: T.color.white,
              color: T.color.walnut,
              border: `1px solid ${T.color.sandstone}`,
              marginBottom: 20,
            }}
          >
            Edit Details
          </button>
        )}

        {/* Relationships */}
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: 18,
              fontWeight: 600,
              color: T.color.charcoal,
              marginBottom: 12,
            }}
          >
            Relationships
          </h3>
          {personRels.length === 0 ? (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: 14,
                color: T.color.muted,
                fontStyle: "italic",
              }}
            >
              No relationships yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {personRels.map((rel) => {
                const otherId =
                  rel.person_id === person.id
                    ? rel.related_person_id
                    : rel.person_id;
                const label =
                  rel.person_id === person.id
                    ? rel.relationship_type
                    : reverseRelType(rel.relationship_type);
                return (
                  <div
                    key={rel.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: T.color.warmStone,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: T.font.body,
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.color.terracotta,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {label}
                      </span>
                      <div
                        style={{
                          fontFamily: T.font.display,
                          fontSize: 15,
                          fontWeight: 600,
                          color: T.color.charcoal,
                          marginTop: 2,
                        }}
                      >
                        {getPersonName(otherId)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRel(rel.id)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        border: `1px solid ${T.color.cream}`,
                        background: T.color.white,
                        fontSize: 12,
                        cursor: "pointer",
                        color: T.color.muted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Remove relationship"
                    >
                      {"\u2715"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add relationship */}
          {showAddRel ? (
            <div
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 12,
                background: T.color.warmStone,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>Person</label>
                <select
                  value={relPersonId}
                  onChange={(e) => setRelPersonId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select person...</option>
                  {allPersons
                    .filter((p) => p.id !== person.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name}
                        {p.last_name ? " " + p.last_name : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Relationship</label>
                <select
                  value={relType}
                  onChange={(e) =>
                    setRelType(e.target.value as typeof relType)
                  }
                  style={inputStyle}
                >
                  <option value="parent">Parent of</option>
                  <option value="child">Child of</option>
                  <option value="spouse">Spouse of</option>
                  <option value="sibling">Sibling of</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleAddRelationship}
                  disabled={!relPersonId}
                  style={{
                    ...btnStyle,
                    background: relPersonId ? T.color.terracotta : T.color.sandstone,
                    color: T.color.white,
                    flex: 1,
                    fontSize: 13,
                    padding: "8px 16px",
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddRel(false)}
                  style={{
                    ...btnStyle,
                    background: T.color.white,
                    color: T.color.muted,
                    border: `1px solid ${T.color.cream}`,
                    fontSize: 13,
                    padding: "8px 16px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRel(true)}
              style={{
                ...btnStyle,
                width: "100%",
                marginTop: 12,
                background: T.color.white,
                color: T.color.sage,
                border: `1px solid ${T.color.sage}40`,
                fontSize: 13,
              }}
            >
              + Add Relationship
            </button>
          )}
        </div>

        {/* Delete */}
        <div
          style={{
            borderTop: `1px solid ${T.color.cream}`,
            paddingTop: 20,
          }}
        >
          {confirmDelete ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: 14,
                  color: T.color.error,
                }}
              >
                Remove {fullName} and all their relationships?
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    ...btnStyle,
                    background: T.color.error,
                    color: T.color.white,
                    fontSize: 13,
                    padding: "8px 20px",
                  }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    ...btnStyle,
                    background: T.color.white,
                    color: T.color.muted,
                    border: `1px solid ${T.color.cream}`,
                    fontSize: 13,
                    padding: "8px 20px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                ...btnStyle,
                width: "100%",
                background: "transparent",
                color: T.color.muted,
                border: `1px solid ${T.color.cream}`,
                fontSize: 13,
              }}
            >
              Delete Person
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
    default:
      return type;
  }
}
