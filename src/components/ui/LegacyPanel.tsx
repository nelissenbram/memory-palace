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
  const { t: tWings } = useTranslation("wings");
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
        width: "95%", maxWidth: "33.75rem", maxHeight: "88vh",
        background: T.color.linen, borderRadius: "1.25rem",
        boxShadow: "0 24px 80px rgba(44,44,42,.3)",
        border: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column",
        animation: "fadeUp .35s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 1.5rem 1.25rem",
          borderBottom: `1px solid ${T.color.cream}`,
          background: `linear-gradient(180deg, ${T.color.warmStone} 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "3rem", height: "3rem", borderRadius: "0.875rem",
                background: `${T.color.charcoal}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* Roman temple icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 4L21 9" stroke={T.color.charcoal} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="3" y1="9" x2="21" y2="9" stroke={T.color.charcoal} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6" y1="9.5" x2="6" y2="19" stroke={T.color.charcoal} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="9.5" x2="12" y2="19" stroke={T.color.walnut} strokeWidth={1.2} strokeLinecap="round" />
                  <line x1="18" y1="9.5" x2="18" y2="19" stroke={T.color.charcoal} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="2" y1="20" x2="22" y2="20" stroke={T.color.charcoal} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 style={{
                  fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                  color: T.color.charcoal, margin: 0,
                }}>{t("title")}</h2>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: 0, marginTop: "0.125rem",
                }}>{t("subtitle")}</p>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: "2rem", height: "2rem", borderRadius: "1rem", border: `1px solid ${T.color.cream}`,
              background: T.color.white, cursor: "pointer", fontSize: "1rem", color: T.color.muted,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{"\u2715"}</button>
          </div>

          {/* Gentle explanation */}
          <div style={{
            marginTop: "0.875rem", padding: "0.75rem 0.875rem", borderRadius: "0.625rem",
            background: `${T.color.white}cc`, border: `1px solid ${T.color.sandstone}20`,
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
              lineHeight: 1.6, margin: 0,
            }}>
              {t("description")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "1rem 1.25rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0.875rem",
        }}>
          {/* Loading */}
          {loading && (
            <div style={{
              fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
              textAlign: "center", padding: "2.5rem",
            }}>{t("loading")}</div>
          )}

          {/* Contact list */}
          {!loading && contacts.map((contact) => (
            <div key={contact.id} style={{
              padding: "0.875rem 1rem", borderRadius: "0.75rem",
              border: `1px solid ${T.color.cream}`, background: T.color.white,
              animation: "fadeUp .3s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{
                    fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                    color: T.color.charcoal,
                  }}>{contact.contact_name}</div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginTop: "0.125rem",
                  }}>{contact.contact_email}</div>
                  <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.625rem", padding: "0.125rem 0.5rem",
                      borderRadius: "0.375rem", background: `${T.color.sandstone}15`,
                      color: T.color.walnut,
                    }}>
                      {RELATIONSHIPS.find((r) => r.id === contact.relationship)?.label || contact.relationship}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.625rem", padding: "0.125rem 0.5rem",
                      borderRadius: "0.375rem", background: `${T.color.sandstone}15`,
                      color: T.color.walnut,
                    }}>
                      {contact.access_level === "full" ? t("fullAccess") :
                       t("wingsAccess", { count: String((contact.accessible_wings || []).length) })}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <button onClick={() => startEdit(contact)} style={{
                    padding: "0.375rem 0.625rem", borderRadius: "0.375rem", border: `1px solid ${T.color.cream}`,
                    background: T.color.linen, cursor: "pointer", fontFamily: T.font.body,
                    fontSize: "0.6875rem", color: T.color.walnut, minHeight: "2.75rem",
                  }}>{t("edit")}</button>
                  <button onClick={() => handleRemove(contact.id)} style={{
                    padding: "0.375rem 0.625rem", borderRadius: "0.375rem", border: `1px solid #C1665520`,
                    background: "#C1665508", cursor: "pointer", fontFamily: T.font.body,
                    fontSize: "0.6875rem", color: "#C16655", minHeight: "2.75rem",
                  }}>{t("removeBtn")}</button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loading && contacts.length === 0 && !showAddForm && (
            <div style={{
              textAlign: "center", padding: "1.875rem 1.25rem",
              animation: "fadeUp .4s ease",
            }}>
              <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                {/* Heart/laurel wreath icon for empty state */}
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 19C8 16 6 14 6 11S7 6 10 4" stroke={T.color.walnut} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 19C16 16 18 14 18 11S17 6 14 4" stroke={T.color.walnut} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 7L12.6 9.2L14.8 9.6L12.8 10.8L13.2 13L12 11.4L10.8 13L11.2 10.8L9.2 9.6L11.4 9.2Z" fill={T.color.gold} stroke={T.color.gold} strokeWidth={0.8} strokeLinejoin="round" opacity={0.7} />
                  <path d="M6.5 8.5C5.3 8.8 4.7 10 5.3 11" stroke={T.color.sandstone} strokeWidth={1.2} strokeLinecap="round" />
                  <path d="M6 11.5C4.8 11.8 4.2 13 5 14" stroke={T.color.sandstone} strokeWidth={1.2} strokeLinecap="round" />
                  <path d="M17.5 8.5C18.7 8.8 19.3 10 18.7 11" stroke={T.color.sandstone} strokeWidth={1.2} strokeLinecap="round" />
                  <path d="M18 11.5C19.2 11.8 19.8 13 19 14" stroke={T.color.sandstone} strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              </div>
              <div style={{
                fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
                color: T.color.charcoal, marginBottom: "0.5rem",
              }}>{t("noContacts")}</div>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                lineHeight: 1.6, maxWidth: "22.5rem", margin: "0 auto",
              }}>
                {t("noContactsDesc")}
              </p>
            </div>
          )}

          {/* Add/Edit form */}
          {showAddForm && (
            <div style={{
              padding: "1.125rem 1rem", borderRadius: "0.875rem",
              border: `1px solid ${T.color.sandstone}30`,
              background: `${T.color.warmStone}60`,
              animation: "fadeUp .3s ease",
            }}>
              <div style={{
                fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                color: T.color.charcoal, marginBottom: "0.875rem",
              }}>
                {editingId ? t("editContact") : t("addContact")}
              </div>

              {/* Name */}
              <label style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, fontWeight: 500 }}>
                {t("fullName")}
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                style={{
                  width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.5rem",
                  border: `1px solid ${T.color.sandstone}40`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
                  marginTop: "0.25rem", marginBottom: "0.75rem", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Email */}
              <label style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, fontWeight: 500 }}>
                {t("emailAddress")}
              </label>
              <input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                type="email"
                style={{
                  width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.5rem",
                  border: `1px solid ${T.color.sandstone}40`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
                  marginTop: "0.25rem", marginBottom: "0.75rem", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Relationship */}
              <label style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, fontWeight: 500 }}>
                {t("relationship")}
              </label>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "0.375rem",
                marginTop: "0.375rem", marginBottom: "0.875rem",
              }}>
                {RELATIONSHIPS.map((rel) => (
                  <button key={rel.id} onClick={() => setFormRelationship(rel.id)} style={{
                    padding: "0.375rem 0.75rem", borderRadius: "0.5rem", minHeight: "2.75rem",
                    border: formRelationship === rel.id ? `2px solid ${T.color.walnut}` : `1px solid ${T.color.cream}`,
                    background: formRelationship === rel.id ? `${T.color.walnut}10` : T.color.white,
                    cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem",
                    color: formRelationship === rel.id ? T.color.charcoal : T.color.muted,
                    fontWeight: formRelationship === rel.id ? 600 : 500,
                  }}>{rel.label}</button>
                ))}
              </div>

              {/* Access level */}
              <label style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, fontWeight: 500 }}>
                {t("whatAccess")}
              </label>
              <div style={{
                display: "flex", flexDirection: "column", gap: "0.375rem",
                marginTop: "0.375rem", marginBottom: "0.875rem",
              }}>
                {ACCESS_LEVELS.map((level) => (
                  <button key={level.id} onClick={() => setFormAccessLevel(level.id)} style={{
                    padding: "0.625rem 0.875rem", borderRadius: "0.625rem", textAlign: "left", minHeight: "2.75rem",
                    border: formAccessLevel === level.id ? `2px solid ${T.color.walnut}` : `1px solid ${T.color.cream}`,
                    background: formAccessLevel === level.id ? `${T.color.walnut}08` : T.color.white,
                    cursor: "pointer",
                  }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      color: T.color.charcoal, fontWeight: 500,
                    }}>{level.label}</div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                    }}>{level.desc}</div>
                  </button>
                ))}
              </div>

              {/* Wing picker */}
              {formAccessLevel === "selected_wings" && (
                <div style={{ marginBottom: "0.875rem" }}>
                  <label style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, fontWeight: 500 }}>
                    {t("selectWings")}
                  </label>
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.375rem",
                  }}>
                    {WINGS.filter((w) => w.id !== "attic").map((wing) => (
                      <button key={wing.id} onClick={() => toggleWing(wing.id)} style={{
                        padding: "0.5rem 0.75rem", borderRadius: "0.5rem", display: "flex", minHeight: "2.75rem",
                        alignItems: "center", gap: "0.375rem", cursor: "pointer",
                        border: formWings.includes(wing.id) ? `2px solid ${wing.accent}` : `1px solid ${T.color.cream}`,
                        background: formWings.includes(wing.id) ? `${wing.accent}12` : T.color.white,
                      }}>
                        <span style={{ fontSize: "1rem" }}>{wing.icon}</span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.75rem",
                          color: formWings.includes(wing.id) ? T.color.charcoal : T.color.muted,
                        }}>{tWings(wing.nameKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={resetForm} style={{
                  padding: "0.5rem 1rem", borderRadius: "0.5rem",
                  border: `1px solid ${T.color.sandstone}`, background: "transparent",
                  cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
                }}>{t("cancel")}</button>
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  disabled={saving || !formName.trim() || !formEmail.trim()}
                  style={{
                    padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none",
                    background: formName.trim() && formEmail.trim()
                      ? `linear-gradient(135deg,${T.color.charcoal},${T.color.walnut})`
                      : `${T.color.sandstone}50`,
                    color: formName.trim() && formEmail.trim() ? "#FFF" : T.color.muted,
                    cursor: formName.trim() && formEmail.trim() ? "pointer" : "default",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
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
              padding: "0.875rem", borderRadius: "0.75rem", border: `2px dashed ${T.color.sandstone}40`,
              background: "transparent", cursor: "pointer", textAlign: "center",
              fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.walnut,
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
