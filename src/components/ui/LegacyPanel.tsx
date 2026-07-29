"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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
  const isMobile = useIsMobile();

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
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const confirmRemoveContact = contacts.find((c) => c.id === confirmRemoveId);

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
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(64,59,54,0.35)" /* Atrium warm-ink scrim */, backdropFilter: "blur(6px)",
      }} />

      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: "33.75rem", maxHeight: "88vh",
        background: "#FCFAF5" /* Atrium cream */, borderRadius: "1rem",
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token S2
        border: "0.0625rem solid #E3D6BC", // Atrium hairline
        display: "flex", flexDirection: "column",
        animation: "fadeUp .35s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "1.125rem 1.125rem 1rem" : "1.5rem 1.5rem 1.25rem",
          borderBottom: "0.0625rem solid #E3D6BC", // Atrium hairline
          background: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)" /* Atrium terracotta tileBg */,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "3rem", height: "3rem", borderRadius: "0.85rem",
                background: "rgba(154,79,42,0.11)", // Atrium terracotta medallion
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* Roman temple icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Atrium terracotta glyph */}
                  <path d="M3 9L12 4L21 9" stroke="#9A4F2A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="3" y1="9" x2="21" y2="9" stroke="#9A4F2A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6" y1="9.5" x2="6" y2="19" stroke="#9A4F2A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="9.5" x2="12" y2="19" stroke="#9A4F2A" strokeWidth={1.5} strokeLinecap="round" />
                  <line x1="18" y1="9.5" x2="18" y2="19" stroke="#9A4F2A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="2" y1="20" x2="22" y2="20" stroke="#9A4F2A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 style={{
                  fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                  color: "#403B36", margin: 0, // Atrium ink
                }}>{t("title")}</h2>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: 0, marginTop: "0.125rem", // Atrium meta/muted
                }}>{t("subtitle")}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label={t("cancel")} className="legacy-panel-focus-ring" style={{
              width: "2rem", height: "2rem", borderRadius: "1rem", border: "0.0625rem solid #E3D6BC", // Atrium hairline
              background: T.color.white, cursor: "pointer", fontSize: "1rem", color: "#716A5E",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{"\u2715"}</button>
          </div>

          {/* Gentle explanation */}
          <div style={{
            marginTop: "0.875rem", padding: "0.75rem 0.875rem", borderRadius: "0.7rem",
            background: "#FCFAF5", border: "0.0625rem solid #E3D6BC", // Atrium cream + hairline
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", // Atrium muted, full opacity
              lineHeight: 1.4, margin: 0,
            }}>
              {t("description")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mp-scroll" style={{
          flex: 1, overflowY: "auto", padding: isMobile ? "0.875rem 1rem 1.25rem" : "1rem 1.25rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0.875rem",
        }}>
          {/* Loading */}
          {loading && (
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
              textAlign: "center", padding: "2.5rem",
            }}>{t("loading")}</div>
          )}

          {/* Contact list */}
          {!loading && contacts.map((contact) => (
            <div key={contact.id} style={{
              padding: "0.875rem 1rem", borderRadius: "1rem",
              border: "0.0625rem solid #E3D6BC", background: T.color.white, // Atrium hairline
              boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token S1
              animation: "fadeUp .3s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{
                    fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                    color: "#403B36", // Atrium ink, titleS
                  }}>{contact.contact_name}</div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.125rem",
                  }}>{contact.contact_email}</div>
                  <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", padding: "0.125rem 0.5rem",
                      borderRadius: "2rem", background: "#FCFAF5", border: "0.0625rem solid #E3D6BC", // Atrium cream pill + hairline
                      color: "#716A5E",
                    }}>
                      {RELATIONSHIPS.find((r) => r.id === contact.relationship)?.label || contact.relationship}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", padding: "0.125rem 0.5rem",
                      borderRadius: "2rem", background: "#EFF2E8", border: "0.0625rem solid #DFE3D2", // Atrium sage tray + hairline
                      color: "#56683C", // Atrium sage
                    }}>
                      {contact.access_level === "full" ? t("fullAccess") :
                       t("wingsAccess", { count: String((contact.accessible_wings || []).length) })}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <button onClick={() => startEdit(contact)} className="legacy-panel-focus-ring" style={{
                    padding: "0.375rem 0.625rem", borderRadius: "0.7rem", border: "0.0625rem solid #E3D6BC",
                    background: "#FCFAF5", cursor: "pointer", fontFamily: T.font.body,
                    fontSize: "0.6875rem", color: "#716A5E", minHeight: "2.75rem",
                  }}>{t("edit")}</button>
                  <button onClick={() => setConfirmRemoveId(contact.id)} className="legacy-panel-focus-ring" style={{
                    padding: "0.375rem 0.625rem", borderRadius: "0.7rem", border: "0.0625rem solid rgba(184,92,56,0.25)", // Atrium ember
                    background: "rgba(184,92,56,0.05)", cursor: "pointer", fontFamily: T.font.body,
                    fontSize: "0.6875rem", color: "#B85C38", minHeight: "2.75rem",
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
                  {/* Atrium sage laurel + terracotta star (gold reserved for the palace itself) */}
                  <path d="M8 19C8 16 6 14 6 11S7 6 10 4" stroke="#56683C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 19C16 16 18 14 18 11S17 6 14 4" stroke="#56683C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 7L12.6 9.2L14.8 9.6L12.8 10.8L13.2 13L12 11.4L10.8 13L11.2 10.8L9.2 9.6L11.4 9.2Z" fill="#9A4F2A" stroke="#9A4F2A" strokeWidth={0.8} strokeLinejoin="round" opacity={0.7} />
                  <path d="M6.5 8.5C5.3 8.8 4.7 10 5.3 11" stroke="#7A8C64" strokeWidth={1.2} strokeLinecap="round" />
                  <path d="M6 11.5C4.8 11.8 4.2 13 5 14" stroke="#7A8C64" strokeWidth={1.2} strokeLinecap="round" />
                  <path d="M17.5 8.5C18.7 8.8 19.3 10 18.7 11" stroke="#7A8C64" strokeWidth={1.2} strokeLinecap="round" />
                  <path d="M18 11.5C19.2 11.8 19.8 13 19 14" stroke="#7A8C64" strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              </div>
              <div style={{
                fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
                color: "#403B36", marginBottom: "0.5rem", // Atrium ink, titleM
              }}>{t("noContacts")}</div>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                lineHeight: 1.4, maxWidth: "22.5rem", margin: "0 auto",
              }}>
                {t("noContactsDesc")}
              </p>
            </div>
          )}

          {/* Add/Edit form */}
          {showAddForm && (
            <div style={{
              padding: "1.125rem 1rem", borderRadius: "1rem",
              border: "0.0625rem solid #E3D6BC", // Atrium hairline
              background: "#FCFAF5", // Atrium cream inset (matches settings page)
              animation: "fadeUp .3s ease",
            }}>
              <div style={{
                fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                color: "#403B36", marginBottom: "0.875rem", // Atrium ink, titleS
              }}>
                {editingId ? t("editContact") : t("addContact")}
              </div>

              {/* Name */}
              <label style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontWeight: 500 }}>
                {t("fullName")}
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                style={{
                  width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.7rem",
                  border: "0.0625rem solid #E3D6BC", background: T.color.white, // Atrium hairline
                  fontFamily: T.font.body, fontSize: "1rem", color: "#403B36",
                  marginTop: "0.25rem", marginBottom: "0.75rem", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Email */}
              <label style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontWeight: 500 }}>
                {t("emailAddress")}
              </label>
              <input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                type="email"
                style={{
                  width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.7rem",
                  border: "0.0625rem solid #E3D6BC", background: T.color.white, // Atrium hairline
                  fontFamily: T.font.body, fontSize: "1rem", color: "#403B36",
                  marginTop: "0.25rem", marginBottom: "0.75rem", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Relationship */}
              <label id="legacy-panel-rel-label" style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontWeight: 500 }}>
                {t("relationship")}
              </label>
              <div role="group" aria-labelledby="legacy-panel-rel-label" style={{
                display: "flex", flexWrap: "wrap", gap: "0.375rem",
                marginTop: "0.375rem", marginBottom: "0.875rem",
              }}>
                {RELATIONSHIPS.map((rel) => (
                  <button key={rel.id} onClick={() => setFormRelationship(rel.id)} aria-pressed={formRelationship === rel.id} className="legacy-panel-focus-ring" style={{
                    padding: "0.375rem 0.75rem", borderRadius: "0.7rem", minHeight: "2.75rem",
                    border: formRelationship === rel.id ? "0.125rem solid #B85C38" : "0.0625rem solid #E3D6BC", // Atrium ember active / hairline
                    background: formRelationship === rel.id ? "rgba(154,79,42,0.10)" : T.color.white,
                    cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                    color: formRelationship === rel.id ? "#403B36" : "#716A5E",
                    fontWeight: formRelationship === rel.id ? 600 : 500,
                  }}>{rel.label}</button>
                ))}
              </div>

              {/* Access level */}
              <label id="legacy-panel-access-label" style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontWeight: 500 }}>
                {t("whatAccess")}
              </label>
              <div role="group" aria-labelledby="legacy-panel-access-label" style={{
                display: "flex", flexDirection: "column", gap: "0.375rem",
                marginTop: "0.375rem", marginBottom: "0.875rem",
              }}>
                {ACCESS_LEVELS.map((level) => (
                  <button key={level.id} onClick={() => setFormAccessLevel(level.id)} aria-pressed={formAccessLevel === level.id} className="legacy-panel-focus-ring" style={{
                    padding: "0.625rem 0.875rem", borderRadius: "0.7rem", textAlign: "left", minHeight: "2.75rem",
                    border: formAccessLevel === level.id ? "0.125rem solid #B85C38" : "0.0625rem solid #E3D6BC", // Atrium ember active / hairline
                    background: formAccessLevel === level.id ? "rgba(154,79,42,0.08)" : T.color.white,
                    cursor: "pointer",
                  }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      color: "#403B36", fontWeight: 500,
                    }}>{level.label}</div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E",
                    }}>{level.desc}</div>
                  </button>
                ))}
              </div>

              {/* Wing picker */}
              {formAccessLevel === "selected_wings" && (
                <div style={{ marginBottom: "0.875rem" }}>
                  <label id="legacy-panel-wings-label" style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontWeight: 500 }}>
                    {t("selectWings")}
                  </label>
                  <div role="group" aria-labelledby="legacy-panel-wings-label" style={{
                    display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.375rem",
                  }}>
                    {WINGS.filter((w) => w.id !== "attic").map((wing) => (
                      <button key={wing.id} onClick={() => toggleWing(wing.id)} aria-pressed={formWings.includes(wing.id)} className="legacy-panel-focus-ring" style={{
                        padding: "0.5rem 0.75rem", borderRadius: "0.7rem", display: "flex", minHeight: "2.75rem",
                        alignItems: "center", gap: "0.375rem", cursor: "pointer",
                        border: formWings.includes(wing.id) ? `0.125rem solid ${wing.accent}` : "0.0625rem solid #E3D6BC", // Atrium hairline
                        background: formWings.includes(wing.id) ? `${wing.accent}12` : T.color.white,
                      }}>
                        <span style={{ fontSize: "1rem" }}>{wing.icon}</span>
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem",
                          color: formWings.includes(wing.id) ? "#403B36" : "#716A5E",
                        }}>{tWings(wing.nameKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={resetForm} className="legacy-panel-focus-ring" style={{
                  padding: "0.5rem 1rem", borderRadius: "0.7rem", minHeight: "2.75rem",
                  border: "0.0625rem solid #E3D6BC", background: "transparent", // Atrium hairline
                  cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                }}>{t("cancel")}</button>
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  disabled={saving || !formName.trim() || !formEmail.trim()}
                  className="legacy-panel-focus-ring"
                  style={{
                    padding: "0.5rem 1.25rem", borderRadius: "0.7rem", border: "none",
                    background: formName.trim() && formEmail.trim()
                      ? "#B85C38" // Atrium ember (flat, matches settings page)
                      : "#EEE9DF", // Atrium disabled fill
                    color: formName.trim() && formEmail.trim() ? "#FCFAF5" : "#716A5E",
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
            <button onClick={() => setShowAddForm(true)} className="legacy-panel-focus-ring" style={{
              padding: "0.875rem", borderRadius: "1rem", border: "0.125rem dashed #E3D6BC", minHeight: "2.75rem", // Atrium hairline ink
              background: "transparent", cursor: "pointer", textAlign: "center",
              fontFamily: T.font.body, fontSize: "0.9375rem", color: "#9A4F2A", // Atrium body + terracotta
              transition: "all .2s ease",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#9A4F2A"; e.currentTarget.style.background = "rgba(154,79,42,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E3D6BC"; e.currentTarget.style.background = "transparent"; }}
            >
              {t("addLegacyContact")}
            </button>
          )}
        </div>
      </div>

      {/* Remove-contact confirmation */}
      {confirmRemoveId && confirmRemoveContact && (
        <div
          role="dialog" aria-modal="true" aria-label={t("removeConfirmTitle")}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmRemoveId(null); }}
          onKeyDown={(e) => { if (e.key === "Escape") setConfirmRemoveId(null); }}
          style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(64,59,54,0.35)" /* Atrium warm-ink scrim */, padding: "1rem",
          }}
        >
          <div style={{
            background: "#FCFAF5" /* cream */, borderRadius: "1rem",
            padding: "1.5rem 1.75rem", maxWidth: "24rem", width: "100%",
            boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)",
            border: "0.0625rem solid #E3D6BC",
          }}>
            <h4 style={{
              fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
              color: "#403B36", margin: "0 0 0.5rem",
            }}>{t("removeConfirmTitle")}</h4>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E",
              margin: "0 0 1.25rem", lineHeight: 1.6,
            }}>{t("removeConfirmBody", { name: confirmRemoveContact.contact_name })}</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmRemoveId(null)} className="legacy-panel-focus-ring" style={{
                padding: "0.625rem 1.25rem", minHeight: "2.75rem", borderRadius: "0.75rem",
                border: "0.0625rem solid #E3D6BC", background: "transparent",
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500, color: "#716A5E", cursor: "pointer",
              }}>{t("cancel")}</button>
              <button onClick={() => { const id = confirmRemoveId; setConfirmRemoveId(null); handleRemove(id); }} className="legacy-panel-focus-ring" style={{
                padding: "0.625rem 1.25rem", minHeight: "2.75rem", borderRadius: "0.75rem",
                border: "none", background: "#B85C38", // Atrium ember
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: "#FCFAF5", cursor: "pointer",
              }}>{t("removeBtn")}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .legacy-panel-focus-ring:focus-visible {
          outline: 0.1875rem solid #D4AF37 !important;
          outline-offset: 0.1875rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .legacy-panel-focus-ring { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
