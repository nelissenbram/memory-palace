"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  fetchUserRooms,
  type LegacyContact,
  type LegacyMessage,
  type LegacySettings,
  type UserRoom,
  type UserWing,
} from "@/lib/auth/legacy-actions";

// ── Confirm Modal (inline component for #2, #5, #10) ──

function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button on mount
  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  // Focus trap + Escape handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key === "Tab") {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(44,44,42,.35)", backdropFilter: "blur(0.125rem)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: T.color.linen, borderRadius: "1rem",
        padding: "1.75rem 2rem", maxWidth: "26rem", width: "90%",
        boxShadow: "0 1rem 3rem rgba(44,44,42,.18)",
        border: `1px solid ${T.color.cream}`,
        animation: "fadeIn .2s ease",
      }}>
        <h4 style={{
          fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 0.75rem",
        }}>
          {title}
        </h4>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
          margin: "0 0 1.5rem", lineHeight: 1.6,
        }}>
          {body}
        </p>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button ref={cancelBtnRef} onClick={onCancel} style={{
            padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
            border: `1px solid ${T.color.cream}`, background: "transparent",
            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
            color: T.color.muted, cursor: "pointer", transition: "all .15s",
          }}>
            {cancelLabel}
          </button>
          <button ref={confirmBtnRef} onClick={onConfirm} style={{
            padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
            border: "none",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
            color: "#FFF", cursor: "pointer", transition: "all .15s",
          }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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

// ── Main Page ──

export default function LegacyPage() {
  const { t } = useTranslation("legacySettings");
  const [contacts, setContacts] = useState<LegacyContact[]>([]);
  const [messages, setMessages] = useState<LegacyMessage[]>([]);
  const [settings, setSettings] = useState<LegacySettings | null>(null);
  const [wings, setWings] = useState<UserWing[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Section expand state
  const [activeSection, setActiveSection] = useState<"contacts" | "messages" | "settings">("contacts");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const dirtyRef = useRef(false);
  const [pendingTab, setPendingTab] = useState<"contacts" | "messages" | "settings" | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const setDirty = useCallback((v: boolean) => { dirtyRef.current = v; }, []);

  const handleTabSwitch = useCallback((tab: "contacts" | "messages" | "settings") => {
    if (tab === activeSection) return;
    if (dirtyRef.current) {
      setPendingTab(tab);
    } else {
      setActiveSection(tab);
    }
  }, [activeSection]);

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
        if (data.wings) setWings(data.wings);
      } catch {
        showToast(t("fetchError"), "error");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: "3rem", textAlign: "center",
        fontFamily: T.font.body, fontSize: "1rem", color: T.color.muted,
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
      }}>
        <div style={{
          width: "1.5rem", height: "1.5rem", borderRadius: "50%",
          border: `0.1875rem solid ${T.color.sandstone}`,
          borderTopColor: T.color.terracotta,
          animation: "legacySpin 0.7s linear infinite",
        }} />
        {t("loading")}
        <style>{`@keyframes legacySpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? T.color.sage : T.color.error,
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label="Close" style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "1rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 0.5rem",
        }}>
          {t("title")}
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
          margin: 0, lineHeight: 1.6,
        }}>
          {t("description")}
        </p>
      </div>

      {/* Warm intro callout */}
      <div style={{
        padding: "1.25rem 1.5rem", borderRadius: "0.875rem", marginBottom: "1.75rem",
        background: `linear-gradient(135deg, ${T.color.terracotta}08, ${T.color.walnut}06)`,
        border: `1px solid ${T.color.terracotta}18`,
      }}>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
          margin: 0, lineHeight: 1.7,
        }}>
          {t("introCallout")}
        </p>
      </div>

      {/* Progress summary bar (#1) */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem",
      }}>
        {[
          {
            done: contacts.length > 0,
            label: contacts.length === 1
              ? t("progressContactsSingular")
              : t("progressContacts", { count: String(contacts.length) }),
          },
          {
            done: messages.length > 0,
            label: messages.length === 1
              ? t("progressMessagesSingular")
              : t("progressMessages", { count: String(messages.length) }),
          },
          {
            done: settings !== null,
            label: settings !== null
              ? t("progressSettingsConfigured")
              : t("progressSettingsNotConfigured"),
          },
        ].map((item) => (
          <span key={item.label} style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            padding: "0.3125rem 0.75rem", borderRadius: "1rem",
            background: item.done ? `${T.color.sage}14` : `${T.color.sandstone}30`,
            border: `1px solid ${item.done ? T.color.sage : T.color.sandstone}25`,
            fontFamily: T.font.body, fontSize: "0.8125rem",
            color: item.done ? T.color.sage : T.color.muted,
            fontWeight: 500,
          }}>
            <span aria-hidden="true">{item.done ? "\u2713" : "\u25CB"}</span>
            {item.label}
          </span>
        ))}
      </div>

      {/* Onboarding card (#4) */}
      {showOnboarding && contacts.length === 0 && messages.length === 0 && settings === null && (
        <div style={{
          padding: "1.25rem 1.5rem", borderRadius: "0.875rem", marginBottom: "1.25rem",
          background: `linear-gradient(135deg, ${T.color.sage}08, ${T.color.terracotta}06)`,
          border: `1px solid ${T.color.sage}20`,
        }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 0.75rem",
          }}>
            {t("onboardingTitle")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "1rem" }}>
            {[t("onboardingStep1"), t("onboardingStep2"), t("onboardingStep3")].map((step) => (
              <p key={step} style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
                margin: 0, lineHeight: 1.6,
              }}>
                {step}
              </p>
            ))}
          </div>
          <button
            onClick={() => setShowOnboarding(false)}
            style={{
              padding: "0.5rem 1rem", borderRadius: "0.5rem",
              border: `1px solid ${T.color.cream}`, background: T.color.white,
              fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
              color: T.color.charcoal, cursor: "pointer", transition: "all .15s",
            }}
          >
            {t("onboardingDismiss")}
          </button>
        </div>
      )}

      {/* Unsaved changes modal (#5) */}
      {pendingTab && (
        <ConfirmModal
          title={t("unsavedChangesTitle")}
          body={t("unsavedChangesBody")}
          confirmLabel={t("modalDiscardChanges")}
          cancelLabel={t("modalKeepEditing")}
          onConfirm={() => {
            dirtyRef.current = false;
            setActiveSection(pendingTab);
            setPendingTab(null);
          }}
          onCancel={() => setPendingTab(null)}
        />
      )}

      {/* Section tabs */}
      <div role="tablist" aria-label={t("title")} style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem",
      }}>
        {([
          { key: "contacts" as const, label: t("contactsTab"), shortLabel: t("contactsTabShort"), count: contacts.length },
          { key: "messages" as const, label: t("messagesTab"), shortLabel: t("messagesTabShort"), count: messages.length },
          { key: "settings" as const, label: t("settingsTab"), shortLabel: t("settingsTabShort"), count: null },
        ]).map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            onClick={() => handleTabSwitch(tab.key)}
            role="tab"
            aria-selected={activeSection === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            className="legacy-focus-ring"
            style={{
              padding: "0.75rem 1.25rem", borderRadius: "0.75rem",
              border: `1.5px solid ${activeSection === tab.key ? T.color.terracotta : T.color.cream}`,
              background: activeSection === tab.key ? `${T.color.terracotta}10` : T.color.white,
              fontFamily: T.font.body, fontSize: "0.875rem",
              fontWeight: activeSection === tab.key ? 600 : 400,
              color: activeSection === tab.key ? T.color.terracotta : T.color.charcoal,
              cursor: "pointer", transition: "all .2s",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <span className="legacy-tab-full">{tab.label}</span>
            <span className="legacy-tab-short">{tab.shortLabel}</span>
            {tab.count !== null && (
              <span style={{
                background: activeSection === tab.key ? T.color.terracotta : T.color.sandstone,
                color: activeSection === tab.key ? "#FFF" : T.color.walnut,
                borderRadius: "0.5rem", padding: "0.125rem 0.5rem",
                fontSize: "0.75rem", fontWeight: 600,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active section content */}
      {activeSection === "contacts" && (
        <div role="tabpanel" id="tabpanel-contacts" aria-labelledby="tab-contacts">
          <ContactsSection
            contacts={contacts}
            setContacts={setContacts}
            wings={wings}
            showToast={showToast}
            setDirty={setDirty}
          />
        </div>
      )}
      {activeSection === "messages" && (
        <div role="tabpanel" id="tabpanel-messages" aria-labelledby="tab-messages">
          <MessagesSection
            messages={messages}
            setMessages={setMessages}
            contacts={contacts}
            showToast={showToast}
            setDirty={setDirty}
          />
        </div>
      )}
      {activeSection === "settings" && (
        <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings">
          <SettingsSection
            settings={settings}
            setSettings={setSettings}
            showToast={showToast}
            setDirty={setDirty}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .legacy-tab-short { display: none; }
        @media (max-width: 600px) {
          .legacy-tab-full { display: none; }
          .legacy-tab-short { display: inline; }
        }
        .legacy-focus-ring:focus {
          border-color: ${T.color.terracotta} !important;
          box-shadow: 0 0 0 0.1875rem ${T.color.terracotta}25 !important;
          outline: none !important;
        }
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
  wings,
  showToast,
  setDirty,
}: {
  contacts: LegacyContact[];
  setContacts: React.Dispatch<React.SetStateAction<LegacyContact[]>>;
  wings: UserWing[];
  showToast: (msg: string, type: "success" | "error") => void;
  setDirty: (v: boolean) => void;
}) {
  const { t } = useTranslation("legacySettings");
  const { t: tc } = useTranslation("common");
  const { t: tp } = useTranslation("palace");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteContact = contacts.find((c) => c.id === confirmDeleteId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("partner");
  const [accessLevel, setAccessLevel] = useState("full");
  const [wingAccess, setWingAccess] = useState<string[]>([]);
  const [roomAccess, setRoomAccess] = useState<string[]>([]);

  // Room picker data
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsFetched, setRoomsFetched] = useState(false);

  // Fetch rooms when access level changes to specific_rooms
  useEffect(() => {
    if (accessLevel === "specific_rooms" && !roomsFetched) {
      setRoomsLoading(true);
      fetchUserRooms().then((rooms) => {
        setUserRooms(rooms);
        setRoomsFetched(true);
        setRoomsLoading(false);
      });
    }
  }, [accessLevel, roomsFetched]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRelationship("partner");
    setAccessLevel("full");
    setWingAccess([]);
    setRoomAccess([]);
    setShowForm(false);
    setEditingId(null);
    setDirty(false);
  };

  // Track dirty state when form fields change
  useEffect(() => {
    if (showForm) setDirty(true);
  }, [name, email, relationship, accessLevel, wingAccess, roomAccess, showForm, setDirty]);

  const startEdit = (c: LegacyContact) => {
    setName(c.contact_name);
    setEmail(c.contact_email);
    setRelationship(c.relationship || "other");
    setAccessLevel(c.access_level);
    setWingAccess(c.wing_access || []);
    setRoomAccess(c.room_access || []);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      showToast(t("fillNameEmail"), "error");
      return;
    }
    if (!isValidEmail(email.trim())) {
      showToast(t("invalidEmail"), "error");
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
        room_access: roomAccess,
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
        room_access: roomAccess,
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
    setConfirmDeleteId(null);
  };

  return (
    <>
    {/* Delete contact confirmation modal (#2, #10) */}
    {confirmDeleteId && confirmDeleteContact && (
      <ConfirmModal
        title={t("editContact")}
        body={t("confirmDeleteContactSoft", { name: confirmDeleteContact.contact_name })}
        confirmLabel={t("modalRemoveContact")}
        cancelLabel={t("modalKeepContact")}
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    )}
    <div style={{
      background: T.color.white,
      borderRadius: "1rem",
      border: `1px solid ${T.color.cream}`,
      padding: "1.75rem 2rem",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
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
        fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
        margin: "0 0 1.5rem", lineHeight: 1.6,
      }}>
        {t("contactsDesc")}
      </p>

      {/* Existing contacts */}
      {contacts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: showForm ? "1.5rem" : 0 }}>
          {contacts.map((c) => (
            <div key={c.id} style={{
              padding: "1.125rem 1.375rem", borderRadius: "0.875rem",
              background: T.color.linen,
              border: `1px solid ${T.color.cream}`,
              display: "flex", alignItems: "center", gap: "1rem",
            }}>
              {/* Avatar circle */}
              <div style={{
                width: "3rem", height: "3rem", borderRadius: "1.5rem", flexShrink: 0,
                background: `linear-gradient(135deg, ${T.color.terracotta}30, ${T.color.walnut}20)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600,
                color: T.color.terracotta,
              }}>
                {c.contact_name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  color: T.color.charcoal,
                }}>
                  {c.contact_name}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                  marginTop: 2,
                }}>
                  {c.contact_email}
                  {c.relationship && (
                    <span style={{ marginLeft: "0.625rem", color: T.color.walnut }}>
                      {(() => { const rel = RELATIONSHIPS.find((r) => r.value === c.relationship); return rel ? t(rel.labelKey) : c.relationship; })()}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
                  marginTop: "0.25rem",
                }}>
                  {t("access")}: {(() => { const al = ACCESS_LEVELS.find((a) => a.value === c.access_level); return al ? t(al.labelKey) : c.access_level; })()}
                  {c.access_level === "wings_only" && c.wing_access.length > 0 && (
                    <span style={{ marginLeft: "0.375rem", color: T.color.muted }}>
                      ({c.wing_access.map((w) => { const found = wings.find((wing) => wing.id === w); return found ? found.name : w; }).join(", ")})
                    </span>
                  )}
                  {c.access_level === "specific_rooms" && c.room_access && c.room_access.length > 0 && (
                    <span style={{ marginLeft: "0.375rem", color: T.color.muted }}>
                      ({c.room_access.length === 1 ? t("roomCountLabel", { count: "1" }) : t("roomCountLabelPlural", { count: String(c.room_access.length) })})
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  onClick={() => startEdit(c)}
                  style={smallBtnStyle}
                >
                  {tc("edit")}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(c.id)}
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
          padding: "2rem 1.5rem", textAlign: "center",
          borderRadius: "0.875rem", background: T.color.linen,
          border: `1px dashed ${T.color.sandstone}`,
        }}>
          <p style={{
            fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.walnut,
            margin: "0 0 0.5rem",
          }}>
            {t("noContactsTitle")}
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
            margin: "0 0 1rem", lineHeight: 1.6,
          }}>
            {t("noContactsDesc")}
          </p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={primaryBtnStyle}
          >
            {t("addFirstContact")}
          </button>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{
          padding: "1.5rem 1.75rem", borderRadius: "0.875rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
          marginTop: contacts.length > 0 ? 0 : "1rem",
        }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 1.25rem",
          }}>
            {editingId ? t("editContact") : t("addContactTitle")}
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            {/* Name */}
            <div>
              <label htmlFor="legacy-contact-name" style={labelStyle}>{t("contactName")}<RequiredMark /></label>
              <input
                id="legacy-contact-name"
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("contactNamePlaceholder")}
                className="legacy-focus-ring"
                required
                aria-required="true"
                disabled={saving}
                style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="legacy-contact-email" style={labelStyle}>{t("contactEmail")}<RequiredMark /></label>
              <input
                id="legacy-contact-email"
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("contactEmailPlaceholder")}
                className="legacy-focus-ring"
                required
                aria-required="true"
                disabled={saving}
                style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
              />
            </div>

            {/* Relationship */}
            <div>
              <label id="legacy-relationship-label" style={labelStyle}>{t("relationship")}</label>
              <div role="group" aria-labelledby="legacy-relationship-label" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRelationship(r.value)}
                    aria-pressed={relationship === r.value}
                    disabled={saving}
                    style={{
                      padding: "0.625rem 1rem", borderRadius: "0.625rem",
                      border: `1.5px solid ${relationship === r.value ? T.color.terracotta : T.color.sandstone}`,
                      background: relationship === r.value ? `${T.color.terracotta}12` : T.color.white,
                      fontFamily: T.font.body, fontSize: "0.875rem",
                      fontWeight: relationship === r.value ? 600 : 400,
                      color: relationship === r.value ? T.color.terracotta : T.color.charcoal,
                      cursor: saving ? "not-allowed" : "pointer", transition: "all .15s",
                      ...(saving ? { opacity: 0.6 } : {}),
                    }}
                  >
                    {t(r.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Access level */}
            <div>
              <label id="legacy-access-level-label" style={labelStyle}>{t("accessLevel")}</label>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                margin: "0 0 0.625rem", lineHeight: 1.5,
              }}>
                {t("accessLevelDesc")}
              </p>
              <div role="group" aria-labelledby="legacy-access-level-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {ACCESS_LEVELS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAccessLevel(a.value)}
                    aria-pressed={accessLevel === a.value}
                    disabled={saving}
                    style={{
                      padding: "0.875rem 1.125rem", borderRadius: "0.75rem", textAlign: "left",
                      border: `1.5px solid ${accessLevel === a.value ? T.color.terracotta : T.color.sandstone}`,
                      background: accessLevel === a.value ? `${T.color.terracotta}10` : T.color.white,
                      cursor: saving ? "not-allowed" : "pointer", transition: "all .15s",
                      ...(saving ? { opacity: 0.6 } : {}),
                    }}
                  >
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                      color: accessLevel === a.value ? T.color.terracotta : T.color.charcoal,
                    }}>
                      {t(a.labelKey)}
                    </div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {wings.map((wing) => {
                    const selected = wingAccess.includes(wing.id);
                    return (
                      <button
                        key={wing.id}
                        onClick={() => {
                          setWingAccess((prev) =>
                            selected
                              ? prev.filter((s) => s !== wing.id)
                              : [...prev, wing.id]
                          );
                        }}
                        aria-pressed={selected}
                        style={{
                          padding: "0.625rem 1.125rem", borderRadius: "0.625rem",
                          border: `1.5px solid ${selected ? T.color.sage : T.color.sandstone}`,
                          background: selected ? `${T.color.sage}12` : T.color.white,
                          fontFamily: T.font.body, fontSize: "0.875rem",
                          fontWeight: selected ? 600 : 400,
                          color: selected ? T.color.sage : T.color.charcoal,
                          cursor: "pointer", transition: "all .15s",
                        }}
                      >
                        {selected ? "\u2713 " : ""}{wing.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Room selector (shown if specific_rooms) */}
            {accessLevel === "specific_rooms" && (
              <div>
                <label style={labelStyle}>{t("selectRooms")}</label>
                {roomsLoading ? (
                  <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>
                    {t("loadingRooms")}
                  </p>
                ) : userRooms.length === 0 ? (
                  <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>
                    {t("noRoomsFound")}
                  </p>
                ) : (
                  <div>
                    {wings.map((wing) => {
                      const wingRooms = userRooms.filter((r) => r.wing_id === wing.id);
                      if (wingRooms.length === 0) return null;
                      const wingLabel = wing.name || wing.slug;
                      return (
                        <div key={wing.id} style={{ marginBottom: "0.75rem" }}>
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                            color: T.color.walnut, marginBottom: "0.375rem",
                          }}>
                            {wingLabel}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {wingRooms.map((room) => {
                              const selected = roomAccess.includes(room.id);
                              return (
                                <button
                                  key={room.id}
                                  onClick={() => {
                                    setRoomAccess((prev) =>
                                      selected
                                        ? prev.filter((rid) => rid !== room.id)
                                        : [...prev, room.id]
                                    );
                                  }}
                                  aria-pressed={selected}
                                  style={{
                                    padding: "0.5rem 0.875rem", borderRadius: "0.5rem",
                                    border: `1.5px solid ${selected ? T.color.sage : T.color.sandstone}`,
                                    background: selected ? `${T.color.sage}12` : T.color.white,
                                    fontFamily: T.font.body, fontSize: "0.8125rem",
                                    fontWeight: selected ? 600 : 400,
                                    color: selected ? T.color.sage : T.color.charcoal,
                                    cursor: "pointer", transition: "all .15s",
                                  }}
                                >
                                  {selected ? "\u2713 " : ""}{room.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.375rem" }}>
              <button onClick={handleSave} disabled={saving} style={{
                ...primaryBtnStyle,
                ...(saving ? { opacity: 0.5, cursor: "not-allowed" } : {}),
              }}>
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
    </>
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
  setDirty,
}: {
  messages: LegacyMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LegacyMessage[]>>;
  contacts: LegacyContact[];
  showToast: (msg: string, type: "success" | "error") => void;
  setDirty: (v: boolean) => void;
}) {
  const { t } = useTranslation("legacySettings");
  const { t: tc } = useTranslation("common");
  const { t: tp } = useTranslation("palace");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteMessage = messages.find((m) => m.id === confirmDeleteId);

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
    setDirty(false);
  };

  // Track dirty state when form fields change
  useEffect(() => {
    if (showForm) setDirty(true);
  }, [recipientEmail, subject, body, deliverOn, deliverDate, showForm, setDirty]);

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
    if (!isValidEmail(recipientEmail.trim())) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    // Empty body warning (#11)
    if (!body.trim()) {
      showToast(t("emptyBodyWarning"), "success");
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
    setConfirmDeleteId(null);
  };

  return (
    <>
    {/* Delete message confirmation modal (#2, #10) */}
    {confirmDeleteId && confirmDeleteMessage && (
      <ConfirmModal
        title={t("editMessage")}
        body={t("confirmDeleteMessageSoft")}
        confirmLabel={t("modalRemoveMessage")}
        cancelLabel={t("modalKeepMessage")}
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    )}
    <div style={{
      background: T.color.white,
      borderRadius: "1rem",
      border: `1px solid ${T.color.cream}`,
      padding: "1.75rem 2rem",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h3 style={{
          fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
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
        fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
        margin: "0 0 1.5rem", lineHeight: 1.6,
      }}>
        {t("messagesDesc")}
      </p>

      {/* Existing messages */}
      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: showForm ? "1.5rem" : 0 }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              padding: "1.125rem 1.375rem", borderRadius: "0.875rem",
              background: T.color.linen,
              border: `1px solid ${T.color.cream}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 500,
                    color: T.color.charcoal, marginBottom: "0.25rem",
                  }}>
                    {m.subject || t("noSubject")}
                  </div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                  }}>
                    {t("to")}: {m.recipient_email}
                  </div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
                    marginTop: "0.25rem",
                  }}>
                    {t("delivery")}: {(() => { const d = DELIVERY_OPTIONS.find((d) => d.value === m.deliver_on); return d ? t(d.labelKey) : m.deliver_on; })()}
                    {m.deliver_on === "specific_date" && m.deliver_date && (
                      <span> ({m.deliver_date})</span>
                    )}
                  </div>
                  {m.message_body && (
                    <p style={{
                      fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
                      margin: "0.625rem 0 0", lineHeight: 1.6,
                      maxHeight: "5rem", overflow: "hidden",
                      opacity: 0.75,
                    }}>
                      {m.message_body.slice(0, 200)}{m.message_body.length > 200 ? "..." : ""}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button onClick={() => startEdit(m)} style={smallBtnStyle}>{tc("edit")}</button>
                  <button
                    onClick={() => setConfirmDeleteId(m.id)}
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
          padding: "2rem 1.5rem", textAlign: "center",
          borderRadius: "0.875rem", background: T.color.linen,
          border: `1px dashed ${T.color.sandstone}`,
        }}>
          <p style={{
            fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.walnut,
            margin: "0 0 0.5rem",
          }}>
            {t("noMessagesTitle")}
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
            margin: 0, lineHeight: 1.6,
          }}>
            {t("noMessagesDesc")}
          </p>
        </div>
      )}

      {/* Message form */}
      {showForm && (
        <div style={{
          padding: "1.5rem 1.75rem", borderRadius: "0.875rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
          marginTop: messages.length > 0 ? 0 : "1rem",
        }}>
          <h4 style={{
            fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 1.25rem",
          }}>
            {editingId ? t("editMessage") : t("writeMessageTitle")}
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            {/* Recipient */}
            <div>
              <label htmlFor="legacy-msg-recipient" style={labelStyle}>{t("recipientEmail")}<RequiredMark /></label>
              {contacts.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.5rem" }}>
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setRecipientEmail(c.contact_email)}
                      style={{
                        padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                        border: `1px solid ${recipientEmail === c.contact_email ? T.color.terracotta : T.color.sandstone}`,
                        background: recipientEmail === c.contact_email ? `${T.color.terracotta}12` : T.color.white,
                        fontFamily: T.font.body, fontSize: "0.8125rem",
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
                id="legacy-msg-recipient"
                type="email" value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={t("contactEmailPlaceholder")}
                className="legacy-focus-ring"
                required
                aria-required="true"
                disabled={saving}
                style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="legacy-msg-subject" style={labelStyle}>{t("subject")}<RequiredMark /></label>
              <input
                id="legacy-msg-subject"
                type="text" value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPlaceholder")}
                className="legacy-focus-ring"
                required
                aria-required="true"
                disabled={saving}
                style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
              />
            </div>

            {/* Body */}
            <div>
              <label htmlFor="legacy-msg-body" style={labelStyle}>{t("yourMessage")}</label>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                margin: "0 0 0.5rem", lineHeight: 1.5,
              }}>
                {t("messagePrompt")}
              </p>
              <textarea
                id="legacy-msg-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={10}
                className="legacy-focus-ring"
                disabled={saving}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "12.5rem",
                  lineHeight: 1.7,
                  fontSize: "0.9375rem",
                  ...(saving ? { pointerEvents: "none" as const, opacity: 0.6 } : {}),
                }}
              />
            </div>

            {/* Delivery timing */}
            <div>
              <label id="legacy-delivery-label" style={labelStyle}>{t("deliveryTiming")}</label>
              <div role="group" aria-labelledby="legacy-delivery-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {DELIVERY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDeliverOn(d.value)}
                    disabled={saving}
                    style={{
                      padding: "0.75rem 1.125rem", borderRadius: "0.625rem", textAlign: "left",
                      border: `1.5px solid ${deliverOn === d.value ? T.color.terracotta : T.color.sandstone}`,
                      background: deliverOn === d.value ? `${T.color.terracotta}10` : T.color.white,
                      fontFamily: T.font.body, fontSize: "0.9375rem",
                      fontWeight: deliverOn === d.value ? 600 : 400,
                      color: deliverOn === d.value ? T.color.terracotta : T.color.charcoal,
                      cursor: saving ? "not-allowed" : "pointer", transition: "all .15s",
                      ...(saving ? { opacity: 0.6 } : {}),
                    }}
                  >
                    {t(d.labelKey)}
                  </button>
                ))}
              </div>
              {deliverOn === "immediately" && (
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                  margin: "0.5rem 0 0", lineHeight: 1.5, fontStyle: "italic",
                }}>
                  {t("deliverImmediatelyNote")}
                </p>
              )}
              {deliverOn === "specific_date" && (
                <div style={{ marginTop: "0.75rem" }}>
                  <input
                    type="date" value={deliverDate}
                    onChange={(e) => setDeliverDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="legacy-focus-ring"
                    disabled={saving}
                    style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.375rem" }}>
              <button onClick={handleSave} disabled={saving} style={{
                ...primaryBtnStyle,
                ...(saving ? { opacity: 0.5, cursor: "not-allowed" } : {}),
              }}>
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3: LEGACY SETTINGS
// ═══════════════════════════════════════════════════════════════════

function SettingsSection({
  settings,
  setSettings,
  showToast,
  setDirty,
}: {
  settings: LegacySettings | null;
  setSettings: React.Dispatch<React.SetStateAction<LegacySettings | null>>;
  showToast: (msg: string, type: "success" | "error") => void;
  setDirty: (v: boolean) => void;
}) {
  const { t } = useTranslation("legacySettings");
  const { t: tc } = useTranslation("common");
  const [months, setMonths] = useState(settings?.inactivity_trigger_months ?? 12);
  const [verifierName, setVerifierName] = useState(settings?.trusted_verifier_name ?? "");
  const [verifierEmail, setVerifierEmail] = useState(settings?.trusted_verifier_email ?? "");
  const [saving, setSaving] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);

  const hasChanges =
    months !== (settings?.inactivity_trigger_months ?? 12) ||
    verifierName !== (settings?.trusted_verifier_name ?? "") ||
    verifierEmail !== (settings?.trusted_verifier_email ?? "");

  // Track dirty state
  useEffect(() => {
    setDirty(hasChanges);
  }, [hasChanges, setDirty]);

  const handleSave = async () => {
    if (verifierEmail.trim() && !isValidEmail(verifierEmail.trim())) {
      showToast(t("invalidVerifierEmail"), "error");
      return;
    }
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
    <>
    {/* Retry delivery confirmation modal (#2) */}
    {showRetryModal && (
      <ConfirmModal
        title={t("retryDelivery")}
        body={t("confirmRetryDeliverySoft")}
        confirmLabel={t("modalConfirm")}
        cancelLabel={t("modalCancel")}
        onConfirm={async () => {
          setShowRetryModal(false);
          const { retryLegacyDelivery } = await import("@/lib/auth/legacy-actions");
          setSaving(true);
          const result = await retryLegacyDelivery();
          setSaving(false);
          if (result.success) {
            showToast(t("retrySuccess").replace("{count}", String(result.sent || 0)), "success");
            window.location.reload();
          } else {
            showToast(result.error || t("retryFailed"), "error");
          }
        }}
        onCancel={() => setShowRetryModal(false)}
      />
    )}
    <div style={{
      background: T.color.white,
      borderRadius: "1rem",
      border: `1px solid ${T.color.cream}`,
      padding: "1.75rem 2rem",
      boxShadow: "0 2px 8px rgba(44,44,42,.04)",
    }}>
      <h3 style={{
        fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
        color: T.color.charcoal, margin: "0 0 0.5rem",
      }}>
        {t("settingsTitle")}
      </h3>
      <p style={{
        fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted,
        margin: "0 0 1.75rem", lineHeight: 1.6,
      }}>
        {t("settingsDesc")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Inactivity trigger */}
        <div style={{
          padding: "1.25rem 1.5rem", borderRadius: "0.875rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
        }}>
          <label htmlFor="legacy-inactivity-range" style={labelStyle}>{t("inactivityTrigger")}</label>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.charcoal,
            margin: "0 0 0.875rem", lineHeight: 1.6,
          }}>
            {t("inactivityDesc")}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input
              id="legacy-inactivity-range"
              type="range"
              min={3}
              max={36}
              step={1}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              aria-label={t("inactivitySliderLabel")}
              aria-valuetext={months === 1 ? t("monthLabel", { count: String(months) }) : t("monthsLabel", { count: String(months) })}
              disabled={saving}
              style={{ flex: 1, accentColor: T.color.terracotta, ...(saving ? { pointerEvents: "none" as const, opacity: 0.6 } : {}) }}
            />
            <div style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600,
              color: T.color.terracotta, minWidth: "5.625rem", textAlign: "center",
            }}>
              {months !== 1 ? t("monthsLabel", { count: String(months) }) : t("monthLabel", { count: String(months) })}
            </div>
          </div>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
            margin: "0.625rem 0 0", lineHeight: 1.4,
          }}>
            {t("inactivityRecommendation")}
          </p>
        </div>

        {/* Trusted verifier */}
        <div style={{
          padding: "1.25rem 1.5rem", borderRadius: "0.875rem",
          background: T.color.linen,
          border: `1px solid ${T.color.cream}`,
        }}>
          <label style={labelStyle}>{t("trustedVerifier")}</label>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.charcoal,
            margin: "0 0 0.875rem", lineHeight: 1.6,
          }}>
            {t("trustedVerifierDesc")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div>
              <label htmlFor="legacy-verifier-name" style={{ ...labelStyle, fontSize: "0.75rem" }}>{t("verifierName")}</label>
              <input
                id="legacy-verifier-name"
                type="text" value={verifierName}
                onChange={(e) => setVerifierName(e.target.value)}
                placeholder={t("verifierNamePlaceholder")}
                className="legacy-focus-ring"
                disabled={saving}
                style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
              />
            </div>
            <div>
              <label htmlFor="legacy-verifier-email" style={{ ...labelStyle, fontSize: "0.75rem" }}>{t("verifierEmail")}</label>
              <input
                id="legacy-verifier-email"
                type="email" value={verifierEmail}
                onChange={(e) => setVerifierEmail(e.target.value)}
                placeholder={t("verifierEmailPlaceholder")}
                className="legacy-focus-ring"
                disabled={saving}
                style={saving ? { ...inputStyle, pointerEvents: "none" as const, opacity: 0.6 } : inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{
          padding: "1rem 1.25rem", borderRadius: "0.75rem",
          background: `${T.color.sage}08`,
          border: `1px solid ${T.color.sage}15`,
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <div style={{
            width: "0.625rem", height: "0.625rem", borderRadius: "0.3125rem",
            background: settings?.status === "active" || !settings ? T.color.sage : T.color.terracotta,
          }} />
          <p style={{
            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.walnut,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("statusLabel")}: <strong>{settings?.status === "triggered" ? t("statusTriggered") : settings?.status === "transferred" ? t("statusTransferred") : settings?.status === "partially_delivered" ? t("statusPartial") : t("statusActive")}</strong>
            {(!settings || settings.status === "active") && (
              <span style={{ color: T.color.muted }}>
                {t("statusSafe")}
              </span>
            )}
          </p>
          {settings?.status === "partially_delivered" && (
            <button
              onClick={() => setShowRetryModal(true)}
              disabled={saving}
              style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", padding: "0.375rem 0.75rem",
                background: T.color.terracotta, color: "#fff", border: "none", borderRadius: "0.375rem",
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
              }}
            >
              {t("retryDelivery")}
            </button>
          )}
        </div>

        {/* Save button */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
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
    </>
  );
}

// ═══ Helpers ═══

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const RequiredMark = () => (
  <span aria-hidden="true" style={{ color: T.color.terracotta, marginLeft: "0.25rem" }}>*</span>
);

// ═══ Shared Styles ═══

const labelStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: T.color.walnut,
  letterSpacing: ".3px",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.125rem",
  borderRadius: "0.75rem",
  border: `1.5px solid ${T.color.sandstone}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  color: T.color.charcoal,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color .2s, box-shadow .2s",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "0.75rem 1.5rem",
  borderRadius: "0.75rem",
  border: "none",
  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
  color: "#FFF",
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all .2s",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "0.75rem 1.5rem",
  borderRadius: "0.75rem",
  border: `1px solid ${T.color.cream}`,
  background: "transparent",
  color: T.color.muted,
  fontFamily: T.font.body,
  fontSize: "0.9375rem",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all .2s",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "0.625rem 1.25rem",
  minHeight: "2.75rem",
  borderRadius: "0.5rem",
  border: `1px solid ${T.color.cream}`,
  background: T.color.white,
  fontFamily: T.font.body,
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: T.color.charcoal,
  cursor: "pointer",
  transition: "all .15s",
};
