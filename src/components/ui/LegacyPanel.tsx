"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { WINGS } from "@/lib/constants/wings";
import { useTrackStore } from "@/lib/stores/trackStore";
import {
  fetchLegacyContacts,
  addLegacyContact,
  updateLegacyContact,
  removeLegacyContact,
} from "@/lib/auth/track-actions";

interface LegacyContact {
  id: string;
  contact_name: string;
  contact_email: string;
  relationship: string;
  access_level: string;
  accessible_wings: string[];
  accessible_rooms: string[];
}

interface LegacyPanelProps {
  onClose: () => void;
}

export default function LegacyPanel({ onClose }: LegacyPanelProps) {
  const { markLegacyReviewed } = useTrackStore();
  const { t } = useTranslation("legacyPanel");
  const { containerRef, handleKeyDown } = useFocusTrap(true);

  const RELATIONSHIPS = [
    { id: "spouse", label: t("relSpouse") },
    { id: "child", label: t("relChild") },
    { id: "sibling", label: t("relSibling") },
    { id: "friend", label: t("relFriend") },
    { id: "lawyer", label: t("relLawyer") },
    { id: "other", label: t("relOther") },
  ];

  const ACCESS_LEVELS = [
    { id: "full", label: t("accessFull"), desc: t("accessFullDesc") },
    { id: "selected_wings", label: t("accessWings"), desc: t("accessWingsDesc") },
  ];
  const [contacts, setContacts] = useState<LegacyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRelationship, setFormRelationship] = useState("spouse");
  const [formAccessLevel, setFormAccessLevel] = useState("full");
  const [formWings, setFormWings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContacts();
    markLegacyReviewed();
  }, [markLegacyReviewed]);

  const loadContacts = async () => {
    setLoading(true);
    const result = await fetchLegacyContacts();
    setContacts(result.contacts || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormRelationship("spouse");
    setFormAccessLevel("full");
    setFormWings([]);
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formName.trim() || !formEmail.trim()) return;
    setSaving(true);
    const result = await addLegacyContact({
      contactName: formName.trim(),
      contactEmail: formEmail.trim(),
      relationship: formRelationship,
      accessLevel: formAccessLevel,
      accessibleWings: formAccessLevel === "selected_wings" ? formWings : [],
    });
    if (!result.error) {
      await loadContacts();
      resetForm();
    }
    setSaving(false);
  };

  const handleUpdate = async (contactId: string) => {
    setSaving(true);
    await updateLegacyContact(contactId, {
      contactName: formName.trim(),
      contactEmail: formEmail.trim(),
      relationship: formRelationship,
      accessLevel: formAccessLevel,
      accessibleWings: formAccessLevel === "selected_wings" ? formWings : [],
    });
    await loadContacts();
    resetForm();
    setSaving(false);
  };

  const handleRemove = async (contactId: string) => {
    await removeLegacyContact(contactId);
    await loadContacts();
  };

  const startEdit = (contact: LegacyContact) => {
    setFormName(contact.contact_name);
    setFormEmail(contact.contact_email);
    setFormRelationship(contact.relationship || "spouse");
    setFormAccessLevel(contact.access_level || "full");
    setFormWings(contact.accessible_wings || []);
    setEditingId(contact.id);
    setShowAddForm(true);
  };

  const toggleWing = (wingId: string) => {
    setFormWings((prev) =>
      prev.includes(wingId) ? prev.filter((w) => w !== wingId) : [...prev, wingId],
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 62,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(42,34,24,.45)", backdropFilter: "blur(6px)",
      }} />

      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: 540, maxHeight: "88vh",
        background: T.color.linen, borderRadius: 20,
        boxShadow: "0 24px 80px rgba(44,44,42,.3)",
        border: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column",
        animation: "fadeUp .35s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 20px",
          borderBottom: `1px solid ${T.color.cream}`,
          background: `linear-gradient(180deg, ${T.color.warmStone} 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${T.color.charcoal}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>{"\uD83C\uDFDB\uFE0F"}</div>
              <div>
                <h2 style={{
                  fontFamily: T.font.display, fontSize: 22, fontWeight: 600,
                  color: T.color.charcoal, margin: 0,
                }}>{t("title")}</h2>
                <p style={{
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: 0, marginTop: 2,
                }}>{t("subtitle")}</p>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 16, border: `1px solid ${T.color.cream}`,
              background: T.color.white, cursor: "pointer", fontSize: 16, color: T.color.muted,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{"\u2715"}</button>
          </div>

          {/* Gentle explanation */}
          <div style={{
            marginTop: 14, padding: "12px 14px", borderRadius: 10,
            background: `${T.color.white}cc`, border: `1px solid ${T.color.sandstone}20`,
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.walnut,
              lineHeight: 1.6, margin: 0,
            }}>
              {t("description")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px 24px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {/* Loading */}
          {loading && (
            <div style={{
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
              textAlign: "center", padding: 40,
            }}>{t("loading")}</div>
          )}

          {/* Contact list */}
          {!loading && contacts.map((contact) => (
            <div key={contact.id} style={{
              padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${T.color.cream}`, background: T.color.white,
              animation: "fadeUp .3s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{
                    fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
                    color: T.color.charcoal,
                  }}>{contact.contact_name}</div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: 12, color: T.color.muted, marginTop: 2,
                  }}>{contact.contact_email}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: T.font.body, fontSize: 10, padding: "2px 8px",
                      borderRadius: 6, background: `${T.color.sandstone}15`,
                      color: T.color.walnut,
                    }}>
                      {RELATIONSHIPS.find((r) => r.id === contact.relationship)?.label || contact.relationship}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: 10, padding: "2px 8px",
                      borderRadius: 6, background: `${T.color.sandstone}15`,
                      color: T.color.walnut,
                    }}>
                      {contact.access_level === "full" ? t("fullAccess") :
                       t("wingsAccess", { count: String((contact.accessible_wings || []).length) })}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(contact)} style={{
                    padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.color.cream}`,
                    background: T.color.linen, cursor: "pointer", fontFamily: T.font.body,
                    fontSize: 11, color: T.color.walnut,
                  }}>{t("edit")}</button>
                  <button onClick={() => handleRemove(contact.id)} style={{
                    padding: "6px 10px", borderRadius: 6, border: `1px solid #C1665520`,
                    background: "#C1665508", cursor: "pointer", fontFamily: T.font.body,
                    fontSize: 11, color: "#C16655",
                  }}>{t("removeBtn")}</button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loading && contacts.length === 0 && !showAddForm && (
            <div style={{
              textAlign: "center", padding: "30px 20px",
              animation: "fadeUp .4s ease",
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83D\uDC9B"}</div>
              <div style={{
                fontFamily: T.font.display, fontSize: 18, fontWeight: 500,
                color: T.color.charcoal, marginBottom: 8,
              }}>{t("noContacts")}</div>
              <p style={{
                fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
                lineHeight: 1.6, maxWidth: 360, margin: "0 auto",
              }}>
                {t("noContactsDesc")}
              </p>
            </div>
          )}

          {/* Add/Edit form */}
          {showAddForm && (
            <div style={{
              padding: "18px 16px", borderRadius: 14,
              border: `1px solid ${T.color.sandstone}30`,
              background: `${T.color.warmStone}60`,
              animation: "fadeUp .3s ease",
            }}>
              <div style={{
                fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
                color: T.color.charcoal, marginBottom: 14,
              }}>
                {editingId ? t("editContact") : t("addContact")}
              </div>

              {/* Name */}
              <label style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, fontWeight: 500 }}>
                {t("fullName")}
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${T.color.sandstone}40`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 14, color: T.color.charcoal,
                  marginTop: 4, marginBottom: 12, outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Email */}
              <label style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, fontWeight: 500 }}>
                {t("emailAddress")}
              </label>
              <input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                type="email"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${T.color.sandstone}40`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 14, color: T.color.charcoal,
                  marginTop: 4, marginBottom: 12, outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Relationship */}
              <label style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, fontWeight: 500 }}>
                {t("relationship")}
              </label>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 6,
                marginTop: 6, marginBottom: 14,
              }}>
                {RELATIONSHIPS.map((rel) => (
                  <button key={rel.id} onClick={() => setFormRelationship(rel.id)} style={{
                    padding: "6px 12px", borderRadius: 8,
                    border: formRelationship === rel.id ? `2px solid ${T.color.walnut}` : `1px solid ${T.color.cream}`,
                    background: formRelationship === rel.id ? `${T.color.walnut}10` : T.color.white,
                    cursor: "pointer", fontFamily: T.font.body, fontSize: 12,
                    color: formRelationship === rel.id ? T.color.charcoal : T.color.muted,
                    fontWeight: formRelationship === rel.id ? 600 : 400,
                  }}>{rel.label}</button>
                ))}
              </div>

              {/* Access level */}
              <label style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, fontWeight: 500 }}>
                {t("whatAccess")}
              </label>
              <div style={{
                display: "flex", flexDirection: "column", gap: 6,
                marginTop: 6, marginBottom: 14,
              }}>
                {ACCESS_LEVELS.map((level) => (
                  <button key={level.id} onClick={() => setFormAccessLevel(level.id)} style={{
                    padding: "10px 14px", borderRadius: 10, textAlign: "left",
                    border: formAccessLevel === level.id ? `2px solid ${T.color.walnut}` : `1px solid ${T.color.cream}`,
                    background: formAccessLevel === level.id ? `${T.color.walnut}08` : T.color.white,
                    cursor: "pointer",
                  }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: 13,
                      color: T.color.charcoal, fontWeight: 500,
                    }}>{level.label}</div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                    }}>{level.desc}</div>
                  </button>
                ))}
              </div>

              {/* Wing picker */}
              {formAccessLevel === "selected_wings" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, fontWeight: 500 }}>
                    {t("selectWings")}
                  </label>
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6,
                  }}>
                    {WINGS.filter((w) => w.id !== "attic").map((wing) => (
                      <button key={wing.id} onClick={() => toggleWing(wing.id)} style={{
                        padding: "8px 12px", borderRadius: 8, display: "flex",
                        alignItems: "center", gap: 6, cursor: "pointer",
                        border: formWings.includes(wing.id) ? `2px solid ${wing.accent}` : `1px solid ${T.color.cream}`,
                        background: formWings.includes(wing.id) ? `${wing.accent}12` : T.color.white,
                      }}>
                        <span style={{ fontSize: 16 }}>{wing.icon}</span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: 12,
                          color: formWings.includes(wing.id) ? T.color.charcoal : T.color.muted,
                        }}>{wing.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={resetForm} style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: `1px solid ${T.color.sandstone}`, background: "transparent",
                  cursor: "pointer", fontFamily: T.font.body, fontSize: 13, color: T.color.walnut,
                }}>Cancel</button>
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  disabled={saving || !formName.trim() || !formEmail.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: 8, border: "none",
                    background: formName.trim() && formEmail.trim()
                      ? `linear-gradient(135deg,${T.color.charcoal},${T.color.walnut})`
                      : `${T.color.sandstone}50`,
                    color: formName.trim() && formEmail.trim() ? "#FFF" : T.color.muted,
                    cursor: formName.trim() && formEmail.trim() ? "pointer" : "default",
                    fontFamily: T.font.body, fontSize: 13, fontWeight: 600,
                  }}
                >
                  {saving ? t("saving") : editingId ? t("update") : t("addContactBtn")}
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!showAddForm && !loading && (
            <button onClick={() => setShowAddForm(true)} style={{
              padding: "14px", borderRadius: 12, border: `2px dashed ${T.color.sandstone}40`,
              background: "transparent", cursor: "pointer", textAlign: "center",
              fontFamily: T.font.body, fontSize: 14, color: T.color.walnut,
              transition: "all .2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.walnut; e.currentTarget.style.background = `${T.color.walnut}06`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${T.color.sandstone}40`; e.currentTarget.style.background = "transparent"; }}
            >
              {t("addLegacyContact")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
