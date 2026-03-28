"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  fetchAllLegacyData,
  createLegacyContact,
  updateLegacyContact,
  deleteLegacyContact,
  createLegacyMessage,
  updateLegacyMessage,
  deleteLegacyMessage,
  upsertLegacySettings,
  type LegacyContact,
  type LegacyMessage,
  type LegacySettings,
} from "@/lib/auth/legacy-actions";

// ── Constants ──

const RELATIONSHIPS = [
  { value: "partner", labelKey: "relPartner" },
  { value: "child", labelKey: "relChild" },
  { value: "grandchild", labelKey: "relGrandchild" },
  { value: "sibling", labelKey: "relSibling" },
  { value: "friend", labelKey: "relFriend" },
  { value: "other", labelKey: "relOther" },
];

const ACCESS_LEVELS = [
  { value: "full", labelKey: "accessFull", descKey: "accessFullDesc" },
  { value: "wings_only", labelKey: "accessWings", descKey: "accessWingsDesc" },
  { value: "specific_rooms", labelKey: "accessRooms", descKey: "accessRoomsDesc" },
];

const DELIVERY_OPTIONS = [
  { value: "death", labelKey: "deliverDeath" },
  { value: "specific_date", labelKey: "deliverDate" },
  { value: "immediately", labelKey: "deliverImmediately" },
];

const DEFAULT_WING_SLUGS = ["family", "travel", "childhood", "career", "creativity"] as const;

const WING_LABEL_KEYS: Record<string, string> = {
  family: "wingFamily",
  travel: "wingTravel",
  childhood: "wingChildhood",
  career: "wingCareer",
  creativity: "wingCreativity",
};

// ── Main Page ──

export default function LegacyPage() {
  const { t } = useTranslation("legacySettings");
  const [contacts, setContacts] = useState<LegacyContact[]>([]);
  const [messages, setMessages] = useState<LegacyMessage[]>([]);
  const [settings, setSettings] = useState<LegacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Section expand state
  const [activeSection, setActiveSection] = useState<"contacts" | "messages" | "settings">("contacts");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllLegacyData();
        setContacts(data.contacts);
        setMessages(data.messages);
        setSettings(data.settings);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: 48, textAlign: "center",
        fontFamily: T.font.body, fontSize: 16, color: T.color.muted,
      }}>
        {t("loading")}
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? T.color.sage : T.color.error,
          color: "#FFF",
          fontFamily: T.font.body, fontSize: 14, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: 16, cursor: "pointer", marginLeft: 8, opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 28, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 8px",
        }}>
          {t("title")}
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
          margin: 0, lineHeight: 1.6,
        }}>
          {t("description")}
        </p>
      </div>

      {/* Warm intro callout */}
      <div style={{
        padding: "20px 24px", borderRadius: 14, marginBottom: 28,
        background: `linear-gradient(135deg, ${T.color.terracotta}08, ${T.color.walnut}06)`,
        border: `1px solid ${T.color.terracotta}18`,
      }}>
        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.color.walnut,
          margin: 0, lineHeight: 1.7,
        }}>
          {t("introCallout")}
        </p>
      </div>

      {/* Section tabs */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 24,
      }}>
        {([
          { key: "contacts" as const, label: t("contactsTab"), count: contacts.length },
          { key: "messages" as const, label: t("messagesTab"), count: messages.length },
          { key: "settings" as const, label: t("settingsTab"), count: null },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: "12px 20px", borderRadius: 12,
              border: `1.5px solid ${activeSection === tab.key ? T.color.terracotta : T.color.cream}`,
              background: activeSection === tab.key ? `${T.color.terracotta}10` : T.color.white,
              fontFamily: T.font.body, fontSize: 14,
              fontWeight: activeSection === tab.key ? 600 : 400,
              color: activeSection === tab.key ? T.color.terracotta : T.color.charcoal,
              cursor: "pointer", transition: "all .2s",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{
                background: activeSection === tab.key ? T.color.terracotta : T.color.sandstone,
                color: activeSection === tab.key ? "#FFF" : T.color.walnut,
                borderRadius: 8, padding: "2px 8px",
                fontSize: 12, fontWeight: 600,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active section content */}
      {activeSection === "contacts" && (
        <ContactsSection
          contacts={contacts}
          setContacts={setContacts}
          showToast={showToast}
        />
      )}
      {activeSection === "messages" && (
        <MessagesSection
          messages={messages}
          setMessages={setMessages}
          contacts={contacts}
          showToast={showToast}
        />
      )}
      {activeSection === "settings" && (
        <SettingsSection
          settings={settings}
          setSettings={setSettings}
          showToast={showToast}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 1: LEGACY CONTACTS
// ═══════════════════════════════════════════════════════════════════

function ContactsSection({
  contacts,
  setContacts,
  showToast,
}: {
  contacts: LegacyContact[];
  setContacts: React.Dispatch<React.SetStateAction<LegacyContact[]>>;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const { t } = useTranslation("legacySettings");
  const { t: tc } = useTranslation("common");
  const { t: tp } = useTranslation("palace");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("partner");
  const [accessLevel, setAccessLevel] = useState("full");
  const [wingAccess, setWingAccess] = useState<string[]>([]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRelationship("partner");
    setAccessLevel("full");
    setWingAccess([]);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (c: LegacyContact) => {
    setName(c.contact_name);
    setEmail(c.contact_email);
    setRelationship(c.relationship || "other");
    setAccessLevel(c.access_level);
    setWingAccess(c.wing_access || []);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      showToast(t("fillNameEmail"), "error");
      return;
    }
    setSaving(true);

    if (editingId) {
      const result = await updateLegacyContact(editingId, {
        contact_name: name.trim(),
        contact_email: email.trim(),
        relationship,
        access_level: accessLevel,
        wing_access: wingAccess,
      });
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.contact) {
        setContacts((prev) => prev.map((c) => (c.id === editingId ? result.contact! : c)));
        showToast(t("contactUpdated"), "success");
        resetForm();
      }
    } else {
      const result = await createLegacyContact({
        contact_name: name.trim(),
        contact_email: email.trim(),
        relationship,
        access_level: accessLevel,
        wing_access: wingAccess,
      });
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.contact) {
        setContacts((prev) => [...prev, result.contact!]);
        showToast(t("contactAdded"), "success");
        resetForm();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteLegacyContact(id);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast(t("contactRemoved"), "success");
    }
  };

  return (
    <div style={{
      background: T.color.white,
      borderRadius: 16,
      border: `1px solid ${T.color.cream}`,
      padding: "28px 32px",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
          color: T.color.charcoal, margin: 0,
        }}>
          {t("contactsTitle")}
        </h3>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={primaryBtnStyle}
          >
            {t("addContact")}
          </button>
        )}
      </div>
      <p style={{
        fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
        margin: "0 0 24px", lineHeight: 1.6,
      }}>
        {t("contactsDesc")}
      </p>

      {/* Existing contacts */}
      {contacts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: showForm ? 24 : 0 }}>
          {contacts.map((c) => (
            <div key={c.id} style={{
              padding: "18px 22px", borderRadius: 14,
              background: T.color.linen,
              border: `1px solid ${T.color.cream}`,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              {/* Avatar circle */}
              <div style={{
                width: 48, height: 48, borderRadius: 24, flexShrink: 0,
                background: `linear-gradient(135deg, ${T.color.terracotta}30, ${T.color.walnut}20)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.font.display, fontSize: 20, fontWeight: 600,
                color: T.color.terracotta,
              }}>
                {c.contact_name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                  color: T.color.charcoal,
                }}>
                  {c.contact_name}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                  marginTop: 2,
                }}>
                  {c.contact_email}
                  {c.relationship && (
                    <span style={{ marginLeft: 10, color: T.color.walnut }}>
                      {(() => { const rel = RELATIONSHIPS.find((r) => r.value === c.relationship); return rel ? t(rel.labelKey) : c.relationship; })()}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: 13, color: T.color.walnut,
                  marginTop: 4,
                }}>
                  {t("access")}: {(() => { const al = ACCESS_LEVELS.find((a) => a.value === c.access_level); return al ? t(al.labelKey) : c.access_level; })()}
                  {c.access_level === "wings_only" && c.wing_access.length > 0 && (
                    <span style={{ marginLeft: 6, color: T.color.muted }}>
                      ({c.wing_access.map((w) => WING_LABEL_KEYS[w] ? tp(WING_LABEL_KEYS[w]) : w).join(", ")})
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => startEdit(c)}
                  style={smallBtnStyle}
                >
                  {tc("edit")}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{ ...smallBtnStyle, color: T.color.error, borderColor: `${T.color.error}30` }}
                >
                  {tc("remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contacts.length === 0 && !showForm && (
        <div style={{
          padding: "32px 24px", textAlign: "center",
          borderRadius: 14, background: T.color.linen,
          border: `1px dashed ${T.color.sandstone}`,
        }}>
          <p style={{
            fontFamily: T.font.display, fontSize: 18, color: T.color.walnut,
            margin: "0 0 8px",
          }}>
            {t("noContactsTitle")}
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
            margin: 0, lineHeight: 1.6,
          }}>
            {t("noContactsDesc")}
          </p>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{
          padding: "24px 28px", borderRadius: 14,
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
          marginTop: contacts.length > 0 ? 0 : 16,
        }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: 18, fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 20px",
          }}>
            {editingId ? t("editContact") : t("addContactTitle")}
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t("contactName")}</label>
              <input
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("contactNamePlaceholder")}
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>{t("contactEmail")}</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("contactEmailPlaceholder")}
                style={inputStyle}
              />
            </div>

            {/* Relationship */}
            <div>
              <label style={labelStyle}>{t("relationship")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRelationship(r.value)}
                    style={{
                      padding: "10px 16px", borderRadius: 10,
                      border: `1.5px solid ${relationship === r.value ? T.color.terracotta : T.color.sandstone}`,
                      background: relationship === r.value ? `${T.color.terracotta}12` : T.color.white,
                      fontFamily: T.font.body, fontSize: 14,
                      fontWeight: relationship === r.value ? 600 : 400,
                      color: relationship === r.value ? T.color.terracotta : T.color.charcoal,
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >
                    {t(r.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Access level */}
            <div>
              <label style={labelStyle}>{t("accessLevel")}</label>
              <p style={{
                fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                margin: "0 0 10px", lineHeight: 1.5,
              }}>
                {t("accessLevelDesc")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ACCESS_LEVELS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAccessLevel(a.value)}
                    style={{
                      padding: "14px 18px", borderRadius: 12, textAlign: "left",
                      border: `1.5px solid ${accessLevel === a.value ? T.color.terracotta : T.color.sandstone}`,
                      background: accessLevel === a.value ? `${T.color.terracotta}10` : T.color.white,
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >
                    <div style={{
                      fontFamily: T.font.body, fontSize: 15, fontWeight: 600,
                      color: accessLevel === a.value ? T.color.terracotta : T.color.charcoal,
                    }}>
                      {t(a.labelKey)}
                    </div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
                      marginTop: 2,
                    }}>
                      {t(a.descKey)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Wing selector (shown if wings_only) */}
            {accessLevel === "wings_only" && (
              <div>
                <label style={labelStyle}>{t("selectWings")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DEFAULT_WING_SLUGS.map((slug) => {
                    const selected = wingAccess.includes(slug);
                    return (
                      <button
                        key={slug}
                        onClick={() => {
                          setWingAccess((prev) =>
                            selected
                              ? prev.filter((s) => s !== slug)
                              : [...prev, slug]
                          );
                        }}
                        style={{
                          padding: "10px 18px", borderRadius: 10,
                          border: `1.5px solid ${selected ? T.color.sage : T.color.sandstone}`,
                          background: selected ? `${T.color.sage}12` : T.color.white,
                          fontFamily: T.font.body, fontSize: 14,
                          fontWeight: selected ? 600 : 400,
                          color: selected ? T.color.sage : T.color.charcoal,
                          cursor: "pointer", transition: "all .15s",
                        }}
                      >
                        {selected ? "\u2713 " : ""}{tp(WING_LABEL_KEYS[slug])}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                {saving ? tc("saving") : editingId ? tc("save") : t("addContact")}
              </button>
              <button onClick={resetForm} style={secondaryBtnStyle}>
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 2: FINAL MESSAGES
// ═══════════════════════════════════════════════════════════════════

function MessagesSection({
  messages,
  setMessages,
  contacts,
  showToast,
}: {
  messages: LegacyMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LegacyMessage[]>>;
  contacts: LegacyContact[];
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const { t } = useTranslation("legacySettings");
  const { t: tc } = useTranslation("common");
  const { t: tp } = useTranslation("palace");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [deliverOn, setDeliverOn] = useState("death");
  const [deliverDate, setDeliverDate] = useState("");

  const resetForm = () => {
    setRecipientEmail("");
    setSubject("");
    setBody("");
    setDeliverOn("death");
    setDeliverDate("");
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (m: LegacyMessage) => {
    setRecipientEmail(m.recipient_email);
    setSubject(m.subject);
    setBody(m.message_body);
    setDeliverOn(m.deliver_on);
    setDeliverDate(m.deliver_date || "");
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!recipientEmail.trim() || !subject.trim()) {
      showToast(t("fillRecipientSubject"), "error");
      return;
    }
    setSaving(true);

    if (editingId) {
      const result = await updateLegacyMessage(editingId, {
        recipient_email: recipientEmail.trim(),
        subject: subject.trim(),
        message_body: body,
        deliver_on: deliverOn,
        deliver_date: deliverOn === "specific_date" ? deliverDate : null,
      });
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.message) {
        setMessages((prev) => prev.map((m) => (m.id === editingId ? result.message! : m)));
        showToast(t("messageUpdated"), "success");
        resetForm();
      }
    } else {
      const result = await createLegacyMessage({
        recipient_email: recipientEmail.trim(),
        subject: subject.trim(),
        message_body: body,
        deliver_on: deliverOn,
        deliver_date: deliverOn === "specific_date" ? deliverDate : undefined,
      });
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.message) {
        setMessages((prev) => [...prev, result.message!]);
        showToast(t("messageSaved"), "success");
        resetForm();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteLegacyMessage(id);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      showToast(t("messageRemoved"), "success");
    }
  };

  return (
    <div style={{
      background: T.color.white,
      borderRadius: 16,
      border: `1px solid ${T.color.cream}`,
      padding: "28px 32px",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
          color: T.color.charcoal, margin: 0,
        }}>
          {t("messagesTitle")}
        </h3>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtnStyle}>
            {t("writeMessage")}
          </button>
        )}
      </div>
      <p style={{
        fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
        margin: "0 0 24px", lineHeight: 1.6,
      }}>
        {t("messagesDesc")}
      </p>

      {/* Existing messages */}
      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: showForm ? 24 : 0 }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              padding: "18px 22px", borderRadius: 14,
              background: T.color.linen,
              border: `1px solid ${T.color.cream}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.font.display, fontSize: 17, fontWeight: 500,
                    color: T.color.charcoal, marginBottom: 4,
                  }}>
                    {m.subject || t("noSubject")}
                  </div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                  }}>
                    {t("to")}: {m.recipient_email}
                  </div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: 13, color: T.color.walnut,
                    marginTop: 4,
                  }}>
                    {t("delivery")}: {(() => { const d = DELIVERY_OPTIONS.find((d) => d.value === m.deliver_on); return d ? t(d.labelKey) : m.deliver_on; })()}
                    {m.deliver_on === "specific_date" && m.deliver_date && (
                      <span> ({m.deliver_date})</span>
                    )}
                  </div>
                  {m.message_body && (
                    <p style={{
                      fontFamily: T.font.body, fontSize: 14, color: T.color.charcoal,
                      margin: "10px 0 0", lineHeight: 1.6,
                      maxHeight: 80, overflow: "hidden",
                      opacity: 0.75,
                    }}>
                      {m.message_body.slice(0, 200)}{m.message_body.length > 200 ? "..." : ""}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(m)} style={smallBtnStyle}>{tc("edit")}</button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{ ...smallBtnStyle, color: T.color.error, borderColor: `${T.color.error}30` }}
                  >
                    {tc("remove")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && !showForm && (
        <div style={{
          padding: "32px 24px", textAlign: "center",
          borderRadius: 14, background: T.color.linen,
          border: `1px dashed ${T.color.sandstone}`,
        }}>
          <p style={{
            fontFamily: T.font.display, fontSize: 18, color: T.color.walnut,
            margin: "0 0 8px",
          }}>
            {t("noMessagesTitle")}
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
            margin: 0, lineHeight: 1.6,
          }}>
            {t("noMessagesDesc")}
          </p>
        </div>
      )}

      {/* Message form */}
      {showForm && (
        <div style={{
          padding: "24px 28px", borderRadius: 14,
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
          marginTop: messages.length > 0 ? 0 : 16,
        }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: 18, fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 20px",
          }}>
            {editingId ? t("editMessage") : t("writeMessageTitle")}
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Recipient */}
            <div>
              <label style={labelStyle}>{t("recipientEmail")}</label>
              {contacts.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setRecipientEmail(c.contact_email)}
                      style={{
                        padding: "6px 12px", borderRadius: 8,
                        border: `1px solid ${recipientEmail === c.contact_email ? T.color.terracotta : T.color.sandstone}`,
                        background: recipientEmail === c.contact_email ? `${T.color.terracotta}12` : T.color.white,
                        fontFamily: T.font.body, fontSize: 13,
                        color: recipientEmail === c.contact_email ? T.color.terracotta : T.color.charcoal,
                        cursor: "pointer", transition: "all .15s",
                      }}
                    >
                      {c.contact_name}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="email" value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={t("contactEmailPlaceholder")}
                style={inputStyle}
              />
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>{t("subject")}</label>
              <input
                type="text" value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPlaceholder")}
                style={inputStyle}
              />
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>{t("yourMessage")}</label>
              <p style={{
                fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                margin: "0 0 8px", lineHeight: 1.5,
              }}>
                {t("messagePrompt")}
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={10}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: 200,
                  lineHeight: 1.7,
                  fontSize: 15,
                }}
              />
            </div>

            {/* Delivery timing */}
            <div>
              <label style={labelStyle}>{t("deliveryTiming")}</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DELIVERY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDeliverOn(d.value)}
                    style={{
                      padding: "12px 18px", borderRadius: 10, textAlign: "left",
                      border: `1.5px solid ${deliverOn === d.value ? T.color.terracotta : T.color.sandstone}`,
                      background: deliverOn === d.value ? `${T.color.terracotta}10` : T.color.white,
                      fontFamily: T.font.body, fontSize: 15,
                      fontWeight: deliverOn === d.value ? 600 : 400,
                      color: deliverOn === d.value ? T.color.terracotta : T.color.charcoal,
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >
                    {t(d.labelKey)}
                  </button>
                ))}
              </div>
              {deliverOn === "specific_date" && (
                <div style={{ marginTop: 12 }}>
                  <input
                    type="date" value={deliverDate}
                    onChange={(e) => setDeliverDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                {saving ? tc("saving") : editingId ? tc("save") : t("saveMessage")}
              </button>
              <button onClick={resetForm} style={secondaryBtnStyle}>
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3: LEGACY SETTINGS
// ═══════════════════════════════════════════════════════════════════

function SettingsSection({
  settings,
  setSettings,
  showToast,
}: {
  settings: LegacySettings | null;
  setSettings: React.Dispatch<React.SetStateAction<LegacySettings | null>>;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const { t } = useTranslation("legacySettings");
  const { t: tc } = useTranslation("common");
  const [months, setMonths] = useState(settings?.inactivity_trigger_months ?? 12);
  const [verifierName, setVerifierName] = useState(settings?.trusted_verifier_name ?? "");
  const [verifierEmail, setVerifierEmail] = useState(settings?.trusted_verifier_email ?? "");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    months !== (settings?.inactivity_trigger_months ?? 12) ||
    verifierName !== (settings?.trusted_verifier_name ?? "") ||
    verifierEmail !== (settings?.trusted_verifier_email ?? "");

  const handleSave = async () => {
    setSaving(true);
    const result = await upsertLegacySettings({
      inactivity_trigger_months: months,
      trusted_verifier_name: verifierName.trim() || null,
      trusted_verifier_email: verifierEmail.trim() || null,
    });

    if (result.error) {
      showToast(result.error, "error");
    } else if (result.settings) {
      setSettings(result.settings);
      showToast(t("settingsSaved"), "success");
    }
    setSaving(false);
  };

  return (
    <div style={{
      background: T.color.white,
      borderRadius: 16,
      border: `1px solid ${T.color.cream}`,
      padding: "28px 32px",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
    }}>
      <h3 style={{
        fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
        color: T.color.charcoal, margin: "0 0 8px",
      }}>
        {t("settingsTitle")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: 15, color: T.color.muted,
        margin: "0 0 28px", lineHeight: 1.6,
      }}>
        {t("settingsDesc")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Inactivity trigger */}
        <div style={{
          padding: "20px 24px", borderRadius: 14,
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
        }}>
          <label style={labelStyle}>{t("inactivityTrigger")}</label>
          <p style={{
            fontFamily: T.font.body, fontSize: 15, color: T.color.charcoal,
            margin: "0 0 14px", lineHeight: 1.6,
          }}>
            {t("inactivityDesc")}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min={3}
              max={36}
              step={1}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              style={{ flex: 1, accentColor: T.color.terracotta }}
            />
            <div style={{
              fontFamily: T.font.display, fontSize: 20, fontWeight: 600,
              color: T.color.terracotta, minWidth: 90, textAlign: "center",
            }}>
              {months !== 1 ? t("monthsLabel", { count: String(months) }) : t("monthLabel", { count: String(months) })}
            </div>
          </div>
          <p style={{
            fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
            margin: "10px 0 0", lineHeight: 1.4,
          }}>
            {t("inactivityRecommendation")}
          </p>
        </div>

        {/* Trusted verifier */}
        <div style={{
          padding: "20px 24px", borderRadius: 14,
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
        }}>
          <label style={labelStyle}>{t("trustedVerifier")}</label>
          <p style={{
            fontFamily: T.font.body, fontSize: 15, color: T.color.charcoal,
            margin: "0 0 14px", lineHeight: 1.6,
          }}>
            {t("trustedVerifierDesc")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 12 }}>{t("verifierName")}</label>
              <input
                type="text" value={verifierName}
                onChange={(e) => setVerifierName(e.target.value)}
                placeholder={t("verifierNamePlaceholder")}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 12 }}>{t("verifierEmail")}</label>
              <input
                type="email" value={verifierEmail}
                onChange={(e) => setVerifierEmail(e.target.value)}
                placeholder={t("verifierEmailPlaceholder")}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: `${T.color.sage}08`,
          border: `1px solid ${T.color.sage}15`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: 5,
            background: settings?.status === "active" || !settings ? T.color.sage : T.color.terracotta,
          }} />
          <p style={{
            fontFamily: T.font.body, fontSize: 14, color: T.color.walnut,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("statusLabel")}: <strong>{settings?.status === "triggered" ? t("statusTriggered") : settings?.status === "transferred" ? t("statusTransferred") : t("statusActive")}</strong>
            {(!settings || settings.status === "active") && (
              <span style={{ color: T.color.muted }}>
                {t("statusSafe")}
              </span>
            )}
          </p>
        </div>

        {/* Save button */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              ...primaryBtnStyle,
              opacity: !hasChanges || saving ? 0.5 : 1,
              cursor: !hasChanges || saving ? "default" : "pointer",
            }}
          >
            {saving ? tc("saving") : t("saveSettings")}
          </button>
          {hasChanges && (
            <button
              onClick={() => {
                setMonths(settings?.inactivity_trigger_months ?? 12);
                setVerifierName(settings?.trusted_verifier_name ?? "");
                setVerifierEmail(settings?.trusted_verifier_email ?? "");
              }}
              style={secondaryBtnStyle}
            >
              {tc("discard")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ Shared Styles ═══

const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: 13,
  fontWeight: 600,
  color: T.color.walnut,
  letterSpacing: ".3px",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 12,
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: 15,
  color: T.color.charcoal,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: 12,
  border: "none",
  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
  color: "#FFF",
  fontFamily: T.font.body,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all .2s",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: 12,
  border: `1px solid ${T.color.cream}`,
  background: "transparent",
  color: T.color.muted,
  fontFamily: T.font.body,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all .2s",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: `1px solid ${T.color.cream}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: 13,
  fontWeight: 500,
  color: T.color.charcoal,
  cursor: "pointer",
  transition: "all .15s",
};
